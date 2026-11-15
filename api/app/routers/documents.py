from fastapi import APIRouter, Depends, status, HTTPException, UploadFile
from sqlalchemy import func, select
from aio_pika.abc import AbstractExchange
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.project import Project

from app.models.document import Document
from app.schemas.document import DocumentRead, DocumentUrlRead

from app.core.config import get_settings
from pathlib import Path
from app.services import storage
import asyncio
import logging
import uuid

from aio_pika.abc import AbstractExchange
from app.core.events import publish
from app.dependencies import get_events_exchange, get_owned_project  # add get_events_exchange

router = APIRouter(tags=["documents"])

logger = logging.getLogger(__name__)


@router.get("/{project_id}/documents", response_model=list[DocumentRead], status_code=status.HTTP_200_OK)
async def get_documents(
    project_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    query = select(Document).order_by(Document.created_at).where(Document.project_id == project_id)
    result = await session.execute(query)
    documents = result.scalars().all()
    return documents


@router.post("/{project_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    project_id: uuid.UUID,
    file: UploadFile,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
    exchange: AbstractExchange = Depends(get_events_exchange),
):
    settings = get_settings()
    doc_count = await session.scalar(
        select(func.count()).select_from(Document).where(Document.project_id == project_id)
    )
    if doc_count >= settings.max_documents_per_project:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Document limit reached ({settings.max_documents_per_project} per project)"
        )

    document_id = uuid.uuid4()
    filename = file.filename
    mime_type = file.content_type
    ext = Path(filename).suffix.lower()

    if not ext or ext not in settings.allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
    # Reject big files before reading them into memory (file.size comes from the upload itself)
    if file.size is not None and file.size > settings.max_file_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    content = await file.read()
    size = len(content)
    if size > settings.max_file_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
    if size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a name")

    key = storage.document_key(project_id, document_id, ext)
    content_type = storage.content_type_for(ext, file.content_type)
    try:
        await asyncio.to_thread(storage.upload_file, key, content, content_type)
    except Exception:
        # Full error (with the AWS details) in the logs only
        logger.exception("Upload to S3 failed for %s", key)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not store the file. Try again.")

    document = Document(
        id=document_id, project_id=project_id, filename=filename, mime_type=mime_type, size=size, storage_path=key
    )

    session.add(document)
    await session.commit()
    await session.refresh(document)
    # Hand the processing to the ingestion worker (app/workers/ingestion.py) through RabbitMQ
    try:
        await publish(exchange, "document.uploaded", {"document_id": document.id, "project_id": project_id})
    except Exception:
        # The row is saved but nobody will process it: say so instead of leaving it "Queued" forever
        logger.exception("Could not publish document.uploaded for %s", document.id)
        document.status = "failed"
        document.error_message = "Could not queue the document for processing. Delete it and upload it again."
        await session.commit()
        await session.refresh(document)
    return document


@router.get("/{project_id}/documents/{document_id}", response_model=DocumentRead, status_code=status.HTTP_200_OK)
async def get_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    query = select(Document).where(Document.project_id == project_id).where(Document.id == document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return document


@router.get("/{project_id}/documents/{document_id}/url", response_model=DocumentUrlRead, status_code=status.HTTP_200_OK)
async def get_document_url(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    download: bool = False,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    query = select(Document).where(Document.project_id == project_id).where(Document.id == document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    presigned_url_expires = get_settings().presigned_url_expires
    content_type = storage.content_type_for(Path(document.filename).suffix, document.mime_type)
    url = await asyncio.to_thread(
        storage.presigned_url,
        document.storage_path,
        document.filename,
        download=download,
        content_type=content_type,
    )
    return DocumentUrlRead(id=document.id, url=url, expires_in=presigned_url_expires)


@router.delete("/{project_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
    exchange: AbstractExchange = Depends(get_events_exchange),
):
    query = select(Document).where(Document.project_id == project_id).where(Document.id == document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await session.delete(document)

    await session.commit()

    # try:
    #     await asyncio.to_thread(storage.delete_file, document.storage_path)
    # except Exception:
    #     logger.exception("Failed to delete file %s", document.storage_path)

    # The file in S3 is deleted by the cleanup worker (app/workers/cleanup.py).
    # storage_path goes in the message: the row is gone, so the worker could not look it up.
    try:
        await publish(
            exchange,
            "document.deleted",
            {"document_id": document.id, "project_id": project_id, "storage_path": document.storage_path},
        )
    except Exception:
        # The document is already deleted for the user; only the file is left behind
        logger.exception("Could not publish document.deleted for %s", document.id)

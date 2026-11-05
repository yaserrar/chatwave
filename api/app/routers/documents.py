from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, BackgroundTasks
from app.services.ingestion import process_document
from sqlalchemy import select, update
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_owned_project
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

from app.models.document import Document
from app.schemas.document import DocumentRead, DocumentUrlRead

from app.core.config import get_settings
from pathlib import Path
from app.services import storage
import asyncio
import logging

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
    background_tasks: BackgroundTasks,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    # do 3 type checks using env vars

    document_id = uuid.uuid4()
    filename = file.filename
    mime_type = file.content_type
    ext = Path(filename).suffix.lower()
    content = await file.read()
    size = len(content)

    settings = get_settings()
    if not ext or ext not in settings.allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
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
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload file")

    document = Document(
        id=document_id, project_id=project_id, filename=filename, mime_type=mime_type, size=size, storage_path=key
    )

    session.add(document)
    await session.commit()
    await session.refresh(document)
    background_tasks.add_task(process_document, document.id)
    return document


@router.get("/{project_id}/documents/{document_id}", response_model=DocumentRead, status_code=status.HTTP_200_OK)
async def get_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    query = select(Document).where(Document.project_id == project_id).where(Document.id == document_id)
    # query = select(Document).filter_by(project_id=project_id, id=document_id)
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
):
    query = select(Document).where(Document.project_id == project_id).where(Document.id == document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await session.delete(document)

    await session.commit()

    try:
        await asyncio.to_thread(storage.delete_file, document.storage_path)
    except Exception as e:
        logger.exception("Failed to delete file %s", document.storage_path)

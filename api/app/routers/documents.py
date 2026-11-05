from fastapi import APIRouter, Depends, status, HTTPException, UploadFile
from sqlalchemy import select, update
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

from app.models.document import Document
from app.schemas.document import DocumentRead

from app.core.config import get_settings
from pathlib import Path

router = APIRouter(tags=["documents"])


@router.get("/{project_id}/documents", response_model=list[DocumentRead], status_code=status.HTTP_200_OK)
async def get_documents(  project_id: uuid.UUID,session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    query = select(Document).order_by(Document.created_at).where(Document.project_id==project_id)
    result = await session.execute(query)
    documents = result.scalars().all()
    return documents



@router.post("/{project_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(  project_id: uuid.UUID,
                            file: UploadFile,
                            session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # do 3 type checks using env vars
    

    document_id = uuid.uuid4()
    filename = file.filename
    mime_type = file.content_type
    ext = Path(filename).suffix.lower()
    content = await file.read()
    size=len(content)


    settings = get_settings()
    if not ext or ext not in settings.allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")
    if size > settings.max_file_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")
    if size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a name")

  
    doc_path = Path(get_settings().upload_dir + '/' + str(project_id)  + '/' + str(document_id) + ext)
    doc_path.parent.mkdir(parents=True, exist_ok=True)
    doc_path.write_bytes(content)


    document = Document(   id=document_id, project_id=project_id,
                        filename=filename, mime_type=mime_type,
                        size=size, storage_path=str(doc_path))

    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document



@router.get("/{project_id}/documents/{document_id}", response_model=DocumentRead, status_code=status.HTTP_200_OK)
async def get_document(project_id: uuid.UUID, document_id: uuid.UUID,   session: AsyncSession = Depends(get_session)):
    query = select(Document).where(Document.project_id==project_id).where (Document.id==document_id)
    # query = select(Document).filter_by(project_id=project_id, id=document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return document



@router.delete("/{project_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(project_id: uuid.UUID, document_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    query = select(Document).where(Document.project_id==project_id).where(Document.id==document_id)
    result = await session.execute(query)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await session.delete(document)
    await session.commit()

    Path(document.storage_path).unlink(missing_ok=True)
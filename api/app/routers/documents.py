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

@router.post("/{project_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(  project_id: uuid.UUID,
                            file: UploadFile,
                            session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    document_id = uuid.uuid4()
    filename = file.filename
    mime_type = file.content_type
    ext = Path(filename).suffix
    doc_path = Path(get_settings().upload_dir + '/' + str(project_id)  + '/' + str(document_id) + ext)
    doc_path.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    doc_path.write_bytes(content)


    document = Document(   id=document_id, project_id=project_id,
                        filename=filename, mime_type=mime_type,
                        size=len(content), storage_path=str(doc_path))

    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document
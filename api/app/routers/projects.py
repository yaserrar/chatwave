from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import func, select, update
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_current_user, get_owned_project
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
import logging
import asyncio
from app.services import storage
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def get_projects(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    query = select(Project).where(Project.created_by == user.id).order_by(Project.created_at.desc())
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project: Project = Depends(get_owned_project)):
    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    max_projects = get_settings().max_projects_per_user
    count = await session.scalar(select(func.count()).select_from(Project).where(Project.created_by == user.id))
    if count >= max_projects:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Project limit reached ({max_projects})")
    project = Project(**payload.model_dump(), created_by=user.id)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = (
        update(Project)
        .where(Project.id == project_id, Project.created_by == user.id)
        .values(**payload.model_dump(exclude_unset=True))
        .returning(Project)
    )
    result = await session.execute(query)

    new_project = result.scalar_one_or_none()

    if new_project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not edited")

    await session.commit()
    return new_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    # Documents, chunks, conversations and messages go with it (ON DELETE CASCADE)
    await session.delete(project)
    await session.commit()

    # Then the files. The rows are already gone, so a failure here is logged, not returned.
    try:
        await asyncio.to_thread(storage.delete_folder, storage.project_prefix(project_id))
    except Exception:
        logger.exception("Failed to delete S3 files of project %s", project_id)

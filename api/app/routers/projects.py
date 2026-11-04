from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(tags=["projects"])

@router.get("", response_model=list[ProjectRead])
async def get_projects(session: AsyncSession = Depends(get_session)):
    query = select(Project).order_by(Project.created_at.desc())
    result = await session.execute(query)
    return result.scalars().all()

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    # Best way
    # query = select(Project).where(Project.id == project_id)
    # result = await session.execute(query)
    # try:
    #     project = result.scalar_one()
    # except Exception:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # OR you could use scalar_one_or_none() and check for None
    # project = result.scalar_one_or_none()
    # if project is None:
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # OR use session.get
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return project

@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    session: AsyncSession = Depends(get_session),
):
    project = Project(**payload.model_dump())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project



@router.put("/{project_id}", response_model=ProjectRead, status_code=status.HTTP_200_OK)
async def  update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.name = payload.name
    project.description = payload.description
    await session.commit()  
    await session.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    await session.delete(project)
    await session.commit()


from fastapi import Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.core.config import get_settings
from app.core.security import read_session_token
from app.core.db import get_session
from app.models import User, Project


async def get_current_user(request: Request, session=Depends(get_session)) -> User:
    token = request.cookies.get(get_settings().session_cookie_name)
    user_id = token and read_session_token(token)
    user = user_id and await session.get(User, user_id)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def get_owned_project(project_id: UUID, user=Depends(get_current_user), session=Depends(get_session)) -> Project:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.created_by == user.id))
    if not project:
        raise HTTPException(404, "Project not found")
    return project

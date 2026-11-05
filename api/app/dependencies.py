from fastapi import Request, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.config import get_settings
from app.core.security import read_session_token
from app.core.db import get_session
from app.models import User, Project, Conversation


async def get_current_user(request: Request, session: AsyncSession = Depends(get_session)) -> User:
    token = request.cookies.get(get_settings().session_cookie_name)
    user_id = read_session_token(token) if token else None
    user = await session.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def get_owned_project(
    project_id: UUID, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)
) -> Project:
    project = await session.scalar(select(Project).where(Project.id == project_id, Project.created_by == user.id))
    if not project:
        raise HTTPException(404, "Project not found")
    return project


async def get_owned_conversation(
    conversation_id: UUID, user=Depends(get_current_user), session=Depends(get_session)
) -> Conversation:
    conversation = await session.scalar(
        select(Conversation)
        .join(Project, Project.id == Conversation.project_id)
        .where(Conversation.id == conversation_id, Project.created_by == user.id)
    )
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    return conversation

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate, ConversationRead, MessageRead

# No prefix: the paths start with /projects/... or /conversations/..., so they are written in full below
router = APIRouter(tags=["conversations"])


@router.post("/projects/{project_id}/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    project_id: uuid.UUID,
    payload: ConversationCreate,
    session: AsyncSession = Depends(get_session),
):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    conversation = Conversation(project_id=project_id, title=payload.title)
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


@router.get("/projects/{project_id}/conversations", response_model=list[ConversationRead])
async def get_conversations(project_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Most recently active first
    query = select(Conversation).where(Conversation.project_id == project_id).order_by(Conversation.updated_at.desc())
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def get_messages(conversation_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Oldest first, so the chat reads from top to bottom
    query = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    result = await session.execute(query)
    return result.scalars().all()

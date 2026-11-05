import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_owned_conversation, get_owned_project
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import AskRequest, ConversationCreate, ConversationRead, MessageRead
from app.services.rag import answer_question

logger = logging.getLogger(__name__)

# No prefix: the paths start with /projects/... or /conversations/..., so they are written in full below
router = APIRouter(tags=["conversations"])


@router.post("/projects/{project_id}/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    project_id: uuid.UUID,
    payload: ConversationCreate,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    conversation = Conversation(project_id=project_id, title=payload.title)
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


@router.get("/projects/{project_id}/conversations", response_model=list[ConversationRead])
async def get_conversations(
    project_id: uuid.UUID,
    project: Project = Depends(get_owned_project),
    session: AsyncSession = Depends(get_session),
):
    # Most recently active first
    query = select(Conversation).where(Conversation.project_id == project_id).order_by(Conversation.updated_at.desc())
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def get_messages(
    conversation_id: uuid.UUID,
    conversation: Conversation = Depends(get_owned_conversation),
    session: AsyncSession = Depends(get_session),
):
    # Oldest first, so the chat reads from top to bottom
    query = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("/conversations/{conversation_id}/ask", response_model=MessageRead)
async def ask(
    conversation_id: uuid.UUID,
    payload: AskRequest,
    conversation: Conversation = Depends(get_owned_conversation),
    session: AsyncSession = Depends(get_session),
):
    """Answers a question from the project's documents. Returns the assistant's message, with its sources."""
    try:
        return await answer_question(session, conversation, payload.question)
    except ValueError as e:
        # Our own clear errors, e.g. "CLAUDE_API_KEY is not set"
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception:
        # OpenAI or Claude failed (network, rate limit...): full error in the logs, short message for the client
        logger.exception("Answering failed for conversation %s", conversation_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not generate an answer right now. Try again.")

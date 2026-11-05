import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, status
from fastapi.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.dependencies import get_owned_conversation, get_owned_project, limit_messages
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


@router.post(
    "/conversations/{conversation_id}/ask",
    response_class=EventSourceResponse,
    dependencies=[Depends(limit_messages)],
)
async def ask(
    conversation_id: uuid.UUID,
    payload: AskRequest,
    conversation: Conversation = Depends(get_owned_conversation),
    session: AsyncSession = Depends(get_session),
) -> AsyncIterator[ServerSentEvent]:
    """
    Answers a question from the project's documents, streamed with Server-Sent Events (SSE):

    - `delta`: {"text": "..."}, a piece of the answer, as Claude writes it
    - `done`:  the saved assistant message (MessageRead), with its sources. Always the last event.
    - `error`: {"detail": "..."} if answering failed. Also the last event.

    The checks (owner, rate limit) run before the stream starts, so they still answer with a normal
    404 / 429. The database session stays open until the stream ends.
    """
    try:
        async for item in answer_question(session, conversation, payload.question):
            if isinstance(item, Message):
                yield ServerSentEvent(event="done", data=MessageRead.model_validate(item))
            else:
                yield ServerSentEvent(event="delta", data={"text": item})
    # The response has already started (status 200), so errors are sent as an event, not an HTTP error
    except ValueError as e:
        # Our own clear errors, e.g. "CLAUDE_API_KEY is not set"
        yield ServerSentEvent(event="error", data={"detail": str(e)})
    except Exception:
        # OpenAI or Claude failed (network, rate limit...): full error in the logs, short message for the client
        logger.exception("Answering failed for conversation %s", conversation_id)
        yield ServerSentEvent(event="error", data={"detail": "Could not generate an answer right now. Try again."})

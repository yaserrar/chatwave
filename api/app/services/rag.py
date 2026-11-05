import re
import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.services.embeddings import embed_query
from app.services.llm import generate_answer

TOP_K = 5             # how many chunks are given to Claude
HISTORY_MESSAGES = 6  # how many earlier messages are sent along (3 questions + 3 answers)

# Stays the same for every question, so it is the system prompt. The chunks go in the user message.
SYSTEM_PROMPT = """You answer questions about the documents of one project.

Rules:
- Use only the numbered passages inside <context>. Do not use outside knowledge.
- If the passages do not contain the answer, say that you could not find it in this project's documents.
- After each fact, cite the passage it comes from, like [1] or [2][3].
- Answer in the same language as the question. Be clear and concise."""


@dataclass
class RetrievedChunk:
    content: str
    page_number: int
    document_id: uuid.UUID
    filename: str


# ---------- 1. Vector search ----------

async def search_chunks(session: AsyncSession, project_id: uuid.UUID, question_vector: list[float]) -> list[RetrievedChunk]:
    """The TOP_K chunks closest in meaning to the question, from this project's ready documents only."""
    query = (
        select(Chunk.content, Chunk.page_number, Chunk.document_id, Document.filename)
        .join(Document, Document.id == Chunk.document_id)
        # Project isolation: never search another project's chunks
        .where(Chunk.project_id == project_id)
        .where(Document.status == "ready")
        # pgvector: smaller cosine distance = closer meaning
        .order_by(Chunk.embedding.cosine_distance(question_vector))
        .limit(TOP_K)
    )
    result = await session.execute(query)
    return [RetrievedChunk(*row) for row in result.all()]


# ---------- 2. Prompt ----------

def build_context(chunks: list[RetrievedChunk]) -> str:
    """Numbered passages, so Claude can cite them as [1], [2]..."""
    if not chunks:
        return "<context>\n(no passages found)\n</context>"
    passages = [
        f"[{i}] ({chunk.filename}, page {chunk.page_number})\n{chunk.content}"
        for i, chunk in enumerate(chunks, start=1)
    ]
    return "<context>\n" + "\n\n".join(passages) + "\n</context>"


async def load_history(session: AsyncSession, conversation_id: uuid.UUID) -> list[dict]:
    """The last HISTORY_MESSAGES messages, oldest first, in Claude's format."""
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_MESSAGES)
    )
    result = await session.execute(query)
    messages = list(reversed(result.scalars().all()))

    history = [{"role": m.role, "content": m.content} for m in messages]
    # Claude needs the conversation to start with a user message
    while history and history[0]["role"] != "user":
        history.pop(0)
    return history


# ---------- 3. Sources ----------

def cited_sources(answer: str, chunks: list[RetrievedChunk]) -> list[dict]:
    """
    The sources the answer actually cites ([1], [3]...), without duplicates.
    If Claude cited nothing (e.g. "I could not find it"), there are no sources.
    """
    cited_numbers = [int(n) for n in re.findall(r"\[(\d+)\]", answer)]

    sources = []
    seen = set()
    for n in cited_numbers:
        if not 1 <= n <= len(chunks):
            continue  # Claude cited a passage that does not exist
        chunk = chunks[n - 1]
        key = (chunk.document_id, chunk.page_number)
        if key in seen:
            continue
        seen.add(key)
        # Stored as JSON, so the UUID becomes a string
        sources.append({"document_id": str(chunk.document_id), "filename": chunk.filename, "page_number": chunk.page_number})
    return sources


# ---------- 4. The whole flow ----------

async def answer_question(session: AsyncSession, conversation: Conversation, question: str) -> Message:
    """Saves the question, answers it from the project's documents, saves and returns the answer."""
    # History first, so it does not include the new question
    history = await load_history(session, conversation.id)

    session.add(Message(conversation_id=conversation.id, role="user", content=question))
    await session.commit()

    question_vector = await embed_query(question)
    chunks = await search_chunks(session, conversation.project_id, question_vector)

    user_message = f"{build_context(chunks)}\n\nQuestion: {question}"
    answer = await generate_answer(SYSTEM_PROMPT, history + [{"role": "user", "content": user_message}])

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
        sources=cited_sources(answer, chunks),
    )
    session.add(assistant_message)

    # The first question becomes the title; every question moves the conversation to the top of the list
    if not conversation.title:
        conversation.title = question[:80]
    conversation.updated_at = func.now()

    await session.commit()
    await session.refresh(assistant_message)
    return assistant_message

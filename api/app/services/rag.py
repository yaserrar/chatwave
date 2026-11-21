import re
import uuid
from collections.abc import AsyncIterator

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.confidence import NOT_FOUND_MARKER, NotFoundMarker, grade, is_follow_up, not_found_message
from app.services.embeddings import embed_query
from app.services.llm import REFUSAL_MESSAGE, StreamResult, stream_answer
from app.services.retrieval import Retrieval, RetrievedChunk, retrieve

HISTORY_MESSAGES = 6  # how many earlier messages are sent along (3 questions + 3 answers)
CLOSEST_PASSAGES = 3  # passages listed under a "not found" answer

# Stays the same for every question, so it is the system prompt. The chunks go in the user message.
SYSTEM_PROMPT = f"""You answer questions about the documents of one project.

Rules:
- Use only the numbered passages inside <context>. Do not use outside knowledge.
- After each fact, cite the passage it comes from, like [1] or [2][3].
- If a question has several parts and the passages answer only some, answer those and say which parts the documents \
don't cover.
- If the passages don't answer the question itself, even when they mention its topic, start your reply with \
{NOT_FOUND_MARKER} on its own line, then say in one or two sentences that this project's documents don't cover it, \
and briefly what they do say on the topic if that helps. Never guess.
- Answer in the same language as the question. Be clear and concise."""


# ---------- Prompt ----------

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


# ---------- Sources ----------

def source_of(passage: int, chunk: RetrievedChunk) -> dict:
    """
    What the browser needs to open a passage: the file, the page, and where the text is on it.
    Stored as JSON, so the UUID becomes a string. `excerpt` is the passage itself: the viewer highlights it,
    and shows it as is if it can't be found on the page.
    """
    return {
        "passage": passage,
        "document_id": str(chunk.document_id),
        "filename": chunk.filename,
        "page_number": chunk.page_number,
        "chunk_id": chunk.chunk_id,
        "char_start": chunk.char_start,
        "char_end": chunk.char_end,
        "excerpt": chunk.content,
    }


def cited_sources(answer: str, chunks: list[RetrievedChunk]) -> list[dict]:
    """
    The passages the answer actually cites ([1], [3]...), in order of first citation, without duplicates.
    `passage` keeps the number used in the answer's text, so the browser can link each marker to its source.
    If Claude cited nothing, there are no sources.
    """
    sources = []
    seen = set()
    for n in (int(n) for n in re.findall(r"\[(\d+)\]", answer)):
        if not 1 <= n <= len(chunks) or n in seen:
            continue  # cited twice, or a passage that does not exist
        seen.add(n)
        sources.append(source_of(n, chunks[n - 1]))
    return sources


def closest_sources(chunks: list[RetrievedChunk]) -> list[dict]:
    """The best passages found, listed under a "not found" answer so the reader can check for themselves."""
    return [source_of(n, chunk) for n, chunk in enumerate(chunks[:CLOSEST_PASSAGES], start=1)]


# ---------- The whole flow ----------

async def search(session: AsyncSession, project_id: uuid.UUID, text: str) -> Retrieval:
    """The project's passages that best match `text` (hybrid search)."""
    vector = await embed_query(text)
    return await retrieve(session, project_id, text, vector, top_k=get_settings().retrieval_top_k)


async def answer_question(
    session: AsyncSession, conversation: Conversation, question: str
) -> AsyncIterator[str | Message]:
    """
    Saves the question and answers it from the project's documents.

    Yields the answer text piece by piece (str) while Claude writes it, then the saved answer (Message) last.
    When the evidence is under the floor, Claude is not called: the answer is a "not found" message in the
    question's language, with no pieces.
    """
    # History first, so it does not include the new question
    history = await load_history(session, conversation.id)

    session.add(Message(conversation_id=conversation.id, role="user", content=question))
    await session.commit()

    retrieval = await search(session, conversation.project_id, question)
    confidence = grade(retrieval, question)

    # A follow-up ("and the second one?") finds little on its own: it is searched again together with the
    # previous question, and only skips Claude if that is under the floor too
    previous_question = next((m["content"] for m in reversed(history) if m["role"] == "user"), None)
    if confidence is None and previous_question and is_follow_up(question):
        in_context = f"{previous_question}\n{question}"
        retrieval = await search(session, conversation.project_id, in_context)
        confidence = grade(retrieval, in_context)
    chunks = retrieval.chunks

    if confidence is None:
        answer, not_found, sources = not_found_message(question), True, closest_sources(chunks)
    else:
        user_message = f"{build_context(chunks)}\n\nQuestion: {question}"
        result = StreamResult()
        marker = NotFoundMarker()
        pieces = []
        async for text in stream_answer(SYSTEM_PROMPT, history + [{"role": "user", "content": user_message}], result):
            for piece in marker.feed(text):
                pieces.append(piece)
                yield piece
        for piece in marker.finish():
            pieces.append(piece)
            yield piece

        # Even the fallback model declined: save that instead of a cut-off answer
        answer = REFUSAL_MESSAGE if result.refused else "".join(pieces).strip()
        not_found = marker.found and not result.refused
        if not_found:
            sources = closest_sources(chunks)
        elif result.refused:
            sources = []
        else:
            sources = cited_sources(answer, chunks)

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
        sources=sources,
        confidence=confidence or "low",
        not_found=not_found,
    )
    session.add(assistant_message)

    # The first question becomes the title; every question moves the conversation to the top of the list
    if not conversation.title:
        conversation.title = question[:80]
    conversation.updated_at = func.now()

    await session.commit()
    await session.refresh(assistant_message)
    yield assistant_message

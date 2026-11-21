from datetime import datetime
import uuid
from sqlalchemy import Boolean, String, Text, DateTime, ForeignKey, false, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)

    role: Mapped[str] = mapped_column(String(20))  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text)

    # Only on assistant messages: the passages the answer cites (or, when `not_found`, the closest ones), e.g.
    # [{"passage": 2, "document_id": "...", "filename": "manual.pdf", "page_number": 3, "chunk_id": 41,
    #   "char_start": 120, "char_end": 1980, "excerpt": "..."}]
    # Answers saved before citations pointed at chunks only have document_id, filename and page_number.
    sources: Mapped[list[dict] | None] = mapped_column(JSONB)

    # Only on assistant messages: how strong the retrieved evidence was ("high", "medium", "low").
    # Null on user messages and on answers saved before it was measured.
    confidence: Mapped[str | None] = mapped_column(String(10))
    # True when the documents don't answer the question: the evidence was too weak to ask Claude,
    # or Claude said the passages don't contain the answer
    not_found: Mapped[bool] = mapped_column(Boolean, server_default=false(), default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

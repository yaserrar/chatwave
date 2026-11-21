from pgvector.sqlalchemy import Vector
from app.core.db import Base
from datetime import datetime
import uuid
from sqlalchemy import Computed, Index, Text, func, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

# Full-text search configuration created by the migration: the "simple" parser and dictionary (no stemming,
# no stop words, so it works the same for English and French) with accents removed (unaccent), so "resume"
# finds "résumé". It must stay in sync with the generated column below and with app/services/retrieval.py.
TEXT_SEARCH_CONFIG = "chatwave_text"


class Chunk(Base):
    __tablename__ = "chunks"

    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    page_number: Mapped[int | None] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    # Where `content` sits in its page's text (whole file for Markdown/text). Null for chunks indexed before
    # offsets were stored: the viewer then finds the passage by its text.
    char_start: Mapped[int | None] = mapped_column(Integer)
    char_end: Mapped[int | None] = mapped_column(Integer)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    # Keyword search: computed by Postgres from `content` on every insert, never written by the app
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR, Computed(f"to_tsvector('{TEXT_SEARCH_CONFIG}'::regconfig, content)", persisted=True)
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (Index("ix_chunks_search_vector", "search_vector", postgresql_using="gin"),)

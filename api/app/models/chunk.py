from pgvector.sqlalchemy import Vector
from app.core.db import Base
from datetime import datetime
import uuid
from sqlalchemy import Column, Text, func, String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column


class Chunk(Base):
    __tablename__ = "chunks"

    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    page_number: Mapped[int | None] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
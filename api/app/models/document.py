from datetime import datetime
import uuid
from sqlalchemy import Column, Text, func, String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Document(Base):
    __tablename__ = 'documents'

    id: Mapped[uuid.UUID] = mapped_column( primary_key=True, default=uuid.uuid4)
    project_id : Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    
    filename : Mapped[str] = mapped_column(String, nullable=False)
    mime_type : Mapped[str] = mapped_column(String, nullable=False)
    size : Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path : Mapped[str] = mapped_column(String, nullable=False)
    status : Mapped[str] = mapped_column(String, nullable=False, default="pending")
    error_message : Mapped[str| None] = mapped_column(Text)
    page_count : Mapped[int| None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)




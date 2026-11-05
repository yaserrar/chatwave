
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
import uuid


class ConversationCreate(BaseModel):
    # Everything is optional, so the client can send {}
    title: Optional[str] = Field(None, max_length=255, description="Optional title of the conversation")


class ConversationRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SourceRead(BaseModel):
    """One document passage an answer was based on (stored as JSON in messages.sources)."""
    document_id: uuid.UUID
    filename: str
    page_number: int


class AskRequest(BaseModel):
    # Spaces around the question are removed, so "   " counts as empty
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=4000, description="The question to answer from the project's documents")


class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str  # "user" or "assistant"
    content: str
    sources: Optional[list[SourceRead]]  # None for user messages
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

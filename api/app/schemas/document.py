from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
import uuid


class DocumentRead(BaseModel):

    id: uuid.UUID
    project_id: uuid.UUID
    filename: str
    mime_type: str
    size: int
    status: str
    error_message: Optional[str]
    page_count: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUrlRead(BaseModel):

    id: uuid.UUID
    url: str
    expires_in: int

    model_config = ConfigDict(from_attributes=True)


class DocumentFromUrl(BaseModel):
    # Spaces around a pasted link are removed, so " https://… " still works
    model_config = ConfigDict(str_strip_whitespace=True)

    url: str = Field(min_length=1, max_length=2048, description="Direct link to a PDF, Markdown or text file")

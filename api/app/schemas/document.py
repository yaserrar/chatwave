
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
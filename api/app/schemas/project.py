from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
import uuid


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255, description="The name of the project")
    description: Optional[str] = Field(None, description="The description of the project")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="The name of the project")
    description: Optional[str] = Field(None, description="The description of the project")

class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True) 

    id: uuid.UUID
    name: str
    description: Optional[str] 
    created_at: datetime
    updated_at: datetime

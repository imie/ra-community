"""
Pydantic schemas for Announcements
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class AnnouncementBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    priority: str = Field(default="normal", description="low, normal, high, or urgent")
    is_published: bool = False


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    priority: Optional[str] = None
    is_published: Optional[bool] = None


class AnnouncementResponse(AnnouncementBase):
    id: UUID
    author_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    announcements: list[AnnouncementResponse]

    model_config = {"from_attributes": True}

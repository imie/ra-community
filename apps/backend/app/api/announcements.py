"""
Announcements API endpoints
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementListResponse
)
from app.api.auth import get_current_user
from app.api.admin import get_admin_user

router = APIRouter(tags=["announcements"])


# ── Resident Endpoints (Read-Only) ─────────────────────────────────────────

@router.get("/api/announcements", response_model=AnnouncementListResponse)
def list_published_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Any:
    """List published announcements (accessible to all authenticated residents)."""
    q = db.query(Announcement).filter(Announcement.is_published == True)
    total = q.count()
    
    # Priority sorting (urgent -> high -> normal -> low) + created_at
    # In Postgres, ENUMs sort by the order they were defined in the CREATE TYPE.
    # We defined it as: 'low', 'normal', 'high', 'urgent'.
    # So descending sort will put 'urgent' first.
    announcements = q.order_by(
        desc(Announcement.priority), 
        desc(Announcement.created_at)
    ).offset((page - 1) * page_size).limit(page_size).all()

    return AnnouncementListResponse(
        total=total,
        page=page,
        page_size=page_size,
        announcements=announcements,
    )


@router.get("/api/announcements/{announcement_id}", response_model=AnnouncementResponse)
def get_published_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> Any:
    """Get a specific published announcement."""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.is_published == True
    ).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return announcement


# ── Admin Endpoints (Full CRUD) ────────────────────────────────────────────

@router.get("/api/admin/announcements", response_model=AnnouncementListResponse)
def admin_list_announcements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """List ALL announcements (including drafts) for admins."""
    q = db.query(Announcement)
    total = q.count()
    announcements = q.order_by(desc(Announcement.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return AnnouncementListResponse(
        total=total,
        page=page,
        page_size=page_size,
        announcements=announcements,
    )


@router.post("/api/admin/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> Any:
    """Create a new announcement."""
    announcement = Announcement(
        title=data.title,
        content=data.content,
        priority=data.priority,
        is_published=data.is_published,
        author_id=admin.id
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.patch("/api/admin/announcements/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: str,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> Any:
    """Update an existing announcement."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(announcement, field, value)

    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.delete("/api/admin/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> None:
    """Delete an announcement."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    db.delete(announcement)
    db.commit()

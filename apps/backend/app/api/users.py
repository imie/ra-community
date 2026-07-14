"""
User profile endpoints for the RA Community API.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import UserProfileUpdate, UserResponse
from app.api.auth import get_current_user

router = APIRouter(tags=["users"])


@router.get("/api/users/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.put("/api/users/me", response_model=UserResponse)
def update_me(update_request: UserProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    for field, value in update_request.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

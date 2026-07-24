"""
User profile endpoints for the RA Community API.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import UserProfileUpdate, UserResponse
from app.api.auth import get_current_user
from app.utils.phone import normalize_phone_number

router = APIRouter(tags=["users"])


@router.get("/api/users/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.put("/api/users/me", response_model=UserResponse)
def update_me(update_request: UserProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    for field, value in update_request.model_dump(exclude_unset=True).items():
        if field == "phone_number":
            value = normalize_phone_number(value)
        setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/api/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    Deactivate account and anonymize sensitive Personal Identifiable Information (PII).
    Required by Apple App Store (Guideline 5.1.1v) & Google Play Account Deletion Policy.
    """
    current_user.is_active = False
    current_user.full_name = f"Deleted User {current_user.id[:8]}"
    current_user.phone_number = None
    current_user.ic_number = None
    current_user.passport_number = None
    current_user.house_number = None
    current_user.jalan_aman_serenia = None
    current_user.employer_name = None
    current_user.employer_address = None
    current_user.employer_phone = None
    current_user.job_title = None

    db.add(current_user)
    db.commit()
    return None


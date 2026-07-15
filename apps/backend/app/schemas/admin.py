"""
Pydantic schemas for admin endpoints.
"""
from pydantic import BaseModel
from typing import List, Optional
from .user import UserResponse


class AdminUserUpdate(BaseModel):
    """Fields an admin can update on any user account."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    ic_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    place_of_birth: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    marital_status: Optional[str] = None
    num_dependents: Optional[int] = None
    taman_name: Optional[str] = None
    house_number: Optional[str] = None
    jalan_aman_serenia: Optional[str] = None
    job_title: Optional[str] = None
    employer_name: Optional[str] = None
    employer_address: Optional[str] = None
    employer_phone: Optional[str] = None
    # Admin-only fields
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    password: Optional[str] = None  # If set, password_hash is updated


class AdminUserListResponse(BaseModel):
    """Paginated user list response."""
    total: int
    page: int
    page_size: int
    users: List[UserResponse]

    model_config = {"from_attributes": True}


class BulkImportResult(BaseModel):
    """Result of a bulk Excel import."""
    created: int
    skipped: int
    errors: List[str]

"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional
from uuid import UUID


class UserProfileUpdate(BaseModel):
    """Fields a user is allowed to update on their own profile."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    ic_number: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[date] = None
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
    resident_type: Optional[str] = None


class UserResponse(BaseModel):
    """Public-facing user response shape."""
    id: UUID
    email: str
    full_name: str
    role: str = "resident"
    phone_number: Optional[str] = None
    ic_number: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[date] = None
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
    resident_type: Optional[str] = None
    committee_title: Optional[str] = None
    is_active: bool = False
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

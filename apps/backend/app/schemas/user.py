"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional
from uuid import UUID


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    ic_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    marital_status: Optional[str] = None
    taman_name: Optional[str] = None
    house_number: Optional[str] = None
    jalan_aman_serenia: Optional[str] = None
    job_title: Optional[str] = None
    employer_name: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone_number: Optional[str]
    role: str
    ic_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    marital_status: Optional[str] = None
    taman_name: Optional[str] = None
    house_number: Optional[str] = None
    jalan_aman_serenia: Optional[str] = None
    job_title: Optional[str] = None
    employer_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

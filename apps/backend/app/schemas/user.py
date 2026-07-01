"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from uuid import UUID

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone_number: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "email": "resident@example.com",
                "password": "SecurePassword123!",
                "full_name": "John Doe",
                "phone_number": "+60123456789"
            }
        }

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    ic_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
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
    ic_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
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

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

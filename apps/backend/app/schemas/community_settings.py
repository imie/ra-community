"""
Pydantic schemas for Community Settings and SSL configuration.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class CommunitySettingsBase(BaseModel):
    community_name: str = Field("RA Community — Taman Aman Serenia", max_length=255)
    logo_url: Optional[str] = None
    ssl_mode: str = Field("disabled", description="disabled | custom | letsencrypt")
    domain_name: Optional[str] = None
    admin_email: Optional[str] = None
    enforce_https: bool = False
    auto_renew: bool = True


class CommunitySettingsUpdate(BaseModel):
    community_name: Optional[str] = None
    logo_url: Optional[str] = None
    ssl_mode: Optional[str] = None
    domain_name: Optional[str] = None
    admin_email: Optional[str] = None
    enforce_https: Optional[bool] = None
    auto_renew: Optional[bool] = None


class CustomSSLUpload(BaseModel):
    fullchain_pem: str = Field(..., description="Fullchain SSL Certificate PEM content")
    privkey_pem: str = Field(..., description="Private Key PEM content")


class LetsEncryptRequest(BaseModel):
    domain_name: str = Field(..., description="Domain name for Let's Encrypt SSL, e.g. aman-serenia.my")
    admin_email: EmailStr = Field(..., description="Admin email for Let's Encrypt ACME notifications")


class CommunitySettingsResponse(CommunitySettingsBase):
    id: str
    ssl_status: str
    ssl_error_message: Optional[str] = None
    last_renewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

"""
Pydantic schemas for Community Settings and SSL configuration.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime


class CommunitySettingsBase(BaseModel):
    community_name: str = Field("RA Community — Taman Aman Serenia", max_length=255)
    logo_url: Optional[str] = None
    ssl_mode: str = Field("disabled", description="disabled | custom | cloudflare | letsencrypt")
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
    """Upload a custom (self-managed) SSL certificate."""
    fullchain_pem: str = Field(..., description="Fullchain SSL Certificate PEM content")
    privkey_pem: str = Field(..., description="Private Key PEM content")


class CloudflareSSLUpload(BaseModel):
    """
    Upload a Cloudflare Origin Certificate.

    How to obtain from Cloudflare:
      1. Cloudflare Dashboard → your domain → SSL/TLS → Origin Server
      2. Click 'Create Certificate'
      3. Choose key type (RSA or ECDSA), set validity (up to 15 years)
      4. Copy 'Origin Certificate' → paste into fullchain_pem
      5. Copy 'Private Key' → paste into privkey_pem
      6. Set Cloudflare SSL/TLS mode to 'Full (strict)'
    """
    fullchain_pem: str = Field(..., description="Cloudflare Origin Certificate PEM (-----BEGIN CERTIFICATE-----)")
    privkey_pem: str = Field(..., description="Cloudflare Origin Certificate Private Key PEM")


class LetsEncryptRequest(BaseModel):
    domain_name: str = Field(..., description="Domain name for Let's Encrypt SSL, e.g. aman-serenia.my")
    admin_email: EmailStr = Field(..., description="Admin email for Let's Encrypt ACME notifications")


class CommunitySettingsResponse(CommunitySettingsBase):
    id: str
    ssl_status: str
    ssl_provider: Optional[str] = None        # 'letsencrypt' | 'cloudflare' | 'custom' | None
    cert_expires_at: Optional[datetime] = None # Parsed from cert PEM at upload time
    ssl_error_message: Optional[str] = None
    last_renewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

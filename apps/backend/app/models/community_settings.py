"""
Community Settings model for community branding, logo, and SSL/HTTPS configuration.
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, func
from sqlalchemy import Uuid as SAUuid
import uuid
from app.db.database import Base


class CommunitySettings(Base):
    """
    Singleton-style settings table for community level branding & security configuration.
    """
    __tablename__ = "community_settings"

    id = Column(SAUuid(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    
    # Branding
    community_name = Column(String(255), nullable=False, default="RA Community — Taman Aman Serenia")
    logo_url = Column(Text, nullable=True)
    
    # SSL & HTTPS Security
    # ssl_mode: 'disabled' | 'custom' | 'cloudflare' | 'letsencrypt'
    ssl_mode = Column(String(50), nullable=False, default="disabled")
    domain_name = Column(String(255), nullable=True)
    admin_email = Column(String(255), nullable=True)
    enforce_https = Column(Boolean, nullable=False, default=False)
    
    # ssl_provider: which provider issued the cert currently written to /etc/nginx/ssl/
    # Values: 'letsencrypt' | 'cloudflare' | 'custom' | None
    ssl_provider = Column(String(50), nullable=True)

    # Canonical cert paths on the host filesystem (always the unified Nginx-read paths)
    custom_cert_path = Column(Text, nullable=True)
    custom_key_path = Column(Text, nullable=True)

    # Certificate expiry date — parsed from the PEM at upload time, displayed in admin UI
    cert_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Let's Encrypt / ACME status
    # ssl_status: 'disabled' | 'active' | 'pending' | 'error'
    ssl_status = Column(String(50), nullable=False, default="disabled")
    ssl_error_message = Column(Text, nullable=True)
    auto_renew = Column(Boolean, nullable=False, default=True)
    last_renewed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

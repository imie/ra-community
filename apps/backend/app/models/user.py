"""
User model for resident accounts - comprehensive with 18 data fields
"""
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Date, Enum as SAEnum, func, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.database import Base


class User(Base):
    """
    User/Resident model with 18 core data fields:
    1. Email
    2. Full Name
    3. IC Number
    4. Date of Birth
    5. Place of Birth
    6. Age
    7. Sex
    8. Race
    9. Marital Status
    10. Number of Dependents
    11. Taman Name
    12. House Number
    13. Street Address
    14. Phone Number
    15. Job Title
    16. Employer Name
    17. Employer Address
    18. Employer Phone
    """
    __tablename__ = "users"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True, index=True)
    
    # Core resident information (18 fields)
    full_name = Column(String(255), nullable=False)
    ic_number = Column(String(50), unique=True, nullable=True, index=True)  # 1. IC Number
    date_of_birth = Column(Date, nullable=True)  # 2. Date of Birth
    place_of_birth = Column(String(255), nullable=True)  # 3. Place of Birth
    age = Column(Integer, nullable=True)  # 4. Age
    sex = Column(SAEnum('M', 'F', 'Other', name='sex_enum'), nullable=True)  # 5. Sex
    race = Column(SAEnum('Malay', 'Chinese', 'Indian', 'Eurasian', 'Kadazan', 'Iban', 'Other', name='race_enum'), nullable=True)  # 6. Race
    marital_status = Column(SAEnum('single', 'married', 'divorced', 'widowed', name='marital_status_enum'), nullable=True)  # 7. Marital Status
    num_dependents = Column(Integer, nullable=True, server_default='0')  # 8. Number of Dependents
    
    # Address information (3 address fields)
    taman_name = Column(String(255), nullable=True, index=True)  # 9. Taman Name (housing complex)
    house_number = Column(String(50), nullable=True, index=True)  # 10. House Number
    jalan_aman_serenia = Column(String(255), nullable=True)  # 11. Street Address
    
    # Employment information (4 employment fields)
    job_title = Column(String(255), nullable=True)  # 12. Job Title
    employer_name = Column(String(255), nullable=True)  # 13. Employer Name
    employer_address = Column(String(255), nullable=True)  # 14. Employer Address
    employer_phone = Column(String(20), nullable=True)  # 15. Employer Phone
    
    # Account management
    role = Column(SAEnum('admin', 'resident', 'guest', name='user_role_enum'), nullable=False, server_default='resident')
    status = Column(SAEnum('pending', 'active', 'suspended', 'deactivated', name='user_status_enum'), nullable=False, server_default='pending', index=True)
    verification_status = Column(SAEnum('not_started', 'pending', 'verified', 'rejected', name='verification_status_enum'), nullable=False, server_default='not_started', index=True)
    is_active = Column(Boolean, nullable=False, server_default='false', index=True)
    is_verified = Column(Boolean, nullable=False, server_default='false', index=True)
    email_verified_at = Column(DateTime, nullable=True)
    
    # Security and authentication
    failed_login_attempts = Column(Integer, nullable=False, server_default='0')
    account_locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, nullable=True)
    
    # OAuth provider IDs (for OAuth 2.0 integration)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    microsoft_id = Column(String(255), unique=True, nullable=True, index=True)
    apple_id = Column(String(255), unique=True, nullable=True, index=True)
    github_id = Column(String(255), unique=True, nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="PasswordResetToken.user_id"
    )
    
    email_verification_tokens = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="EmailVerificationToken.user_id"
    )
    
    oauth_credentials = relationship(
        "OAuthCredential",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="OAuthCredential.user_id"
    )
    
    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="AuditLog.user_id"
    )
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, full_name={self.full_name}, status={self.status})>"
    
    def is_account_locked(self) -> bool:
        """Check if account is currently locked"""
        if self.account_locked_until is None:
            return False
        return datetime.utcnow() < self.account_locked_until
    
    def mark_login_success(self):
        """Reset failed login attempts and update last login"""
        self.failed_login_attempts = 0
        self.account_locked_until = None
        self.last_login = datetime.utcnow()
    
    def increment_failed_login(self):
        """Increment failed login attempts for brute-force protection"""
        self.failed_login_attempts += 1


class PasswordResetToken(Base):
    """
    Password reset tokens for secure password recovery
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="password_reset_tokens", foreign_keys=[user_id])
    
    def is_valid(self) -> bool:
        """Check if token is still valid (not expired and not used)"""
        return datetime.utcnow() < self.expires_at and self.used_at is None
    
    def mark_used(self):
        """Mark token as used"""
        self.used_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class EmailVerificationToken(Base):
    """
    Email verification tokens for email verification
    """
    __tablename__ = "email_verification_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="email_verification_tokens", foreign_keys=[user_id])
    
    def is_valid(self) -> bool:
        """Check if token is still valid (not expired and not verified)"""
        return datetime.utcnow() < self.expires_at and self.verified_at is None
    
    def mark_verified(self):
        """Mark email as verified"""
        self.verified_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<EmailVerificationToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class OAuthCredential(Base):
    """
    OAuth 2.0 credentials for third-party provider authentication
    Supports Google, Microsoft, Apple, and GitHub
    """
    __tablename__ = "oauth_credentials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    provider = Column(SAEnum('google', 'microsoft', 'apple', 'github', name='oauth_provider_enum'), nullable=False, index=True)
    provider_user_id = Column(String(255), nullable=False)  # OAuth provider's user ID
    access_token = Column(String(500), nullable=False)
    refresh_token = Column(String(500), nullable=True)
    token_type = Column(String(20), nullable=False, server_default='Bearer')
    expires_at = Column(DateTime, nullable=True, index=True)
    scope = Column(String(500), nullable=True)
    raw_data = Column(JSON, nullable=True)  # Store additional provider-specific data
    is_primary = Column(Boolean, nullable=False, server_default='false', index=True)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="oauth_credentials", foreign_keys=[user_id])
    
    def is_token_expired(self) -> bool:
        """Check if OAuth token is expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f"<OAuthCredential(id={self.id}, user_id={self.user_id}, provider={self.provider})>"


class AuditLog(Base):
    """
    Audit logs for compliance, security, and debugging
    Tracks all significant actions in the system
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(SAEnum(
        'create', 'update', 'delete', 'login', 'logout',
        'password_reset', 'email_verification', 'profile_update',
        'account_lock', 'account_unlock', 'permission_change',
        'export', 'import',
        name='audit_action_enum'
    ), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)  # 'user', 'profile', etc.
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    description = Column(Text, nullable=True)
    changes = Column(JSON, nullable=True)  # Before/after values for tracking changes
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, server_default='success', index=True)  # success, failure
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    
    # Relationship
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource_type={self.resource_type}, status={self.status})>"

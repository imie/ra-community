"""
Auth-related request and response schemas.

Security hardening:
  - CVE-6: Password validator enforces uppercase, lowercase, digit, and special character.
"""
import re
from pydantic import BaseModel, EmailStr, Field, field_validator

# Allowed special characters for password
_SPECIAL_CHARS = r"!@#$%^&*()_+\-=\[\]{};':,./<>?"
_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[" + re.escape(_SPECIAL_CHARS) + r"]).{8,}$"
)


def _validate_password_strength(password: str) -> str:
    """Enforce strong password policy (CVE-6)."""
    if not _PASSWORD_RE.match(password):
        raise ValueError(
            "Password must be at least 8 characters and contain at least one uppercase letter, "
            "one lowercase letter, one digit, and one special character (!@#$%^&* etc.)"
        )
    return password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone_number: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

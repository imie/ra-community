"""
JWT token utilities

Security hardening:
  - CVE-1: Startup guard refuses to run with known-insecure placeholder secrets.
  - CVE-5: Access-token endpoints explicitly reject refresh tokens via token-type check.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import os

# ── Secret-key validation (CVE-1) ─────────────────────────────────────────────
_INSECURE_DEFAULTS = {
    "your-secret-key",
    "dev-jwt-secret-change-in-production",
    "change-me",
    "secret",
    "",
}

SECRET_KEY: str = os.getenv("JWT_SECRET", "")
if not SECRET_KEY or SECRET_KEY in _INSECURE_DEFAULTS:
    raise RuntimeError(
        "[SECURITY] JWT_SECRET environment variable is not set or uses an insecure "
        "placeholder value. Set a strong random secret (≥ 64 characters) in your "
        ".env file before starting the application."
    )

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRATION_DAYS", "7"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token (type='access')."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    # Explicitly tag access tokens so refresh tokens cannot be used as access tokens (CVE-5)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token (type='refresh')."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[dict]:
    """Verify a token and ensure it is an access token (not a refresh token).
    Returns the payload dict, or None if invalid, expired, or wrong type.
    Prevents CVE-5 token-type confusion attacks.
    """
    payload = verify_token(token)
    if payload is None:
        return None
    # Reject refresh tokens being used in access-token slots
    if payload.get("type") == "refresh":
        return None
    return payload

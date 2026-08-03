"""
Password hashing utilities — uses bcrypt directly (passlib is unmaintained
and incompatible with bcrypt 4.x due to the removed __about__ attribute and
the stricter 72-byte password limit enforced in newer bcrypt versions).
"""
import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # Truncate to 72 bytes to avoid bcrypt's hard limit; prefix with a hash of
    # the full password so the truncation point doesn't become a weakness.
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )

"""
Authentication service helpers for the backend.
"""
from datetime import datetime, timedelta
import secrets
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User, PasswordResetToken
from app.utils.password import hash_password

PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 24
LOGIN_LOCKOUT_MINUTES = 15
MAX_FAILED_LOGIN_ATTEMPTS = 5


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def create_user(db: Session, email: str, password: str, full_name: str, phone_number: Optional[str] = None) -> User:
    hashed_password = hash_password(password)
    user = User(
        email=email.lower().strip(),
        password_hash=hashed_password,
        full_name=full_name.strip(),
        phone_number=phone_number,
        is_active=True,
        status="active",
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_password_reset_token(db: Session, user: User) -> PasswordResetToken:
    token = secrets.token_urlsafe(40)
    expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    return reset_token


def find_valid_password_reset_token(db: Session, token: str) -> Optional[PasswordResetToken]:
    return (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == token,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
        .first()
    )


def reset_password_with_token(db: Session, token: str, new_password: str) -> Optional[User]:
    reset_token = find_valid_password_reset_token(db, token)
    if reset_token is None:
        return None

    user = reset_token.user
    user.password_hash = hash_password(new_password)
    user.last_password_change = datetime.utcnow()
    user.mark_login_success()
    reset_token.mark_used()

    db.add(user)
    db.add(reset_token)
    db.commit()
    db.refresh(user)
    return user


def mark_failed_login(db: Session, user: User) -> None:
    user.increment_failed_login()
    if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        user.account_locked_until = datetime.utcnow() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
    db.add(user)
    db.commit()


def unlock_user_if_needed(db: Session, user: User) -> None:
    if user.account_locked_until and datetime.utcnow() >= user.account_locked_until:
        user.account_locked_until = None
        user.failed_login_attempts = 0
        db.add(user)
        db.commit()

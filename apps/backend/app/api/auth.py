"""
Authentication routes for the RA Community API.
"""
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.auth import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserRegisterRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import (
    create_password_reset_token,
    create_user,
    get_user_by_email,
    mark_failed_login,
    reset_password_with_token,
    unlock_user_if_needed,
)
from app.utils.jwt import create_access_token, create_refresh_token, verify_token
from app.utils.password import verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    token_data = verify_token(token)
    if token_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

    user = get_user_by_email(db, token_data.get("email"))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive or suspended")

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_request: UserRegisterRequest, db: Session = Depends(get_db)) -> Any:
    existing = get_user_by_email(db, user_request.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = create_user(
        db,
        email=user_request.email,
        password=user_request.password,
        full_name=user_request.full_name,
        phone_number=user_request.phone_number,
    )
    return user


@router.post("/login", response_model=TokenResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)) -> Any:
    user = get_user_by_email(db, login_request.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    unlock_user_if_needed(db, user)
    if user.is_account_locked():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )

    if not verify_password(login_request.password, user.password_hash):
        mark_failed_login(db, user)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.mark_login_success()
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=int(access_token_expires.total_seconds()),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh_token_route(request: RefreshTokenRequest, db: Session = Depends(get_db)) -> Any:
    token_data = verify_token(request.refresh_token)
    if token_data is None or token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = get_user_by_email(db, token_data.get("email"))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )

    return AccessTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(access_token_expires.total_seconds()),
    )


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)) -> Any:
    user = get_user_by_email(db, request.email)
    if user is None:
        # Always return the same response to prevent user enumeration
        return {"message": "If this email is registered, a password reset link has been sent."}

    create_password_reset_token(db, user)
    # TODO: Send reset_token.token to user.email via email service (e.g. SendGrid / SES).
    # Never return the raw token in the HTTP response.
    return {"message": "If this email is registered, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)) -> Any:
    user = reset_password_with_token(db, request.token, request.new_password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired password reset token")

    return {"message": "Password reset successfully"}

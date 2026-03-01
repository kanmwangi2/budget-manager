from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.core.security import create_access_token, get_password_hash, verify_password
from app.dependencies import CurrentUser, DbSession
from app.models import User, UserRole
from app.schemas import (
    AuthLoginRequest,
    AuthMeResponse,
    AuthRegisterRequest,
    AuthTokenResponse,
    MessageOut,
    PasswordResetRequest,
    UserPreferences,
    UserUpdate,
)
from app.services import build_user_out, get_available_organizations

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def register(payload: AuthRegisterRequest, db: DbSession) -> MessageOut:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user_count = db.scalar(select(func.count(User.id))) or 0
    role = UserRole.app_admin if user_count == 0 else UserRole.user

    user = User(
        email=payload.email.lower(),
        name=payload.name.strip(),
        role=role,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    return MessageOut(message="Registration successful")


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: AuthLoginRequest, db: DbSession) -> AuthTokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    user.last_login = datetime.now(UTC)
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthTokenResponse(
        access_token=create_access_token(user.id),
        user=build_user_out(db, user),
        available_organizations=get_available_organizations(db, user),
    )


@router.get("/me", response_model=AuthMeResponse)
def me(current_user: CurrentUser, db: DbSession) -> AuthMeResponse:
    return AuthMeResponse(
        user=build_user_out(db, current_user),
        available_organizations=get_available_organizations(db, current_user),
    )


@router.post("/reset-password", response_model=MessageOut)
def reset_password(_payload: PasswordResetRequest) -> MessageOut:
    # Password reset delivery requires SMTP/provider integration and is intentionally stubbed.
    return MessageOut(message="If the account exists, a password reset email will be sent")


@router.patch("/me", response_model=AuthMeResponse)
def update_me(payload: UserUpdate, current_user: CurrentUser, db: DbSession) -> AuthMeResponse:
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.avatar is not None:
        current_user.avatar = payload.avatar
    if payload.preferences is not None:
        preferences = payload.preferences.model_dump(by_alias=True)
        current_user.preferences = UserPreferences(**preferences).model_dump(by_alias=True)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return AuthMeResponse(
        user=build_user_out(db, current_user),
        available_organizations=get_available_organizations(db, current_user),
    )


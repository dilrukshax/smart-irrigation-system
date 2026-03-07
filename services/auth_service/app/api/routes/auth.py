"""
Authentication API routes.
Handles user registration, login, token refresh, and current user info.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.db.postgres import get_db_session
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    RefreshTokenResponse,
    UserInfo,
)
from app.schemas.user import UserCreate, UserOut
from app.dependencies.auth import get_current_user, get_user_response


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db_session),
):
    user = User(
        username=user_data.username.lower().strip(),
        hashed_password=hash_password(user_data.password),
        email=user_data.email.lower().strip() if user_data.email else None,
        roles=["user"],
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError as e:
        await db.rollback()
        err = str(e.orig).lower() if e.orig else str(e).lower()
        if "username" in err:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
        if "email" in err:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")
    return get_user_response(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get tokens",
)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(User).where(User.username == credentials.username.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    token_data = {"sub": str(user.id), "username": user.username, "roles": user.roles or ["user"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserInfo(id=str(user.id), username=user.username, roles=user.roles or ["user"]),
    )


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db_session),
):
    payload = decode_refresh_token(request.refresh_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token")
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    token_data = {"sub": str(user.id), "username": user.username, "roles": user.roles or ["user"]}
    return RefreshTokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return get_user_response(current_user)


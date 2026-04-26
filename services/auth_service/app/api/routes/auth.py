"""
Authentication API routes.
Handles farmer registration, login, token refresh, and current user info.
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import normalize_roles
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.db.postgres import get_db_session
from app.dependencies.auth import get_current_user, get_user_response
from app.models.scheme_assignment import SchemeAssignment
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    TokenResponse,
    UserInfo,
)
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = logging.getLogger(__name__)


async def _fetch_scheme_ids(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    try:
        result = await db.execute(
            select(SchemeAssignment.scheme_id)
            .where(SchemeAssignment.user_id == user_id)
            .order_by(SchemeAssignment.scheme_id.asc())
        )
        return [row[0] for row in result.all()]
    except ProgrammingError as exc:
        # Transitional safety: if migrations have not yet created the table,
        # avoid failing login/me and return an empty scope set.
        message = str(exc).lower()
        if "scheme_assignments" in message and "does not exist" in message:
            logger.warning("scheme_assignments table missing while fetching scheme scope; returning empty list")
            await db.rollback()
            return []
        raise


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new farmer",
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db_session),
):
    # Public registration is farmer-only in the redesigned system.
    username = (user_data.username or user_data.national_id or "").lower().strip()
    user = User(
        username=username,
        full_name=user_data.full_name.strip() if user_data.full_name else None,
        national_id=user_data.national_id,
        phone_number=user_data.phone_number,
        hashed_password=hash_password(user_data.password),
        email=user_data.email.lower().strip() if user_data.email else None,
        roles=["farmer"],
    )
    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError as exc:
        await db.rollback()
        err = str(exc.orig).lower() if exc.orig else str(exc).lower()
        if "username" in err:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
        if "national_id" in err:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ID number already exists")
        if "email" in err:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    return get_user_response(user, scheme_ids=await _fetch_scheme_ids(db, user.id))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get tokens",
)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    identifier = credentials.username.strip().lower()
    national_identifier = credentials.username.strip().upper().replace(" ", "")
    result = await db.execute(
        select(User).where(
            or_(
                User.username == identifier,
                User.email == identifier,
                User.national_id == national_identifier,
            )
        )
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    normalized_roles = normalize_roles(user.roles)
    if normalized_roles != (user.roles or []):
        user.roles = normalized_roles
        await db.flush()

    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "roles": normalized_roles,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        token_type="bearer",
        user=UserInfo(
            id=str(user.id),
            username=user.username,
            full_name=user.full_name,
            roles=normalized_roles,
        ),
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

    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "roles": normalize_roles(user.roles),
    }
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
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    return get_user_response(current_user, scheme_ids=await _fetch_scheme_ids(db, current_user.id))

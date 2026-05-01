"""
Authority API routes.
Handles user management and scheme assignment for authority users.
"""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.postgres import get_db_session
from app.dependencies.auth import get_current_authority
from app.models.scheme_assignment import SchemeAssignment
from app.models.user import User
from app.schemas.user import (
    AdminUserCreate,
    AdminUserUpdate,
    UserListResponse,
    UserOut,
    UserRoleUpdate,
    UserSchemeUpdate,
    UserStatusUpdate,
)

router = APIRouter(prefix="/api/authority", tags=["Authority"])
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
        message = str(exc).lower()
        if "scheme_assignments" in message and "does not exist" in message:
            logger.warning("scheme_assignments table missing while fetching scheme scope; returning empty list")
            await db.rollback()
            return []
        raise


async def _replace_scheme_ids(db: AsyncSession, user_id: uuid.UUID, scheme_ids: list[str]) -> None:
    await db.execute(delete(SchemeAssignment).where(SchemeAssignment.user_id == user_id))
    for scheme_id in scheme_ids:
        db.add(SchemeAssignment(user_id=user_id, scheme_id=scheme_id))


async def _build_user_out(db: AsyncSession, user: User) -> UserOut:
    payload = user.to_dict()
    payload["scheme_ids"] = await _fetch_scheme_ids(db, user.id)
    return UserOut(**payload)


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
)
async def create_user(
    user_data: AdminUserCreate,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    _ = current_authority

    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        national_id=user_data.national_id,
        phone_number=user_data.phone_number,
        hashed_password=hash_password(user_data.password),
        email=user_data.email,
        roles=user_data.roles,
        is_active=user_data.is_active,
    )
    db.add(user)

    try:
        await db.flush()
        await _replace_scheme_ids(db, user.id, user_data.scheme_ids)
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

    return await _build_user_out(db, user)


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users",
)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    _ = current_authority

    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        pattern = f"%{search}%"
        from sqlalchemy import or_

        search_filter = or_(
            User.username.ilike(pattern),
            User.full_name.ilike(pattern),
            User.national_id.ilike(pattern),
            User.phone_number.ilike(pattern),
            User.email.ilike(pattern),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    skip = (page - 1) * limit
    pages = math.ceil(total / limit) if total > 0 else 1

    result = await db.execute(query.order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()

    response_users = [await _build_user_out(db, user) for user in users]
    return UserListResponse(
        users=response_users,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Get user by ID",
)
async def get_user(
    user_id: str,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    _ = current_authority

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return await _build_user_out(db, user)


@router.put(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Update user details",
)
async def update_user(
    user_id: str,
    user_update: AdminUserUpdate,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_update.username is not None:
        user.username = user_update.username
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.national_id is not None:
        user.national_id = user_update.national_id
    if user_update.phone_number is not None:
        user.phone_number = user_update.phone_number
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.password is not None:
        user.hashed_password = hash_password(user_update.password)
    if user_update.roles is not None:
        if str(current_authority.id) == user_id and "authority" not in user_update.roles:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own authority role")
        user.roles = user_update.roles
    if user_update.is_active is not None:
        if str(current_authority.id) == user_id and not user_update.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
        user.is_active = user_update.is_active
    if user_update.scheme_ids is not None:
        await _replace_scheme_ids(db, user.id, user_update.scheme_ids)

    user.updated_at = datetime.now(timezone.utc)

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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Update failed")

    return await _build_user_out(db, user)


@router.patch(
    "/users/{user_id}/roles",
    response_model=UserOut,
    summary="Update user roles",
)
async def update_user_roles(
    user_id: str,
    role_update: UserRoleUpdate,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(current_authority.id) == user_id and "authority" not in role_update.roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own authority role")

    user.roles = role_update.roles
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return await _build_user_out(db, user)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserOut,
    summary="Update user status",
)
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(current_authority.id) == user_id and not status_update.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")

    user.is_active = status_update.is_active
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return await _build_user_out(db, user)


@router.put(
    "/users/{user_id}/schemes",
    response_model=UserOut,
    summary="Replace user scheme assignments",
)
async def replace_user_schemes(
    user_id: str,
    payload: UserSchemeUpdate,
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    _ = current_authority

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await _replace_scheme_ids(db, uid, payload.scheme_ids)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    return await _build_user_out(db, user)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
)
async def delete_user(
    user_id: str,
    hard_delete: bool = Query(False),
    current_authority: User = Depends(get_current_authority),
    db: AsyncSession = Depends(get_db_session),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if str(current_authority.id) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    if hard_delete:
        await db.delete(user)
    else:
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    return None

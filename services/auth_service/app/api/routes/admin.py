"""
Admin API routes.
Handles user management for administrators.
"""

import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.postgres import get_db_session
from app.dependencies.auth import get_current_admin, get_user_response
from app.models.user import User
from app.schemas.user import (
    AdminUserCreate,
    AdminUserUpdate,
    UserListResponse,
    UserOut,
    UserRoleUpdate,
    UserStatusUpdate,
)


router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
)
async def create_user(
    user_data: AdminUserCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session),
):
    user = User(
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        email=user_data.email,
        roles=user_data.roles,
        is_active=user_data.is_active,
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
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db_session),
):
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        pattern = f"%{search}%"
        from sqlalchemy import or_
        query = query.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
        count_query = count_query.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    skip = (page - 1) * limit
    pages = math.ceil(total / limit) if total > 0 else 1

    result = await db.execute(query.order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()

    return UserListResponse(
        users=[get_user_response(u) for u in users],
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
    current_admin: User = Depends(get_current_admin),
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
    return get_user_response(user)


@router.put(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Update user details",
)
async def update_user(
    user_id: str,
    user_update: AdminUserUpdate,
    current_admin: User = Depends(get_current_admin),
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
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.password is not None:
        user.hashed_password = hash_password(user_update.password)
    if user_update.roles is not None:
        if str(current_admin.id) == user_id and "admin" not in user_update.roles:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin role")
        user.roles = user_update.roles
    if user_update.is_active is not None:
        if str(current_admin.id) == user_id and not user_update.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
        user.is_active = user_update.is_active
    user.updated_at = datetime.now(timezone.utc)

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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Update failed")
    return get_user_response(user)


@router.patch(
    "/users/{user_id}/role",
    response_model=UserOut,
    summary="Update user roles",
)
async def update_user_roles(
    user_id: str,
    role_update: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin),
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
    if str(current_admin.id) == user_id and "admin" not in role_update.roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin role")
    user.roles = role_update.roles
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return get_user_response(user)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserOut,
    summary="Update user status",
)
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_admin: User = Depends(get_current_admin),
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
    if str(current_admin.id) == user_id and not status_update.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")
    user.is_active = status_update.is_active
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return get_user_response(user)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
)
async def delete_user(
    user_id: str,
    hard_delete: bool = Query(False),
    current_admin: User = Depends(get_current_admin),
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
    if str(current_admin.id) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    if hard_delete:
        await db.delete(user)
    else:
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return None


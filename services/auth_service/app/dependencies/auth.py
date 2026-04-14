"""
Authentication dependencies for FastAPI routes.
Provides current user extraction and role-based access control.
"""

import uuid
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import normalize_roles
from app.core.security import decode_access_token
from app.db.postgres import get_db_session
from app.models.user import User
from app.schemas.user import UserOut

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return current_user


async def get_current_authority(current_user: User = Depends(get_current_user)) -> User:
    roles = normalize_roles(current_user.roles)
    if "authority" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority privileges required",
        )
    return current_user


async def get_current_officer_or_authority(current_user: User = Depends(get_current_user)) -> User:
    roles = set(normalize_roles(current_user.roles))
    if not roles.intersection({"officer", "authority"}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer or authority role required",
        )
    return current_user


def require_roles(required_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if not set(normalize_roles(current_user.roles)).intersection(set(required_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these roles: {', '.join(required_roles)}",
            )
        return current_user

    return role_checker


def require_all_roles(required_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = set(normalize_roles(current_user.roles))
        required_set = set(required_roles)
        if not required_set.issubset(user_roles):
            missing = required_set - user_roles
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required roles: {', '.join(sorted(missing))}",
            )
        return current_user

    return role_checker


# Backward-compatible alias during role cutover in dependent modules.
get_current_admin = get_current_authority


def get_user_response(user: User, *, scheme_ids: Optional[List[str]] = None) -> UserOut:
    payload = user.to_dict()
    payload["roles"] = normalize_roles(payload.get("roles"))
    payload["scheme_ids"] = scheme_ids or []
    return UserOut(**payload)

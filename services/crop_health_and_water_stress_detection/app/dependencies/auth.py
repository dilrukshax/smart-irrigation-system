"""
Auth dependencies for Crop Health admin actions.
"""

from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

_security = HTTPBearer(auto_error=False)


def _extract_roles(payload: Dict[str, Any]) -> List[str]:
    roles = payload.get("roles")
    if isinstance(roles, list):
        return [str(role) for role in roles]
    return []


async def get_current_user_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Dict[str, Any]:
    """Validate bearer token against auth service `/api/auth/me`."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.AUTH_SERVICE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Auth service unavailable: {exc}",
        )

    if response.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unable to validate user context",
        )

    payload = response.json() if response.content else {}
    return {
        "id": str(payload.get("id") or ""),
        "username": str(payload.get("username") or ""),
        "roles": _extract_roles(payload),
    }


async def require_admin(
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Require admin role for protected routes."""
    if "admin" not in (user_context.get("roles") or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user_context

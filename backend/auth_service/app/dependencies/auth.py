"""
Authentication dependencies for FastAPI routes.
Provides current user extraction and role-based access control.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from bson import ObjectId

from app.core.security import decode_access_token
from app.db.mongo import get_database
from app.schemas.user import UserOut
from app.models.user import UserModel


# Security scheme for Bearer token
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Extract and validate the current user from the JWT access token.
    
    Args:
        credentials: Bearer token credentials from request header.
        
    Returns:
        User document from database.
        
    Raises:
        HTTPException: If token is invalid or user not found/inactive.
    """
    token = credentials.credentials
    
    # Decode and validate token
    payload = decode_access_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    database = get_database()
    users_collection = database["users"]
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    return user


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current user ensuring they are active.
    
    Args:
        current_user: Current user from get_current_user dependency.
        
    Returns:
        Active user document.
        
    Raises:
        HTTPException: If user is inactive.
    """
    if not current_user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    return current_user


async def get_current_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Verify current user has admin role.
    
    Args:
        current_user: Current user from get_current_user dependency.
        
    Returns:
        User document if user is admin.
        
    Raises:
        HTTPException: If user is not an admin.
    """
    user_roles = current_user.get("roles", [])
    
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    
    return current_user


def require_roles(required_roles: List[str]):
    """
    Factory function to create a dependency that checks for specific roles.
    
    Args:
        required_roles: List of roles (user must have at least one).
        
    Returns:
        Dependency function that validates user roles.
    """
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        user_roles = set(current_user.get("roles", []))
        required_set = set(required_roles)
        
        if not user_roles.intersection(required_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of these roles: {', '.join(required_roles)}",
            )
        
        return current_user
    
    return role_checker


def require_all_roles(required_roles: List[str]):
    """
    Factory function to create a dependency that checks for all specified roles.
    
    Args:
        required_roles: List of roles (user must have all).
        
    Returns:
        Dependency function that validates user has all roles.
    """
    async def role_checker(
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        user_roles = set(current_user.get("roles", []))
        required_set = set(required_roles)
        
        if not required_set.issubset(user_roles):
            missing = required_set - user_roles
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required roles: {', '.join(missing)}",
            )
        
        return current_user
    
    return role_checker


def get_user_response(user_doc: dict) -> UserOut:
    """
    Convert a MongoDB user document to a UserOut response model.
    
    Args:
        user_doc: MongoDB user document.
        
    Returns:
        UserOut Pydantic model.
    """
    return UserOut(
        id=str(user_doc["_id"]),
        username=user_doc["username"],
        email=user_doc.get("email"),
        roles=user_doc.get("roles", ["user"]),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc.get("created_at"),
        updated_at=user_doc.get("updated_at"),
    )

"""
Pydantic schemas for user management.
"""

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Request body for user registration."""
    
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username"
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Password (min 6 characters)"
    )
    email: Optional[str] = Field(
        None,
        description="Optional email address"
    )
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username contains only allowed characters."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v.lower()
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format if provided."""
        if v is not None and v.strip() == "":
            return None
        if v is not None:
            # Basic email validation
            if "@" not in v or "." not in v:
                raise ValueError("Invalid email format")
        return v.lower() if v else None
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "password": "secretpassword123",
                "email": "john@example.com"
            }
        }


class UserOut(BaseModel):
    """Response model for user data (without sensitive fields)."""
    
    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: Optional[str] = Field(None, description="Email address")
    roles: List[str] = Field(default=["user"], description="User roles")
    is_active: bool = Field(default=True, description="Account status")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "username": "johndoe",
                "email": "john@example.com",
                "roles": ["user"],
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class UserUpdate(BaseModel):
    """Request body for updating user profile."""
    
    email: Optional[str] = Field(None, description="New email address")
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=100,
        description="New password"
    )
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format if provided."""
        if v is not None and v.strip() == "":
            return None
        if v is not None:
            if "@" not in v or "." not in v:
                raise ValueError("Invalid email format")
        return v.lower() if v else None


class UserRoleUpdate(BaseModel):
    """Request body for updating user roles (admin only)."""
    
    roles: List[str] = Field(
        ...,
        min_length=1,
        description="New list of roles"
    )
    
    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: List[str]) -> List[str]:
        """Validate and normalize roles."""
        normalized = [role.lower().strip() for role in v if role.strip()]
        if not normalized:
            raise ValueError("At least one role is required")
        return normalized
    
    class Config:
        json_schema_extra = {
            "example": {
                "roles": ["admin", "user"]
            }
        }


class UserStatusUpdate(BaseModel):
    """Request body for updating user status (admin only)."""
    
    is_active: bool = Field(..., description="Account active status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_active": False
            }
        }


class UserListResponse(BaseModel):
    """Paginated response for user list."""
    
    users: List[UserOut] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page")
    limit: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total number of pages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": [],
                "total": 100,
                "page": 1,
                "limit": 10,
                "pages": 10
            }
        }


class AdminUserCreate(BaseModel):
    """Request body for admin to create a new user."""
    
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username"
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Password (min 6 characters)"
    )
    email: Optional[str] = Field(
        None,
        description="Optional email address"
    )
    roles: List[str] = Field(
        default=["user"],
        description="User roles"
    )
    is_active: bool = Field(
        default=True,
        description="Account active status"
    )
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate username contains only allowed characters."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v.lower().strip()
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format if provided."""
        if v is not None and v.strip() == "":
            return None
        if v is not None:
            if "@" not in v or "." not in v:
                raise ValueError("Invalid email format")
        return v.lower().strip() if v else None
    
    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: List[str]) -> List[str]:
        """Validate and normalize roles."""
        normalized = [role.lower().strip() for role in v if role.strip()]
        if not normalized:
            return ["user"]
        return normalized
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "newuser",
                "password": "password123",
                "email": "newuser@example.com",
                "roles": ["user", "farmer"],
                "is_active": True
            }
        }


class AdminUserUpdate(BaseModel):
    """Request body for admin to update user details."""
    
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        description="New username"
    )
    email: Optional[str] = Field(
        None,
        description="New email address"
    )
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=100,
        description="New password"
    )
    roles: Optional[List[str]] = Field(
        None,
        description="New list of roles"
    )
    is_active: Optional[bool] = Field(
        None,
        description="Account active status"
    )
    
    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        """Validate username contains only allowed characters."""
        if v is None:
            return None
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username can only contain letters, numbers, underscores, and hyphens"
            )
        return v.lower().strip()
    
    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Validate email format if provided."""
        if v is not None and v.strip() == "":
            return None
        if v is not None:
            if "@" not in v or "." not in v:
                raise ValueError("Invalid email format")
        return v.lower().strip() if v else None
    
    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate and normalize roles."""
        if v is None:
            return None
        normalized = [role.lower().strip() for role in v if role.strip()]
        if not normalized:
            raise ValueError("At least one role is required")
        return normalized
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "updateduser",
                "email": "updated@example.com",
                "password": "newpassword123",
                "roles": ["user", "officer"],
                "is_active": True
            }
        }

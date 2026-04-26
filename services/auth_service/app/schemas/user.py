"""
Pydantic schemas for user and authority management.
"""

from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

ALLOWED_ROLES = {"farmer", "officer", "authority"}


class UserCreate(BaseModel):
    """Request body for farmer self-registration."""

    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Unique username")
    full_name: Optional[str] = Field(None, min_length=2, max_length=120, description="Farmer full name")
    national_id: Optional[str] = Field(None, max_length=32, description="Farmer NIC or national ID")
    phone_number: Optional[str] = Field(None, max_length=32, description="Optional phone number")
    password: str = Field(..., min_length=6, max_length=100, description="Password (min 6 characters)")
    email: Optional[str] = Field(None, description="Optional email address")
    role: Literal["farmer"] = Field(default="farmer", description="Public registration role")

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return value.lower().strip()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = " ".join(value.strip().split())
        return normalized or None

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper().replace(" ", "")
        if not normalized:
            return None
        if not normalized.replace("-", "").isalnum():
            raise ValueError("ID number can only contain letters, numbers, and hyphens")
        if len(normalized) < 5:
            raise ValueError("ID number must have at least 5 characters")
        return normalized

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().replace(" ", "")
        if normalized == "":
            return None
        if not normalized.replace("+", "", 1).replace("-", "").isdigit():
            raise ValueError("Phone number can only contain digits, +, spaces, and hyphens")
        if len(normalized.replace("+", "").replace("-", "")) < 7:
            raise ValueError("Phone number must have at least 7 digits")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized == "":
            return None
        if "@" not in normalized or "." not in normalized:
            raise ValueError("Invalid email format")
        return normalized

    @model_validator(mode="after")
    def require_login_identifier(self) -> "UserCreate":
        if self.username is None and self.national_id is None:
            raise ValueError("ID number is required for farmer registration")
        if self.username is None and self.national_id is not None:
            self.username = self.national_id.lower()
        return self


class UserOut(BaseModel):
    """Response model for user data."""

    id: str
    username: str
    full_name: Optional[str] = None
    national_id: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=lambda: ["farmer"])
    is_active: bool = True
    scheme_ids: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    """Request body for updating roles (authority only)."""

    roles: List[str] = Field(..., min_length=1)

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, value: List[str]) -> List[str]:
        normalized = sorted({role.lower().strip() for role in value if role.strip()})
        if not normalized:
            raise ValueError("At least one role is required")
        unknown = [role for role in normalized if role not in ALLOWED_ROLES]
        if unknown:
            raise ValueError(f"Unsupported roles: {', '.join(unknown)}")
        return normalized


class UserStatusUpdate(BaseModel):
    """Request body for updating user status (authority only)."""

    is_active: bool


class UserListResponse(BaseModel):
    """Paginated response for user list."""

    users: List[UserOut]
    total: int
    page: int
    limit: int
    pages: int


class AdminUserCreate(BaseModel):
    """Request body for authority to create users."""

    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    email: Optional[str] = None
    roles: List[str] = Field(default_factory=lambda: ["farmer"])
    is_active: bool = True
    scheme_ids: List[str] = Field(default_factory=list)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not value.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return value.lower().strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized == "":
            return None
        if "@" not in normalized or "." not in normalized:
            raise ValueError("Invalid email format")
        return normalized

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, value: List[str]) -> List[str]:
        normalized = sorted({role.lower().strip() for role in value if role.strip()})
        if not normalized:
            return ["farmer"]
        unknown = [role for role in normalized if role not in ALLOWED_ROLES]
        if unknown:
            raise ValueError(f"Unsupported roles: {', '.join(unknown)}")
        return normalized


class AdminUserUpdate(BaseModel):
    """Request body for authority to update users."""

    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    roles: Optional[List[str]] = None
    is_active: Optional[bool] = None
    scheme_ids: Optional[List[str]] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return value.lower().strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized == "":
            return None
        if "@" not in normalized or "." not in normalized:
            raise ValueError("Invalid email format")
        return normalized

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        normalized = sorted({role.lower().strip() for role in value if role.strip()})
        if not normalized:
            raise ValueError("At least one role is required")
        unknown = [role for role in normalized if role not in ALLOWED_ROLES]
        if unknown:
            raise ValueError(f"Unsupported roles: {', '.join(unknown)}")
        return normalized


class UserSchemeUpdate(BaseModel):
    """Assign schemes to user (authority only)."""

    scheme_ids: List[str] = Field(default_factory=list)

    @field_validator("scheme_ids")
    @classmethod
    def validate_scheme_ids(cls, value: List[str]) -> List[str]:
        normalized = sorted({item.strip() for item in value if item and item.strip()})
        return normalized


class SchemeAssignmentOut(BaseModel):
    assignment_id: str
    user_id: str
    scheme_id: str
    created_at: Optional[datetime] = None

"""
Pydantic schemas for authentication requests and responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    """Request body for user login."""

    username: str = Field(..., min_length=3, max_length=255, description="Username or email")
    password: str = Field(..., min_length=6, description="Password")

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh."""

    refresh_token: str = Field(..., description="JWT refresh token")


class UserInfo(BaseModel):
    """Basic user information included in token response."""

    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    full_name: Optional[str] = Field(None, description="Farmer full name")
    national_id: Optional[str] = Field(None, description="Farmer NIC or national ID")
    phone_number: Optional[str] = Field(None, description="User phone number")
    email: Optional[str] = Field(None, description="User email")
    roles: List[str] = Field(default_factory=lambda: ["farmer"], description="User roles")
    scheme_ids: List[str] = Field(default_factory=list, description="Assigned scheme IDs")


class TokenResponse(BaseModel):
    """Response containing access and refresh tokens."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserInfo = Field(..., description="User information")


class RefreshTokenResponse(BaseModel):
    """Response containing new access token after refresh."""

    access_token: str = Field(..., description="New JWT access token")
    refresh_token: str = Field(..., description="New JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")

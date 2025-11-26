"""
Pydantic schemas for authentication requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class LoginRequest(BaseModel):
    """Request body for user login."""
    
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    password: str = Field(..., min_length=6, description="Password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "johndoe",
                "password": "secretpassword123"
            }
        }


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh."""
    
    refresh_token: str = Field(..., description="JWT refresh token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class TokenResponse(BaseModel):
    """Response containing access and refresh tokens."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserInfo" = Field(..., description="User information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "507f1f77bcf86cd799439011",
                    "username": "johndoe",
                    "roles": ["user"]
                }
            }
        }


class RefreshTokenResponse(BaseModel):
    """Response containing new access token after refresh."""
    
    access_token: str = Field(..., description="New JWT access token")
    refresh_token: str = Field(..., description="New JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")


class UserInfo(BaseModel):
    """Basic user information included in token response."""
    
    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    roles: List[str] = Field(default=["user"], description="User roles")


# Update forward reference
TokenResponse.model_rebuild()

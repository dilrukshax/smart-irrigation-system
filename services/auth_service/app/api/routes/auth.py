"""
Authentication API routes.
Handles user registration, login, token refresh, and current user info.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.db.mongo import get_database
from app.models.user import UserModel
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    RefreshTokenResponse,
    UserInfo,
)
from app.schemas.user import UserCreate, UserOut
from app.dependencies.auth import get_current_user, get_user_response


router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with username, password, and optional email.",
)
async def register(user_data: UserCreate):
    """
    Register a new user.
    
    - **username**: Unique username (3-50 characters)
    - **password**: Password (min 6 characters)
    - **email**: Optional email address
    
    Returns the created user without password.
    """
    database = get_database()
    users_collection = database["users"]
    
    # Hash the password
    hashed_password = hash_password(user_data.password)
    
    # Create user document (normalize username to lowercase)
    user_doc = UserModel.create_document(
        username=user_data.username.lower().strip(),
        hashed_password=hashed_password,
        email=user_data.email.lower().strip() if user_data.email else None,
        roles=["user"],  # Default role
    )
    
    try:
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    except DuplicateKeyError as e:
        # Check which field caused the duplicate
        error_msg = str(e)
        if "username" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists",
            )
        elif "email" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists",
            )
    
    return get_user_response(user_doc)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get tokens",
    description="Authenticate with username and password to receive access and refresh tokens.",
)
async def login(credentials: LoginRequest):
    """
    Authenticate user and return JWT tokens.
    
    - **username**: User's username
    - **password**: User's password
    
    Returns access token, refresh token, and user info.
    """
    database = get_database()
    users_collection = database["users"]
    
    # Find user by username
    user = await users_collection.find_one({"username": credentials.username.lower()})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    # Create tokens
    token_data = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "roles": user.get("roles", ["user"]),
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserInfo(
            id=str(user["_id"]),
            username=user["username"],
            roles=user.get("roles", ["user"]),
        ),
    )


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Refresh access token",
    description="Use a valid refresh token to get a new access token.",
)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh the access token using a valid refresh token.
    
    - **refresh_token**: Valid JWT refresh token
    
    Returns new access and refresh tokens.
    """
    database = get_database()
    users_collection = database["users"]
    
    # Decode refresh token
    payload = decode_refresh_token(request.refresh_token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Fetch user to ensure they still exist and are active
    from bson import ObjectId
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    # Create new tokens with fresh user data
    token_data = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "roles": user.get("roles", ["user"]),
    }
    
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    return RefreshTokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current user",
    description="Get the profile of the currently authenticated user.",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    
    Requires a valid Bearer access token.
    
    Returns user info including id, username, email, roles, and status.
    """
    return get_user_response(current_user)

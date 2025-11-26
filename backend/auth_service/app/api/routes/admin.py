"""
Admin API routes.
Handles user management for administrators.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import math

from app.db.mongo import get_database
from app.dependencies.auth import get_current_admin, get_user_response
from app.schemas.user import (
    UserOut,
    UserCreate,
    UserRoleUpdate,
    UserStatusUpdate,
    UserListResponse,
    AdminUserCreate,
    AdminUserUpdate,
)
from app.core.security import hash_password
from app.models.user import UserModel
from pymongo.errors import DuplicateKeyError


router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Create a new user account with specified details. Admin only.",
)
async def create_user(
    user_data: AdminUserCreate,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Create a new user (admin only).
    
    - **username**: Unique username (3-50 characters)
    - **password**: Password (min 6 characters)
    - **email**: Optional email address
    - **roles**: List of roles (default: ["user"])
    - **is_active**: Account status (default: true)
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    # Hash the password
    hashed_password = hash_password(user_data.password)
    
    # Create user document
    user_doc = UserModel.create_document(
        username=user_data.username,
        hashed_password=hashed_password,
        email=user_data.email,
        roles=user_data.roles,
    )
    user_doc["is_active"] = user_data.is_active
    
    try:
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    except DuplicateKeyError as e:
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


@router.put(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Update user details",
    description="Update all details of a specific user. Admin only.",
)
async def update_user(
    user_id: str,
    user_update: AdminUserUpdate,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Update a user's details (admin only).
    
    - **user_id**: MongoDB ObjectId of the user
    - **username**: New username (optional)
    - **email**: New email (optional)
    - **password**: New password (optional)
    - **roles**: New roles (optional)
    - **is_active**: New status (optional)
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )
    
    # Check if user exists
    user = await users_collection.find_one({"_id": object_id})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Build update dict
    update_fields = {}
    
    if user_update.username is not None:
        # Check if username is taken by another user
        existing = await users_collection.find_one({
            "username": user_update.username,
            "_id": {"$ne": object_id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists",
            )
        update_fields["username"] = user_update.username
    
    if user_update.email is not None:
        # Check if email is taken by another user
        existing = await users_collection.find_one({
            "email": user_update.email,
            "_id": {"$ne": object_id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )
        update_fields["email"] = user_update.email
    
    if user_update.password is not None:
        update_fields["hashed_password"] = hash_password(user_update.password)
    
    if user_update.roles is not None:
        # Prevent admin from removing their own admin role
        if str(current_admin["_id"]) == user_id and "admin" not in user_update.roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove your own admin role",
            )
        update_fields["roles"] = user_update.roles
    
    if user_update.is_active is not None:
        # Prevent admin from deactivating themselves
        if str(current_admin["_id"]) == user_id and not user_update.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account",
            )
        update_fields["is_active"] = user_update.is_active
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )
    
    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    # Update user
    try:
        result = await users_collection.update_one(
            {"_id": object_id},
            {"$set": update_fields}
        )
    except DuplicateKeyError as e:
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update failed due to duplicate value",
        )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": object_id})
    
    return get_user_response(updated_user)


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users",
    description="Get a paginated list of all users. Admin only.",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_admin: dict = Depends(get_current_admin),
):
    """
    List all users with pagination.
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 10, max: 100)
    - **search**: Optional search term for username/email
    - **is_active**: Optional filter by active status
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    # Build query filter
    query = {}
    
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    if is_active is not None:
        query["is_active"] = is_active
    
    # Get total count
    total = await users_collection.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * limit
    pages = math.ceil(total / limit) if total > 0 else 1
    
    # Fetch users
    cursor = users_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    users = await cursor.to_list(length=limit)
    
    # Convert to response format
    user_list = [get_user_response(user) for user in users]
    
    return UserListResponse(
        users=user_list,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Get user by ID",
    description="Get details of a specific user. Admin only.",
)
async def get_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Get a specific user by ID.
    
    - **user_id**: MongoDB ObjectId of the user
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return get_user_response(user)


@router.patch(
    "/users/{user_id}/role",
    response_model=UserOut,
    summary="Update user roles",
    description="Update the roles of a specific user. Admin only.",
)
async def update_user_roles(
    user_id: str,
    role_update: UserRoleUpdate,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Update a user's roles.
    
    - **user_id**: MongoDB ObjectId of the user
    - **roles**: New list of roles (e.g., ["admin"], ["farmer"], ["officer"])
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )
    
    # Check if user exists
    user = await users_collection.find_one({"_id": object_id})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent admin from removing their own admin role
    if str(current_admin["_id"]) == user_id and "admin" not in role_update.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin role",
        )
    
    # Update roles
    result = await users_collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "roles": role_update.roles,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user roles",
        )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": object_id})
    
    return get_user_response(updated_user)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserOut,
    summary="Update user status",
    description="Activate or deactivate a user account. Admin only.",
)
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Update a user's active status.
    
    - **user_id**: MongoDB ObjectId of the user
    - **is_active**: New active status (true/false)
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )
    
    # Check if user exists
    user = await users_collection.find_one({"_id": object_id})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent admin from deactivating themselves
    if str(current_admin["_id"]) == user_id and not status_update.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )
    
    # Update status
    result = await users_collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "is_active": status_update.is_active,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status",
        )
    
    # Fetch updated user
    updated_user = await users_collection.find_one({"_id": object_id})
    
    return get_user_response(updated_user)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Soft delete a user by deactivating their account. Admin only.",
)
async def delete_user(
    user_id: str,
    hard_delete: bool = Query(False, description="Permanently delete the user"),
    current_admin: dict = Depends(get_current_admin),
):
    """
    Delete a user (soft delete by default, sets is_active=false).
    
    - **user_id**: MongoDB ObjectId of the user
    - **hard_delete**: If true, permanently removes the user from database
    
    Requires admin role.
    """
    database = get_database()
    users_collection = database["users"]
    
    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format",
        )
    
    # Check if user exists
    user = await users_collection.find_one({"_id": object_id})
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent admin from deleting themselves
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    
    if hard_delete:
        # Permanently delete user
        result = await users_collection.delete_one({"_id": object_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user",
            )
    else:
        # Soft delete (deactivate)
        result = await users_collection.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deactivate user",
            )
    
    return None

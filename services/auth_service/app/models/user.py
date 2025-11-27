"""
User model structure for MongoDB.
"""

from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId


class UserModel:
    """
    User document structure for MongoDB.
    
    Fields:
        _id: MongoDB ObjectId
        username: Unique username (required)
        email: Optional email (unique if present)
        hashed_password: Bcrypt hashed password
        roles: List of role strings (e.g., ["user"], ["admin", "user"])
        is_active: Account status
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """
    
    COLLECTION_NAME = "users"
    
    @staticmethod
    def create_document(
        username: str,
        hashed_password: str,
        email: Optional[str] = None,
        roles: Optional[List[str]] = None
    ) -> dict:
        """
        Create a new user document.
        
        Args:
            username: User's username.
            hashed_password: Bcrypt hashed password.
            email: Optional email address.
            roles: List of roles, defaults to ["user"].
            
        Returns:
            Dictionary representing the user document.
        """
        now = datetime.now(timezone.utc)
        
        return {
            "username": username,
            "email": email,
            "hashed_password": hashed_password,
            "roles": roles or ["user"],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
    
    @staticmethod
    def to_response(user_doc: dict) -> dict:
        """
        Convert a MongoDB user document to a response-safe format.
        Removes sensitive fields like hashed_password.
        
        Args:
            user_doc: MongoDB user document.
            
        Returns:
            Sanitized user dictionary.
        """
        if user_doc is None:
            return None
            
        return {
            "id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc.get("email"),
            "roles": user_doc.get("roles", ["user"]),
            "is_active": user_doc.get("is_active", True),
            "created_at": user_doc.get("created_at"),
            "updated_at": user_doc.get("updated_at"),
        }

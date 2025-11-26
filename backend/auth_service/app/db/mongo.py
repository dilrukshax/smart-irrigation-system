"""
MongoDB database connection and client management.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None


db = MongoDB()


async def connect_to_mongo():
    """
    Establish connection to MongoDB.
    Called on application startup.
    """
    logger.info(f"Connecting to MongoDB...")
    
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URI)
        db.database = db.client[settings.MONGODB_DB_NAME]
        
        # Verify connection
        await db.client.admin.command("ping")
        logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """
    Close MongoDB connection.
    Called on application shutdown.
    """
    logger.info("Closing MongoDB connection...")
    
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")


async def create_indexes():
    """
    Create necessary indexes for collections.
    """
    try:
        users_collection = db.database["users"]
        
        # Create unique index on username
        await users_collection.create_index("username", unique=True)
        
        # Create unique sparse index on email (allows null but unique if present)
        await users_collection.create_index(
            "email",
            unique=True,
            sparse=True
        )
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise


def get_database() -> AsyncIOMotorDatabase:
    """
    Get the database instance.
    Used as a FastAPI dependency.
    
    Returns:
        AsyncIOMotorDatabase instance.
    """
    if db.database is None:
        raise RuntimeError("Database not initialized")
    return db.database


async def get_users_collection():
    """
    Get the users collection.
    
    Returns:
        AsyncIOMotorCollection for users.
    """
    database = get_database()
    return database["users"]

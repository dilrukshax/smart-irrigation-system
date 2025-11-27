"""
MongoDB database connection and client management.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
import certifi

from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False


db = MongoDB()


async def connect_to_mongo():
    """
    Establish connection to MongoDB.
    Called on application startup.
    """
    logger.info("Connecting to MongoDB...")
    
    try:
        is_atlas = settings.MONGODB_URI.startswith("mongodb+srv")
        
        if is_atlas:
            db.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=30000,
                connectTimeoutMS=30000,
                socketTimeoutMS=30000,
                tls=True,
                tlsCAFile=certifi.where(),
                retryWrites=True,
                w="majority"
            )
        else:
            db.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
        
        db.database = db.client[settings.MONGODB_DB_NAME]
        
        # Verify connection
        await db.client.admin.command("ping")
        db.is_connected = True
        logger.info(f"Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        db.is_connected = False
        
        if settings.DEBUG:
            logger.warning("DEBUG mode: Application will continue without database")
        else:
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
    
    Raises:
        RuntimeError: If database is not connected.
    """
    if not db.is_connected or db.database is None:
        raise RuntimeError("Database not connected. Please check MongoDB connection.")
    return db.database


async def get_users_collection():
    """
    Get the users collection.
    
    Returns:
        AsyncIOMotorCollection for users.
    """
    database = get_database()
    return database["users"]

"""
Seed script to create the first admin user.
Run this after starting the service for the first time.
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Configuration - update these values as needed
MONGODB_URI = "mongodb+srv://dilandilruksha0_db_user:admin123@cluster0.jh6hixn.mongodb.net/?appName=Cluster0"
MONGODB_DB_NAME = "smart_irrigation_auth"

# Admin user details
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"  # Change this!
ADMIN_EMAIL = "admin@smartirrigation.com"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_user():
    """Create the first admin user."""
    
    print(f"Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    users_collection = db["users"]
    
    # Check if admin already exists
    existing_admin = await users_collection.find_one({"username": ADMIN_USERNAME})
    
    if existing_admin:
        print(f"Admin user '{ADMIN_USERNAME}' already exists.")
        
        # Check if user has admin role
        if "admin" not in existing_admin.get("roles", []):
            # Add admin role
            await users_collection.update_one(
                {"username": ADMIN_USERNAME},
                {"$addToSet": {"roles": "admin"}}
            )
            print(f"Added 'admin' role to user '{ADMIN_USERNAME}'.")
        else:
            print("User already has admin role.")
    else:
        # Create new admin user
        hashed_password = pwd_context.hash(ADMIN_PASSWORD)
        now = datetime.now(timezone.utc)
        
        admin_doc = {
            "username": ADMIN_USERNAME,
            "email": ADMIN_EMAIL,
            "hashed_password": hashed_password,
            "roles": ["admin", "user"],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        
        result = await users_collection.insert_one(admin_doc)
        print(f"Admin user created successfully!")
        print(f"  ID: {result.inserted_id}")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Email: {ADMIN_EMAIL}")
        print(f"  Roles: ['admin', 'user']")
    
    # Create indexes
    print("\nCreating indexes...")
    await users_collection.create_index("username", unique=True)
    await users_collection.create_index("email", unique=True, sparse=True)
    print("Indexes created.")
    
    # Close connection
    client.close()
    print("\nDone!")


if __name__ == "__main__":
    print("=" * 50)
    print("Auth Service - Admin User Seed Script")
    print("=" * 50)
    print()
    
    asyncio.run(create_admin_user())

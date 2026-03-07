"""
Seed script to create the first admin user.
Run this after starting the service for the first time.

Usage:
    cd services/auth_service
    python seed_admin.py
"""

import asyncio
import sys
import os

# Ensure the service root is on the path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from passlib.context import CryptContext

from app.core.config import settings
from app.db.postgres import AsyncSessionLocal, connect_to_db
from app.models.user import User

# Admin user details
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_EMAIL = "admin@smartirrigation.com"

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


async def seed():
    print("Connecting to PostgreSQL (Neon)...")
    await connect_to_db()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == ADMIN_USERNAME))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"User '{ADMIN_USERNAME}' already exists.")
            if "admin" not in (existing.roles or []):
                existing.roles = list(set((existing.roles or []) + ["admin"]))
                await db.commit()
                print("Added 'admin' role.")
            else:
                print("Already has admin role. Nothing to do.")
        else:
            admin = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                hashed_password=pwd_context.hash(ADMIN_PASSWORD),
                roles=["admin", "user"],
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            print(f"Admin user created!")
            print(f"  ID:       {admin.id}")
            print(f"  Username: {admin.username}")
            print(f"  Email:    {admin.email}")
            print(f"  Roles:    {admin.roles}")


if __name__ == "__main__":
    print("=" * 50)
    print("Auth Service - Admin User Seed Script")
    print("=" * 50)
    print(f"Database: {settings.DATABASE_URL[:40]}...")
    print()
    asyncio.run(seed())
    print("\nDone!")

"""
Seed script to create default farmer, officer, and authority users.

Usage:
    cd services/auth_service
    python seed_admin.py
"""

import asyncio
import os
import sys

from passlib.context import CryptContext
from sqlalchemy import select

# Ensure the service root is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.postgres import AsyncSessionLocal, connect_to_db
from app.models.scheme_assignment import SchemeAssignment
from app.models.user import User

DEFAULT_USERS = [
    {
        "username": "farmer",
        "password": "farmer123",
        "email": "farmer@smartirrigation.com",
        "roles": ["farmer"],
        "schemes": [],
    },
    {
        "username": "authority",
        "password": "authority123",
        "email": "authority@smartirrigation.com",
        "roles": ["authority"],
        "schemes": ["scheme-default"],
    },
    {
        "username": "officer",
        "password": "officer123",
        "email": "officer@smartirrigation.com",
        "roles": ["officer"],
        "schemes": ["scheme-default"],
    },
]

pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


async def _ensure_assignments(session, user, scheme_ids):
    await session.execute(
        SchemeAssignment.__table__.delete().where(SchemeAssignment.user_id == user.id)
    )
    for scheme_id in scheme_ids:
        session.add(SchemeAssignment(user_id=user.id, scheme_id=scheme_id))


async def seed() -> None:
    print("Connecting to PostgreSQL (Neon)...")
    await connect_to_db()

    async with AsyncSessionLocal() as session:
        for entry in DEFAULT_USERS:
            result = await session.execute(select(User).where(User.username == entry["username"]))
            existing = result.scalar_one_or_none()

            if existing:
                print(f"User '{entry['username']}' already exists.")
                existing.roles = sorted(set(entry["roles"]))
                existing.is_active = True
                await _ensure_assignments(session, existing, entry["schemes"])
                await session.commit()
                print(f"Updated roles to: {existing.roles}")
                continue

            user = User(
                username=entry["username"],
                email=entry["email"],
                hashed_password=pwd_context.hash(entry["password"]),
                roles=entry["roles"],
                is_active=True,
            )
            session.add(user)
            await session.flush()
            await _ensure_assignments(session, user, entry["schemes"])
            await session.commit()
            await session.refresh(user)

            print(f"Created user '{user.username}'")
            print(f"  ID:       {user.id}")
            print(f"  Email:    {user.email}")
            print(f"  Roles:    {user.roles}")


if __name__ == "__main__":
    print("=" * 50)
    print("Auth Service - Farmer/Officer/Authority Seed Script")
    print("=" * 50)
    print(f"Database: {settings.DATABASE_URL[:40]}...")
    print()
    asyncio.run(seed())
    print("\nDone!")

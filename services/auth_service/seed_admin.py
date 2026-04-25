"""
Seed script to create role-based sample login users for local testing.

Usage:
    cd services/auth_service
    python seed_admin.py
"""

import asyncio
import os
import sys

from sqlalchemy import select

# Ensure the service root is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.roles import normalize_roles
from app.core.security import hash_password
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
        "is_active": True,
        "description": "Baseline farmer account",
    },
    {
        "username": "farmer_demo_01",
        "password": "farmer123",
        "email": "farmer.demo.01@smartirrigation.com",
        "roles": ["farmer"],
        "schemes": [],
        "is_active": True,
        "description": "Farmer account for multi-user flow checks",
    },
    {
        "username": "farmer_demo_02",
        "password": "farmer123",
        "email": "farmer.demo.02@smartirrigation.com",
        "roles": ["farmer"],
        "schemes": [],
        "is_active": True,
        "description": "Farmer account for ownership and isolation checks",
    },
    {
        "username": "officer",
        "password": "officer123",
        "email": "officer@smartirrigation.com",
        "roles": ["officer"],
        "schemes": ["scheme-default"],
        "is_active": True,
        "description": "Baseline officer account with scheme scope",
    },
    {
        "username": "officer_noscope",
        "password": "officer123",
        "email": "officer.noscope@smartirrigation.com",
        "roles": ["officer"],
        "schemes": [],
        "is_active": True,
        "description": "Officer without scheme assignment (negative authorization checks)",
    },
    {
        "username": "authority",
        "password": "authority123",
        "email": "authority@smartirrigation.com",
        "roles": ["authority"],
        "schemes": ["scheme-default"],
        "is_active": True,
        "description": "Baseline authority account",
    },
    {
        "username": "authority_regional",
        "password": "authority123",
        "email": "authority.regional@smartirrigation.com",
        "roles": ["authority"],
        "schemes": ["scheme-default", "scheme-mahaweli-left-bank"],
        "is_active": True,
        "description": "Authority account with multiple scheme assignments",
    },
    {
        "username": "ops_supervisor",
        "password": "ops12345",
        "email": "ops.supervisor@smartirrigation.com",
        "roles": ["authority", "officer"],
        "schemes": ["scheme-default", "scheme-mahaweli-left-bank"],
        "is_active": True,
        "description": "Multi-role account for authority plus officer flow testing",
    },
    {
        "username": "farmer_inactive",
        "password": "farmer123",
        "email": "farmer.inactive@smartirrigation.com",
        "roles": ["farmer"],
        "schemes": [],
        "is_active": False,
        "description": "Inactive farmer account for status checks",
    },
]


async def _ensure_assignments(session, user, scheme_ids):
    await session.execute(
        SchemeAssignment.__table__.delete().where(SchemeAssignment.user_id == user.id)
    )
    unique_scheme_ids = sorted({scheme_id.strip() for scheme_id in scheme_ids if scheme_id and scheme_id.strip()})
    for scheme_id in unique_scheme_ids:
        session.add(SchemeAssignment(user_id=user.id, scheme_id=scheme_id))


async def seed() -> None:
    print("Connecting to PostgreSQL (Neon)...")
    await connect_to_db()

    async with AsyncSessionLocal() as session:
        for entry in DEFAULT_USERS:
            username = entry["username"].lower().strip()
            email = entry["email"].lower().strip()
            roles = normalize_roles(entry["roles"])
            schemes = entry.get("schemes", [])
            is_active = bool(entry.get("is_active", True))

            result = await session.execute(select(User).where(User.username == username))
            existing = result.scalar_one_or_none()

            if existing:
                existing.email = email
                existing.roles = roles
                existing.is_active = is_active
                existing.hashed_password = hash_password(entry["password"])
                await _ensure_assignments(session, existing, schemes)
                await session.commit()
                print(f"Updated user '{username}'")
                print(f"  Roles:    {existing.roles}")
                print(f"  Active:   {existing.is_active}")
                print(f"  Schemes:  {sorted({scheme for scheme in schemes if scheme})}")
                continue

            user = User(
                username=username,
                email=email,
                hashed_password=hash_password(entry["password"]),
                roles=roles,
                is_active=is_active,
            )
            session.add(user)
            await session.flush()
            await _ensure_assignments(session, user, schemes)
            await session.commit()
            await session.refresh(user)

            print(f"Created user '{user.username}'")
            print(f"  ID:       {user.id}")
            print(f"  Email:    {user.email}")
            print(f"  Roles:    {user.roles}")
            print(f"  Active:   {user.is_active}")

    print("\nSample login users available:")
    for entry in DEFAULT_USERS:
        print(
            f"- {entry['username']} / {entry['password']} | "
            f"roles={normalize_roles(entry['roles'])} | "
            f"active={entry.get('is_active', True)}"
        )
        print(f"  note: {entry.get('description', 'sample user')}")


if __name__ == "__main__":
    print("=" * 50)
    print("Auth Service - Sample Login Seed Script")
    print("=" * 50)
    print(f"Database: {settings.DATABASE_URL[:40]}...")
    print()
    asyncio.run(seed())
    print("\nDone!")

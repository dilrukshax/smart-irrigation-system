"""Bootstrap authority account helpers."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.roles import normalize_roles
from app.core.security import hash_password
from app.models.scheme_assignment import SchemeAssignment
from app.models.user import User


@dataclass(frozen=True)
class BootstrapAuthorityConfig:
    username: str
    email: str | None
    password: str
    full_name: str | None
    scheme_ids: list[str]
    reset_password: bool = False


def parse_scheme_ids(value: str | Iterable[str] | None) -> list[str]:
    """Parse scheme IDs from a comma-separated string or JSON list."""
    if value is None:
        return []

    raw_values: Iterable[str]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("["):
            try:
                loaded = json.loads(text)
                raw_values = loaded if isinstance(loaded, list) else [text]
            except json.JSONDecodeError:
                raw_values = [text]
        else:
            raw_values = text.split(",")
    else:
        raw_values = value

    return sorted({item.strip() for item in raw_values if item and item.strip()})


def get_bootstrap_authority_config(settings) -> BootstrapAuthorityConfig:
    """Build normalized bootstrap authority config from application settings."""
    username = settings.AUTHORITY_BOOTSTRAP_USERNAME.strip().lower()
    email = settings.AUTHORITY_BOOTSTRAP_EMAIL.strip().lower() or None
    full_name = " ".join(settings.AUTHORITY_BOOTSTRAP_FULL_NAME.strip().split()) or None
    scheme_ids = parse_scheme_ids(settings.AUTHORITY_BOOTSTRAP_SCHEME_IDS)
    return BootstrapAuthorityConfig(
        username=username,
        email=email,
        password=settings.AUTHORITY_BOOTSTRAP_PASSWORD,
        full_name=full_name,
        scheme_ids=scheme_ids,
        reset_password=settings.AUTHORITY_BOOTSTRAP_RESET_PASSWORD,
    )


async def ensure_bootstrap_authority(
    session: AsyncSession,
    config: BootstrapAuthorityConfig,
) -> User:
    """
    Ensure the configured authority user exists and keeps authority access.

    Existing accounts are reactivated and receive the authority role. Passwords
    are only reset when AUTHORITY_BOOTSTRAP_RESET_PASSWORD is enabled.
    """
    result = await session.execute(select(User).where(User.username == config.username))
    user = result.scalar_one_or_none()
    email = config.email
    if email:
        email_result = await session.execute(select(User.id).where(User.email == email))
        email_owner_id = email_result.scalar_one_or_none()
        if email_owner_id is not None and (user is None or email_owner_id != user.id):
            email = None

    if user is None:
        user = User(
            username=config.username,
            full_name=config.full_name,
            email=email,
            hashed_password=hash_password(config.password),
            roles=["authority"],
            is_active=True,
        )
        session.add(user)
        await session.flush()
    else:
        roles = normalize_roles([*(user.roles or []), "authority"])
        user.roles = roles
        user.is_active = True
        if user.full_name is None:
            user.full_name = config.full_name
        if user.email is None:
            user.email = email
        if config.reset_password:
            user.hashed_password = hash_password(config.password)
        await session.flush()

    if config.scheme_ids:
        existing_result = await session.execute(
            select(SchemeAssignment.scheme_id).where(SchemeAssignment.user_id == user.id)
        )
        existing = {row[0] for row in existing_result.all()}
        for scheme_id in config.scheme_ids:
            if scheme_id not in existing:
                session.add(
                    SchemeAssignment(
                        assignment_id=uuid.uuid4(),
                        user_id=user.id,
                        scheme_id=scheme_id,
                    )
                )

    return user

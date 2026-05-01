"""bootstrap authority account

Revision ID: 20260501_0003
Revises: 20260426_0002
Create Date: 2026-05-01 00:00:00.000000
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Iterable

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

# revision identifiers, used by Alembic.
revision = "20260501_0003"
down_revision = "20260426_0002"
branch_labels = None
depends_on = None


pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_scheme_ids(value: str | Iterable[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("["):
            try:
                loaded = json.loads(text)
                values = loaded if isinstance(loaded, list) else [text]
            except json.JSONDecodeError:
                values = [text]
        else:
            values = text.split(",")
    else:
        values = value
    return sorted({item.strip() for item in values if item and item.strip()})


def upgrade() -> None:
    bind = op.get_bind()
    username = _env("AUTHORITY_BOOTSTRAP_USERNAME", "authority").lower()
    email = _env("AUTHORITY_BOOTSTRAP_EMAIL", "authority@smartirrigation.com").lower()
    full_name = _env("AUTHORITY_BOOTSTRAP_FULL_NAME", "System Authority")
    password = _env("AUTHORITY_BOOTSTRAP_PASSWORD", "authority123")
    reset_password = _env_bool("AUTHORITY_BOOTSTRAP_RESET_PASSWORD", False)
    scheme_ids = _parse_scheme_ids(_env("AUTHORITY_BOOTSTRAP_SCHEME_IDS", "scheme-default"))
    hashed_password = pwd_context.hash(password)

    existing = bind.execute(
        sa.text("SELECT id FROM users WHERE username = :username"),
        {"username": username},
    ).mappings().first()

    email_owner = None
    if email:
        email_owner = bind.execute(
            sa.text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        ).scalar_one_or_none()
    safe_email = email if email and (email_owner is None or (existing and email_owner == existing["id"])) else None

    if existing is None:
        user_id = uuid.uuid4()
        bind.execute(
            sa.text(
                """
                INSERT INTO users (
                    id, username, full_name, email, hashed_password, roles,
                    is_active, created_at, updated_at
                )
                VALUES (
                    :id, :username, :full_name, :email, :hashed_password,
                    ARRAY['authority']::varchar[], true, now(), now()
                )
                """
            ),
            {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "email": safe_email,
                "hashed_password": hashed_password,
            },
        )
    else:
        user_id = existing["id"]
        bind.execute(
            sa.text(
                """
                UPDATE users
                SET
                    full_name = COALESCE(full_name, :full_name),
                    email = COALESCE(email, :email),
                    hashed_password = CASE
                        WHEN :reset_password THEN :hashed_password
                        ELSE hashed_password
                    END,
                    roles = ARRAY(
                        SELECT DISTINCT normalized_role
                        FROM (
                            SELECT CASE
                                WHEN role = 'admin' THEN 'authority'
                                WHEN role = 'user' THEN 'farmer'
                                ELSE role
                            END AS normalized_role
                            FROM unnest(COALESCE(roles, ARRAY[]::varchar[]) || ARRAY['authority']::varchar[]) AS role
                        ) t
                        WHERE normalized_role = ANY(ARRAY['farmer','officer','authority'])
                    ),
                    is_active = true,
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": user_id,
                "full_name": full_name,
                "email": safe_email,
                "hashed_password": hashed_password,
                "reset_password": reset_password,
            },
        )

    for scheme_id in scheme_ids:
        bind.execute(
            sa.text(
                """
                INSERT INTO scheme_assignments (assignment_id, user_id, scheme_id, created_at)
                VALUES (:assignment_id, :user_id, :scheme_id, now())
                ON CONFLICT ON CONSTRAINT uq_scheme_assignment_user_scheme DO NOTHING
                """
            ),
            {
                "assignment_id": uuid.uuid4(),
                "user_id": user_id,
                "scheme_id": scheme_id,
            },
        )


def downgrade() -> None:
    # Do not remove a real authority account during rollback.
    pass

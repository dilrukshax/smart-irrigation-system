"""Role normalization helpers for hard-cutover compatibility."""

from __future__ import annotations

from typing import Iterable, List

ALLOWED_ROLES = ("farmer", "officer", "authority")
LEGACY_ROLE_MAP = {
    "admin": "authority",
    "user": "farmer",
}


def normalize_roles(roles: Iterable[str] | None) -> List[str]:
    """
    Normalize role collections to the cutover role set.

    - maps legacy `admin` -> `authority`
    - maps legacy `user` -> `farmer`
    - removes unknown/empty roles
    - de-duplicates while preserving deterministic sorted output
    """

    normalized = {
        LEGACY_ROLE_MAP.get(raw_role.lower().strip(), raw_role.lower().strip())
        for raw_role in (roles or [])
        if raw_role and raw_role.strip()
    }
    valid = sorted(role for role in normalized if role in ALLOWED_ROLES)
    return valid or ["farmer"]

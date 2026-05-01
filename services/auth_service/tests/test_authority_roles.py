"""Authority role validation tests."""

import pytest
from pydantic import ValidationError

from app.core.bootstrap_authority import parse_scheme_ids
from app.schemas.user import AdminUserCreate, UserCreate, UserRoleUpdate


def test_public_registration_is_farmer_only():
    payload = UserCreate(username="farmerone", password="password123")
    assert payload.role == "farmer"

    with pytest.raises(ValidationError):
        UserCreate(  # type: ignore[arg-type]
            username="officer",
            password="password123",
            role="officer",
        )


def test_authority_create_user_accepts_officer_and_authority_roles():
    payload = AdminUserCreate(
        username="ops-authority",
        password="password123",
        roles=["authority"],
    )
    assert payload.roles == ["authority"]

    payload2 = AdminUserCreate(
        username="scheme-officer",
        password="password123",
        roles=["officer"],
    )
    assert payload2.roles == ["officer"]


def test_authority_role_update_rejects_legacy_roles():
    with pytest.raises(ValidationError):
        UserRoleUpdate(roles=["admin"])  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        UserRoleUpdate(roles=["user"])  # type: ignore[arg-type]


def test_bootstrap_authority_scheme_ids_accept_csv_and_json():
    assert parse_scheme_ids("scheme-default, H-04") == ["H-04", "scheme-default"]
    assert parse_scheme_ids('["scheme-b", "scheme-a", "scheme-b"]') == ["scheme-a", "scheme-b"]

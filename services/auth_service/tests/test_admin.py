"""Legacy filename retained: authority role contract tests."""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserRoleUpdate


def test_legacy_admin_role_is_rejected():
    with pytest.raises(ValidationError):
        UserRoleUpdate(roles=["admin"])  # type: ignore[arg-type]


def test_authority_role_is_accepted():
    payload = UserRoleUpdate(roles=["authority"])
    assert payload.roles == ["authority"]

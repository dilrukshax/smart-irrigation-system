"""Tests for public registration role validation."""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate


def test_register_defaults_to_farmer_role():
    payload = UserCreate(username="farmerone", password="password123")
    assert payload.role == "farmer"


def test_register_accepts_farmer_role():
    payload = UserCreate(
        username="fieldfarmer",
        password="password123",
        role="farmer",
    )
    assert payload.role == "farmer"


def test_register_uses_national_id_as_login_username():
    payload = UserCreate(
        full_name="Nimal Perera",
        national_id="199112345678",
        password="password123",
    )

    assert payload.username == "199112345678"
    assert payload.national_id == "199112345678"
    assert payload.email is None
    assert payload.role == "farmer"


def test_register_rejects_non_farmer_roles():
    with pytest.raises(ValidationError):
        UserCreate(
            username="badactor",
            password="password123",
            role="authority",  # type: ignore[arg-type]
        )

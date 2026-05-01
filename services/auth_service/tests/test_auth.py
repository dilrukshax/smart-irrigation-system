"""Tests for current PostgreSQL-backed authentication routes."""

import uuid
from datetime import datetime, timezone
from typing import Any

import pytest
from fastapi import HTTPException

from app.api.routes import auth as auth_routes
from app.core.security import create_refresh_token, hash_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshTokenRequest
from app.schemas.user import UserCreate


class _ScalarResult:
    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one_or_none(self) -> Any:
        return self._value


class _RowsResult:
    def __init__(self, rows: list[tuple[str]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[str]]:
        return self._rows


class _FakeSession:
    def __init__(self, *results: Any) -> None:
        self._results = list(results)
        self.added: list[Any] = []
        self.committed = False
        self.flushed = False
        self.rolled_back = False

    def add(self, item: Any) -> None:
        if getattr(item, "id", None) is None:
            item.id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        if getattr(item, "created_at", None) is None:
            item.created_at = now
        if getattr(item, "updated_at", None) is None:
            item.updated_at = now
        if getattr(item, "is_active", None) is None:
            item.is_active = True
        self.added.append(item)

    async def execute(self, _query: Any) -> Any:
        if not self._results:
            raise AssertionError("No fake DB result queued")
        return self._results.pop(0)

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True

    async def refresh(self, _item: Any) -> None:
        return None

    async def flush(self) -> None:
        self.flushed = True


def _user(*, active: bool = True, roles: list[str] | None = None) -> User:
    now = datetime.now(timezone.utc)
    return User(
        id=uuid.uuid4(),
        username="testuser",
        full_name="Test User",
        national_id="NIC12345",
        phone_number="+94771234567",
        email="test@example.com",
        hashed_password=hash_password("password123"),
        roles=roles or ["farmer"],
        is_active=active,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_register_success_creates_farmer_account() -> None:
    db = _FakeSession(_RowsResult([]))
    payload = UserCreate(username="newuser", password="password123", email="new@example.com")

    response = await auth_routes.register(payload, db=db)

    assert response.username == "newuser"
    assert response.email == "new@example.com"
    assert response.roles == ["farmer"]
    assert response.scheme_ids == []
    assert db.added[0].hashed_password != "password123"
    assert db.committed is True


@pytest.mark.asyncio
async def test_login_success_returns_tokens_and_scheme_scope() -> None:
    user = _user(roles=["officer"])
    db = _FakeSession(_ScalarResult(user), _RowsResult([("scheme-a",), ("scheme-b",)]))

    response = await auth_routes.login(
        LoginRequest(username="testuser", password="password123"),
        db=db,
    )

    assert response.token_type == "bearer"
    assert response.access_token
    assert response.refresh_token
    assert response.user.username == "testuser"
    assert response.user.roles == ["officer"]
    assert response.user.scheme_ids == ["scheme-a", "scheme-b"]
    assert response.user.email == "test@example.com"


@pytest.mark.asyncio
async def test_login_invalid_password_rejected() -> None:
    db = _FakeSession(_ScalarResult(_user()))

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login(
            LoginRequest(username="testuser", password="wrongpassword"),
            db=db,
        )

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid username or password"


@pytest.mark.asyncio
async def test_login_inactive_user_rejected() -> None:
    db = _FakeSession(_ScalarResult(_user(active=False)))

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login(
            LoginRequest(username="testuser", password="password123"),
            db=db,
        )

    assert exc.value.status_code == 403
    assert "deactivated" in exc.value.detail


@pytest.mark.asyncio
async def test_refresh_token_success_uses_current_user_roles() -> None:
    user = _user(roles=["authority"])
    refresh_token = create_refresh_token(
        {"sub": str(user.id), "username": user.username, "roles": ["farmer"]}
    )
    db = _FakeSession(_ScalarResult(user))

    response = await auth_routes.refresh_token(
        RefreshTokenRequest(refresh_token=refresh_token),
        db=db,
    )

    assert response.access_token
    assert response.refresh_token
    assert response.token_type == "bearer"

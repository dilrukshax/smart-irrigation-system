"""Contract tests for /api/auth/me scheme scope propagation."""

import uuid
from typing import Any, AsyncGenerator

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import auth as auth_routes
from app.api.routes.auth import get_current_user, get_db_session


class _FakeResult:
    def __init__(self, rows: list[tuple[str]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[str]]:
        return self._rows


class _FakeSession:
    def __init__(self, rows: list[tuple[str]]) -> None:
        self._rows = rows

    async def execute(self, _query: Any) -> _FakeResult:
        return _FakeResult(self._rows)


class _FakeUser:
    def __init__(self, user_id: str, roles: list[str]) -> None:
        self.id = uuid.UUID(user_id)
        self.username = "ops-user"
        self.email = "ops@example.com"
        self.roles = roles
        self.is_active = True
        self.created_at = None
        self.updated_at = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "username": self.username,
            "email": self.email,
            "roles": self.roles,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


def _build_client(rows: list[tuple[str]], roles: list[str]) -> TestClient:
    app = FastAPI()
    app.include_router(auth_routes.router)

    async def _override_db() -> AsyncGenerator[_FakeSession, None]:
        yield _FakeSession(rows)

    async def _override_user() -> _FakeUser:
        return _FakeUser("84c3325a-e5ce-41e4-a3f9-ec44bcd8a5f4", roles)

    app.dependency_overrides[get_db_session] = _override_db
    app.dependency_overrides[get_current_user] = _override_user
    return TestClient(app)


def test_auth_me_returns_assigned_scheme_ids_for_scoped_user() -> None:
    client = _build_client([("scheme-a",), ("scheme-b",)], ["officer"])
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    payload = response.json()
    assert payload["roles"] == ["officer"]
    assert payload["scheme_ids"] == ["scheme-a", "scheme-b"]


def test_auth_me_returns_empty_scheme_ids_when_not_assigned() -> None:
    client = _build_client([], ["authority"])
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    payload = response.json()
    assert payload["roles"] == ["authority"]
    assert payload["scheme_ids"] == []

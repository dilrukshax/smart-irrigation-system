"""Auth/role and contract behavior tests for F4 endpoints."""

from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user_context, require_admin
from app.main import app

client = TestClient(app)


def _override_farmer():
    return {"id": "farmer-1", "username": "farmer", "roles": ["farmer"]}


def _override_admin():
    return {"id": "admin-1", "username": "admin", "roles": ["admin"]}


def _raise_unauthorized():
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


def _raise_forbidden():
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


def _set_auth_overrides(user_override=None, admin_override=None):
    app.dependency_overrides.pop(get_current_user_context, None)
    app.dependency_overrides.pop(require_admin, None)
    if user_override is not None:
        app.dependency_overrides[get_current_user_context] = user_override
    if admin_override is not None:
        app.dependency_overrides[require_admin] = admin_override


def _clear_overrides():
    app.dependency_overrides.pop(get_current_user_context, None)
    app.dependency_overrides.pop(require_admin, None)


def test_recommendations_requires_authentication():
    _set_auth_overrides(user_override=_raise_unauthorized)
    try:
        resp = client.get("/f4/recommendations")
        assert resp.status_code == 401
    finally:
        _clear_overrides()


def test_optimize_forbidden_for_non_admin():
    _set_auth_overrides(user_override=_override_farmer, admin_override=_raise_forbidden)
    try:
        resp = client.post(
            "/f4/recommendations/optimize",
            json={"waterQuota": 3000, "constraints": {}, "season": "Maha-2026"},
        )
        assert resp.status_code == 403
    finally:
        _clear_overrides()


def test_optimize_contract_fields_for_admin():
    _set_auth_overrides(user_override=_override_admin, admin_override=_override_admin)
    try:
        resp = client.post(
            "/f4/recommendations/optimize",
            json={"waterQuota": 3000, "constraints": {}, "season": "Maha-2026"},
        )
        assert resp.status_code == 200
        payload = resp.json()
        for key in (
            "status",
            "source",
            "is_live",
            "observed_at",
            "staleness_sec",
            "quality",
            "data_available",
            "message",
            "data",
        ):
            assert key in payload
        assert payload["status"] in {
            "ok",
            "stale",
            "data_unavailable",
            "analysis_pending",
            "source_unavailable",
        }
    finally:
        _clear_overrides()


def test_planb_contract_fields_for_authenticated_user():
    _set_auth_overrides(user_override=_override_farmer, admin_override=_override_admin)
    try:
        resp = client.post(
            "/f4/planb",
            json={"field_id": "FIELD-001", "season": "Maha-2026"},
        )
        assert resp.status_code == 200
        payload = resp.json()
        for key in (
            "status",
            "source",
            "is_live",
            "observed_at",
            "staleness_sec",
            "quality",
            "data_available",
            "message",
            "adjusted_plan",
        ):
            assert key in payload
    finally:
        _clear_overrides()


def test_water_budget_contract_fields_for_authenticated_user():
    _set_auth_overrides(user_override=_override_farmer, admin_override=_override_admin)
    try:
        resp = client.get("/f4/supply/water-budget")
        assert resp.status_code == 200
        payload = resp.json()
        for key in (
            "status",
            "source",
            "is_live",
            "observed_at",
            "staleness_sec",
            "quality",
            "data_available",
            "message",
            "data",
        ):
            assert key in payload
    finally:
        _clear_overrides()


def test_adaptive_crops_contract_fields_for_authenticated_user():
    _set_auth_overrides(user_override=_override_farmer, admin_override=_override_admin)
    try:
        resp = client.get("/f4/adaptive/crops")
        assert resp.status_code == 200
        payload = resp.json()
        for key in (
            "status",
            "source",
            "is_live",
            "observed_at",
            "staleness_sec",
            "quality",
            "data_available",
            "message",
            "crops",
            "total",
        ):
            assert key in payload
    finally:
        _clear_overrides()

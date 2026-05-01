"""Tests for the field-observations CRUD routes (Crop Health tab).

Routes under test:
  POST   /api/v1/farm/fields/{field_id}/observations
  GET    /api/v1/farm/fields/{field_id}/observations
  PATCH  /api/v1/farm/fields/{field_id}/observations/{observation_id}
  DELETE /api/v1/farm/fields/{field_id}/observations/{observation_id}

Covers happy paths, RBAC, validation (kind/severity/lat/lon), and 404
for unknown fields/observations. Mirrors the patching idiom in
``test_decision_integration.py`` and ``test_farmer_irrigation_routes.py``.
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import farm_ops
from app.dependencies.auth import get_current_user_context


@asynccontextmanager
async def _fake_session_scope():
    yield object()


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(farm_ops.router)
    return app


def _farmer_field(**overrides: Any) -> Dict[str, Any]:
    base: Dict[str, Any] = {
        "field_id": "field-1",
        "field_name": "North paddy",
        "crop_type": "rice",
        "soil_type": "Clay Loam",
        "area_hectares": 1.5,
        "scheme_id": "scheme-1",
        "latitude": 7.21,
        "longitude": 80.65,
        "owner_id": "u-farmer-01",
    }
    base.update(overrides)
    return base


def _farmer_context() -> Dict[str, Any]:
    return {"id": "u-farmer-01", "username": "farmer", "roles": ["farmer"]}


def _foreign_farmer_context() -> Dict[str, Any]:
    return {"id": "u-other-farmer", "username": "other", "roles": ["farmer"]}


def _officer_context() -> Dict[str, Any]:
    return {
        "id": "u-officer-01",
        "username": "officer",
        "roles": ["officer"],
        "scheme_ids": ["scheme-1"],
    }


def _patch_db(
    monkeypatch: pytest.MonkeyPatch,
    *,
    field: Optional[Dict[str, Any]],
    existing: Optional[Dict[str, Any]] = None,
    items: Optional[List[Dict[str, Any]]] = None,
    create_returns: Optional[Dict[str, Any]] = None,
    update_returns: Optional[Dict[str, Any]] = None,
    delete_returns: bool = True,
) -> Dict[str, Any]:
    """Stub the four observation repo helpers + field lookup.

    Returns a small dict the test can read to assert call args (e.g.
    that `created_by` got threaded through).
    """
    captured: Dict[str, Any] = {}

    async def _get_field(_session: object, _field_id: str):
        return field

    async def _create(_session: object, **kwargs: Any):
        captured["create"] = kwargs
        if create_returns is not None:
            return create_returns
        now = datetime.utcnow().isoformat()
        return {
            "observation_id": "obs-new",
            "field_id": kwargs.get("field_id"),
            "latitude": kwargs.get("latitude"),
            "longitude": kwargs.get("longitude"),
            "kind": kwargs.get("kind"),
            "severity": kwargs.get("severity"),
            "title": kwargs.get("title"),
            "note": kwargs.get("note"),
            "photo_url": kwargs.get("photo_url"),
            "prediction_label": kwargs.get("prediction_label"),
            "prediction_confidence": kwargs.get("prediction_confidence"),
            "created_by": kwargs.get("created_by"),
            "created_at": now,
            "updated_at": now,
        }

    async def _list(_session: object, **kwargs: Any):
        captured["list"] = kwargs
        return items or []

    async def _get_one(_session: object, observation_id: str):
        captured.setdefault("get_calls", []).append(observation_id)
        return existing

    async def _update(_session: object, **kwargs: Any):
        captured["update"] = kwargs
        if update_returns is not None:
            return update_returns
        merged = dict(existing or {})
        merged.update(kwargs.get("fields") or {})
        merged["updated_at"] = datetime.utcnow().isoformat()
        return merged

    async def _delete(_session: object, observation_id: str):
        captured.setdefault("delete_calls", []).append(observation_id)
        return delete_returns

    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _get_field)
    monkeypatch.setattr(farm_ops, "create_field_observation", _create)
    monkeypatch.setattr(farm_ops, "list_field_observations", _list)
    monkeypatch.setattr(farm_ops, "get_field_observation", _get_one)
    monkeypatch.setattr(farm_ops, "update_field_observation", _update)
    monkeypatch.setattr(farm_ops, "delete_field_observation", _delete)
    return captured


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_observation_happy_path(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    captured = _patch_db(monkeypatch, field=_farmer_field())

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/field-1/observations",
        json={
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "DISEASE",  # uppercase to confirm normalisation
            "severity": "High",
            "title": "Brown spots on tomato leaves",
            "note": "Spreading over the south corner",
            "prediction_label": "Tomato___Early_blight",
            "prediction_confidence": 0.92,
        },
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["observation_id"] == "obs-new"
    assert body["kind"] == "disease"
    assert body["severity"] == "high"
    assert body["title"] == "Brown spots on tomato leaves"

    assert captured["create"]["field_id"] == "field-1"
    assert captured["create"]["created_by"] == "u-farmer-01"
    assert captured["create"]["kind"] == "disease"
    assert captured["create"]["severity"] == "high"
    assert captured["create"]["prediction_confidence"] == 0.92


def test_create_observation_invalid_kind_returns_422(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field())

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/field-1/observations",
        json={
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "weed",  # not in allowed set
            "title": "Weeds in plot",
        },
    )
    assert resp.status_code == 422
    assert "kind" in resp.json()["detail"].lower()


def test_create_observation_invalid_severity_returns_422(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field())

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/field-1/observations",
        json={
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "note",
            "severity": "bad",
            "title": "Test",
        },
    )
    assert resp.status_code == 422
    assert "severity" in resp.json()["detail"].lower()


def test_create_observation_invalid_lat_returns_422(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field())

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/field-1/observations",
        json={
            "latitude": 999.0,
            "longitude": 80.655,
            "kind": "note",
            "title": "Test",
        },
    )
    # Pydantic v2 returns 422 for ge/le violations
    assert resp.status_code == 422


def test_create_observation_unknown_field_returns_404(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=None)

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/missing/observations",
        json={
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "note",
            "title": "Test",
        },
    )
    assert resp.status_code == 404


def test_create_observation_foreign_farmer_returns_403(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _foreign_farmer_context
    _patch_db(monkeypatch, field=_farmer_field())

    client = TestClient(app)
    resp = client.post(
        "/api/v1/farm/fields/field-1/observations",
        json={
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "note",
            "title": "Trespasser note",
        },
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_list_observations_happy_path(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    sample = [
        {
            "observation_id": "obs-1",
            "field_id": "field-1",
            "latitude": 7.215,
            "longitude": 80.655,
            "kind": "disease",
            "severity": "high",
            "title": "Spot 1",
            "note": "First note",
            "photo_url": None,
            "prediction_label": None,
            "prediction_confidence": None,
            "created_by": "u-farmer-01",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    ]
    _patch_db(monkeypatch, field=_farmer_field(), items=sample)

    client = TestClient(app)
    resp = client.get("/api/v1/farm/fields/field-1/observations")
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    assert body["items"][0]["observation_id"] == "obs-1"


def test_list_observations_officer_can_read(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _officer_context
    _patch_db(monkeypatch, field=_farmer_field(), items=[])

    client = TestClient(app)
    resp = client.get("/api/v1/farm/fields/field-1/observations")
    assert resp.status_code == 200


def test_list_observations_foreign_farmer_returns_403(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _foreign_farmer_context
    _patch_db(monkeypatch, field=_farmer_field(), items=[])

    client = TestClient(app)
    resp = client.get("/api/v1/farm/fields/field-1/observations")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Patch
# ---------------------------------------------------------------------------


def test_patch_observation_happy_path(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context

    existing = {
        "observation_id": "obs-1",
        "field_id": "field-1",
        "latitude": 7.215,
        "longitude": 80.655,
        "kind": "note",
        "severity": None,
        "title": "Old title",
        "note": "Old",
    }
    captured = _patch_db(monkeypatch, field=_farmer_field(), existing=existing)

    client = TestClient(app)
    resp = client.patch(
        "/api/v1/farm/fields/field-1/observations/obs-1",
        json={"title": "Updated title", "severity": "medium"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated title"
    assert body["severity"] == "medium"

    assert captured["update"]["fields"]["title"] == "Updated title"
    assert captured["update"]["fields"]["severity"] == "medium"


def test_patch_observation_for_other_field_returns_404(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context

    existing = {
        "observation_id": "obs-1",
        "field_id": "field-2",  # belongs to a different field
        "latitude": 0.0,
        "longitude": 0.0,
        "kind": "note",
        "title": "x",
    }
    _patch_db(monkeypatch, field=_farmer_field(), existing=existing)

    client = TestClient(app)
    resp = client.patch(
        "/api/v1/farm/fields/field-1/observations/obs-1",
        json={"title": "Updated"},
    )
    assert resp.status_code == 404


def test_patch_observation_unknown_returns_404(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field(), existing=None)

    client = TestClient(app)
    resp = client.patch(
        "/api/v1/farm/fields/field-1/observations/nope",
        json={"title": "Updated"},
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


def test_delete_observation_happy_path(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context

    existing = {
        "observation_id": "obs-1",
        "field_id": "field-1",
        "latitude": 7.215,
        "longitude": 80.655,
        "kind": "note",
        "title": "x",
    }
    captured = _patch_db(monkeypatch, field=_farmer_field(), existing=existing)

    client = TestClient(app)
    resp = client.delete("/api/v1/farm/fields/field-1/observations/obs-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["observation_id"] == "obs-1"
    assert body["deleted"] is True

    assert captured["delete_calls"] == ["obs-1"]


def test_delete_observation_unknown_returns_404(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field(), existing=None)

    client = TestClient(app)
    resp = client.delete("/api/v1/farm/fields/field-1/observations/missing")
    assert resp.status_code == 404


def test_delete_observation_foreign_field_returns_404(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context

    existing = {
        "observation_id": "obs-1",
        "field_id": "field-2",
        "latitude": 0.0,
        "longitude": 0.0,
        "kind": "note",
        "title": "x",
    }
    _patch_db(monkeypatch, field=_farmer_field(), existing=existing)

    client = TestClient(app)
    resp = client.delete("/api/v1/farm/fields/field-1/observations/obs-1")
    assert resp.status_code == 404

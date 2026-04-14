"""Contract and decision-loop tests for grouped farmer-first irrigation routes."""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import farm_ops
from app.dependencies.auth import get_current_user_context


@asynccontextmanager
async def _fake_session_scope():
    yield object()


async def _async_none(*_args: Any, **_kwargs: Any):
    return None


async def _async_empty_list(*_args: Any, **_kwargs: Any):
    return []


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(farm_ops.router)
    return app


@pytest.mark.asyncio
async def test_create_field_starts_configured(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _farmer_context() -> Dict[str, Any]:
        return {"id": "u-farmer-01", "username": "farmer", "roles": ["farmer"]}

    async def _none_field(_session: object, _field_id: str):
        return None

    async def _create_field(_session: object, payload: Dict[str, Any]) -> Dict[str, Any]:
        return payload

    app.dependency_overrides[get_current_user_context] = _farmer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _none_field)
    monkeypatch.setattr(farm_ops, "upsert_crop_field", _create_field)

    client = TestClient(app)
    response = client.post(
        "/api/v1/farm/fields",
        json={
            "field_name": "Field A",
            "crop_type": "rice",
            "area_hectares": 1.2,
            "scheme_id": "scheme-1",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["lifecycle_state"] == "CONFIGURED"
    assert payload["pairing_status"] == "UNPAIRED"


@pytest.mark.asyncio
async def test_pairing_initiate_sets_devicelinked(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _farmer_context() -> Dict[str, Any]:
        return {"id": "u-farmer-01", "username": "farmer", "roles": ["farmer"]}

    async def _field(_session: object, _field_id: str):
        return {
            "field_id": "field-1",
            "owner_id": "u-farmer-01",
            "crop_type": "rice",
            "field_name": "Field A",
            "scheme_id": "scheme-1",
        }

    updated_payload: Dict[str, Any] = {}

    async def _patch(_session: object, _field_id: str, patch: Dict[str, Any]):
        updated_payload.update(patch)
        return patch

    async def _create_pairing(_session: object, **kwargs: Any):
        return {
            "pairing_id": "pair-1",
            "field_id": kwargs["field_id"],
            "device_id": kwargs["device_id"],
            "status": "PENDING",
            "challenge_code": kwargs["challenge_code"],
        }

    app.dependency_overrides[get_current_user_context] = _farmer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)
    monkeypatch.setattr(farm_ops, "update_crop_field_partial", _patch)
    monkeypatch.setattr(farm_ops, "create_pairing_session", _create_pairing)

    client = TestClient(app)
    response = client.post(
        "/api/v1/devices/pairing/initiate",
        json={"field_id": "field-1", "device_id": "esp32-01"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PENDING"
    assert updated_payload["lifecycle_state"] == "DEVICELINKED"


@pytest.mark.asyncio
async def test_list_field_pairings_returns_items(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _farmer_context() -> Dict[str, Any]:
        return {"id": "u-farmer-01", "username": "farmer", "roles": ["farmer"]}

    async def _field(_session: object, _field_id: str):
        return {
            "field_id": "field-1",
            "owner_id": "u-farmer-01",
            "crop_type": "rice",
            "field_name": "Field A",
            "scheme_id": "scheme-1",
        }

    async def _list_pairings(_session: object, *, field_id: str, limit: int = 50):
        assert field_id == "field-1"
        assert limit == 50
        return [
            {
                "pairing_id": "pair-1",
                "field_id": "field-1",
                "device_id": "esp32-01",
                "status": "CONFIRMED",
                "challenge_code": "123456",
                "first_telemetry_at": datetime.utcnow().isoformat(),
            }
        ]

    app.dependency_overrides[get_current_user_context] = _farmer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)
    monkeypatch.setattr(farm_ops, "list_pairing_sessions_for_field", _list_pairings)

    client = TestClient(app)
    response = client.get("/api/v1/devices/fields/field-1/pairings")

    assert response.status_code == 200
    body = response.json()
    assert body["field_id"] == "field-1"
    assert body["count"] == 1
    assert body["items"][0]["device_id"] == "esp32-01"


@pytest.mark.asyncio
async def test_resolve_device_falls_back_to_confirmed_pairing(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _none_field_by_device(_session: object, _device_id: str):
        return None

    async def _confirmed_pairing(_session: object, _device_id: str):
        return {"pairing_id": "pair-1", "field_id": "field-9", "device_id": "esp32-09", "status": "CONFIRMED"}

    async def _field(_session: object, field_id: str):
        assert field_id == "field-9"
        return {"field_id": "field-9", "scheme_id": "scheme-1"}

    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field_by_device", _none_field_by_device)
    monkeypatch.setattr(farm_ops, "get_confirmed_pairing_by_device", _confirmed_pairing)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)

    client = TestClient(app)
    response = client.get("/api/v1/farm/devices/esp32-09/field")

    assert response.status_code == 200
    body = response.json()
    assert body["device_id"] == "esp32-09"
    assert body["field_id"] == "field-9"
    assert body["scheme_id"] == "scheme-1"


@pytest.mark.asyncio
async def test_ingest_blocked_open_creates_manual_request(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _field_by_device(_session: object, _device_id: str):
        return {
            "field_id": "field-1",
            "field_name": "Field A",
            "crop_type": "rice",
            "auto_control_enabled": True,
            "scheme_id": "scheme-1",
            "water_level_min_pct": 50,
            "water_level_max_pct": 80,
            "soil_moisture_min_pct": 70,
            "soil_moisture_max_pct": 95,
        }

    async def _add_reading(_session: object, field_id: str, payload: Dict[str, Any]):
        return {
            "field_id": field_id,
            "timestamp": payload["timestamp"],
            "water_level_pct": payload["water_level_pct"],
            "soil_moisture_pct": payload["soil_moisture_pct"],
        }

    async def _noop(*_args: Any, **_kwargs: Any):
        return None

    async def _valve(_session: object, _field_id: str):
        return {"status": "CLOSED", "position_pct": 0}

    async def _policy(_session: object, scheme_id: str):
        return {"scheme_id": scheme_id, "max_field_open_pct": 20, "emergency_mode": "drought"}

    async def _decision(*_args: Any, **_kwargs: Any):
        return {
            "action": "OPEN",
            "valve_position_pct": 90,
            "blocked": True,
            "blocked_reason": "Policy blocked",
            "water_level_pct": 10.0,
            "soil_moisture_pct": 20.0,
        }

    async def _create_manual(_session: object, **_kwargs: Any):
        return {"request_id": "req-1", "status": "PENDING", "reason": "Policy blocked"}

    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _async_none)
    monkeypatch.setattr(farm_ops, "get_crop_field_by_device", _field_by_device)
    monkeypatch.setattr(farm_ops, "get_pending_pairing_by_device", _async_none)
    monkeypatch.setattr(farm_ops, "add_sensor_reading", _add_reading)
    monkeypatch.setattr(farm_ops, "purge_sensor_history", _noop)
    monkeypatch.setattr(farm_ops, "update_crop_field_partial", _noop)
    monkeypatch.setattr(farm_ops, "get_valve_state", _valve)
    monkeypatch.setattr(farm_ops, "get_active_authority_policy", _policy)
    monkeypatch.setattr(farm_ops, "_compute_auto_decision", _decision)
    monkeypatch.setattr(farm_ops, "create_manual_request", _create_manual)

    client = TestClient(app)
    response = client.post(
        "/api/v1/telemetry/ingest",
        json={
            "device_id": "esp32-01",
            "timestamp": datetime.utcnow().isoformat(),
            "soil_moisture_pct": 20,
            "water_level_pct": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["manual_request_required"] is True
    assert body["manual_request_id"] == "req-1"


def test_manual_request_queue_forbidden_for_farmer():
    app = _test_app()

    async def _farmer_context() -> Dict[str, Any]:
        return {"id": "u-farmer-01", "username": "farmer", "roles": ["farmer"]}

    app.dependency_overrides[get_current_user_context] = _farmer_context
    client = TestClient(app)

    response = client.get("/api/v1/irrigation/manual-requests")
    assert response.status_code == 403


def test_manual_request_queue_officer_allowed(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _list(_session: object, **_kwargs: Any):
        return []

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "list_manual_requests", _list)
    monkeypatch.setattr(farm_ops, "get_manual_request_audit", _async_empty_list)

    client = TestClient(app)
    response = client.get("/api/v1/irrigation/manual-requests")
    assert response.status_code == 200
    assert response.json() == {"count": 0, "items": []}


def test_manual_request_queue_exposes_policy_context(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _list(_session: object, **_kwargs: Any):
        return [
            {
                "request_id": "req-1",
                "field_id": "field-1",
                "scheme_id": "scheme-1",
                "status": "PENDING",
                "reason": "Policy blocked open",
                "source_decision": {
                    "policy_id": "policy-1",
                    "policy_version": 2,
                    "blocked_reason": "quota exhausted",
                },
                "created_at": datetime.utcnow().isoformat(),
            }
        ]

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "list_manual_requests", _list)
    monkeypatch.setattr(farm_ops, "get_manual_request_audit", _async_empty_list)

    client = TestClient(app)
    response = client.get("/api/v1/irrigation/manual-requests?scheme_id=scheme-1")
    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] == 1
    item = payload["items"][0]
    assert item["scheme_id"] == "scheme-1"
    assert item["policy_context"]["policy_id"] == "policy-1"
    assert item["policy_context"]["policy_version"] == 2
    assert "quota" in item["policy_context"]["blocked_reason"]


def test_manual_request_queue_officer_without_scheme_forbidden():
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {"id": "u-officer-01", "username": "officer", "roles": ["officer"], "scheme_ids": []}

    app.dependency_overrides[get_current_user_context] = _officer_context
    client = TestClient(app)

    response = client.get("/api/v1/irrigation/manual-requests")
    assert response.status_code == 403


def test_close_manual_request_lifecycle(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _manual(_session: object, _request_id: str):
        return {"request_id": "req-1", "field_id": "field-1", "status": "REJECTED"}

    async def _field(_session: object, _field_id: str):
        return {"field_id": "field-1", "scheme_id": "scheme-1", "owner_id": "u-farmer-01"}

    async def _close(_session: object, **_kwargs: Any):
        return {"request_id": "req-1", "field_id": "field-1", "status": "CLOSED"}

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_manual_request", _manual)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)
    monkeypatch.setattr(farm_ops, "close_manual_request", _close)
    monkeypatch.setattr(farm_ops, "get_manual_request_audit", _async_empty_list)

    client = TestClient(app)
    response = client.post(
        "/api/v1/irrigation/manual-requests/req-1/close",
        json={"note": "resolved"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CLOSED"


def test_authority_policy_list_requires_scheme_assignment():
    app = _test_app()

    async def _authority_context() -> Dict[str, Any]:
        return {"id": "u-auth-01", "username": "authority", "roles": ["authority"], "scheme_ids": []}

    app.dependency_overrides[get_current_user_context] = _authority_context
    client = TestClient(app)

    response = client.get("/api/v1/authority/policies")
    assert response.status_code == 403


def test_network_schedule_rejected_by_policy_constraint(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _node(_session: object, node_id: str):
        mapping = {
            "canal-1": {"node_id": "canal-1", "scheme_id": "scheme-1", "node_type": "canal", "parent_node_id": None},
            "tunnel-1": {"node_id": "tunnel-1", "scheme_id": "scheme-1", "node_type": "tunnel", "parent_node_id": "canal-1"},
            "channel-1": {"node_id": "channel-1", "scheme_id": "scheme-1", "node_type": "channel", "parent_node_id": "tunnel-1"},
            "turnout-1": {"node_id": "turnout-1", "scheme_id": "scheme-1", "node_type": "turnout", "parent_node_id": "channel-1"},
        }
        return mapping.get(node_id)

    async def _noop_conflict(*_args: Any, **_kwargs: Any):
        return None

    async def _policy(_session: object, scheme_id: str):
        return {
            "policy_id": "policy-1",
            "scheme_id": scheme_id,
            "version": 2,
            "status": "PUBLISHED",
            "quota_mcm": 10,
            "max_field_open_pct": 80,
            "emergency_mode": "drought",
            "constraints": {},
            "published_at": datetime.utcnow().isoformat(),
        }

    async def _scheduled(*_args: Any, **_kwargs: Any):
        return 0.0

    async def _create(_session: object, payload: Dict[str, Any]):
        return payload

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_hydraulic_topology_node", _node)
    monkeypatch.setattr(farm_ops, "find_conflicting_hydraulic_schedule", _noop_conflict)
    monkeypatch.setattr(farm_ops, "get_active_authority_policy", _policy)
    monkeypatch.setattr(farm_ops, "estimate_accepted_schedule_volume_mcm", _scheduled)
    monkeypatch.setattr(farm_ops, "create_hydraulic_schedule", _create)

    start = datetime.utcnow().replace(microsecond=0) + timedelta(hours=1)
    end = start + timedelta(hours=1)

    client = TestClient(app)
    response = client.post(
        "/api/v1/irrigation/network/schedules",
        json={
            "scheme_id": "scheme-1",
            "canal_id": "canal-1",
            "tunnel_id": "tunnel-1",
            "channel_id": "channel-1",
            "turnout_id": "turnout-1",
            "action": "OPEN",
            "expected_flow_m3s": 2.0,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "reason": "test",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "REJECTED"
    assert "emergency mode" in body["conflict_reason"].lower()


def test_patch_field_outside_assigned_scheme_forbidden(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _field(_session: object, _field_id: str):
        return {
            "field_id": "field-2",
            "field_name": "Field B",
            "scheme_id": "scheme-2",
            "owner_id": "u-farmer-01",
        }

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)

    client = TestClient(app)
    response = client.patch(
        "/api/v1/farm/fields/field-2",
        json={"field_name": "Updated Name"},
    )
    assert response.status_code == 403


def test_patch_field_scheme_change_requires_target_assignment(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _field(_session: object, _field_id: str):
        return {
            "field_id": "field-1",
            "field_name": "Field A",
            "scheme_id": "scheme-1",
            "owner_id": "u-farmer-01",
        }

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "get_crop_field", _field)

    client = TestClient(app)
    response = client.patch(
        "/api/v1/farm/fields/field-1",
        json={"scheme_id": "scheme-2"},
    )
    assert response.status_code == 403


def test_officer_overview_requires_scheme_assignment():
    app = _test_app()

    async def _officer_context() -> Dict[str, Any]:
        return {"id": "u-officer-01", "username": "officer", "roles": ["officer"], "scheme_ids": []}

    app.dependency_overrides[get_current_user_context] = _officer_context
    client = TestClient(app)

    response = client.get("/api/v1/irrigation/officer/overview")
    assert response.status_code == 403


def test_officer_overview_contract(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    now = datetime.utcnow().replace(microsecond=0)

    async def _officer_context() -> Dict[str, Any]:
        return {
            "id": "u-officer-01",
            "username": "officer",
            "roles": ["officer"],
            "scheme_ids": ["scheme-1"],
        }

    async def _fields(_session: object):
        return [
            {
                "field_id": "field-1",
                "field_name": "Field A",
                "scheme_id": "scheme-1",
                "lifecycle_state": "LIVE",
            },
            {
                "field_id": "field-2",
                "field_name": "Field B",
                "scheme_id": "scheme-2",
                "lifecycle_state": "LIVE",
            },
        ]

    async def _manual(_session: object, **_kwargs: Any):
        return [
            {
                "request_id": "req-1",
                "field_id": "field-1",
                "scheme_id": "scheme-1",
                "status": "PENDING",
                "reason": "Policy blocked",
                "source_decision": {"policy_id": "pol-1", "policy_version": 3, "blocked_reason": "quota"},
                "created_at": (now - timedelta(minutes=3)).isoformat(),
            },
            {
                "request_id": "req-2",
                "field_id": "field-1",
                "scheme_id": "scheme-1",
                "status": "APPROVED",
                "reason": "approved",
                "source_decision": None,
                "created_at": (now - timedelta(minutes=6)).isoformat(),
            },
        ]

    async def _latest(_session: object, _field_id: str):
        return {"timestamp": (now - timedelta(seconds=40)).isoformat()}

    async def _schedules(_session: object, **_kwargs: Any):
        return [
            {
                "schedule_id": "sch-1",
                "scheme_id": "scheme-1",
                "status": "ACCEPTED",
                "start_time": (now + timedelta(hours=1)).isoformat(),
                "created_at": (now - timedelta(minutes=10)).isoformat(),
            }
        ]

    app.dependency_overrides[get_current_user_context] = _officer_context
    monkeypatch.setattr(farm_ops, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farm_ops, "list_crop_fields", _fields)
    monkeypatch.setattr(farm_ops, "list_manual_requests", _manual)
    monkeypatch.setattr(farm_ops, "get_latest_sensor_reading", _latest)
    monkeypatch.setattr(farm_ops, "list_hydraulic_schedules", _schedules)

    client = TestClient(app)
    response = client.get("/api/v1/irrigation/officer/overview?scheme_id=scheme-1")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["status"] in {"ok", "stale", "data_unavailable"}
    assert body["data_available"] is True
    assert "observed_at" in body
    assert "staleness_sec" in body
    summary = body["items"][0]
    assert summary["scheme_id"] == "scheme-1"
    assert summary["queue"]["pending_requests"] == 1
    assert summary["telemetry"]["total_fields"] == 1
    assert summary["hydraulic"]["accepted_schedules"] == 1
    assert "status" in summary
    assert "data_available" in summary
    assert "observed_at" in summary
    assert "staleness_sec" in summary

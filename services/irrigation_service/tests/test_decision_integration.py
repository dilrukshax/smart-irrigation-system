"""Decision-loop and auth integration tests for crop-fields routes."""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict
from unittest.mock import patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api import crop_fields
from app.api.crop_fields import (
    AutoControlDecision,
    CropFieldConfig,
    IoTSensorData,
    _apply_blocked_open_metadata,
    _make_auto_control_decision,
)
from app.dependencies.auth import get_current_user_context


def _sample_config() -> CropFieldConfig:
    defaults = crop_fields.CROP_DEFAULTS["rice"]
    return CropFieldConfig(
        field_id="field-rice-01",
        field_name="Rice Field",
        crop_type="rice",
        area_hectares=1.5,
        device_id="esp32-rice-01",
        water_level_min_pct=defaults["water_level_min_pct"],
        water_level_max_pct=defaults["water_level_max_pct"],
        water_level_optimal_pct=defaults["water_level_optimal_pct"],
        water_level_critical_pct=defaults["water_level_critical_pct"],
        soil_moisture_min_pct=defaults["soil_moisture_min_pct"],
        soil_moisture_max_pct=defaults["soil_moisture_max_pct"],
        soil_moisture_optimal_pct=defaults["soil_moisture_optimal_pct"],
        soil_moisture_critical_pct=defaults["soil_moisture_critical_pct"],
        irrigation_duration_minutes=defaults["irrigation_duration_minutes"],
        auto_control_enabled=True,
    )


def _sample_sensor_data(water_level: float, soil_moisture: float) -> IoTSensorData:
    return IoTSensorData(
        device_id="esp32-rice-01",
        timestamp="2026-03-07T00:00:00Z",
        water_level_pct=water_level,
        soil_moisture_pct=soil_moisture,
        soil_ao=2200,
        water_ao=1500,
    )


@patch("app.api.crop_fields._fetch_forecast_adjustment")
@patch("app.api.crop_fields._fetch_stress_summary")
def test_auto_decision_uses_forecast_and_stress(mock_stress, mock_forecast):
    config = _sample_config()
    valve = {"position_pct": 0, "status": "CLOSED"}

    mock_forecast.return_value = {
        "adjustment_pct": 135.0,
        "overall_recommendation": "INCREASE",
        "net_water_balance_mm": -22.0,
        "alert": "Increase irrigation demand expected",
        "data_available": True,
    }
    mock_stress.return_value = {
        "stress_index": 0.82,
        "priority": "high",
        "stress_penalty_factor": 0.35,
        "data_available": True,
    }

    decision = _make_auto_control_decision(
        field_id="field-rice-01",
        config=config,
        sensor_data=_sample_sensor_data(water_level=40.0, soil_moisture=58.0),
        current_valve=valve,
    )

    assert decision.action == "OPEN"
    assert decision.priority in {"high", "critical"}
    assert decision.ml_prediction is not None
    assert decision.ml_prediction["forecast_adjustment_pct"] == 135.0
    assert decision.ml_prediction["stress_priority"] == "high"


@patch("app.api.crop_fields._fetch_forecast_adjustment")
@patch("app.api.crop_fields._fetch_stress_summary")
def test_auto_decision_can_reduce_irrigation_with_wet_forecast(mock_stress, mock_forecast):
    config = _sample_config()
    valve = {"position_pct": 40, "status": "OPEN"}

    mock_forecast.return_value = {
        "adjustment_pct": 70.0,
        "overall_recommendation": "REDUCE",
        "net_water_balance_mm": 18.0,
        "alert": "Rainfall surplus expected; reduce irrigation",
        "data_available": True,
    }
    mock_stress.return_value = {
        "stress_index": 0.1,
        "priority": "low",
        "stress_penalty_factor": 0.03,
        "data_available": True,
    }

    decision = _make_auto_control_decision(
        field_id="field-rice-01",
        config=config,
        sensor_data=_sample_sensor_data(water_level=88.0, soil_moisture=90.0),
        current_valve=valve,
    )

    assert decision.action == "CLOSE"


@patch("app.api.crop_fields.requests.get")
def test_fetch_forecast_adjustment_handles_contract_unavailable(mock_get):
    class _Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "status": "source_unavailable",
                "source": "forecasting_service",
                "data_available": False,
                "message": "upstream timeout",
            }

    mock_get.return_value = _Response()

    payload = crop_fields._fetch_forecast_adjustment()

    assert payload["data_available"] is False
    assert payload["status"] == "source_unavailable"
    assert payload["source"] == "forecasting_service"


@patch("app.api.crop_fields.requests.get")
def test_fetch_forecast_adjustment_accepts_stale_simulated(mock_get):
    class _Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "status": "stale",
                "source": "simulated",
                "data_available": True,
                "weekly_outlook": {
                    "average_irrigation_adjustment_percent": 110,
                    "net_water_balance_mm": -5,
                },
                "overall_recommendation": "INCREASE",
            }

    mock_get.return_value = _Response()

    payload = crop_fields._fetch_forecast_adjustment()

    assert payload["data_available"] is True
    assert payload["status"] == "stale"
    assert payload["source"] == "simulated"
    assert payload["adjustment_pct"] == 110.0


@pytest.mark.asyncio
async def test_blocked_open_creates_manual_request(monkeypatch: pytest.MonkeyPatch):
    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_snapshot(_session: object) -> Dict[str, Any]:
        return {"water_level_mmsl": 75.0, "timestamp": datetime.utcnow().isoformat()}

    async def fake_create_manual_request(
        _session: object,
        **_kwargs: Any,
    ) -> Dict[str, Any]:
        return {
            "request_id": "req-001",
            "status": "PENDING",
            "reason": "low reservoir",
        }

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_latest_reservoir_snapshot", fake_get_snapshot)
    monkeypatch.setattr(crop_fields, "create_manual_request", fake_create_manual_request)
    monkeypatch.setattr(crop_fields, "_emit_event", lambda *_args, **_kwargs: None)

    decision = AutoControlDecision(
        field_id="field-rice-01",
        timestamp=datetime.utcnow().isoformat(),
        water_level_pct=20.0,
        soil_moisture_pct=40.0,
        water_level_min=50.0,
        water_level_max=80.0,
        soil_moisture_min=70.0,
        soil_moisture_max=95.0,
        action="OPEN",
        valve_position_pct=90,
        reason="Needs water",
        priority="high",
    )

    updated = await _apply_blocked_open_metadata(
        "field-rice-01",
        decision,
        create_request=True,
        actor_id="system:auto-control",
        actor_roles=["system"],
    )

    assert updated.action == "HOLD"
    assert updated.manual_request_required is True
    assert updated.manual_request_id == "req-001"
    assert updated.manual_request_status == "PENDING"


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(crop_fields.router)
    return app


def test_admin_endpoint_returns_401_without_token():
    app = _test_app()
    client = TestClient(app)
    response = client.get("/api/v1/crop-fields/manual-requests")
    assert response.status_code == 401


def test_admin_endpoint_returns_403_for_non_admin():
    app = _test_app()

    async def _non_admin_context() -> Dict[str, Any]:
        return {"id": "u1", "username": "farmer-01", "roles": ["farmer"]}

    app.dependency_overrides[get_current_user_context] = _non_admin_context
    client = TestClient(app)

    response = client.get("/api/v1/crop-fields/manual-requests")
    assert response.status_code == 403


def test_admin_endpoint_returns_200_for_admin(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _admin_context() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin-01", "roles": ["admin"]}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_list_manual_requests(
        _session: object,
        *,
        status: str | None = None,
        field_id: str | None = None,
        limit: int = 100,
    ) -> list[Dict[str, Any]]:
        del status, field_id, limit
        return []

    app.dependency_overrides[get_current_user_context] = _admin_context
    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "list_manual_requests", fake_list_manual_requests)

    client = TestClient(app)
    response = client.get("/api/v1/crop-fields/manual-requests")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "items": []}


def test_sensor_ingest_returns_manual_request_when_blocked(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    client = TestClient(app)

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str) -> Dict[str, Any]:
        return _sample_config().model_dump()

    async def fake_add_sensor_reading(_session: object, _field_id: str, _payload: Dict[str, Any]) -> Dict[str, Any]:
        return {}

    async def fake_noop(*_args: Any, **_kwargs: Any) -> None:
        return None

    async def fake_get_valve_state(_session: object, _field_id: str) -> Dict[str, Any]:
        return {"status": "CLOSED", "position_pct": 0}

    def fake_decision(*_args: Any, **_kwargs: Any) -> AutoControlDecision:
        return AutoControlDecision(
            field_id="field-rice-01",
            timestamp=datetime.utcnow().isoformat(),
            water_level_pct=20.0,
            soil_moisture_pct=40.0,
            water_level_min=50.0,
            water_level_max=80.0,
            soil_moisture_min=70.0,
            soil_moisture_max=95.0,
            action="OPEN",
            valve_position_pct=100,
            reason="Open needed",
            priority="high",
        )

    async def fake_blocked(
        _field_id: str,
        decision: AutoControlDecision,
        **_kwargs: Any,
    ) -> AutoControlDecision:
        decision.action = "HOLD"
        decision.manual_request_required = True
        decision.manual_request_id = "req-blocked"
        decision.manual_request_reason = "Reservoir too low"
        return decision

    async def fail_if_called(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        raise AssertionError("Valve state update should not happen for blocked OPEN")

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "add_sensor_reading", fake_add_sensor_reading)
    monkeypatch.setattr(crop_fields, "purge_sensor_history", fake_noop)
    monkeypatch.setattr(crop_fields, "get_valve_state", fake_get_valve_state)
    monkeypatch.setattr(crop_fields, "_make_auto_control_decision", fake_decision)
    monkeypatch.setattr(crop_fields, "_apply_blocked_open_metadata", fake_blocked)
    monkeypatch.setattr(crop_fields, "upsert_valve_state", fail_if_called)
    monkeypatch.setattr(crop_fields, "_emit_event", lambda *_args, **_kwargs: None)

    response = client.post(
        "/api/v1/crop-fields/fields/field-rice-01/sensor-data",
        json={
            "device_id": "esp32-rice-01",
            "timestamp": "2026-03-09T00:00:00Z",
            "soil_moisture_pct": 40.0,
            "water_level_pct": 20.0,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["auto_control_triggered"] is False
    assert payload["manual_request_required"] is True
    assert payload["manual_request_id"] == "req-blocked"


def test_sensor_ingest_updates_valve_when_open_allowed(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    client = TestClient(app)
    valve_updates: Dict[str, Any] = {"called": False}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str) -> Dict[str, Any]:
        return _sample_config().model_dump()

    async def fake_add_sensor_reading(_session: object, _field_id: str, _payload: Dict[str, Any]) -> Dict[str, Any]:
        return {}

    async def fake_noop(*_args: Any, **_kwargs: Any) -> None:
        return None

    async def fake_get_valve_state(_session: object, _field_id: str) -> Dict[str, Any]:
        return {"status": "CLOSED", "position_pct": 0}

    def fake_decision(*_args: Any, **_kwargs: Any) -> AutoControlDecision:
        return AutoControlDecision(
            field_id="field-rice-01",
            timestamp=datetime.utcnow().isoformat(),
            water_level_pct=20.0,
            soil_moisture_pct=40.0,
            water_level_min=50.0,
            water_level_max=80.0,
            soil_moisture_min=70.0,
            soil_moisture_max=95.0,
            action="OPEN",
            valve_position_pct=85,
            reason="Open needed",
            priority="high",
        )

    async def passthrough(
        _field_id: str,
        decision: AutoControlDecision,
        **_kwargs: Any,
    ) -> AutoControlDecision:
        return decision

    async def fake_upsert_valve_state(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        valve_updates["called"] = True
        return {"status": "OPEN", "position_pct": 85}

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "add_sensor_reading", fake_add_sensor_reading)
    monkeypatch.setattr(crop_fields, "purge_sensor_history", fake_noop)
    monkeypatch.setattr(crop_fields, "get_valve_state", fake_get_valve_state)
    monkeypatch.setattr(crop_fields, "_make_auto_control_decision", fake_decision)
    monkeypatch.setattr(crop_fields, "_apply_blocked_open_metadata", passthrough)
    monkeypatch.setattr(crop_fields, "upsert_valve_state", fake_upsert_valve_state)
    monkeypatch.setattr(crop_fields, "_emit_event", lambda *_args, **_kwargs: None)

    response = client.post(
        "/api/v1/crop-fields/fields/field-rice-01/sensor-data",
        json={
            "device_id": "esp32-rice-01",
            "timestamp": "2026-03-09T00:00:00Z",
            "soil_moisture_pct": 40.0,
            "water_level_pct": 20.0,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["auto_control_triggered"] is True
    assert payload["decision"]["action"] == "OPEN"
    assert valve_updates["called"] is True


def test_create_manual_request_emits_event(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    emitted: list[tuple[str, Dict[str, Any]]] = []

    async def _farmer_context() -> Dict[str, Any]:
        return {"id": "u-farmer-1", "username": "farmer-01", "roles": ["farmer"]}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str) -> Dict[str, Any]:
        return _sample_config().model_dump()

    async def fake_create_manual_request(_session: object, **_kwargs: Any) -> Dict[str, Any]:
        return {
            "request_id": "req-manual-001",
            "field_id": "field-rice-01",
            "requested_action": "OPEN",
            "requested_position_pct": 80,
            "reason": "Need irrigation now",
            "source_decision": None,
            "status": "PENDING",
            "created_by": "u-farmer-1",
            "reviewed_by": None,
            "review_note": None,
            "reviewed_at": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    async def fake_get_manual_request_audit(_session: object, *, request_id: str) -> list[Dict[str, Any]]:
        _ = request_id
        return []

    def fake_emit(event_name: str, payload: Dict[str, Any]) -> None:
        emitted.append((event_name, payload))

    app.dependency_overrides[get_current_user_context] = _farmer_context
    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "create_manual_request", fake_create_manual_request)
    monkeypatch.setattr(crop_fields, "get_manual_request_audit", fake_get_manual_request_audit)
    monkeypatch.setattr(crop_fields, "_emit_event", fake_emit)

    client = TestClient(app)
    response = client.post(
        "/api/v1/crop-fields/fields/field-rice-01/manual-requests",
        json={
            "requested_action": "OPEN",
            "requested_position_pct": 80,
            "reason": "Need irrigation now",
        },
    )

    assert response.status_code == 200
    assert response.json()["request_id"] == "req-manual-001"
    assert emitted
    assert emitted[0][0] == "irrigation.manual_request.v1"
    assert emitted[0][1]["request_id"] == "req-manual-001"


def test_control_valve_close_persists_closed_status(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    captured: Dict[str, Any] = {}

    async def _admin_context() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin-01", "roles": ["admin"]}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str) -> Dict[str, Any]:
        return _sample_config().model_dump()

    async def fake_get_valve_state(_session: object, _field_id: str) -> Dict[str, Any]:
        return {"status": "OPEN", "position_pct": 90}

    async def fake_upsert_crop_field(_session: object, payload: Dict[str, Any]) -> Dict[str, Any]:
        return payload

    async def fake_upsert_valve_state(
        _session: object,
        _field_id: str,
        *,
        status: str,
        position_pct: int,
        last_action: str | None,
        last_action_time: datetime | None = None,
    ) -> Dict[str, Any]:
        _ = last_action_time
        captured["status"] = status
        captured["position_pct"] = position_pct
        captured["last_action"] = last_action
        return {"status": status, "position_pct": position_pct}

    app.dependency_overrides[get_current_user_context] = _admin_context
    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "get_valve_state", fake_get_valve_state)
    monkeypatch.setattr(crop_fields, "upsert_crop_field", fake_upsert_crop_field)
    monkeypatch.setattr(crop_fields, "upsert_valve_state", fake_upsert_valve_state)

    client = TestClient(app)
    response = client.post(
        "/api/v1/crop-fields/fields/field-rice-01/valve",
        json={
            "action": "CLOSE",
            "position_pct": 0,
            "reason": "Stop watering",
        },
    )

    assert response.status_code == 200
    assert captured["status"] == "CLOSED"
    assert captured["position_pct"] == 0
    assert captured["last_action"] == "CLOSE"


def test_review_manual_request_rejects_already_reviewed(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()

    async def _admin_context() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin-01", "roles": ["admin"]}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_manual_request(_session: object, _request_id: str) -> Dict[str, Any]:
        return {
            "request_id": "req-reviewed-01",
            "field_id": "field-rice-01",
            "requested_action": "OPEN",
            "requested_position_pct": 100,
            "reason": "Existing review",
            "source_decision": None,
            "status": "APPROVED",
            "created_by": "u-farmer-1",
            "reviewed_by": "a0",
            "review_note": "already done",
            "reviewed_at": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    async def fail_review_manual_request(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        raise AssertionError("review_manual_request should not be called for already reviewed requests")

    app.dependency_overrides[get_current_user_context] = _admin_context
    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_manual_request", fake_get_manual_request)
    monkeypatch.setattr(crop_fields, "review_manual_request", fail_review_manual_request)

    client = TestClient(app)
    response = client.post(
        "/api/v1/crop-fields/manual-requests/req-reviewed-01/review",
        json={"decision": "APPROVE", "note": "repeat"},
    )

    assert response.status_code == 409


def test_create_field_defaults_crop_type_and_sync_success(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    client = TestClient(app)
    captured_payload: Dict[str, Any] = {}
    sync_state = {"called": False}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str):
        return None

    async def fake_upsert_crop_field(_session: object, payload: Dict[str, Any]) -> Dict[str, Any]:
        captured_payload.update(payload)
        return payload

    def fake_sync(_config: crop_fields.CropFieldConfig) -> None:
        sync_state["called"] = True

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "upsert_crop_field", fake_upsert_crop_field)
    monkeypatch.setattr(crop_fields, "_sync_field_to_optimization", fake_sync)

    response = client.post(
        "/api/v1/crop-fields/fields",
        json={
            "field_id": "field-new-01",
            "field_name": "Vegetable Block",
            "area_hectares": 2.0,
            "device_id": None,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["crop_type"] == "vegetables"
    assert captured_payload["crop_type"] == "vegetables"
    assert captured_payload["water_level_min_pct"] == crop_fields.CROP_DEFAULTS["vegetables"]["water_level_min_pct"]
    assert captured_payload["soil_moisture_min_pct"] == crop_fields.CROP_DEFAULTS["vegetables"]["soil_moisture_min_pct"]
    assert sync_state["called"] is True


def test_create_field_returns_502_when_optimizer_sync_fails(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    client = TestClient(app)

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str):
        return None

    async def fake_upsert_crop_field(_session: object, payload: Dict[str, Any]) -> Dict[str, Any]:
        return payload

    def fail_sync(_config: crop_fields.CropFieldConfig) -> None:
        raise HTTPException(status_code=502, detail="Optimization sync failed for test")

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "upsert_crop_field", fake_upsert_crop_field)
    monkeypatch.setattr(crop_fields, "_sync_field_to_optimization", fail_sync)

    response = client.post(
        "/api/v1/crop-fields/fields",
        json={
            "field_id": "field-new-02",
            "field_name": "Vegetable Block B",
            "area_hectares": 1.2,
            "device_id": None,
        },
    )

    assert response.status_code == 502
    assert "Optimization sync failed" in str(response.json())


def test_delete_field_returns_502_when_optimizer_delete_sync_fails(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    client = TestClient(app)
    delete_called = {"value": False}

    @asynccontextmanager
    async def fake_session_scope():
        yield object()

    async def fake_get_crop_field(_session: object, _field_id: str):
        return _sample_config().model_dump()

    async def fake_delete_crop_field(_session: object, _field_id: str) -> bool:
        delete_called["value"] = True
        return True

    def fail_delete_sync(_field_id: str) -> None:
        raise HTTPException(status_code=502, detail="Optimization delete sync failed for test")

    monkeypatch.setattr(crop_fields, "session_scope", fake_session_scope)
    monkeypatch.setattr(crop_fields, "get_crop_field", fake_get_crop_field)
    monkeypatch.setattr(crop_fields, "delete_crop_field", fake_delete_crop_field)
    monkeypatch.setattr(crop_fields, "_delete_field_in_optimization", fail_delete_sync)

    response = client.delete("/api/v1/crop-fields/fields/field-rice-01")

    assert response.status_code == 502
    assert delete_called["value"] is False

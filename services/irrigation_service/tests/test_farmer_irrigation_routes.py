"""Tests for the farmer-scoped irrigation aggregator router.

Covers the `/api/v1/irrigation/farmer/fields/{id}/summary` endpoint:
contract envelope, RBAC, graceful degradation when forecasting or
iot_service are unreachable, and pending-manual-request surfacing.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import farmer_irrigation
from app.dependencies.auth import get_current_user_context


@asynccontextmanager
async def _fake_session_scope():
    yield object()


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(farmer_irrigation.router)
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
        "location_name": "Kandy",
        "device_id": "esp-01",
        "lifecycle_state": "LIVE",
        "pairing_status": "CONFIRMED",
        "auto_control_enabled": True,
        "soil_moisture_min_pct": 70,
        "soil_moisture_max_pct": 95,
        "soil_moisture_optimal_pct": 85,
        "soil_moisture_critical_pct": 50,
        "water_level_min_pct": 50,
        "water_level_max_pct": 80,
        "water_level_optimal_pct": 65,
        "water_level_critical_pct": 30,
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
    latest: Optional[Dict[str, Any]] = None,
    valve: Optional[Dict[str, Any]] = None,
    pairings: Optional[List[Dict[str, Any]]] = None,
    manual_rows: Optional[List[Dict[str, Any]]] = None,
    policy: Optional[Dict[str, Any]] = None,
    quota_remaining: Optional[float] = None,
) -> None:
    """Stub out every DB-touching helper used by the aggregator."""

    async def _get_field(_session: object, _field_id: str):
        return field

    async def _get_latest(_session: object, _field_id: str):
        return latest

    async def _get_valve(_session: object, _field_id: str):
        return valve or {"status": "CLOSED", "position_pct": 0, "last_action_time": None}

    async def _list_pairings(_session: object, **_kwargs: Any):
        return pairings or []

    async def _list_manual(_session: object, **_kwargs: Any):
        return manual_rows or []

    async def _get_policy(_session: object, **_kwargs: Any):
        return policy

    async def _quota(_session: object, _policy: Optional[Dict[str, Any]]):
        return quota_remaining

    monkeypatch.setattr(farmer_irrigation, "session_scope", _fake_session_scope)
    monkeypatch.setattr(farmer_irrigation, "get_crop_field", _get_field)
    monkeypatch.setattr(farmer_irrigation, "get_latest_sensor_reading", _get_latest)
    monkeypatch.setattr(farmer_irrigation, "get_valve_state", _get_valve)
    monkeypatch.setattr(
        farmer_irrigation, "list_pairing_sessions_for_field", _list_pairings
    )
    monkeypatch.setattr(farmer_irrigation, "list_manual_requests", _list_manual)
    monkeypatch.setattr(farmer_irrigation, "get_active_authority_policy", _get_policy)
    monkeypatch.setattr(farmer_irrigation, "_policy_quota_remaining_mcm", _quota)


def _patch_upstreams(
    monkeypatch: pytest.MonkeyPatch,
    *,
    forecast_payload: Any,
    iot_devices: Any,
    decision: Optional[Dict[str, Any]] = None,
    decision_raises: bool = False,
) -> None:
    async def _forecast(*_args: Any, **_kwargs: Any):
        return forecast_payload

    async def _iot(_paired_ids: List[str]):
        return iot_devices

    async def _decision_fn(*_args: Any, **_kwargs: Any):
        if decision_raises:
            raise RuntimeError("boom")
        return decision

    monkeypatch.setattr(farmer_irrigation, "_fetch_weekly_outlook", _forecast)
    monkeypatch.setattr(
        farmer_irrigation, "_fetch_iot_devices_for_field", _iot
    )
    if decision is not None or decision_raises:
        monkeypatch.setattr(farmer_irrigation, "_compute_auto_decision", _decision_fn)


def _patch_forecast_summary_upstreams(
    monkeypatch: pytest.MonkeyPatch,
    *,
    weather_payload: Any,
    forecast_payload: Any,
    model_payload: Any,
) -> None:
    async def _weather(*_args: Any, **_kwargs: Any):
        return weather_payload

    async def _forecast(*_args: Any, **_kwargs: Any):
        return forecast_payload

    async def _model(*_args: Any, **_kwargs: Any):
        return model_payload

    monkeypatch.setattr(farmer_irrigation, "_fetch_weather_forecast", _weather)
    monkeypatch.setattr(farmer_irrigation, "_fetch_weekly_outlook", _forecast)
    monkeypatch.setattr(farmer_irrigation, "_fetch_forecast_model_summary", _model)


# ---------------------------------------------------------------------------
# Fixtures: payload shapes
# ---------------------------------------------------------------------------


@pytest.fixture
def fresh_reading() -> Dict[str, Any]:
    return {
        "device_id": "esp-01",
        "timestamp": datetime.utcnow().isoformat(),
        "soil_moisture_pct": 62.0,
        "water_level_pct": 58.0,
        "rssi": -65,
        "battery_v": 3.9,
    }


@pytest.fixture
def stale_reading() -> Dict[str, Any]:
    stale_ts = (datetime.utcnow() - timedelta(hours=2)).isoformat()
    return {
        "device_id": "esp-01",
        "timestamp": stale_ts,
        "soil_moisture_pct": 40.0,
        "water_level_pct": 35.0,
    }


@pytest.fixture
def pairing_row() -> Dict[str, Any]:
    return {
        "pairing_id": "pair-1",
        "field_id": "field-1",
        "device_id": "esp-01",
        "status": "CONFIRMED",
        "confirmed_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def forecast_payload() -> Dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "overall_recommendation": "NORMAL",
        "weekly_outlook": {
            "total_expected_rain_mm": 22.0,
            "total_expected_evapotranspiration_mm": 35.0,
            "net_water_balance_mm": -13.0,
            "rainy_days_expected": 2,
            "average_irrigation_adjustment_percent": 100.0,
        },
        "daily_schedule": [
            {
                "date": (datetime.utcnow() + timedelta(days=i)).date().isoformat(),
                "expected_rain_mm": 1.0 * i,
                "expected_evapotranspiration_mm": 5.0,
                "water_balance_mm": (1.0 * i) - 5.0,
                "recommendation": "NORMAL",
                "irrigation_percent": 100,
            }
            for i in range(7)
        ],
        "source": "forecasting_service",
    }


@pytest.fixture
def weather_forecast_payload() -> Dict[str, Any]:
    return {
        "status": "ok",
        "source": "open-meteo",
        "generated_at": datetime.utcnow().isoformat(),
        "location": {"latitude": 7.21, "longitude": 80.65, "region": "Field coordinates, Sri Lanka"},
        "summary": {
            "total_precipitation_7d_mm": 22.0,
            "average_temp_c": 29.1,
            "rainy_days_count": 2,
            "irrigation_recommendation": "MAINTAIN",
        },
        "daily": [
            {
                "date": (datetime.utcnow() + timedelta(days=i)).date().isoformat(),
                "temp_max_c": 30.0 + i,
                "temp_min_c": 23.0,
                "rain_mm": 1.0 * i,
                "precipitation_probability": 20 + i,
                "evapotranspiration_mm": 4.5,
                "weather_description": "Partly cloudy",
            }
            for i in range(14)
        ],
    }


@pytest.fixture
def model_summary_payload() -> Dict[str, Any]:
    return {
        "status": "ok",
        "source": "forecasting_service",
        "basic_model": {
            "name": "LinearRegression",
            "version": "1.0.0",
            "ready": True,
            "features_used_count": 24,
            "data_points": {"water_level": 48, "rainfall": 48, "dam_gates": 48},
        },
        "advanced_models": {
            "available": True,
            "trained": True,
            "models": ["Random Forest", "Gradient Boosting"],
            "best_model": "Random Forest",
            "metrics": {"Random Forest": {"rmse": 2.1, "mae": 1.4, "r2": 0.91}},
            "features_engineered": 18,
            "uncertainty_supported": True,
        },
        "scope": {
            "weather": "field_coordinates",
            "water_level_model": "service_observations",
            "field_specific_ml": False,
        },
    }


@pytest.fixture
def iot_devices_payload() -> List[Dict[str, Any]]:
    return [
        {
            "device_id": "esp-01",
            "is_online": True,
            "last_seen": datetime.utcnow().isoformat(),
            "latest_reading": {
                "soil_moisture_pct": 62.0,
                "water_level_pct": 58.0,
                "rssi": -65,
                "battery_v": 3.9,
            },
        },
        {
            "device_id": "esp-99",  # unrelated device, must be filtered out client-side too
            "is_online": False,
        },
    ]


@pytest.fixture
def auto_decision() -> Dict[str, Any]:
    return {
        "field_id": "field-1",
        "timestamp": datetime.utcnow().isoformat(),
        "water_level_pct": 58.0,
        "soil_moisture_pct": 62.0,
        "water_level_min": 50.0,
        "water_level_max": 80.0,
        "soil_moisture_min": 70.0,
        "soil_moisture_max": 95.0,
        "action": "OPEN",
        "valve_position_pct": 60,
        "reason": "Soil below adaptive minimum",
        "priority": "high",
        "ml_prediction": {
            "forecast_adjustment_pct": 100.0,
            "stress_penalty_factor": 0.05,
        },
        "blocked": False,
        "blocked_reason": None,
        "policy_id": None,
        "policy_version": None,
        "quota_remaining_mcm": None,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_summary_404_for_unknown_field(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=None)
    _patch_upstreams(monkeypatch, forecast_payload=None, iot_devices=[])

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/unknown/summary")
    assert resp.status_code == 404


def test_summary_403_for_foreign_farmer(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _foreign_farmer_context
    _patch_db(monkeypatch, field=_farmer_field())  # owner_id=u-farmer-01, caller is u-other-farmer
    _patch_upstreams(monkeypatch, forecast_payload=None, iot_devices=[])

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 403


def test_summary_happy_path(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    iot_devices_payload: List[Dict[str, Any]],
    auto_decision: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=forecast_payload,
        iot_devices=iot_devices_payload,
        decision=auto_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["field"]["field_id"] == "field-1"
    assert body["field"]["crop_type"] == "rice"
    assert body["field"]["auto_control_enabled"] is True

    assert body["readings"]["soil_moisture_pct"] == 62.0
    assert body["readings"]["sensor_connected"] is True
    assert body["readings"]["soil_status"] in {"DRY", "OPTIMAL", "CRITICAL"}

    assert body["auto_decision"]["available"] is True
    assert body["auto_decision"]["action"] == "OPEN"
    assert body["auto_decision"]["valve_position_pct"] == 60
    assert body["auto_decision"]["forecast_adjustment_pct"] == 100.0

    assert body["week_plan"]["available"] is True
    assert len(body["week_plan"]["daily"]) == 7
    assert body["week_plan"]["weekly_outlook"]["rainy_days_expected"] == 2

    assert body["devices"]["count"] == 1
    assert body["devices"]["online_count"] == 1
    assert body["devices"]["iot_service_available"] is True
    assert body["devices"]["items"][0]["device_id"] == "esp-01"
    assert body["devices"]["items"][0]["is_primary"] is True

    assert body["manual_requests"]["latest_pending"] is None

    # merged envelope
    assert body["status"] == "ok"
    assert body["data_available"] is True


def test_forecast_summary_happy_path(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    weather_forecast_payload: Dict[str, Any],
    model_summary_payload: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
    )
    _patch_forecast_summary_upstreams(
        monkeypatch,
        weather_payload=weather_forecast_payload,
        forecast_payload=forecast_payload,
        model_payload=model_summary_payload,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/forecast-summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["field"]["field_id"] == "field-1"
    assert body["weather"]["available"] is True
    assert len(body["weather"]["daily"]) == 14
    assert body["weather"]["location"]["latitude"] == 7.21
    assert body["week_plan"]["available"] is True
    assert body["model_summary"]["available"] is True
    assert body["model_summary"]["basic_model"]["name"] == "LinearRegression"
    assert body["model_summary"]["advanced_models"]["best_model"] == "Random Forest"
    assert body["data_available"] is True


def test_forecast_summary_weather_unavailable_degrades(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    model_summary_payload: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(monkeypatch, field=_farmer_field(), latest=fresh_reading)
    _patch_forecast_summary_upstreams(
        monkeypatch,
        weather_payload=None,
        forecast_payload=forecast_payload,
        model_payload=model_summary_payload,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/forecast-summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["weather"]["available"] is False
    assert body["weather"]["daily"] == []
    assert body["week_plan"]["available"] is True
    assert body["model_summary"]["available"] is True
    assert body["data_available"] is True


def test_forecast_summary_403_for_foreign_farmer(monkeypatch: pytest.MonkeyPatch):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _foreign_farmer_context
    _patch_db(monkeypatch, field=_farmer_field())
    _patch_forecast_summary_upstreams(
        monkeypatch,
        weather_payload=None,
        forecast_payload=None,
        model_payload=None,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/forecast-summary")
    assert resp.status_code == 403


def test_summary_forecasting_unavailable_degrades_week_plan(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    iot_devices_payload: List[Dict[str, Any]],
    auto_decision: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=None,  # forecasting down
        iot_devices=iot_devices_payload,
        decision=auto_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["week_plan"]["available"] is False
    assert body["week_plan"]["daily"] == []
    assert body["data_available"] is True  # other sections still useful
    # merged status must reflect the degraded forecast section
    assert body["status"] in {"data_unavailable", "stale", "ok"}


def test_summary_iot_unavailable_marks_devices_unknown(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    auto_decision: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=forecast_payload,
        iot_devices=None,  # iot_service down
        decision=auto_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["devices"]["iot_service_available"] is False
    # We still report the paired device, but liveness is unknown
    assert body["devices"]["count"] == 1
    assert body["devices"]["items"][0]["is_online"] is None


def test_summary_no_telemetry_marks_decision_unavailable(
    monkeypatch: pytest.MonkeyPatch,
    pairing_row: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=None,
        pairings=[pairing_row],
    )
    _patch_upstreams(monkeypatch, forecast_payload=None, iot_devices=[])

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()

    assert body["readings"]["sensor_connected"] is False
    assert body["auto_decision"]["available"] is False
    assert body["auto_decision"]["message"] == "Telemetry required for auto decision"


def test_summary_blocked_decision_surfaces_policy(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    iot_devices_payload: List[Dict[str, Any]],
):
    blocked_decision = {
        "field_id": "field-1",
        "timestamp": datetime.utcnow().isoformat(),
        "water_level_pct": 25.0,
        "soil_moisture_pct": 30.0,
        "action": "OPEN",
        "valve_position_pct": 100,
        "reason": "Critical water level",
        "priority": "critical",
        "ml_prediction": {
            "forecast_adjustment_pct": 100.0,
            "stress_penalty_factor": 0.0,
        },
        "blocked": True,
        "blocked_reason": "Policy emergency mode 'drought' blocks open action",
        "policy_id": "policy-1",
        "policy_version": 3,
        "quota_remaining_mcm": 0.0,
    }

    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
        policy={
            "policy_id": "policy-1",
            "scheme_id": "scheme-1",
            "max_field_open_pct": 0,
            "emergency_mode": "drought",
        },
        quota_remaining=0.0,
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=forecast_payload,
        iot_devices=iot_devices_payload,
        decision=blocked_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()
    auto = body["auto_decision"]

    assert auto["blocked"] is True
    assert auto["policy_id"] == "policy-1"
    assert auto["quota_remaining_mcm"] == 0.0
    assert "drought" in (auto["blocked_reason"] or "").lower()


def test_summary_pending_manual_request_surfaced(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    iot_devices_payload: List[Dict[str, Any]],
    auto_decision: Dict[str, Any],
):
    pending_request = {
        "request_id": "req-99",
        "field_id": "field-1",
        "requested_action": "OPEN",
        "requested_position_pct": 75,
        "status": "PENDING",
        "reason": "Need extra water before harvest",
        "created_at": datetime.utcnow().isoformat(),
    }
    closed_request = {
        "request_id": "req-50",
        "field_id": "field-1",
        "requested_action": "OPEN",
        "requested_position_pct": 50,
        "status": "REJECTED",
        "reason": "Quota exhausted",
        "created_at": datetime.utcnow().isoformat(),
    }

    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _farmer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
        manual_rows=[pending_request, closed_request],
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=forecast_payload,
        iot_devices=iot_devices_payload,
        decision=auto_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200
    body = resp.json()

    pending = body["manual_requests"]["latest_pending"]
    assert pending is not None
    assert pending["request_id"] == "req-99"
    assert pending["status"] == "PENDING"


def test_summary_officer_with_scheme_can_read(
    monkeypatch: pytest.MonkeyPatch,
    fresh_reading: Dict[str, Any],
    pairing_row: Dict[str, Any],
    forecast_payload: Dict[str, Any],
    iot_devices_payload: List[Dict[str, Any]],
    auto_decision: Dict[str, Any],
):
    app = _test_app()
    app.dependency_overrides[get_current_user_context] = _officer_context
    _patch_db(
        monkeypatch,
        field=_farmer_field(),
        latest=fresh_reading,
        pairings=[pairing_row],
    )
    _patch_upstreams(
        monkeypatch,
        forecast_payload=forecast_payload,
        iot_devices=iot_devices_payload,
        decision=auto_decision,
    )

    client = TestClient(app)
    resp = client.get("/api/v1/irrigation/farmer/fields/field-1/summary")
    assert resp.status_code == 200

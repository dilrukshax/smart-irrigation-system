"""Contract and auth tests for forecasting service routes."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.api import advanced_forecast, forecast, weather
from app.dependencies.auth import get_current_user_context


def _app() -> FastAPI:
    app = FastAPI()
    app.include_router(forecast.router)
    app.include_router(weather.router)
    app.include_router(advanced_forecast.router)
    return app


@pytest.mark.asyncio
async def test_weather_client_strict_live_returns_source_unavailable(monkeypatch: pytest.MonkeyPatch):
    client = weather.weather_client
    previous_strict = weather.settings.strict_live_data

    async def _raise_current():
        raise RuntimeError("weather upstream down")

    monkeypatch.setattr(client, "_fetch_open_meteo_current", _raise_current)
    monkeypatch.setattr(client, "_is_cache_valid", lambda _key: False)
    weather.settings.strict_live_data = True
    try:
        payload = await client.get_current_weather()
        assert payload["status"] == "source_unavailable"
        assert payload["data_available"] is False
    finally:
        weather.settings.strict_live_data = previous_strict


@pytest.mark.asyncio
async def test_weather_client_non_strict_fallback_is_stale(monkeypatch: pytest.MonkeyPatch):
    client = weather.weather_client
    previous_strict = weather.settings.strict_live_data

    async def _raise_forecast(_days: int):
        raise RuntimeError("forecast upstream down")

    monkeypatch.setattr(client, "_fetch_open_meteo_forecast", _raise_forecast)
    monkeypatch.setattr(client, "_is_cache_valid", lambda _key: False)
    weather.settings.strict_live_data = False
    try:
        payload = await client.get_forecast(7)
        assert payload["status"] == "stale"
        assert payload["source"] == "simulated"
        assert payload["data_available"] is True
    finally:
        weather.settings.strict_live_data = previous_strict


def test_weather_summary_returns_contract_fields(monkeypatch: pytest.MonkeyPatch):
    app = _app()

    async def _current() -> Dict[str, Any]:
        return {
            "status": "stale",
            "source": "simulated",
            "data_available": True,
            "conditions": {
                "temperature_c": 29.0,
                "humidity_percent": 72.0,
                "weather_description": "Partly cloudy",
                "rain_mm": 0.5,
                "wind_speed_kmh": 10.0,
            },
            "irrigation_impact": {"recommendation": "NORMAL"},
        }

    async def _forecast(_days: int) -> Dict[str, Any]:
        return {
            "status": "stale",
            "source": "simulated",
            "data_available": True,
            "daily": [],
        }

    @asynccontextmanager
    async def _fake_session_scope():
        yield object()

    async def _noop(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        return {}

    monkeypatch.setattr(weather.weather_client, "get_current_weather", _current)
    monkeypatch.setattr(weather.weather_client, "get_forecast", _forecast)
    monkeypatch.setattr(weather, "session_scope", _fake_session_scope)
    monkeypatch.setattr(weather, "add_weather_artifact", _noop)

    client = TestClient(app)
    response = client.get("/api/weather/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "stale"
    assert payload["source"] == "simulated"
    assert "observed_at" in payload
    assert "staleness_sec" in payload
    assert "quality" in payload
    assert "data_available" in payload


def test_irrigation_recommendation_returns_contract_fields(monkeypatch: pytest.MonkeyPatch):
    app = _app()

    async def _current() -> Dict[str, Any]:
        return {
            "status": "ok",
            "source": "open-meteo",
            "data_available": True,
            "conditions": {
                "temperature_c": 29.0,
                "humidity_percent": 70.0,
                "rain_mm": 1.0,
            },
            "irrigation_impact": {"recommendation": "NORMAL"},
        }

    async def _forecast(_days: int) -> Dict[str, Any]:
        return {
            "status": "ok",
            "source": "open-meteo",
            "data_available": True,
            "summary": {"irrigation_recommendation": "NORMAL"},
            "daily": [
                {"date": "2026-03-10", "rain_mm": 1.0, "evapotranspiration_mm": 4.0},
                {"date": "2026-03-11", "rain_mm": 0.0, "evapotranspiration_mm": 4.5},
            ],
        }

    @asynccontextmanager
    async def _fake_session_scope():
        yield object()

    async def _noop(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        return {}

    monkeypatch.setattr(weather.weather_client, "get_current_weather", _current)
    monkeypatch.setattr(weather.weather_client, "get_forecast", _forecast)
    monkeypatch.setattr(weather, "session_scope", _fake_session_scope)
    monkeypatch.setattr(weather, "add_irrigation_recommendation_artifact", _noop)

    client = TestClient(app)
    response = client.get("/api/weather/irrigation-recommendation")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["source"] == "forecasting_service"
    assert payload["data_available"] is True
    assert "message" in payload


def test_v1_admin_endpoint_requires_auth():
    app = _app()
    client = TestClient(app)
    response = client.post(
        "/api/v1/submit-data",
        json={"water_level_percent": 50.0, "rainfall_mm": 0.0, "gate_opening_percent": 30.0},
    )
    assert response.status_code == 401


def test_v1_admin_endpoint_returns_403_for_non_admin():
    app = _app()

    async def _non_admin_context() -> Dict[str, Any]:
        return {"id": "u1", "username": "farmer-01", "roles": ["farmer"]}

    app.dependency_overrides[get_current_user_context] = _non_admin_context
    client = TestClient(app)
    response = client.post(
        "/api/v1/submit-data",
        json={"water_level_percent": 50.0, "rainfall_mm": 0.0, "gate_opening_percent": 30.0},
    )
    assert response.status_code == 403


def test_v1_admin_endpoint_returns_200_for_admin(monkeypatch: pytest.MonkeyPatch):
    app = _app()

    async def _admin_context() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin-01", "roles": ["admin"]}

    @asynccontextmanager
    async def _fake_session_scope():
        yield object()

    async def _fake_add_observation(*_args: Any, **_kwargs: Any) -> Dict[str, Any]:
        return {}

    app.dependency_overrides[get_current_user_context] = _admin_context
    monkeypatch.setattr(forecast, "session_scope", _fake_session_scope)
    monkeypatch.setattr(forecast, "add_observation", _fake_add_observation)

    client = TestClient(app)
    response = client.post(
        "/api/v1/submit-data",
        json={"water_level_percent": 50.0, "rainfall_mm": 0.0, "gate_opening_percent": 30.0},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["data_available"] is True


def test_v2_status_requires_admin():
    app = _app()
    client = TestClient(app)
    response = client.get("/api/v2/status")
    assert response.status_code == 401


def test_v2_status_returns_403_for_non_admin():
    app = _app()

    async def _non_admin_context() -> Dict[str, Any]:
        return {"id": "u1", "username": "farmer-01", "roles": ["farmer"]}

    app.dependency_overrides[get_current_user_context] = _non_admin_context
    client = TestClient(app)
    response = client.get("/api/v2/status")
    assert response.status_code == 403


def test_v2_status_returns_contract_for_admin():
    app = _app()

    async def _admin_context() -> Dict[str, Any]:
        return {"id": "a1", "username": "admin-01", "roles": ["admin"]}

    app.dependency_overrides[get_current_user_context] = _admin_context
    client = TestClient(app)
    response = client.get("/api/v2/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "analysis_pending", "source_unavailable"}
    assert "source" in payload
    assert "data_available" in payload

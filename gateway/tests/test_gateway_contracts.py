"""Gateway contract mapping tests for canonical /api/v1/* routes."""

import importlib.util
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient


_GATEWAY_PATH = Path(__file__).resolve().parents[1] / "gateway.py"
_spec = importlib.util.spec_from_file_location("gateway_module", _GATEWAY_PATH)
_gateway = importlib.util.module_from_spec(_spec)
assert _spec and _spec.loader
_spec.loader.exec_module(_gateway)

client = TestClient(_gateway.app)


def _response(payload=None, status_code=200):
    return httpx.Response(
        status_code=status_code,
        json=payload or {"ok": True},
        request=httpx.Request("GET", "http://test"),
    )


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_auth_route_contract(mock_request):
    mock_request.return_value = _response({"user": "ok"})

    resp = client.get("/api/v1/auth/me")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8001/api/auth/me"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_route_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.get("/api/v1/irrigation/crop-fields/fields")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/crop-fields/fields"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_forecast_weather_route_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.get("/api/v1/forecast/weather/current")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8003/api/weather/current"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_forecast_v2_route_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.get("/api/v1/forecast/v2/status")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8003/api/v2/status"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_optimization_route_contract(mock_request):
    mock_request.return_value = _response({"data": []})

    resp = client.get("/api/v1/optimization/recommendations")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/recommendations"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_iot_route_contract(mock_request):
    mock_request.return_value = _response({"count": 0})

    resp = client.get("/api/v1/iot/devices")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8006/api/v1/iot/devices"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_crop_health_route_contract(mock_request):
    mock_request.return_value = _response({"zones": []})

    resp = client.get("/api/v1/crop-health/zones")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8007/api/v1/crop-health/zones"

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
def test_optimization_planb_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.post(
        "/api/v1/optimization/planb",
        json={"field_id": "FIELD-001", "season": "Maha-2026"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/planb"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_optimization_planb_alias_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.post(
        "/api/v1/optimization/planb/generate",
        json={"field_id": "FIELD-001", "season": "Maha-2026"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/planb"


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


@patch.object(_gateway.http_client, "get", new_callable=AsyncMock)
def test_unified_field_profile_contract_success(mock_get):
    mock_get.side_effect = [
        _response({"field_id": "field-rice-01", "status": "ok", "source": "iot", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "decision", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "analysis-artifact", "data_available": True}),
        _response({"status": "success", "timestamp": "2026-03-09T00:00:00Z"}),
        _response({"status": "success", "generated_at": "2026-03-09T00:00:00Z"}),
        _response({"status": "ok", "data": [{"field_id": "field-rice-01"}], "data_available": True}),
        _response({"status": "ok", "data": {"water_budget": []}, "data_available": True}),
    ]

    resp = client.get("/api/v1/irrigation/fields/field-rice-01/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["field_id"] == "field-rice-01"
    assert payload["partial_failure"] is False
    assert payload["sections"]["f1"]["status"] in {"ok", "stale"}
    assert payload["sections"]["f2"]["status"] == "ok"
    assert payload["sections"]["f3"]["status"] in {"ok", "stale"}
    assert payload["sections"]["f4"]["status"] in {"ok", "stale"}

    called_urls = [
        kwargs.get("url") or (args[0] if args else None)
        for args, kwargs in mock_get.call_args_list
    ]
    assert "http://127.0.0.1:8002/api/v1/crop-fields/fields/field-rice-01/status" in called_urls
    assert "http://127.0.0.1:8007/api/v1/crop-health/fields/field-rice-01/stress-summary" in called_urls
    assert "http://127.0.0.1:8003/api/weather/summary" in called_urls
    assert "http://127.0.0.1:8004/f4/recommendations" in called_urls


@patch.object(_gateway.http_client, "get", new_callable=AsyncMock)
def test_unified_field_profile_partial_failure(mock_get):
    mock_get.side_effect = [
        _response({"field_id": "field-rice-01", "status": "ok", "source": "iot", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "decision", "data_available": True}),
        _response({"detail": "missing artifact"}, status_code=503),
        _response({"status": "success"}),
        _response({"status": "success"}),
        _response({"status": "ok", "data": [], "data_available": True}),
        _response({"detail": "timeout"}, status_code=504),
    ]

    resp = client.get("/api/v1/irrigation/fields/field-rice-01/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["partial_failure"] is True
    assert payload["sections"]["f2"]["status"] == "source_unavailable"
    assert payload["sections"]["f4"]["status"] in {"stale", "source_unavailable"}
    assert len(payload["errors"]) >= 1


@patch.object(_gateway.http_client, "get", new_callable=AsyncMock)
def test_unified_field_profile_marks_f3_stale_when_simulated(mock_get):
    mock_get.side_effect = [
        _response({"field_id": "field-rice-01", "status": "ok", "source": "iot_sensors", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "decision", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "analysis-artifact", "data_available": True}),
        _response(
            {
                "status": "stale",
                "source": "simulated",
                "data_available": True,
                "observed_at": "2026-03-09T00:00:00Z",
            }
        ),
        _response(
            {
                "status": "stale",
                "source": "simulated",
                "data_available": True,
                "observed_at": "2026-03-09T00:00:00Z",
            }
        ),
        _response({"status": "ok", "data": [{"field_id": "field-rice-01"}], "data_available": True}),
        _response({"status": "ok", "data": {"water_budget": []}, "data_available": True}),
    ]

    resp = client.get("/api/v1/irrigation/fields/field-rice-01/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["sections"]["f3"]["status"] == "stale"
    assert payload["status"] in {"stale", "ok"}

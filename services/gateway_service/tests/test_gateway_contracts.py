"""Gateway contract mapping tests for grouped /api/v1/* namespaces."""

import importlib.util
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

_MAIN_PATH = Path(__file__).resolve().parents[1] / "app" / "main.py"
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

for _name in list(sys.modules):
    if _name == "app" or _name.startswith("app."):
        del sys.modules[_name]

_SPEC = importlib.util.spec_from_file_location("gateway_service_main", _MAIN_PATH)
_gateway = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(_gateway)

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
def test_authority_user_route_contract(mock_request):
    mock_request.return_value = _response({"users": []})

    resp = client.get("/api/v1/authority/users")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8001/api/authority/users"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_authority_policy_route_contract(mock_request):
    mock_request.return_value = _response({"policy_id": "pol-1"})

    resp = client.post("/api/v1/authority/policies", json={"scheme_id": "scheme-a", "quota_mcm": 100})

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/authority/policies"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_authority_policy_list_route_contract(mock_request):
    mock_request.return_value = _response({"count": 1, "items": [{"policy_id": "pol-1"}]})

    resp = client.get("/api/v1/authority/policies?scheme_id=scheme-a")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/authority/policies?scheme_id=scheme-a"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_authority_policy_get_route_contract(mock_request):
    mock_request.return_value = _response({"policy_id": "pol-1", "version": 2})

    resp = client.get("/api/v1/authority/policies/pol-1")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/authority/policies/pol-1"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_farm_route_contract(mock_request):
    mock_request.return_value = _response({"count": 0})

    resp = client.get("/api/v1/farm/fields")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/farm/fields"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_devices_pairing_route_contract(mock_request):
    mock_request.return_value = _response({"pairing_id": "pair-1"})

    resp = client.post(
        "/api/v1/devices/pairing/initiate",
        json={"field_id": "field-rice-01", "device_id": "esp32-a"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/devices/pairing/initiate"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_devices_passthrough_route_contract(mock_request):
    mock_request.return_value = _response({"device_id": "esp32-a"})

    resp = client.get("/api/v1/devices/esp32-a/latest")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8006/api/v1/iot/devices/esp32-a/latest"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_telemetry_ingest_route_contract(mock_request):
    mock_request.return_value = _response({"data_received": True})

    resp = client.post(
        "/api/v1/telemetry/ingest",
        json={"field_id": "field-rice-01", "device_id": "esp32-a", "soil_moisture_pct": 55, "water_level_pct": 62},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/telemetry/ingest"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_telemetry_field_route_contract(mock_request):
    mock_request.return_value = _response({"field_id": "field-rice-01"})

    resp = client.get("/api/v1/telemetry/fields/field-rice-01/latest")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/telemetry/fields/field-rice-01/latest"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_route_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.get("/api/v1/irrigation/fields/field-rice-01/status")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/fields/field-rice-01/status"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_network_schedule_list_route_contract(mock_request):
    mock_request.return_value = _response({"count": 0, "items": []})

    resp = client.get("/api/v1/irrigation/network/schedules?scheme_id=scheme-a")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/network/schedules?scheme_id=scheme-a"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_network_schedule_detail_route_contract(mock_request):
    mock_request.return_value = _response({"schedule_id": "sch-1"})

    resp = client.get("/api/v1/irrigation/network/schedules/sch-1")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/network/schedules/sch-1"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_network_schedule_create_route_contract(mock_request):
    mock_request.return_value = _response({"schedule_id": "sch-1", "status": "ACCEPTED"})

    resp = client.post(
        "/api/v1/irrigation/network/schedules",
        json={
            "scheme_id": "scheme-a",
            "turnout_id": "turnout-1",
            "action": "OPEN",
            "start_time": "2026-04-12T10:00:00Z",
            "end_time": "2026-04-12T11:00:00Z",
        },
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/network/schedules"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_network_topology_route_contract(mock_request):
    mock_request.return_value = _response({"count": 1, "items": []})

    resp = client.get("/api/v1/irrigation/network/topology?scheme_id=scheme-a")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/network/topology?scheme_id=scheme-a"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_manual_queue_route_contract(mock_request):
    mock_request.return_value = _response({"count": 0, "items": []})

    resp = client.get("/api/v1/irrigation/manual-requests?scheme_id=scheme-a&status=PENDING")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert (
        kwargs["url"]
        == "http://127.0.0.1:8002/api/v1/irrigation/manual-requests?scheme_id=scheme-a&status=PENDING"
    )


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_manual_review_route_contract(mock_request):
    mock_request.return_value = _response({"request_id": "req-1", "status": "APPROVED"})

    resp = client.post(
        "/api/v1/irrigation/manual-requests/req-1/review",
        json={"decision": "APPROVE", "note": "approved"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/manual-requests/req-1/review"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_manual_close_route_contract(mock_request):
    mock_request.return_value = _response({"request_id": "req-1", "status": "CLOSED"})

    resp = client.post(
        "/api/v1/irrigation/manual-requests/req-1/close",
        json={"note": "done"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/manual-requests/req-1/close"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_irrigation_officer_overview_route_contract(mock_request):
    mock_request.return_value = _response({"count": 1, "items": []})

    resp = client.get("/api/v1/irrigation/officer/overview?scheme_id=scheme-a")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8002/api/v1/irrigation/officer/overview?scheme_id=scheme-a"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_forecast_weather_route_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.get("/api/v1/forecast/weather/current")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8003/api/weather/current"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_forecast_health_route_contract(mock_request):
    mock_request.return_value = _response({"status": "healthy"})

    resp = client.get("/api/v1/forecast/health")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8003/health"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_planning_recommendations_contract(mock_request):
    mock_request.return_value = _response({"data": []})

    resp = client.get("/api/v1/planning/recommendations")

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/recommendations"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_planning_scenario_contract(mock_request):
    mock_request.return_value = _response({"status": "ok"})

    resp = client.post(
        "/api/v1/planning/scenario-evaluate",
        json={"scenario_name": "dry-run"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/recommendations/scenario-evaluate"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_planning_farmer_recommend_contract(mock_request):
    mock_request.return_value = _response({"recommendations": []})

    resp = client.post(
        "/api/v1/planning/farmer/recommend",
        json={"field_id": "FIELD-001", "soil_type": "Loam", "season": "Maha-2025"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/farmer/recommend"


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_planning_farmer_crop_detail_contract(mock_request):
    mock_request.return_value = _response({"crop": {}})

    resp = client.get(
        "/api/v1/planning/farmer/crop-detail"
        "?field_id=FIELD-001&crop_id=CROP-002&season=Maha-2025"
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == (
        "http://127.0.0.1:8004/f4/farmer/crop-detail"
        "?field_id=FIELD-001&crop_id=CROP-002&season=Maha-2025"
    )


@patch.object(_gateway.http_client, "request", new_callable=AsyncMock)
def test_planning_farmer_select_contract(mock_request):
    mock_request.return_value = _response({"persisted": True})

    resp = client.post(
        "/api/v1/planning/farmer/select",
        json={"field_id": "FIELD-001", "crop_id": "CROP-002", "season": "Maha-2025"},
    )

    assert resp.status_code == 200
    _, kwargs = mock_request.call_args
    assert kwargs["url"] == "http://127.0.0.1:8004/f4/farmer/select"


@patch.object(_gateway.http_client, "get", new_callable=AsyncMock)
def test_unified_field_profile_contract_success(mock_get):
    mock_get.side_effect = [
        _response({"field_id": "field-rice-01", "status": "ok", "source": "iot_sensors", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "decision", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "analysis", "data_available": True}),
        _response({"status": "ok", "source": "forecasting", "observed_at": "2026-03-09T00:00:00Z"}),
        _response({"status": "ok", "source": "forecasting", "observed_at": "2026-03-09T00:00:00Z"}),
        _response({"status": "ok", "data": [{"field_id": "field-rice-01"}], "data_available": True}),
        _response({"status": "ok", "data": {"water_budget": []}, "data_available": True}),
    ]

    resp = client.get("/api/v1/farm/fields/field-rice-01/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["field_id"] == "field-rice-01"
    assert payload["partial_failure"] is False
    assert payload["sections"]["f1"]["status"] in {"ok", "stale"}
    assert payload["sections"]["f2"]["status"] in {"ok", "stale"}
    assert payload["sections"]["f3"]["status"] in {"ok", "stale"}
    assert payload["sections"]["f4"]["status"] in {"ok", "stale"}

    called_urls = [kwargs.get("url") or (args[0] if args else None) for args, kwargs in mock_get.call_args_list]
    assert "http://127.0.0.1:8002/api/v1/irrigation/fields/field-rice-01/status" in called_urls
    assert "http://127.0.0.1:8002/api/v1/irrigation/fields/field-rice-01/auto-decision" in called_urls
    assert "http://127.0.0.1:8007/api/v1/crop-health/fields/field-rice-01/stress-summary" in called_urls
    assert "http://127.0.0.1:8003/api/weather/summary" in called_urls
    assert "http://127.0.0.1:8003/api/weather/irrigation-recommendation" in called_urls
    assert "http://127.0.0.1:8004/f4/recommendations?field_id=field-rice-01" in called_urls
    assert "http://127.0.0.1:8004/f4/supply/water-budget?field_id=field-rice-01" in called_urls


@patch.object(_gateway.http_client, "get", new_callable=AsyncMock)
def test_unified_field_profile_partial_failure(mock_get):
    mock_get.side_effect = [
        _response({"field_id": "field-rice-01", "status": "ok", "source": "iot_sensors", "data_available": True}),
        _response({"field_id": "field-rice-01", "status": "ok", "source": "decision", "data_available": True}),
        _response({"detail": "crop-health unavailable"}, status_code=503),
        _response({"status": "ok", "source": "forecasting"}),
        _response({"status": "ok", "source": "forecasting"}),
        _response({"status": "ok", "data": []}),
        _response({"detail": "planning timeout"}, status_code=504),
    ]

    resp = client.get("/api/v1/farm/fields/field-rice-01/profile")

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["partial_failure"] is True
    assert len(payload["errors"]) >= 1
    assert payload["sections"]["f2"]["status"] in {"source_unavailable", "data_unavailable", "ok"}
    assert payload["sections"]["f4"]["status"] in {"source_unavailable", "stale", "ok", "data_unavailable"}

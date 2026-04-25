"""Contract tests for config server endpoints."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from fastapi.testclient import TestClient

_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

for _name in list(sys.modules):
    if _name == "app" or _name.startswith("app."):
        del sys.modules[_name]

_MAIN_PATH = Path(__file__).resolve().parents[1] / "app" / "main.py"
_SPEC = importlib.util.spec_from_file_location("config_server_main", _MAIN_PATH)
_MODULE = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(_MODULE)

client = TestClient(_MODULE.app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert payload["service"] == "config-server"


def test_service_config_endpoint_shape() -> None:
    response = client.get("/config/gateway?profile=docker")
    assert response.status_code == 200
    payload = response.json()

    assert payload["service"] == "gateway"
    assert payload["profile"] == "docker"
    assert isinstance(payload["config"], dict)
    assert payload["config"]["CONFIG_SERVICE_NAME"] == "gateway"
    assert payload["config"]["AUTH_SERVICE_URL"] == "http://auth_service:8001"


def test_local_profile_service_config() -> None:
    response = client.get("/config/gateway?profile=local")
    assert response.status_code == 200
    payload = response.json()
    assert payload["profile"] == "local"
    assert payload["config"]["AUTH_SERVICE_URL"] == "http://localhost:8001"
    assert payload["config"]["CONFIG_SERVER_URL"] == "http://localhost:8010"


def test_unknown_service_returns_404() -> None:
    response = client.get("/config/not-a-service?profile=docker")
    assert response.status_code == 404


def test_unknown_profile_returns_404() -> None:
    response = client.get("/config/gateway?profile=missing")
    assert response.status_code == 404


def test_all_config_endpoint_shape() -> None:
    response = client.get("/config/all?profile=docker")
    assert response.status_code == 200
    payload = response.json()

    assert payload["service"] == "all"
    assert payload["profile"] == "docker"
    assert isinstance(payload["config"], dict)
    assert "gateway" in payload["config"]
    assert "auth_service" in payload["config"]

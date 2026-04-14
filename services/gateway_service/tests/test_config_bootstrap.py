"""Tests for gateway remote config bootstrap behavior."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

_BOOTSTRAP_PATH = Path(__file__).resolve().parents[1] / "app" / "config_bootstrap.py"
_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

for _name in list(sys.modules):
    if _name == "app" or _name.startswith("app."):
        del sys.modules[_name]

_SPEC = importlib.util.spec_from_file_location("gateway_service_config_bootstrap", _BOOTSTRAP_PATH)
_BOOTSTRAP = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(_BOOTSTRAP)


class _FakeHTTPResponse:
    def __init__(self, payload: dict[str, object]):
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


def test_bootstrap_applies_remote_config_with_remote_precedence() -> None:
    with patch.dict(
        os.environ,
        {
            "CONFIG_ENABLED": "true",
            "CONFIG_SERVER_URL": "http://config-server:8010",
            "CONFIG_PROFILE": "docker",
            "CONFIG_SERVICE_NAME": "gateway",
            "CONFIG_TIMEOUT_SEC": "1",
            "CONFIG_FAIL_FAST": "false",
            "AUTH_SERVICE_URL": "http://local-auth:9999",
        },
        clear=False,
    ):
        with patch.object(
            _BOOTSTRAP,
            "urlopen",
            return_value=_FakeHTTPResponse(
                {
                    "service": "gateway",
                    "profile": "docker",
                    "config": {
                        "AUTH_SERVICE_URL": "http://auth_service:8001",
                        "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
                    },
                }
            ),
        ) as mock_urlopen:
            loaded = _BOOTSTRAP.apply_remote_config(default_service_name="gateway")

        assert loaded["AUTH_SERVICE_URL"] == "http://auth_service:8001"
        assert os.environ["AUTH_SERVICE_URL"] == "http://auth_service:8001"
        request_obj = mock_urlopen.call_args.args[0]
        assert request_obj.full_url == "http://config-server:8010/config/gateway?profile=docker"


def test_bootstrap_timeout_falls_back_to_local_env() -> None:
    with patch.dict(
        os.environ,
        {
            "CONFIG_ENABLED": "true",
            "CONFIG_SERVER_URL": "http://config-server:8010",
            "CONFIG_PROFILE": "docker",
            "CONFIG_SERVICE_NAME": "gateway",
            "CONFIG_TIMEOUT_SEC": "1",
            "CONFIG_FAIL_FAST": "false",
            "FORECASTING_SERVICE_URL": "http://local-forecasting:9999",
        },
        clear=False,
    ):
        with patch.object(_BOOTSTRAP, "urlopen", side_effect=TimeoutError("timed out")):
            loaded = _BOOTSTRAP.apply_remote_config(default_service_name="gateway")

        assert loaded == {}
        assert os.environ["FORECASTING_SERVICE_URL"] == "http://local-forecasting:9999"


def test_bootstrap_network_failure_falls_back_to_local_env() -> None:
    with patch.dict(
        os.environ,
        {
            "CONFIG_ENABLED": "true",
            "CONFIG_SERVER_URL": "http://config-server:8010",
            "CONFIG_PROFILE": "docker",
            "CONFIG_SERVICE_NAME": "gateway",
            "CONFIG_TIMEOUT_SEC": "1",
            "CONFIG_FAIL_FAST": "false",
            "PLANNING_SERVICE_URL": "http://local-planning:9999",
        },
        clear=False,
    ):
        with patch.object(_BOOTSTRAP, "urlopen", side_effect=_BOOTSTRAP.URLError("down")):
            loaded = _BOOTSTRAP.apply_remote_config(default_service_name="gateway")

        assert loaded == {}
        assert os.environ["PLANNING_SERVICE_URL"] == "http://local-planning:9999"

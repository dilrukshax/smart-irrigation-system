"""Remote configuration bootstrap helper."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


def _parse_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _candidate_server_urls(server_url: str) -> list[str]:
    """Build candidate config-server URLs with local fallbacks for non-Docker runs."""
    candidates: list[str] = []
    seen: set[str] = set()

    def add(url: str) -> None:
        normalized = url.strip().rstrip("/")
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        candidates.append(normalized)

    add(server_url)

    parsed = urlparse(server_url)
    scheme = parsed.scheme or "http"
    port = parsed.port or 8010

    # Docker DNS hostname. Add host-local fallback for VS Code/local dev.
    if parsed.hostname == "config_server":
        add(f"{scheme}://localhost:{port}")
        add(f"{scheme}://127.0.0.1:{port}")
    elif parsed.hostname in {"localhost", "127.0.0.1"}:
        add(f"{scheme}://config_server:{port}")

    fallback_env = os.getenv("CONFIG_SERVER_FALLBACK_URL")
    if fallback_env:
        add(fallback_env)

    return candidates


def _running_in_docker() -> bool:
    return Path("/.dockerenv").exists()


def apply_remote_config(*, default_service_name: str, logger: logging.Logger | None = None) -> dict[str, str]:
    """Load config from config-server and inject keys into process environment.

    Config precedence is remote-first. If remote loading fails and fail-fast is disabled,
    existing local env values are kept.
    """

    active_logger = logger or logging.getLogger(__name__)

    config_enabled = _parse_bool(os.getenv("CONFIG_ENABLED", "true"), default=True)
    if not config_enabled:
        active_logger.info("Config bootstrap is disabled (CONFIG_ENABLED=false)")
        return {}

    service_name = os.getenv("CONFIG_SERVICE_NAME", default_service_name).strip()
    default_profile = "docker" if _running_in_docker() else "local"
    default_server_url = "http://config_server:8010" if _running_in_docker() else "http://localhost:8010"
    profile = os.getenv("CONFIG_PROFILE", default_profile).strip() or default_profile
    server_url = os.getenv("CONFIG_SERVER_URL", default_server_url).strip().rstrip("/")
    timeout = float(os.getenv("CONFIG_TIMEOUT_SEC", "3") or "3")
    fail_fast = _parse_bool(os.getenv("CONFIG_FAIL_FAST", "false"), default=False)

    if not service_name:
        active_logger.warning("Config bootstrap skipped: CONFIG_SERVICE_NAME is empty")
        return {}

    errors: list[str] = []
    for candidate_server in _candidate_server_urls(server_url):
        config_url = f"{candidate_server}/config/{quote(service_name)}?profile={quote(profile)}"
        request = Request(config_url, headers={"Accept": "application/json"})

        try:
            with urlopen(request, timeout=timeout) as response:
                payload: dict[str, Any] = json.loads(response.read().decode("utf-8"))
            config_payload = payload.get("config")
            if not isinstance(config_payload, dict):
                raise ValueError("Invalid config payload format")

            applied_count = 0
            applied_config: dict[str, str] = {}
            for key, value in config_payload.items():
                if not isinstance(key, str):
                    continue
                value_str = str(value)
                os.environ[key] = value_str
                applied_config[key] = value_str
                applied_count += 1

            active_logger.info(
                "Loaded %s config keys from %s (service=%s, profile=%s)",
                applied_count,
                candidate_server,
                service_name,
                profile,
            )
            return applied_config

        except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
            errors.append(f"{candidate_server}: {exc}")

    message = (
        "Config bootstrap failed for service=%s profile=%s via %s"
        % (service_name, profile, "; ".join(errors) if errors else server_url)
    )
    if fail_fast:
        raise RuntimeError(message)
    active_logger.warning("%s. Falling back to local/default env.", message)
    return {}

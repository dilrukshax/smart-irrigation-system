"""
Shared response-contract helpers for forecasting service endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional


ALLOWED_STATUSES = {
    "ok",
    "stale",
    "data_unavailable",
    "analysis_pending",
    "source_unavailable",
}


def _to_unix_timestamp(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, datetime):
        return value.timestamp()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except Exception:
            return None
    return None


def normalize_status(
    raw_status: Any,
    *,
    source: str,
    data_available: bool,
) -> str:
    value = str(raw_status or "").lower()
    if value in ALLOWED_STATUSES:
        return value
    if value in {"success", "running", "ready", "healthy"}:
        value = "ok"
    elif value in {"insufficient_data", "not_ready"}:
        value = "data_unavailable"
    elif value in {"unavailable", "error"} and not data_available:
        value = "source_unavailable"
    else:
        value = "ok" if data_available else "data_unavailable"

    if source == "simulated" and value == "ok":
        return "stale"
    return value


def build_contract(
    *,
    source: str,
    observed_at: Any,
    data_available: bool,
    raw_status: Any = None,
    message: Optional[str] = None,
    stale_after_sec: int = 1800,
) -> dict:
    ts = _to_unix_timestamp(observed_at)
    staleness_sec = (datetime.utcnow().timestamp() - ts) if ts is not None else None

    status = normalize_status(
        raw_status,
        source=source,
        data_available=data_available,
    )
    is_live = bool(
        data_available
        and source not in {"simulated", "unavailable"}
        and status == "ok"
        and (staleness_sec is None or staleness_sec <= stale_after_sec)
    )
    quality = "good" if is_live else ("stale" if data_available else "unknown")

    return {
        "status": status,
        "source": source,
        "is_live": is_live,
        "observed_at": observed_at,
        "staleness_sec": round(staleness_sec, 2) if staleness_sec is not None else None,
        "quality": quality,
        "data_available": bool(data_available),
        "message": message,
    }

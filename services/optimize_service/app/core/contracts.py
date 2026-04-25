"""Shared response-contract helpers for optimization service endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

ALLOWED_STATUSES = {
    "ok",
    "stale",
    "data_unavailable",
    "analysis_pending",
    "source_unavailable",
}


def _to_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
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
        pass
    elif value in {"success", "ready", "healthy", "running"}:
        value = "ok"
    elif value in {"unavailable", "not_ready", "insufficient_data"}:
        value = "data_unavailable"
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
) -> Dict[str, Any]:
    observed_dt = _to_datetime(observed_at)
    staleness_sec: Optional[float] = None
    if observed_dt is not None:
        staleness_sec = (datetime.utcnow().timestamp() - observed_dt.timestamp())

    status = normalize_status(raw_status, source=source, data_available=data_available)
    is_live = bool(
        data_available
        and status == "ok"
        and source not in {"simulated", "unavailable"}
        and (staleness_sec is None or staleness_sec <= stale_after_sec)
    )
    quality = "good" if is_live else ("stale" if data_available else "unavailable")

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

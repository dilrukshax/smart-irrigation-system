"""Shared response-contract helpers for irrigation_service endpoints.

Every farmer/officer endpoint embeds the same provenance envelope so the
frontend can render confidence consistently across tabs:

  status         — "ok" | "stale" | "data_unavailable" | "source_unavailable"
  source         — "iot_sensors" | "simulated" | "aggregate"
  is_live        — bool
  observed_at    — ISO8601 string of the underlying observation
  staleness_sec  — seconds since observed_at (None if no observation)
  quality        — "good" | "stale" | "unknown"
  data_available — whether the source returned usable data
  message        — optional human-readable note

`build_contract` builds a single envelope; `merge_contracts` fuses
multiple envelopes for an aggregator response, picking the worst status
and any-true data_available, all-true is_live.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

STALE_TIMEOUT_SECONDS = 300


def now_utc() -> datetime:
    """Naive UTC now (matches the rest of the irrigation_service codebase)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def build_contract(
    *,
    observed_at: Optional[str],
    source: str,
    data_available: bool,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    observed_dt = parse_dt(observed_at)
    staleness = (now_utc() - observed_dt).total_seconds() if observed_dt else None

    if not data_available:
        status_value = "data_unavailable"
        quality = "unknown"
        is_live = False
    elif source == "simulated":
        status_value = "stale"
        quality = "unknown"
        is_live = False
    elif staleness is not None and staleness > STALE_TIMEOUT_SECONDS:
        status_value = "stale"
        quality = "stale"
        is_live = False
    else:
        status_value = "ok"
        quality = "good"
        is_live = True

    return {
        "status": status_value,
        "source": source,
        "is_live": is_live,
        "observed_at": observed_at,
        "staleness_sec": round(staleness, 2) if staleness is not None else None,
        "quality": quality,
        "data_available": data_available,
        "message": message,
    }


def contract_rank(status_value: str) -> int:
    ordering = {
        "ok": 0,
        "stale": 1,
        "data_unavailable": 2,
        "source_unavailable": 3,
    }
    return ordering.get(status_value, 2)


def merge_contracts(contracts: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not contracts:
        return build_contract(
            observed_at=None,
            source="aggregate",
            data_available=False,
            message="No source contracts",
        )

    selected = max(contracts, key=lambda item: contract_rank(str(item.get("status") or "data_unavailable")))
    return {
        "status": selected.get("status", "data_unavailable"),
        "source": "aggregate",
        "is_live": all(bool(item.get("is_live")) for item in contracts),
        "observed_at": selected.get("observed_at"),
        "staleness_sec": selected.get("staleness_sec"),
        "quality": selected.get("quality", "unknown"),
        "data_available": any(bool(item.get("data_available")) for item in contracts),
        "message": selected.get("message"),
    }

"""Helpers for the farmer-facing crop optimization flow.

The farmer flow (Optimization tab in the field detail page) calls a thin
wrapper around the existing adaptive recommendation engine. Most of the
real work lives in app/api/routes_adaptive.py — this module just covers:

  * inferring the current Sri Lankan season from a date
  * classifying field water availability into low / medium / high bands
  * pulling auxiliary signals (reservoir level, weather summary, price /
    yield history) from upstream services and the local catalog
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.data.models_orm import HistoricalYield, PriceRecord

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Season helpers
# ---------------------------------------------------------------------------

# Sri Lankan agricultural calendar:
#   Maha — Oct 1 to Mar 31 (north-east monsoon, paddy main season)
#   Yala — Apr 1 to Sep 30 (south-west monsoon, secondary season)
_MAHA_MONTHS = {10, 11, 12, 1, 2, 3}


def infer_current_season(today: Optional[date] = None) -> str:
    """Return the current season string in the canonical "Season-YEAR" form.

    The year follows the season's *starting* calendar year. A January date
    is therefore tagged with the previous year (e.g. 2026-01-15 → Maha-2025
    because Maha started in October 2025).
    """
    today = today or date.today()
    if today.month in _MAHA_MONTHS:
        season = "Maha"
        year = today.year if today.month >= 10 else today.year - 1
    else:
        season = "Yala"
        year = today.year
    return f"{season}-{year}"


def parse_season(season: str) -> Dict[str, Any]:
    """Split a "Maha-2026" / "Yala-2026" string into name + year."""
    name, _, year_str = (season or "").partition("-")
    try:
        year = int(year_str)
    except (TypeError, ValueError):
        year = date.today().year
    return {"name": (name or "Maha").title(), "year": year}


# ---------------------------------------------------------------------------
# Water band classification
# ---------------------------------------------------------------------------

# Thresholds in mm of total seasonal availability for the field.
# These are placeholders informed by typical paddy demand (~1000 mm).
_LOW_THRESHOLD_MM = 300.0
_HIGH_THRESHOLD_MM = 700.0


def classify_water_band(
    water_availability_mm: Optional[float],
    *,
    reservoir_level_pct: Optional[float] = None,
) -> Dict[str, Any]:
    """Classify field water availability into a low/medium/high band.

    Args:
        water_availability_mm: Field-level seasonal availability, normally
            sourced from `fields.water_availability_mm`.
        reservoir_level_pct: Optional live reservoir reading (0–100). When
            supplied, it nudges the band one step down if the reservoir is
            critically low (< 25 %) so the recommendation reflects the
            actual water that will reach the field.

    Returns:
        A dict with `band`, `explanation`, and the resolved availability
        value in mm so the caller can pass it into the adaptive engine.
    """
    available = float(water_availability_mm or 0.0)

    if available < _LOW_THRESHOLD_MM:
        band = "low"
    elif available < _HIGH_THRESHOLD_MM:
        band = "medium"
    else:
        band = "high"

    if reservoir_level_pct is not None and reservoir_level_pct < 25.0:
        # Penalize one step when the scheme reservoir is critically low.
        if band == "high":
            band = "medium"
        elif band == "medium":
            band = "low"

    explanations = {
        "low": (
            "Limited water — favour short-duration and low-water-sensitivity "
            "crops (e.g. green gram, maize, vegetables)."
        ),
        "medium": (
            "Moderate water — paddy is feasible at reduced area, vegetables "
            "and pulses do well."
        ),
        "high": (
            "Plenty of water — full paddy or other water-intensive crops "
            "are viable for this field."
        ),
    }

    return {
        "band": band,
        "explanation": explanations[band],
        "water_availability_mm": available,
        "reservoir_level_pct": reservoir_level_pct,
    }


# ---------------------------------------------------------------------------
# Upstream service fetchers (graceful degradation built in)
# ---------------------------------------------------------------------------


async def fetch_reservoir_snapshot(
    irrigation_service_url: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = 5.0,
) -> Optional[Dict[str, Any]]:
    """Read the current reservoir snapshot from the irrigation service.

    Returns None on any failure — callers must treat reservoir context as
    optional and never block the recommendation path.
    """
    url = f"{irrigation_service_url.rstrip('/')}/api/v1/water-management/reservoir/current"
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            logger.info("Reservoir snapshot upstream %s returned %s", url, resp.status_code)
            return None
        return resp.json() if resp.content else None
    except Exception as exc:
        logger.info("Reservoir snapshot fetch failed: %s", exc)
        return None


async def fetch_field_status(
    irrigation_service_url: str,
    field_id: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = 5.0,
) -> Optional[Dict[str, Any]]:
    """Read live field status (sensors + valve state) from F1."""
    url = (
        f"{irrigation_service_url.rstrip('/')}"
        f"/api/v1/crop-fields/fields/{field_id}/status"
    )
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            return None
        return resp.json() if resp.content else None
    except Exception as exc:
        logger.info("Field status fetch failed for %s: %s", field_id, exc)
        return None


async def fetch_weather_summary(
    forecasting_service_url: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = 5.0,
) -> Optional[Dict[str, Any]]:
    """Read the current weather summary from F3."""
    url = f"{forecasting_service_url.rstrip('/')}/api/weather/summary"
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            return None
        return resp.json() if resp.content else None
    except Exception as exc:
        logger.info("Weather summary fetch failed: %s", exc)
        return None


async def fetch_field_from_irrigation(
    irrigation_service_url: str,
    field_id: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = 5.0,
) -> Optional[Dict[str, Any]]:
    """Fetch the canonical field record from F1 (irrigation service).

    F1 owns the farmer-facing field catalog. F4 has a synced copy that
    can lag behind (legacy rows, failed syncs). This call is the lazy
    fallback used when the F4 lookup misses.
    """
    url = (
        f"{irrigation_service_url.rstrip('/')}"
        f"/api/v1/farm/fields/{field_id}"
    )
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            return None
        if resp.status_code >= 400:
            logger.info(
                "Irrigation field fetch %s returned %s", url, resp.status_code
            )
            return None
        return resp.json() if resp.content else None
    except Exception as exc:
        logger.info("Irrigation field fetch failed for %s: %s", field_id, exc)
        return None


# Default seasonal water allocation when an upstream field has no
# explicit value. 500 mm sits at the middle of the band thresholds,
# producing a "medium" classification instead of forcing "low".
_DEFAULT_WATER_AVAILABILITY_MM = 500.0


def adapt_irrigation_field_to_f4(f1_field: Dict[str, Any]) -> Dict[str, Any]:
    """Translate an F1 field record into the F4 field shape.

    F1's record uses different column names (e.g. ``area_hectares``,
    ``location_name``) and is missing the soil-chemistry columns F4
    keeps. Defaults match what the adaptive engine assumes when those
    optional fields are absent.
    """
    if not isinstance(f1_field, dict):
        return {}

    def _num(value: Any) -> Optional[float]:
        if value in (None, ""):
            return None
        try:
            return float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None

    water_avail = _num(f1_field.get("water_availability_mm"))
    if water_avail is None or water_avail <= 0:
        water_avail = _DEFAULT_WATER_AVAILABILITY_MM

    return {
        "id": str(f1_field.get("field_id") or f1_field.get("id") or ""),
        "name": f1_field.get("field_name") or f1_field.get("field_id"),
        "scheme_id": f1_field.get("scheme_id") or "IRRIGATION",
        "area_ha": _num(f1_field.get("area_hectares") or f1_field.get("area_ha")) or 1.0,
        "soil_type": f1_field.get("soil_type"),
        "soil_ph": _num(f1_field.get("soil_ph")),
        "soil_ec": _num(f1_field.get("soil_ec")),
        "location": f1_field.get("location_name") or f1_field.get("location"),
        "latitude": _num(f1_field.get("latitude")),
        "longitude": _num(f1_field.get("longitude")),
        "elevation_m": _num(f1_field.get("elevation_m") or f1_field.get("elevation")),
        "soil_suitability": _num(f1_field.get("soil_suitability")),
        "water_availability_mm": water_avail,
    }


def derive_weather_defaults(
    weather_payload: Optional[Dict[str, Any]],
    *,
    season: str,
) -> Dict[str, float]:
    """Pick season_avg_temp and season_rainfall_mm from a weather payload.

    Falls back to seasonal Sri Lankan averages when the payload is missing
    or partial. Maha is cooler/wetter than Yala on average.
    """
    season_name = parse_season(season)["name"].lower()
    if season_name == "yala":
        defaults = {"season_avg_temp": 29.5, "season_rainfall_mm": 200.0}
    else:
        defaults = {"season_avg_temp": 27.5, "season_rainfall_mm": 350.0}

    if not isinstance(weather_payload, dict):
        return defaults

    temp = (
        weather_payload.get("temperature_celsius")
        or weather_payload.get("temperature")
        or weather_payload.get("avg_temp_celsius")
    )
    rainfall = (
        weather_payload.get("rainfall_mm")
        or weather_payload.get("season_rainfall_mm")
        or weather_payload.get("expected_rainfall_mm")
    )

    out = dict(defaults)
    try:
        if temp is not None:
            out["season_avg_temp"] = float(temp)
    except (TypeError, ValueError):
        pass
    try:
        if rainfall is not None:
            out["season_rainfall_mm"] = float(rainfall)
    except (TypeError, ValueError):
        pass
    return out


# ---------------------------------------------------------------------------
# History accessors used by the per-crop drill-down
# ---------------------------------------------------------------------------


def fetch_price_history(
    db: Session,
    crop_id: str,
    *,
    weeks: int = 12,
) -> List[Dict[str, Any]]:
    """Return up to `weeks` of recent farmgate price observations."""
    cutoff = date.today() - timedelta(weeks=weeks)
    try:
        rows = (
            db.query(PriceRecord)
            .filter(PriceRecord.crop_id == crop_id, PriceRecord.date >= cutoff)
            .order_by(PriceRecord.date.asc())
            .all()
        )
    except Exception as exc:
        logger.info("Price history query failed for %s: %s", crop_id, exc)
        return []

    return [
        {
            "date": row.date.isoformat() if row.date else None,
            "price_per_kg": float(row.price_per_kg or 0.0),
            "market_name": row.market_name,
            "price_type": row.price_type,
        }
        for row in rows
    ]


def fetch_yield_history(
    db: Session,
    field_id: str,
    crop_id: str,
    *,
    limit: int = 3,
) -> List[Dict[str, Any]]:
    """Return up to `limit` most recent historical yields for field+crop."""
    try:
        rows = (
            db.query(HistoricalYield)
            .filter(
                HistoricalYield.field_id == field_id,
                HistoricalYield.crop_id == crop_id,
            )
            .order_by(HistoricalYield.year.desc(), HistoricalYield.id.desc())
            .limit(limit)
            .all()
        )
    except Exception as exc:
        logger.info(
            "Yield history query failed for %s/%s: %s", field_id, crop_id, exc
        )
        return []

    return [
        {
            "season": row.season,
            "year": row.year,
            "yield_t_per_ha": float(row.yield_t_per_ha or 0.0),
            "water_used_mm": (
                float(row.water_used_mm) if row.water_used_mm is not None else None
            ),
            "recorded_at": (
                row.recorded_at.isoformat() if row.recorded_at else None
            ),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Cost breakdown
# ---------------------------------------------------------------------------

# Buckets total estimated cost into seed / fertilizer / labour / water /
# other so the farmer-facing drill-down can render a stacked bar instead
# of a single opaque number. Percentages roughly match Sri Lankan paddy /
# vegetable cost surveys; tune later against real cost data.
_COST_SHARE = {
    "seed": 0.10,
    "fertilizer": 0.25,
    "labour": 0.30,
    "water": 0.15,
    "other": 0.20,
}


def cost_breakdown(total_cost_per_ha: float) -> Dict[str, float]:
    """Distribute a total per-ha cost into named buckets."""
    total = max(float(total_cost_per_ha or 0.0), 0.0)
    return {key: round(total * share, 0) for key, share in _COST_SHARE.items()}


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------


def utcnow_iso() -> str:
    return datetime.utcnow().isoformat()

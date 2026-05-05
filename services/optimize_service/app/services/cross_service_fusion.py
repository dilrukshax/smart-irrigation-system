"""Cross-service signal integration for F4 optimization.

Fetches stress penalty from F2 (crop health) and drought/weather risk from F3
(forecasting) and applies them to recommendation scores. All fetches are fully
optional — a network failure returns None and the caller must fall back to
unmodified scores.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 5.0


# ---------------------------------------------------------------------------
# F2 — Crop health stress penalty
# ---------------------------------------------------------------------------


async def fetch_f2_stress_penalty(
    crop_health_service_url: str,
    field_id: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = _DEFAULT_TIMEOUT,
) -> Optional[float]:
    """Return the stress_penalty_factor (0–1) for a field from F2.

    A higher value means greater stress; 0.0 means healthy. Returns None on
    any failure so callers can skip the penalty without blocking.
    """
    url = (
        f"{crop_health_service_url.rstrip('/')}"
        f"/api/v1/crop-health/fields/{field_id}/stress-summary"
    )
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            logger.info("F2 stress summary for %s returned %s", field_id, resp.status_code)
            return None
        payload = resp.json() if resp.content else {}
        value = payload.get("stress_penalty_factor") or payload.get("data", {}).get("stress_penalty_factor")
        if value is not None:
            return float(value)
    except Exception as exc:
        logger.info("F2 stress penalty fetch failed for field %s: %s", field_id, exc)
    return None


# ---------------------------------------------------------------------------
# F3 — Drought risk and weather risk bands
# ---------------------------------------------------------------------------


async def fetch_f3_drought_risk(
    forecasting_service_url: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = _DEFAULT_TIMEOUT,
) -> Optional[float]:
    """Return a drought risk score (0–1) derived from F3 irrigation recommendation.

    Converts average_irrigation_adjustment_percent to a normalised risk score:
    - adjustment > 0  → system expects more rain than normal → lower risk
    - adjustment < 0  → system expects water deficit → higher risk
    Score = clamp((-adjustment_pct / 100), 0, 1)
    """
    url = f"{forecasting_service_url.rstrip('/')}/api/weather/irrigation-recommendation"
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            return None
        payload = resp.json() if resp.content else {}
        weekly = payload.get("weekly_outlook") or {}
        adj = weekly.get("average_irrigation_adjustment_percent")
        if adj is not None:
            risk = max(0.0, min(1.0, -float(adj) / 100.0))
            return risk
    except Exception as exc:
        logger.info("F3 drought risk fetch failed: %s", exc)
    return None


async def fetch_f3_weather_bands(
    forecasting_service_url: str,
    *,
    auth_header: Optional[str] = None,
    timeout: float = _DEFAULT_TIMEOUT,
) -> Optional[Dict[str, float]]:
    """Return P10/P50/P90 water coverage estimates from F3 risk assessment.

    Returns a dict with keys water_p10, water_p50, water_p90 as fractions
    (0–1) suitable for passing into build_scenario_variants().
    """
    url = f"{forecasting_service_url.rstrip('/')}/api/v1/risk-assessment"
    headers = {"Authorization": auth_header} if auth_header else {}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            return None
        payload = resp.json() if resp.content else {}
        data = payload.get("data") or payload

        drought_risk = float(data.get("drought_risk") or 0.0)
        flood_risk = float(data.get("flood_risk") or 0.0)

        # Translate risk scores into water coverage ratio bounds.
        # Base coverage assumed 1.0 (normal). Drought reduces, flood increases.
        base = max(0.0, min(1.0, 1.0 - drought_risk + flood_risk * 0.5))
        p10 = max(0.0, base - 0.15)
        p90 = min(1.0, base + 0.10)
        return {"water_p10": round(p10, 3), "water_p50": round(base, 3), "water_p90": round(p90, 3)}
    except Exception as exc:
        logger.info("F3 weather bands fetch failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Score adjustment functions (pure, no I/O)
# ---------------------------------------------------------------------------


def apply_stress_penalty_to_suitability(
    suitability_score: float,
    stress_penalty_factor: Optional[float],
    *,
    weight: float = 0.3,
) -> float:
    """Reduce suitability score by F2 stress factor.

    Formula: suitability × (1 - stress_penalty_factor × weight)

    With default weight=0.3 and max penalty=1.0, the maximum reduction is 30%.
    This preserves base ranking while letting crop-stressed fields fall below
    healthy-field equivalents.
    """
    if stress_penalty_factor is None or stress_penalty_factor <= 0.0:
        return suitability_score
    penalty = float(stress_penalty_factor) * weight
    return max(0.0, min(1.0, float(suitability_score) * (1.0 - penalty)))


def apply_drought_risk_to_water_coverage(
    water_coverage_ratio: float,
    drought_risk: Optional[float],
) -> float:
    """Reduce water_coverage_ratio by the F3 drought risk proportion.

    A drought_risk of 0.4 reduces coverage by 20% (half the risk value)
    so the optimizer sees tighter water budgets under drier forecasts.
    """
    if drought_risk is None or drought_risk <= 0.0:
        return water_coverage_ratio
    reduction = float(drought_risk) * 0.5
    return max(0.0, min(1.0, float(water_coverage_ratio) * (1.0 - reduction)))


def build_scenario_variants(
    base_recommendation: Dict[str, Any],
    *,
    water_p10: float,
    water_p50: float,
    water_p90: float,
) -> Dict[str, Dict[str, Any]]:
    """Return optimistic/base/pessimistic scenario clones of a recommendation.

    Each variant adjusts predicted_yield_t_ha and gross_revenue_per_ha
    proportionally to the water coverage ratio shift from P50.
    """
    import copy

    def _scale(rec: Dict[str, Any], ratio: float) -> Dict[str, Any]:
        out = copy.deepcopy(rec)
        base_yield = float(rec.get("predicted_yield_t_ha") or 0.0)
        base_revenue = float(rec.get("gross_revenue_per_ha") or 0.0)
        base_profit = float(rec.get("profit_per_ha") or 0.0)
        out["predicted_yield_t_ha"] = round(base_yield * ratio, 3)
        out["gross_revenue_per_ha"] = round(base_revenue * ratio, 0)
        out["profit_per_ha"] = round(base_profit * ratio, 0)
        out["water_scenario_ratio"] = round(ratio, 3)
        return out

    p50_ratio = max(water_p50, 0.01)
    return {
        "optimistic": _scale(base_recommendation, water_p90 / p50_ratio),
        "base": _scale(base_recommendation, 1.0),
        "pessimistic": _scale(base_recommendation, water_p10 / p50_ratio),
    }

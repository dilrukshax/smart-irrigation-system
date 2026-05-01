"""Farmer-scoped irrigation aggregator.

Powers the farmer field-detail page's Irrigation tab. The wizard issues a
single request per visit; this router fuses field state, ML auto-decision,
the 7-day water-need plan from forecasting_service, the device list (paired
+ live), and the latest pending manual request into one envelope.

The shape mirrors `services/optimize_service/app/api/routes_farmer.py` so
both tabs share the same response idiom.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.farm_ops import (
    _assert_field_access,
    _compute_auto_decision,
    _fetch_weekly_outlook,
    _policy_quota_remaining_mcm,
    _status_bucket,
)
from app.core.config import settings
from app.core.contracts import build_contract, merge_contracts, now_utc
from app.db.repository import (
    get_active_authority_policy,
    get_crop_field,
    get_latest_sensor_reading,
    get_valve_state,
    list_crop_fields,
    list_manual_requests,
    list_pairing_sessions_for_field,
)
from app.db.session import session_scope
from app.dependencies.auth import get_current_user_context
from app.ml.irrigation_model import irrigation_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/irrigation/farmer", tags=["Farmer Irrigation"])


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class FarmerFieldMeta(BaseModel):
    field_id: str
    field_name: str
    crop_type: str
    soil_type: Optional[str] = None
    area_hectares: float
    scheme_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    device_id: Optional[str] = None
    lifecycle_state: str
    pairing_status: str
    auto_control_enabled: bool
    soil_moisture_min_pct: float
    soil_moisture_optimal_pct: float
    soil_moisture_max_pct: float
    soil_moisture_critical_pct: float
    water_level_min_pct: float
    water_level_optimal_pct: float
    water_level_max_pct: float
    water_level_critical_pct: float


class FarmerCurrentReadings(BaseModel):
    soil_moisture_pct: Optional[float] = None
    water_level_pct: Optional[float] = None
    soil_status: str = "UNKNOWN"
    water_status: str = "UNKNOWN"
    overall_status: str = "NO_SENSOR"
    sensor_connected: bool = False
    observed_at: Optional[str] = None
    rssi: Optional[int] = None
    battery_v: Optional[float] = None
    device_id: Optional[str] = None
    valve_status: Optional[str] = None
    valve_position_pct: Optional[int] = None
    last_valve_action: Optional[str] = None
    # contract envelope for this section
    status: str = "data_unavailable"
    source: str = "iot_sensors"
    is_live: bool = False
    staleness_sec: Optional[float] = None
    quality: str = "unknown"
    data_available: bool = False
    message: Optional[str] = None


class FarmerAutoDecision(BaseModel):
    available: bool = False
    action: Optional[str] = None
    valve_position_pct: Optional[int] = None
    reason: Optional[str] = None
    priority: Optional[str] = None
    timestamp: Optional[str] = None
    forecast_adjustment_pct: Optional[float] = None
    stress_penalty_factor: Optional[float] = None
    effective_water_level_min_pct: Optional[float] = None
    effective_soil_moisture_min_pct: Optional[float] = None
    blocked: bool = False
    blocked_reason: Optional[str] = None
    policy_id: Optional[str] = None
    policy_version: Optional[int] = None
    quota_remaining_mcm: Optional[float] = None
    message: Optional[str] = None


class FarmerWeekPlanDay(BaseModel):
    date: str
    expected_rain_mm: float
    expected_evapotranspiration_mm: float
    water_balance_mm: float
    recommendation: str
    irrigation_percent: int


class FarmerWeekPlanOutlook(BaseModel):
    total_expected_rain_mm: Optional[float] = None
    total_expected_evapotranspiration_mm: Optional[float] = None
    net_water_balance_mm: Optional[float] = None
    rainy_days_expected: Optional[int] = None
    average_irrigation_adjustment_percent: Optional[float] = None


class FarmerWeekPlan(BaseModel):
    available: bool = False
    overall_recommendation: Optional[str] = None
    weekly_outlook: Optional[FarmerWeekPlanOutlook] = None
    daily: List[FarmerWeekPlanDay] = Field(default_factory=list)
    generated_at: Optional[str] = None
    source: Optional[str] = None
    message: Optional[str] = None


class FarmerDeviceItem(BaseModel):
    device_id: str
    pairing_status: str
    is_online: Optional[bool] = None
    last_seen: Optional[str] = None
    soil_moisture_pct: Optional[float] = None
    water_level_pct: Optional[float] = None
    rssi: Optional[int] = None
    battery_v: Optional[float] = None
    is_primary: bool = False
    confirmed_at: Optional[str] = None


class FarmerDeviceList(BaseModel):
    count: int = 0
    online_count: int = 0
    items: List[FarmerDeviceItem] = Field(default_factory=list)
    iot_service_available: bool = True
    message: Optional[str] = None


class FarmerPendingManualRequest(BaseModel):
    request_id: str
    requested_action: str
    requested_position_pct: int
    status: str
    reason: Optional[str] = None
    created_at: Optional[str] = None


class FarmerManualRequestsState(BaseModel):
    latest_pending: Optional[FarmerPendingManualRequest] = None


class FarmerIrrigationSummary(BaseModel):
    field: FarmerFieldMeta
    readings: FarmerCurrentReadings
    auto_decision: FarmerAutoDecision
    week_plan: Optional[FarmerWeekPlan] = None
    devices: FarmerDeviceList
    manual_requests: FarmerManualRequestsState
    # merged envelope for the whole panel
    status: str
    source: str
    is_live: bool
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str
    data_available: bool
    message: Optional[str] = None


class FarmerForecastWeatherDay(BaseModel):
    date: str
    temp_max_c: Optional[float] = None
    temp_min_c: Optional[float] = None
    rain_mm: Optional[float] = None
    precipitation_probability: Optional[float] = None
    evapotranspiration_mm: Optional[float] = None
    weather_description: Optional[str] = None


class FarmerWeatherForecast(BaseModel):
    available: bool = False
    daily: List[FarmerForecastWeatherDay] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    location: Dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = None
    generated_at: Optional[str] = None
    message: Optional[str] = None


class FarmerForecastModelSummary(BaseModel):
    available: bool = False
    basic_model: Dict[str, Any] = Field(default_factory=dict)
    advanced_models: Dict[str, Any] = Field(default_factory=dict)
    scope: Dict[str, Any] = Field(default_factory=dict)
    message: Optional[str] = None


class FarmerForecastSummary(BaseModel):
    field: FarmerFieldMeta
    readings: FarmerCurrentReadings
    weather: FarmerWeatherForecast
    week_plan: Optional[FarmerWeekPlan] = None
    model_summary: FarmerForecastModelSummary
    status: str
    source: str
    is_live: bool
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str
    data_available: bool
    message: Optional[str] = None


class FarmerAreaBoundary(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]] = Field(default_factory=list)


class FarmerAreaSummaryRequest(BaseModel):
    mode: Literal["all", "fields", "boundary"] = "all"
    field_ids: List[str] = Field(default_factory=list)
    boundary: Optional[FarmerAreaBoundary] = None


class FarmerAreaSelection(BaseModel):
    mode: Literal["all", "fields", "boundary"]
    field_count: int
    field_ids: List[str] = Field(default_factory=list)
    total_hectares: float
    boundary: Optional[Dict[str, Any]] = None


class FarmerAreaKpis(BaseModel):
    average_soil_moisture_pct: Optional[float] = None
    average_water_level_pct: Optional[float] = None
    live_fields: int = 0
    stale_fields: int = 0
    no_telemetry_fields: int = 0
    open_valves: int = 0
    critical_fields: int = 0
    pending_manual_requests: int = 0
    online_devices: int = 0
    total_devices: int = 0


class FarmerAreaFieldSummary(BaseModel):
    field_id: str
    field_name: str
    crop_type: str
    area_hectares: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_moisture_pct: Optional[float] = None
    water_level_pct: Optional[float] = None
    overall_status: str
    reading_status: str
    valve_status: Optional[str] = None
    valve_position_pct: Optional[int] = None
    auto_action: Optional[str] = None
    auto_priority: Optional[str] = None
    auto_blocked: bool = False
    auto_reason: Optional[str] = None
    pending_manual_request_id: Optional[str] = None
    devices_count: int = 0
    online_devices: int = 0
    message: Optional[str] = None


class FarmerAreaMLFieldEvidence(BaseModel):
    field_id: str
    available: bool = False
    inputs: Dict[str, Optional[float | int]] = Field(default_factory=dict)
    missing_features: List[str] = Field(default_factory=list)
    irrigation_needed: Optional[bool] = None
    confidence: Optional[float] = None
    recommendation: Optional[str] = None
    message: Optional[str] = None


class FarmerAreaModelEvidence(BaseModel):
    available: bool = False
    model_ready: bool = False
    model_name: str
    model_version: str
    required_features: List[str] = Field(default_factory=list)
    available_count: int = 0
    unavailable_count: int = 0
    average_confidence: Optional[float] = None
    recommendation_counts: Dict[str, int] = Field(default_factory=dict)
    fields: List[FarmerAreaMLFieldEvidence] = Field(default_factory=list)
    message: Optional[str] = None


class FarmerAreaDecision(BaseModel):
    action: Literal["IRRIGATE_NOW", "WATCH", "SKIP", "REQUEST_REVIEW"]
    priority: Literal["low", "medium", "high", "critical"]
    title: str
    summary: str
    recommended_field_ids: List[str] = Field(default_factory=list)
    blocked_field_ids: List[str] = Field(default_factory=list)


class FarmerAreaScenario(BaseModel):
    scenario_id: str
    title: str
    summary: str
    action: str
    field_ids: List[str] = Field(default_factory=list)
    impact: Dict[str, Any] = Field(default_factory=dict)


class FarmerAreaSummary(BaseModel):
    selection: FarmerAreaSelection
    kpis: FarmerAreaKpis
    fields: List[FarmerAreaFieldSummary] = Field(default_factory=list)
    model_evidence: FarmerAreaModelEvidence
    area_decision: FarmerAreaDecision
    scenarios: List[FarmerAreaScenario] = Field(default_factory=list)
    status: str
    source: str
    is_live: bool
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str
    data_available: bool
    message: Optional[str] = None


class FarmerForecastAreaKpis(BaseModel):
    total_expected_rain_mm: Optional[float] = None
    total_expected_evapotranspiration_mm: Optional[float] = None
    net_water_balance_mm: Optional[float] = None
    rainy_days_expected: Optional[int] = None
    average_irrigation_adjustment_percent: Optional[float] = None
    average_temp_c: Optional[float] = None
    high_rain_days: int = 0
    high_heat_days: int = 0
    live_fields: int = 0
    stale_fields: int = 0
    no_telemetry_fields: int = 0


class FarmerForecastAreaFieldSummary(BaseModel):
    field_id: str
    field_name: str
    crop_type: str
    area_hectares: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_moisture_pct: Optional[float] = None
    water_level_pct: Optional[float] = None
    overall_status: str
    reading_status: str
    observed_at: Optional[str] = None
    message: Optional[str] = None


class FarmerForecastAreaDay(BaseModel):
    date: str
    rain_mm: float = 0.0
    evapotranspiration_mm: float = 0.0
    water_balance_mm: float = 0.0
    temp_max_c: Optional[float] = None
    temp_min_c: Optional[float] = None
    precipitation_probability: Optional[float] = None
    weather_description: Optional[str] = None
    recommendation: str = "NORMAL"
    irrigation_percent: int = 100


class FarmerForecastAreaDecision(BaseModel):
    action: Literal[
        "PREPARE_IRRIGATION",
        "REDUCE_IRRIGATION",
        "SKIP_IRRIGATION",
        "WATCH_WEATHER",
    ]
    priority: Literal["low", "medium", "high", "critical"]
    title: str
    summary: str
    field_ids: List[str] = Field(default_factory=list)
    key_dates: List[str] = Field(default_factory=list)


class FarmerForecastAreaScenario(BaseModel):
    scenario_id: str
    title: str
    summary: str
    action: str
    field_ids: List[str] = Field(default_factory=list)
    impact: Dict[str, Any] = Field(default_factory=dict)


class FarmerForecastAreaSummary(BaseModel):
    selection: FarmerAreaSelection
    kpis: FarmerForecastAreaKpis
    weather: FarmerWeatherForecast
    week_plan: Optional[FarmerWeekPlan] = None
    model_summary: FarmerForecastModelSummary
    daily: List[FarmerForecastAreaDay] = Field(default_factory=list)
    fields: List[FarmerForecastAreaFieldSummary] = Field(default_factory=list)
    forecast_decision: FarmerForecastAreaDecision
    scenarios: List[FarmerForecastAreaScenario] = Field(default_factory=list)
    status: str
    source: str
    is_live: bool
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str
    data_available: bool
    message: Optional[str] = None


class FarmerCropHealthAreaKpis(BaseModel):
    average_stress_index: Optional[float] = None
    health_score_pct: Optional[float] = None
    average_stress_penalty_factor: Optional[float] = None
    healthy_fields: int = 0
    medium_stress_fields: int = 0
    high_stress_fields: int = 0
    critical_stress_fields: int = 0
    analysis_pending_fields: int = 0
    data_unavailable_fields: int = 0
    average_healthy_ratio: Optional[float] = None
    average_mild_stress_ratio: Optional[float] = None
    average_severe_stress_ratio: Optional[float] = None


class FarmerCropHealthAreaFieldSummary(BaseModel):
    field_id: str
    field_name: str
    crop_type: str
    area_hectares: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    stress_index: Optional[float] = None
    priority: str = "unknown"
    stress_penalty_factor: Optional[float] = None
    healthy_ratio: Optional[float] = None
    mild_stress_ratio: Optional[float] = None
    severe_stress_ratio: Optional[float] = None
    recommended_action: Optional[str] = None
    status: str = "data_unavailable"
    source: str = "crop_health_service"
    is_live: bool = False
    observed_at: Optional[str] = None
    quality: str = "unknown"
    data_available: bool = False
    message: Optional[str] = None


class FarmerCropHealthAreaDecision(BaseModel):
    action: Literal["INSPECT_NOW", "MONITOR", "HEALTHY", "RUN_ANALYSIS"]
    priority: Literal["low", "medium", "high", "critical"]
    title: str
    summary: str
    field_ids: List[str] = Field(default_factory=list)


class FarmerCropHealthAreaScenario(BaseModel):
    scenario_id: str
    title: str
    summary: str
    action: str
    field_ids: List[str] = Field(default_factory=list)
    impact: Dict[str, Any] = Field(default_factory=dict)


class FarmerCropHealthAreaSummary(BaseModel):
    selection: FarmerAreaSelection
    kpis: FarmerCropHealthAreaKpis
    fields: List[FarmerCropHealthAreaFieldSummary] = Field(default_factory=list)
    area_decision: FarmerCropHealthAreaDecision
    scenarios: List[FarmerCropHealthAreaScenario] = Field(default_factory=list)
    zones_geojson: Optional[Dict[str, Any]] = None
    status: str
    source: str
    is_live: bool
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str
    data_available: bool
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _fetch_iot_devices_for_field(
    paired_device_ids: List[str],
) -> Optional[List[Dict[str, Any]]]:
    """Pull the live device snapshot from iot_service.

    iot_service exposes `GET /api/v1/iot/devices` which returns the full
    device list with `is_online`/`last_seen`/`latest_reading`. We filter
    locally by the device IDs known to be paired to this field. Returns
    ``None`` when iot_service is unreachable so the aggregator can mark
    the section as degraded.
    """
    if not paired_device_ids:
        return []
    iot_url = getattr(settings, "iot_service_url", None)
    if not iot_url:
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{iot_url}/api/v1/iot/devices")
        if resp.status_code >= 400:
            return None
        payload = resp.json() or {}
    except Exception as exc:
        logger.debug("iot_service device list fetch failed: %s", exc)
        return None

    raw_devices = payload.get("devices") if isinstance(payload, dict) else None
    if not isinstance(raw_devices, list):
        return []

    wanted = set(paired_device_ids)
    return [item for item in raw_devices if isinstance(item, dict) and item.get("device_id") in wanted]


async def _fetch_forecasting_payload(
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{settings.forecasting_service_url}{path}",
                params=params or None,
            )
        if resp.status_code >= 400:
            return None
        payload = resp.json()
        return payload if isinstance(payload, dict) else None
    except Exception as exc:
        logger.debug("forecasting_service fetch failed for %s: %s", path, exc)
        return None


async def _fetch_weather_forecast(
    *,
    lat: Optional[float],
    lon: Optional[float],
    days: int = 14,
) -> Optional[Dict[str, Any]]:
    params: Dict[str, Any] = {"days": days}
    if lat is not None:
        params["lat"] = lat
    if lon is not None:
        params["lon"] = lon
    return await _fetch_forecasting_payload("/api/weather/forecast", params=params)


async def _fetch_forecast_model_summary() -> Optional[Dict[str, Any]]:
    return await _fetch_forecasting_payload("/api/v1/model-summary")


async def _fetch_crop_health_payload(
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    url = getattr(settings, "crop_health_service_url", None)
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{url}{path}", params=params or None)
        if resp.status_code >= 400:
            return None
        payload = resp.json()
        return payload if isinstance(payload, dict) else None
    except Exception as exc:
        logger.debug("crop_health_service fetch failed for %s: %s", path, exc)
        return None


async def _fetch_crop_health_stress_summary(
    field_id: str,
    *,
    lat: Optional[float],
    lon: Optional[float],
    area_km2: float,
) -> Optional[Dict[str, Any]]:
    params: Dict[str, Any] = {
        "area_km2": max(1.0, min(100.0, area_km2)),
        "num_zones": 6,
    }
    if lat is not None:
        params["lat"] = lat
    if lon is not None:
        params["lon"] = lon
    return await _fetch_crop_health_payload(
        f"/api/v1/crop-health/fields/{field_id}/stress-summary",
        params=params,
    )


async def _fetch_crop_health_zones(
    *,
    lat: Optional[float],
    lon: Optional[float],
    area_km2: float,
) -> Optional[Dict[str, Any]]:
    params: Dict[str, Any] = {
        "area_km2": max(1.0, min(100.0, area_km2)),
        "num_zones": 8,
    }
    if lat is not None:
        params["lat"] = lat
    if lon is not None:
        params["lon"] = lon
    return await _fetch_crop_health_payload(
        "/api/v1/crop-health/zones/geojson",
        params=params,
    )


def _build_field_meta(field: Dict[str, Any]) -> FarmerFieldMeta:
    return FarmerFieldMeta(
        field_id=str(field.get("field_id")),
        field_name=str(field.get("field_name") or field.get("field_id")),
        crop_type=str(field.get("crop_type") or "unknown"),
        soil_type=field.get("soil_type"),
        area_hectares=float(field.get("area_hectares") or 0.0),
        scheme_id=field.get("scheme_id"),
        latitude=field.get("latitude"),
        longitude=field.get("longitude"),
        location_name=field.get("location_name"),
        device_id=field.get("device_id"),
        lifecycle_state=str(field.get("lifecycle_state") or "CONFIGURED"),
        pairing_status=str(field.get("pairing_status") or "UNPAIRED"),
        auto_control_enabled=bool(field.get("auto_control_enabled", True)),
        soil_moisture_min_pct=float(field.get("soil_moisture_min_pct") or 0.0),
        soil_moisture_optimal_pct=float(field.get("soil_moisture_optimal_pct") or 0.0),
        soil_moisture_max_pct=float(field.get("soil_moisture_max_pct") or 0.0),
        soil_moisture_critical_pct=float(field.get("soil_moisture_critical_pct") or 0.0),
        water_level_min_pct=float(field.get("water_level_min_pct") or 0.0),
        water_level_optimal_pct=float(field.get("water_level_optimal_pct") or 0.0),
        water_level_max_pct=float(field.get("water_level_max_pct") or 0.0),
        water_level_critical_pct=float(field.get("water_level_critical_pct") or 0.0),
    )


def _build_readings_section(
    field: Dict[str, Any],
    latest: Optional[Dict[str, Any]],
    valve: Dict[str, Any],
) -> tuple[FarmerCurrentReadings, Dict[str, Any]]:
    if not latest:
        contract = build_contract(
            observed_at=None,
            source="iot_sensors",
            data_available=False,
            message="No telemetry available",
        )
        readings = FarmerCurrentReadings(
            valve_status=valve.get("status"),
            valve_position_pct=valve.get("position_pct"),
            last_valve_action=valve.get("last_action_time"),
            **contract,
        )
        return readings, contract

    contract = build_contract(
        observed_at=latest.get("timestamp"),
        source="iot_sensors",
        data_available=True,
    )
    stale = contract["status"] == "stale"

    water_status = _status_bucket(
        float(latest["water_level_pct"]),
        float(field["water_level_min_pct"]),
        float(field["water_level_max_pct"]),
        float(field["water_level_critical_pct"]),
        ("CRITICAL", "LOW", "OPTIMAL", "HIGH", "EXCESS"),
    )
    soil_status = _status_bucket(
        float(latest["soil_moisture_pct"]),
        float(field["soil_moisture_min_pct"]),
        float(field["soil_moisture_max_pct"]),
        float(field["soil_moisture_critical_pct"]),
        ("CRITICAL", "DRY", "OPTIMAL", "WET", "SATURATED"),
    )

    overall_status = "OK"
    if stale:
        overall_status = "WARNING"
    if water_status == "CRITICAL" or soil_status == "CRITICAL":
        overall_status = "CRITICAL"
    elif valve.get("status") == "OPEN":
        overall_status = "IRRIGATING"
    elif water_status in {"LOW", "HIGH"} or soil_status in {"DRY", "WET"}:
        overall_status = "WARNING"

    readings = FarmerCurrentReadings(
        soil_moisture_pct=latest.get("soil_moisture_pct"),
        water_level_pct=latest.get("water_level_pct"),
        soil_status=soil_status,
        water_status=water_status,
        overall_status=overall_status,
        sensor_connected=not stale,
        rssi=latest.get("rssi"),
        battery_v=latest.get("battery_v"),
        device_id=latest.get("device_id") or field.get("device_id"),
        valve_status=valve.get("status"),
        valve_position_pct=valve.get("position_pct"),
        last_valve_action=valve.get("last_action_time"),
        **contract,
    )
    return readings, contract


def _build_auto_decision_section(
    decision: Optional[Dict[str, Any]],
    *,
    unavailable_reason: Optional[str] = None,
) -> FarmerAutoDecision:
    if not decision:
        return FarmerAutoDecision(
            available=False,
            message=unavailable_reason or "Auto decision unavailable",
        )
    ml = decision.get("ml_prediction") or {}
    return FarmerAutoDecision(
        available=True,
        action=decision.get("action"),
        valve_position_pct=decision.get("valve_position_pct"),
        reason=decision.get("reason"),
        priority=decision.get("priority"),
        timestamp=decision.get("timestamp"),
        forecast_adjustment_pct=ml.get("forecast_adjustment_pct"),
        stress_penalty_factor=ml.get("stress_penalty_factor"),
        effective_water_level_min_pct=decision.get("water_level_min"),
        effective_soil_moisture_min_pct=decision.get("soil_moisture_min"),
        blocked=bool(decision.get("blocked")),
        blocked_reason=decision.get("blocked_reason"),
        policy_id=decision.get("policy_id"),
        policy_version=decision.get("policy_version"),
        quota_remaining_mcm=decision.get("quota_remaining_mcm"),
        message=decision.get("message"),
    )


def _build_week_plan(payload: Optional[Dict[str, Any]]) -> tuple[Optional[FarmerWeekPlan], Dict[str, Any]]:
    if not isinstance(payload, dict):
        contract = build_contract(
            observed_at=None,
            source="forecasting_service",
            data_available=False,
            message="Forecasting service unavailable",
        )
        return (
            FarmerWeekPlan(available=False, message="Forecasting service unavailable"),
            contract,
        )

    daily_raw = payload.get("daily_schedule") or []
    daily: List[FarmerWeekPlanDay] = []
    for entry in daily_raw:
        if not isinstance(entry, dict):
            continue
        try:
            daily.append(
                FarmerWeekPlanDay(
                    date=str(entry.get("date") or ""),
                    expected_rain_mm=float(entry.get("expected_rain_mm") or 0.0),
                    expected_evapotranspiration_mm=float(
                        entry.get("expected_evapotranspiration_mm") or 0.0
                    ),
                    water_balance_mm=float(entry.get("water_balance_mm") or 0.0),
                    recommendation=str(entry.get("recommendation") or "NORMAL"),
                    irrigation_percent=int(entry.get("irrigation_percent") or 100),
                )
            )
        except (TypeError, ValueError) as exc:
            logger.debug("Skipping malformed forecast day: %s (%s)", entry, exc)
            continue

    weekly_raw = payload.get("weekly_outlook") or {}
    outlook = FarmerWeekPlanOutlook(
        total_expected_rain_mm=weekly_raw.get("total_expected_rain_mm"),
        total_expected_evapotranspiration_mm=weekly_raw.get(
            "total_expected_evapotranspiration_mm"
        ),
        net_water_balance_mm=weekly_raw.get("net_water_balance_mm"),
        rainy_days_expected=weekly_raw.get("rainy_days_expected"),
        average_irrigation_adjustment_percent=weekly_raw.get(
            "average_irrigation_adjustment_percent"
        ),
    )

    generated_at = payload.get("generated_at") or payload.get("observed_at")
    contract = build_contract(
        observed_at=generated_at if isinstance(generated_at, str) else None,
        source="forecasting_service",
        data_available=bool(daily),
        message=None if daily else "Forecast returned no daily entries",
    )

    return (
        FarmerWeekPlan(
            available=bool(daily),
            overall_recommendation=payload.get("overall_recommendation"),
            weekly_outlook=outlook,
            daily=daily,
            generated_at=generated_at if isinstance(generated_at, str) else None,
            source=str(payload.get("source") or "forecasting_service"),
            message=None if daily else "Forecast returned no daily entries",
        ),
        contract,
    )


def _build_weather_forecast(
    payload: Optional[Dict[str, Any]],
) -> tuple[FarmerWeatherForecast, Dict[str, Any]]:
    if not isinstance(payload, dict):
        contract = build_contract(
            observed_at=None,
            source="forecasting_service",
            data_available=False,
            message="Weather forecast unavailable",
        )
        return (
            FarmerWeatherForecast(available=False, message="Weather forecast unavailable"),
            contract,
        )

    daily: List[FarmerForecastWeatherDay] = []
    for item in payload.get("daily") or []:
        if not isinstance(item, dict):
            continue
        daily.append(
            FarmerForecastWeatherDay(
                date=str(item.get("date") or ""),
                temp_max_c=item.get("temp_max_c"),
                temp_min_c=item.get("temp_min_c"),
                rain_mm=item.get("rain_mm"),
                precipitation_probability=item.get("precipitation_probability"),
                evapotranspiration_mm=item.get("evapotranspiration_mm"),
                weather_description=item.get("weather_description"),
            )
        )

    generated_at = payload.get("observed_at") or payload.get("generated_at")
    source = str(payload.get("source") or "forecasting_service")
    contract = build_contract(
        observed_at=generated_at if isinstance(generated_at, str) else None,
        source="simulated" if source == "simulated" else source,
        data_available=bool(daily),
        message=None if daily else "Weather forecast returned no daily entries",
    )
    return (
        FarmerWeatherForecast(
            available=bool(daily),
            daily=daily,
            summary=payload.get("summary") if isinstance(payload.get("summary"), dict) else {},
            location=payload.get("location") if isinstance(payload.get("location"), dict) else {},
            source=source,
            generated_at=payload.get("generated_at") if isinstance(payload.get("generated_at"), str) else None,
            message=None if daily else "Weather forecast returned no daily entries",
        ),
        contract,
    )


def _build_model_summary(
    payload: Optional[Dict[str, Any]],
) -> tuple[FarmerForecastModelSummary, Dict[str, Any]]:
    if not isinstance(payload, dict):
        contract = build_contract(
            observed_at=None,
            source="forecasting_service",
            data_available=False,
            message="Forecast model summary unavailable",
        )
        return (
            FarmerForecastModelSummary(
                available=False,
                message="Forecast model summary unavailable",
            ),
            contract,
        )

    contract = build_contract(
        observed_at=None,
        source="forecasting_service",
        data_available=True,
        message=payload.get("message") if isinstance(payload.get("message"), str) else None,
    )
    return (
        FarmerForecastModelSummary(
            available=True,
            basic_model=payload.get("basic_model") if isinstance(payload.get("basic_model"), dict) else {},
            advanced_models=payload.get("advanced_models") if isinstance(payload.get("advanced_models"), dict) else {},
            scope=payload.get("scope") if isinstance(payload.get("scope"), dict) else {},
            message=payload.get("message") if isinstance(payload.get("message"), str) else None,
        ),
        contract,
    )


def _build_device_list(
    pairings: List[Dict[str, Any]],
    iot_devices: Optional[List[Dict[str, Any]]],
    primary_device_id: Optional[str],
) -> tuple[FarmerDeviceList, Dict[str, Any]]:
    iot_by_id: Dict[str, Dict[str, Any]] = {}
    if iot_devices is not None:
        for entry in iot_devices:
            device_id = entry.get("device_id")
            if isinstance(device_id, str):
                iot_by_id[device_id] = entry

    # Take the most-recent pairing row per device_id (pairings are ordered desc)
    seen: set[str] = set()
    items: List[FarmerDeviceItem] = []
    online_count = 0
    latest_observed_at: Optional[str] = None

    for pairing in pairings:
        device_id = pairing.get("device_id")
        if not device_id or device_id in seen:
            continue
        seen.add(device_id)
        live = iot_by_id.get(device_id) or {}
        latest_reading = live.get("latest_reading") or {}

        is_online: Optional[bool]
        if iot_devices is None:
            is_online = None
        else:
            is_online = bool(live.get("is_online")) if live else False

        if is_online:
            online_count += 1

        last_seen = live.get("last_seen") if live else None
        if isinstance(last_seen, str) and (
            latest_observed_at is None or last_seen > latest_observed_at
        ):
            latest_observed_at = last_seen

        items.append(
            FarmerDeviceItem(
                device_id=str(device_id),
                pairing_status=str(pairing.get("status") or "UNKNOWN"),
                is_online=is_online,
                last_seen=last_seen if isinstance(last_seen, str) else None,
                soil_moisture_pct=latest_reading.get("soil_moisture_pct"),
                water_level_pct=latest_reading.get("water_level_pct"),
                rssi=latest_reading.get("rssi"),
                battery_v=latest_reading.get("battery_v"),
                is_primary=(device_id == primary_device_id),
                confirmed_at=pairing.get("confirmed_at"),
            )
        )

    iot_available = iot_devices is not None
    contract = build_contract(
        observed_at=latest_observed_at,
        source="iot_sensors" if iot_available else "aggregate",
        data_available=bool(items) and iot_available,
        message=None if iot_available else "iot_service unavailable",
    )

    return (
        FarmerDeviceList(
            count=len(items),
            online_count=online_count,
            items=items,
            iot_service_available=iot_available,
            message=None if iot_available else "iot_service unavailable",
        ),
        contract,
    )


def _build_pending_manual_requests(
    rows: List[Dict[str, Any]],
) -> FarmerManualRequestsState:
    pending = next(
        (
            row
            for row in rows
            if str(row.get("status") or "").upper() == "PENDING"
        ),
        None,
    )
    if not pending:
        return FarmerManualRequestsState(latest_pending=None)
    return FarmerManualRequestsState(
        latest_pending=FarmerPendingManualRequest(
            request_id=str(pending.get("request_id")),
            requested_action=str(pending.get("requested_action") or "OPEN"),
            requested_position_pct=int(pending.get("requested_position_pct") or 0),
            status=str(pending.get("status") or "PENDING"),
            reason=pending.get("reason"),
            created_at=pending.get("created_at"),
        )
    )


def _as_float(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _average(values: List[Optional[float]]) -> Optional[float]:
    clean = [float(v) for v in values if isinstance(v, (int, float))]
    if not clean:
        return None
    return round(sum(clean) / len(clean), 2)


def _field_has_coordinates(field: Dict[str, Any]) -> bool:
    return _as_float(field.get("latitude")) is not None and _as_float(field.get("longitude")) is not None


def _point_in_boundary(field: Dict[str, Any], boundary: Optional[FarmerAreaBoundary]) -> bool:
    """Return whether a field centroid is inside a GeoJSON polygon boundary."""
    if not boundary or not boundary.coordinates:
        return False
    ring = boundary.coordinates[0] if boundary.coordinates else []
    if len(ring) < 3 or not _field_has_coordinates(field):
        return False

    x = float(field["longitude"])
    y = float(field["latitude"])
    inside = False
    j = len(ring) - 1
    for i, point in enumerate(ring):
        prev = ring[j]
        if len(point) < 2 or len(prev) < 2:
            j = i
            continue
        xi, yi = float(point[0]), float(point[1])
        xj, yj = float(prev[0]), float(prev[1])
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
        )
        if intersects:
            inside = not inside
        j = i
    return inside


def _boundary_metadata(boundary: Optional[FarmerAreaBoundary]) -> Optional[Dict[str, Any]]:
    if not boundary:
        return None
    ring = boundary.coordinates[0] if boundary.coordinates else []
    return {
        "type": boundary.type,
        "point_count": len(ring),
        "coordinates": boundary.coordinates,
    }


def _representative_coordinates(
    fields: List[Dict[str, Any]],
    boundary: Optional[FarmerAreaBoundary],
) -> tuple[Optional[float], Optional[float]]:
    if boundary and boundary.coordinates and boundary.coordinates[0]:
        points = [p for p in boundary.coordinates[0] if len(p) >= 2]
        if points:
            lon = sum(float(p[0]) for p in points) / len(points)
            lat = sum(float(p[1]) for p in points) / len(points)
            return lat, lon

    lats = [_as_float(field.get("latitude")) for field in fields]
    lons = [_as_float(field.get("longitude")) for field in fields]
    clean_lats = [lat for lat in lats if lat is not None]
    clean_lons = [lon for lon in lons if lon is not None]
    if not clean_lats or not clean_lons:
        return None, None
    return sum(clean_lats) / len(clean_lats), sum(clean_lons) / len(clean_lons)


def _select_area_fields(
    *,
    payload: FarmerAreaSummaryRequest,
    rows: List[Dict[str, Any]],
    user_context: Dict[str, Any],
) -> List[Dict[str, Any]]:
    by_id = {str(row.get("field_id")): row for row in rows if row.get("field_id")}

    if payload.mode == "fields" and not payload.field_ids:
        return []
    if payload.mode == "boundary" and not payload.boundary and not payload.field_ids:
        return []

    if payload.mode in {"fields", "boundary"} and payload.field_ids:
        selected: List[Dict[str, Any]] = []
        for field_id in payload.field_ids:
            field = by_id.get(str(field_id))
            if not field:
                raise HTTPException(status_code=404, detail=f"Field not found: {field_id}")
            _assert_field_access(user_context, field)
            if payload.mode == "boundary" and not _point_in_boundary(field, payload.boundary):
                continue
            selected.append(field)
        return selected

    accessible: List[Dict[str, Any]] = []
    for field in rows:
        try:
            _assert_field_access(user_context, field)
        except HTTPException:
            continue
        accessible.append(field)

    if payload.mode == "boundary":
        return [field for field in accessible if _point_in_boundary(field, payload.boundary)]
    return accessible


def _build_ml_field_evidence(
    field: Dict[str, Any],
    latest: Optional[Dict[str, Any]],
    forecast_payload: Optional[Dict[str, Any]],
) -> FarmerAreaMLFieldEvidence:
    inputs: Dict[str, Optional[float | int]] = {
        "soil_moisture": _as_float((latest or {}).get("soil_moisture_pct")),
        "temperature": None,
        "humidity": None,
        "hour_of_day": now_utc().hour,
    }

    if isinstance(forecast_payload, dict):
        current = forecast_payload.get("current_conditions") or {}
        if isinstance(current, dict):
            inputs["temperature"] = _as_float(current.get("temperature_c"))
            inputs["humidity"] = _as_float(current.get("humidity_percent"))

    missing = [
        name
        for name in ("soil_moisture", "temperature", "humidity", "hour_of_day")
        if inputs.get(name) is None
    ]

    model_ready = bool(getattr(irrigation_model, "is_ready", False))
    if not model_ready:
        return FarmerAreaMLFieldEvidence(
            field_id=str(field.get("field_id")),
            available=False,
            inputs=inputs,
            missing_features=missing,
            message="Irrigation ML model is not ready",
        )
    if missing:
        return FarmerAreaMLFieldEvidence(
            field_id=str(field.get("field_id")),
            available=False,
            inputs=inputs,
            missing_features=missing,
            message=f"Missing ML input feature(s): {', '.join(missing)}",
        )

    try:
        prediction = irrigation_model.predict_irrigation_need(
            soil_moisture=float(inputs["soil_moisture"]),
            temperature=float(inputs["temperature"]),
            humidity=float(inputs["humidity"]),
            hour_of_day=int(inputs["hour_of_day"]),
        )
    except Exception as exc:
        return FarmerAreaMLFieldEvidence(
            field_id=str(field.get("field_id")),
            available=False,
            inputs=inputs,
            missing_features=[],
            message=f"ML prediction failed: {exc}",
        )

    return FarmerAreaMLFieldEvidence(
        field_id=str(field.get("field_id")),
        available=True,
        inputs=inputs,
        irrigation_needed=bool(prediction.get("irrigation_needed")),
        confidence=_as_float(prediction.get("confidence")),
        recommendation=prediction.get("recommendation"),
    )


def _build_area_model_evidence(
    fields: List[FarmerAreaMLFieldEvidence],
) -> FarmerAreaModelEvidence:
    ready = bool(getattr(irrigation_model, "is_ready", False))
    confidences = [item.confidence for item in fields if item.available and item.confidence is not None]
    counts: Dict[str, int] = {}
    for item in fields:
        if item.available and item.recommendation:
            counts[item.recommendation] = counts.get(item.recommendation, 0) + 1

    available_count = sum(1 for item in fields if item.available)
    unavailable_count = len(fields) - available_count
    message = None
    if not ready:
        message = "Irrigation ML model is not ready"
    elif unavailable_count:
        message = f"{unavailable_count} field(s) missing ML-ready inputs"

    return FarmerAreaModelEvidence(
        available=available_count > 0,
        model_ready=ready,
        model_name=str(getattr(irrigation_model, "MODEL_NAME", "RandomForestClassifier")),
        model_version=str(getattr(irrigation_model, "MODEL_VERSION", "unknown")),
        required_features=list(getattr(irrigation_model, "REQUIRED_FEATURES", [])),
        available_count=available_count,
        unavailable_count=unavailable_count,
        average_confidence=_average(confidences),
        recommendation_counts=counts,
        fields=fields,
        message=message,
    )


def _build_area_decision(
    field_summaries: List[FarmerAreaFieldSummary],
    kpis: FarmerAreaKpis,
) -> FarmerAreaDecision:
    if not field_summaries:
        return FarmerAreaDecision(
            action="WATCH",
            priority="low",
            title="Select an irrigation area",
            summary="No registered field centroids fall inside the selected area.",
        )

    blocked = [item.field_id for item in field_summaries if item.auto_blocked]
    pending = [item.field_id for item in field_summaries if item.pending_manual_request_id]
    open_fields = [
        item.field_id
        for item in field_summaries
        if item.auto_action == "OPEN" and not item.auto_blocked
    ]
    critical = [
        item.field_id
        for item in field_summaries
        if item.overall_status == "CRITICAL" or item.auto_priority == "critical"
    ]

    if blocked or pending:
        return FarmerAreaDecision(
            action="REQUEST_REVIEW",
            priority="critical" if critical else "high",
            title="Officer review needed",
            summary="One or more irrigation actions are blocked by policy or already waiting for review.",
            recommended_field_ids=sorted(set(open_fields + critical)),
            blocked_field_ids=sorted(set(blocked + pending)),
        )

    if open_fields or critical:
        return FarmerAreaDecision(
            action="IRRIGATE_NOW",
            priority="critical" if critical else "high",
            title="Irrigate selected area now",
            summary="At least one field is below adaptive water or soil-moisture thresholds.",
            recommended_field_ids=sorted(set(open_fields + critical)),
        )

    if kpis.no_telemetry_fields > 0 or kpis.stale_fields > 0:
        return FarmerAreaDecision(
            action="WATCH",
            priority="medium",
            title="Check sensors before acting",
            summary="Some selected fields have stale or missing telemetry, so the area decision is lower confidence.",
        )

    return FarmerAreaDecision(
        action="SKIP",
        priority="low",
        title="No irrigation needed now",
        summary="Selected fields are within current adaptive thresholds.",
    )


def _build_area_scenarios(
    decision: FarmerAreaDecision,
    kpis: FarmerAreaKpis,
    field_summaries: List[FarmerAreaFieldSummary],
) -> List[FarmerAreaScenario]:
    if not field_summaries:
        return [
            FarmerAreaScenario(
                scenario_id="select-area",
                title="Select or redraw the area",
                summary="Draw around registered field markers or switch to all fields to generate irrigation scenarios.",
                action="SELECT_AREA",
                field_ids=[],
                impact={"confidence": "none"},
            )
        ]

    field_ids = [item.field_id for item in field_summaries]
    scenarios = [
        FarmerAreaScenario(
            scenario_id="irrigate-now",
            title="Irrigate now",
            summary="Open valves for fields that the adaptive decision engine marked as needing water.",
            action="OPEN_RECOMMENDED_FIELDS",
            field_ids=decision.recommended_field_ids,
            impact={
                "target_fields": len(decision.recommended_field_ids),
                "risk": "low" if decision.action == "IRRIGATE_NOW" else "medium",
            },
        ),
        FarmerAreaScenario(
            scenario_id="delay-24h",
            title="Delay 24 hours",
            summary="Wait for the next telemetry and weather refresh before opening valves.",
            action="DELAY",
            field_ids=field_ids,
            impact={
                "risk": "high" if decision.priority in {"high", "critical"} else "low",
                "stale_fields": kpis.stale_fields,
            },
        ),
        FarmerAreaScenario(
            scenario_id="reduce-25",
            title="Reduce by 25%",
            summary="Use a conservative irrigation pass when rain or quota pressure is uncertain.",
            action="PARTIAL_IRRIGATION",
            field_ids=decision.recommended_field_ids or field_ids,
            impact={
                "valve_reduction_pct": 25,
                "pending_manual_requests": kpis.pending_manual_requests,
            },
        ),
    ]

    if decision.action == "REQUEST_REVIEW" or kpis.no_telemetry_fields > 0:
        scenarios.append(
            FarmerAreaScenario(
                scenario_id="request-review",
                title="Request officer review",
                summary="Send the affected fields for review when policy, quota, or sensor gaps make auto action uncertain.",
                action="REQUEST_REVIEW",
                field_ids=decision.blocked_field_ids or field_ids,
                impact={"review_required": True},
            )
        )

    return scenarios


def _build_forecast_area_daily(
    weather: FarmerWeatherForecast,
    week_plan: Optional[FarmerWeekPlan],
) -> List[FarmerForecastAreaDay]:
    week_by_date: Dict[str, FarmerWeekPlanDay] = {}
    for day in (week_plan.daily if week_plan else []):
        if day.date:
            week_by_date[day.date] = day

    daily: List[FarmerForecastAreaDay] = []
    weather_days = weather.daily if weather and weather.daily else []
    if weather_days:
        for day in weather_days:
            week_day = week_by_date.get(day.date)
            rain = _as_float(day.rain_mm)
            et = _as_float(day.evapotranspiration_mm)
            if rain is None and week_day:
                rain = week_day.expected_rain_mm
            if et is None and week_day:
                et = week_day.expected_evapotranspiration_mm
            rain_value = float(rain or 0.0)
            et_value = float(et or 0.0)
            balance = week_day.water_balance_mm if week_day else rain_value - et_value
            daily.append(
                FarmerForecastAreaDay(
                    date=day.date,
                    rain_mm=round(rain_value, 2),
                    evapotranspiration_mm=round(et_value, 2),
                    water_balance_mm=round(float(balance or 0.0), 2),
                    temp_max_c=day.temp_max_c,
                    temp_min_c=day.temp_min_c,
                    precipitation_probability=day.precipitation_probability,
                    weather_description=day.weather_description,
                    recommendation=week_day.recommendation if week_day else "NORMAL",
                    irrigation_percent=week_day.irrigation_percent if week_day else 100,
                )
            )
        return daily

    for day in (week_plan.daily if week_plan else []):
        daily.append(
            FarmerForecastAreaDay(
                date=day.date,
                rain_mm=round(day.expected_rain_mm, 2),
                evapotranspiration_mm=round(day.expected_evapotranspiration_mm, 2),
                water_balance_mm=round(day.water_balance_mm, 2),
                recommendation=day.recommendation,
                irrigation_percent=day.irrigation_percent,
            )
        )
    return daily


def _build_forecast_area_kpis(
    field_summaries: List[FarmerForecastAreaFieldSummary],
    weather: FarmerWeatherForecast,
    week_plan: Optional[FarmerWeekPlan],
    daily: List[FarmerForecastAreaDay],
) -> FarmerForecastAreaKpis:
    outlook = week_plan.weekly_outlook if week_plan else None
    total_rain = outlook.total_expected_rain_mm if outlook else None
    total_et = outlook.total_expected_evapotranspiration_mm if outlook else None
    net_balance = outlook.net_water_balance_mm if outlook else None
    rainy_days = outlook.rainy_days_expected if outlook else None
    adjustment = outlook.average_irrigation_adjustment_percent if outlook else None

    first_week = daily[:7] if daily else []
    if total_rain is None and first_week:
        total_rain = round(sum(day.rain_mm for day in first_week), 2)
    if total_et is None and first_week:
        total_et = round(sum(day.evapotranspiration_mm for day in first_week), 2)
    if net_balance is None and total_rain is not None and total_et is not None:
        net_balance = round(total_rain - total_et, 2)
    if rainy_days is None and first_week:
        rainy_days = sum(1 for day in first_week if day.rain_mm >= 1.0)
    if adjustment is None and first_week:
        adjustment = _average([float(day.irrigation_percent) for day in first_week])

    temps: List[Optional[float]] = []
    for day in daily:
        if day.temp_max_c is not None and day.temp_min_c is not None:
            temps.append((float(day.temp_max_c) + float(day.temp_min_c)) / 2)
        elif day.temp_max_c is not None:
            temps.append(float(day.temp_max_c))
        elif day.temp_min_c is not None:
            temps.append(float(day.temp_min_c))

    summary_avg_temp = None
    if isinstance(weather.summary, dict):
        summary_avg_temp = _as_float(weather.summary.get("average_temp_c"))

    high_rain_days = sum(
        1
        for day in daily
        if day.rain_mm >= 10.0
        or (day.precipitation_probability is not None and day.precipitation_probability >= 70)
    )
    high_heat_days = sum(
        1 for day in daily if day.temp_max_c is not None and float(day.temp_max_c) >= 34.0
    )

    return FarmerForecastAreaKpis(
        total_expected_rain_mm=round(float(total_rain), 2) if total_rain is not None else None,
        total_expected_evapotranspiration_mm=round(float(total_et), 2) if total_et is not None else None,
        net_water_balance_mm=round(float(net_balance), 2) if net_balance is not None else None,
        rainy_days_expected=int(rainy_days) if rainy_days is not None else None,
        average_irrigation_adjustment_percent=round(float(adjustment), 2) if adjustment is not None else None,
        average_temp_c=summary_avg_temp if summary_avg_temp is not None else _average(temps),
        high_rain_days=high_rain_days,
        high_heat_days=high_heat_days,
        live_fields=sum(1 for field in field_summaries if field.reading_status == "ok"),
        stale_fields=sum(1 for field in field_summaries if field.reading_status == "stale"),
        no_telemetry_fields=sum(
            1 for field in field_summaries if field.reading_status == "data_unavailable"
        ),
    )


def _build_forecast_area_decision(
    field_summaries: List[FarmerForecastAreaFieldSummary],
    kpis: FarmerForecastAreaKpis,
    daily: List[FarmerForecastAreaDay],
    *,
    forecast_available: bool,
) -> FarmerForecastAreaDecision:
    field_ids = [field.field_id for field in field_summaries]
    if not field_summaries:
        return FarmerForecastAreaDecision(
            action="WATCH_WEATHER",
            priority="low",
            title="Select a forecast area",
            summary="No registered field centroids fall inside the selected area.",
        )

    if not forecast_available:
        return FarmerForecastAreaDecision(
            action="WATCH_WEATHER",
            priority="medium",
            title="Forecast unavailable",
            summary="Area telemetry is available, but weather and water-balance forecasts could not be loaded.",
            field_ids=field_ids,
        )

    dry_dates = [day.date for day in daily if day.water_balance_mm <= -8.0][:5]
    wet_dates = [day.date for day in daily if day.rain_mm >= 10.0 or day.water_balance_mm >= 5.0][:5]
    net_balance = kpis.net_water_balance_mm
    adjustment = kpis.average_irrigation_adjustment_percent

    if (
        (net_balance is not None and net_balance <= -25.0)
        or (adjustment is not None and adjustment >= 125.0)
        or kpis.high_heat_days >= 3
    ):
        return FarmerForecastAreaDecision(
            action="PREPARE_IRRIGATION",
            priority="critical" if net_balance is not None and net_balance <= -45.0 else "high",
            title="Prepare irrigation for a dry window",
            summary="Forecast water balance is negative enough to plan irrigation capacity before stress rises.",
            field_ids=field_ids,
            key_dates=dry_dates,
        )

    if (
        (net_balance is not None and net_balance >= 0.0)
        and (adjustment is not None and adjustment <= 50.0)
    ):
        return FarmerForecastAreaDecision(
            action="SKIP_IRRIGATION",
            priority="low",
            title="Rain can cover the near-term demand",
            summary="Expected rainfall is enough to offset evapotranspiration for the selected area.",
            field_ids=field_ids,
            key_dates=wet_dates,
        )

    if (
        kpis.high_rain_days >= 2
        or (kpis.rainy_days_expected is not None and kpis.rainy_days_expected >= 3)
        or (adjustment is not None and adjustment <= 75.0)
    ):
        return FarmerForecastAreaDecision(
            action="REDUCE_IRRIGATION",
            priority="medium",
            title="Reduce irrigation around forecast rain",
            summary="Rain or lower forecast-adjusted demand should reduce scheduled irrigation volume.",
            field_ids=field_ids,
            key_dates=wet_dates,
        )

    if kpis.no_telemetry_fields > 0 or kpis.stale_fields > 0:
        return FarmerForecastAreaDecision(
            action="WATCH_WEATHER",
            priority="medium",
            title="Refresh telemetry before scheduling",
            summary="Some selected fields have stale or missing telemetry, so forecast guidance should be checked again before action.",
            field_ids=field_ids,
        )

    return FarmerForecastAreaDecision(
        action="WATCH_WEATHER",
        priority="low",
        title="Follow the normal forecast plan",
        summary="No heavy rain or dry-spell signal is strong enough to change the current irrigation plan.",
        field_ids=field_ids,
        key_dates=(dry_dates or wet_dates)[:5],
    )


def _build_forecast_area_scenarios(
    decision: FarmerForecastAreaDecision,
    kpis: FarmerForecastAreaKpis,
    field_summaries: List[FarmerForecastAreaFieldSummary],
    daily: List[FarmerForecastAreaDay],
) -> List[FarmerForecastAreaScenario]:
    if not field_summaries:
        return [
            FarmerForecastAreaScenario(
                scenario_id="select-area",
                title="Select or redraw the area",
                summary="Draw around registered field markers or switch to all fields to generate forecast scenarios.",
                action="SELECT_AREA",
                field_ids=[],
                impact={"confidence": "none"},
            )
        ]

    field_ids = [field.field_id for field in field_summaries]
    driest = min(daily, key=lambda day: day.water_balance_mm, default=None)
    wettest = max(daily, key=lambda day: day.rain_mm, default=None)
    scenarios = [
        FarmerForecastAreaScenario(
            scenario_id="rain-delay",
            title="Delay for forecast rain",
            summary="Use expected rainfall to pause or reduce irrigation on wet days.",
            action="DELAY_OR_REDUCE",
            field_ids=field_ids,
            impact={
                "total_expected_rain_mm": kpis.total_expected_rain_mm,
                "wettest_date": wettest.date if wettest else None,
            },
        ),
        FarmerForecastAreaScenario(
            scenario_id="dry-spell",
            title="Prepare for dry spell",
            summary="Reserve water and check valves before the strongest negative water-balance days.",
            action="PREPARE_IRRIGATION",
            field_ids=field_ids,
            impact={
                "net_water_balance_mm": kpis.net_water_balance_mm,
                "driest_date": driest.date if driest else None,
            },
        ),
        FarmerForecastAreaScenario(
            scenario_id="normal-plan",
            title="Follow forecast-adjusted plan",
            summary="Use daily irrigation percentages from the forecast model as the baseline schedule.",
            action="FOLLOW_FORECAST",
            field_ids=field_ids,
            impact={
                "average_irrigation_adjustment_percent": kpis.average_irrigation_adjustment_percent,
                "decision": decision.action,
            },
        ),
    ]

    if kpis.no_telemetry_fields > 0 or kpis.stale_fields > 0:
        scenarios.append(
            FarmerForecastAreaScenario(
                scenario_id="sensor-check",
                title="Refresh field telemetry",
                summary="Check fields with stale or missing readings before locking the forecast plan.",
                action="CHECK_SENSORS",
                field_ids=[
                    field.field_id
                    for field in field_summaries
                    if field.reading_status in {"stale", "data_unavailable"}
                ],
                impact={
                    "stale_fields": kpis.stale_fields,
                    "no_telemetry_fields": kpis.no_telemetry_fields,
                },
            )
        )

    return scenarios


def _field_area_km2(field: Dict[str, Any]) -> float:
    hectares = _as_float(field.get("area_hectares")) or 1.0
    return max(1.0, min(4.0, hectares * 0.05))


def _area_km2(fields: List[Dict[str, Any]]) -> float:
    hectares = sum(_as_float(field.get("area_hectares")) or 0.0 for field in fields)
    return max(1.0, min(20.0, hectares / 100.0))


def _build_crop_health_field_summary(
    field: Dict[str, Any],
    payload: Optional[Dict[str, Any]],
) -> tuple[FarmerCropHealthAreaFieldSummary, Dict[str, Any]]:
    field_id = str(field.get("field_id"))
    if not isinstance(payload, dict):
        contract = build_contract(
            observed_at=None,
            source="crop_health_service",
            data_available=False,
            message="Crop health stress summary unavailable",
        )
        return (
            FarmerCropHealthAreaFieldSummary(
                field_id=field_id,
                field_name=str(field.get("field_name") or field_id),
                crop_type=str(field.get("crop_type") or "unknown"),
                area_hectares=float(field.get("area_hectares") or 0.0),
                latitude=field.get("latitude"),
                longitude=field.get("longitude"),
                status=contract["status"],
                source=contract["source"],
                is_live=contract["is_live"],
                observed_at=contract["observed_at"],
                quality=contract["quality"],
                data_available=contract["data_available"],
                message=contract["message"],
            ),
            contract,
        )

    observed_at = payload.get("observed_at") or payload.get("generated_at")
    data_available = bool(payload.get("data_available", True)) and payload.get("stress_index") is not None
    contract = build_contract(
        observed_at=observed_at if isinstance(observed_at, str) else None,
        source=str(payload.get("source") or "crop_health_service"),
        data_available=data_available,
        message=payload.get("message") if isinstance(payload.get("message"), str) else None,
    )
    status_value = str(payload.get("status") or contract["status"])
    contract["status"] = status_value
    contract["quality"] = str(payload.get("quality") or contract["quality"])
    contract["is_live"] = bool(payload.get("is_live", contract["is_live"]))

    return (
        FarmerCropHealthAreaFieldSummary(
            field_id=field_id,
            field_name=str(field.get("field_name") or field_id),
            crop_type=str(field.get("crop_type") or "unknown"),
            area_hectares=float(field.get("area_hectares") or 0.0),
            latitude=field.get("latitude"),
            longitude=field.get("longitude"),
            stress_index=_as_float(payload.get("stress_index")),
            priority=str(payload.get("priority") or "unknown"),
            stress_penalty_factor=_as_float(payload.get("stress_penalty_factor")),
            healthy_ratio=_as_float(payload.get("healthy_ratio")),
            mild_stress_ratio=_as_float(payload.get("mild_stress_ratio")),
            severe_stress_ratio=_as_float(payload.get("severe_stress_ratio")),
            recommended_action=payload.get("recommended_action"),
            status=status_value,
            source=str(payload.get("source") or "crop_health_service"),
            is_live=contract["is_live"],
            observed_at=observed_at if isinstance(observed_at, str) else None,
            quality=contract["quality"],
            data_available=data_available,
            message=payload.get("message") if isinstance(payload.get("message"), str) else contract.get("message"),
        ),
        contract,
    )


def _build_crop_health_area_kpis(
    fields: List[FarmerCropHealthAreaFieldSummary],
) -> FarmerCropHealthAreaKpis:
    stress_values = [field.stress_index for field in fields if field.stress_index is not None]
    avg_stress = _average(stress_values)
    priorities = [str(field.priority or "").lower() for field in fields]
    return FarmerCropHealthAreaKpis(
        average_stress_index=avg_stress,
        health_score_pct=round((1.0 - avg_stress) * 100, 1) if avg_stress is not None else None,
        average_stress_penalty_factor=_average(
            [field.stress_penalty_factor for field in fields if field.stress_penalty_factor is not None]
        ),
        healthy_fields=sum(1 for p in priorities if p == "low"),
        medium_stress_fields=sum(1 for p in priorities if p == "medium"),
        high_stress_fields=sum(1 for p in priorities if p == "high"),
        critical_stress_fields=sum(1 for p in priorities if p == "critical"),
        analysis_pending_fields=sum(1 for field in fields if field.status == "analysis_pending"),
        data_unavailable_fields=sum(1 for field in fields if not field.data_available),
        average_healthy_ratio=_average([field.healthy_ratio for field in fields]),
        average_mild_stress_ratio=_average([field.mild_stress_ratio for field in fields]),
        average_severe_stress_ratio=_average([field.severe_stress_ratio for field in fields]),
    )


def _build_crop_health_area_decision(
    field_summaries: List[FarmerCropHealthAreaFieldSummary],
    kpis: FarmerCropHealthAreaKpis,
) -> FarmerCropHealthAreaDecision:
    if not field_summaries:
        return FarmerCropHealthAreaDecision(
            action="RUN_ANALYSIS",
            priority="low",
            title="Select a crop-health area",
            summary="No registered field centroids fall inside the selected area.",
        )

    critical = [field.field_id for field in field_summaries if field.priority == "critical"]
    high = [field.field_id for field in field_summaries if field.priority == "high"]
    medium = [field.field_id for field in field_summaries if field.priority == "medium"]
    unavailable = [field.field_id for field in field_summaries if not field.data_available]

    if critical or high:
        return FarmerCropHealthAreaDecision(
            action="INSPECT_NOW",
            priority="critical" if critical else "high",
            title="Inspect stressed fields",
            summary="One or more selected fields show high satellite stress and should be checked before the next irrigation decision.",
            field_ids=sorted(set(critical + high)),
        )

    if unavailable and len(unavailable) == len(field_summaries):
        return FarmerCropHealthAreaDecision(
            action="RUN_ANALYSIS",
            priority="medium",
            title="Run crop-health analysis",
            summary="Crop-health stress summaries are not available for the selected area.",
            field_ids=unavailable,
        )

    if medium or unavailable or kpis.analysis_pending_fields:
        return FarmerCropHealthAreaDecision(
            action="MONITOR",
            priority="medium",
            title="Monitor crop health",
            summary="Some selected fields need closer monitoring or refreshed satellite analysis.",
            field_ids=sorted(set(medium + unavailable)),
        )

    return FarmerCropHealthAreaDecision(
        action="HEALTHY",
        priority="low",
        title="Crop health looks stable",
        summary="Selected fields show low stress levels in the latest crop-health summaries.",
        field_ids=[field.field_id for field in field_summaries],
    )


def _build_crop_health_area_scenarios(
    decision: FarmerCropHealthAreaDecision,
    kpis: FarmerCropHealthAreaKpis,
    field_summaries: List[FarmerCropHealthAreaFieldSummary],
) -> List[FarmerCropHealthAreaScenario]:
    if not field_summaries:
        return [
            FarmerCropHealthAreaScenario(
                scenario_id="select-area",
                title="Select or redraw the area",
                summary="Draw around registered field markers or switch to all fields to generate crop-health guidance.",
                action="SELECT_AREA",
                impact={"confidence": "none"},
            )
        ]

    stressed = [
        field.field_id
        for field in field_summaries
        if field.priority in {"medium", "high", "critical"}
    ]
    unavailable = [field.field_id for field in field_summaries if not field.data_available]
    scenarios = [
        FarmerCropHealthAreaScenario(
            scenario_id="inspect-stress",
            title="Inspect stressed patches",
            summary="Walk the fields with medium or higher stress and compare satellite signal with visible symptoms.",
            action="FIELD_INSPECTION",
            field_ids=stressed,
            impact={
                "target_fields": len(stressed),
                "average_stress_index": kpis.average_stress_index,
            },
        ),
        FarmerCropHealthAreaScenario(
            scenario_id="irrigation-check",
            title="Check irrigation response",
            summary="Use stress penalty and severe-stress ratio to prioritize irrigation verification.",
            action="CHECK_IRRIGATION",
            field_ids=decision.field_ids or stressed,
            impact={
                "average_penalty_factor": kpis.average_stress_penalty_factor,
                "severe_stress_ratio": kpis.average_severe_stress_ratio,
            },
        ),
        FarmerCropHealthAreaScenario(
            scenario_id="observe-and-log",
            title="Log farmer observations",
            summary="Add disease, pest, water-stress, or healthy notes in each field workspace to improve the field record.",
            action="ADD_OBSERVATIONS",
            field_ids=[field.field_id for field in field_summaries],
            impact={"workspace_links": True},
        ),
    ]
    if unavailable:
        scenarios.append(
            FarmerCropHealthAreaScenario(
                scenario_id="run-analysis",
                title="Refresh satellite analysis",
                summary="Some fields are missing live stress summaries; refresh analysis before making an area-wide call.",
                action="RUN_ANALYSIS",
                field_ids=unavailable,
                impact={"missing_fields": len(unavailable)},
            )
        )
    return scenarios


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/area-summary", response_model=FarmerAreaSummary)
async def get_farmer_irrigation_area_summary(
    payload: FarmerAreaSummaryRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerAreaSummary:
    """Farmer-facing irrigation snapshot for a temporary selected area.

    The v1 area is analysis-only: the optional GeoJSON polygon is echoed
    back for client context, but not persisted. Field inclusion is based on
    registered field centroids (`latitude`/`longitude`) and existing field
    access rules.
    """
    async with session_scope() as session:
        rows = await list_crop_fields(session)
        selected_fields = _select_area_fields(
            payload=payload,
            rows=rows,
            user_context=user_context,
        )

        latest_by_id: Dict[str, Optional[Dict[str, Any]]] = {}
        valve_by_id: Dict[str, Dict[str, Any]] = {}
        pairings_by_id: Dict[str, List[Dict[str, Any]]] = {}
        manual_by_id: Dict[str, List[Dict[str, Any]]] = {}
        policy_by_scheme: Dict[str, Optional[Dict[str, Any]]] = {}
        quota_by_policy: Dict[str, Optional[float]] = {}

        for field in selected_fields:
            field_id = str(field["field_id"])
            latest_by_id[field_id] = await get_latest_sensor_reading(session, field_id)
            valve_by_id[field_id] = await get_valve_state(session, field_id)
            pairings_by_id[field_id] = await list_pairing_sessions_for_field(
                session, field_id=field_id, limit=50
            )
            manual_by_id[field_id] = await list_manual_requests(
                session, field_id=field_id, limit=10
            )

            scheme_id = field.get("scheme_id")
            if scheme_id and scheme_id not in policy_by_scheme:
                policy_by_scheme[str(scheme_id)] = await get_active_authority_policy(
                    session, scheme_id=str(scheme_id)
                )
            policy = policy_by_scheme.get(str(scheme_id)) if scheme_id else None
            policy_key = str(policy.get("policy_id") or scheme_id or field_id) if policy else ""
            if policy and policy_key not in quota_by_policy:
                quota_by_policy[policy_key] = await _policy_quota_remaining_mcm(
                    session, policy
                )

    total_area = round(
        sum(float(field.get("area_hectares") or 0.0) for field in selected_fields),
        3,
    )
    selection = FarmerAreaSelection(
        mode=payload.mode,
        field_count=len(selected_fields),
        field_ids=[str(field["field_id"]) for field in selected_fields],
        total_hectares=total_area,
        boundary=_boundary_metadata(payload.boundary),
    )

    if not selected_fields:
        empty_contract = build_contract(
            observed_at=None,
            source="aggregate",
            data_available=False,
            message="No fields selected for irrigation analysis",
        )
        model_evidence = _build_area_model_evidence([])
        decision = _build_area_decision([], FarmerAreaKpis())
        return FarmerAreaSummary(
            selection=selection,
            kpis=FarmerAreaKpis(),
            fields=[],
            model_evidence=model_evidence,
            area_decision=decision,
            scenarios=_build_area_scenarios(decision, FarmerAreaKpis(), []),
            **empty_contract,
        )

    lat, lon = _representative_coordinates(selected_fields, payload.boundary)
    forecast_payload = await _fetch_weekly_outlook(lat=lat, lon=lon)
    week_plan_section, week_contract = _build_week_plan(
        forecast_payload if isinstance(forecast_payload, dict) else None
    )
    _ = week_plan_section  # week plan feeds contracts + ML inputs for the area endpoint

    paired_device_ids: List[str] = []
    for field in selected_fields:
        field_id = str(field["field_id"])
        for pairing in pairings_by_id.get(field_id, []):
            device_id = pairing.get("device_id")
            if device_id and str(device_id) not in paired_device_ids:
                paired_device_ids.append(str(device_id))
        primary_device_id = field.get("device_id")
        if primary_device_id and str(primary_device_id) not in paired_device_ids:
            paired_device_ids.append(str(primary_device_id))
    iot_devices = await _fetch_iot_devices_for_field(paired_device_ids)

    field_summaries: List[FarmerAreaFieldSummary] = []
    readings_contracts: List[Dict[str, Any]] = []
    auto_contracts: List[Dict[str, Any]] = []
    device_contracts: List[Dict[str, Any]] = []
    ml_fields: List[FarmerAreaMLFieldEvidence] = []
    soil_values: List[Optional[float]] = []
    water_values: List[Optional[float]] = []
    live_fields = 0
    stale_fields = 0
    no_telemetry_fields = 0
    open_valves = 0
    critical_fields = 0
    pending_manual_requests = 0
    total_devices = 0
    online_devices = 0

    for field in selected_fields:
        field_id = str(field["field_id"])
        latest = latest_by_id.get(field_id)
        valve = valve_by_id.get(field_id) or {
            "status": "CLOSED",
            "position_pct": 0,
            "last_action_time": None,
        }
        readings, readings_contract = _build_readings_section(field, latest, valve)
        readings_contracts.append(readings_contract)

        policy = None
        quota_remaining = None
        scheme_id = field.get("scheme_id")
        if scheme_id:
            policy = policy_by_scheme.get(str(scheme_id))
            policy_key = str(policy.get("policy_id") or scheme_id or field_id) if policy else ""
            quota_remaining = quota_by_policy.get(policy_key)

        decision: Optional[Dict[str, Any]] = None
        auto_message: Optional[str] = None
        if latest:
            try:
                decision = await _compute_auto_decision(
                    field,
                    latest,
                    valve,
                    policy,
                    quota_remaining_mcm=quota_remaining,
                    forecast_payload=forecast_payload if isinstance(forecast_payload, dict) else None,
                )
            except Exception as exc:
                logger.warning("Area auto-decision compute failed for %s: %s", field_id, exc)
                auto_message = "Auto decision computation failed"
        else:
            auto_message = "Telemetry required for auto decision"

        auto_section = _build_auto_decision_section(
            decision, unavailable_reason=auto_message
        )
        auto_contracts.append(
            build_contract(
                observed_at=decision.get("timestamp") if decision else None,
                source="model" if decision else "iot_sensors",
                data_available=bool(decision),
                message=auto_message,
            )
        )

        devices_section, devices_contract = _build_device_list(
            pairings_by_id.get(field_id, []),
            iot_devices,
            field.get("device_id"),
        )
        device_contracts.append(devices_contract)
        manual_state = _build_pending_manual_requests(manual_by_id.get(field_id, []))
        pending = manual_state.latest_pending

        if readings.soil_moisture_pct is not None:
            soil_values.append(readings.soil_moisture_pct)
        if readings.water_level_pct is not None:
            water_values.append(readings.water_level_pct)
        if readings.is_live:
            live_fields += 1
        elif readings.status == "stale":
            stale_fields += 1
        if not readings.data_available:
            no_telemetry_fields += 1
        if str(readings.valve_status or "").upper() == "OPEN":
            open_valves += 1
        if readings.overall_status == "CRITICAL" or auto_section.priority == "critical":
            critical_fields += 1
        if pending:
            pending_manual_requests += 1

        total_devices += devices_section.count
        online_devices += devices_section.online_count

        ml_fields.append(_build_ml_field_evidence(field, latest, forecast_payload if isinstance(forecast_payload, dict) else None))
        field_summaries.append(
            FarmerAreaFieldSummary(
                field_id=field_id,
                field_name=str(field.get("field_name") or field_id),
                crop_type=str(field.get("crop_type") or "unknown"),
                area_hectares=float(field.get("area_hectares") or 0.0),
                latitude=field.get("latitude"),
                longitude=field.get("longitude"),
                soil_moisture_pct=readings.soil_moisture_pct,
                water_level_pct=readings.water_level_pct,
                overall_status=readings.overall_status,
                reading_status=readings.status,
                valve_status=readings.valve_status,
                valve_position_pct=readings.valve_position_pct,
                auto_action=auto_section.action,
                auto_priority=auto_section.priority,
                auto_blocked=auto_section.blocked,
                auto_reason=auto_section.reason or auto_section.message,
                pending_manual_request_id=pending.request_id if pending else None,
                devices_count=devices_section.count,
                online_devices=devices_section.online_count,
                message=readings.message,
            )
        )

    kpis = FarmerAreaKpis(
        average_soil_moisture_pct=_average(soil_values),
        average_water_level_pct=_average(water_values),
        live_fields=live_fields,
        stale_fields=stale_fields,
        no_telemetry_fields=no_telemetry_fields,
        open_valves=open_valves,
        critical_fields=critical_fields,
        pending_manual_requests=pending_manual_requests,
        online_devices=online_devices,
        total_devices=total_devices,
    )
    model_evidence = _build_area_model_evidence(ml_fields)
    decision = _build_area_decision(field_summaries, kpis)
    ml_contract = build_contract(
        observed_at=None,
        source="model",
        data_available=model_evidence.available,
        message=model_evidence.message,
    )
    merged = merge_contracts(
        readings_contracts + auto_contracts + device_contracts + [week_contract, ml_contract]
    )

    return FarmerAreaSummary(
        selection=selection,
        kpis=kpis,
        fields=field_summaries,
        model_evidence=model_evidence,
        area_decision=decision,
        scenarios=_build_area_scenarios(decision, kpis, field_summaries),
        **merged,
    )


@router.post("/forecast-area-summary", response_model=FarmerForecastAreaSummary)
async def get_farmer_forecast_area_summary(
    payload: FarmerAreaSummaryRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerForecastAreaSummary:
    """Farmer-facing forecast snapshot for a temporary selected area.

    The same analysis-only area contract used by irrigation is reused here:
    the optional boundary is echoed for UI context, selected fields are
    farmer-scoped, and field inclusion is based on registered centroids.
    """
    async with session_scope() as session:
        rows = await list_crop_fields(session)
        selected_fields = _select_area_fields(
            payload=payload,
            rows=rows,
            user_context=user_context,
        )

        latest_by_id: Dict[str, Optional[Dict[str, Any]]] = {}
        valve_by_id: Dict[str, Dict[str, Any]] = {}
        for field in selected_fields:
            field_id = str(field["field_id"])
            latest_by_id[field_id] = await get_latest_sensor_reading(session, field_id)
            valve_by_id[field_id] = await get_valve_state(session, field_id)

    total_area = round(
        sum(float(field.get("area_hectares") or 0.0) for field in selected_fields),
        3,
    )
    selection = FarmerAreaSelection(
        mode=payload.mode,
        field_count=len(selected_fields),
        field_ids=[str(field["field_id"]) for field in selected_fields],
        total_hectares=total_area,
        boundary=_boundary_metadata(payload.boundary),
    )

    if not selected_fields:
        empty_contract = build_contract(
            observed_at=None,
            source="forecasting_service",
            data_available=False,
            message="No fields selected for forecast analysis",
        )
        weather = FarmerWeatherForecast(
            available=False,
            message="No fields selected for forecast analysis",
        )
        model_summary = FarmerForecastModelSummary(
            available=False,
            message="No fields selected for forecast analysis",
        )
        kpis = FarmerForecastAreaKpis()
        decision = _build_forecast_area_decision(
            [],
            kpis,
            [],
            forecast_available=False,
        )
        return FarmerForecastAreaSummary(
            selection=selection,
            kpis=kpis,
            weather=weather,
            week_plan=FarmerWeekPlan(
                available=False,
                message="No fields selected for forecast analysis",
            ),
            model_summary=model_summary,
            daily=[],
            fields=[],
            forecast_decision=decision,
            scenarios=_build_forecast_area_scenarios(decision, kpis, [], []),
            **empty_contract,
        )

    lat, lon = _representative_coordinates(selected_fields, payload.boundary)
    weather_task = _fetch_weather_forecast(lat=lat, lon=lon, days=14)
    week_plan_task = _fetch_weekly_outlook(lat=lat, lon=lon)
    model_task = _fetch_forecast_model_summary()
    weather_payload, week_payload, model_payload = await asyncio.gather(
        weather_task,
        week_plan_task,
        model_task,
        return_exceptions=False,
    )

    weather_section, weather_contract = _build_weather_forecast(
        weather_payload if isinstance(weather_payload, dict) else None
    )
    week_plan_section, week_contract = _build_week_plan(
        week_payload if isinstance(week_payload, dict) else None
    )
    model_section, model_contract = _build_model_summary(
        model_payload if isinstance(model_payload, dict) else None
    )

    field_summaries: List[FarmerForecastAreaFieldSummary] = []
    readings_contracts: List[Dict[str, Any]] = []
    for field in selected_fields:
        field_id = str(field["field_id"])
        latest = latest_by_id.get(field_id)
        valve = valve_by_id.get(field_id) or {
            "status": "CLOSED",
            "position_pct": 0,
            "last_action_time": None,
        }
        readings, readings_contract = _build_readings_section(field, latest, valve)
        readings_contracts.append(readings_contract)
        field_summaries.append(
            FarmerForecastAreaFieldSummary(
                field_id=field_id,
                field_name=str(field.get("field_name") or field_id),
                crop_type=str(field.get("crop_type") or "unknown"),
                area_hectares=float(field.get("area_hectares") or 0.0),
                latitude=field.get("latitude"),
                longitude=field.get("longitude"),
                soil_moisture_pct=readings.soil_moisture_pct,
                water_level_pct=readings.water_level_pct,
                overall_status=readings.overall_status,
                reading_status=readings.status,
                observed_at=readings.observed_at,
                message=readings.message,
            )
        )

    daily = _build_forecast_area_daily(weather_section, week_plan_section)
    kpis = _build_forecast_area_kpis(
        field_summaries,
        weather_section,
        week_plan_section,
        daily,
    )
    decision = _build_forecast_area_decision(
        field_summaries,
        kpis,
        daily,
        forecast_available=weather_section.available or bool(week_plan_section and week_plan_section.available),
    )
    merged = merge_contracts(
        readings_contracts + [weather_contract, week_contract, model_contract]
    )

    return FarmerForecastAreaSummary(
        selection=selection,
        kpis=kpis,
        weather=weather_section,
        week_plan=week_plan_section,
        model_summary=model_section,
        daily=daily,
        fields=field_summaries,
        forecast_decision=decision,
        scenarios=_build_forecast_area_scenarios(decision, kpis, field_summaries, daily),
        **merged,
    )


@router.post("/crop-health-area-summary", response_model=FarmerCropHealthAreaSummary)
async def get_farmer_crop_health_area_summary(
    payload: FarmerAreaSummaryRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerCropHealthAreaSummary:
    """Farmer-facing crop-health snapshot for a temporary selected area."""
    async with session_scope() as session:
        rows = await list_crop_fields(session)
        selected_fields = _select_area_fields(
            payload=payload,
            rows=rows,
            user_context=user_context,
        )

    total_area = round(
        sum(float(field.get("area_hectares") or 0.0) for field in selected_fields),
        3,
    )
    selection = FarmerAreaSelection(
        mode=payload.mode,
        field_count=len(selected_fields),
        field_ids=[str(field["field_id"]) for field in selected_fields],
        total_hectares=total_area,
        boundary=_boundary_metadata(payload.boundary),
    )

    if not selected_fields:
        empty_contract = build_contract(
            observed_at=None,
            source="crop_health_service",
            data_available=False,
            message="No fields selected for crop health analysis",
        )
        kpis = FarmerCropHealthAreaKpis()
        decision = _build_crop_health_area_decision([], kpis)
        return FarmerCropHealthAreaSummary(
            selection=selection,
            kpis=kpis,
            fields=[],
            area_decision=decision,
            scenarios=_build_crop_health_area_scenarios(decision, kpis, []),
            zones_geojson=None,
            **empty_contract,
        )

    stress_tasks = [
        _fetch_crop_health_stress_summary(
            str(field["field_id"]),
            lat=_as_float(field.get("latitude")),
            lon=_as_float(field.get("longitude")),
            area_km2=_field_area_km2(field),
        )
        for field in selected_fields
    ]
    lat, lon = _representative_coordinates(selected_fields, payload.boundary)
    zones_task = _fetch_crop_health_zones(
        lat=lat,
        lon=lon,
        area_km2=_area_km2(selected_fields),
    )
    results = await asyncio.gather(*stress_tasks, zones_task, return_exceptions=False)
    stress_payloads = results[:-1]
    zones_geojson = results[-1] if isinstance(results[-1], dict) else None

    field_summaries: List[FarmerCropHealthAreaFieldSummary] = []
    contracts: List[Dict[str, Any]] = []
    for field, stress_payload in zip(selected_fields, stress_payloads):
        summary, contract = _build_crop_health_field_summary(
            field,
            stress_payload if isinstance(stress_payload, dict) else None,
        )
        field_summaries.append(summary)
        contracts.append(contract)

    zones_contract = build_contract(
        observed_at=None,
        source="crop_health_service",
        data_available=bool(zones_geojson and zones_geojson.get("features")),
        message=None if zones_geojson else "Crop-health zone overlay unavailable",
    )
    kpis = _build_crop_health_area_kpis(field_summaries)
    decision = _build_crop_health_area_decision(field_summaries, kpis)
    merged = merge_contracts(contracts + [zones_contract])

    return FarmerCropHealthAreaSummary(
        selection=selection,
        kpis=kpis,
        fields=field_summaries,
        area_decision=decision,
        scenarios=_build_crop_health_area_scenarios(decision, kpis, field_summaries),
        zones_geojson=zones_geojson,
        **merged,
    )


@router.get("/fields/{field_id}/summary", response_model=FarmerIrrigationSummary)
async def get_farmer_irrigation_summary(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerIrrigationSummary:
    """One-shot farmer-facing irrigation snapshot for the field-detail page.

    Composes:
      • field meta + thresholds (db)
      • current readings + valve state (db)
      • ML auto decision (reuses farm_ops._compute_auto_decision)
      • 7-day water plan (forecasting_service, degrades gracefully)
      • paired devices joined with iot_service liveness
      • latest pending manual request (db)

    Upstream calls (forecasting + iot) fan out concurrently with
    `asyncio.gather` and are wrapped in their own try/except, so a slow
    or missing upstream degrades the relevant section without failing
    the request.
    """
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        latest = await get_latest_sensor_reading(session, field_id)
        valve = await get_valve_state(session, field_id)
        pairings = await list_pairing_sessions_for_field(
            session, field_id=field_id, limit=50
        )
        manual_rows = await list_manual_requests(
            session, field_id=field_id, limit=10
        )

        policy: Optional[Dict[str, Any]] = None
        if field.get("scheme_id"):
            policy = await get_active_authority_policy(
                session, scheme_id=field["scheme_id"]
            )
        quota_remaining = await _policy_quota_remaining_mcm(session, policy)

    # ----- Concurrent upstream fan-out (forecasting + iot) -----
    paired_device_ids = [
        str(p.get("device_id"))
        for p in pairings
        if p.get("device_id")
    ]
    primary_device_id = field.get("device_id")
    if primary_device_id and primary_device_id not in paired_device_ids:
        paired_device_ids.append(primary_device_id)

    forecast_task = _fetch_weekly_outlook(
        lat=field.get("latitude"),
        lon=field.get("longitude"),
    )
    devices_task = _fetch_iot_devices_for_field(paired_device_ids)
    forecast_payload, iot_devices = await asyncio.gather(
        forecast_task, devices_task, return_exceptions=False
    )

    # ----- Compose sections -----
    readings, readings_contract = _build_readings_section(field, latest, valve)

    decision: Optional[Dict[str, Any]] = None
    auto_message: Optional[str] = None
    if latest:
        try:
            decision = await _compute_auto_decision(
                field,
                latest,
                valve,
                policy,
                quota_remaining_mcm=quota_remaining,
                forecast_payload=forecast_payload,
            )
        except Exception as exc:
            logger.warning("Auto-decision compute failed for %s: %s", field_id, exc)
            auto_message = "Auto decision computation failed"
    else:
        auto_message = "Telemetry required for auto decision"

    auto_decision_section = _build_auto_decision_section(
        decision, unavailable_reason=auto_message
    )
    auto_contract = build_contract(
        observed_at=decision.get("timestamp") if decision else None,
        source="model" if decision else "iot_sensors",
        data_available=bool(decision),
        message=auto_message,
    )

    week_plan_section, week_contract = _build_week_plan(
        forecast_payload if isinstance(forecast_payload, dict) else None
    )

    devices_section, devices_contract = _build_device_list(
        pairings, iot_devices, primary_device_id
    )

    manual_state = _build_pending_manual_requests(manual_rows)

    # Top-level merged contract (worst-status wins)
    merged = merge_contracts(
        [
            readings_contract,
            auto_contract,
            week_contract,
            devices_contract,
        ]
    )

    return FarmerIrrigationSummary(
        field=_build_field_meta(field),
        readings=readings,
        auto_decision=auto_decision_section,
        week_plan=week_plan_section,
        devices=devices_section,
        manual_requests=manual_state,
        **merged,
    )


@router.get("/fields/{field_id}/forecast-summary", response_model=FarmerForecastSummary)
async def get_farmer_forecast_summary(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerForecastSummary:
    """Farmer-facing forecast snapshot for the field-detail Forecast tab.

    Weather and water-balance calls are scoped with the field's lat/lon. The
    model summary intentionally reports F3 model readiness/metrics without
    exposing protected training/admin prediction controls.
    """
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        latest = await get_latest_sensor_reading(session, field_id)
        valve = await get_valve_state(session, field_id)

    lat = field.get("latitude")
    lon = field.get("longitude")
    weather_task = _fetch_weather_forecast(lat=lat, lon=lon, days=14)
    week_plan_task = _fetch_weekly_outlook(lat=lat, lon=lon)
    model_task = _fetch_forecast_model_summary()
    weather_payload, week_payload, model_payload = await asyncio.gather(
        weather_task,
        week_plan_task,
        model_task,
        return_exceptions=False,
    )

    readings, readings_contract = _build_readings_section(field, latest, valve)
    weather_section, weather_contract = _build_weather_forecast(
        weather_payload if isinstance(weather_payload, dict) else None
    )
    week_plan_section, week_contract = _build_week_plan(
        week_payload if isinstance(week_payload, dict) else None
    )
    model_section, model_contract = _build_model_summary(
        model_payload if isinstance(model_payload, dict) else None
    )

    merged = merge_contracts(
        [
            readings_contract,
            weather_contract,
            week_contract,
            model_contract,
        ]
    )

    return FarmerForecastSummary(
        field=_build_field_meta(field),
        readings=readings,
        weather=weather_section,
        week_plan=week_plan_section,
        model_summary=model_section,
        **merged,
    )


@router.get("/fields/{field_id}/history")
async def get_farmer_irrigation_history(
    field_id: str,
    limit: int = Query(24, ge=1, le=200),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Trimmed sensor history for the panel's KPI sparklines.

    Thin wrapper over `get_sensor_history`; kept on the farmer prefix so
    the panel only needs one URL convention. Defaults to 24 readings
    (oldest → newest is reversed by the caller as needed).
    """
    from app.db.repository import get_sensor_history  # local import keeps top tidy

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)
        history = await get_sensor_history(session, field_id, limit=limit)

    return {"field_id": field_id, "count": len(history), "readings": history}

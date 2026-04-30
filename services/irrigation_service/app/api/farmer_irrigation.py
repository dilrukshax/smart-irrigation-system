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
from typing import Any, Dict, List, Optional

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
from app.core.contracts import build_contract, merge_contracts
from app.db.repository import (
    get_active_authority_policy,
    get_crop_field,
    get_latest_sensor_reading,
    get_valve_state,
    list_manual_requests,
    list_pairing_sessions_for_field,
)
from app.db.session import session_scope
from app.dependencies.auth import get_current_user_context

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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


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

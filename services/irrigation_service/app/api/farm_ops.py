"""
Farmer-first irrigation domain APIs.

This module implements grouped routes introduced by the redesign:
- /api/v1/farm/*
- /api/v1/devices/* (pairing)
- /api/v1/telemetry/*
- /api/v1/irrigation/*
- /api/v1/authority/*
"""

from __future__ import annotations

import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.contracts import (
    STALE_TIMEOUT_SECONDS as _STALE_TIMEOUT_SECONDS,
    build_contract as _build_contract,
    merge_contracts as _merge_contracts,
    now_utc as _now_utc,
    parse_dt as _parse_dt,
)
from app.db.repository import (
    add_sensor_reading,
    confirm_pairing_session,
    close_manual_request,
    create_authority_policy,
    create_field_observation,
    create_hydraulic_schedule,
    create_manual_request,
    create_pairing_session,
    delete_crop_field,
    delete_field_observation,
    estimate_accepted_schedule_volume_mcm,
    find_conflicting_hydraulic_schedule,
    get_active_authority_policy,
    get_authority_policy,
    get_authority_policy_audit,
    get_confirmed_pairing_by_device,
    get_crop_field,
    get_crop_field_by_device,
    get_field_observation,
    get_hydraulic_topology_node,
    get_hydraulic_schedule,
    get_latest_authority_policy_for_scheme,
    get_latest_reservoir_snapshot,
    get_latest_sensor_reading,
    get_manual_request,
    get_manual_request_audit,
    get_pairing_session,
    get_pending_pairing_by_device,
    get_sensor_history,
    get_valve_state,
    list_authority_policies,
    list_crop_fields,
    list_field_observations,
    list_pairing_sessions_for_field,
    list_hydraulic_schedules,
    list_hydraulic_topology_nodes,
    list_manual_requests,
    mark_manual_request_executed,
    publish_authority_policy,
    purge_sensor_history,
    review_manual_request,
    set_pairing_first_telemetry,
    update_crop_field_partial,
    update_field_observation,
    upsert_hydraulic_topology_node,
    upsert_crop_field,
    upsert_valve_state,
)
from app.db.session import session_scope
from app.dependencies.auth import get_current_user_context

router = APIRouter(prefix="/api/v1", tags=["Farmer Operations"])
logger = logging.getLogger(__name__)

STALE_TIMEOUT_SECONDS = _STALE_TIMEOUT_SECONDS

CROP_DEFAULTS: Dict[str, Dict[str, float | int]] = {
    "rice": {
        "water_level_min_pct": 50,
        "water_level_max_pct": 80,
        "water_level_optimal_pct": 65,
        "water_level_critical_pct": 30,
        "soil_moisture_min_pct": 70,
        "soil_moisture_max_pct": 95,
        "soil_moisture_optimal_pct": 85,
        "soil_moisture_critical_pct": 50,
        "irrigation_duration_minutes": 30,
    },
    "wheat": {
        "water_level_min_pct": 20,
        "water_level_max_pct": 50,
        "water_level_optimal_pct": 35,
        "water_level_critical_pct": 10,
        "soil_moisture_min_pct": 40,
        "soil_moisture_max_pct": 70,
        "soil_moisture_optimal_pct": 55,
        "soil_moisture_critical_pct": 25,
        "irrigation_duration_minutes": 20,
    },
    "vegetables": {
        "water_level_min_pct": 25,
        "water_level_max_pct": 55,
        "water_level_optimal_pct": 40,
        "water_level_critical_pct": 15,
        "soil_moisture_min_pct": 50,
        "soil_moisture_max_pct": 80,
        "soil_moisture_optimal_pct": 65,
        "soil_moisture_critical_pct": 35,
        "irrigation_duration_minutes": 15,
    },
    "sugarcane": {
        "water_level_min_pct": 40,
        "water_level_max_pct": 70,
        "water_level_optimal_pct": 55,
        "water_level_critical_pct": 25,
        "soil_moisture_min_pct": 60,
        "soil_moisture_max_pct": 90,
        "soil_moisture_optimal_pct": 75,
        "soil_moisture_critical_pct": 40,
        "irrigation_duration_minutes": 45,
    },
    # Crop-agnostic defaults used when field is first created.
    "unassigned": {
        "water_level_min_pct": 35,
        "water_level_max_pct": 65,
        "water_level_optimal_pct": 50,
        "water_level_critical_pct": 20,
        "soil_moisture_min_pct": 55,
        "soil_moisture_max_pct": 85,
        "soil_moisture_optimal_pct": 70,
        "soil_moisture_critical_pct": 35,
        "irrigation_duration_minutes": 20,
    },
}


class DataContract(BaseModel):
    status: str = "ok"
    source: str = "iot_sensors"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmFieldCreate(BaseModel):
    field_id: Optional[str] = None
    field_name: str
    crop_type: Optional[str] = None
    soil_type: Optional[str] = None
    area_hectares: float = Field(..., gt=0)
    scheme_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    owner_id: Optional[str] = None
    auto_control_enabled: bool = True


class FarmFieldUpdate(BaseModel):
    field_name: Optional[str] = None
    crop_type: Optional[str] = None
    soil_type: Optional[str] = None
    area_hectares: Optional[float] = Field(None, gt=0)
    device_id: Optional[str] = None
    scheme_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    water_level_min_pct: Optional[float] = Field(None, ge=0, le=100)
    water_level_max_pct: Optional[float] = Field(None, ge=0, le=100)
    water_level_optimal_pct: Optional[float] = Field(None, ge=0, le=100)
    water_level_critical_pct: Optional[float] = Field(None, ge=0, le=100)
    soil_moisture_min_pct: Optional[float] = Field(None, ge=0, le=100)
    soil_moisture_max_pct: Optional[float] = Field(None, ge=0, le=100)
    soil_moisture_optimal_pct: Optional[float] = Field(None, ge=0, le=100)
    soil_moisture_critical_pct: Optional[float] = Field(None, ge=0, le=100)
    irrigation_duration_minutes: Optional[int] = Field(None, ge=1, le=720)
    auto_control_enabled: Optional[bool] = None
    suspended_reason: Optional[str] = None
    lifecycle_state: Optional[str] = None


class PairingInitiateRequest(BaseModel):
    field_id: str
    device_id: str


class PairingConfirmRequest(BaseModel):
    confirm: bool = True


class TelemetryIngestRequest(BaseModel):
    field_id: Optional[str] = None
    device_id: str
    timestamp: Optional[str] = None
    soil_moisture_pct: float = Field(..., ge=0, le=100)
    water_level_pct: float = Field(..., ge=0, le=100)
    soil_ao: Optional[int] = Field(None, ge=0, le=4095)
    water_ao: Optional[int] = Field(None, ge=0, le=4095)
    rssi: Optional[int] = None
    battery_v: Optional[float] = None


class IrrigationCommandRequest(BaseModel):
    action: str = Field(..., pattern="^(OPEN|CLOSE|AUTO)$")
    position_pct: int = Field(100, ge=0, le=100)
    reason: str = "Manual command"


class ManualRequestCreate(BaseModel):
    requested_action: str = Field(..., pattern="^(OPEN|CLOSE)$")
    requested_position_pct: int = Field(100, ge=0, le=100)
    reason: str


class ManualRequestReview(BaseModel):
    decision: str = Field(..., pattern="^(APPROVE|REJECT)$")
    note: Optional[str] = None


class ManualRequestClose(BaseModel):
    note: Optional[str] = None


class NetworkScheduleCreate(BaseModel):
    scheme_id: str
    canal_id: Optional[str] = None
    tunnel_id: Optional[str] = None
    channel_id: Optional[str] = None
    turnout_id: Optional[str] = None
    action: str = Field(..., pattern="^(OPEN|HOLD|CLOSE|PARTIAL)$")
    expected_flow_m3s: Optional[float] = None
    start_time: str
    end_time: str
    reason: Optional[str] = None


class AuthorityPolicyCreate(BaseModel):
    scheme_id: str
    quota_mcm: float = Field(..., gt=0)
    max_field_open_pct: int = Field(100, ge=0, le=100)
    emergency_mode: Optional[str] = None
    constraints: Optional[Dict[str, Any]] = None


class CropConfirmRequest(BaseModel):
    crop_type: str
    source: Optional[str] = None
    recommendation_id: Optional[str] = None
    expected_profit_per_ha: Optional[float] = None


def _extract_manual_policy_context(item: Dict[str, Any]) -> Dict[str, Any]:
    source = item.get("source_decision")
    source_dict = source if isinstance(source, dict) else {}
    blocked_reason = source_dict.get("blocked_reason") or source_dict.get("manual_request_reason") or item.get("reason")
    return {
        "policy_id": source_dict.get("policy_id"),
        "policy_version": source_dict.get("policy_version"),
        "blocked_reason": blocked_reason,
    }


def _max_iso_timestamp(values: List[Optional[str]]) -> Optional[str]:
    selected_raw: Optional[str] = None
    selected_dt: Optional[datetime] = None
    for value in values:
        if not value:
            continue
        parsed = _parse_dt(value)
        if parsed is None:
            continue
        if selected_dt is None or parsed > selected_dt:
            selected_dt = parsed
            selected_raw = value
    return selected_raw


def _normalized_roles(user_context: Dict[str, Any]) -> set[str]:
    mapping = {"admin": "authority", "user": "farmer"}
    raw_roles = user_context.get("roles") or []
    normalized: set[str] = set()
    for role in raw_roles:
        text = str(role).strip().lower()
        if not text:
            continue
        normalized.add(mapping.get(text, text))
    return normalized


def _require_roles(user_context: Dict[str, Any], allowed: set[str]) -> None:
    roles = _normalized_roles(user_context)
    if not roles.intersection(allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of roles: {', '.join(sorted(allowed))}",
        )


def _is_farmer(user_context: Dict[str, Any]) -> bool:
    return "farmer" in _normalized_roles(user_context)


def _is_officer_or_authority(user_context: Dict[str, Any]) -> bool:
    roles = _normalized_roles(user_context)
    return bool(roles.intersection({"officer", "authority"}))


def _normalized_scheme_ids(user_context: Dict[str, Any]) -> set[str]:
    raw = user_context.get("scheme_ids") or []
    if not isinstance(raw, list):
        return set()
    return {str(item).strip() for item in raw if str(item).strip()}


def _ensure_scoped_roles_have_schemes(user_context: Dict[str, Any]) -> set[str]:
    roles = _normalized_roles(user_context)
    if not roles.intersection({"officer", "authority"}):
        return set()

    schemes = _normalized_scheme_ids(user_context)
    if not schemes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No assigned schemes for scoped operation",
        )
    return schemes


def _assert_scheme_access(user_context: Dict[str, Any], scheme_id: Optional[str]) -> None:
    allowed_schemes = _ensure_scoped_roles_have_schemes(user_context)
    if not allowed_schemes:
        return
    if not scheme_id or scheme_id not in allowed_schemes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scheme access denied",
        )


def _resolve_effective_scheme(user_context: Dict[str, Any], requested_scheme_id: Optional[str]) -> str:
    allowed_schemes = _ensure_scoped_roles_have_schemes(user_context)
    if requested_scheme_id:
        requested = requested_scheme_id.strip()
        if requested not in allowed_schemes:
            raise HTTPException(status_code=403, detail="Scheme access denied")
        return requested
    return sorted(allowed_schemes)[0]


def _assert_field_access(user_context: Dict[str, Any], field: Dict[str, Any]) -> None:
    roles = _normalized_roles(user_context)
    if roles.intersection({"officer", "authority"}):
        allowed = _ensure_scoped_roles_have_schemes(user_context)
        field_scheme = str(field.get("scheme_id") or "").strip()
        if field_scheme and field_scheme in allowed:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Field access denied")
    if "farmer" in roles and field.get("owner_id") in {None, user_context.get("id")}:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Field access denied")


def _status_bucket(value: float, low: float, high: float, critical: float, labels: tuple[str, str, str, str, str]) -> str:
    crit, low_label, ok_label, high_label, excess = labels
    if value <= critical:
        return crit
    if value < low:
        return low_label
    if value <= high:
        return ok_label
    if value <= high + 15:
        return high_label
    return excess


async def _fetch_weekly_outlook(
    *, lat: Optional[float] = None, lon: Optional[float] = None
) -> Optional[Dict[str, Any]]:
    """Fetch the full forecasting `irrigation-recommendation` payload.

    Returns ``None`` when the upstream is unreachable or returns a non-2xx
    response so callers can degrade gracefully. ``lat``/``lon`` are passed
    through as query params; the forecasting service currently ignores them
    (zone-scoped) but accepting them today makes field-scoped forecasts a
    one-line follow-up there.
    """
    # TODO(field-scoped-forecast): wire forecasting_service to honor lat/lon.
    params: Dict[str, Any] = {}
    if lat is not None:
        params["lat"] = lat
    if lon is not None:
        params["lon"] = lon
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{settings.forecasting_service_url}/api/weather/irrigation-recommendation",
                params=params or None,
            )
        if resp.status_code >= 400:
            return None
        payload = resp.json()
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


async def _fetch_forecast_adjustment(
    *,
    forecast_payload: Optional[Dict[str, Any]] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> float:
    """Resolve the weekly irrigation adjustment percent.

    Accepts a pre-fetched ``forecast_payload`` so aggregator endpoints can
    fan out the upstream call once and reuse both the adjustment factor
    (for the auto-decision) and the daily schedule (for the panel UI)
    without double-billing forecasting_service.
    """
    payload = forecast_payload
    if payload is None:
        payload = await _fetch_weekly_outlook(lat=lat, lon=lon)
    if not isinstance(payload, dict):
        return 100.0
    weekly = payload.get("weekly_outlook") or {}
    try:
        return float(weekly.get("average_irrigation_adjustment_percent") or 100.0)
    except (TypeError, ValueError):
        return 100.0


async def _fetch_stress_penalty(field_id: str) -> float:
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"{settings.crop_health_service_url}/api/v1/crop-health/fields/{field_id}/stress-summary"
            )
        if resp.status_code >= 400:
            return 0.0
        payload = resp.json() or {}
        return float(payload.get("stress_penalty_factor") or 0.0)
    except Exception:
        return 0.0


async def _policy_quota_remaining_mcm(session: Any, policy: Optional[Dict[str, Any]]) -> Optional[float]:
    if not policy:
        return None
    scheme_id = policy.get("scheme_id")
    quota_mcm = policy.get("quota_mcm")
    if not scheme_id or quota_mcm is None:
        return None
    published_at = _parse_dt(policy.get("published_at"))
    used_mcm = await estimate_accepted_schedule_volume_mcm(
        session,
        scheme_id=str(scheme_id),
        from_time=published_at,
    )
    return float(quota_mcm) - float(used_mcm)


async def _validate_schedule_topology(
    session: Any,
    *,
    scheme_id: str,
    canal_id: Optional[str],
    tunnel_id: Optional[str],
    channel_id: Optional[str],
    turnout_id: Optional[str],
) -> None:
    expected_types = {
        "canal_id": "canal",
        "tunnel_id": "tunnel",
        "channel_id": "channel",
        "turnout_id": "turnout",
    }
    values = {
        "canal_id": canal_id,
        "tunnel_id": tunnel_id,
        "channel_id": channel_id,
        "turnout_id": turnout_id,
    }
    nodes: Dict[str, Dict[str, Any]] = {}

    for key, expected_type in expected_types.items():
        node_id = values.get(key)
        if not node_id:
            continue
        node = await get_hydraulic_topology_node(session, node_id)
        if not node:
            raise HTTPException(status_code=400, detail=f"Unknown topology node: {node_id}")
        if node.get("scheme_id") != scheme_id:
            raise HTTPException(status_code=400, detail=f"Topology node {node_id} does not belong to scheme {scheme_id}")
        if node.get("node_type") != expected_type:
            raise HTTPException(status_code=400, detail=f"Topology node {node_id} is not a {expected_type}")
        nodes[key] = node

    turnout = nodes.get("turnout_id")
    channel = nodes.get("channel_id")
    tunnel = nodes.get("tunnel_id")
    canal = nodes.get("canal_id")

    if turnout and channel and turnout.get("parent_node_id") != channel.get("node_id"):
        raise HTTPException(status_code=400, detail="Turnout is not linked to the selected channel")
    if channel and tunnel and channel.get("parent_node_id") != tunnel.get("node_id"):
        raise HTTPException(status_code=400, detail="Channel is not linked to the selected tunnel")
    if tunnel and canal and tunnel.get("parent_node_id") != canal.get("node_id"):
        raise HTTPException(status_code=400, detail="Tunnel is not linked to the selected canal")


def _schedule_volume_mcm(expected_flow_m3s: Optional[float], start_dt: datetime, end_dt: datetime) -> float:
    if expected_flow_m3s is None:
        return 0.0
    duration_sec = max(0.0, (end_dt - start_dt).total_seconds())
    return float(expected_flow_m3s) * duration_sec / 1_000_000.0


def _validate_schedule_against_policy(
    *,
    policy: Optional[Dict[str, Any]],
    action: str,
    expected_flow_m3s: Optional[float],
    start_dt: datetime,
    end_dt: datetime,
    existing_scheduled_mcm: float,
) -> Optional[str]:
    if not policy:
        return None

    emergency_mode = str(policy.get("emergency_mode") or "").lower()
    if action in {"OPEN", "PARTIAL"} and emergency_mode in {"drought", "maintenance"}:
        return f"Policy emergency mode '{emergency_mode}' blocks schedule action"

    max_open = int(policy.get("max_field_open_pct") or 100)
    if action == "OPEN" and max_open <= 0:
        return "Policy max field open percent is 0%"

    constraints = policy.get("constraints") or {}
    max_flow = constraints.get("max_schedule_flow_m3s")
    if max_flow is not None and expected_flow_m3s is not None and float(expected_flow_m3s) > float(max_flow):
        return f"Expected flow exceeds policy max_schedule_flow_m3s ({max_flow})"

    max_duration_min = constraints.get("max_schedule_duration_min")
    if max_duration_min is not None:
        duration_min = (end_dt - start_dt).total_seconds() / 60.0
        if duration_min > float(max_duration_min):
            return f"Schedule duration exceeds policy max_schedule_duration_min ({max_duration_min})"

    quota_mcm = policy.get("quota_mcm")
    if quota_mcm is not None:
        projected = existing_scheduled_mcm + _schedule_volume_mcm(expected_flow_m3s, start_dt, end_dt)
        if projected > float(quota_mcm):
            return f"Schedule exceeds policy quota {quota_mcm} mcm"

    return None


async def _compute_auto_decision(
    field: Dict[str, Any],
    reading: Dict[str, Any],
    valve_state: Dict[str, Any],
    policy: Optional[Dict[str, Any]],
    *,
    quota_remaining_mcm: Optional[float] = None,
    forecast_payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    water_level = float(reading["water_level_pct"])
    soil_moisture = float(reading["soil_moisture_pct"])

    forecast_adj = await _fetch_forecast_adjustment(
        forecast_payload=forecast_payload,
        lat=field.get("latitude"),
        lon=field.get("longitude"),
    )
    stress_penalty = await _fetch_stress_penalty(field["field_id"])

    effective_water_min = max(0.0, min(100.0, float(field["water_level_min_pct"]) * (forecast_adj / 100.0)))
    effective_soil_min = max(0.0, min(100.0, float(field["soil_moisture_min_pct"]) * (1.0 + stress_penalty)))

    action = "HOLD"
    valve_position = int(valve_state.get("position_pct") or 0)
    priority = "low"
    reason = "Within acceptable thresholds"

    if water_level <= float(field["water_level_critical_pct"]):
        action = "OPEN"
        valve_position = 100
        priority = "critical"
        reason = "Critical water level"
    elif water_level < effective_water_min or soil_moisture < effective_soil_min:
        action = "OPEN"
        deficit = max(effective_water_min - water_level, effective_soil_min - soil_moisture)
        valve_position = min(100, max(35, int(30 + deficit * 2)))
        priority = "high"
        reason = "Water or soil moisture below adaptive minimum"
    elif water_level >= float(field["water_level_max_pct"]) or soil_moisture >= float(field["soil_moisture_max_pct"]):
        action = "CLOSE"
        valve_position = 0
        priority = "medium"
        reason = "Upper threshold reached"

    blocked = False
    blocked_reason = None
    policy_id = policy.get("policy_id") if policy else None
    policy_version = policy.get("version") if policy else None
    quota_remaining = quota_remaining_mcm
    if policy:
        max_open = int(policy.get("max_field_open_pct") or 100)
        emergency_mode = (policy.get("emergency_mode") or "").lower()
        if action == "OPEN" and valve_position > max_open:
            blocked = True
            blocked_reason = f"Policy max open percent is {max_open}%"
        if action == "OPEN" and emergency_mode in {"drought", "maintenance"}:
            blocked = True
            blocked_reason = f"Policy emergency mode '{emergency_mode}' blocks open action"
        if action == "OPEN" and quota_remaining is not None and quota_remaining <= 0:
            blocked = True
            blocked_reason = "Policy quota exhausted for current schedule window"

    decision = {
        "field_id": field["field_id"],
        "timestamp": _now_utc().isoformat(),
        "water_level_pct": water_level,
        "soil_moisture_pct": soil_moisture,
        "water_level_min": round(effective_water_min, 2),
        "water_level_max": float(field["water_level_max_pct"]),
        "soil_moisture_min": round(effective_soil_min, 2),
        "soil_moisture_max": float(field["soil_moisture_max_pct"]),
        "action": action,
        "valve_position_pct": valve_position,
        "reason": reason,
        "priority": priority,
        "ml_prediction": {
            "forecast_adjustment_pct": forecast_adj,
            "stress_penalty_factor": stress_penalty,
        },
        "manual_request_required": False,
        "manual_request_id": None,
        "manual_request_status": None,
        "manual_request_reason": None,
        "blocked": blocked,
        "blocked_reason": blocked_reason,
        "policy_id": policy_id,
        "policy_version": policy_version,
        "quota_remaining_mcm": round(float(quota_remaining), 6) if quota_remaining is not None else None,
    }

    decision.update(
        _build_contract(
            observed_at=reading.get("timestamp"),
            source="iot_sensors",
            data_available=True,
            message=blocked_reason,
        )
    )
    return decision


def _field_sync_payload(field: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "field_name": field.get("field_name") or field.get("field_id"),
        "area_ha": float(field.get("area_hectares") or 0.0),
        "scheme_id": field.get("scheme_id"),
        "soil_type": field.get("soil_type"),
        "location": field.get("location_name"),
        "latitude": field.get("latitude"),
        "longitude": field.get("longitude"),
    }


async def _sync_field_to_planning(field: Dict[str, Any]) -> None:
    field_id = str(field.get("field_id") or "").strip()
    if not field_id:
        return
    payload = _field_sync_payload(field)
    if payload["area_ha"] <= 0:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.put(
                f"{settings.optimization_service_url}/f4/internal/fields/{field_id}",
                json=payload,
            )
        if response.status_code >= 400:
            logger.warning(
                "Field sync to planning failed for %s: %s %s",
                field_id,
                response.status_code,
                response.text,
            )
    except Exception as exc:
        logger.warning("Field sync to planning failed for %s: %s", field_id, exc)


async def _delete_field_from_planning(field_id: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.delete(
                f"{settings.optimization_service_url}/f4/internal/fields/{field_id}",
            )
        if response.status_code >= 400:
            logger.warning(
                "Field delete sync to planning failed for %s: %s %s",
                field_id,
                response.status_code,
                response.text,
            )
    except Exception as exc:
        logger.warning("Field delete sync to planning failed for %s: %s", field_id, exc)


async def ensure_default_field_seed() -> None:
    async with session_scope() as session:
        fields = await list_crop_fields(session)
        for field in fields:
            # Cleanup legacy bootstrap field so new users start with an empty field list.
            is_legacy_default = (
                field.get("field_id") == "field-rice-01"
                and (field.get("field_name") or "").lower() == "default rice field"
                and field.get("scheme_id") == "scheme-default"
                and field.get("owner_id") is None
            )
            if is_legacy_default:
                await delete_crop_field(session, field["field_id"])

        default_topology = [
            {
                "node_id": "scheme-default-reservoir-main",
                "scheme_id": "scheme-default",
                "node_type": "reservoir",
                "parent_node_id": None,
                "display_name": "Main Reservoir",
            },
            {
                "node_id": "scheme-default-canal-main",
                "scheme_id": "scheme-default",
                "node_type": "canal",
                "parent_node_id": "scheme-default-reservoir-main",
                "display_name": "Main Canal",
            },
            {
                "node_id": "scheme-default-tunnel-main",
                "scheme_id": "scheme-default",
                "node_type": "tunnel",
                "parent_node_id": "scheme-default-canal-main",
                "display_name": "Main Tunnel",
            },
            {
                "node_id": "scheme-default-channel-main",
                "scheme_id": "scheme-default",
                "node_type": "channel",
                "parent_node_id": "scheme-default-tunnel-main",
                "display_name": "Main Channel",
            },
            {
                "node_id": "scheme-default-turnout-main-1",
                "scheme_id": "scheme-default",
                "node_type": "turnout",
                "parent_node_id": "scheme-default-channel-main",
                "display_name": "Turnout 1",
            },
        ]
        for node in default_topology:
            await upsert_hydraulic_topology_node(
                session,
                {
                    **node,
                    "metadata_json": {"seed": True},
                },
            )


@router.get("/farm/crops/defaults")
async def get_crop_defaults():
    return {
        "crops": CROP_DEFAULTS,
        "supported_crops": sorted(CROP_DEFAULTS.keys()),
    }


@router.get("/farm/crops/defaults/{crop_type}")
async def get_crop_default(crop_type: str):
    normalized = crop_type.lower().strip()
    defaults = CROP_DEFAULTS.get(normalized)
    if defaults is None:
        raise HTTPException(status_code=404, detail=f"Crop defaults not found for '{crop_type}'")
    return defaults


@router.post("/farm/fields")
async def create_field(
    payload: FarmFieldCreate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    crop_type = (payload.crop_type or "unassigned").lower().strip()
    if crop_type not in CROP_DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Unsupported crop_type '{payload.crop_type}'")

    owner_id = payload.owner_id
    if _is_officer_or_authority(user_context):
        _assert_scheme_access(user_context, payload.scheme_id)
    elif _is_farmer(user_context):
        owner_id = user_context.get("id")

    field_id = payload.field_id or f"field-{uuid.uuid4().hex[:8]}"
    defaults = CROP_DEFAULTS[crop_type]

    record = {
        "field_id": field_id,
        "field_name": payload.field_name,
        "crop_type": crop_type,
        "soil_type": payload.soil_type,
        "area_hectares": payload.area_hectares,
        "device_id": None,
        "owner_id": owner_id,
        "scheme_id": payload.scheme_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "location_name": payload.location_name,
        "lifecycle_state": "CONFIGURED",
        "pairing_status": "UNPAIRED",
        "last_handshake_at": None,
        "live_since": None,
        "suspended_reason": None,
        **defaults,
        "auto_control_enabled": payload.auto_control_enabled,
    }

    async with session_scope() as session:
        existing = await get_crop_field(session, field_id)
        if existing:
            raise HTTPException(status_code=409, detail=f"Field '{field_id}' already exists")

        created = await upsert_crop_field(session, record)

    await _sync_field_to_planning(created)
    return created


@router.get("/farm/fields")
async def get_fields(user_context: Dict[str, Any] = Depends(get_current_user_context)):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        rows = await list_crop_fields(session)

    if _is_officer_or_authority(user_context):
        allowed_schemes = _ensure_scoped_roles_have_schemes(user_context)
        rows = [row for row in rows if (row.get("scheme_id") or "") in allowed_schemes]
    elif _is_farmer(user_context):
        user_id = user_context.get("id")
        rows = [row for row in rows if row.get("owner_id") in {None, user_id}]
    return rows


@router.get("/farm/fields/{field_id}")
async def get_field_detail(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    _assert_field_access(user_context, field)
    return field


@router.patch("/farm/fields/{field_id}")
async def patch_field(
    field_id: str,
    payload: FarmFieldUpdate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    updated: Optional[Dict[str, Any]] = None
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        patch = {k: v for k, v in payload.model_dump().items() if v is not None}
        if "crop_type" in patch:
            crop = str(patch["crop_type"]).lower().strip()
            if crop not in CROP_DEFAULTS:
                raise HTTPException(status_code=400, detail=f"Unsupported crop_type '{crop}'")
            patch["crop_type"] = crop
            for key, value in CROP_DEFAULTS[crop].items():
                patch[key] = value
        if "scheme_id" in patch and _is_officer_or_authority(user_context):
            _assert_scheme_access(user_context, str(patch["scheme_id"]))

        updated = await update_crop_field_partial(session, field_id, patch)
    if updated:
        await _sync_field_to_planning(updated)
    return updated


@router.post("/farm/fields/{field_id}/confirm-crop")
async def confirm_field_crop(
    field_id: str,
    payload: CropConfirmRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    requested_crop = payload.crop_type.lower().strip()
    crop_type = requested_crop
    if crop_type not in CROP_DEFAULTS or crop_type == "unassigned":
        aliases = {
            "paddy": "rice",
            "rice": "rice",
            "wheat": "wheat",
            "maize": "wheat",
            "corn": "wheat",
            "sugarcane": "sugarcane",
            "cane": "sugarcane",
            "vegetable": "vegetables",
            "vegetables": "vegetables",
            "tomato": "vegetables",
            "onion": "vegetables",
            "chili": "vegetables",
        }
        crop_type = "vegetables"
        for alias, mapped in aliases.items():
            if alias in requested_crop:
                crop_type = mapped
                break

    updated: Optional[Dict[str, Any]] = None
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        patch: Dict[str, Any] = {
            "crop_type": crop_type,
            **CROP_DEFAULTS[crop_type],
        }
        updated = await update_crop_field_partial(session, field_id, patch)

    if updated:
        await _sync_field_to_planning(updated)
    return {
        "field_id": field_id,
        "selected_crop": {
            "crop_type": crop_type,
            "requested_crop": requested_crop,
            "source": payload.source or "manual_confirmation",
            "recommendation_id": payload.recommendation_id,
            "expected_profit_per_ha": payload.expected_profit_per_ha,
            "confirmed_at": _now_utc().isoformat(),
        },
        "field": updated,
    }


@router.delete("/farm/fields/{field_id}")
async def remove_field(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    deleted = False
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        deleted = await delete_crop_field(session, field_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Field not found")

    if deleted:
        await _delete_field_from_planning(field_id)
    return {"status": "deleted", "field_id": field_id}


@router.get("/farm/devices/{device_id}/field")
async def resolve_device_to_field(device_id: str):
    """Internal helper endpoint used by the IoT service bridge."""
    async with session_scope() as session:
        field = await get_crop_field_by_device(session, device_id)
        if not field:
            pairing = await get_confirmed_pairing_by_device(session, device_id)
            if pairing:
                field = await get_crop_field(session, pairing["field_id"])
    if not field:
        raise HTTPException(status_code=404, detail="Field mapping not found")
    return {
        "device_id": device_id,
        "field_id": field["field_id"],
        "scheme_id": field.get("scheme_id"),
    }


@router.post("/devices/pairing/initiate")
async def initiate_pairing(
    payload: PairingInitiateRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    expires_at = _now_utc() + timedelta(minutes=20)
    challenge = f"{random.randint(100000, 999999)}"

    async with session_scope() as session:
        field = await get_crop_field(session, payload.field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        await update_crop_field_partial(
            session,
            payload.field_id,
            {
                "device_id": payload.device_id,
                "pairing_status": "PENDING",
                "lifecycle_state": "DEVICELINKED",
                "last_handshake_at": None,
            },
        )

        pairing = await create_pairing_session(
            session,
            field_id=payload.field_id,
            device_id=payload.device_id,
            challenge_code=challenge,
            expires_at=expires_at,
            initiated_by=user_context.get("id"),
        )

    return pairing


@router.get("/devices/pairing/{pairing_id}")
async def get_pairing(
    pairing_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        pairing = await get_pairing_session(session, pairing_id)
        if not pairing:
            raise HTTPException(status_code=404, detail="Pairing session not found")

        field = await get_crop_field(session, pairing["field_id"])
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

    return pairing


@router.get("/devices/fields/{field_id}/pairings")
async def list_field_pairings(
    field_id: str,
    limit: int = Query(50, ge=1, le=200),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        pairings = await list_pairing_sessions_for_field(session, field_id=field_id, limit=limit)

    return {"field_id": field_id, "count": len(pairings), "items": pairings}


@router.post("/devices/pairing/{pairing_id}/confirm")
async def confirm_pairing(
    pairing_id: str,
    payload: PairingConfirmRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="confirm must be true")

    async with session_scope() as session:
        pairing = await get_pairing_session(session, pairing_id)
        if not pairing:
            raise HTTPException(status_code=404, detail="Pairing session not found")

        field = await get_crop_field(session, pairing["field_id"])
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        if pairing.get("status") != "CONFIRMED" and pairing.get("first_telemetry_at") is None:
            raise HTTPException(status_code=409, detail="Handshake not complete. Await first telemetry.")

        pairing = await confirm_pairing_session(
            session,
            pairing_id=pairing_id,
            confirmed_by=user_context.get("id"),
            confirmed_at=_now_utc(),
        )
        await update_crop_field_partial(
            session,
            field["field_id"],
            {
                "pairing_status": "CONFIRMED",
                "lifecycle_state": "LIVE",
                "live_since": field.get("live_since") or _now_utc(),
                "last_handshake_at": _now_utc(),
            },
        )

    return pairing


@router.get("/devices")
async def list_devices(user_context: Dict[str, Any] = Depends(get_current_user_context)):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        fields = await list_crop_fields(session)

    if _is_officer_or_authority(user_context):
        allowed_schemes = _ensure_scoped_roles_have_schemes(user_context)
        fields = [field for field in fields if (field.get("scheme_id") or "") in allowed_schemes]
    elif _is_farmer(user_context):
        uid = user_context.get("id")
        fields = [field for field in fields if field.get("owner_id") in {None, uid}]

    devices = []
    for field in fields:
        if not field.get("device_id"):
            continue
        devices.append(
            {
                "device_id": field["device_id"],
                "field_id": field["field_id"],
                "scheme_id": field.get("scheme_id"),
                "pairing_status": field.get("pairing_status"),
                "lifecycle_state": field.get("lifecycle_state"),
                "last_handshake_at": field.get("last_handshake_at"),
            }
        )

    return {"count": len(devices), "devices": devices}


@router.post("/telemetry/ingest")
async def ingest_telemetry(payload: TelemetryIngestRequest):
    async with session_scope() as session:
        field: Optional[Dict[str, Any]] = None
        pending_pairing: Optional[Dict[str, Any]] = None

        if payload.field_id:
            field = await get_crop_field(session, payload.field_id)
        if field is None:
            field = await get_crop_field_by_device(session, payload.device_id)

        if field is None:
            pending_pairing = await get_pending_pairing_by_device(session, payload.device_id)
            if pending_pairing:
                field = await get_crop_field(session, pending_pairing["field_id"])

        if field is None:
            confirmed_pairing = await get_confirmed_pairing_by_device(session, payload.device_id)
            if confirmed_pairing:
                field = await get_crop_field(session, confirmed_pairing["field_id"])

        if field is None:
            raise HTTPException(status_code=404, detail="No field mapping found for telemetry")

        reading = await add_sensor_reading(
            session,
            field["field_id"],
            {
                "device_id": payload.device_id,
                "timestamp": payload.timestamp or _now_utc().isoformat(),
                "soil_moisture_pct": payload.soil_moisture_pct,
                "water_level_pct": payload.water_level_pct,
                "soil_ao": payload.soil_ao,
                "water_ao": payload.water_ao,
                "rssi": payload.rssi,
                "battery_v": payload.battery_v,
            },
        )
        await purge_sensor_history(session, field["field_id"], keep_last=200)

        now = _now_utc()
        if pending_pairing is None:
            pending_pairing = await get_pending_pairing_by_device(session, payload.device_id)

        if pending_pairing:
            await set_pairing_first_telemetry(session, pairing_id=pending_pairing["pairing_id"], at_time=now)
            await confirm_pairing_session(
                session,
                pairing_id=pending_pairing["pairing_id"],
                confirmed_by="system:telemetry",
                confirmed_at=now,
            )
            await update_crop_field_partial(
                session,
                field["field_id"],
                {
                    "pairing_status": "CONFIRMED",
                    "device_id": payload.device_id,
                    "lifecycle_state": "LIVE",
                    "last_handshake_at": now,
                    "live_since": field.get("live_since") or now,
                },
            )
        else:
            await update_crop_field_partial(
                session,
                field["field_id"],
                {
                    "device_id": payload.device_id,
                    "lifecycle_state": "LIVE",
                    "last_handshake_at": now,
                    "live_since": field.get("live_since") or now,
                },
            )

        valve = await get_valve_state(session, field["field_id"])
        policy = None
        if field.get("scheme_id"):
            policy = await get_active_authority_policy(session, scheme_id=field["scheme_id"])
        quota_remaining = await _policy_quota_remaining_mcm(session, policy)

        decision = None
        auto_control_triggered = False
        manual_request_required = False
        manual_request_id = None
        manual_request_reason = None

        if field.get("auto_control_enabled", True):
            decision = await _compute_auto_decision(
                field,
                reading,
                valve,
                policy,
                quota_remaining_mcm=quota_remaining,
            )
            if decision["action"] == "OPEN" and decision.get("blocked"):
                blocked_reason = decision.get("blocked_reason") or "Policy blocked auto-open"
                if decision.get("policy_id") and decision.get("policy_version") is not None:
                    blocked_reason = (
                        f"{blocked_reason} (policy {decision['policy_id']} v{decision['policy_version']})"
                    )
                manual = await create_manual_request(
                    session,
                    field_id=field["field_id"],
                    requested_action="OPEN",
                    requested_position_pct=int(decision["valve_position_pct"]),
                    reason=blocked_reason,
                    source_decision=decision,
                    created_by="system:auto",
                    actor_roles=["system"],
                )
                decision["action"] = "HOLD"
                decision["valve_position_pct"] = int(valve.get("position_pct") or 0)
                decision["manual_request_required"] = True
                decision["manual_request_id"] = manual["request_id"]
                decision["manual_request_status"] = manual["status"]
                decision["manual_request_reason"] = manual["reason"]
                manual_request_required = True
                manual_request_id = manual["request_id"]
                manual_request_reason = manual["reason"]
            elif decision["action"] in {"OPEN", "CLOSE"}:
                next_status = "OPEN" if decision["action"] == "OPEN" else "CLOSED"
                next_position = int(decision["valve_position_pct"] if next_status == "OPEN" else 0)
                await upsert_valve_state(
                    session,
                    field["field_id"],
                    status=next_status,
                    position_pct=next_position,
                    last_action=decision["action"],
                    last_action_time=now,
                )
                auto_control_triggered = True

        return {
            "field_id": field["field_id"],
            "data_received": True,
            "auto_control_triggered": auto_control_triggered,
            "manual_request_required": manual_request_required,
            "manual_request_id": manual_request_id,
            "manual_request_reason": manual_request_reason,
            "decision": decision,
            "reading": reading,
        }


@router.get("/telemetry/fields/{field_id}/latest")
async def get_field_latest_telemetry(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        latest = await get_latest_sensor_reading(session, field_id)
        if not latest:
            contract = _build_contract(observed_at=None, source="iot_sensors", data_available=False, message="No telemetry")
            return {"field_id": field_id, **contract}

        contract = _build_contract(observed_at=latest.get("timestamp"), source="iot_sensors", data_available=True)
        return {"field_id": field_id, **latest, **contract}


@router.get("/telemetry/fields/{field_id}/history")
async def get_field_telemetry_history(
    field_id: str,
    limit: int = Query(50, ge=1, le=500),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)
        history = await get_sensor_history(session, field_id, limit=limit)

    return {"field_id": field_id, "count": len(history), "readings": history}


@router.get("/irrigation/fields/{field_id}/status")
async def get_field_status(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        latest = await get_latest_sensor_reading(session, field_id)
        valve = await get_valve_state(session, field_id)

        if not latest:
            return {
                "field_id": field_id,
                "field_name": field["field_name"],
                "crop_type": field["crop_type"],
                "soil_type": field.get("soil_type"),
                "area_hectares": field.get("area_hectares"),
                "scheme_id": field.get("scheme_id"),
                "latitude": field.get("latitude"),
                "longitude": field.get("longitude"),
                "location_name": field.get("location_name"),
                "device_id": field.get("device_id"),
                "lifecycle_state": field.get("lifecycle_state"),
                "pairing_status": field.get("pairing_status"),
                "last_handshake_at": field.get("last_handshake_at"),
                "live_since": field.get("live_since"),
                "sensor_connected": False,
                "is_simulated": False,
                "last_real_data_time": None,
                "current_water_level_pct": 0.0,
                "current_soil_moisture_pct": 0.0,
                "valve_status": valve["status"],
                "valve_position_pct": valve["position_pct"],
                "water_status": "UNKNOWN",
                "soil_status": "UNKNOWN",
                "overall_status": "NO_SENSOR",
                "last_sensor_reading": None,
                "last_valve_action": valve.get("last_action_time"),
                "auto_control_enabled": field.get("auto_control_enabled", True),
                "soil_moisture_optimal_pct": field.get("soil_moisture_optimal_pct"),
                "soil_moisture_min_pct": field.get("soil_moisture_min_pct"),
                "soil_moisture_max_pct": field.get("soil_moisture_max_pct"),
                "water_level_optimal_pct": field.get("water_level_optimal_pct"),
                "water_level_min_pct": field.get("water_level_min_pct"),
                "water_level_max_pct": field.get("water_level_max_pct"),
                "next_action": None,
                "manual_request_required": False,
                "manual_request_id": None,
                "manual_request_status": None,
                "manual_request_reason": None,
                **_build_contract(
                    observed_at=None,
                    source="iot_sensors",
                    data_available=False,
                    message="No telemetry available",
                ),
            }

        contract = _build_contract(observed_at=latest.get("timestamp"), source="iot_sensors", data_available=True)
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

        if stale and field.get("lifecycle_state") == "LIVE":
            await update_crop_field_partial(session, field_id, {"lifecycle_state": "DEGRADED"})

        return {
            "field_id": field_id,
            "field_name": field["field_name"],
            "crop_type": field["crop_type"],
            "soil_type": field.get("soil_type"),
            "area_hectares": field.get("area_hectares"),
            "scheme_id": field.get("scheme_id"),
            "latitude": field.get("latitude"),
            "longitude": field.get("longitude"),
            "location_name": field.get("location_name"),
            "device_id": field.get("device_id"),
            "lifecycle_state": field.get("lifecycle_state"),
            "pairing_status": field.get("pairing_status"),
            "last_handshake_at": field.get("last_handshake_at"),
            "live_since": field.get("live_since"),
            "sensor_connected": not stale,
            "is_simulated": False,
            "last_real_data_time": latest.get("timestamp"),
            "current_water_level_pct": latest["water_level_pct"],
            "current_soil_moisture_pct": latest["soil_moisture_pct"],
            "valve_status": valve["status"],
            "valve_position_pct": valve["position_pct"],
            "water_status": water_status,
            "soil_status": soil_status,
            "overall_status": overall_status,
            "last_sensor_reading": latest.get("timestamp"),
            "last_valve_action": valve.get("last_action_time"),
            "auto_control_enabled": field.get("auto_control_enabled", True),
            "soil_moisture_optimal_pct": field.get("soil_moisture_optimal_pct"),
            "soil_moisture_min_pct": field.get("soil_moisture_min_pct"),
            "soil_moisture_max_pct": field.get("soil_moisture_max_pct"),
            "water_level_optimal_pct": field.get("water_level_optimal_pct"),
            "water_level_min_pct": field.get("water_level_min_pct"),
            "water_level_max_pct": field.get("water_level_max_pct"),
            "next_action": None,
            "manual_request_required": False,
            "manual_request_id": None,
            "manual_request_status": None,
            "manual_request_reason": None,
            **contract,
        }


@router.get("/irrigation/fields/{field_id}/auto-decision")
async def get_auto_decision(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        latest = await get_latest_sensor_reading(session, field_id)
        if not latest:
            raise HTTPException(status_code=409, detail="No telemetry available for auto decision")

        valve = await get_valve_state(session, field_id)
        policy = None
        if field.get("scheme_id"):
            policy = await get_active_authority_policy(session, scheme_id=field["scheme_id"])
        quota_remaining = await _policy_quota_remaining_mcm(session, policy)
        decision = await _compute_auto_decision(
            field,
            latest,
            valve,
            policy,
            quota_remaining_mcm=quota_remaining,
        )
        return decision


@router.post("/irrigation/fields/{field_id}/commands")
async def send_irrigation_command(
    field_id: str,
    payload: IrrigationCommandRequest,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        action = payload.action.upper()
        if action == "AUTO":
            updated = await update_crop_field_partial(session, field_id, {"auto_control_enabled": True})
            return {
                "field_id": field_id,
                "action_taken": "AUTO_ENABLED",
                "status": "success",
                "auto_control_enabled": updated["auto_control_enabled"],
            }

        if _is_farmer(user_context) and action == "OPEN":
            policy = None
            quota_remaining = None
            if field.get("scheme_id"):
                policy = await get_active_authority_policy(session, scheme_id=field["scheme_id"])
                quota_remaining = await _policy_quota_remaining_mcm(session, policy)

            blocked_reason: Optional[str] = None
            if policy:
                emergency_mode = (policy.get("emergency_mode") or "").lower()
                max_open = int(policy.get("max_field_open_pct") or 100)
                if emergency_mode in {"drought", "maintenance"}:
                    blocked_reason = f"Manual open blocked by emergency mode '{emergency_mode}'"
                elif payload.position_pct > max_open:
                    blocked_reason = f"Manual open exceeds max allowed {max_open}%"
                elif quota_remaining is not None and quota_remaining <= 0:
                    blocked_reason = "Manual open blocked because policy quota is exhausted"

            if blocked_reason:
                policy_id = policy.get("policy_id") if policy else None
                policy_version = policy.get("version") if policy else None
                reason = blocked_reason
                if policy_id and policy_version is not None:
                    reason = f"{reason} (policy {policy_id} v{policy_version})"
                manual = await create_manual_request(
                    session,
                    field_id=field_id,
                    requested_action="OPEN",
                    requested_position_pct=payload.position_pct,
                    reason=reason,
                    source_decision=None,
                    created_by=user_context.get("id"),
                    actor_roles=user_context.get("roles"),
                )
                return {
                    "field_id": field_id,
                    "action_taken": "HOLD",
                    "status": "policy_blocked",
                    "manual_request_required": True,
                    "manual_request_id": manual["request_id"],
                    "blocked_reason": reason,
                    "policy_id": policy_id,
                    "policy_version": policy_version,
                }

        await update_crop_field_partial(session, field_id, {"auto_control_enabled": False})
        valve_status = "OPEN" if action == "OPEN" else "CLOSED"
        valve_position = payload.position_pct if action == "OPEN" else 0
        valve = await upsert_valve_state(
            session,
            field_id,
            status=valve_status,
            position_pct=valve_position,
            last_action=action,
            last_action_time=_now_utc(),
        )
        return {
            "field_id": field_id,
            "action_taken": action,
            "status": "success",
            "valve": valve,
        }


@router.post("/irrigation/fields/{field_id}/manual-requests")
async def create_field_manual_request(
    field_id: str,
    payload: ManualRequestCreate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        manual = await create_manual_request(
            session,
            field_id=field_id,
            requested_action=payload.requested_action,
            requested_position_pct=payload.requested_position_pct,
            reason=payload.reason,
            source_decision=None,
            created_by=user_context.get("id"),
            actor_roles=user_context.get("roles"),
        )
        manual["audit"] = await get_manual_request_audit(session, request_id=manual["request_id"])

    return manual


@router.get("/irrigation/manual-requests")
async def get_manual_request_queue(
    field_id: Optional[str] = Query(None),
    scheme_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    allowed_schemes = sorted(_ensure_scoped_roles_have_schemes(user_context))
    if scheme_id:
        _assert_scheme_access(user_context, scheme_id)

    async with session_scope() as session:
        if field_id:
            field = await get_crop_field(session, field_id)
            if not field:
                raise HTTPException(status_code=404, detail="Field not found")
            _assert_field_access(user_context, field)
            if scheme_id and field.get("scheme_id") != scheme_id:
                raise HTTPException(status_code=400, detail="Field does not belong to requested scheme")

        items = await list_manual_requests(
            session,
            field_id=field_id,
            scheme_id=scheme_id,
            status=status_filter,
            scheme_ids=allowed_schemes,
            limit=limit,
        )
        for item in items:
            item["audit"] = await get_manual_request_audit(session, request_id=item["request_id"])
            item["policy_context"] = _extract_manual_policy_context(item)

    return {"count": len(items), "items": items}


@router.post("/irrigation/manual-requests/{request_id}/review")
async def review_manual_request_endpoint(
    request_id: str,
    payload: ManualRequestReview,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")

    decision = payload.decision.upper()

    async with session_scope() as session:
        existing = await get_manual_request(session, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Manual request not found")
        field = await get_crop_field(session, existing["field_id"])
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)
        if existing.get("status") != "PENDING":
            raise HTTPException(status_code=409, detail="Manual request already reviewed")

        reviewed = await review_manual_request(
            session,
            request_id=request_id,
            decision=decision,
            reviewer_id=user_context.get("id"),
            reviewer_roles=user_context.get("roles"),
            review_note=payload.note,
        )
        if reviewed is None:
            raise HTTPException(status_code=404, detail="Manual request not found")

        if decision == "APPROVE":
            valve_status = "OPEN" if reviewed["requested_action"] == "OPEN" else "CLOSED"
            valve_position = reviewed["requested_position_pct"] if valve_status == "OPEN" else 0
            await upsert_valve_state(
                session,
                reviewed["field_id"],
                status=valve_status,
                position_pct=valve_position,
                last_action=reviewed["requested_action"],
                last_action_time=_now_utc(),
            )
            reviewed = await mark_manual_request_executed(
                session,
                request_id=request_id,
                actor_id=user_context.get("id"),
                actor_roles=user_context.get("roles"),
                note=payload.note,
            )

        if reviewed is None:
            raise HTTPException(status_code=500, detail="Manual request update failed")

        reviewed["audit"] = await get_manual_request_audit(session, request_id=request_id)
        reviewed["policy_context"] = _extract_manual_policy_context(reviewed)

    return reviewed


@router.post("/irrigation/manual-requests/{request_id}/close")
async def close_manual_request_endpoint(
    request_id: str,
    payload: ManualRequestClose,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")

    async with session_scope() as session:
        existing = await get_manual_request(session, request_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Manual request not found")
        field = await get_crop_field(session, existing["field_id"])
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        if existing.get("status") == "PENDING":
            raise HTTPException(status_code=409, detail="Pending requests must be reviewed first")

        closed = await close_manual_request(
            session,
            request_id=request_id,
            actor_id=user_context.get("id"),
            actor_roles=user_context.get("roles"),
            note=payload.note,
        )
        if closed is None:
            raise HTTPException(status_code=404, detail="Manual request not found")
        closed["audit"] = await get_manual_request_audit(session, request_id=request_id)
        closed["policy_context"] = _extract_manual_policy_context(closed)

    return closed


@router.get("/irrigation/officer/overview")
async def get_officer_overview(
    scheme_id: Optional[str] = Query(None),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")

    allowed_schemes = sorted(_ensure_scoped_roles_have_schemes(user_context))
    selected_schemes = allowed_schemes
    if scheme_id:
        _assert_scheme_access(user_context, scheme_id)
        selected_schemes = [scheme_id]

    now_utc = _now_utc()
    observed_at = now_utc.isoformat()
    scheme_summaries: List[Dict[str, Any]] = []

    async with session_scope() as session:
        fields = await list_crop_fields(session)

        for sid in selected_schemes:
            scheme_fields = [field for field in fields if (field.get("scheme_id") or "") == sid]
            field_ids = [str(field.get("field_id")) for field in scheme_fields if field.get("field_id")]

            queue_items = await list_manual_requests(
                session,
                scheme_id=sid,
                scheme_ids=allowed_schemes,
                limit=500,
            )
            queue_pending = sum(1 for item in queue_items if item.get("status") == "PENDING")
            queue_open_lifecycle = sum(
                1
                for item in queue_items
                if item.get("status") in {"PENDING", "APPROVED", "EXECUTED"}
            )
            queue_observed = _max_iso_timestamp([item.get("created_at") for item in queue_items])
            queue_message: Optional[str] = None
            if queue_pending > 0:
                queue_message = f"{queue_pending} request(s) awaiting review"
            queue_contract = _build_contract(
                observed_at=queue_observed,
                source="manual_requests",
                data_available=bool(queue_items),
                message=queue_message or ("No manual requests in this scheme" if not queue_items else None),
            )

            fresh_fields = 0
            stale_fields = 0
            no_telemetry_fields = 0
            live_fields = 0
            degraded_fields = 0
            telemetry_observed_values: List[Optional[str]] = []
            worst_staleness_sec: Optional[float] = None

            for field in scheme_fields:
                lifecycle = str(field.get("lifecycle_state") or "").upper()
                if lifecycle == "LIVE":
                    live_fields += 1
                if lifecycle == "DEGRADED":
                    degraded_fields += 1

                latest = await get_latest_sensor_reading(session, str(field["field_id"]))
                if not latest:
                    no_telemetry_fields += 1
                    continue

                telemetry_observed_values.append(latest.get("timestamp"))
                reading_contract = _build_contract(
                    observed_at=latest.get("timestamp"),
                    source="iot_sensors",
                    data_available=True,
                )
                staleness = reading_contract.get("staleness_sec")
                if isinstance(staleness, (int, float)):
                    worst_staleness_sec = max(float(staleness), worst_staleness_sec or 0.0)
                if reading_contract.get("status") == "stale":
                    stale_fields += 1
                else:
                    fresh_fields += 1

            telemetry_observed = _max_iso_timestamp(telemetry_observed_values)
            telemetry_available = bool(scheme_fields) and (fresh_fields + stale_fields) > 0
            telemetry_message: Optional[str] = None
            if not scheme_fields:
                telemetry_message = "No fields assigned to this scheme"
            elif no_telemetry_fields == len(scheme_fields):
                telemetry_message = "No telemetry received yet"
            elif stale_fields > 0:
                telemetry_message = f"{stale_fields} field(s) have stale telemetry"

            telemetry_contract = _build_contract(
                observed_at=telemetry_observed,
                source="iot_sensors",
                data_available=telemetry_available,
                message=telemetry_message,
            )
            if telemetry_available and stale_fields > 0 and telemetry_contract.get("status") == "ok":
                telemetry_contract["status"] = "stale"
                telemetry_contract["quality"] = "stale"
                telemetry_contract["is_live"] = False

            schedules = await list_hydraulic_schedules(
                session,
                scheme_id=sid,
                limit=500,
            )
            accepted_count = sum(1 for item in schedules if item.get("status") == "ACCEPTED")
            rejected_count = sum(1 for item in schedules if item.get("status") == "REJECTED")
            cancelled_count = sum(1 for item in schedules if item.get("status") == "CANCELLED")
            next_window = [
                item.get("start_time")
                for item in schedules
                if item.get("status") == "ACCEPTED"
                and (_parse_dt(item.get("start_time")) or now_utc) >= now_utc
            ]
            hydraulic_observed = _max_iso_timestamp([item.get("created_at") for item in schedules])
            hydraulic_message: Optional[str] = None
            if rejected_count > 0:
                hydraulic_message = f"{rejected_count} schedule(s) rejected by conflict/policy"
            hydraulic_contract = _build_contract(
                observed_at=hydraulic_observed,
                source="hydraulic_planning",
                data_available=bool(schedules),
                message=hydraulic_message or ("No schedule records in this scheme" if not schedules else None),
            )

            scheme_contract = _merge_contracts([queue_contract, telemetry_contract, hydraulic_contract])
            scheme_contract["source"] = "officer_overview"

            scheme_summaries.append(
                {
                    "scheme_id": sid,
                    "queue": {
                        "total_requests": len(queue_items),
                        "pending_requests": queue_pending,
                        "open_lifecycle_requests": queue_open_lifecycle,
                        **queue_contract,
                    },
                    "telemetry": {
                        "total_fields": len(field_ids),
                        "field_ids": field_ids,
                        "live_fields": live_fields,
                        "degraded_fields": degraded_fields,
                        "fresh_fields": fresh_fields,
                        "stale_fields": stale_fields,
                        "no_telemetry_fields": no_telemetry_fields,
                        "worst_staleness_sec": round(float(worst_staleness_sec), 2)
                        if worst_staleness_sec is not None
                        else None,
                        **telemetry_contract,
                    },
                    "hydraulic": {
                        "total_schedules": len(schedules),
                        "accepted_schedules": accepted_count,
                        "rejected_schedules": rejected_count,
                        "cancelled_schedules": cancelled_count,
                        "next_accepted_start_at": _max_iso_timestamp(next_window),
                        **hydraulic_contract,
                    },
                    **scheme_contract,
                }
            )

    top_contract = _merge_contracts([summary for summary in scheme_summaries])
    top_contract["source"] = "officer_overview"

    return {
        "count": len(scheme_summaries),
        "items": scheme_summaries,
        "generated_at": observed_at,
        **top_contract,
    }


@router.get("/irrigation/network/state")
async def get_network_state(
    scheme_id: Optional[str] = Query(None),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    effective_scheme = _resolve_effective_scheme(user_context, scheme_id)

    async with session_scope() as session:
        policy = await get_active_authority_policy(session, scheme_id=effective_scheme)
        reservoir = await get_latest_reservoir_snapshot(session)
        schedules = await list_hydraulic_schedules(session, scheme_id=effective_scheme, limit=50)
        topology = await list_hydraulic_topology_nodes(session, scheme_id=effective_scheme)

    return {
        "scheme_id": effective_scheme,
        "active_policy": policy,
        "reservoir": reservoir,
        "schedules": schedules,
        "topology": topology,
    }


@router.get("/irrigation/network/schedules")
async def get_network_schedules(
    scheme_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    effective_scheme = _resolve_effective_scheme(user_context, scheme_id)

    async with session_scope() as session:
        items = await list_hydraulic_schedules(
            session,
            scheme_id=effective_scheme,
            status_filter=status_filter,
            limit=limit,
        )

    return {"scheme_id": effective_scheme, "count": len(items), "items": items}


@router.get("/irrigation/network/schedules/{schedule_id}")
async def get_network_schedule_detail(
    schedule_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    async with session_scope() as session:
        schedule = await get_hydraulic_schedule(session, schedule_id)
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        _assert_scheme_access(user_context, schedule.get("scheme_id"))

    return schedule


@router.get("/irrigation/network/topology")
async def get_network_topology(
    scheme_id: Optional[str] = Query(None),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    effective_scheme = _resolve_effective_scheme(user_context, scheme_id)

    async with session_scope() as session:
        items = await list_hydraulic_topology_nodes(session, scheme_id=effective_scheme)

    return {"scheme_id": effective_scheme, "count": len(items), "items": items}


@router.post("/irrigation/network/schedules")
async def create_network_schedule(
    payload: NetworkScheduleCreate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    if not _is_officer_or_authority(user_context):
        raise HTTPException(status_code=403, detail="Officer or authority role required")
    effective_scheme = _resolve_effective_scheme(user_context, payload.scheme_id)

    start_dt = _parse_dt(payload.start_time)
    end_dt = _parse_dt(payload.end_time)
    if not start_dt or not end_dt:
        raise HTTPException(status_code=400, detail="Invalid start_time or end_time")
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    if start_dt < _now_utc():
        raise HTTPException(status_code=400, detail="start_time must be in the future")

    async with session_scope() as session:
        await _validate_schedule_topology(
            session,
            scheme_id=effective_scheme,
            canal_id=payload.canal_id,
            tunnel_id=payload.tunnel_id,
            channel_id=payload.channel_id,
            turnout_id=payload.turnout_id,
        )

        conflict = await find_conflicting_hydraulic_schedule(
            session,
            scheme_id=effective_scheme,
            turnout_id=payload.turnout_id,
            start_time=start_dt,
            end_time=end_dt,
        )

        policy = await get_active_authority_policy(session, scheme_id=effective_scheme)
        published_at = _parse_dt(policy.get("published_at")) if policy else None
        scheduled_mcm = await estimate_accepted_schedule_volume_mcm(
            session,
            scheme_id=effective_scheme,
            from_time=published_at,
        )
        policy_block_reason = _validate_schedule_against_policy(
            policy=policy,
            action=payload.action,
            expected_flow_m3s=payload.expected_flow_m3s,
            start_dt=start_dt,
            end_dt=end_dt,
            existing_scheduled_mcm=scheduled_mcm,
        )

        status_value = "ACCEPTED"
        conflict_reason = None
        if conflict:
            status_value = "REJECTED"
            conflict_reason = "Schedule conflict on turnout"
        elif policy_block_reason:
            status_value = "REJECTED"
            conflict_reason = policy_block_reason

        created = await create_hydraulic_schedule(
            session,
            {
                "scheme_id": effective_scheme,
                "canal_id": payload.canal_id,
                "tunnel_id": payload.tunnel_id,
                "channel_id": payload.channel_id,
                "turnout_id": payload.turnout_id,
                "action": payload.action,
                "expected_flow_m3s": payload.expected_flow_m3s,
                "start_time": start_dt,
                "end_time": end_dt,
                "requested_by": user_context.get("id"),
                "requested_roles": user_context.get("roles"),
                "policy_id": policy.get("policy_id") if policy else None,
                "policy_version": policy.get("version") if policy else None,
                "status": status_value,
                "reason": payload.reason,
                "conflict_reason": conflict_reason,
            },
        )

    return created


@router.post("/authority/policies")
async def create_policy(
    payload: AuthorityPolicyCreate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"authority"})
    _assert_scheme_access(user_context, payload.scheme_id)

    async with session_scope() as session:
        current = await get_latest_authority_policy_for_scheme(session, scheme_id=payload.scheme_id)
        version = int(current["version"]) + 1 if current else 1

        created = await create_authority_policy(
            session,
            {
                "scheme_id": payload.scheme_id,
                "version": version,
                "status": "DRAFT",
                "quota_mcm": payload.quota_mcm,
                "max_field_open_pct": payload.max_field_open_pct,
                "emergency_mode": payload.emergency_mode,
                "constraints": payload.constraints,
                "created_by": user_context.get("id"),
                "published_by": None,
                "published_at": None,
            },
            actor_roles=user_context.get("roles"),
        )
        created["audit"] = await get_authority_policy_audit(session, policy_id=created["policy_id"])

    return created


@router.get("/authority/policies")
async def list_policies(
    scheme_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"authority"})
    effective_scheme = _resolve_effective_scheme(user_context, scheme_id)

    async with session_scope() as session:
        items = await list_authority_policies(
            session,
            scheme_id=effective_scheme,
            status_filter=status_filter,
            limit=limit,
        )
        for item in items:
            item["audit"] = await get_authority_policy_audit(session, policy_id=item["policy_id"])

    return {"scheme_id": effective_scheme, "count": len(items), "items": items}


@router.get("/authority/policies/{policy_id}")
async def get_policy(
    policy_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"authority"})

    async with session_scope() as session:
        policy = await get_authority_policy(session, policy_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        _assert_scheme_access(user_context, policy.get("scheme_id"))
        policy["audit"] = await get_authority_policy_audit(session, policy_id=policy_id)

    return policy


@router.post("/authority/policies/{policy_id}/publish")
async def publish_policy(
    policy_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"authority"})

    async with session_scope() as session:
        existing = await get_authority_policy(session, policy_id)
        if existing is None:
            raise HTTPException(status_code=404, detail="Policy not found")
        _assert_scheme_access(user_context, existing.get("scheme_id"))

        updated = await publish_authority_policy(
            session,
            policy_id=policy_id,
            published_by=user_context.get("id"),
            actor_roles=user_context.get("roles"),
        )
        if updated is None:
            raise HTTPException(status_code=404, detail="Policy not found")
        updated["audit"] = await get_authority_policy_audit(session, policy_id=policy_id)

    return updated


@router.get("/farm/fields/{field_id}/profile")
async def get_local_field_profile(
    field_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    """
    Local service profile payload. Gateway composes the cross-service version.
    """
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)
        latest = await get_latest_sensor_reading(session, field_id)
        valve = await get_valve_state(session, field_id)
        pending = await list_manual_requests(session, field_id=field_id, status="PENDING", limit=20)
        recent = await list_manual_requests(session, field_id=field_id, limit=20)

    return {
        "field": field,
        "latest_telemetry": latest,
        "valve": valve,
        "pending_manual_requests": pending,
        "manual_requests": recent,
    }


# ---------------------------------------------------------------------------
# Field observations (Crop Health tab — geo-tagged farmer notes)
# ---------------------------------------------------------------------------


ALLOWED_OBSERVATION_KINDS = {"disease", "pest", "water_stress", "healthy", "note"}
ALLOWED_OBSERVATION_SEVERITIES = {"low", "medium", "high", "critical"}


class FieldObservationCreate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    kind: str = Field(..., description="disease | pest | water_stress | healthy | note")
    severity: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=160)
    note: Optional[str] = Field(default=None, max_length=2000)
    photo_url: Optional[str] = Field(default=None, max_length=2000)
    prediction_label: Optional[str] = Field(default=None, max_length=120)
    prediction_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class FieldObservationUpdate(BaseModel):
    kind: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    note: Optional[str] = Field(default=None, max_length=2000)
    photo_url: Optional[str] = Field(default=None, max_length=2000)
    prediction_label: Optional[str] = Field(default=None, max_length=120)
    prediction_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


def _validate_observation_kind(kind: str) -> str:
    normalized = (kind or "").strip().lower()
    if normalized not in ALLOWED_OBSERVATION_KINDS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid observation kind: {kind!r}",
        )
    return normalized


def _validate_observation_severity(severity: Optional[str]) -> Optional[str]:
    if severity is None or severity == "":
        return None
    normalized = severity.strip().lower()
    if normalized not in ALLOWED_OBSERVATION_SEVERITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid observation severity: {severity!r}",
        )
    return normalized


@router.post("/farm/fields/{field_id}/observations", status_code=201)
async def create_field_observation_endpoint(
    field_id: str,
    payload: FieldObservationCreate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})
    kind = _validate_observation_kind(payload.kind)
    severity = _validate_observation_severity(payload.severity)

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        observation = await create_field_observation(
            session,
            field_id=field_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            kind=kind,
            severity=severity,
            title=payload.title.strip(),
            note=payload.note,
            photo_url=payload.photo_url,
            prediction_label=payload.prediction_label,
            prediction_confidence=payload.prediction_confidence,
            created_by=user_context.get("id"),
        )

    return observation


@router.get("/farm/fields/{field_id}/observations")
async def list_field_observations_endpoint(
    field_id: str,
    limit: int = Query(50, ge=1, le=500),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        items = await list_field_observations(session, field_id=field_id, limit=limit)

    return {"field_id": field_id, "count": len(items), "items": items}


@router.patch("/farm/fields/{field_id}/observations/{observation_id}")
async def patch_field_observation_endpoint(
    field_id: str,
    observation_id: str,
    payload: FieldObservationUpdate,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    fields: Dict[str, Any] = {}
    raw = payload.model_dump(exclude_unset=True)
    if "kind" in raw:
        fields["kind"] = _validate_observation_kind(raw["kind"])
    if "severity" in raw:
        fields["severity"] = _validate_observation_severity(raw["severity"])
    for key in ("title", "note", "photo_url", "prediction_label", "prediction_confidence"):
        if key in raw:
            value = raw[key]
            fields[key] = value.strip() if isinstance(value, str) and key == "title" else value

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        existing = await get_field_observation(session, observation_id)
        if not existing or existing.get("field_id") != field_id:
            raise HTTPException(status_code=404, detail="Observation not found")

        if not fields:
            return existing

        updated = await update_field_observation(
            session,
            observation_id=observation_id,
            fields=fields,
        )

    return updated


@router.delete("/farm/fields/{field_id}/observations/{observation_id}")
async def delete_field_observation_endpoint(
    field_id: str,
    observation_id: str,
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    _require_roles(user_context, {"farmer", "officer", "authority"})

    async with session_scope() as session:
        field = await get_crop_field(session, field_id)
        if not field:
            raise HTTPException(status_code=404, detail="Field not found")
        _assert_field_access(user_context, field)

        existing = await get_field_observation(session, observation_id)
        if not existing or existing.get("field_id") != field_id:
            raise HTTPException(status_code=404, detail="Observation not found")

        deleted = await delete_field_observation(session, observation_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Observation not found")
    return {"observation_id": observation_id, "deleted": True}

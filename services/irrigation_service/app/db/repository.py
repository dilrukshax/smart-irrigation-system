"""
Persistence repository for irrigation runtime state.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    CropField,
    ManualRequest,
    ManualRequestAudit,
    ReservoirSnapshot,
    SensorReading,
    ValveState,
    WaterManagementState,
)


def _parse_iso_datetime(value: Optional[str | datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return None


def _crop_field_to_dict(row: CropField) -> Dict[str, Any]:
    return {
        "field_id": row.field_id,
        "field_name": row.field_name,
        "crop_type": row.crop_type,
        "area_hectares": row.area_hectares,
        "device_id": row.device_id,
        "water_level_min_pct": row.water_level_min_pct,
        "water_level_max_pct": row.water_level_max_pct,
        "water_level_optimal_pct": row.water_level_optimal_pct,
        "water_level_critical_pct": row.water_level_critical_pct,
        "soil_moisture_min_pct": row.soil_moisture_min_pct,
        "soil_moisture_max_pct": row.soil_moisture_max_pct,
        "soil_moisture_optimal_pct": row.soil_moisture_optimal_pct,
        "soil_moisture_critical_pct": row.soil_moisture_critical_pct,
        "irrigation_duration_minutes": row.irrigation_duration_minutes,
        "auto_control_enabled": row.auto_control_enabled,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _valve_to_dict(row: Optional[ValveState]) -> Dict[str, Any]:
    if not row:
        return {
            "status": "CLOSED",
            "position_pct": 0,
            "last_action": None,
            "last_action_time": None,
        }
    return {
        "status": row.status,
        "position_pct": row.position_pct,
        "last_action": row.last_action,
        "last_action_time": _iso(row.last_action_time),
    }


def _reading_to_dict(row: SensorReading) -> Dict[str, Any]:
    return {
        "reading_id": row.reading_id,
        "field_id": row.field_id,
        "device_id": row.device_id,
        "timestamp": _iso(row.timestamp),
        "soil_moisture_pct": row.soil_moisture_pct,
        "water_level_pct": row.water_level_pct,
        "soil_ao": row.soil_ao,
        "water_ao": row.water_ao,
        "rssi": row.rssi,
        "battery_v": row.battery_v,
        "created_at": _iso(row.created_at),
    }


def _reservoir_to_dict(row: ReservoirSnapshot) -> Dict[str, Any]:
    return {
        "snapshot_id": row.snapshot_id,
        "timestamp": _iso(row.timestamp),
        "water_level_mmsl": row.water_level_mmsl,
        "total_storage_mcm": row.total_storage_mcm,
        "active_storage_mcm": row.active_storage_mcm,
        "inflow_mcm": row.inflow_mcm,
        "rain_mm": row.rain_mm,
        "main_canals_mcm": row.main_canals_mcm,
        "lb_main_canal_mcm": row.lb_main_canal_mcm,
        "rb_main_canal_mcm": row.rb_main_canal_mcm,
        "evap_mm": row.evap_mm,
        "spillway_mcm": row.spillway_mcm,
        "wind_speed_ms": row.wind_speed_ms,
        "observed_at": _iso(row.observed_at),
    }


def _manual_request_to_dict(row: ManualRequest) -> Dict[str, Any]:
    return {
        "request_id": row.request_id,
        "field_id": row.field_id,
        "requested_action": row.requested_action,
        "requested_position_pct": row.requested_position_pct,
        "reason": row.reason,
        "source_decision": row.source_decision,
        "status": row.status,
        "created_by": row.created_by,
        "reviewed_by": row.reviewed_by,
        "review_note": row.review_note,
        "reviewed_at": _iso(row.reviewed_at),
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


async def ensure_water_management_state(session: AsyncSession) -> None:
    state = await session.get(WaterManagementState, 1)
    if state is None:
        session.add(WaterManagementState(id=1))
        await session.flush()


async def ensure_default_field(session: AsyncSession, payload: Dict[str, Any]) -> None:
    field = await session.get(CropField, payload["field_id"])
    if field:
        return
    field = CropField(**payload)
    session.add(field)
    session.add(
        ValveState(
            field_id=payload["field_id"],
            status="CLOSED",
            position_pct=0,
            last_action=None,
            last_action_time=None,
        )
    )
    await session.flush()


async def list_crop_fields(session: AsyncSession) -> List[Dict[str, Any]]:
    result = await session.execute(select(CropField).order_by(CropField.field_id))
    return [_crop_field_to_dict(row) for row in result.scalars().all()]


async def get_crop_field(session: AsyncSession, field_id: str) -> Optional[Dict[str, Any]]:
    row = await session.get(CropField, field_id)
    return _crop_field_to_dict(row) if row else None


async def get_crop_field_by_device(session: AsyncSession, device_id: str) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(CropField).where(CropField.device_id == device_id).limit(1)
    )
    row = result.scalar_one_or_none()
    return _crop_field_to_dict(row) if row else None


async def upsert_crop_field(session: AsyncSession, payload: Dict[str, Any]) -> Dict[str, Any]:
    row = await session.get(CropField, payload["field_id"])
    if row is None:
        row = CropField(**payload)
        session.add(row)
        session.add(
            ValveState(
                field_id=payload["field_id"],
                status="CLOSED",
                position_pct=0,
                last_action=None,
                last_action_time=None,
            )
        )
        await session.flush()
        return _crop_field_to_dict(row)

    for key, value in payload.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    await session.flush()
    return _crop_field_to_dict(row)


async def delete_crop_field(session: AsyncSession, field_id: str) -> bool:
    row = await session.get(CropField, field_id)
    if not row:
        return False
    await session.delete(row)
    await session.flush()
    return True


async def get_valve_state(session: AsyncSession, field_id: str) -> Dict[str, Any]:
    row = await session.get(ValveState, field_id)
    return _valve_to_dict(row)


async def upsert_valve_state(
    session: AsyncSession,
    field_id: str,
    *,
    status: str,
    position_pct: int,
    last_action: Optional[str],
    last_action_time: Optional[datetime] = None,
) -> Dict[str, Any]:
    row = await session.get(ValveState, field_id)
    if row is None:
        row = ValveState(
            field_id=field_id,
            status=status,
            position_pct=position_pct,
            last_action=last_action,
            last_action_time=last_action_time,
        )
        session.add(row)
    else:
        row.status = status
        row.position_pct = position_pct
        row.last_action = last_action
        row.last_action_time = last_action_time
        row.updated_at = datetime.utcnow()
    await session.flush()
    return _valve_to_dict(row)


async def add_sensor_reading(session: AsyncSession, field_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    ts = _parse_iso_datetime(payload.get("timestamp")) or datetime.utcnow()
    row = SensorReading(
        field_id=field_id,
        device_id=payload["device_id"],
        timestamp=ts,
        soil_moisture_pct=float(payload["soil_moisture_pct"]),
        water_level_pct=float(payload["water_level_pct"]),
        soil_ao=payload.get("soil_ao"),
        water_ao=payload.get("water_ao"),
        rssi=payload.get("rssi"),
        battery_v=payload.get("battery_v"),
    )
    session.add(row)
    await session.flush()
    return _reading_to_dict(row)


async def get_latest_sensor_reading(session: AsyncSession, field_id: str) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(SensorReading)
        .where(SensorReading.field_id == field_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _reading_to_dict(row) if row else None


async def get_sensor_history(
    session: AsyncSession,
    field_id: str,
    *,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(SensorReading)
        .where(SensorReading.field_id == field_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
    )
    return [_reading_to_dict(row) for row in result.scalars().all()]


async def add_reservoir_snapshot(session: AsyncSession, payload: Dict[str, Any]) -> Dict[str, Any]:
    ts = _parse_iso_datetime(payload.get("timestamp")) or datetime.utcnow()
    observed_at = _parse_iso_datetime(payload.get("observed_at")) or ts
    row = ReservoirSnapshot(
        timestamp=ts,
        water_level_mmsl=float(payload["water_level_mmsl"]),
        total_storage_mcm=float(payload["total_storage_mcm"]),
        active_storage_mcm=float(payload["active_storage_mcm"]),
        inflow_mcm=float(payload.get("inflow_mcm") or 0.0),
        rain_mm=float(payload.get("rain_mm") or 0.0),
        main_canals_mcm=float(payload.get("main_canals_mcm") or 0.0),
        lb_main_canal_mcm=float(payload.get("lb_main_canal_mcm") or 0.0),
        rb_main_canal_mcm=float(payload.get("rb_main_canal_mcm") or 0.0),
        evap_mm=payload.get("evap_mm"),
        spillway_mcm=payload.get("spillway_mcm"),
        wind_speed_ms=payload.get("wind_speed_ms"),
        observed_at=observed_at,
    )
    session.add(row)
    await session.flush()
    return _reservoir_to_dict(row)


async def get_latest_reservoir_snapshot(session: AsyncSession) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(ReservoirSnapshot)
        .order_by(ReservoirSnapshot.timestamp.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _reservoir_to_dict(row) if row else None


async def get_water_management_state(session: AsyncSession) -> Dict[str, Any]:
    await ensure_water_management_state(session)
    row = await session.get(WaterManagementState, 1)
    if row is None:
        return {
            "manual_override_active": False,
            "manual_override_action": None,
            "manual_valve_position": None,
            "last_prediction": None,
            "last_decision": None,
        }
    return {
        "manual_override_active": row.manual_override_active,
        "manual_override_action": row.manual_override_action,
        "manual_valve_position": row.manual_valve_position,
        "last_prediction": row.last_prediction,
        "last_decision": row.last_decision,
        "updated_at": _iso(row.updated_at),
    }


async def update_water_management_state(
    session: AsyncSession,
    **patch: Any,
) -> Dict[str, Any]:
    await ensure_water_management_state(session)
    row = await session.get(WaterManagementState, 1)
    if row is None:
        row = WaterManagementState(id=1)
        session.add(row)
    allowed = {
        "manual_override_active",
        "manual_override_action",
        "manual_valve_position",
        "last_prediction",
        "last_decision",
    }
    for key, value in patch.items():
        if key in allowed:
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    await session.flush()
    return await get_water_management_state(session)


async def get_pending_manual_request(session: AsyncSession, field_id: str) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(ManualRequest)
        .where(and_(ManualRequest.field_id == field_id, ManualRequest.status == "PENDING"))
        .order_by(ManualRequest.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _manual_request_to_dict(row) if row else None


async def get_manual_request(session: AsyncSession, request_id: str) -> Optional[Dict[str, Any]]:
    row = await session.get(ManualRequest, request_id)
    return _manual_request_to_dict(row) if row else None


async def add_manual_request_audit(
    session: AsyncSession,
    *,
    request_id: str,
    event_type: str,
    actor_id: Optional[str],
    actor_roles: Optional[List[str]],
    detail: Optional[Dict[str, Any]],
) -> None:
    session.add(
        ManualRequestAudit(
            request_id=request_id,
            event_type=event_type,
            actor_id=actor_id,
            actor_roles=actor_roles,
            detail=detail or {},
        )
    )
    await session.flush()


async def create_manual_request(
    session: AsyncSession,
    *,
    field_id: str,
    requested_action: str,
    requested_position_pct: int,
    reason: str,
    source_decision: Optional[Dict[str, Any]],
    created_by: Optional[str],
    actor_roles: Optional[List[str]],
) -> Dict[str, Any]:
    existing = await get_pending_manual_request(session, field_id)
    if existing:
        return existing

    row = ManualRequest(
        field_id=field_id,
        requested_action=requested_action,
        requested_position_pct=requested_position_pct,
        reason=reason,
        source_decision=source_decision,
        status="PENDING",
        created_by=created_by,
    )
    session.add(row)
    await session.flush()

    await add_manual_request_audit(
        session,
        request_id=row.request_id,
        event_type="REQUEST_CREATED",
        actor_id=created_by,
        actor_roles=actor_roles,
        detail={
            "requested_action": requested_action,
            "requested_position_pct": requested_position_pct,
            "reason": reason,
        },
    )
    return _manual_request_to_dict(row)


async def list_manual_requests(
    session: AsyncSession,
    *,
    status: Optional[str] = None,
    field_id: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query = select(ManualRequest)
    if status:
        query = query.where(ManualRequest.status == status.upper())
    if field_id:
        query = query.where(ManualRequest.field_id == field_id)
    query = query.order_by(ManualRequest.created_at.desc()).limit(limit)
    result = await session.execute(query)
    return [_manual_request_to_dict(row) for row in result.scalars().all()]


async def review_manual_request(
    session: AsyncSession,
    *,
    request_id: str,
    decision: str,
    reviewer_id: Optional[str],
    reviewer_roles: Optional[List[str]],
    review_note: Optional[str],
) -> Optional[Dict[str, Any]]:
    row = await session.get(ManualRequest, request_id)
    if row is None:
        return None
    if row.status != "PENDING":
        return _manual_request_to_dict(row)

    decision_up = decision.upper()
    row.status = "APPROVED" if decision_up == "APPROVE" else "REJECTED"
    row.reviewed_by = reviewer_id
    row.reviewed_at = datetime.utcnow()
    row.review_note = review_note
    row.updated_at = datetime.utcnow()
    await session.flush()

    await add_manual_request_audit(
        session,
        request_id=row.request_id,
        event_type="REQUEST_REVIEWED",
        actor_id=reviewer_id,
        actor_roles=reviewer_roles,
        detail={
            "decision": decision_up,
            "review_note": review_note,
        },
    )
    return _manual_request_to_dict(row)


async def get_manual_request_audit(
    session: AsyncSession,
    *,
    request_id: str,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(ManualRequestAudit)
        .where(ManualRequestAudit.request_id == request_id)
        .order_by(ManualRequestAudit.created_at.asc())
    )
    rows = result.scalars().all()
    return [
        {
            "audit_id": row.audit_id,
            "request_id": row.request_id,
            "event_type": row.event_type,
            "actor_id": row.actor_id,
            "actor_roles": row.actor_roles,
            "detail": row.detail,
            "created_at": _iso(row.created_at),
        }
        for row in rows
    ]


async def purge_sensor_history(session: AsyncSession, field_id: str, keep_last: int = 100) -> None:
    result = await session.execute(
        select(SensorReading.reading_id)
        .where(SensorReading.field_id == field_id)
        .order_by(SensorReading.timestamp.desc())
        .offset(keep_last)
    )
    reading_ids = [row[0] for row in result.all()]
    if reading_ids:
        await session.execute(
            delete(SensorReading).where(SensorReading.reading_id.in_(reading_ids))
        )
        await session.flush()

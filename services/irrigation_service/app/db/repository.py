"""
Persistence repository for irrigation runtime state.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AuthorityPolicy,
    AuthorityPolicyAudit,
    CropField,
    DevicePairingSession,
    FieldObservation,
    HydraulicSchedule,
    HydraulicTopologyNode,
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
        "soil_type": row.soil_type,
        "area_hectares": row.area_hectares,
        "device_id": row.device_id,
        "owner_id": row.owner_id,
        "scheme_id": row.scheme_id,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "location_name": row.location_name,
        "lifecycle_state": row.lifecycle_state,
        "pairing_status": row.pairing_status,
        "last_handshake_at": _iso(row.last_handshake_at),
        "live_since": _iso(row.live_since),
        "suspended_reason": row.suspended_reason,
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
        "closed_by": row.closed_by,
        "review_note": row.review_note,
        "reviewed_at": _iso(row.reviewed_at),
        "executed_at": _iso(row.executed_at),
        "closed_at": _iso(row.closed_at),
        "execution_note": row.execution_note,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _pairing_to_dict(row: DevicePairingSession) -> Dict[str, Any]:
    return {
        "pairing_id": row.pairing_id,
        "field_id": row.field_id,
        "device_id": row.device_id,
        "status": row.status,
        "challenge_code": row.challenge_code,
        "initiated_by": row.initiated_by,
        "confirmed_by": row.confirmed_by,
        "created_at": _iso(row.created_at),
        "expires_at": _iso(row.expires_at),
        "first_telemetry_at": _iso(row.first_telemetry_at),
        "confirmed_at": _iso(row.confirmed_at),
        "updated_at": _iso(row.updated_at),
    }


def _schedule_to_dict(row: HydraulicSchedule) -> Dict[str, Any]:
    return {
        "schedule_id": row.schedule_id,
        "scheme_id": row.scheme_id,
        "canal_id": row.canal_id,
        "tunnel_id": row.tunnel_id,
        "channel_id": row.channel_id,
        "turnout_id": row.turnout_id,
        "action": row.action,
        "expected_flow_m3s": row.expected_flow_m3s,
        "start_time": _iso(row.start_time),
        "end_time": _iso(row.end_time),
        "requested_by": row.requested_by,
        "requested_roles": row.requested_roles,
        "policy_id": row.policy_id,
        "policy_version": row.policy_version,
        "status": row.status,
        "reason": row.reason,
        "conflict_reason": row.conflict_reason,
        "created_at": _iso(row.created_at),
    }


def _policy_to_dict(row: AuthorityPolicy) -> Dict[str, Any]:
    return {
        "policy_id": row.policy_id,
        "scheme_id": row.scheme_id,
        "version": row.version,
        "status": row.status,
        "quota_mcm": row.quota_mcm,
        "max_field_open_pct": row.max_field_open_pct,
        "emergency_mode": row.emergency_mode,
        "constraints": row.constraints,
        "created_by": row.created_by,
        "published_by": row.published_by,
        "published_at": _iso(row.published_at),
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _topology_to_dict(row: HydraulicTopologyNode) -> Dict[str, Any]:
    return {
        "node_id": row.node_id,
        "scheme_id": row.scheme_id,
        "node_type": row.node_type,
        "parent_node_id": row.parent_node_id,
        "display_name": row.display_name,
        "metadata": row.metadata_json or {},
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
        if hasattr(row, key):
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    await session.flush()
    return _crop_field_to_dict(row)


async def update_crop_field_partial(session: AsyncSession, field_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    row = await session.get(CropField, field_id)
    if row is None:
        return None

    for key, value in patch.items():
        if hasattr(row, key):
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
    scheme_id: Optional[str] = None,
    scheme_ids: Optional[List[str]] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query = (
        select(ManualRequest, CropField.scheme_id)
        .join(CropField, CropField.field_id == ManualRequest.field_id)
    )
    if status:
        query = query.where(ManualRequest.status == status.upper())
    if field_id:
        query = query.where(ManualRequest.field_id == field_id)
    if scheme_id:
        query = query.where(CropField.scheme_id == scheme_id)
    if scheme_ids:
        query = query.where(CropField.scheme_id.in_(scheme_ids))
    query = query.order_by(ManualRequest.created_at.desc()).limit(limit)
    result = await session.execute(query)
    rows: List[Dict[str, Any]] = []
    for manual_row, row_scheme_id in result.all():
        item = _manual_request_to_dict(manual_row)
        item["scheme_id"] = row_scheme_id
        rows.append(item)
    return rows


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


async def mark_manual_request_executed(
    session: AsyncSession,
    *,
    request_id: str,
    actor_id: Optional[str],
    actor_roles: Optional[List[str]],
    note: Optional[str],
) -> Optional[Dict[str, Any]]:
    row = await session.get(ManualRequest, request_id)
    if row is None:
        return None

    row.status = "EXECUTED"
    row.executed_at = datetime.utcnow()
    row.execution_note = note
    row.updated_at = datetime.utcnow()
    await session.flush()

    await add_manual_request_audit(
        session,
        request_id=row.request_id,
        event_type="REQUEST_EXECUTED",
        actor_id=actor_id,
        actor_roles=actor_roles,
        detail={"note": note},
    )
    return _manual_request_to_dict(row)


async def close_manual_request(
    session: AsyncSession,
    *,
    request_id: str,
    actor_id: Optional[str],
    actor_roles: Optional[List[str]],
    note: Optional[str],
) -> Optional[Dict[str, Any]]:
    row = await session.get(ManualRequest, request_id)
    if row is None:
        return None

    if row.status == "CLOSED":
        return _manual_request_to_dict(row)

    row.status = "CLOSED"
    row.closed_by = actor_id
    row.closed_at = datetime.utcnow()
    if note is not None:
        row.execution_note = note
    row.updated_at = datetime.utcnow()
    await session.flush()

    await add_manual_request_audit(
        session,
        request_id=row.request_id,
        event_type="REQUEST_CLOSED",
        actor_id=actor_id,
        actor_roles=actor_roles,
        detail={"note": note},
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
        await session.execute(delete(SensorReading).where(SensorReading.reading_id.in_(reading_ids)))
        await session.flush()


async def create_pairing_session(
    session: AsyncSession,
    *,
    field_id: str,
    device_id: str,
    challenge_code: str,
    expires_at: datetime,
    initiated_by: Optional[str],
) -> Dict[str, Any]:
    row = DevicePairingSession(
        field_id=field_id,
        device_id=device_id,
        challenge_code=challenge_code,
        expires_at=expires_at,
        initiated_by=initiated_by,
        status="PENDING",
    )
    session.add(row)
    await session.flush()
    return _pairing_to_dict(row)


async def get_pairing_session(session: AsyncSession, pairing_id: str) -> Optional[Dict[str, Any]]:
    row = await session.get(DevicePairingSession, pairing_id)
    return _pairing_to_dict(row) if row else None


async def list_pairing_sessions_for_field(
    session: AsyncSession,
    *,
    field_id: str,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(DevicePairingSession)
        .where(DevicePairingSession.field_id == field_id)
        .order_by(DevicePairingSession.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [_pairing_to_dict(row) for row in rows]


async def get_confirmed_pairing_by_device(
    session: AsyncSession,
    device_id: str,
) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(DevicePairingSession)
        .where(
            and_(
                DevicePairingSession.device_id == device_id,
                DevicePairingSession.status == "CONFIRMED",
            )
        )
        .order_by(desc(DevicePairingSession.confirmed_at), desc(DevicePairingSession.created_at))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _pairing_to_dict(row) if row else None


async def get_pending_pairing_by_device(
    session: AsyncSession,
    device_id: str,
) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(DevicePairingSession)
        .where(
            and_(
                DevicePairingSession.device_id == device_id,
                DevicePairingSession.status == "PENDING",
            )
        )
        .order_by(DevicePairingSession.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _pairing_to_dict(row) if row else None


async def set_pairing_first_telemetry(
    session: AsyncSession,
    *,
    pairing_id: str,
    at_time: datetime,
) -> Optional[Dict[str, Any]]:
    row = await session.get(DevicePairingSession, pairing_id)
    if row is None:
        return None

    if row.first_telemetry_at is None:
        row.first_telemetry_at = at_time
    row.updated_at = datetime.utcnow()
    await session.flush()
    return _pairing_to_dict(row)


async def confirm_pairing_session(
    session: AsyncSession,
    *,
    pairing_id: str,
    confirmed_by: Optional[str],
    confirmed_at: datetime,
) -> Optional[Dict[str, Any]]:
    row = await session.get(DevicePairingSession, pairing_id)
    if row is None:
        return None

    row.status = "CONFIRMED"
    row.confirmed_by = confirmed_by
    row.confirmed_at = confirmed_at
    row.updated_at = datetime.utcnow()
    await session.flush()
    return _pairing_to_dict(row)


async def upsert_hydraulic_topology_node(
    session: AsyncSession,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    row = await session.get(HydraulicTopologyNode, payload["node_id"])
    if row is None:
        row = HydraulicTopologyNode(**payload)
        session.add(row)
    else:
        row.scheme_id = payload["scheme_id"]
        row.node_type = payload["node_type"]
        row.parent_node_id = payload.get("parent_node_id")
        row.display_name = payload["display_name"]
        row.metadata_json = payload.get("metadata_json")
        row.updated_at = datetime.utcnow()
    await session.flush()
    return _topology_to_dict(row)


async def get_hydraulic_topology_node(
    session: AsyncSession,
    node_id: str,
) -> Optional[Dict[str, Any]]:
    row = await session.get(HydraulicTopologyNode, node_id)
    return _topology_to_dict(row) if row else None


async def list_hydraulic_topology_nodes(
    session: AsyncSession,
    *,
    scheme_id: str,
    node_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = select(HydraulicTopologyNode).where(HydraulicTopologyNode.scheme_id == scheme_id)
    if node_type:
        query = query.where(HydraulicTopologyNode.node_type == node_type)
    query = query.order_by(HydraulicTopologyNode.node_type.asc(), HydraulicTopologyNode.node_id.asc())
    result = await session.execute(query)
    return [_topology_to_dict(row) for row in result.scalars().all()]


async def create_hydraulic_schedule(
    session: AsyncSession,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    row = HydraulicSchedule(**payload)
    session.add(row)
    await session.flush()
    return _schedule_to_dict(row)


async def find_conflicting_hydraulic_schedule(
    session: AsyncSession,
    *,
    scheme_id: str,
    turnout_id: Optional[str],
    start_time: datetime,
    end_time: datetime,
) -> Optional[Dict[str, Any]]:
    if turnout_id is None:
        return None

    result = await session.execute(
        select(HydraulicSchedule)
        .where(
            and_(
                HydraulicSchedule.scheme_id == scheme_id,
                HydraulicSchedule.turnout_id == turnout_id,
                HydraulicSchedule.status == "ACCEPTED",
                HydraulicSchedule.start_time < end_time,
                HydraulicSchedule.end_time > start_time,
            )
        )
        .order_by(HydraulicSchedule.start_time.asc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _schedule_to_dict(row) if row else None


async def list_hydraulic_schedules(
    session: AsyncSession,
    *,
    scheme_id: Optional[str],
    status_filter: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query = select(HydraulicSchedule)
    if scheme_id:
        query = query.where(HydraulicSchedule.scheme_id == scheme_id)
    if status_filter:
        query = query.where(HydraulicSchedule.status == status_filter.upper())
    query = query.order_by(desc(HydraulicSchedule.start_time)).limit(limit)
    result = await session.execute(query)
    return [_schedule_to_dict(row) for row in result.scalars().all()]


async def get_hydraulic_schedule(
    session: AsyncSession,
    schedule_id: str,
) -> Optional[Dict[str, Any]]:
    row = await session.get(HydraulicSchedule, schedule_id)
    return _schedule_to_dict(row) if row else None


async def estimate_accepted_schedule_volume_mcm(
    session: AsyncSession,
    *,
    scheme_id: str,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
) -> float:
    query = select(HydraulicSchedule).where(
        and_(
            HydraulicSchedule.scheme_id == scheme_id,
            HydraulicSchedule.status == "ACCEPTED",
            HydraulicSchedule.expected_flow_m3s.is_not(None),
        )
    )
    if to_time is not None:
        query = query.where(HydraulicSchedule.start_time <= to_time)
    if from_time is not None:
        query = query.where(HydraulicSchedule.end_time >= from_time)

    result = await session.execute(query)
    rows = result.scalars().all()

    total_mcm = 0.0
    for row in rows:
        effective_start = row.start_time
        effective_end = row.end_time
        if from_time is not None and effective_start < from_time:
            effective_start = from_time
        if to_time is not None and effective_end > to_time:
            effective_end = to_time
        duration_seconds = (effective_end - effective_start).total_seconds()
        if duration_seconds <= 0:
            continue
        total_mcm += float(row.expected_flow_m3s or 0.0) * duration_seconds / 1_000_000.0
    return round(total_mcm, 6)


async def add_authority_policy_audit(
    session: AsyncSession,
    *,
    policy_id: str,
    scheme_id: str,
    version: int,
    event_type: str,
    actor_id: Optional[str],
    actor_roles: Optional[List[str]],
) -> None:
    session.add(
        AuthorityPolicyAudit(
            policy_id=policy_id,
            scheme_id=scheme_id,
            version=version,
            event_type=event_type,
            actor_id=actor_id,
            actor_roles=actor_roles,
        )
    )
    await session.flush()


async def create_authority_policy(
    session: AsyncSession,
    payload: Dict[str, Any],
    *,
    actor_roles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    row = AuthorityPolicy(**payload)
    session.add(row)
    await session.flush()
    await add_authority_policy_audit(
        session,
        policy_id=row.policy_id,
        scheme_id=row.scheme_id,
        version=row.version,
        event_type="CREATED",
        actor_id=row.created_by,
        actor_roles=actor_roles,
    )
    return _policy_to_dict(row)


async def get_latest_authority_policy_for_scheme(
    session: AsyncSession,
    *,
    scheme_id: str,
) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(AuthorityPolicy)
        .where(AuthorityPolicy.scheme_id == scheme_id)
        .order_by(desc(AuthorityPolicy.version))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _policy_to_dict(row) if row else None


async def list_authority_policies(
    session: AsyncSession,
    *,
    scheme_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query = select(AuthorityPolicy)
    if scheme_id:
        query = query.where(AuthorityPolicy.scheme_id == scheme_id)
    if status_filter:
        query = query.where(AuthorityPolicy.status == status_filter.upper())
    query = query.order_by(desc(AuthorityPolicy.created_at)).limit(limit)
    result = await session.execute(query)
    return [_policy_to_dict(row) for row in result.scalars().all()]


async def get_authority_policy(
    session: AsyncSession,
    policy_id: str,
) -> Optional[Dict[str, Any]]:
    row = await session.get(AuthorityPolicy, policy_id)
    return _policy_to_dict(row) if row else None


async def get_authority_policy_audit(
    session: AsyncSession,
    *,
    policy_id: str,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(AuthorityPolicyAudit)
        .where(AuthorityPolicyAudit.policy_id == policy_id)
        .order_by(AuthorityPolicyAudit.created_at.asc())
    )
    rows = result.scalars().all()
    return [
        {
            "audit_id": row.audit_id,
            "policy_id": row.policy_id,
            "scheme_id": row.scheme_id,
            "version": row.version,
            "event_type": row.event_type,
            "actor_id": row.actor_id,
            "actor_roles": row.actor_roles,
            "created_at": _iso(row.created_at),
        }
        for row in rows
    ]


async def publish_authority_policy(
    session: AsyncSession,
    *,
    policy_id: str,
    published_by: Optional[str],
    actor_roles: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    row = await session.get(AuthorityPolicy, policy_id)
    if row is None:
        return None

    published_result = await session.execute(
        select(AuthorityPolicy).where(
            and_(
                AuthorityPolicy.scheme_id == row.scheme_id,
                AuthorityPolicy.status == "PUBLISHED",
                AuthorityPolicy.policy_id != row.policy_id,
            )
        )
    )
    previously_published = published_result.scalars().all()
    now = datetime.utcnow()
    for existing in previously_published:
        existing.status = "ARCHIVED"
        existing.updated_at = now
        await add_authority_policy_audit(
            session,
            policy_id=existing.policy_id,
            scheme_id=existing.scheme_id,
            version=existing.version,
            event_type="ARCHIVED",
            actor_id=published_by,
            actor_roles=actor_roles,
        )

    row.status = "PUBLISHED"
    row.published_by = published_by
    row.published_at = now
    row.updated_at = now
    await session.flush()
    await add_authority_policy_audit(
        session,
        policy_id=row.policy_id,
        scheme_id=row.scheme_id,
        version=row.version,
        event_type="PUBLISHED",
        actor_id=published_by,
        actor_roles=actor_roles,
    )
    return _policy_to_dict(row)


async def get_active_authority_policy(
    session: AsyncSession,
    *,
    scheme_id: str,
) -> Optional[Dict[str, Any]]:
    result = await session.execute(
        select(AuthorityPolicy)
        .where(
            and_(
                AuthorityPolicy.scheme_id == scheme_id,
                AuthorityPolicy.status == "PUBLISHED",
            )
        )
        .order_by(desc(AuthorityPolicy.version))
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return _policy_to_dict(row) if row else None


# ---------------------------------------------------------------------------
# Field observations (farmer-recorded geo-tagged notes for the Crop Health tab)
# ---------------------------------------------------------------------------


def _observation_to_dict(row: FieldObservation) -> Dict[str, Any]:
    return {
        "observation_id": row.observation_id,
        "field_id": row.field_id,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "kind": row.kind,
        "severity": row.severity,
        "title": row.title,
        "note": row.note,
        "photo_url": row.photo_url,
        "prediction_label": row.prediction_label,
        "prediction_confidence": row.prediction_confidence,
        "created_by": row.created_by,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


async def create_field_observation(
    session: AsyncSession,
    *,
    field_id: str,
    latitude: float,
    longitude: float,
    kind: str,
    title: str,
    severity: Optional[str] = None,
    note: Optional[str] = None,
    photo_url: Optional[str] = None,
    prediction_label: Optional[str] = None,
    prediction_confidence: Optional[float] = None,
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    row = FieldObservation(
        field_id=field_id,
        latitude=latitude,
        longitude=longitude,
        kind=kind,
        severity=severity,
        title=title,
        note=note,
        photo_url=photo_url,
        prediction_label=prediction_label,
        prediction_confidence=prediction_confidence,
        created_by=created_by,
    )
    session.add(row)
    await session.flush()
    return _observation_to_dict(row)


async def list_field_observations(
    session: AsyncSession,
    *,
    field_id: str,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(FieldObservation)
        .where(FieldObservation.field_id == field_id)
        .order_by(desc(FieldObservation.created_at))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [_observation_to_dict(row) for row in rows]


async def get_field_observation(
    session: AsyncSession,
    observation_id: str,
) -> Optional[Dict[str, Any]]:
    row = await session.get(FieldObservation, observation_id)
    return _observation_to_dict(row) if row else None


async def update_field_observation(
    session: AsyncSession,
    *,
    observation_id: str,
    fields: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    row = await session.get(FieldObservation, observation_id)
    if row is None:
        return None
    mutable = {
        "kind",
        "severity",
        "title",
        "note",
        "photo_url",
        "prediction_label",
        "prediction_confidence",
    }
    for key, value in fields.items():
        if key in mutable:
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    await session.flush()
    return _observation_to_dict(row)


async def delete_field_observation(
    session: AsyncSession,
    observation_id: str,
) -> bool:
    row = await session.get(FieldObservation, observation_id)
    if row is None:
        return False
    await session.delete(row)
    await session.flush()
    return True

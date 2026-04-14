"""
ORM models for persistent irrigation runtime state.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CropField(Base):
    __tablename__ = "irrigation_crop_fields"

    field_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    field_name: Mapped[str] = mapped_column(String(255), nullable=False)
    crop_type: Mapped[str] = mapped_column(String(64), nullable=False)
    soil_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    owner_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    scheme_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    lifecycle_state: Mapped[str] = mapped_column(String(32), nullable=False, default="CONFIGURED")
    pairing_status: Mapped[str] = mapped_column(String(32), nullable=False, default="UNPAIRED")
    last_handshake_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    live_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    water_level_min_pct: Mapped[float] = mapped_column(Float, nullable=False)
    water_level_max_pct: Mapped[float] = mapped_column(Float, nullable=False)
    water_level_optimal_pct: Mapped[float] = mapped_column(Float, nullable=False)
    water_level_critical_pct: Mapped[float] = mapped_column(Float, nullable=False)

    soil_moisture_min_pct: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_max_pct: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_optimal_pct: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_critical_pct: Mapped[float] = mapped_column(Float, nullable=False)

    irrigation_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    auto_control_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class DevicePairingSession(Base):
    __tablename__ = "irrigation_device_pairings"

    pairing_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    field_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("irrigation_crop_fields.field_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING", index=True)
    challenge_code: Mapped[str] = mapped_column(String(16), nullable=False)
    initiated_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    confirmed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    first_telemetry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class ValveState(Base):
    __tablename__ = "irrigation_valve_states"

    field_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("irrigation_crop_fields.field_id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="CLOSED")
    position_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_action: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_action_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class SensorReading(Base):
    __tablename__ = "irrigation_sensor_readings"

    reading_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    field_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("irrigation_crop_fields.field_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    soil_moisture_pct: Mapped[float] = mapped_column(Float, nullable=False)
    water_level_pct: Mapped[float] = mapped_column(Float, nullable=False)
    soil_ao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    water_ao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rssi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    battery_v: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ReservoirSnapshot(Base):
    __tablename__ = "irrigation_reservoir_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    water_level_mmsl: Mapped[float] = mapped_column(Float, nullable=False)
    total_storage_mcm: Mapped[float] = mapped_column(Float, nullable=False)
    active_storage_mcm: Mapped[float] = mapped_column(Float, nullable=False)
    inflow_mcm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rain_mm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    main_canals_mcm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    lb_main_canal_mcm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rb_main_canal_mcm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    evap_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    spillway_mcm: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ManualRequest(Base):
    __tablename__ = "irrigation_manual_requests"

    request_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    field_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("irrigation_crop_fields.field_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requested_action: Mapped[str] = mapped_column(String(16), nullable=False)
    requested_position_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    source_decision: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING", index=True)
    created_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    closed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    execution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class ManualRequestAudit(Base):
    __tablename__ = "irrigation_manual_request_audit"

    audit_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("irrigation_manual_requests.request_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    actor_roles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class HydraulicSchedule(Base):
    __tablename__ = "irrigation_hydraulic_schedules"

    schedule_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scheme_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    canal_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tunnel_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    channel_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    turnout_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    expected_flow_m3s: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    requested_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    requested_roles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    policy_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    policy_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ACCEPTED", index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    conflict_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class HydraulicTopologyNode(Base):
    __tablename__ = "irrigation_hydraulic_topology_nodes"

    node_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    scheme_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    node_type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    parent_node_id: Mapped[str | None] = mapped_column(
        String(128),
        ForeignKey("irrigation_hydraulic_topology_nodes.node_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AuthorityPolicy(Base):
    __tablename__ = "irrigation_authority_policies"

    policy_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scheme_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="DRAFT", index=True)
    quota_mcm: Mapped[float] = mapped_column(Float, nullable=False)
    max_field_open_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    emergency_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    constraints: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    published_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class AuthorityPolicyAudit(Base):
    __tablename__ = "irrigation_authority_policy_audit"

    audit_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    policy_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("irrigation_authority_policies.policy_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheme_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    actor_roles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class WaterManagementState(Base):
    __tablename__ = "irrigation_water_management_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    manual_override_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    manual_override_action: Mapped[str | None] = mapped_column(String(32), nullable=True)
    manual_valve_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_prediction: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_decision: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

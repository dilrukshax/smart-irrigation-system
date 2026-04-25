"""farm-first redesign baseline

Revision ID: 20260412_0001
Revises:
Create Date: 2026-04-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260412_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("irrigation_crop_fields", sa.Column("owner_id", sa.String(length=128), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("scheme_id", sa.String(length=128), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("location_name", sa.String(length=255), nullable=True))
    op.add_column(
        "irrigation_crop_fields",
        sa.Column("lifecycle_state", sa.String(length=32), nullable=False, server_default="CONFIGURED"),
    )
    op.add_column(
        "irrigation_crop_fields",
        sa.Column("pairing_status", sa.String(length=32), nullable=False, server_default="UNPAIRED"),
    )
    op.add_column("irrigation_crop_fields", sa.Column("last_handshake_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("live_since", sa.DateTime(timezone=True), nullable=True))
    op.add_column("irrigation_crop_fields", sa.Column("suspended_reason", sa.Text(), nullable=True))

    op.create_index(op.f("ix_irrigation_crop_fields_owner_id"), "irrigation_crop_fields", ["owner_id"], unique=False)
    op.create_index(op.f("ix_irrigation_crop_fields_scheme_id"), "irrigation_crop_fields", ["scheme_id"], unique=False)

    op.add_column("irrigation_manual_requests", sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("irrigation_manual_requests", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("irrigation_manual_requests", sa.Column("execution_note", sa.Text(), nullable=True))

    op.create_table(
        "irrigation_device_pairings",
        sa.Column("pairing_id", sa.String(length=36), nullable=False),
        sa.Column("field_id", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("challenge_code", sa.String(length=16), nullable=False),
        sa.Column("initiated_by", sa.String(length=128), nullable=True),
        sa.Column("confirmed_by", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("first_telemetry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["field_id"], ["irrigation_crop_fields.field_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("pairing_id"),
    )
    op.create_index(op.f("ix_irrigation_device_pairings_device_id"), "irrigation_device_pairings", ["device_id"], unique=False)
    op.create_index(op.f("ix_irrigation_device_pairings_field_id"), "irrigation_device_pairings", ["field_id"], unique=False)
    op.create_index(op.f("ix_irrigation_device_pairings_status"), "irrigation_device_pairings", ["status"], unique=False)

    op.create_table(
        "irrigation_hydraulic_schedules",
        sa.Column("schedule_id", sa.String(length=36), nullable=False),
        sa.Column("scheme_id", sa.String(length=128), nullable=False),
        sa.Column("canal_id", sa.String(length=128), nullable=True),
        sa.Column("tunnel_id", sa.String(length=128), nullable=True),
        sa.Column("channel_id", sa.String(length=128), nullable=True),
        sa.Column("turnout_id", sa.String(length=128), nullable=True),
        sa.Column("action", sa.String(length=16), nullable=False),
        sa.Column("expected_flow_m3s", sa.Float(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("requested_by", sa.String(length=128), nullable=True),
        sa.Column("requested_roles", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("conflict_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("schedule_id"),
    )
    op.create_index(op.f("ix_irrigation_hydraulic_schedules_scheme_id"), "irrigation_hydraulic_schedules", ["scheme_id"], unique=False)
    op.create_index(op.f("ix_irrigation_hydraulic_schedules_start_time"), "irrigation_hydraulic_schedules", ["start_time"], unique=False)
    op.create_index(op.f("ix_irrigation_hydraulic_schedules_end_time"), "irrigation_hydraulic_schedules", ["end_time"], unique=False)
    op.create_index(op.f("ix_irrigation_hydraulic_schedules_turnout_id"), "irrigation_hydraulic_schedules", ["turnout_id"], unique=False)
    op.create_index(op.f("ix_irrigation_hydraulic_schedules_status"), "irrigation_hydraulic_schedules", ["status"], unique=False)

    op.create_table(
        "irrigation_authority_policies",
        sa.Column("policy_id", sa.String(length=36), nullable=False),
        sa.Column("scheme_id", sa.String(length=128), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("quota_mcm", sa.Float(), nullable=False),
        sa.Column("max_field_open_pct", sa.Integer(), nullable=False),
        sa.Column("emergency_mode", sa.String(length=32), nullable=True),
        sa.Column("constraints", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column("published_by", sa.String(length=128), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("policy_id"),
    )
    op.create_index(op.f("ix_irrigation_authority_policies_scheme_id"), "irrigation_authority_policies", ["scheme_id"], unique=False)
    op.create_index(op.f("ix_irrigation_authority_policies_status"), "irrigation_authority_policies", ["status"], unique=False)

    op.execute(
        """
        UPDATE irrigation_crop_fields
        SET lifecycle_state = COALESCE(NULLIF(lifecycle_state, ''), 'CONFIGURED'),
            pairing_status = COALESCE(NULLIF(pairing_status, ''), 'UNPAIRED')
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_irrigation_authority_policies_status"), table_name="irrigation_authority_policies")
    op.drop_index(op.f("ix_irrigation_authority_policies_scheme_id"), table_name="irrigation_authority_policies")
    op.drop_table("irrigation_authority_policies")

    op.drop_index(op.f("ix_irrigation_hydraulic_schedules_status"), table_name="irrigation_hydraulic_schedules")
    op.drop_index(op.f("ix_irrigation_hydraulic_schedules_turnout_id"), table_name="irrigation_hydraulic_schedules")
    op.drop_index(op.f("ix_irrigation_hydraulic_schedules_end_time"), table_name="irrigation_hydraulic_schedules")
    op.drop_index(op.f("ix_irrigation_hydraulic_schedules_start_time"), table_name="irrigation_hydraulic_schedules")
    op.drop_index(op.f("ix_irrigation_hydraulic_schedules_scheme_id"), table_name="irrigation_hydraulic_schedules")
    op.drop_table("irrigation_hydraulic_schedules")

    op.drop_index(op.f("ix_irrigation_device_pairings_status"), table_name="irrigation_device_pairings")
    op.drop_index(op.f("ix_irrigation_device_pairings_field_id"), table_name="irrigation_device_pairings")
    op.drop_index(op.f("ix_irrigation_device_pairings_device_id"), table_name="irrigation_device_pairings")
    op.drop_table("irrigation_device_pairings")

    op.drop_column("irrigation_manual_requests", "execution_note")
    op.drop_column("irrigation_manual_requests", "closed_at")
    op.drop_column("irrigation_manual_requests", "executed_at")

    op.drop_index(op.f("ix_irrigation_crop_fields_scheme_id"), table_name="irrigation_crop_fields")
    op.drop_index(op.f("ix_irrigation_crop_fields_owner_id"), table_name="irrigation_crop_fields")
    op.drop_column("irrigation_crop_fields", "suspended_reason")
    op.drop_column("irrigation_crop_fields", "live_since")
    op.drop_column("irrigation_crop_fields", "last_handshake_at")
    op.drop_column("irrigation_crop_fields", "pairing_status")
    op.drop_column("irrigation_crop_fields", "lifecycle_state")
    op.drop_column("irrigation_crop_fields", "location_name")
    op.drop_column("irrigation_crop_fields", "longitude")
    op.drop_column("irrigation_crop_fields", "latitude")
    op.drop_column("irrigation_crop_fields", "scheme_id")
    op.drop_column("irrigation_crop_fields", "owner_id")

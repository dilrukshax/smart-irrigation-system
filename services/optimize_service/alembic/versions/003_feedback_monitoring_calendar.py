"""Add feedback loop, model monitoring, Plan B triggers, crop calendars, and oversupply alert tables.

Revision ID: 003_feedback_monitoring_calendar
Revises: 002_f4_runtime_contracts
Create Date: 2026-05-04 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_feedback_monitoring_calendar"
down_revision: Union[str, None] = "002_f4_runtime_contracts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "crop_outcomes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("field_id", sa.String(length=50), nullable=False),
        sa.Column("crop_id", sa.String(length=50), nullable=False),
        sa.Column("actual_crop_id", sa.String(length=50), nullable=False),
        sa.Column("season", sa.String(length=20), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("actual_yield_t_ha", sa.Float(), nullable=True),
        sa.Column("actual_sale_price_kg", sa.Float(), nullable=True),
        sa.Column("actual_water_used_mm", sa.Float(), nullable=True),
        sa.Column("recommendation_id", sa.Integer(), nullable=True),
        sa.Column("feedback_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("submitted_by", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"]),
        sa.ForeignKeyConstraint(["crop_id"], ["crops.id"]),
        sa.ForeignKeyConstraint(["actual_crop_id"], ["crops.id"]),
        sa.ForeignKeyConstraint(["recommendation_id"], ["recommendations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_crop_outcomes_field_season", "crop_outcomes", ["field_id", "season"])
    op.create_index("ix_crop_outcomes_crop_season", "crop_outcomes", ["crop_id", "season"])

    op.create_table(
        "model_monitoring_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_date", sa.Date(), nullable=False),
        sa.Column("scheme_id", sa.String(length=50), nullable=True),
        sa.Column("crop_id", sa.String(length=50), nullable=True),
        sa.Column("model_name", sa.String(length=50), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
        sa.Column("mae", sa.Float(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("r2_score", sa.Float(), nullable=True),
        sa.Column("drift_detected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("drift_features", sa.JSON(), nullable=True),
        sa.Column("report_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_model_monitoring_run_date", "model_monitoring_runs", ["run_date"])
    op.create_index("ix_model_monitoring_model_name", "model_monitoring_runs", ["model_name"])
    op.create_index("ix_model_monitoring_scheme_id", "model_monitoring_runs", ["scheme_id"])

    op.create_table(
        "plan_b_trigger_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("field_id", sa.String(length=50), nullable=False),
        sa.Column("season", sa.String(length=20), nullable=False),
        sa.Column("trigger_type", sa.String(length=30), nullable=False),
        sa.Column("trigger_value", sa.Float(), nullable=True),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("previous_crop_id", sa.String(length=50), nullable=True),
        sa.Column("new_crop_id", sa.String(length=50), nullable=True),
        sa.Column("plan_b_recommendation_id", sa.Integer(), nullable=True),
        sa.Column("notified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["plan_b_recommendation_id"], ["recommendations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_b_field_season", "plan_b_trigger_events", ["field_id", "season"])
    op.create_index("ix_plan_b_trigger_type", "plan_b_trigger_events", ["trigger_type"])

    op.create_table(
        "crop_calendars",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("recommendation_id", sa.Integer(), nullable=True),
        sa.Column("field_id", sa.String(length=50), nullable=False),
        sa.Column("crop_id", sa.String(length=50), nullable=False),
        sa.Column("season", sa.String(length=20), nullable=False),
        sa.Column("planting_window_start", sa.Date(), nullable=True),
        sa.Column("planting_window_end", sa.Date(), nullable=True),
        sa.Column("irrigation_windows", sa.JSON(), nullable=True),
        sa.Column("fertilizer_windows", sa.JSON(), nullable=True),
        sa.Column("harvest_window_start", sa.Date(), nullable=True),
        sa.Column("harvest_window_end", sa.Date(), nullable=True),
        sa.Column("expected_market_week", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["recommendation_id"], ["recommendations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_crop_calendars_field_season", "crop_calendars", ["field_id", "season"])
    op.create_index("ix_crop_calendars_recommendation_id", "crop_calendars", ["recommendation_id"])

    op.create_table(
        "scheme_oversupply_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scheme_id", sa.String(length=50), nullable=False),
        sa.Column("season", sa.String(length=20), nullable=False),
        sa.Column("crop_id", sa.String(length=50), nullable=False),
        sa.Column("crop_name", sa.String(length=100), nullable=True),
        sa.Column("area_allocated_ha", sa.Float(), nullable=True),
        sa.Column("pct_of_scheme", sa.Float(), nullable=True),
        sa.Column("alert_threshold_pct", sa.Float(), nullable=True),
        sa.Column("price_trend_pct", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="warning"),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_oversupply_scheme_season", "scheme_oversupply_alerts", ["scheme_id", "season"])
    op.create_index("ix_oversupply_resolved", "scheme_oversupply_alerts", ["resolved"])


def downgrade() -> None:
    op.drop_table("scheme_oversupply_alerts")
    op.drop_table("crop_calendars")
    op.drop_table("plan_b_trigger_events")
    op.drop_table("model_monitoring_runs")
    op.drop_table("crop_outcomes")

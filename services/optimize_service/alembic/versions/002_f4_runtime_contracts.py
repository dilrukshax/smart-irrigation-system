"""Add F4 runtime contract/persistence columns and run artifacts table.

Revision ID: 002_f4_runtime_contracts
Revises: 001_initial
Create Date: 2026-03-09 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_f4_runtime_contracts"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # fields metadata needed by F4 feature/adaptive flows.
    op.add_column("fields", sa.Column("location", sa.String(length=120), nullable=True))
    op.add_column("fields", sa.Column("soil_suitability", sa.Float(), nullable=True))
    op.add_column("fields", sa.Column("water_availability_mm", sa.Float(), nullable=True))

    # crops metadata needed by optimization and adaptive endpoints.
    op.add_column("crops", sa.Column("water_requirement_mm", sa.Float(), nullable=True))

    op.create_table(
        "optimization_run_artifacts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_type", sa.String(length=32), nullable=False),
        sa.Column("field_id", sa.String(length=50), nullable=True),
        sa.Column("season", sa.String(length=32), nullable=True),
        sa.Column("request_payload", sa.JSON(), nullable=True),
        sa.Column("response_payload", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ok"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="optimization_service"),
        sa.Column("data_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("observed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_optimization_run_artifacts_run_type", "optimization_run_artifacts", ["run_type"])
    op.create_index("ix_optimization_run_artifacts_field_id", "optimization_run_artifacts", ["field_id"])
    op.create_index("ix_optimization_run_artifacts_season", "optimization_run_artifacts", ["season"])
    op.create_index("ix_optimization_run_artifacts_status", "optimization_run_artifacts", ["status"])
    op.create_index("ix_optimization_run_artifacts_observed_at", "optimization_run_artifacts", ["observed_at"])
    op.create_index("ix_optimization_run_artifacts_created_at", "optimization_run_artifacts", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_optimization_run_artifacts_created_at", table_name="optimization_run_artifacts")
    op.drop_index("ix_optimization_run_artifacts_observed_at", table_name="optimization_run_artifacts")
    op.drop_index("ix_optimization_run_artifacts_status", table_name="optimization_run_artifacts")
    op.drop_index("ix_optimization_run_artifacts_season", table_name="optimization_run_artifacts")
    op.drop_index("ix_optimization_run_artifacts_field_id", table_name="optimization_run_artifacts")
    op.drop_index("ix_optimization_run_artifacts_run_type", table_name="optimization_run_artifacts")
    op.drop_table("optimization_run_artifacts")

    op.drop_column("crops", "water_requirement_mm")

    op.drop_column("fields", "water_availability_mm")
    op.drop_column("fields", "soil_suitability")
    op.drop_column("fields", "location")

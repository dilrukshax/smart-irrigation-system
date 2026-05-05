"""Add is_synthetic and source_tag provenance columns to historical_yields and price_records.

Revision ID: 004_data_ingestion_columns
Revises: 003_feedback_monitoring_calendar
Create Date: 2026-05-04 12:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_data_ingestion_columns"
down_revision: Union[str, None] = "003_feedback_monitoring_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "historical_yields",
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "historical_yields",
        sa.Column("source_tag", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "price_records",
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "price_records",
        sa.Column("source_tag", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("price_records", "source_tag")
    op.drop_column("price_records", "is_synthetic")
    op.drop_column("historical_yields", "source_tag")
    op.drop_column("historical_yields", "is_synthetic")

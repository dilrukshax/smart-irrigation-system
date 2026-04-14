"""add soil_type to irrigation crop fields

Revision ID: 20260413_0003
Revises: 20260412_0002
Create Date: 2026-04-13 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260413_0003"
down_revision = "20260412_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("irrigation_crop_fields", schema="public")}
    if "soil_type" not in columns:
        op.add_column("irrigation_crop_fields", sa.Column("soil_type", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("irrigation_crop_fields", "soil_type")

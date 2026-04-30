"""add irrigation_field_observations table

Revision ID: 20260430_0004
Revises: 20260413_0003
Create Date: 2026-04-30 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260430_0004"
down_revision = "20260413_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "irrigation_field_observations" in inspector.get_table_names(schema="public"):
        return

    op.create_table(
        "irrigation_field_observations",
        sa.Column("observation_id", sa.String(length=36), primary_key=True),
        sa.Column(
            "field_id",
            sa.String(length=128),
            sa.ForeignKey("irrigation_crop_fields.field_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("prediction_label", sa.String(length=120), nullable=True),
        sa.Column("prediction_confidence", sa.Float(), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_field_observations_field_time",
        "irrigation_field_observations",
        ["field_id", "created_at"],
        postgresql_using="btree",
    )
    op.create_index(
        "idx_field_observations_kind",
        "irrigation_field_observations",
        ["kind"],
    )


def downgrade() -> None:
    op.drop_index("idx_field_observations_kind", table_name="irrigation_field_observations")
    op.drop_index("idx_field_observations_field_time", table_name="irrigation_field_observations")
    op.drop_table("irrigation_field_observations")

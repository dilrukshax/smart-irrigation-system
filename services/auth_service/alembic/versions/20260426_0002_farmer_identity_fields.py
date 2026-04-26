"""add farmer identity fields

Revision ID: 20260426_0002
Revises: 20260412_0001
Create Date: 2026-04-26 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260426_0002"
down_revision = "20260412_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users", schema="public")}
    indexes = {index["name"] for index in inspector.get_indexes("users", schema="public")}

    if "full_name" not in columns:
        op.add_column("users", sa.Column("full_name", sa.String(length=120), nullable=True))
    if "national_id" not in columns:
        op.add_column("users", sa.Column("national_id", sa.String(length=32), nullable=True))
    if "phone_number" not in columns:
        op.add_column("users", sa.Column("phone_number", sa.String(length=32), nullable=True))

    national_id_index = op.f("ix_users_national_id")
    if national_id_index not in indexes:
        op.create_index(
            national_id_index,
            "users",
            ["national_id"],
            unique=True,
            postgresql_where=sa.text("national_id IS NOT NULL"),
        )


def downgrade() -> None:
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("users", schema="public")}
    national_id_index = op.f("ix_users_national_id")
    if national_id_index in indexes:
        op.drop_index(national_id_index, table_name="users")

    op.drop_column("users", "phone_number")
    op.drop_column("users", "national_id")
    op.drop_column("users", "full_name")

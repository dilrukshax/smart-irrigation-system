"""authority and scheme assignments baseline

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


_ALLOWED = ("farmer", "officer", "authority")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names(schema="public"))

    if "scheme_assignments" not in tables:
        op.create_table(
            "scheme_assignments",
            sa.Column("assignment_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("scheme_id", sa.String(length=128), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("assignment_id"),
            sa.UniqueConstraint("user_id", "scheme_id", name="uq_scheme_assignment_user_scheme"),
        )
        tables.add("scheme_assignments")

    if "scheme_assignments" in tables:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("scheme_assignments", schema="public")}
        scheme_idx = op.f("ix_scheme_assignments_scheme_id")
        user_idx = op.f("ix_scheme_assignments_user_id")
        if scheme_idx not in existing_indexes:
            op.create_index(scheme_idx, "scheme_assignments", ["scheme_id"], unique=False)
        if user_idx not in existing_indexes:
            op.create_index(user_idx, "scheme_assignments", ["user_id"], unique=False)

    if "users" in tables:
        # Normalize roles from legacy model:
        # - admin -> authority
        # - remove user pseudo-role
        # - default empty role arrays to farmer
        op.execute(
            """
            UPDATE users
            SET roles = COALESCE(
                (
                    SELECT ARRAY(
                        SELECT DISTINCT normalized_role
                        FROM (
                            SELECT CASE
                                WHEN role = 'admin' THEN 'authority'
                                WHEN role = 'user' THEN NULL
                                ELSE role
                            END AS normalized_role
                            FROM unnest(roles) AS role
                        ) t
                        WHERE normalized_role IS NOT NULL
                        AND normalized_role = ANY(ARRAY['farmer','officer','authority'])
                    )
                ),
                ARRAY['farmer']::varchar[]
            )
            """
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_scheme_assignments_user_id"), table_name="scheme_assignments")
    op.drop_index(op.f("ix_scheme_assignments_scheme_id"), table_name="scheme_assignments")
    op.drop_table("scheme_assignments")

    # Best-effort rollback role mapping
    op.execute(
        """
        UPDATE users
        SET roles = COALESCE(
            (
                SELECT ARRAY(
                    SELECT DISTINCT normalized_role
                    FROM (
                        SELECT CASE
                            WHEN role = 'authority' THEN 'admin'
                            ELSE role
                        END AS normalized_role
                        FROM unnest(roles) AS role
                    ) t
                    WHERE normalized_role IS NOT NULL
                )
            ),
            ARRAY['user']::varchar[]
        )
        """
    )

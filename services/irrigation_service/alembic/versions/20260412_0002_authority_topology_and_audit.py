"""authority topology and audit completion

Revision ID: 20260412_0002
Revises: 20260412_0001
Create Date: 2026-04-12 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260412_0002"
down_revision = "20260412_0001"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names(schema="public")


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name, schema="public"))


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name, schema="public"))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _column_exists(inspector, "irrigation_manual_requests", "closed_by"):
        op.add_column("irrigation_manual_requests", sa.Column("closed_by", sa.String(length=128), nullable=True))

    if not _column_exists(inspector, "irrigation_hydraulic_schedules", "policy_id"):
        op.add_column("irrigation_hydraulic_schedules", sa.Column("policy_id", sa.String(length=36), nullable=True))
    if not _column_exists(inspector, "irrigation_hydraulic_schedules", "policy_version"):
        op.add_column("irrigation_hydraulic_schedules", sa.Column("policy_version", sa.Integer(), nullable=True))

    schedules_policy_idx = op.f("ix_irrigation_hydraulic_schedules_policy_id")
    if not _index_exists(inspector, "irrigation_hydraulic_schedules", schedules_policy_idx):
        op.create_index(
            schedules_policy_idx,
            "irrigation_hydraulic_schedules",
            ["policy_id"],
            unique=False,
        )

    if not _table_exists(inspector, "irrigation_hydraulic_topology_nodes"):
        op.create_table(
            "irrigation_hydraulic_topology_nodes",
            sa.Column("node_id", sa.String(length=128), nullable=False),
            sa.Column("scheme_id", sa.String(length=128), nullable=False),
            sa.Column("node_type", sa.String(length=16), nullable=False),
            sa.Column("parent_node_id", sa.String(length=128), nullable=True),
            sa.Column("display_name", sa.String(length=255), nullable=False),
            sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["parent_node_id"],
                ["irrigation_hydraulic_topology_nodes.node_id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("node_id"),
        )

    topology_scheme_idx = op.f("ix_irrigation_hydraulic_topology_nodes_scheme_id")
    if not _index_exists(inspector, "irrigation_hydraulic_topology_nodes", topology_scheme_idx):
        op.create_index(
            topology_scheme_idx,
            "irrigation_hydraulic_topology_nodes",
            ["scheme_id"],
            unique=False,
        )

    topology_type_idx = op.f("ix_irrigation_hydraulic_topology_nodes_node_type")
    if not _index_exists(inspector, "irrigation_hydraulic_topology_nodes", topology_type_idx):
        op.create_index(
            topology_type_idx,
            "irrigation_hydraulic_topology_nodes",
            ["node_type"],
            unique=False,
        )

    topology_parent_idx = op.f("ix_irrigation_hydraulic_topology_nodes_parent_node_id")
    if not _index_exists(inspector, "irrigation_hydraulic_topology_nodes", topology_parent_idx):
        op.create_index(
            topology_parent_idx,
            "irrigation_hydraulic_topology_nodes",
            ["parent_node_id"],
            unique=False,
        )

    if not _table_exists(inspector, "irrigation_authority_policy_audit"):
        op.create_table(
            "irrigation_authority_policy_audit",
            sa.Column("audit_id", sa.String(length=36), nullable=False),
            sa.Column("policy_id", sa.String(length=36), nullable=False),
            sa.Column("scheme_id", sa.String(length=128), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=32), nullable=False),
            sa.Column("actor_id", sa.String(length=128), nullable=True),
            sa.Column("actor_roles", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["policy_id"],
                ["irrigation_authority_policies.policy_id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("audit_id"),
        )

    policy_audit_policy_idx = op.f("ix_irrigation_authority_policy_audit_policy_id")
    if not _index_exists(inspector, "irrigation_authority_policy_audit", policy_audit_policy_idx):
        op.create_index(
            policy_audit_policy_idx,
            "irrigation_authority_policy_audit",
            ["policy_id"],
            unique=False,
        )

    policy_audit_scheme_idx = op.f("ix_irrigation_authority_policy_audit_scheme_id")
    if not _index_exists(inspector, "irrigation_authority_policy_audit", policy_audit_scheme_idx):
        op.create_index(
            policy_audit_scheme_idx,
            "irrigation_authority_policy_audit",
            ["scheme_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_irrigation_authority_policy_audit_scheme_id"),
        table_name="irrigation_authority_policy_audit",
    )
    op.drop_index(
        op.f("ix_irrigation_authority_policy_audit_policy_id"),
        table_name="irrigation_authority_policy_audit",
    )
    op.drop_table("irrigation_authority_policy_audit")

    op.drop_index(
        op.f("ix_irrigation_hydraulic_topology_nodes_parent_node_id"),
        table_name="irrigation_hydraulic_topology_nodes",
    )
    op.drop_index(
        op.f("ix_irrigation_hydraulic_topology_nodes_node_type"),
        table_name="irrigation_hydraulic_topology_nodes",
    )
    op.drop_index(
        op.f("ix_irrigation_hydraulic_topology_nodes_scheme_id"),
        table_name="irrigation_hydraulic_topology_nodes",
    )
    op.drop_table("irrigation_hydraulic_topology_nodes")

    op.drop_index(
        op.f("ix_irrigation_hydraulic_schedules_policy_id"),
        table_name="irrigation_hydraulic_schedules",
    )
    op.drop_column("irrigation_hydraulic_schedules", "policy_version")
    op.drop_column("irrigation_hydraulic_schedules", "policy_id")

    op.drop_column("irrigation_manual_requests", "closed_by")

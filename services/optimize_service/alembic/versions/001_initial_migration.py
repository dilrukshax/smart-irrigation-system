"""Initial migration - Create base tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-15 00:00:00.000000

This migration creates the initial database schema for the ACA-O service:
- fields: Agricultural field definitions
- crops: Crop varieties and requirements
- historical_yields: Past yield records for ML training
- price_records: Market price history
- recommendations: Generated recommendation tracking
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial database schema."""
    
    # Create fields table
    op.create_table(
        'fields',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('scheme_id', sa.String(50), nullable=False),
        sa.Column('area_ha', sa.Float, nullable=False),
        sa.Column('soil_type', sa.String(50), nullable=True),
        sa.Column('soil_ph', sa.Float, nullable=True),
        sa.Column('soil_ec', sa.Float, nullable=True),
        sa.Column('latitude', sa.Float, nullable=True),
        sa.Column('longitude', sa.Float, nullable=True),
        sa.Column('elevation_m', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_fields_id', 'fields', ['id'])
    op.create_index('ix_fields_scheme_id', 'fields', ['scheme_id'])
    
    # Create crops table
    op.create_table(
        'crops',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('kc_curve_ref', sa.JSON, nullable=True),
        sa.Column('growth_duration_days', sa.Integer, nullable=True),
        sa.Column('ph_min', sa.Float, server_default='5.5'),
        sa.Column('ph_max', sa.Float, server_default='7.5'),
        sa.Column('ec_max', sa.Float, server_default='4.0'),
        sa.Column('water_sensitivity', sa.String(20), server_default='medium'),
        sa.Column('base_yield_t_per_ha', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_crops_id', 'crops', ['id'])
    
    # Create historical_yields table
    op.create_table(
        'historical_yields',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('field_id', sa.String(50), sa.ForeignKey('fields.id'), nullable=False),
        sa.Column('crop_id', sa.String(50), sa.ForeignKey('crops.id'), nullable=False),
        sa.Column('season', sa.String(20), nullable=False),
        sa.Column('year', sa.Integer, nullable=False),
        sa.Column('yield_t_per_ha', sa.Float, nullable=False),
        sa.Column('water_used_mm', sa.Float, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('recorded_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_historical_yields_field_id', 'historical_yields', ['field_id'])
    op.create_index('ix_historical_yields_crop_id', 'historical_yields', ['crop_id'])
    op.create_index('ix_historical_yields_season', 'historical_yields', ['season'])
    
    # Create price_records table
    op.create_table(
        'price_records',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('crop_id', sa.String(50), sa.ForeignKey('crops.id'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('price_per_kg', sa.Float, nullable=False),
        sa.Column('market_name', sa.String(100), nullable=True),
        sa.Column('price_type', sa.String(20), server_default='farmgate'),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('recorded_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_price_records_crop_id', 'price_records', ['crop_id'])
    op.create_index('ix_price_records_date', 'price_records', ['date'])
    
    # Create recommendations table
    op.create_table(
        'recommendations',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('field_id', sa.String(50), nullable=False),
        sa.Column('season', sa.String(20), nullable=False),
        sa.Column('request_data', sa.JSON, nullable=True),
        sa.Column('response_data', sa.JSON, nullable=True),
        sa.Column('selected_crop_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_recommendations_field_id', 'recommendations', ['field_id'])
    op.create_index('ix_recommendations_season', 'recommendations', ['season'])


def downgrade() -> None:
    """Remove all tables."""
    op.drop_table('recommendations')
    op.drop_table('price_records')
    op.drop_table('historical_yields')
    op.drop_table('crops')
    op.drop_table('fields')

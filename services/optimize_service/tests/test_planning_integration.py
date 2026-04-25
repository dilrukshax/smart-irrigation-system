"""Planning-loop integration tests (F1/F2/F3 -> F4)."""

from unittest.mock import patch

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.schemas import RecommendationRequest
from app.data.db import SessionLocal
from app.data.models_orm import Crop, Field
from app.features import feature_builder as feature_builder_module
from app.features.feature_builder import FeatureBuilder
from app.services.recommendation_service import RecommendationService
from app.services.supply_service import SupplyService


def _require_database(db):
    try:
        db.execute(text("SELECT 1"))
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL is not available for integration test: {exc}")


def _ensure_seed_rows(db):
    if not db.query(Field).filter(Field.id == "FIELD-001").first():
        db.add(
            Field(
                id="FIELD-001",
                name="Udawalawe Block A",
                scheme_id="UDA-01",
                area_ha=4.5,
                soil_type="loam",
                soil_ph=6.4,
                soil_ec=1.2,
                location="Udawalawe",
                latitude=6.4270,
                longitude=80.8200,
                elevation_m=120.0,
                soil_suitability=0.82,
                water_availability_mm=5400.0,
            )
        )
    if not db.query(Crop).filter(Crop.id == "CROP-001").first():
        db.add(
            Crop(
                id="CROP-001",
                name="Paddy BG-352",
                category="cereal",
                growth_duration_days=120,
                water_sensitivity="high",
                base_yield_t_per_ha=4.8,
                water_requirement_mm=1200.0,
                ph_min=5.5,
                ph_max=7.0,
                ec_max=3.0,
            )
        )
    if not db.query(Crop).filter(Crop.id == "CROP-002").first():
        db.add(
            Crop(
                id="CROP-002",
                name="Green Gram",
                category="pulse",
                growth_duration_days=90,
                water_sensitivity="low",
                base_yield_t_per_ha=1.7,
                water_requirement_mm=450.0,
                ph_min=6.0,
                ph_max=7.8,
                ec_max=4.2,
            )
        )
    db.commit()


class _MockResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _mock_requests_get(url, params=None, timeout=5):
    if url.endswith('/api/weather/forecast'):
        return _MockResponse(
            {
                'daily': [
                    {'evapotranspiration_mm': 5.2, 'rain_mm': 2.0},
                    {'evapotranspiration_mm': 5.0, 'rain_mm': 1.0},
                    {'evapotranspiration_mm': 4.8, 'rain_mm': 4.0},
                    {'evapotranspiration_mm': 5.1, 'rain_mm': 0.0},
                    {'evapotranspiration_mm': 5.3, 'rain_mm': 0.0},
                ],
                'summary': {
                    'average_temp_c': 29.0,
                    'total_precipitation_7d_mm': 18.0,
                },
            }
        )
    if url.endswith('/api/weather/irrigation-recommendation'):
        return _MockResponse(
            {
                'weekly_outlook': {
                    'average_irrigation_adjustment_percent': 130,
                    'net_water_balance_mm': -12,
                },
                'overall_recommendation': 'INCREASE',
            }
        )
    if '/api/v1/crop-fields/fields/' in url and url.endswith('/status'):
        return _MockResponse(
            {
                'current_water_level_pct': 38.0,
                'current_soil_moisture_pct': 52.0,
                'sensor_connected': True,
            }
        )
    if '/api/v1/crop-health/fields/' in url and url.endswith('/stress-summary'):
        return _MockResponse(
            {
                'stress_index': 0.74,
                'priority': 'high',
                'stress_penalty_factor': 0.31,
            }
        )
    return _MockResponse({})


def _mock_requests_get_unavailable(url, params=None, timeout=5):
    if url.endswith('/api/weather/forecast'):
        return _MockResponse(
            {
                "status": "source_unavailable",
                "data_available": False,
                "message": "forecast timeout",
            }
        )
    if url.endswith('/api/weather/irrigation-recommendation'):
        return _MockResponse(
            {
                "status": "source_unavailable",
                "data_available": False,
                "message": "recommendation unavailable",
            }
        )
    return _mock_requests_get(url, params=params, timeout=timeout)


@patch('app.features.feature_builder.requests.get', side_effect=_mock_requests_get)
def test_feature_builder_uses_live_upstream_context(_mock_get):
    db = SessionLocal()
    try:
        _require_database(db)
        _ensure_seed_rows(db)
        builder = FeatureBuilder(db)
        features = builder.build_features(field_id='FIELD-001', season='Maha-2025')
        assert features

        sample = next(iter(features.values()))
        assert sample['forecast_adjustment_pct'] == 130.0
        assert sample['stress_index'] == 0.74
        assert sample['field_water_level_pct'] == 38.0
        assert sample['adjusted_water_quota_mm'] > sample['water_quota_mm']
    finally:
        db.close()


@patch('app.features.feature_builder.requests.get', side_effect=_mock_requests_get)
def test_recommendation_and_supply_use_generated_outputs(_mock_get):
    db = SessionLocal()
    try:
        _require_database(db)
        _ensure_seed_rows(db)
        service = RecommendationService()
        response = service.get_recommendations(
            request=RecommendationRequest(field_id='FIELD-001', season='Maha-2025'),
            db_session=db,
        )
        assert response.recommendations

        supply = SupplyService().get_supply_summary(
            season='Maha-2025',
            scheme_id=None,
            db_session=db,
        )
        assert supply.items
        assert supply.items[0].total_area_ha > 0
    finally:
        db.close()


@patch('app.features.feature_builder.requests.get', side_effect=_mock_requests_get_unavailable)
def test_feature_builder_respects_contract_unavailable_in_strict_mode(_mock_get):
    db = SessionLocal()
    prev_strict = feature_builder_module.settings.strict_live_data
    feature_builder_module.settings.strict_live_data = True
    try:
        _require_database(db)
        _ensure_seed_rows(db)
        builder = FeatureBuilder(db)
        features = builder.build_features(field_id='FIELD-001', season='Maha-2025')
        assert features == {}
    finally:
        feature_builder_module.settings.strict_live_data = prev_strict
        db.close()

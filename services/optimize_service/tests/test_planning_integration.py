"""Planning-loop integration tests (F1/F2/F3 -> F4)."""

from unittest.mock import patch

from app.core.schemas import RecommendationRequest
from app.data.db import SessionLocal
from app.features.feature_builder import FeatureBuilder
from app.services.recommendation_service import RecommendationService
from app.services.supply_service import SupplyService


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


@patch('app.features.feature_builder.requests.get', side_effect=_mock_requests_get)
def test_feature_builder_uses_live_upstream_context(_mock_get):
    db = SessionLocal()
    try:
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

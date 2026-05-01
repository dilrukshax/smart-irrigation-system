"""Operator optimization route tests."""

from fastapi.testclient import TestClient
import pytest

from app.api import routes_operator
from app.data.db import get_db
from app.data.repositories import CropRepository, FieldRepository, RecommendationRepository, RunArtifactRepository
from app.dependencies.auth import get_current_user_context
from app.features.feature_builder import FeatureBuilder
from app.main import app

client = TestClient(app)


class DummyDb:
    pass


FIELDS = [
    {
        "id": "field-a",
        "name": "North Block",
        "scheme_id": "scheme-a",
        "area_ha": 2.0,
        "soil_type": "Loam",
        "soil_ph": None,
        "soil_ec": None,
        "water_availability_mm": 900.0,
    },
    {
        "id": "field-b",
        "name": "South Block",
        "scheme_id": "scheme-a",
        "area_ha": 1.5,
        "soil_type": "Clay Loam",
        "soil_ph": 6.4,
        "soil_ec": 1.2,
        "water_availability_mm": 650.0,
    },
    {
        "id": "field-c",
        "name": "Other Scheme",
        "scheme_id": "scheme-b",
        "area_ha": 3.0,
        "soil_type": "Sandy Loam",
        "soil_ph": 6.8,
        "soil_ec": 1.0,
        "water_availability_mm": 800.0,
    },
]

RECOMMENDATIONS = [
    {
        "field_id": "field-a",
        "season": "Maha-2025",
        "response_data": {
            "recommendations": [
                {
                    "crop_id": "paddy",
                    "crop_name": "Paddy",
                    "suitability_score": 0.88,
                    "expected_yield_t_per_ha": 5.2,
                    "expected_profit_per_ha": 210000.0,
                    "risk_band": "medium",
                    "rationale": "Strong soil and water fit.",
                }
            ]
        },
    },
    {
        "field_id": "field-b",
        "season": "Maha-2025",
        "response_data": {
            "recommendations": [
                {
                    "crop_id": "chili",
                    "crop_name": "Chili",
                    "suitability_score": 0.81,
                    "expected_yield_t_per_ha": 3.4,
                    "expected_profit_per_ha": 320000.0,
                    "risk_band": "medium",
                    "rationale": "Good return under limited water.",
                }
            ]
        },
    },
]

CROPS = [
    {
        "id": "paddy",
        "name": "Paddy",
        "water_sensitivity": "high",
        "growth_duration_days": 120,
        "ph_min": 5.5,
        "ph_max": 7.0,
        "ec_max": 4.0,
        "base_yield_t_per_ha": 5.0,
        "water_requirement_mm": 600.0,
    },
    {
        "id": "chili",
        "name": "Chili",
        "water_sensitivity": "medium",
        "growth_duration_days": 95,
        "ph_min": 6.0,
        "ph_max": 7.0,
        "ec_max": 4.0,
        "base_yield_t_per_ha": 3.5,
        "water_requirement_mm": 420.0,
    },
]


@pytest.fixture(autouse=True)
def _route_overrides(monkeypatch):
    app.dependency_overrides[get_db] = lambda: DummyDb()
    app.dependency_overrides[get_current_user_context] = lambda: {
        "id": "officer-1",
        "username": "officer",
        "roles": ["officer"],
        "scheme_ids": ["scheme-a"],
    }

    def fake_list_fields(db, scheme_id=None):
        del db
        return [field for field in FIELDS if scheme_id is None or field["scheme_id"] == scheme_id]

    def fake_get_field_by_id(db, field_id):
        del db
        return next((field for field in FIELDS if field["id"] == field_id), None)

    def fake_latest(db_session, season=None, scheme_id=None, limit=500):
        del db_session, limit
        field_ids = {
            field["id"]
            for field in fake_list_fields(None, scheme_id=scheme_id)
        }
        return [
            row
            for row in RECOMMENDATIONS
            if (season is None or row["season"] == season) and row["field_id"] in field_ids
        ]

    def fake_crop_by_id(db_session, crop_id):
        del db_session
        return next((crop for crop in CROPS if crop["id"] == crop_id), None)

    monkeypatch.setattr(FieldRepository, "list_fields", staticmethod(fake_list_fields))
    monkeypatch.setattr(FieldRepository, "get_field_by_id", staticmethod(fake_get_field_by_id))
    monkeypatch.setattr(RecommendationRepository, "list_latest_by_field", staticmethod(fake_latest))
    monkeypatch.setattr(RecommendationRepository, "save_recommendation", staticmethod(lambda *args, **kwargs: 1))
    monkeypatch.setattr(CropRepository, "get_crop_by_id", staticmethod(fake_crop_by_id))
    monkeypatch.setattr(CropRepository, "list_candidate_crops", staticmethod(lambda db_session: CROPS))
    monkeypatch.setattr(RunArtifactRepository, "save_artifact", staticmethod(lambda *args, **kwargs: 1))
    monkeypatch.setattr(routes_operator, "_recent_artifacts", lambda *args, **kwargs: [])
    yield
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user_context, None)


def test_operator_overview_uses_scheme_scoped_backend_rows():
    response = client.get("/f4/operator/overview?season=Maha-2025")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    data = payload["data"]
    assert data["field_count"] == 2
    assert data["fields_with_recommendations"] == 2
    assert data["recommendation_count"] == 2
    assert data["water_budget"]["quota"] == 1550.0
    assert {row["crop_name"] for row in data["top_crops"]} == {"Paddy", "Chili"}


def test_operator_plan_runs_without_admin_role():
    response = client.post(
        "/f4/operator/plan",
        json={
            "season": "Maha-2025",
            "water_quota_mm": 1500,
            "min_paddy_area_ha": 0,
            "max_risk_level": "high",
            "priority": "profit",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    data = payload["data"]
    assert data["field_count"] == 2
    assert data["water_quota_mm"] == 1500
    assert data["allocation"]
    assert data["summary"]["total_area"] > 0


def test_operator_scenario_evaluate_handles_missing_soil_measurements(monkeypatch):
    monkeypatch.setattr(
        FeatureBuilder,
        "_get_climate_forecast",
        lambda self, field, season: {
            "season": season,
            "avg_temp_c": 28.0,
            "total_rainfall_mm": 250.0,
            "eto_mm_per_day": [5.0] * 5,
            "rainfall_mm": [50.0] * 5,
            "forecast_adjustment_pct": 100.0,
            "data_available": True,
            "status": "ok",
            "source": "forecasting_service",
        },
    )
    monkeypatch.setattr(
        FeatureBuilder,
        "_get_irrigation_context",
        lambda self, field_id: {
            "water_level_pct": 60.0,
            "soil_moisture_pct": 35.0,
            "sensor_connected": True,
            "data_available": True,
            "status": "ok",
            "source": "irrigation_service",
        },
    )
    monkeypatch.setattr(
        FeatureBuilder,
        "_get_stress_context",
        lambda self, field_id: {
            "stress_index": 0.1,
            "stress_priority": "low",
            "stress_penalty_factor": 0.0,
            "data_available": True,
            "status": "ok",
            "source": "crop_health_service",
        },
    )

    response = client.post(
        "/f4/operator/scenario-evaluate",
        json={
            "scenario_name": "missing soil chemistry",
            "season": "Maha-2025",
            "water_quota_mm": 1500,
            "max_risk_level": "high",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["fields_evaluated"] == 2
    assert data["fields_with_data"] == 2
    assert data["allocation"]


def test_operator_routes_reject_farmer_role():
    app.dependency_overrides[get_current_user_context] = lambda: {
        "id": "farmer-1",
        "username": "farmer",
        "roles": ["farmer"],
        "scheme_ids": ["scheme-a"],
    }

    response = client.get("/f4/operator/overview?season=Maha-2025")

    assert response.status_code == 403

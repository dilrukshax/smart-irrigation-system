"""Tests for the farmer-facing crop optimization routes (/f4/farmer/*).

These mock at the route boundary (field repo, upstream fetchers, the
adaptive engine, and persistence helpers) so the suite runs without a
PostgreSQL instance and without exercising the ML models.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api import routes_farmer
from app.core.schemas import (
    AdaptiveCropRecommendation,
    AdaptiveRecommendationResponse,
    InputParameterSummary,
)
from app.data.db import get_db
from app.dependencies.auth import get_current_user_context
from app.main import app
from app.services import farmer_service


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


client = TestClient(app)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture(autouse=True)
def overrides(mock_db):
    app.dependency_overrides[get_current_user_context] = lambda: {
        "id": "test-user",
        "username": "tester",
        "roles": ["farmer"],
    }
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_current_user_context, None)
    app.dependency_overrides.pop(get_db, None)


def _field_row(**overrides: Any) -> Dict[str, Any]:
    base = {
        "id": "FIELD-001",
        "name": "Udawalawe Block A",
        "scheme_id": "UDA-01",
        "area_ha": 4.5,
        "soil_type": "Loam",
        "soil_ph": 6.4,
        "soil_ec": 1.2,
        "location": "Udawalawe",
        "latitude": 6.4270,
        "longitude": 80.8200,
        "elevation_m": 120.0,
        "soil_suitability": 0.82,
        "water_availability_mm": 5400.0,
    }
    base.update(overrides)
    return base


def _adaptive_recommendation(**overrides: Any) -> AdaptiveCropRecommendation:
    base = dict(
        rank=1,
        crop_id="CROP-002",
        crop_name="Green Gram",
        suitability_score=0.78,
        combined_score=0.71,
        predicted_yield_t_ha=1.7,
        predicted_price_per_kg=150.0,
        gross_revenue_per_ha=255000.0,
        estimated_cost_per_ha=80000.0,
        profit_per_ha=175000.0,
        roi_percentage=218.7,
        risk_level="low",
        risk_factors=[],
        water_requirement_mm=450.0,
        growth_duration_days=90,
        water_sensitivity="low",
        rationale="High soil and climate suitability. Low risk profile",
        confidence=0.85,
    )
    base.update(overrides)
    return AdaptiveCropRecommendation(**base)


def _adaptive_response(
    recommendations: List[AdaptiveCropRecommendation] | None = None,
) -> AdaptiveRecommendationResponse:
    recs = (
        recommendations
        if recommendations is not None
        else [_adaptive_recommendation()]
    )
    return AdaptiveRecommendationResponse(
        success=True,
        message="ok",
        status="ok",
        source="optimization_service",
        is_live=True,
        observed_at="2026-04-27T00:00:00",
        staleness_sec=0.0,
        quality="good",
        data_available=bool(recs),
        input_summary=InputParameterSummary(
            field_area_ha=4.5,
            soil_ph=6.4,
            soil_suitability=0.82,
            water_availability_mm=5400.0,
            water_quota_mm=5400.0,
            season_avg_temp=27.5,
            season_rainfall_mm=350.0,
            location="Udawalawe",
            season="Maha-2025",
            price_factor=1.0,
            crops_evaluated=2,
        ),
        recommendations=recs,
        total_crops_evaluated=2,
        average_suitability=0.78,
        best_profit_per_ha=175000.0,
        models_used=["Fuzzy-TOPSIS"],
        processing_time_ms=12.0,
    )


async def _async_none(*_args, **_kwargs):
    return None


# ---------------------------------------------------------------------------
# /recommend
# ---------------------------------------------------------------------------


class TestFarmerRecommend:
    def test_returns_200_and_field_context(self):
        with patch.object(
            routes_farmer.FieldRepository, "get_field_by_id", return_value=_field_row()
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            return_value=_adaptive_response(),
        ), patch.object(
            routes_farmer.RecommendationRepository,
            "save_recommendation",
            return_value=42,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={
                    "field_id": "FIELD-001",
                    "soil_type": "Loam",
                    "season": "Maha-2025",
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["field_context"]["field_id"] == "FIELD-001"
        assert body["field_context"]["soil_type"] == "Loam"
        assert body["field_context"]["water_band"] == "high"
        assert body["field_context"]["season"] == "Maha-2025"
        assert body["recommendations"][0]["crop_id"] == "CROP-002"
        # Contract fields preserved.
        for key in ("status", "source", "is_live", "data_available", "observed_at"):
            assert key in body

    def test_returns_404_when_field_missing(self):
        async def _async_none(*_args, **_kwargs):
            return None

        with patch.object(
            routes_farmer.FieldRepository, "get_field_by_id", return_value=None
        ), patch.object(
            farmer_service, "fetch_field_from_irrigation", side_effect=_async_none
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={
                    "field_id": "MISSING",
                    "soil_type": "Loam",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 404

    def test_lazy_syncs_missing_field_from_irrigation(self):
        """When F4 lookup misses but F1 has the field, fetch + upsert + proceed."""
        f1_field = {
            "field_id": "field-6513b888",
            "field_name": "Hill Plot",
            "scheme_id": "H-04",
            "area_hectares": 2.0,
            "soil_type": "Reddish-Brown Earth",
            "latitude": 7.7180,
            "longitude": 80.7550,
            "location_name": "Mahaweli H-04",
        }

        async def _f1_fetch(*_args, **_kwargs):
            return f1_field

        with patch.object(
            routes_farmer.FieldRepository,
            "get_field_by_id",
            return_value=None,
        ), patch.object(
            farmer_service, "fetch_field_from_irrigation", side_effect=_f1_fetch
        ), patch.object(
            routes_farmer, "_upsert_field_from_irrigation", return_value=None
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            return_value=_adaptive_response(),
        ), patch.object(
            routes_farmer.RecommendationRepository,
            "save_recommendation",
            return_value=99,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={
                    "field_id": "field-6513b888",
                    "soil_type": "Red Loam",
                    "season": "Yala-2026",
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["field_context"]["field_id"] == "field-6513b888"
        assert body["field_context"]["area_ha"] == 2.0
        # 500 mm default seasonal availability when F1 has none → medium band.
        assert body["field_context"]["water_band"] == "medium"

    def test_infers_season_when_omitted(self):
        with patch.object(
            routes_farmer.FieldRepository, "get_field_by_id", return_value=_field_row()
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            return_value=_adaptive_response(),
        ), patch.object(
            routes_farmer.RecommendationRepository,
            "save_recommendation",
            return_value=1,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={"field_id": "FIELD-001", "soil_type": "Loam"},
            )

        assert resp.status_code == 200
        season = resp.json()["field_context"]["season"]
        assert season.startswith("Maha-") or season.startswith("Yala-")

    def test_low_water_field_classifies_low_band(self):
        with patch.object(
            routes_farmer.FieldRepository,
            "get_field_by_id",
            return_value=_field_row(water_availability_mm=120.0),
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            return_value=_adaptive_response(),
        ), patch.object(
            routes_farmer.RecommendationRepository,
            "save_recommendation",
            return_value=1,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={
                    "field_id": "FIELD-001",
                    "soil_type": "Sandy Loam",
                    "season": "Yala-2026",
                },
            )

        assert resp.status_code == 200
        ctx = resp.json()["field_context"]
        assert ctx["water_band"] == "low"
        assert "short-duration" in ctx["water_explanation"]

    def test_data_unavailable_when_engine_returns_no_recs(self):
        with patch.object(
            routes_farmer.FieldRepository, "get_field_by_id", return_value=_field_row()
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            return_value=_adaptive_response(recommendations=[]),
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/recommend",
                json={
                    "field_id": "FIELD-001",
                    "soil_type": "Loam",
                    "season": "Maha-2025",
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["recommendations"] == []
        assert body["status"] == "data_unavailable"
        assert body["data_available"] is False

    def test_validation_rejects_missing_field(self):
        resp = client.post(
            "/f4/farmer/recommend",
            json={"soil_type": "Loam", "season": "Maha-2025"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /area-optimize
# ---------------------------------------------------------------------------


class TestFarmerAreaOptimize:
    def test_area_optimize_ranks_best_crop_across_scenarios(self):
        captured_requests: List[Any] = []

        async def _adaptive_for_scenario(request, *_args, **_kwargs):
            captured_requests.append(request)
            if request.field_params.soil_type == "Clay":
                return _adaptive_response(
                    [
                        _adaptive_recommendation(
                            crop_id="CROP-PADDY",
                            crop_name="Paddy",
                            combined_score=0.86,
                            suitability_score=0.88,
                            profit_per_ha=140000,
                            roi_percentage=160,
                            water_requirement_mm=900,
                            water_sensitivity="high",
                        )
                    ]
                )
            return _adaptive_response(
                [
                    _adaptive_recommendation(
                        crop_id="CROP-GG",
                        crop_name="Green Gram",
                        combined_score=0.82,
                        suitability_score=0.8,
                        profit_per_ha=175000,
                        roi_percentage=218,
                        water_requirement_mm=450,
                        water_sensitivity="low",
                    )
                ]
            )

        with patch.object(
            routes_farmer.FieldRepository,
            "get_field_by_id",
            return_value=_field_row(),
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service, "fetch_weather_summary", side_effect=_async_none
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            side_effect=_adaptive_for_scenario,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/area-optimize",
                json={
                    "mode": "fields",
                    "field_ids": ["FIELD-001"],
                    "season": "Yala-2026",
                    "scenarios": [
                        {
                            "scenario_id": "dry-sandy",
                            "title": "Dry sandy loam",
                            "soil_type": "Sandy Loam",
                            "season_rainfall_mm": 120,
                            "water_availability_mm": 220,
                        },
                        {
                            "scenario_id": "wet-clay",
                            "title": "Wet clay",
                            "soil_type": "Clay",
                            "season_rainfall_mm": 560,
                            "water_availability_mm": 900,
                        },
                    ],
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["selection"]["field_count"] == 1
        assert len(body["scenarios"]) == 2
        assert body["scenarios"][0]["best_crop"]["crop_id"] == "CROP-GG"
        assert body["scenarios"][1]["best_crop"]["crop_id"] == "CROP-PADDY"
        assert body["best_crop"]["appearances"] == 1
        assert {item["crop_id"] for item in body["crop_rankings"]} == {
            "CROP-GG",
            "CROP-PADDY",
        }
        assert captured_requests[0].field_params.soil_type == "Sandy Loam"
        assert captured_requests[0].weather_params.season_rainfall_mm == 120
        assert captured_requests[0].water_params.water_availability_mm == 220
        assert captured_requests[1].field_params.soil_type == "Clay"

    def test_area_optimize_empty_selection_degrades(self):
        with patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/area-optimize",
                json={"mode": "fields", "field_ids": []},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "data_unavailable"
        assert body["data_available"] is False
        assert body["selection"]["field_count"] == 0
        assert body["crop_rankings"] == []

    def test_area_optimize_reports_missing_field_ids(self):
        async def _missing(*_args, **_kwargs):
            return None

        with patch.object(
            routes_farmer.FieldRepository, "get_field_by_id", return_value=None
        ), patch.object(
            farmer_service, "fetch_field_from_irrigation", side_effect=_missing
        ):
            resp = client.post(
                "/f4/farmer/area-optimize",
                json={"mode": "fields", "field_ids": ["MISSING"]},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "data_unavailable"
        assert body["selection"]["missing_field_ids"] == ["MISSING"]

    def test_area_optimize_default_scenarios_when_none_provided(self):
        async def _adaptive_default(request, *_args, **_kwargs):
            return _adaptive_response([_adaptive_recommendation()])

        with patch.object(
            routes_farmer.FieldRepository,
            "get_field_by_id",
            return_value=_field_row(soil_type="Loam", water_availability_mm=500),
        ), patch.object(
            farmer_service, "fetch_reservoir_snapshot", side_effect=_async_none
        ), patch.object(
            farmer_service,
            "fetch_weather_summary",
            side_effect=_async_none,
        ), patch.object(
            routes_farmer,
            "get_adaptive_recommendations",
            side_effect=_adaptive_default,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/area-optimize",
                json={"mode": "all", "field_ids": ["FIELD-001"]},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert [item["scenario_id"] for item in body["scenarios"]] == [
            "current-plan",
            "drier-season",
            "wetter-season",
        ]
        assert body["best_crop"]["crop_id"] == "CROP-002"


# ---------------------------------------------------------------------------
# /crop-detail
# ---------------------------------------------------------------------------


def _stub_recommendation_row(crop_payload: Dict[str, Any]) -> MagicMock:
    row = MagicMock()
    row.id = 7
    row.field_id = "FIELD-001"
    row.season = "Maha-2025"
    row.selected_crop_id = None
    row.response_data = {
        "field_context": {"field_id": "FIELD-001"},
        "recommendations": [crop_payload],
    }
    return row


class TestFarmerCurrentPlan:
    def test_returns_latest_selected_plan(self):
        crop_payload = _adaptive_recommendation().model_dump()
        row = _stub_recommendation_row(crop_payload)
        row.selected_crop_id = "CROP-002"
        with patch.object(
            routes_farmer, "_latest_selected_recommendation", return_value=row
        ), patch.object(
            routes_farmer, "_latest_recommendation_any_season", return_value=None
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.get("/f4/farmer/current", params={"field_id": "FIELD-001"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["field_id"] == "FIELD-001"
        assert body["season"] == "Maha-2025"
        assert body["selected_crop_id"] == "CROP-002"
        assert body["selected_crop"]["crop_id"] == "CROP-002"
        assert body["status"] == "ok"

    def test_returns_unselected_latest_recommendation_when_no_selection(self):
        crop_payload = _adaptive_recommendation().model_dump()
        row = _stub_recommendation_row(crop_payload)
        row.selected_crop_id = None
        with patch.object(
            routes_farmer, "_latest_selected_recommendation", return_value=None
        ), patch.object(
            routes_farmer, "_latest_recommendation_any_season", return_value=row
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.get("/f4/farmer/current", params={"field_id": "FIELD-001"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["selected_crop_id"] is None
        assert body["selected_crop"] is None
        assert len(body["recommendations"]) == 1
        assert body["data_available"] is True
        assert body["status"] == "ok"

    def test_returns_data_unavailable_when_no_history(self):
        with patch.object(
            routes_farmer, "_latest_selected_recommendation", return_value=None
        ), patch.object(
            routes_farmer, "_latest_recommendation_any_season", return_value=None
        ):
            resp = client.get("/f4/farmer/current", params={"field_id": "FIELD-001"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["field_id"] == "FIELD-001"
        assert body["status"] == "data_unavailable"
        assert body["data_available"] is False

    def test_falls_back_to_latest_recommendation_payload_when_selected_row_is_empty(self):
        selected_row = MagicMock()
        selected_row.id = 9
        selected_row.field_id = "FIELD-001"
        selected_row.season = "Yala-2026"
        selected_row.selected_crop_id = "CROP-002"
        selected_row.response_data = {"recommendations": []}

        payload_row = _stub_recommendation_row(_adaptive_recommendation().model_dump())
        payload_row.season = "Maha-2025"

        with patch.object(
            routes_farmer, "_latest_selected_recommendation", return_value=selected_row
        ), patch.object(
            routes_farmer, "_latest_recommendation_any_season", return_value=selected_row
        ), patch.object(
            routes_farmer,
            "_latest_recommendation_with_recs",
            side_effect=[payload_row],
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.get("/f4/farmer/current", params={"field_id": "FIELD-001"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["selected_crop_id"] == "CROP-002"
        assert body["selected_crop"]["crop_id"] == "CROP-002"
        assert body["season"] == "Maha-2025"
        assert len(body["recommendations"]) == 1
        assert body["data_available"] is True

    def test_uses_select_artifact_snapshot_when_no_recommendation_payload_exists(self):
        selected_row = MagicMock()
        selected_row.id = 9
        selected_row.field_id = "FIELD-001"
        selected_row.season = "Yala-2026"
        selected_row.selected_crop_id = "CROP-002"
        selected_row.response_data = {"recommendations": []}

        snapshot = _adaptive_recommendation(
            crop_id="CROP-002",
            crop_name="Green Gram",
        ).model_dump()

        with patch.object(
            routes_farmer, "_latest_selected_recommendation", return_value=selected_row
        ), patch.object(
            routes_farmer, "_latest_recommendation_any_season", return_value=selected_row
        ), patch.object(
            routes_farmer, "_latest_recommendation_with_recs", return_value=None
        ), patch.object(
            routes_farmer,
            "_latest_select_artifact_snapshot",
            return_value={
                "season": "Yala-2026",
                "crop_id": "CROP-002",
                "crop_snapshot": snapshot,
                "field_context": None,
            },
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.get("/f4/farmer/current", params={"field_id": "FIELD-001"})

        assert resp.status_code == 200
        body = resp.json()
        assert body["selected_crop_id"] == "CROP-002"
        assert body["selected_crop"]["crop_id"] == "CROP-002"
        assert len(body["recommendations"]) == 1
        assert body["status"] == "ok"
        assert body["data_available"] is True


class TestFarmerCropDetail:
    def test_returns_crop_with_breakdown_and_history(self):
        crop_payload = _adaptive_recommendation().model_dump()
        with patch.object(
            routes_farmer,
            "_latest_recommendation",
            return_value=_stub_recommendation_row(crop_payload),
        ), patch.object(
            farmer_service, "fetch_price_history", return_value=[]
        ), patch.object(
            farmer_service, "fetch_yield_history", return_value=[]
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.get(
                "/f4/farmer/crop-detail",
                params={
                    "field_id": "FIELD-001",
                    "crop_id": "CROP-002",
                    "season": "Maha-2025",
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["crop"]["crop_id"] == "CROP-002"
        # Cost buckets share the total estimated cost.
        breakdown = body["cost_breakdown"]
        assert set(breakdown.keys()) == {"seed", "fertilizer", "labour", "water", "other"}
        assert sum(breakdown.values()) == pytest.approx(
            crop_payload["estimated_cost_per_ha"], abs=1.0
        )

    def test_returns_404_when_no_recommendation_cached(self):
        with patch.object(routes_farmer, "_latest_recommendation", return_value=None):
            resp = client.get(
                "/f4/farmer/crop-detail",
                params={
                    "field_id": "FIELD-001",
                    "crop_id": "CROP-002",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 404

    def test_returns_404_when_crop_not_in_run(self):
        crop_payload = _adaptive_recommendation().model_dump()
        with patch.object(
            routes_farmer,
            "_latest_recommendation",
            return_value=_stub_recommendation_row(crop_payload),
        ):
            resp = client.get(
                "/f4/farmer/crop-detail",
                params={
                    "field_id": "FIELD-001",
                    "crop_id": "UNKNOWN-CROP",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# /select
# ---------------------------------------------------------------------------


class TestFarmerSelect:
    def test_persists_selected_crop(self):
        crop_payload = _adaptive_recommendation().model_dump()
        row = _stub_recommendation_row(crop_payload)
        row.selected_crop_id = None
        with patch.object(
            routes_farmer, "_latest_recommendation", return_value=row
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/select",
                json={
                    "field_id": "FIELD-001",
                    "crop_id": "CROP-002",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["persisted"] is True
        assert body["crop_id"] == "CROP-002"
        assert row.selected_crop_id == "CROP-002"

    def test_rejects_unknown_crop_when_not_in_run(self):
        crop_payload = _adaptive_recommendation().model_dump()
        row = _stub_recommendation_row(crop_payload)
        with patch.object(
            routes_farmer, "_latest_recommendation", return_value=row
        ), patch.object(
            routes_farmer.CropRepository, "get_crop_by_id", return_value=None
        ):
            resp = client.post(
                "/f4/farmer/select",
                json={
                    "field_id": "FIELD-001",
                    "crop_id": "BOGUS-CROP",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 400

    def test_upserts_when_no_recommendation_present(self):
        """Select must work even if /recommend's persistence step failed.

        Backend upserts a fresh Recommendation row when none exists so
        the chosen crop survives across reloads. Catalog validation still
        rejects unknown crop_ids.
        """
        with patch.object(
            routes_farmer, "_latest_recommendation", return_value=None
        ), patch.object(
            routes_farmer.CropRepository,
            "get_crop_by_id",
            return_value=None,
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/select",
                json={
                    # 'paddy' is in DEFAULT_CROPS so the request is valid
                    # even though there's no DB row and no prior run.
                    "field_id": "FIELD-001",
                    "crop_id": "paddy",
                    "season": "Maha-2025",
                },
            )
        assert resp.status_code == 200
        assert resp.json()["crop_id"] == "paddy"

    def test_persists_snapshot_when_cached_run_is_empty(self):
        row = _stub_recommendation_row(_adaptive_recommendation().model_dump())
        row.response_data = {"recommendations": []}
        row.selected_crop_id = None
        snapshot = _adaptive_recommendation(crop_id="CROP-002", crop_name="Green Gram").model_dump()

        with patch.object(
            routes_farmer, "_latest_recommendation", return_value=row
        ), patch.object(
            routes_farmer.RunArtifactRepository, "save_artifact", return_value=1
        ):
            resp = client.post(
                "/f4/farmer/select",
                json={
                    "field_id": "FIELD-001",
                    "crop_id": "CROP-002",
                    "season": "Maha-2025",
                    "crop_snapshot": snapshot,
                    "field_context": {
                        "field_id": "FIELD-001",
                        "field_name": "Udawalawe Block A",
                        "area_ha": 4.5,
                        "soil_type": "Loam",
                        "soil_ph": 6.4,
                        "water_availability_mm": 5400,
                        "water_band": "high",
                        "water_explanation": "Plenty of water",
                        "reservoir_level_pct": 80,
                        "season": "Maha-2025",
                        "current_date": "2026-04-28",
                        "season_avg_temp": 27.5,
                        "season_rainfall_mm": 350.0,
                    },
                },
            )

        assert resp.status_code == 200
        assert row.selected_crop_id == "CROP-002"
        assert isinstance(row.response_data, dict)
        recommendations = row.response_data.get("recommendations") or []
        assert len(recommendations) == 1
        assert recommendations[0]["crop_id"] == "CROP-002"
        assert "field_context" in row.response_data


# ---------------------------------------------------------------------------
# Helpers (unit-level, no HTTP)
# ---------------------------------------------------------------------------


class TestFarmerServiceHelpers:
    def test_classify_water_band_thresholds(self):
        assert farmer_service.classify_water_band(50)["band"] == "low"
        assert farmer_service.classify_water_band(500)["band"] == "medium"
        assert farmer_service.classify_water_band(1500)["band"] == "high"

    def test_reservoir_low_demotes_band(self):
        # Medium water but reservoir below 25% should drop to low.
        out = farmer_service.classify_water_band(500, reservoir_level_pct=10.0)
        assert out["band"] == "low"

    def test_infer_current_season_uses_october_boundary(self):
        assert farmer_service.infer_current_season(date(2026, 1, 15)) == "Maha-2025"
        assert farmer_service.infer_current_season(date(2026, 4, 27)) == "Yala-2026"
        assert farmer_service.infer_current_season(date(2026, 10, 5)) == "Maha-2026"

    def test_cost_breakdown_sums_to_input(self):
        breakdown = farmer_service.cost_breakdown(120000)
        assert sum(breakdown.values()) == pytest.approx(120000, abs=1.0)

    def test_adapt_irrigation_field_translates_keys(self):
        f1_field = {
            "field_id": "field-6513b888",
            "field_name": "Hill Plot",
            "scheme_id": "H-04",
            "area_hectares": 2.0,
            "soil_type": "Reddish-Brown Earth",
            "latitude": 7.7180,
            "longitude": 80.7550,
            "location_name": "Mahaweli H-04",
        }
        adapted = farmer_service.adapt_irrigation_field_to_f4(f1_field)
        assert adapted["id"] == "field-6513b888"
        assert adapted["area_ha"] == 2.0
        assert adapted["scheme_id"] == "H-04"
        assert adapted["location"] == "Mahaweli H-04"
        # Defaults the missing seasonal water allocation to a medium-band value.
        assert adapted["water_availability_mm"] == 500.0

    def test_adapt_irrigation_field_preserves_explicit_water(self):
        adapted = farmer_service.adapt_irrigation_field_to_f4(
            {"field_id": "x", "area_hectares": 1.0, "water_availability_mm": 850.0}
        )
        assert adapted["water_availability_mm"] == 850.0


class TestCatalogFallback:
    """The adaptive engine must always have a catalog to evaluate."""

    def test_default_catalog_matches_price_model_encoder(self):
        from app.data.crop_catalog import DEFAULT_CROPS

        names = {c["name"] for c in DEFAULT_CROPS}
        # Names the LightGBM price model was trained on; everything in
        # the encoder must be representable in the catalog so price
        # predictions stay in-distribution.
        encoder_labels = {
            "Banana", "Beans", "Black gram", "Brinjal", "Cabbage", "Cardamom",
            "Carrot", "Chili", "Coconut", "Green gram", "Groundnut", "Maize",
            "Onion", "Paddy", "Pepper", "Potato", "Pumpkin", "Rice", "Tea",
            "Tomato",
        }
        missing = encoder_labels - names
        assert not missing, f"Catalog missing crops the price model knows: {missing}"

    def test_load_crops_falls_back_when_db_empty(self):
        from app.api import routes_adaptive

        empty_db = MagicMock()
        with patch.object(
            routes_adaptive.CropRepository,
            "list_candidate_crops",
            return_value=[],
        ):
            result = routes_adaptive.load_crops_from_db(empty_db)

        assert len(result) >= 20
        assert all(r["crop_id"] for r in result)
        assert all(r["crop_name"] for r in result)
        # Every record must carry the four parameters the engine needs.
        for r in result:
            assert r["water_sensitivity"] in {"low", "medium", "high"}
            assert r["growth_duration_days"] > 0
            assert r["typical_yield_t_ha"] > 0
            assert r["water_requirement_mm"] > 0

"""Farmer-facing crop optimization routes.

These routes power the Optimization tab in the farmer field-detail page.
The flow is:

  1. POST /f4/farmer/recommend      — guided ranked recommendation
  2. GET  /f4/farmer/crop-detail    — drill-down for a chosen crop
  3. POST /f4/farmer/select         — persist the farmer's chosen crop
  4. GET  /f4/farmer/current        — latest saved plan for field hydration

They are thin orchestration over the existing adaptive engine:
field row + soil type + season → AdaptiveRecommendationRequest →
adaptive pipeline → farmer-shaped response. Upstream signals from F1
(reservoir, field status) and F3 (weather summary) enrich the inputs;
they are optional and degrade gracefully.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Annotated, Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes_adaptive import get_adaptive_recommendations
from app.core.config import get_settings
from app.core.contracts import build_contract
from app.core.schemas import (
    AdaptiveCropRecommendation,
    AdaptiveRecommendationRequest,
    AdaptiveRecommendationResponse,
    CropFilterParameters,
    FieldParameters,
    MarketParameters,
    WaterParameters,
    WeatherParameters,
)
from app.data.crop_catalog import DEFAULT_CROPS
from app.data.db import get_db
from app.data.models_orm import (
    Field as FieldModel,
    OptimizationRunArtifact,
    Recommendation,
)
from app.data.repositories import (
    CropCalendarRepository,
    CropRepository,
    FieldRepository,
    RecommendationRepository,
    RunArtifactRepository,
)
from app.dependencies.auth import get_current_user_context
from app.services.calendar_service import CropCalendarService
from app.services.explanation_service import ExplanationService
from app.services import farmer_service

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/f4/farmer", tags=["farmer-recommendations"])


# ---------------------------------------------------------------------------
# Request / response models (farmer-shaped)
# ---------------------------------------------------------------------------


class FarmerRecommendRequest(BaseModel):
    field_id: str = Field(..., description="Field identifier")
    soil_type: str = Field(
        ...,
        description=(
            "Soil type from the standard taxonomy: Clay, Clay Loam, Loam, "
            "Sandy Loam, Sandy Clay, Silty Loam, Red Loam."
        ),
    )
    season: Optional[str] = Field(
        default=None,
        description=(
            "Season tag like 'Maha-2026' or 'Yala-2026'. When omitted, the "
            "service infers the current season from today's date."
        ),
    )
    top_n: int = Field(default=5, ge=1, le=10, description="Top-N crops to return")
    language: str = Field(default="en", description="Explanation language: en, si, or ta")


class FarmerFieldContext(BaseModel):
    field_id: str
    field_name: Optional[str] = None
    area_ha: float
    soil_type: str
    soil_ph: Optional[float] = None
    water_availability_mm: float
    water_band: str
    water_explanation: str
    reservoir_level_pct: Optional[float] = None
    season: str
    current_date: str
    season_avg_temp: float
    season_rainfall_mm: float


class FarmerRecommendResponse(BaseModel):
    field_context: FarmerFieldContext
    recommendations: List[AdaptiveCropRecommendation]
    models_used: List[str] = Field(default_factory=list)
    scenario_variants: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optimistic/base/pessimistic scenario clones from F3 water risk bands",
    )
    explanations: Optional[Dict[str, str]] = Field(default=None)
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerCurrentPlanResponse(BaseModel):
    field_id: str
    season: Optional[str] = None
    selected_crop_id: Optional[str] = None
    selected_crop: Optional[AdaptiveCropRecommendation] = None
    field_context: Optional[FarmerFieldContext] = None
    recommendations: List[AdaptiveCropRecommendation] = Field(default_factory=list)
    scenario_variants: Optional[Dict[str, Any]] = None
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerCropDetailResponse(BaseModel):
    field_id: str
    season: str
    crop: AdaptiveCropRecommendation
    cost_breakdown: Dict[str, float]
    price_history: List[Dict[str, Any]] = Field(default_factory=list)
    yield_history: List[Dict[str, Any]] = Field(default_factory=list)
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerSelectRequest(BaseModel):
    field_id: str
    crop_id: str
    season: str
    crop_snapshot: Optional[AdaptiveCropRecommendation] = None
    field_context: Optional[FarmerFieldContext] = None


class FarmerSelectResponse(BaseModel):
    field_id: str
    crop_id: str
    season: str
    recommendation_id: Optional[int] = None
    persisted: bool
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerCalendarResponse(BaseModel):
    field_id: str
    season: str
    recommendation_id: Optional[int] = None
    crop_id: str
    planting_window_start: Optional[str] = None
    planting_window_end: Optional[str] = None
    irrigation_windows: List[Dict[str, Any]] = Field(default_factory=list)
    fertilizer_windows: List[Dict[str, Any]] = Field(default_factory=list)
    harvest_window_start: Optional[str] = None
    harvest_window_end: Optional[str] = None
    expected_market_week: Optional[str] = None
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerExplanationResponse(BaseModel):
    field_id: str
    season: str
    crop_id: str
    language: str
    explanations: Dict[str, str]
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class FarmerAreaOptimizationScenarioInput(BaseModel):
    scenario_id: str = Field(..., description="Stable scenario id")
    title: Optional[str] = Field(default=None, description="Farmer-facing scenario label")
    soil_type: Optional[str] = Field(default=None, description="Override soil type")
    season_rainfall_mm: Optional[float] = Field(
        default=None,
        ge=0,
        le=2000,
        description="Override seasonal rainfall in mm",
    )
    season_avg_temp: Optional[float] = Field(
        default=None,
        ge=10,
        le=45,
        description="Override seasonal average temperature",
    )
    water_availability_mm: Optional[float] = Field(
        default=None,
        ge=0,
        le=20000,
        description="Override seasonal water availability",
    )
    price_factor: Optional[float] = Field(
        default=None,
        ge=0.5,
        le=2.0,
        description="Override market price multiplier",
    )


class FarmerAreaOptimizeRequest(BaseModel):
    mode: Literal["all", "fields", "boundary"] = "fields"
    field_ids: List[str] = Field(default_factory=list)
    boundary: Optional[Dict[str, Any]] = None
    season: Optional[str] = None
    top_n: int = Field(default=5, ge=1, le=10)
    scenarios: List[FarmerAreaOptimizationScenarioInput] = Field(default_factory=list)


class FarmerAreaOptimizeSelection(BaseModel):
    mode: Literal["all", "fields", "boundary"]
    field_count: int
    requested_field_count: int
    missing_field_ids: List[str] = Field(default_factory=list)
    field_ids: List[str] = Field(default_factory=list)
    total_hectares: float
    boundary: Optional[Dict[str, Any]] = None


class FarmerAreaCropRanking(BaseModel):
    crop_id: str
    crop_name: str
    average_combined_score: float
    average_suitability_score: float
    average_profit_per_ha: float
    average_roi_percentage: float
    average_water_requirement_mm: float
    appearances: int
    first_place_count: int
    risk_level: str
    water_sensitivity: str
    confidence: float
    field_ids: List[str] = Field(default_factory=list)
    scenario_ids: List[str] = Field(default_factory=list)


class FarmerAreaOptimizationFieldResult(BaseModel):
    field_id: str
    field_name: Optional[str] = None
    area_ha: float
    soil_type: str
    water_band: str
    season_rainfall_mm: float
    season_avg_temp: float
    water_availability_mm: float
    best_crop: Optional[AdaptiveCropRecommendation] = None
    recommendations: List[AdaptiveCropRecommendation] = Field(default_factory=list)


class FarmerAreaOptimizationScenarioResult(BaseModel):
    scenario_id: str
    title: str
    inputs: FarmerAreaOptimizationScenarioInput
    field_results: List[FarmerAreaOptimizationFieldResult] = Field(default_factory=list)
    crop_rankings: List[FarmerAreaCropRanking] = Field(default_factory=list)
    best_crop: Optional[FarmerAreaCropRanking] = None
    models_used: List[str] = Field(default_factory=list)
    message: Optional[str] = None


class FarmerAreaOptimizeResponse(BaseModel):
    selection: FarmerAreaOptimizeSelection
    season: str
    base_inputs: Dict[str, Any] = Field(default_factory=dict)
    crop_rankings: List[FarmerAreaCropRanking] = Field(default_factory=list)
    best_crop: Optional[FarmerAreaCropRanking] = None
    scenarios: List[FarmerAreaOptimizationScenarioResult] = Field(default_factory=list)
    models_used: List[str] = Field(default_factory=list)
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _resolve_season(requested: Optional[str]) -> str:
    return requested or farmer_service.infer_current_season()


def _normalize_soil_type(soil_type: str) -> str:
    """Round-trip the soil type to the taxonomy used by the adaptive engine."""
    canonical = {
        "clay": "Clay",
        "clay loam": "Clay Loam",
        "loam": "Loam",
        "sandy loam": "Sandy Loam",
        "sandy clay": "Sandy Clay",
        "silty loam": "Silty Loam",
        "red loam": "Red Loam",
    }
    return canonical.get(soil_type.strip().lower(), soil_type.strip().title())


def _upsert_field_from_irrigation(
    db: Session, adapted: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Persist a freshly-fetched F1 field record into F4's local table.

    Mirrors the schema used by ``routes_internal.upsert_internal_field``
    so subsequent calls hit the cached row. Failures here are non-fatal —
    we still return the adapted dict so the request can proceed in-memory.
    """
    field_id = str(adapted.get("id") or "")
    if not field_id:
        return None
    try:
        row = db.query(FieldModel).filter(FieldModel.id == field_id).first()
        if row is None:
            row = FieldModel(
                id=field_id,
                name=adapted.get("name") or field_id,
                scheme_id=adapted.get("scheme_id") or "IRRIGATION",
                area_ha=float(adapted.get("area_ha") or 1.0),
            )
            db.add(row)
        row.name = adapted.get("name") or row.name
        row.scheme_id = adapted.get("scheme_id") or row.scheme_id or "IRRIGATION"
        row.area_ha = float(adapted.get("area_ha") or row.area_ha or 1.0)
        row.soil_type = adapted.get("soil_type")
        row.soil_ph = adapted.get("soil_ph")
        row.soil_ec = adapted.get("soil_ec")
        row.location = adapted.get("location")
        row.latitude = adapted.get("latitude")
        row.longitude = adapted.get("longitude")
        row.elevation_m = adapted.get("elevation_m")
        row.soil_suitability = adapted.get("soil_suitability")
        row.water_availability_mm = adapted.get("water_availability_mm")
        db.commit()
        db.refresh(row)
        return FieldRepository.get_field_by_id(db, field_id)
    except Exception as exc:
        logger.warning("Lazy field upsert failed for %s: %s", field_id, exc)
        try:
            db.rollback()
        except Exception:
            pass
        return None


async def _resolve_field(
    db: Session, field_id: str, *, auth_header: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Resolve a field row, lazy-syncing from F1 when missing locally.

    F1 syncs on create/update, but legacy fields and silent sync failures
    leave F4 without a row. Falling back to F1 here keeps the farmer flow
    working for any field the user can already see in their portal.
    """
    field = FieldRepository.get_field_by_id(db, field_id)
    if field:
        return field

    f1_field = await farmer_service.fetch_field_from_irrigation(
        settings.irrigation_service_url,
        field_id,
        auth_header=auth_header,
    )
    if not f1_field:
        return None

    adapted = farmer_service.adapt_irrigation_field_to_f4(f1_field)
    if not adapted.get("id"):
        return None

    persisted = _upsert_field_from_irrigation(db, adapted)
    return persisted or adapted


def _latest_recommendation(
    db: Session, field_id: str, season: str
) -> Optional[Recommendation]:
    try:
        return (
            db.query(Recommendation)
            .filter(
                Recommendation.field_id == field_id,
                Recommendation.season == season,
            )
            .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
            .first()
        )
    except Exception as exc:
        logger.warning("Latest recommendation lookup failed: %s", exc)
        return None


def _latest_recommendation_any_season(
    db: Session, field_id: str
) -> Optional[Recommendation]:
    try:
        return (
            db.query(Recommendation)
            .filter(Recommendation.field_id == field_id)
            .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
            .first()
        )
    except Exception as exc:
        logger.warning("Latest recommendation(any season) lookup failed: %s", exc)
        return None


def _latest_selected_recommendation(
    db: Session, field_id: str
) -> Optional[Recommendation]:
    try:
        return (
            db.query(Recommendation)
            .filter(
                Recommendation.field_id == field_id,
                Recommendation.selected_crop_id.isnot(None),
                Recommendation.selected_crop_id != "",
            )
            .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
            .first()
        )
    except Exception as exc:
        logger.warning("Latest selected recommendation lookup failed: %s", exc)
        return None


def _latest_recommendation_with_recs(
    db: Session,
    field_id: str,
    *,
    preferred_season: Optional[str] = None,
) -> Optional[Recommendation]:
    if preferred_season:
        preferred = _latest_recommendation(db, field_id, preferred_season)
        if (
            preferred
            and isinstance(preferred.response_data, dict)
            and isinstance(preferred.response_data.get("recommendations"), list)
            and preferred.response_data.get("recommendations")
        ):
            return preferred

    try:
        rows = (
            db.query(Recommendation)
            .filter(Recommendation.field_id == field_id)
            .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
            .limit(50)
            .all()
        )
    except Exception as exc:
        logger.warning("Latest recommendation(with recs) lookup failed: %s", exc)
        return None

    for row in rows:
        payload = row.response_data if isinstance(row.response_data, dict) else {}
        if isinstance(payload.get("recommendations"), list) and payload.get("recommendations"):
            return row
    return None


def _coerce_recommendations(payload: Any) -> List[AdaptiveCropRecommendation]:
    if not isinstance(payload, list):
        return []
    out: List[AdaptiveCropRecommendation] = []
    for raw in payload:
        if not isinstance(raw, dict):
            continue
        try:
            out.append(AdaptiveCropRecommendation(**raw))
        except Exception:
            continue
    return out


def _coerce_field_context(payload: Any) -> Optional[FarmerFieldContext]:
    if not isinstance(payload, dict):
        return None
    try:
        return FarmerFieldContext(**payload)
    except Exception:
        return None


def _latest_select_artifact_snapshot(
    db: Session,
    field_id: str,
    *,
    preferred_season: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Return the latest farmer-select request snapshot (crop + field context)."""
    try:
        query = (
            db.query(OptimizationRunArtifact)
            .filter(
                OptimizationRunArtifact.run_type == "farmer_select",
                OptimizationRunArtifact.field_id == field_id,
            )
            .order_by(
                OptimizationRunArtifact.created_at.desc(),
                OptimizationRunArtifact.id.desc(),
            )
        )
        rows = query.limit(50).all()
    except Exception as exc:
        logger.warning("Latest farmer_select artifact lookup failed: %s", exc)
        return None

    if not rows:
        return None

    if preferred_season:
        preferred = [
            row
            for row in rows
            if str(getattr(row, "season", "") or "") == str(preferred_season)
        ]
        if preferred:
            rows = preferred + [row for row in rows if row not in preferred]

    for row in rows:
        request_payload = (
            row.request_payload if isinstance(row.request_payload, dict) else {}
        )
        crop_snapshot = request_payload.get("crop_snapshot")
        if not isinstance(crop_snapshot, dict):
            continue
        return {
            "season": row.season,
            "crop_id": request_payload.get("crop_id"),
            "crop_snapshot": crop_snapshot,
            "field_context": request_payload.get("field_context"),
        }
    return None


def _latest_recommendation_with_source(
    db: Session, field_id: str, season: str
) -> tuple[Optional[Recommendation], Optional[str]]:
    """Latest recommendation row + the source bucket it came from.

    Farmer recommendations live in the `OptimizationRunArtifact` table
    (run_type='farmer_recommend'); we mirror them into `recommendations`
    so /select can update the chosen crop. This helper exposes the table
    of record so callers can disambiguate when needed.
    """
    rec = _latest_recommendation(db, field_id, season)
    return rec, "recommendations" if rec else None


def _build_adaptive_request(
    *,
    field: Dict[str, Any],
    soil_type: str,
    season: str,
    weather_defaults: Dict[str, float],
    water_band: Dict[str, Any],
    top_n: int,
    price_factor: Optional[float] = None,
) -> AdaptiveRecommendationRequest:
    field_params = FieldParameters(
        field_id=str(field.get("id") or ""),
        area_ha=float(field.get("area_ha") or 1.0),
        soil_type=soil_type,
        soil_ph=float(field.get("soil_ph") or 6.5),
        soil_ec=float(field.get("soil_ec") or 1.0),
        soil_suitability=float(field.get("soil_suitability") or 0.75),
        location=str(field.get("location") or "Kandy"),
        latitude=float(field.get("latitude") or 7.2906),
        longitude=float(field.get("longitude") or 80.6337),
        elevation=float(field.get("elevation_m") or 500.0),
    )

    available_mm = float(water_band["water_availability_mm"])
    water_params = WaterParameters(
        water_availability_mm=min(20000.0, max(0.0, available_mm)),
        # The adaptive engine caps quota at 5000 mm; clamp to the schema range.
        water_quota_mm=max(200.0, min(5000.0, available_mm)),
        water_coverage_ratio=min(1.0, max(0.0, available_mm / 1000.0)),
        irrigation_efficiency=0.7,
    )

    weather_params = WeatherParameters(
        season_avg_temp=weather_defaults["season_avg_temp"],
        season_rainfall_mm=weather_defaults["season_rainfall_mm"],
    )

    return AdaptiveRecommendationRequest(
        season=season,
        top_n=top_n,
        field_params=field_params,
        weather_params=weather_params,
        water_params=water_params,
        market_params=MarketParameters(price_factor=price_factor or 1.0),
        crop_filters=CropFilterParameters(),
        suitability_weight=0.5,
        profitability_weight=0.5,
    )


def _persist_farmer_recommendation(
    db: Session,
    *,
    field_id: str,
    season: str,
    request_payload: Dict[str, Any],
    response_payload: Dict[str, Any],
    observed_at: datetime,
    contract: Dict[str, Any],
) -> Optional[int]:
    """Mirror the adaptive output into recommendations + run artifact."""
    rec_id = RecommendationRepository.save_recommendation(
        db_session=db,
        field_id=field_id,
        season=season,
        request_data=request_payload,
        response_data=response_payload,
    )
    RunArtifactRepository.save_artifact(
        db,
        run_type="farmer_recommend",
        field_id=field_id,
        season=season,
        request_payload=request_payload,
        response_payload=response_payload,
        status=str(contract.get("status") or "ok"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return rec_id


def _build_farmer_explanations(
    *,
    language: str,
    field_context: FarmerFieldContext,
    current_crop: AdaptiveCropRecommendation,
    previous_crop: Optional[AdaptiveCropRecommendation] = None,
    previous_date: Optional[str] = None,
) -> Dict[str, str]:
    change_reason = ExplanationService.compute_change_reason(
        previous_crop.model_dump() if previous_crop else None,
        current_crop.model_dump(),
    )
    context = {
        "crop_name": current_crop.crop_name,
        "ph": field_context.soil_ph or 6.5,
        "water_mm": field_context.water_availability_mm,
        "yield_t": current_crop.predicted_yield_t_ha,
        "price": current_crop.predicted_price_per_kg,
        "profit_k": (current_crop.profit_per_ha or 0.0) / 1000.0,
        "drought_pct": 0.0,
        "prev_date": previous_date or "the previous run",
        "prev_crop": previous_crop.crop_name if previous_crop else "the previous crop",
        "change_reason": change_reason,
    }
    return {
        "why_this_crop": ExplanationService.generate_explanation("why_this_crop", language, context, previous_crop.model_dump() if previous_crop else None),
        "why_not_paddy": ExplanationService.generate_explanation("why_not_paddy", language, context, previous_crop.model_dump() if previous_crop else None),
        "what_changed": ExplanationService.generate_explanation("what_changed", language, context, previous_crop.model_dump() if previous_crop else None),
    }


def _calendar_response_from_payload(
    payload: Dict[str, Any],
    *,
    observed_at: str,
    message: str,
) -> FarmerCalendarResponse:
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=True,
        raw_status="ok",
        message=message,
    )
    return FarmerCalendarResponse(
        field_id=str(payload.get("field_id") or ""),
        season=str(payload.get("season") or ""),
        recommendation_id=payload.get("recommendation_id"),
        crop_id=str(payload.get("crop_id") or ""),
        planting_window_start=payload.get("planting_window_start"),
        planting_window_end=payload.get("planting_window_end"),
        irrigation_windows=payload.get("irrigation_windows") or [],
        fertilizer_windows=payload.get("fertilizer_windows") or [],
        harvest_window_start=payload.get("harvest_window_start"),
        harvest_window_end=payload.get("harvest_window_end"),
        expected_market_week=payload.get("expected_market_week"),
        **contract,
    )


def _scenario_title(scenario: FarmerAreaOptimizationScenarioInput, index: int) -> str:
    if scenario.title:
        return scenario.title
    label = scenario.scenario_id.replace("-", " ").replace("_", " ").strip()
    return label.title() if label else f"Scenario {index + 1}"


def _default_area_scenarios(
    *,
    soil_type: str,
    weather_defaults: Dict[str, float],
    water_availability_mm: float,
) -> List[FarmerAreaOptimizationScenarioInput]:
    rainfall = float(weather_defaults.get("season_rainfall_mm") or 250.0)
    temp = float(weather_defaults.get("season_avg_temp") or 28.0)
    water = float(water_availability_mm or 500.0)
    return [
        FarmerAreaOptimizationScenarioInput(
            scenario_id="current-plan",
            title="Current field conditions",
            soil_type=soil_type,
            season_rainfall_mm=rainfall,
            season_avg_temp=temp,
            water_availability_mm=water,
            price_factor=1.0,
        ),
        FarmerAreaOptimizationScenarioInput(
            scenario_id="drier-season",
            title="Drier season",
            soil_type=soil_type,
            season_rainfall_mm=max(0.0, rainfall - 120.0),
            season_avg_temp=min(45.0, temp + 1.5),
            water_availability_mm=max(0.0, water * 0.75),
            price_factor=1.0,
        ),
        FarmerAreaOptimizationScenarioInput(
            scenario_id="wetter-season",
            title="Wetter season",
            soil_type=soil_type,
            season_rainfall_mm=min(2000.0, rainfall + 160.0),
            season_avg_temp=max(10.0, temp - 0.8),
            water_availability_mm=min(20000.0, water * 1.25),
            price_factor=1.0,
        ),
    ]


def _rank_area_crops(
    field_results: List[FarmerAreaOptimizationFieldResult],
    *,
    scenario_id: Optional[str] = None,
) -> List[FarmerAreaCropRanking]:
    buckets: Dict[str, Dict[str, Any]] = {}
    for field_result in field_results:
        for rec in field_result.recommendations:
            bucket = buckets.setdefault(
                rec.crop_id,
                {
                    "crop_id": rec.crop_id,
                    "crop_name": rec.crop_name,
                    "combined": [],
                    "suitability": [],
                    "profit": [],
                    "roi": [],
                    "water": [],
                    "risk_levels": [],
                    "water_sensitivity": rec.water_sensitivity,
                    "confidence": [],
                    "field_ids": set(),
                    "scenario_ids": set(),
                    "first_place_count": 0,
                },
            )
            bucket["combined"].append(float(rec.combined_score))
            bucket["suitability"].append(float(rec.suitability_score))
            bucket["profit"].append(float(rec.profit_per_ha))
            bucket["roi"].append(float(rec.roi_percentage))
            bucket["water"].append(float(rec.water_requirement_mm))
            bucket["risk_levels"].append(str(rec.risk_level or "medium"))
            bucket["confidence"].append(float(rec.confidence or 0.0))
            bucket["field_ids"].add(field_result.field_id)
            if scenario_id:
                bucket["scenario_ids"].add(scenario_id)
            if field_result.best_crop and field_result.best_crop.crop_id == rec.crop_id:
                bucket["first_place_count"] += 1

    def avg(values: List[float]) -> float:
        return round(sum(values) / len(values), 4) if values else 0.0

    risk_rank = {"low": 0, "medium": 1, "high": 2}
    rankings: List[FarmerAreaCropRanking] = []
    for bucket in buckets.values():
        risks = bucket["risk_levels"]
        risk_level = max(risks, key=lambda item: risk_rank.get(str(item), 1)) if risks else "medium"
        rankings.append(
            FarmerAreaCropRanking(
                crop_id=bucket["crop_id"],
                crop_name=bucket["crop_name"],
                average_combined_score=avg(bucket["combined"]),
                average_suitability_score=avg(bucket["suitability"]),
                average_profit_per_ha=round(avg(bucket["profit"]), 2),
                average_roi_percentage=round(avg(bucket["roi"]), 2),
                average_water_requirement_mm=round(avg(bucket["water"]), 2),
                appearances=len(bucket["combined"]),
                first_place_count=int(bucket["first_place_count"]),
                risk_level=risk_level,
                water_sensitivity=str(bucket["water_sensitivity"] or "medium"),
                confidence=avg(bucket["confidence"]),
                field_ids=sorted(bucket["field_ids"]),
                scenario_ids=sorted(bucket["scenario_ids"]),
            )
        )

    rankings.sort(
        key=lambda item: (
            item.first_place_count,
            item.average_combined_score,
            item.average_profit_per_ha,
        ),
        reverse=True,
    )
    return rankings


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/area-optimize", response_model=FarmerAreaOptimizeResponse)
async def farmer_area_optimize(
    payload: FarmerAreaOptimizeRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerAreaOptimizeResponse:
    """Area-level crop optimization with farmer-editable scenarios.

    The frontend owns temporary map selection and sends selected field ids.
    This endpoint resolves those fields, runs the adaptive crop engine for
    each scenario, then ranks crops by repeated field/scenario strength.
    """
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()
    season = _resolve_season(payload.season)
    auth_header = request.headers.get("authorization")

    requested_ids = [str(item) for item in payload.field_ids if str(item).strip()]
    resolved_fields: List[Dict[str, Any]] = []
    missing_field_ids: List[str] = []
    seen: set[str] = set()
    for field_id in requested_ids:
        if field_id in seen:
            continue
        seen.add(field_id)
        field = await _resolve_field(db, field_id, auth_header=auth_header)
        if not field:
            missing_field_ids.append(field_id)
            continue
        resolved_fields.append(field)

    selection = FarmerAreaOptimizeSelection(
        mode=payload.mode,
        requested_field_count=len(requested_ids),
        field_count=len(resolved_fields),
        missing_field_ids=missing_field_ids,
        field_ids=[str(field.get("id") or "") for field in resolved_fields],
        total_hectares=round(
            sum(float(field.get("area_ha") or 0.0) for field in resolved_fields),
            3,
        ),
        boundary=payload.boundary,
    )

    if not resolved_fields:
        contract = build_contract(
            source="optimization_service",
            observed_at=observed_at,
            data_available=False,
            raw_status="data_unavailable",
            message="No fields selected for crop optimization.",
        )
        return FarmerAreaOptimizeResponse(
            selection=selection,
            season=season,
            base_inputs={"requested_field_ids": requested_ids},
            crop_rankings=[],
            best_crop=None,
            scenarios=[],
            models_used=[],
            **contract,
        )

    reservoir = await farmer_service.fetch_reservoir_snapshot(
        settings.irrigation_service_url, auth_header=auth_header
    )
    weather = await farmer_service.fetch_weather_summary(
        settings.forecasting_service_url, auth_header=auth_header
    )

    reservoir_pct: Optional[float] = None
    if isinstance(reservoir, dict):
        for key in ("water_level_pct", "active_storage_pct", "current_level_pct"):
            value = reservoir.get(key)
            if value is not None:
                try:
                    reservoir_pct = float(value)
                    break
                except (TypeError, ValueError):
                    continue

    weather_defaults = farmer_service.derive_weather_defaults(weather, season=season)
    first_field = resolved_fields[0]
    first_soil = _normalize_soil_type(
        str(first_field.get("soil_type") or "Loam")
    )
    first_water = float(first_field.get("water_availability_mm") or 500.0)
    scenarios = payload.scenarios or _default_area_scenarios(
        soil_type=first_soil,
        weather_defaults=weather_defaults,
        water_availability_mm=first_water,
    )
    scenarios = scenarios[:6]

    scenario_results: List[FarmerAreaOptimizationScenarioResult] = []
    all_field_results: List[FarmerAreaOptimizationFieldResult] = []
    models_used: set[str] = set()

    for scenario_index, scenario in enumerate(scenarios):
        scenario_field_results: List[FarmerAreaOptimizationFieldResult] = []
        scenario_models: set[str] = set()

        for field in resolved_fields:
            field_id = str(field.get("id") or "")
            soil_type = _normalize_soil_type(
                scenario.soil_type or str(field.get("soil_type") or first_soil or "Loam")
            )
            scenario_weather = dict(weather_defaults)
            if scenario.season_rainfall_mm is not None:
                scenario_weather["season_rainfall_mm"] = float(scenario.season_rainfall_mm)
            if scenario.season_avg_temp is not None:
                scenario_weather["season_avg_temp"] = float(scenario.season_avg_temp)

            water_availability = (
                float(scenario.water_availability_mm)
                if scenario.water_availability_mm is not None
                else float(field.get("water_availability_mm") or first_water or 500.0)
            )
            water_band = farmer_service.classify_water_band(
                water_availability,
                reservoir_level_pct=reservoir_pct,
            )
            adaptive_request = _build_adaptive_request(
                field={**field, "water_availability_mm": water_availability},
                soil_type=soil_type,
                season=season,
                weather_defaults=scenario_weather,
                water_band=water_band,
                top_n=payload.top_n,
                price_factor=scenario.price_factor,
            )

            adaptive_response: AdaptiveRecommendationResponse = await get_adaptive_recommendations(
                request=adaptive_request,
                db=db,
                user_context=user_context,
            )
            for model_name in adaptive_response.models_used:
                scenario_models.add(model_name)
                models_used.add(model_name)

            recs = adaptive_response.recommendations or []
            field_result = FarmerAreaOptimizationFieldResult(
                field_id=field_id,
                field_name=field.get("name"),
                area_ha=float(field.get("area_ha") or 1.0),
                soil_type=soil_type,
                water_band=str(water_band["band"]),
                season_rainfall_mm=float(scenario_weather["season_rainfall_mm"]),
                season_avg_temp=float(scenario_weather["season_avg_temp"]),
                water_availability_mm=float(water_band["water_availability_mm"]),
                best_crop=recs[0] if recs else None,
                recommendations=recs,
            )
            scenario_field_results.append(field_result)
            all_field_results.append(field_result)

        scenario_rankings = _rank_area_crops(
            scenario_field_results,
            scenario_id=scenario.scenario_id,
        )
        scenario_results.append(
            FarmerAreaOptimizationScenarioResult(
                scenario_id=scenario.scenario_id,
                title=_scenario_title(scenario, scenario_index),
                inputs=scenario,
                field_results=scenario_field_results,
                crop_rankings=scenario_rankings,
                best_crop=scenario_rankings[0] if scenario_rankings else None,
                models_used=sorted(scenario_models),
                message=(
                    "Scenario produced crop rankings."
                    if scenario_rankings
                    else "No crops met this scenario's constraints."
                ),
            )
        )

    crop_rankings = _rank_area_crops(all_field_results)
    has_rankings = bool(crop_rankings)
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=has_rankings,
        raw_status="ok" if has_rankings else "data_unavailable",
        message=(
            "Area crop optimization completed."
            if has_rankings
            else "No crop recommendation could be generated for the selected area."
        ),
    )

    response = FarmerAreaOptimizeResponse(
        selection=selection,
        season=season,
        base_inputs={
            "weather": weather_defaults,
            "reservoir_level_pct": reservoir_pct,
            "scenario_count": len(scenario_results),
            "top_n": payload.top_n,
        },
        crop_rankings=crop_rankings,
        best_crop=crop_rankings[0] if crop_rankings else None,
        scenarios=scenario_results,
        models_used=sorted(models_used),
        **contract,
    )

    try:
        RunArtifactRepository.save_artifact(
            db,
            run_type="farmer_area_optimize",
            field_id=",".join(selection.field_ids[:10]) or None,
            season=season,
            request_payload=payload.model_dump(),
            response_payload=response.model_dump(),
            status=str(contract.get("status") or "ok"),
            source=str(contract.get("source") or "optimization_service"),
            data_available=bool(contract.get("data_available")),
            observed_at=observed_at_dt,
        )
    except Exception as exc:
        logger.info("Area optimization artifact save failed: %s", exc)

    return response


@router.get("/current", response_model=FarmerCurrentPlanResponse)
async def farmer_current_plan(
    db: Annotated[Session, Depends(get_db)],
    user_context: Annotated[Dict[str, Any], Depends(get_current_user_context)],
    field_id: str = Query(..., description="Field identifier"),
) -> FarmerCurrentPlanResponse:
    """Return the latest saved farmer plan for Optimization tab hydration."""
    del user_context
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()

    selected_row = _latest_selected_recommendation(db, field_id)
    latest_row = _latest_recommendation_any_season(db, field_id)
    if not selected_row and not latest_row:
        contract = build_contract(
            source="optimization_service",
            observed_at=observed_at,
            data_available=False,
            raw_status="data_unavailable",
            message="No saved optimization plan yet. Run analysis to get started.",
        )
        return FarmerCurrentPlanResponse(field_id=field_id, **contract)

    recs_row = _latest_recommendation_with_recs(
        db,
        field_id,
        preferred_season=selected_row.season if selected_row else None,
    ) or _latest_recommendation_with_recs(db, field_id)

    row_for_payload = recs_row or selected_row or latest_row
    payload = (
        row_for_payload.response_data
        if row_for_payload and isinstance(row_for_payload.response_data, dict)
        else {}
    )
    recommendations = _coerce_recommendations(payload.get("recommendations"))
    field_context = _coerce_field_context(payload.get("field_context"))

    selected_crop_id = (
        (selected_row.selected_crop_id if selected_row else None)
        or (latest_row.selected_crop_id if latest_row else None)
        or None
    )
    selected_crop = (
        next((rec for rec in recommendations if rec.crop_id == selected_crop_id), None)
        if selected_crop_id
        else None
    )

    if not selected_crop or not recommendations:
        artifact_snapshot = _latest_select_artifact_snapshot(
            db,
            field_id,
            preferred_season=selected_row.season if selected_row else None,
        )
        if artifact_snapshot:
            snapshot_crop = None
            try:
                snapshot_crop = AdaptiveCropRecommendation(
                    **artifact_snapshot["crop_snapshot"]
                )
            except Exception:
                snapshot_crop = None

            if snapshot_crop is not None:
                if not selected_crop_id:
                    selected_crop_id = (
                        str(artifact_snapshot.get("crop_id") or snapshot_crop.crop_id)
                        or None
                    )
                if not selected_crop:
                    selected_crop = snapshot_crop
                if all(rec.crop_id != snapshot_crop.crop_id for rec in recommendations):
                    recommendations = [snapshot_crop, *recommendations]

            if field_context is None and isinstance(
                artifact_snapshot.get("field_context"), dict
            ):
                field_context = _coerce_field_context(
                    artifact_snapshot["field_context"]
                )

    has_recs = bool(recommendations)
    has_selected = bool(selected_crop_id)
    message = (
        f"Loaded saved crop plan ({selected_crop_id}) for this field."
        if has_selected
        else "No crop selected yet. Pick one from the latest recommendations."
    )
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=has_recs,
        raw_status="ok" if has_recs else "data_unavailable",
        message=message if has_recs else "No recommendation payload found in saved plan.",
    )

    response = FarmerCurrentPlanResponse(
        field_id=field_id,
        season=(
            row_for_payload.season if row_for_payload else (selected_row.season if selected_row else None)
        ),
        selected_crop_id=selected_crop_id,
        selected_crop=selected_crop,
        field_context=field_context,
        recommendations=recommendations,
        scenario_variants=payload.get("scenario_variants") if isinstance(payload, dict) else None,
        **contract,
    )

    RunArtifactRepository.save_artifact(
        db,
        run_type="farmer_current",
        field_id=field_id,
        season=(
            row_for_payload.season if row_for_payload else (selected_row.season if selected_row else None)
        ),
        request_payload={"field_id": field_id},
        response_payload=response.model_dump(),
        status=str(contract.get("status") or "ok"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at_dt,
    )

    return response


@router.get("/calendar", response_model=FarmerCalendarResponse)
async def farmer_calendar(
    db: Annotated[Session, Depends(get_db)],
    user_context: Annotated[Dict[str, Any], Depends(get_current_user_context)],
    field_id: str = Query(..., description="Field identifier"),
    season: str = Query(..., description="Season tag"),
    recommendation_id: Optional[int] = Query(default=None, description="Recommendation id"),
) -> FarmerCalendarResponse:
    del user_context
    observed_at = datetime.utcnow().isoformat()

    cached = (
        CropCalendarRepository.get_for_recommendation(db, recommendation_id)
        if recommendation_id is not None
        else CropCalendarRepository.get_for_field_season(db, field_id, season)
    )
    if cached:
        return _calendar_response_from_payload(
            cached,
            observed_at=observed_at,
            message="Loaded persisted crop calendar.",
        )

    field = FieldRepository.get_field_by_id(db, field_id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Field {field_id} not found.")

    rec = _latest_recommendation(db, field_id, season) or _latest_recommendation_any_season(db, field_id)
    if not rec or not isinstance(rec.response_data, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recommendation available to build a crop calendar.",
        )
    recommendations = rec.response_data.get("recommendations") or []
    crop_payload = next(
        (
            item for item in recommendations
            if str(item.get("crop_id")) == str(rec.selected_crop_id or "")
        ),
        recommendations[0] if recommendations else None,
    )
    if not crop_payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No crop recommendation available.")

    generated = CropCalendarService.generate_calendar(
        crop=crop_payload,
        field=field,
        season=season,
        planting_date=None,
        recommendation_id=int(rec.id) if getattr(rec, "id", None) else recommendation_id,
        db=db,
    )
    return _calendar_response_from_payload(
        generated,
        observed_at=observed_at,
        message="Generated crop calendar from the latest recommendation.",
    )


@router.get("/explanation", response_model=FarmerExplanationResponse)
async def farmer_explanation(
    db: Annotated[Session, Depends(get_db)],
    user_context: Annotated[Dict[str, Any], Depends(get_current_user_context)],
    field_id: str = Query(...),
    season: str = Query(...),
    crop_id: str = Query(...),
    language: str = Query(default="en"),
) -> FarmerExplanationResponse:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    rec = _latest_recommendation(db, field_id, season)
    if not rec or not isinstance(rec.response_data, dict):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No recommendation found for explanations.")

    field_context = _coerce_field_context(rec.response_data.get("field_context"))
    recommendations = _coerce_recommendations(rec.response_data.get("recommendations"))
    current_crop = next((item for item in recommendations if item.crop_id == crop_id), None)
    if field_context is None or current_crop is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested crop is not in the latest recommendation.")

    previous_row = _latest_recommendation_any_season(db, field_id)
    previous_crop = None
    previous_date = None
    if previous_row and previous_row.id != rec.id and isinstance(previous_row.response_data, dict):
        previous_recs = _coerce_recommendations(previous_row.response_data.get("recommendations"))
        previous_crop = previous_recs[0] if previous_recs else None
        previous_date = previous_row.created_at.isoformat() if previous_row.created_at else None

    explanations = _build_farmer_explanations(
        language=language,
        field_context=field_context,
        current_crop=current_crop,
        previous_crop=previous_crop,
        previous_date=previous_date,
    )
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=True,
        raw_status="ok",
        message="Generated multilingual crop explanations.",
    )
    return FarmerExplanationResponse(
        field_id=field_id,
        season=season,
        crop_id=crop_id,
        language=language,
        explanations=explanations,
        **contract,
    )


@router.post("/recommend", response_model=FarmerRecommendResponse)
async def farmer_recommend(
    payload: FarmerRecommendRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> FarmerRecommendResponse:
    """Guided recommendation for the farmer Optimization tab.

    Inputs come from the wizard (soil type + season). The field record
    on file supplies area, location, soil chemistry, and the seasonal
    water allocation. Live signals (reservoir level, weather summary)
    are best-effort and never block the response.
    """
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()
    season = _resolve_season(payload.season)
    soil_type = _normalize_soil_type(payload.soil_type)

    auth_header = request.headers.get("authorization")
    field = await _resolve_field(db, payload.field_id, auth_header=auth_header)
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field {payload.field_id} not found.",
        )

    import asyncio as _asyncio
    from app.services.cross_service_fusion import (
        fetch_f2_stress_penalty,
        fetch_f3_drought_risk,
        fetch_f3_weather_bands,
        apply_stress_penalty_to_suitability,
        apply_drought_risk_to_water_coverage,
        build_scenario_variants,
    )

    reservoir, weather, stress_penalty, drought_risk, weather_bands = await _asyncio.gather(
        farmer_service.fetch_reservoir_snapshot(settings.irrigation_service_url, auth_header=auth_header),
        farmer_service.fetch_weather_summary(settings.forecasting_service_url, auth_header=auth_header),
        fetch_f2_stress_penalty(settings.crop_health_service_url, payload.field_id, auth_header=auth_header),
        fetch_f3_drought_risk(settings.forecasting_service_url, auth_header=auth_header),
        fetch_f3_weather_bands(settings.forecasting_service_url, auth_header=auth_header),
        return_exceptions=True,
    )
    # Treat any exception returns from gather as None
    if isinstance(stress_penalty, Exception):
        stress_penalty = None
    if isinstance(drought_risk, Exception):
        drought_risk = None
    if isinstance(weather_bands, Exception):
        weather_bands = None

    reservoir_pct: Optional[float] = None
    if isinstance(reservoir, dict):
        for key in ("water_level_pct", "active_storage_pct", "current_level_pct"):
            value = reservoir.get(key)
            if value is not None:
                try:
                    reservoir_pct = float(value)
                    break
                except (TypeError, ValueError):
                    continue

    water_band = farmer_service.classify_water_band(
        field.get("water_availability_mm"),
        reservoir_level_pct=reservoir_pct,
    )
    weather_defaults = farmer_service.derive_weather_defaults(
        weather, season=season
    )

    adaptive_request = _build_adaptive_request(
        field=field,
        soil_type=soil_type,
        season=season,
        weather_defaults=weather_defaults,
        water_band=water_band,
        top_n=payload.top_n,
    )
    adaptive_request.water_params.water_coverage_ratio = apply_drought_risk_to_water_coverage(
        adaptive_request.water_params.water_coverage_ratio,
        drought_risk if isinstance(drought_risk, (int, float)) else None,
    )

    adaptive_response: AdaptiveRecommendationResponse = await get_adaptive_recommendations(
        request=adaptive_request,
        db=db,
        user_context=user_context,
        stress_penalty_factor=float(stress_penalty or 0.0) if isinstance(stress_penalty, (int, float)) else 0.0,
        drought_risk=float(drought_risk or 0.0) if isinstance(drought_risk, (int, float)) else 0.0,
    )

    # Apply F2/F3 fusion to recommendation scores
    if adaptive_response.recommendations and (stress_penalty or drought_risk):
        adjusted: List[AdaptiveCropRecommendation] = []
        for rec in adaptive_response.recommendations:
            rec_dict = rec.model_dump()
            new_suit = apply_stress_penalty_to_suitability(
                rec_dict.get("suitability_score", 0.5), stress_penalty
            )
            rec_dict["suitability_score"] = round(new_suit, 3)
            adjusted.append(AdaptiveCropRecommendation(**rec_dict))
        adaptive_response = adaptive_response.model_copy(update={"recommendations": adjusted})

    field_context = FarmerFieldContext(
        field_id=str(field.get("id") or payload.field_id),
        field_name=field.get("name"),
        area_ha=float(field.get("area_ha") or 1.0),
        soil_type=soil_type,
        soil_ph=field.get("soil_ph"),
        water_availability_mm=water_band["water_availability_mm"],
        water_band=water_band["band"],
        water_explanation=water_band["explanation"],
        reservoir_level_pct=water_band["reservoir_level_pct"],
        season=season,
        current_date=date.today().isoformat(),
        season_avg_temp=weather_defaults["season_avg_temp"],
        season_rainfall_mm=weather_defaults["season_rainfall_mm"],
    )

    has_recs = bool(adaptive_response.recommendations)
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=has_recs,
        raw_status=adaptive_response.status if has_recs else "data_unavailable",
        message=(
            adaptive_response.message
            if has_recs
            else "No crops met the constraints for this field."
        ),
    )

    # Build scenario variants from F3 water risk bands if available
    scenario_variants: Optional[Dict[str, Any]] = None
    top_recs = adaptive_response.recommendations
    if weather_bands and isinstance(weather_bands, dict) and top_recs:
        top_rec_dict = top_recs[0].model_dump()
        scenario_variants = build_scenario_variants(
            top_rec_dict,
            water_p10=weather_bands.get("water_p10", 0.8),
            water_p50=weather_bands.get("water_p50", 1.0),
            water_p90=weather_bands.get("water_p90", 1.1),
        )

    previous_crop: Optional[AdaptiveCropRecommendation] = None
    previous_date: Optional[str] = None
    previous_row = _latest_recommendation_any_season(db, str(field.get("id") or payload.field_id))
    if previous_row and isinstance(previous_row.response_data, dict):
        previous_recs = _coerce_recommendations(previous_row.response_data.get("recommendations"))
        if previous_recs:
            previous_crop = previous_recs[0]
        previous_date = previous_row.created_at.isoformat() if previous_row.created_at else None

    explanations = None
    if top_recs:
        explanations = _build_farmer_explanations(
            language=payload.language,
            field_context=field_context,
            current_crop=top_recs[0],
            previous_crop=previous_crop,
            previous_date=previous_date,
        )

    response = FarmerRecommendResponse(
        field_context=field_context,
        recommendations=adaptive_response.recommendations,
        models_used=adaptive_response.models_used,
        scenario_variants=scenario_variants,
        explanations=explanations,
        **contract,
    )

    if has_recs:
        rec_id = _persist_farmer_recommendation(
            db,
            field_id=str(field.get("id") or payload.field_id),
            season=season,
            request_payload=payload.model_dump(),
            response_payload=response.model_dump(),
            observed_at=observed_at_dt,
            contract=contract,
        )
        top_crop = adaptive_response.recommendations[0]
        try:
            CropCalendarService.generate_calendar(
                crop=top_crop.model_dump(),
                field=field,
                season=season,
                planting_date=None,
                recommendation_id=rec_id,
                db=db,
            )
        except Exception as exc:
            logger.info("Crop calendar generation failed for %s/%s: %s", field.get("id"), season, exc)

    return response


@router.get("/crop-detail", response_model=FarmerCropDetailResponse)
async def farmer_crop_detail(
    db: Annotated[Session, Depends(get_db)],
    user_context: Annotated[Dict[str, Any], Depends(get_current_user_context)],
    field_id: str = Query(..., description="Field identifier"),
    crop_id: str = Query(..., description="Crop identifier from the ranked list"),
    season: Optional[str] = Query(default=None, description="Season tag"),
) -> FarmerCropDetailResponse:
    """Drill-down for a single crop from the latest farmer recommendation."""
    del user_context
    season = _resolve_season(season)
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()

    rec = _latest_recommendation(db, field_id, season)
    if not rec or not isinstance(rec.response_data, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No recommendation cached for field={field_id} season={season}. "
                "Call /f4/farmer/recommend first."
            ),
        )

    recommendations = rec.response_data.get("recommendations") or []
    crop_payload: Optional[Dict[str, Any]] = next(
        (r for r in recommendations if r.get("crop_id") == crop_id),
        None,
    )
    if not crop_payload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Crop {crop_id} not present in latest recommendation for "
                f"field={field_id} season={season}."
            ),
        )

    try:
        crop_model = AdaptiveCropRecommendation(**crop_payload)
    except Exception as exc:
        logger.warning("Failed to coerce cached crop payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cached recommendation payload is malformed.",
        )

    cost_breakdown = farmer_service.cost_breakdown(crop_model.estimated_cost_per_ha)
    price_history = farmer_service.fetch_price_history(db, crop_id)
    yield_history = farmer_service.fetch_yield_history(db, field_id, crop_id)

    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=True,
        raw_status="ok",
        message="Crop detail loaded from latest recommendation.",
    )

    response = FarmerCropDetailResponse(
        field_id=field_id,
        season=season,
        crop=crop_model,
        cost_breakdown=cost_breakdown,
        price_history=price_history,
        yield_history=yield_history,
        **contract,
    )

    RunArtifactRepository.save_artifact(
        db,
        run_type="farmer_crop_detail",
        field_id=field_id,
        season=season,
        request_payload={"field_id": field_id, "crop_id": crop_id, "season": season},
        response_payload=response.model_dump(),
        status=str(contract.get("status") or "ok"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=True,
        observed_at=observed_at_dt,
    )

    return response


@router.post("/select", response_model=FarmerSelectResponse)
async def farmer_select(
    payload: FarmerSelectRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Annotated[Dict[str, Any], Depends(get_current_user_context)],
) -> FarmerSelectResponse:
    """Persist the farmer's chosen crop on the latest recommendation."""
    del user_context
    season = _resolve_season(payload.season)
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()

    rec = _latest_recommendation(db, payload.field_id, season)

    cached_recs: List[Dict[str, Any]] = []
    if rec is not None and isinstance(rec.response_data, dict):
        cached_recs = rec.response_data.get("recommendations") or []

    crop_in_run = any(r.get("crop_id") == payload.crop_id for r in cached_recs)
    if not crop_in_run:
        in_db = bool(CropRepository.get_crop_by_id(db, payload.crop_id))
        in_default = any(c["id"] == payload.crop_id for c in DEFAULT_CROPS)
        if not in_db and not in_default:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Crop {payload.crop_id} is not in the catalog.",
            )

    snapshot_payload = (
        payload.crop_snapshot.model_dump() if payload.crop_snapshot is not None else None
    )
    if isinstance(snapshot_payload, dict):
        snapshot_payload["crop_id"] = payload.crop_id

    if snapshot_payload is None:
        matched_snapshot = next(
            (
                r
                for r in cached_recs
                if isinstance(r, dict) and str(r.get("crop_id")) == payload.crop_id
            ),
            None,
        )
        if isinstance(matched_snapshot, dict):
            snapshot_payload = dict(matched_snapshot)

    persisted = False
    rec_id: Optional[int] = None
    try:
        if rec is None:
            # No prior run cached (e.g. recommend's persistence step failed
            # silently because the DB was unreachable). Insert a fresh row
            # carrying just the selection so the choice survives — the
            # /recommend response_data can be backfilled on the next run.
            response_data: Dict[str, Any] = {"recommendations": []}
            if snapshot_payload is not None:
                response_data["recommendations"] = [dict(snapshot_payload)]
            if payload.field_context is not None:
                response_data["field_context"] = payload.field_context.model_dump()
            rec = Recommendation(
                field_id=payload.field_id,
                season=season,
                request_data={"field_id": payload.field_id, "season": season},
                response_data=response_data,
                selected_crop_id=payload.crop_id,
            )
            db.add(rec)
        else:
            response_data = (
                dict(rec.response_data)
                if isinstance(rec.response_data, dict)
                else {}
            )
            recs_payload = response_data.get("recommendations")
            recommendations = (
                [dict(raw) for raw in recs_payload if isinstance(raw, dict)]
                if isinstance(recs_payload, list)
                else []
            )

            if snapshot_payload is not None:
                replace_idx: Optional[int] = None
                for idx, raw in enumerate(recommendations):
                    if isinstance(raw, dict) and raw.get("crop_id") == payload.crop_id:
                        replace_idx = idx
                        break
                if replace_idx is None:
                    recommendations.insert(0, dict(snapshot_payload))
                else:
                    recommendations[replace_idx] = dict(snapshot_payload)
                response_data["recommendations"] = recommendations

            if payload.field_context is not None:
                response_data["field_context"] = payload.field_context.model_dump()

            rec.response_data = response_data
            rec.selected_crop_id = payload.crop_id
            db.add(rec)
        db.commit()
        db.refresh(rec)
        persisted = True
        rec_id = int(rec.id)
    except Exception as exc:
        logger.warning("Selection persistence failed: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=persisted,
        raw_status="ok" if persisted else "data_unavailable",
        message=(
            f"Selected {payload.crop_id} for {payload.field_id} ({season})."
            if persisted
            else "Selection could not be persisted."
        ),
    )

    response = FarmerSelectResponse(
        field_id=payload.field_id,
        crop_id=payload.crop_id,
        season=season,
        recommendation_id=rec_id,
        persisted=persisted,
        **contract,
    )

    RunArtifactRepository.save_artifact(
        db,
        run_type="farmer_select",
        field_id=payload.field_id,
        season=season,
        request_payload=payload.model_dump(),
        response_payload=response.model_dump(),
        status=str(contract.get("status") or "ok"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=persisted,
        observed_at=observed_at_dt,
    )

    return response

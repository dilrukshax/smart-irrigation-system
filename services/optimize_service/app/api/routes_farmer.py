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
from typing import Annotated, Any, Dict, List, Optional

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
    CropRepository,
    FieldRepository,
    RecommendationRepository,
    RunArtifactRepository,
)
from app.dependencies.auth import get_current_user_context
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
        market_params=MarketParameters(),
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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


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

    adaptive_response: AdaptiveRecommendationResponse = await get_adaptive_recommendations(
        request=adaptive_request,
        db=db,
        user_context=user_context,
    )

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

    response = FarmerRecommendResponse(
        field_context=field_context,
        recommendations=adaptive_response.recommendations,
        models_used=adaptive_response.models_used,
        **contract,
    )

    if has_recs:
        _persist_farmer_recommendation(
            db,
            field_id=str(field.get("id") or payload.field_id),
            season=season,
            request_payload=payload.model_dump(),
            response_payload=response.model_dump(),
            observed_at=observed_at_dt,
            contract=contract,
        )

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

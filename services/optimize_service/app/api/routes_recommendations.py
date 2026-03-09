"""Recommendation and optimization routes for F4."""

import logging
from datetime import datetime
from typing import Annotated, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.schemas import RecommendationRequest, RecommendationResponse
from app.core.config import get_settings
from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import CropRepository, FieldRepository, RecommendationRepository, RunArtifactRepository
from app.dependencies.auth import get_current_user_context, require_admin
from app.optimization.constraints import OptimizationConstraints, OptimizationCropInput
from app.optimization.optimizer import Optimizer
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/f4/recommendations", tags=["recommendations"])


class OptimizationPlannerRequest(BaseModel):
    waterQuota: float = Field(default=3000.0, gt=0)
    constraints: Dict[str, object] = Field(default_factory=dict)
    season: str = Field(default="Maha-2025")


class ScenarioEvaluationRequest(BaseModel):
    season: str = Field(default="Maha-2025")
    field_ids: Optional[List[str]] = Field(default=None)
    scenario_name: Optional[str] = Field(default=None)
    water_quota_mm: Optional[float] = Field(default=None, gt=0)
    price_factor: Optional[float] = Field(default=None, gt=0)
    min_paddy_area: float = Field(default=0.0, ge=0)
    max_risk_level: str = Field(default="high")


def _risk_level_to_score(risk: Optional[str]) -> int:
    mapping = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    return mapping.get((risk or "medium").lower(), 2)


def _is_admin(user_context: Dict[str, object]) -> bool:
    return "admin" in (user_context.get("roles") or [])


def _merge_latest_recommendations(
    db: Session,
    season: str,
    scheme_id: Optional[str],
) -> List[Dict[str, object]]:
    fields = {f["id"]: f for f in FieldRepository.list_fields(db, scheme_id=scheme_id)}
    latest = RecommendationRepository.list_latest_by_field(
        db_session=db,
        season=season,
        scheme_id=scheme_id,
    )

    result: List[Dict[str, object]] = []
    for row in latest:
        field_id = row.get("field_id")
        field = fields.get(field_id, {})
        payload = row.get("response_data") or {}
        result.append(
            {
                "field_id": field_id,
                "field_name": field.get("name") or field_id,
                "scheme_id": field.get("scheme_id"),
                "area_ha": field.get("area_ha"),
                "soil_type": field.get("soil_type"),
                "soil_ph": field.get("soil_ph"),
                "soil_ec": field.get("soil_ec"),
                "location": field.get("location"),
                "latitude": field.get("latitude"),
                "longitude": field.get("longitude"),
                "water_availability_mm": field.get("water_availability_mm"),
                "recommendations": payload.get("recommendations", []),
                "season": row.get("season"),
                "response_status": payload.get("status", "ok"),
                "response_data_available": payload.get("data_available", True),
            }
        )

    return result


def _generate_for_fields(
    db: Session,
    season: str,
    field_id: Optional[str] = None,
) -> None:
    service = RecommendationService()
    fields = FieldRepository.list_fields(db)
    if field_id:
        fields = [f for f in fields if f.get("id") == field_id]
    for field in fields:
        fid = field.get("id")
        if not fid:
            continue
        request = RecommendationRequest(field_id=fid, season=season)
        service.get_recommendations(request=request, db_session=db)


def _run_optimization_from_rows(
    *,
    db: Session,
    latest: List[Dict[str, object]],
    water_quota: float,
    constraints: Dict[str, object],
) -> Dict[str, object]:
    strict_live_data = settings.is_strict_live_data
    max_risk = str(constraints.get("maxRiskLevel", "high")).lower()
    risk_limit = _risk_level_to_score(max_risk)
    grouped: Dict[str, Dict[str, float]] = {}
    skipped_fields: List[Dict[str, str]] = []

    for field in latest:
        field_id = str(field.get("field_id") or "unknown")
        area_raw = field.get("area_ha")
        if strict_live_data and area_raw is None:
            skipped_fields.append({"field_id": field_id, "reason": "missing_field_area"})
            continue

        area = float(area_raw or 1.0)
        top = (field.get("recommendations") or [])
        if not top:
            skipped_fields.append({"field_id": field_id, "reason": "no_recommendations"})
            continue

        rec = top[0]
        risk_band = str(rec.get("risk_band") or "medium").lower()
        if _risk_level_to_score(risk_band) > risk_limit:
            continue

        expected_profit_raw = rec.get("expected_profit_per_ha")
        expected_yield_raw = rec.get("expected_yield_t_per_ha")
        suitability_raw = rec.get("suitability_score")
        if strict_live_data and (
            expected_profit_raw is None
            or expected_yield_raw is None
            or suitability_raw is None
        ):
            skipped_fields.append({"field_id": field_id, "reason": "incomplete_recommendation_context"})
            continue

        crop_id = rec.get("crop_id") or "unknown"
        crop_name = rec.get("crop_name") or crop_id
        expected_profit = float(expected_profit_raw or 0.0)
        expected_yield = float(expected_yield_raw or 0.0)
        suitability = float(suitability_raw or 0.5)

        crop_meta = CropRepository.get_crop_by_id(db, crop_id) or {}
        water_req_raw = crop_meta.get("water_requirement_mm")
        if strict_live_data and water_req_raw is None:
            skipped_fields.append({"field_id": field_id, "reason": "missing_water_requirement"})
            continue
        water_req = float(water_req_raw or 500.0)

        if crop_id not in grouped:
            grouped[crop_id] = {
                "crop_id": crop_id,
                "crop_name": crop_name,
                "area_cap": 0.0,
                "profit_sum": 0.0,
                "yield_sum": 0.0,
                "suitability_sum": 0.0,
                "water_req": water_req,
                "count": 0.0,
                "risk": risk_band,
            }

        bucket = grouped[crop_id]
        bucket["area_cap"] += area
        bucket["profit_sum"] += expected_profit
        bucket["yield_sum"] += expected_yield
        bucket["suitability_sum"] += suitability
        bucket["count"] += 1.0

    total_area = sum(float(field.get("area_ha") or 1.0) for field in latest)
    crop_inputs: List[OptimizationCropInput] = []
    min_paddy_area = float(constraints.get("minPaddyArea") or 0.0)

    for crop_id, bucket in grouped.items():
        avg_profit = bucket["profit_sum"] / max(bucket["count"], 1.0)
        avg_suitability = bucket["suitability_sum"] / max(bucket["count"], 1.0)
        min_area = min_paddy_area if "paddy" in bucket["crop_name"].lower() else 0.0

        crop_inputs.append(
            OptimizationCropInput(
                crop_id=crop_id,
                crop_name=str(bucket["crop_name"]),
                min_area_ha=min_area,
                max_area_ha=max(float(bucket["area_cap"]), min_area),
                expected_profit_per_ha=avg_profit,
                water_req_mm_per_ha=float(bucket["water_req"]),
                suitability_score=avg_suitability,
            )
        )

    if not crop_inputs:
        return {
            "status": "data_unavailable",
            "message": "No crops satisfy optimization constraints from live context.",
            "total_profit": 0.0,
            "total_area": 0.0,
            "water_usage": 0.0,
            "allocation": [],
            "skipped_fields": skipped_fields,
        }

    optimizer = Optimizer(
        crop_inputs=crop_inputs,
        constraints=OptimizationConstraints(
            total_water_quota_mm=float(water_quota),
            total_area_ha=total_area,
        ),
    )
    result = optimizer.optimize()

    allocation = []
    for crop in crop_inputs:
        area = result.allocations.get(crop.crop_id, 0.0)
        if area <= 0:
            continue
        meta = grouped.get(crop.crop_id, {})
        avg_yield = float(meta.get("yield_sum", 0.0)) / max(float(meta.get("count", 1.0)), 1.0)
        avg_price = 0.0
        if avg_yield > 0:
            avg_price = crop.expected_profit_per_ha / max(avg_yield * 1000.0, 1.0)

        allocation.append(
            {
                "crop_id": crop.crop_id,
                "crop_name": crop.crop_name,
                "area_ha": round(area, 3),
                "predicted_yield": round(avg_yield, 3),
                "predicted_price": round(max(avg_price, 0.0), 2),
                "profit": round(area * crop.expected_profit_per_ha, 2),
                "water_usage": round(area * crop.water_req_mm_per_ha, 2),
                "suitability": round(crop.suitability_score, 3),
                "risk": meta.get("risk", "medium"),
            }
        )

    return {
        "status": "ok" if allocation else "data_unavailable",
        "message": result.message if allocation else "Optimization produced no allocatable crops.",
        "optimization_status": result.status,
        "total_profit": round(result.total_profit, 2),
        "total_area": round(sum(row["area_ha"] for row in allocation), 3),
        "water_usage": round(result.total_water_used, 2),
        "allocation": allocation,
        "skipped_fields": skipped_fields,
    }


@router.get("")
@router.get("/")
async def list_recommendations(
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, object] = Depends(get_current_user_context),
    season: str = Query(default="Maha-2025"),
    field_id: Optional[str] = Query(default=None),
    scheme_id: Optional[str] = Query(default=None),
    refresh: bool = Query(default=False),
):
    """List latest per-field recommendations for dashboards."""
    if refresh:
        if not _is_admin(user_context):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required for recommendation refresh.",
            )
        _generate_for_fields(db=db, season=season, field_id=field_id)

    data = _merge_latest_recommendations(db=db, season=season, scheme_id=scheme_id)

    if field_id:
        data = [row for row in data if row.get("field_id") == field_id]

    data_available = bool(data)
    observed_at = datetime.utcnow()
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=data_available,
        raw_status="ok" if data_available else "data_unavailable",
        message=(
            "Latest optimization recommendations loaded."
            if data_available
            else "No persisted recommendations available."
        ),
    )
    RunArtifactRepository.save_artifact(
        db,
        run_type="recommendation_list",
        field_id=field_id,
        season=season,
        request_payload={"season": season, "field_id": field_id, "scheme_id": scheme_id, "refresh": refresh},
        response_payload={"data": data, "season": season, "count": len(data), **contract},
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return {"data": data, "season": season, "count": len(data), **contract}


@router.post("", response_model=RecommendationResponse)
@router.post("/", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, object] = Depends(get_current_user_context),
) -> RecommendationResponse:
    """Generate recommendations for one field and persist output."""
    del user_context
    logger.info(
        "Received recommendation request for field=%s season=%s",
        request.field_id,
        request.season,
    )
    service = RecommendationService()
    return service.get_recommendations(request=request, db_session=db)


@router.post("/batch", response_model=List[RecommendationResponse])
async def get_recommendations_batch(
    requests: List[RecommendationRequest],
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, object] = Depends(get_current_user_context),
) -> List[RecommendationResponse]:
    """Generate recommendations for multiple fields in one call."""
    del user_context
    service = RecommendationService()
    return [service.get_recommendations(request=req, db_session=db) for req in requests]


@router.post("/optimize")
async def optimize_recommendations(
    request: OptimizationPlannerRequest,
    db: Annotated[Session, Depends(get_db)],
    admin_context: Dict[str, object] = Depends(require_admin),
):
    """Run area/water constrained optimization across latest recommendations."""
    del admin_context
    strict_live_data = settings.is_strict_live_data
    observed_at = datetime.utcnow()
    latest = _merge_latest_recommendations(db=db, season=request.season, scheme_id=None)
    if not latest:
        _generate_for_fields(db=db, season=request.season)
        latest = _merge_latest_recommendations(db=db, season=request.season, scheme_id=None)
    if not latest:
        contract = build_contract(
            source="optimization_service",
            observed_at=observed_at.isoformat(),
            data_available=False,
            raw_status="data_unavailable",
            message=(
                "No live recommendation context available for optimization."
                if strict_live_data
                else "No recommendation context available for optimization."
            ),
        )
        payload = {"data": {"status": "data_unavailable", "message": contract["message"], "allocation": []}, **contract}
        RunArtifactRepository.save_artifact(
            db,
            run_type="optimize",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(),
            response_payload=payload,
            status=str(contract.get("status") or "data_unavailable"),
            source=str(contract.get("source") or "optimization_service"),
            data_available=bool(contract.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    optimized = _run_optimization_from_rows(
        db=db,
        latest=latest,
        water_quota=float(request.waterQuota),
        constraints=request.constraints,
    )
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=bool(optimized.get("allocation")),
        raw_status=str(optimized.get("status") or "data_unavailable"),
        message=str(optimized.get("message") or "Optimization evaluation completed."),
    )
    payload = {"data": optimized, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="optimize",
        field_id=None,
        season=request.season,
        request_payload=request.model_dump(),
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return payload


@router.post("/scenario-evaluate")
@router.post("/scenario-evaluate/")
async def evaluate_scenario(
    request: ScenarioEvaluationRequest,
    db: Annotated[Session, Depends(get_db)],
    admin_context: Dict[str, object] = Depends(require_admin),
):
    """Evaluate a what-if scenario fully on the backend using live upstream context."""
    del admin_context
    strict_live_data = settings.is_strict_live_data
    observed_at = datetime.utcnow()
    fields = FieldRepository.list_fields(db)
    if request.field_ids:
        allowed = set(request.field_ids)
        fields = [f for f in fields if str(f.get("id")) in allowed]

    if not fields:
        contract = build_contract(
            source="optimization_service",
            observed_at=observed_at.isoformat(),
            data_available=False,
            raw_status="data_unavailable",
            message="No fields available for scenario evaluation.",
        )
        payload = {"data": {"status": "data_unavailable", "allocation": [], "fields_evaluated": 0}, **contract}
        RunArtifactRepository.save_artifact(
            db,
            run_type="scenario_evaluate",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(),
            response_payload=payload,
            status=str(contract.get("status") or "data_unavailable"),
            source=str(contract.get("source") or "optimization_service"),
            data_available=bool(contract.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    scenario_payload: Dict[str, object] = {}
    if request.water_quota_mm is not None:
        scenario_payload["water_quota_mm"] = float(request.water_quota_mm)
    if request.price_factor is not None:
        scenario_payload["price_factor"] = float(request.price_factor)

    rows: List[Dict[str, object]] = []
    failures: List[Dict[str, str]] = []
    service = RecommendationService()
    for field in fields:
        field_id = str(field.get("id"))
        response = service.get_recommendations(
            request=RecommendationRequest(
                field_id=field_id,
                season=request.season,
                scenario=scenario_payload or None,
            ),
            db_session=db,
        )
        if response.data_available and response.recommendations:
            rows.append(
                {
                    "field_id": field_id,
                    "field_name": field.get("name") or field_id,
                    "area_ha": field.get("area_ha"),
                    "recommendations": [rec.model_dump() for rec in response.recommendations],
                    "season": request.season,
                }
            )
        else:
            failures.append(
                {
                    "field_id": field_id,
                    "status": response.status,
                    "message": response.message or "Recommendation context unavailable.",
                }
            )

    water_quota = request.water_quota_mm
    if water_quota is None:
        quotas = [
            float(row.get("water_availability_mm"))
            for row in fields
            if row.get("water_availability_mm") is not None
        ]
        if quotas:
            water_quota = float(sum(quotas))
    if water_quota is None:
        if strict_live_data:
            contract = build_contract(
                source="optimization_service",
                observed_at=observed_at.isoformat(),
                data_available=False,
                raw_status="data_unavailable",
                message="Strict live-data mode requires explicit scenario quota or persisted field water availability.",
            )
            payload = {
                "data": {
                    "status": "data_unavailable",
                    "allocation": [],
                    "failures": failures,
                    "fields_evaluated": len(fields),
                    "fields_with_data": len(rows),
                },
                **contract,
            }
            RunArtifactRepository.save_artifact(
                db,
                run_type="scenario_evaluate",
                field_id=None,
                season=request.season,
                request_payload=request.model_dump(),
                response_payload=payload,
                status=str(contract.get("status") or "data_unavailable"),
                source=str(contract.get("source") or "optimization_service"),
                data_available=bool(contract.get("data_available")),
                observed_at=observed_at,
            )
            return payload
        water_quota = 3000.0

    constraints = {
        "minPaddyArea": request.min_paddy_area,
        "maxRiskLevel": request.max_risk_level,
    }
    optimized = _run_optimization_from_rows(
        db=db,
        latest=rows,
        water_quota=float(water_quota),
        constraints=constraints,
    )
    optimized["scenario_name"] = request.scenario_name or "custom"
    optimized["season"] = request.season
    optimized["water_quota_mm"] = float(water_quota)
    optimized["fields_evaluated"] = len(fields)
    optimized["fields_with_data"] = len(rows)
    optimized["failures"] = failures

    scenario_status = str(optimized.get("status") or "data_unavailable")
    if optimized.get("allocation") and failures and scenario_status == "ok":
        scenario_status = "stale"
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=bool(optimized.get("allocation")),
        raw_status=scenario_status,
        message=str(optimized.get("message") or "Scenario evaluation completed."),
    )
    payload = {"data": optimized, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="scenario_evaluate",
        field_id=None,
        season=request.season,
        request_payload=request.model_dump(),
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return payload

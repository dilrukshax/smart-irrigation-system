"""Operator-facing optimization routes for F4."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Any, Dict, Iterable, List, Optional, Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.routes_adaptive import load_crops_from_db
from app.api.routes_recommendations import (
    _generate_for_fields,
    _merge_latest_recommendations,
    _run_optimization_from_rows,
)
from app.core.contracts import build_contract
from app.core.schemas import RecommendationRequest
from app.data.db import get_db
from app.data.models_orm import OptimizationRunArtifact
from app.data.repositories import CropRepository, FieldRepository, RunArtifactRepository
from app.dependencies.auth import get_current_user_context
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4/operator", tags=["operator-optimization"])

OPERATOR_ROLES = {"officer", "authority", "admin"}
GLOBAL_ROLES = {"authority", "admin"}


class OperatorPlanRequest(BaseModel):
    """Request body for officer-safe scheme optimization."""

    model_config = ConfigDict(populate_by_name=True)

    season: str = Field(default="Maha-2025")
    scheme_id: Optional[str] = Field(default=None)
    water_quota_mm: Optional[float] = Field(default=None, gt=0, alias="waterQuota")
    min_paddy_area_ha: float = Field(default=0.0, ge=0)
    max_risk_level: str = Field(default="high")
    priority: str = Field(default="profit")
    rainfall_assumption: Optional[str] = Field(default=None)
    allow_plan_b: bool = Field(default=True)
    enforce_crop_continuity: bool = Field(default=False)
    refresh_missing: bool = Field(default=True)


class OperatorScenarioRequest(BaseModel):
    """Request body for officer-safe what-if evaluation."""

    model_config = ConfigDict(populate_by_name=True)

    scenario_name: str = Field(default="custom")
    season: str = Field(default="Maha-2025")
    scheme_id: Optional[str] = Field(default=None)
    field_ids: Optional[List[str]] = Field(default=None)
    water_quota_mm: Optional[float] = Field(default=None, gt=0, alias="waterQuota")
    price_factor: Optional[float] = Field(default=None, gt=0)
    min_paddy_area_ha: float = Field(default=0.0, ge=0)
    max_risk_level: str = Field(default="high")


async def require_operator(
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Allow officer, authority, and admin users to use operational F4 views."""
    roles = {str(role).strip().lower() for role in (user_context.get("roles") or [])}
    if not roles.intersection(OPERATOR_ROLES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer or authority privileges required",
        )
    return user_context


def _roles(user_context: Dict[str, Any]) -> set[str]:
    return {str(role).strip().lower() for role in (user_context.get("roles") or [])}


def _scope_scheme_ids(
    user_context: Dict[str, Any],
    requested_scheme_id: Optional[str],
) -> List[str]:
    """Resolve scheme filters without expanding officer access beyond assignment."""
    roles = _roles(user_context)
    assigned = [
        str(scheme_id)
        for scheme_id in (user_context.get("scheme_ids") or [])
        if str(scheme_id).strip()
    ]

    if roles.intersection(GLOBAL_ROLES):
        return [requested_scheme_id] if requested_scheme_id else []

    if requested_scheme_id:
        if assigned and requested_scheme_id not in assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requested scheme is outside the operator assignment",
            )
        return [requested_scheme_id]

    return assigned


def _dedupe_by_id(rows: Iterable[Dict[str, Any]], key: str = "id") -> List[Dict[str, Any]]:
    seen: set[str] = set()
    result: List[Dict[str, Any]] = []
    for row in rows:
        row_id = str(row.get(key) or "")
        if not row_id or row_id in seen:
            continue
        seen.add(row_id)
        result.append(row)
    return result


def _fields_for_scope(
    db: Session,
    user_context: Dict[str, Any],
    scheme_id: Optional[str],
) -> List[Dict[str, Any]]:
    scoped_scheme_ids = _scope_scheme_ids(user_context, scheme_id)
    if not scoped_scheme_ids:
        return FieldRepository.list_fields(db, scheme_id=scheme_id)

    fields: List[Dict[str, Any]] = []
    for scoped_scheme_id in scoped_scheme_ids:
        fields.extend(FieldRepository.list_fields(db, scheme_id=scoped_scheme_id))
    return _dedupe_by_id(fields)


def _latest_for_scope(
    db: Session,
    *,
    season: str,
    user_context: Dict[str, Any],
    scheme_id: Optional[str],
) -> List[Dict[str, Any]]:
    scoped_scheme_ids = _scope_scheme_ids(user_context, scheme_id)
    if not scoped_scheme_ids:
        return _merge_latest_recommendations(db=db, season=season, scheme_id=scheme_id)

    latest: List[Dict[str, Any]] = []
    for scoped_scheme_id in scoped_scheme_ids:
        latest.extend(
            _merge_latest_recommendations(
                db=db,
                season=season,
                scheme_id=scoped_scheme_id,
            )
        )
    return _dedupe_by_id(latest, key="field_id")


def _generate_missing_for_scope(
    db: Session,
    *,
    season: str,
    user_context: Dict[str, Any],
    scheme_id: Optional[str],
) -> None:
    fields = _fields_for_scope(db=db, user_context=user_context, scheme_id=scheme_id)
    for field in fields:
        field_id = field.get("id")
        if field_id:
            _generate_for_fields(db=db, season=season, field_id=str(field_id))


def _as_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _resolve_water_quota(
    latest: Sequence[Dict[str, Any]],
    explicit_quota: Optional[float],
) -> Optional[float]:
    if explicit_quota is not None:
        return float(explicit_quota)

    quotas = [
        float(value)
        for value in (
            _as_float(row.get("water_availability_mm"))
            for row in latest
        )
        if value is not None and value > 0
    ]
    if quotas:
        return round(sum(quotas), 2)
    return None


def _constraints_payload(
    *,
    min_paddy_area_ha: float,
    max_risk_level: str,
    priority: str,
    rainfall_assumption: Optional[str] = None,
    allow_plan_b: Optional[bool] = None,
    enforce_crop_continuity: Optional[bool] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "minPaddyArea": float(min_paddy_area_ha),
        "maxRiskLevel": max_risk_level,
        "priority": priority,
    }
    if rainfall_assumption is not None:
        payload["rainfallAssumption"] = rainfall_assumption
    if allow_plan_b is not None:
        payload["allowPlanB"] = bool(allow_plan_b)
    if enforce_crop_continuity is not None:
        payload["enforceCropContinuity"] = bool(enforce_crop_continuity)
    return payload


def _flatten_recommendations(latest: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for field in latest:
        recommendations = field.get("recommendations") or []
        if not isinstance(recommendations, list):
            continue
        for index, rec in enumerate(recommendations):
            if not isinstance(rec, dict):
                continue
            rows.append(
                {
                    **rec,
                    "rank": index + 1,
                    "field_id": field.get("field_id"),
                    "field_name": field.get("field_name"),
                    "scheme_id": field.get("scheme_id"),
                    "area_ha": field.get("area_ha"),
                    "season": field.get("season"),
                }
            )
    rows.sort(
        key=lambda row: (
            int(row.get("rank") or 999),
            -float(row.get("suitability_score") or 0.0),
        )
    )
    return rows


def _summarize_latest(
    db: Session,
    *,
    fields: Sequence[Dict[str, Any]],
    latest: Sequence[Dict[str, Any]],
    crops: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    total_area = round(
        sum(float(value) for value in (_as_float(field.get("area_ha")) for field in fields) if value is not None),
        3,
    )
    field_water_quota = sum(
        float(value)
        for value in (_as_float(field.get("water_availability_mm")) for field in fields)
        if value is not None and value > 0
    )

    crop_groups: Dict[str, Dict[str, Any]] = {}
    for field in latest:
        recommendations = field.get("recommendations") or []
        if not recommendations or not isinstance(recommendations, list):
            continue

        top = recommendations[0]
        if not isinstance(top, dict):
            continue

        crop_id = str(top.get("crop_id") or "unknown")
        crop_name = str(top.get("crop_name") or crop_id)
        area = float(_as_float(field.get("area_ha")) or 0.0)
        expected_profit = float(_as_float(top.get("expected_profit_per_ha")) or 0.0)
        expected_yield = float(_as_float(top.get("expected_yield_t_per_ha")) or 0.0)
        suitability = float(_as_float(top.get("suitability_score")) or 0.0)
        crop_meta = CropRepository.get_crop_by_id(db, crop_id) or {}
        water_req = float(_as_float(crop_meta.get("water_requirement_mm")) or 0.0)

        bucket = crop_groups.setdefault(
            crop_id,
            {
                "crop_id": crop_id,
                "crop_name": crop_name,
                "field_count": 0,
                "area_ha": 0.0,
                "expected_profit": 0.0,
                "expected_production_tonnes": 0.0,
                "water_usage": 0.0,
                "suitability_total": 0.0,
            },
        )
        bucket["field_count"] += 1
        bucket["area_ha"] += area
        bucket["expected_profit"] += expected_profit * area
        bucket["expected_production_tonnes"] += expected_yield * area
        bucket["water_usage"] += water_req * area
        bucket["suitability_total"] += suitability

    top_crops = []
    total_water_usage = sum(float(row["water_usage"]) for row in crop_groups.values())
    for row in crop_groups.values():
        field_count = max(int(row["field_count"]), 1)
        water_usage = float(row["water_usage"])
        top_crops.append(
            {
                "crop_id": row["crop_id"],
                "crop_name": row["crop_name"],
                "field_count": row["field_count"],
                "area_ha": round(float(row["area_ha"]), 3),
                "expected_profit": round(float(row["expected_profit"]), 2),
                "expected_production_tonnes": round(float(row["expected_production_tonnes"]), 3),
                "water_usage": round(water_usage, 2),
                "share_pct": round((water_usage / total_water_usage) * 100, 1) if total_water_usage else 0.0,
                "avg_suitability": round(float(row["suitability_total"]) / field_count, 3),
            }
        )
    top_crops.sort(key=lambda row: (row["area_ha"], row["expected_profit"]), reverse=True)

    return {
        "field_count": len(fields),
        "fields_with_recommendations": len(latest),
        "recommendation_count": len(_flatten_recommendations(latest)),
        "crop_count": len(crops),
        "total_area_ha": total_area,
        "top_crops": top_crops,
        "water_budget": {
            "quota": round(field_water_quota, 2) if field_water_quota else None,
            "total_usage": round(total_water_usage, 2),
            "quota_use_pct": (
                round((total_water_usage / field_water_quota) * 100, 1)
                if field_water_quota
                else None
            ),
            "crops": top_crops,
        },
    }


def _serialize_artifact(row: OptimizationRunArtifact) -> Dict[str, Any]:
    payload = row.response_payload or {}
    data = payload.get("data") if isinstance(payload, dict) else {}
    if not isinstance(data, dict):
        data = {}

    allocation = data.get("allocation") or data.get("allocations") or []
    if not isinstance(allocation, list):
        allocation = []

    request_payload = row.request_payload or {}
    if not isinstance(request_payload, dict):
        request_payload = {}

    summary = data.get("summary") if isinstance(data.get("summary"), dict) else {}
    return {
        "id": row.id,
        "run_type": row.run_type,
        "season": row.season,
        "field_id": row.field_id,
        "scenario_name": data.get("scenario_name") or request_payload.get("scenario_name") or row.run_type,
        "status": row.status,
        "source": row.source,
        "data_available": row.data_available,
        "observed_at": row.observed_at.isoformat() if row.observed_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "allocation_count": len(allocation),
        "total_area": data.get("total_area") or summary.get("total_area"),
        "total_profit": data.get("total_profit") or summary.get("total_profit"),
        "water_usage": data.get("water_usage") or summary.get("water_usage"),
        "constraints": data.get("constraints") or request_payload,
        "allocation": allocation,
    }


def _recent_artifacts(
    db: Session,
    *,
    run_types: Sequence[str],
    season: Optional[str],
    limit: int = 8,
) -> List[Dict[str, Any]]:
    try:
        query = db.query(OptimizationRunArtifact).filter(
            OptimizationRunArtifact.run_type.in_(list(run_types))
        )
        if season:
            query = query.filter(OptimizationRunArtifact.season == season)
        rows = query.order_by(OptimizationRunArtifact.created_at.desc()).limit(limit).all()
    except Exception as exc:
        logger.debug("Unable to load optimization run artifacts: %s", exc)
        return []
    return [_serialize_artifact(row) for row in rows]


def _data_unavailable_payload(
    *,
    observed_at: datetime,
    message: str,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=False,
        raw_status="data_unavailable",
        message=message,
    )
    return {"data": data or {"status": "data_unavailable", "message": message}, **contract}


@router.get("/overview")
@router.get("/overview/")
async def operator_overview(
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(require_operator),
    season: str = Query(default="Maha-2025"),
    scheme_id: Optional[str] = Query(default=None),
):
    """Return the backend-backed operator dashboard summary for F4."""
    observed_at = datetime.utcnow()
    fields = _fields_for_scope(db=db, user_context=user_context, scheme_id=scheme_id)
    latest = _latest_for_scope(db=db, season=season, user_context=user_context, scheme_id=scheme_id)
    crops = load_crops_from_db(db)
    recent = _recent_artifacts(
        db,
        run_types=["operator_plan", "operator_scenario", "optimize", "scenario_evaluate"],
        season=season,
        limit=6,
    )
    summary = _summarize_latest(db=db, fields=fields, latest=latest, crops=crops)
    flattened = _flatten_recommendations(latest)

    data = {
        "season": season,
        "scheme_id": scheme_id,
        **summary,
        "recommendations": flattened[:20],
        "latest_plan": recent[0] if recent else None,
        "recent_scenarios": recent,
    }
    data_available = bool(fields or latest or crops)
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=data_available,
        raw_status="ok" if data_available else "data_unavailable",
        message=(
            "Operator optimization overview loaded from F4 backend state."
            if data_available
            else "No optimization data is available for this operator scope."
        ),
    )
    payload = {"data": data, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="operator_overview",
        field_id=None,
        season=season,
        request_payload={"season": season, "scheme_id": scheme_id},
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return payload


@router.post("/plan")
@router.post("/plan/")
async def run_operator_plan(
    request: OperatorPlanRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(require_operator),
):
    """Run area/water optimization for officers without using admin-only routes."""
    observed_at = datetime.utcnow()
    latest = _latest_for_scope(
        db=db,
        season=request.season,
        user_context=user_context,
        scheme_id=request.scheme_id,
    )
    if not latest and request.refresh_missing:
        _generate_missing_for_scope(
            db=db,
            season=request.season,
            user_context=user_context,
            scheme_id=request.scheme_id,
        )
        latest = _latest_for_scope(
            db=db,
            season=request.season,
            user_context=user_context,
            scheme_id=request.scheme_id,
        )

    if not latest:
        payload = _data_unavailable_payload(
            observed_at=observed_at,
            message="No recommendation context is available for the selected operator scope.",
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="operator_plan",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(by_alias=False),
            response_payload=payload,
            status=str(payload.get("status") or "data_unavailable"),
            source=str(payload.get("source") or "optimization_service"),
            data_available=bool(payload.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    water_quota = _resolve_water_quota(latest, request.water_quota_mm)
    if water_quota is None:
        payload = _data_unavailable_payload(
            observed_at=observed_at,
            message="Water quota is required because scoped fields do not provide water availability.",
            data={
                "status": "data_unavailable",
                "message": "Water quota is required because scoped fields do not provide water availability.",
                "allocation": [],
                "field_count": len(latest),
            },
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="operator_plan",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(by_alias=False),
            response_payload=payload,
            status=str(payload.get("status") or "data_unavailable"),
            source=str(payload.get("source") or "optimization_service"),
            data_available=bool(payload.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    constraints = _constraints_payload(
        min_paddy_area_ha=request.min_paddy_area_ha,
        max_risk_level=request.max_risk_level,
        priority=request.priority,
        rainfall_assumption=request.rainfall_assumption,
        allow_plan_b=request.allow_plan_b,
        enforce_crop_continuity=request.enforce_crop_continuity,
    )
    optimized = _run_optimization_from_rows(
        db=db,
        latest=latest,
        water_quota=float(water_quota),
        constraints=constraints,
    )
    quota_use_pct = (
        round((float(optimized.get("water_usage") or 0.0) / float(water_quota)) * 100, 1)
        if water_quota
        else None
    )
    data = {
        **optimized,
        "season": request.season,
        "scheme_id": request.scheme_id,
        "water_quota_mm": float(water_quota),
        "quota_use_pct": quota_use_pct,
        "field_count": len(latest),
        "constraints": constraints,
        "summary": {
            "status": optimized.get("status"),
            "optimization_status": optimized.get("optimization_status"),
            "total_profit": optimized.get("total_profit", 0.0),
            "total_area": optimized.get("total_area", 0.0),
            "water_usage": optimized.get("water_usage", 0.0),
            "water_quota_mm": float(water_quota),
            "quota_use_pct": quota_use_pct,
            "field_count": len(latest),
        },
    }
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=bool(data.get("allocation")),
        raw_status=str(data.get("status") or "data_unavailable"),
        message=str(data.get("message") or "Operator optimization completed."),
    )
    payload = {"data": data, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="operator_plan",
        field_id=None,
        season=request.season,
        request_payload=request.model_dump(by_alias=False),
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return payload


@router.get("/scenarios")
@router.get("/scenarios/")
async def list_operator_scenarios(
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(require_operator),
    season: Optional[str] = Query(default=None),
    limit: int = Query(default=12, ge=1, le=50),
):
    """List recent optimization and scenario artifacts for operator screens."""
    del user_context
    observed_at = datetime.utcnow()
    scenarios = _recent_artifacts(
        db,
        run_types=["operator_plan", "operator_scenario", "optimize", "scenario_evaluate"],
        season=season,
        limit=limit,
    )
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=bool(scenarios),
        raw_status="ok" if scenarios else "data_unavailable",
        message=(
            f"Loaded {len(scenarios)} optimization run artifacts."
            if scenarios
            else "No saved optimization scenarios are available yet."
        ),
    )
    return {"data": {"scenarios": scenarios, "count": len(scenarios)}, **contract}


@router.post("/scenario-evaluate")
@router.post("/scenario-evaluate/")
async def evaluate_operator_scenario(
    request: OperatorScenarioRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(require_operator),
):
    """Evaluate an officer what-if scenario with backend recommendation data."""
    observed_at = datetime.utcnow()
    fields = _fields_for_scope(db=db, user_context=user_context, scheme_id=request.scheme_id)
    if request.field_ids:
        allowed = set(request.field_ids)
        fields = [field for field in fields if str(field.get("id")) in allowed]

    if not fields:
        payload = _data_unavailable_payload(
            observed_at=observed_at,
            message="No fields are available for this scenario scope.",
            data={"status": "data_unavailable", "allocation": [], "fields_evaluated": 0},
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="operator_scenario",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(by_alias=False),
            response_payload=payload,
            status=str(payload.get("status") or "data_unavailable"),
            source=str(payload.get("source") or "optimization_service"),
            data_available=bool(payload.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    scenario_payload: Dict[str, Any] = {}
    if request.water_quota_mm is not None:
        scenario_payload["water_quota_mm"] = float(request.water_quota_mm)
    if request.price_factor is not None:
        scenario_payload["price_factor"] = float(request.price_factor)

    rows: List[Dict[str, Any]] = []
    failures: List[Dict[str, str]] = []
    service = RecommendationService()
    for field in fields:
        field_id = str(field.get("id"))
        try:
            response = service.get_recommendations(
                request=RecommendationRequest(
                    field_id=field_id,
                    season=request.season,
                    scenario=scenario_payload or None,
                ),
                db_session=db,
            )
        except Exception as exc:
            logger.exception(
                "Operator scenario recommendation generation failed for field=%s",
                field_id,
            )
            failures.append(
                {
                    "field_id": field_id,
                    "status": "data_unavailable",
                    "message": f"Recommendation generation failed: {exc}",
                }
            )
            continue
        if response.data_available and response.recommendations:
            rows.append(
                {
                    "field_id": field_id,
                    "field_name": field.get("name") or field_id,
                    "scheme_id": field.get("scheme_id"),
                    "area_ha": field.get("area_ha"),
                    "water_availability_mm": field.get("water_availability_mm"),
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

    water_quota = _resolve_water_quota(rows, request.water_quota_mm)
    if water_quota is None:
        payload = _data_unavailable_payload(
            observed_at=observed_at,
            message="Water quota is required because scenario fields do not provide water availability.",
            data={
                "status": "data_unavailable",
                "allocation": [],
                "failures": failures,
                "fields_evaluated": len(fields),
                "fields_with_data": len(rows),
            },
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="operator_scenario",
            field_id=None,
            season=request.season,
            request_payload=request.model_dump(by_alias=False),
            response_payload=payload,
            status=str(payload.get("status") or "data_unavailable"),
            source=str(payload.get("source") or "optimization_service"),
            data_available=bool(payload.get("data_available")),
            observed_at=observed_at,
        )
        return payload

    constraints = _constraints_payload(
        min_paddy_area_ha=request.min_paddy_area_ha,
        max_risk_level=request.max_risk_level,
        priority="scenario",
    )
    optimized = _run_optimization_from_rows(
        db=db,
        latest=rows,
        water_quota=float(water_quota),
        constraints=constraints,
    )
    data = {
        **optimized,
        "scenario_name": request.scenario_name,
        "season": request.season,
        "scheme_id": request.scheme_id,
        "water_quota_mm": float(water_quota),
        "price_factor": request.price_factor,
        "fields_evaluated": len(fields),
        "fields_with_data": len(rows),
        "failures": failures,
        "constraints": constraints,
    }
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at.isoformat(),
        data_available=bool(data.get("allocation")),
        raw_status=str(data.get("status") or "data_unavailable"),
        message=str(data.get("message") or "Operator scenario evaluation completed."),
    )
    payload = {"data": data, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="operator_scenario",
        field_id=None,
        season=request.season,
        request_payload=request.model_dump(by_alias=False),
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=observed_at,
    )
    return payload

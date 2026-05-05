"""Scheme-level multi-field LP/MIP optimization endpoint.

Operators can run a full scheme-level allocation plan — all fields in a
scheme are optimized simultaneously under a shared water quota with optional
paddy minimum area and budget constraints.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import CropRepository, FieldRepository, RunArtifactRepository
from app.dependencies.auth import get_current_user_context
from app.optimization.constraints import MultiFieldConstraints, OptimizationCropInput
from app.optimization.optimizer import MultiFieldOptimizer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4/scheme", tags=["scheme-optimization"])


class SchemeOptimizeRequest(BaseModel):
    scheme_id: str = Field(..., description="Scheme identifier")
    season: str = Field(..., description="Season tag e.g. Maha-2026")
    total_scheme_water_mm: float = Field(..., gt=0, description="Total scheme water quota (mm)")
    min_paddy_area_ha: float = Field(default=0.0, ge=0, description="Minimum paddy area (ha)")
    budget_lkr: Optional[float] = Field(default=None, description="Total scheme budget (LKR)")
    previous_season: Optional[str] = Field(default=None, description="Previous season tag for rotation penalty")
    enforce_rotation: bool = Field(default=False, description="Apply 15% profit penalty for same-crop re-selection")
    price_factor: float = Field(default=1.0, ge=0.5, le=2.0)


class FieldAllocation(BaseModel):
    field_id: str
    field_name: Optional[str] = None
    area_ha: float
    allocations: Dict[str, float]
    total_profit: float
    total_water_used: float
    optimization_status: str


class SchemeOptimizeResponse(BaseModel):
    scheme_id: str
    season: str
    field_count: int
    total_area_ha: float
    total_profit: float
    total_water_used: float
    quota_use_pct: float
    field_results: List[FieldAllocation]
    # Contract fields
    status: str = "ok"
    source: str = "optimization_service"
    is_live: bool = True
    observed_at: Optional[str] = None
    data_available: bool = True
    message: Optional[str] = None


@router.post("/optimize", response_model=SchemeOptimizeResponse)
async def scheme_optimize(
    payload: SchemeOptimizeRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> SchemeOptimizeResponse:
    """Run LP optimization across all fields in a scheme simultaneously."""
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()

    fields = FieldRepository.list_fields(db, scheme_id=payload.scheme_id)
    if not fields:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No fields found for scheme {payload.scheme_id}",
        )

    all_crops = CropRepository.list_candidate_crops(db)
    if not all_crops:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No crops in catalog — run bootstrap_seed_data.py first.",
        )

    per_field_area: Dict[str, float] = {f["id"]: float(f["area_ha"] or 1.0) for f in fields}
    field_ids = list(per_field_area.keys())

    # Build crop inputs per field (identical crop set, field-specific suitability)
    field_crop_inputs: Dict[str, List[OptimizationCropInput]] = {}
    for field in fields:
        fid = field["id"]
        soil_suit = float(field.get("soil_suitability") or 0.7)
        water_avail = float(field.get("water_availability_mm") or 500.0)
        area = float(field.get("area_ha") or 1.0)

        crop_inputs: List[OptimizationCropInput] = []
        for crop in all_crops:
            water_req = float(crop.get("water_requirement_mm") or 600.0)
            base_yield = float(crop.get("base_yield_t_per_ha") or 4.0)
            price_est = 50.0 * payload.price_factor
            profit_est = (base_yield * 1000 * price_est) - 120000.0
            crop_inputs.append(
                OptimizationCropInput(
                    crop_id=crop["id"],
                    crop_name=crop["name"],
                    max_area_ha=area,
                    min_area_ha=0.0,
                    expected_profit_per_ha=max(0.0, profit_est),
                    water_req_mm_per_ha=water_req,
                    suitability_score=soil_suit,
                )
            )
        field_crop_inputs[fid] = crop_inputs

    multi_constraints = MultiFieldConstraints(
        fields=field_ids,
        per_field_area_ha=per_field_area,
        total_scheme_water_mm=payload.total_scheme_water_mm,
        min_paddy_area_ha=payload.min_paddy_area_ha,
        budget_lkr=payload.budget_lkr,
        crop_rotation_penalty=0.15 if payload.enforce_rotation else 0.0,
    )

    optimizer = MultiFieldOptimizer(
        field_crop_inputs=field_crop_inputs,
        multi_constraints=multi_constraints,
    )
    results = optimizer.optimize()

    field_name_map = {f["id"]: f.get("name") for f in fields}
    field_results: List[FieldAllocation] = []
    total_profit = 0.0
    total_water = 0.0

    for fid, result in results.items():
        field_results.append(
            FieldAllocation(
                field_id=fid,
                field_name=field_name_map.get(fid),
                area_ha=per_field_area.get(fid, 0.0),
                allocations=result.allocations,
                total_profit=result.total_profit,
                total_water_used=result.total_water_used,
                optimization_status=result.status,
            )
        )
        total_profit += result.total_profit
        total_water += result.total_water_used

    quota_use = (total_water / payload.total_scheme_water_mm * 100) if payload.total_scheme_water_mm > 0 else 0.0

    # Persist artifact
    RunArtifactRepository.save_artifact(
        db,
        run_type="scheme_optimize",
        field_id=None,
        season=payload.season,
        request_payload=payload.model_dump(),
        response_payload={"field_count": len(fields), "total_profit": total_profit, "total_water": total_water},
        status="ok",
        source="optimization_service",
        data_available=True,
        observed_at=observed_at_dt,
    )

    contract = build_contract(source="optimization_service", observed_at=observed_at, data_available=True, raw_status="ok")
    return SchemeOptimizeResponse(
        scheme_id=payload.scheme_id,
        season=payload.season,
        field_count=len(fields),
        total_area_ha=sum(per_field_area.values()),
        total_profit=round(total_profit, 2),
        total_water_used=round(total_water, 2),
        quota_use_pct=round(quota_use, 1),
        field_results=field_results,
        **contract,
    )

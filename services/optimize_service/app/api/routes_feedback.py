"""Feedback loop routes for actual farmer outcomes."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import CropOutcomeRepository, CropRepository, FieldRepository
from app.dependencies.auth import get_current_user_context
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/f4/feedback", tags=["feedback"])


class CropOutcomeRequest(BaseModel):
    field_id: str
    crop_id: str
    actual_crop_id: str
    season: str
    year: int
    feedback_date: date
    actual_yield_t_ha: Optional[float] = None
    actual_sale_price_kg: Optional[float] = None
    actual_water_used_mm: Optional[float] = None
    recommendation_id: Optional[int] = None
    notes: Optional[str] = None


@router.post("/outcomes")
async def submit_outcome(
    payload: CropOutcomeRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict = Depends(get_current_user_context),
) -> Dict:
    if not FieldRepository.get_field_by_id(db, payload.field_id):
        raise HTTPException(status_code=404, detail=f"Field {payload.field_id} not found")
    if not CropRepository.get_crop_by_id(db, payload.crop_id):
        raise HTTPException(status_code=404, detail=f"Crop {payload.crop_id} not found")
    if not CropRepository.get_crop_by_id(db, payload.actual_crop_id):
        raise HTTPException(status_code=404, detail=f"Actual crop {payload.actual_crop_id} not found")

    outcome_id = CropOutcomeRepository.save_outcome(
        db,
        field_id=payload.field_id,
        crop_id=payload.crop_id,
        actual_crop_id=payload.actual_crop_id,
        season=payload.season,
        year=payload.year,
        feedback_date=payload.feedback_date,
        actual_yield_t_ha=payload.actual_yield_t_ha,
        actual_sale_price_kg=payload.actual_sale_price_kg,
        actual_water_used_mm=payload.actual_water_used_mm,
        recommendation_id=payload.recommendation_id,
        notes=payload.notes,
        submitted_by=user_context.get("username"),
    )
    confidence_update = FeedbackService.update_model_confidence(db)
    observed_at = datetime.utcnow().isoformat()
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=outcome_id is not None),
        "data": {"id": outcome_id, "confidence_update": confidence_update},
    }


@router.get("/outcomes")
async def list_outcomes(
    field_id: Optional[str] = Query(default=None),
    season: Optional[str] = Query(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(get_current_user_context),
) -> Dict:
    del user_context
    rows = CropOutcomeRepository.list_outcomes(db, field_id=field_id, season=season)
    observed_at = datetime.utcnow().isoformat()
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {"items": rows, "count": len(rows)},
    }


@router.get("/accuracy-report")
async def accuracy_report(
    season: str = Query(...),
    scheme_id: Optional[str] = Query(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(get_current_user_context),
) -> Dict:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    report = FeedbackService.compute_accuracy_report(season, scheme_id, db)
    return {**build_contract(source="optimization_service", observed_at=observed_at, data_available=True), "data": report}


@router.get("/outcomes/summary")
async def outcomes_summary(
    season: str = Query(...),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(get_current_user_context),
) -> Dict:
    del user_context
    items = CropOutcomeRepository.list_outcomes(db, season=season, limit=1000)
    total_fields = len({item["field_id"] for item in items})
    total_hectares = 0.0
    top_crops: Dict[str, float] = {}
    for item in items:
        field = FieldRepository.get_field_by_id(db, item["field_id"]) or {}
        total_hectares += float(field.get("area_ha") or 0.0)
        crop_id = str(item.get("actual_crop_id") or "")
        top_crops[crop_id] = top_crops.get(crop_id, 0.0) + float(item.get("actual_yield_t_ha") or 0.0)
    observed_at = datetime.utcnow().isoformat()
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {
            "season": season,
            "total_fields": total_fields,
            "total_hectares": round(total_hectares, 3),
            "top_crops_by_actual_yield": sorted(top_crops.items(), key=lambda item: item[1], reverse=True)[:5],
        },
    }

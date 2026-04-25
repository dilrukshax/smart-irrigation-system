"""Internal service-to-service endpoints for F4 field synchronization."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.data.db import get_db
from app.data.models_orm import Field as FieldModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4/internal", tags=["internal"])


class FieldSyncRequest(BaseModel):
    field_name: str = Field(..., min_length=1)
    area_ha: float = Field(..., ge=0.1)
    scheme_id: Optional[str] = None
    soil_type: Optional[str] = None
    soil_ph: Optional[float] = None
    soil_ec: Optional[float] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation_m: Optional[float] = None
    soil_suitability: Optional[float] = None
    water_availability_mm: Optional[float] = None


@router.put("/fields/{field_id}")
async def upsert_internal_field(
    field_id: str,
    payload: FieldSyncRequest,
    db: Session = Depends(get_db),
):
    """Upsert an F4 field record from upstream services (F1 sync path)."""
    try:
        row = db.query(FieldModel).filter(FieldModel.id == field_id).first()
        created = row is None

        if row is None:
            row = FieldModel(
                id=field_id,
                name=payload.field_name,
                scheme_id=payload.scheme_id or "IRRIGATION",
                area_ha=payload.area_ha,
            )
            db.add(row)

        row.name = payload.field_name
        row.area_ha = payload.area_ha
        row.scheme_id = payload.scheme_id or row.scheme_id or "IRRIGATION"
        row.soil_type = payload.soil_type
        row.soil_ph = payload.soil_ph
        row.soil_ec = payload.soil_ec
        row.location = payload.location
        row.latitude = payload.latitude
        row.longitude = payload.longitude
        row.elevation_m = payload.elevation_m
        row.soil_suitability = payload.soil_suitability
        row.water_availability_mm = payload.water_availability_mm

        db.commit()
        logger.info(
            "Internal field sync succeeded for field_id=%s created=%s area_ha=%s",
            field_id,
            created,
            payload.area_ha,
        )
        return {
            "status": "ok",
            "field_id": field_id,
            "created": created,
            "area_ha": row.area_ha,
        }
    except Exception as exc:  # pragma: no cover - defensive path
        db.rollback()
        logger.error("Internal field sync failed for field_id=%s: %s", field_id, exc)
        raise HTTPException(status_code=500, detail="Internal field sync failed") from exc


@router.delete("/fields/{field_id}")
async def delete_internal_field(
    field_id: str,
    db: Session = Depends(get_db),
):
    """Delete an F4 field record from upstream services (F1 delete sync path)."""
    try:
        row = db.query(FieldModel).filter(FieldModel.id == field_id).first()
        if row is None:
            return {"status": "ok", "field_id": field_id, "deleted": False}

        db.delete(row)
        db.commit()
        logger.info("Internal field delete sync succeeded for field_id=%s", field_id)
        return {"status": "ok", "field_id": field_id, "deleted": True}
    except Exception as exc:  # pragma: no cover - defensive path
        db.rollback()
        logger.error("Internal field delete sync failed for field_id=%s: %s", field_id, exc)
        raise HTTPException(status_code=500, detail="Internal field delete sync failed") from exc

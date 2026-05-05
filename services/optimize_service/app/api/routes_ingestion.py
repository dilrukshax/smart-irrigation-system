"""Bulk data ingestion endpoints for real agronomic training data.

Allows operators to push real historical yields and price records into the
F4 database so models can be re-trained on non-synthetic data. All records
ingested via these endpoints are marked is_synthetic=False.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.models_orm import CropOutcome, HistoricalYield, PriceRecord
from app.dependencies.auth import get_current_user_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4/ingestion", tags=["data-ingestion"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class HistoricalYieldRecord(BaseModel):
    field_id: str
    crop_id: str
    season: str
    year: int
    yield_t_ha: float = Field(..., gt=0)
    water_used_mm: Optional[float] = None
    notes: Optional[str] = None
    source_tag: Optional[str] = None


class HistoricalYieldIngestionRequest(BaseModel):
    records: List[HistoricalYieldRecord]


class PriceRecordItem(BaseModel):
    crop_id: str
    date: date
    price_per_kg: float = Field(..., gt=0)
    market_name: Optional[str] = None
    price_type: Optional[str] = "farmgate"
    source: Optional[str] = None
    source_tag: Optional[str] = None


class PriceIngestionRequest(BaseModel):
    records: List[PriceRecordItem]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/historical-yields")
async def ingest_historical_yields(
    payload: HistoricalYieldIngestionRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Bulk upsert real historical yield records (is_synthetic=False)."""
    inserted = 0
    skipped = 0
    errors: List[str] = []

    for record in payload.records:
        try:
            row = HistoricalYield(
                field_id=record.field_id,
                crop_id=record.crop_id,
                season=record.season,
                year=record.year,
                yield_t_per_ha=record.yield_t_ha,
                water_used_mm=record.water_used_mm,
                notes=record.notes,
                is_synthetic=False,
                source_tag=record.source_tag,
            )
            db.add(row)
            db.flush()
            inserted += 1
        except Exception as exc:
            db.rollback()
            skipped += 1
            errors.append(f"field={record.field_id} crop={record.crop_id}: {exc}")

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    contract = build_contract(
        source="optimization_service",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
        raw_status="ok",
    )
    return {
        **contract,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:10],
    }


@router.post("/price-records")
async def ingest_price_records(
    payload: PriceIngestionRequest,
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Bulk upsert real market price records (is_synthetic=False)."""
    inserted = 0
    skipped = 0
    errors: List[str] = []

    for record in payload.records:
        try:
            row = PriceRecord(
                crop_id=record.crop_id,
                date=record.date,
                price_per_kg=record.price_per_kg,
                market_name=record.market_name,
                price_type=record.price_type,
                source=record.source,
                is_synthetic=False,
                source_tag=record.source_tag,
            )
            db.add(row)
            db.flush()
            inserted += 1
        except Exception as exc:
            db.rollback()
            skipped += 1
            errors.append(f"crop={record.crop_id} date={record.date}: {exc}")

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    contract = build_contract(
        source="optimization_service",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
        raw_status="ok",
    )
    return {
        **contract,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:10],
    }


@router.get("/data-summary")
async def data_summary(
    db: Annotated[Session, Depends(get_db)],
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> Dict[str, Any]:
    """Return row counts, real vs synthetic split, and date ranges."""
    try:
        yield_total = db.query(func.count(HistoricalYield.id)).scalar() or 0
        yield_real = (
            db.query(func.count(HistoricalYield.id))
            .filter(HistoricalYield.is_synthetic == False)  # noqa: E712
            .scalar() or 0
        )

        price_total = db.query(func.count(PriceRecord.id)).scalar() or 0
        price_real = (
            db.query(func.count(PriceRecord.id))
            .filter(PriceRecord.is_synthetic == False)  # noqa: E712
            .scalar() or 0
        )

        price_min_date = db.query(func.min(PriceRecord.date)).scalar()
        price_max_date = db.query(func.max(PriceRecord.date)).scalar()

    except Exception as exc:
        logger.warning("data_summary query failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    contract = build_contract(
        source="optimization_service",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
        raw_status="ok",
    )
    return {
        **contract,
        "historical_yields": {
            "total": yield_total,
            "real": yield_real,
            "synthetic": yield_total - yield_real,
        },
        "price_records": {
            "total": price_total,
            "real": price_real,
            "synthetic": price_total - price_real,
            "date_range_start": price_min_date.isoformat() if price_min_date else None,
            "date_range_end": price_max_date.isoformat() if price_max_date else None,
        },
    }

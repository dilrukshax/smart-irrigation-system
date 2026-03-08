"""Supply and water-budget routes for optimization outputs."""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.schemas import SupplyResponse
from app.data.db import get_db
from app.services.supply_service import SupplyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4", tags=["supply"])


@router.get("/national-supply", response_model=SupplyResponse)
@router.get("/supply", response_model=SupplyResponse)
@router.get("/national-supply/", response_model=SupplyResponse)
@router.get("/supply/", response_model=SupplyResponse)
async def get_national_supply(
    db: Annotated[Session, Depends(get_db)],
    season: str = Query(
        default="Maha-2025",
        description="Growing season to query (e.g., 'Maha-2025', 'Yala-2025')",
    ),
    scheme_id: Optional[str] = Query(
        default=None,
        description="Optional irrigation scheme ID to filter by",
    ),
) -> SupplyResponse:
    """Get aggregated national/regional supply summary."""
    logger.info("Supply request for season=%s scheme_id=%s", season, scheme_id)
    service = SupplyService()
    return service.get_supply_summary(
        season=season,
        scheme_id=scheme_id,
        db_session=db,
    )


@router.get("/supply/water-budget")
@router.get("/supply/water-budget/")
async def get_water_budget(
    db: Annotated[Session, Depends(get_db)],
    season: str = Query(default="Maha-2025"),
    scheme_id: Optional[str] = Query(default=None),
):
    """Get crop-wise aggregated water usage derived from recommendations."""
    service = SupplyService()
    return {
        "data": service.get_water_budget(
            season=season,
            scheme_id=scheme_id,
            db_session=db,
        )
    }

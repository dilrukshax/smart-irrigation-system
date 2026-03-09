"""Supply and water-budget routes for optimization outputs."""

import logging
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.schemas import SupplyResponse
from app.data.db import get_db
from app.data.repositories import RunArtifactRepository
from app.dependencies.auth import get_current_user_context
from app.services.supply_service import SupplyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/f4", tags=["supply"])


@router.get("/national-supply", response_model=SupplyResponse)
@router.get("/supply", response_model=SupplyResponse)
@router.get("/national-supply/", response_model=SupplyResponse)
@router.get("/supply/", response_model=SupplyResponse)
async def get_national_supply(
    db: Annotated[Session, Depends(get_db)],
    user_context: dict = Depends(get_current_user_context),
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
    del user_context
    logger.info("Supply request for season=%s scheme_id=%s", season, scheme_id)
    service = SupplyService()
    response = service.get_supply_summary(
        season=season,
        scheme_id=scheme_id,
        db_session=db,
    )
    RunArtifactRepository.save_artifact(
        db,
        run_type="supply",
        field_id=None,
        season=season,
        request_payload={"season": season, "scheme_id": scheme_id},
        response_payload=response.model_dump(),
        status=response.status,
        source=response.source,
        data_available=response.data_available,
        observed_at=datetime.utcnow(),
    )
    return response


@router.get("/supply/water-budget")
@router.get("/supply/water-budget/")
async def get_water_budget(
    db: Annotated[Session, Depends(get_db)],
    user_context: dict = Depends(get_current_user_context),
    season: str = Query(default="Maha-2025"),
    scheme_id: Optional[str] = Query(default=None),
):
    """Get crop-wise aggregated water usage derived from recommendations."""
    del user_context
    service = SupplyService()
    budget = service.get_water_budget(
        season=season,
        scheme_id=scheme_id,
        db_session=db,
    )
    contract_fields = {
        "status",
        "source",
        "is_live",
        "observed_at",
        "staleness_sec",
        "quality",
        "data_available",
        "message",
    }
    contract = {k: budget.get(k) for k in contract_fields}
    data = {k: v for k, v in budget.items() if k not in contract_fields}
    payload = {"data": data, **contract}
    RunArtifactRepository.save_artifact(
        db,
        run_type="water_budget",
        field_id=None,
        season=season,
        request_payload={"season": season, "scheme_id": scheme_id},
        response_payload=payload,
        status=str(contract.get("status") or "data_unavailable"),
        source=str(contract.get("source") or "optimization_service"),
        data_available=bool(contract.get("data_available")),
        observed_at=datetime.utcnow(),
    )
    return payload

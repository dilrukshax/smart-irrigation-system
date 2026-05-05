"""Authority and scheme-level dashboard routes."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Dict, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import SchemeOversupplyRepository
from app.dependencies.auth import require_admin
from app.services.authority_service import AuthorityService
from app.services.oversupply_service import OversupplyService

router = APIRouter(prefix="/f4/authority", tags=["authority"])


@router.get("/scheme-dashboard")
async def get_scheme_dashboard(
    scheme_id: str = Query(...),
    season: str = Query(...),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    data = AuthorityService.get_scheme_dashboard(scheme_id, season, db)
    return {**build_contract(source="optimization_service", observed_at=observed_at, data_available=True), "data": data}


@router.get("/national-supply")
async def get_national_supply(
    season: str = Query(...),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    data = AuthorityService.get_national_supply_projection(season, db)
    return {**build_contract(source="optimization_service", observed_at=observed_at, data_available=True), "data": data}


@router.get("/oversupply-alerts")
async def list_oversupply_alerts(
    scheme_id: Optional[str] = Query(default=None),
    season: Optional[str] = Query(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    alerts = SchemeOversupplyRepository.list_active(db, scheme_id=scheme_id, season=season)
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {"items": alerts, "count": len(alerts)},
    }


@router.post("/evaluate-oversupply")
async def evaluate_oversupply(
    scheme_id: str = Query(...),
    season: str = Query(...),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    observed_at = datetime.utcnow().isoformat()
    alerts = OversupplyService.evaluate_scheme(scheme_id, season, db)
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {"items": alerts, "count": len(alerts)},
    }

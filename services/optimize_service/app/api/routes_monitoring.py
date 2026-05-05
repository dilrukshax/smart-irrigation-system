"""Model monitoring and backtest routes."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Dict, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import ModelMonitoringRepository
from app.dependencies.auth import require_admin
from app.services.monitoring_service import MonitoringService

router = APIRouter(prefix="/f4/monitoring", tags=["monitoring"])


@router.post("/backtest")
async def run_backtest(
    model_name: str = Query(...),
    scheme_id: Optional[str] = Query(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    report = MonitoringService.run_backtest(model_name, db, scheme_id=scheme_id)
    observed_at = datetime.utcnow().isoformat()
    return {**build_contract(source="optimization_service", observed_at=observed_at, data_available=True), "data": report}


@router.get("/runs")
async def list_runs(
    model_name: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    runs = ModelMonitoringRepository.list_runs(db, model_name=model_name, limit=limit)
    observed_at = datetime.utcnow().isoformat()
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {"items": runs, "count": len(runs)},
    }


@router.get("/dashboard")
async def monitoring_dashboard(
    season: Optional[str] = Query(default=None),
    db: Annotated[Session, Depends(get_db)] = None,
    user_context: Dict = Depends(require_admin),
) -> Dict:
    del user_context
    runs = ModelMonitoringRepository.list_runs(db, limit=50)
    filtered = [
        run for run in runs
        if not season or (run.get("report_payload") or {}).get("season") in {None, season}
    ]
    observed_at = datetime.utcnow().isoformat()
    return {
        **build_contract(source="optimization_service", observed_at=observed_at, data_available=True),
        "data": {
            "season": season,
            "recent_runs": filtered[:10],
            "drift_run_count": sum(1 for run in filtered if run.get("drift_detected")),
            "models": sorted({run.get("model_name") for run in filtered if run.get("model_name")}),
        },
    }

"""
Persistence repository for forecasting runtime state.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ForecastIrrigationRecommendationArtifact,
    ForecastObservation,
    ForecastTrainingRun,
    ForecastWeatherArtifact,
)


def _parse_observed(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(float(value))
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _to_unix(value: Optional[datetime]) -> Optional[float]:
    if value is None:
        return None
    return float(value.timestamp())


def _observation_to_dict(row: ForecastObservation) -> Dict[str, Any]:
    return {
        "observation_id": row.observation_id,
        "timestamp": _to_unix(row.observed_at),
        "water_level_percent": row.water_level_percent,
        "rainfall_mm": row.rainfall_mm,
        "gate_opening_percent": row.gate_opening_percent,
        "source": row.source,
        "created_at": _to_unix(row.created_at),
    }


async def add_observation(
    session: AsyncSession,
    *,
    observed_at: Any,
    water_level_percent: Optional[float],
    rainfall_mm: Optional[float],
    gate_opening_percent: Optional[float],
    source: str,
) -> Dict[str, Any]:
    row = ForecastObservation(
        observed_at=_parse_observed(observed_at) or datetime.utcnow(),
        water_level_percent=water_level_percent,
        rainfall_mm=rainfall_mm,
        gate_opening_percent=gate_opening_percent,
        source=source,
    )
    session.add(row)
    await session.flush()
    return _observation_to_dict(row)


async def list_recent_observations(
    session: AsyncSession,
    *,
    limit: int = 10000,
) -> List[Dict[str, Any]]:
    result = await session.execute(
        select(ForecastObservation)
        .order_by(ForecastObservation.observed_at.asc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [_observation_to_dict(row) for row in rows]


async def add_weather_artifact(
    session: AsyncSession,
    *,
    kind: str,
    payload: Dict[str, Any],
    status: str,
    source: str,
    observed_at: Any,
) -> Dict[str, Any]:
    row = ForecastWeatherArtifact(
        kind=kind,
        payload=payload,
        status=status,
        source=source,
        observed_at=_parse_observed(observed_at),
    )
    session.add(row)
    await session.flush()
    return {
        "artifact_id": row.artifact_id,
        "kind": row.kind,
        "status": row.status,
        "source": row.source,
        "generated_at": _to_unix(row.generated_at),
    }


async def add_irrigation_recommendation_artifact(
    session: AsyncSession,
    *,
    payload: Dict[str, Any],
    status: str,
    source: str,
    observed_at: Any,
) -> Dict[str, Any]:
    row = ForecastIrrigationRecommendationArtifact(
        payload=payload,
        status=status,
        source=source,
        observed_at=_parse_observed(observed_at),
    )
    session.add(row)
    await session.flush()
    return {
        "recommendation_id": row.recommendation_id,
        "status": row.status,
        "source": row.source,
        "generated_at": _to_unix(row.generated_at),
    }


async def add_training_run(
    session: AsyncSession,
    *,
    status: str,
    message: Optional[str],
    data_points: Optional[int],
    models_trained: Optional[List[str]],
    best_model: Optional[str],
    metrics: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    row = ForecastTrainingRun(
        status=status,
        message=message,
        data_points=data_points,
        models_trained=models_trained,
        best_model=best_model,
        metrics=metrics,
    )
    session.add(row)
    await session.flush()
    return {
        "run_id": row.run_id,
        "status": row.status,
        "data_points": row.data_points,
        "best_model": row.best_model,
        "created_at": _to_unix(row.created_at),
    }

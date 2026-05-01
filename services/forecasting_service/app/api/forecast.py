"""
Forecast Routes

Provides endpoints for water level forecasting and current data.
"""

import time
import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.contracts import build_contract
from app.db.repository import add_observation
from app.db.session import session_scope
from app.dependencies.auth import require_admin
from app.ml import ADVANCED_ML_AVAILABLE
from app.ml.forecasting_system import forecasting_system

try:
    from app.ml.advanced_forecasting import advanced_forecasting
except Exception:  # pragma: no cover - optional subsystem
    advanced_forecasting = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Forecast"])


# ============ Schemas ============

class CurrentDataResponse(BaseModel):
    """Current sensor data response."""
    status: str
    current_data: Optional[dict] = None
    data_points_total: int
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[float] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class ForecastPrediction(BaseModel):
    """Single forecast prediction."""
    hour: int
    predicted_water_level: float
    timestamp: float


class ForecastResponse(BaseModel):
    """Forecast response."""
    status: str
    current_level: Optional[float] = None
    predictions: Optional[list] = None
    forecast_generated_at: Optional[float] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    input_contract_version: Optional[str] = None
    features_used_count: Optional[int] = None
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[float] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response."""
    current_water_level: Optional[float] = None
    flood_risk: str
    drought_risk: str
    recent_rainfall_24h: Optional[float] = None
    level_trend: Optional[float] = None
    alerts: list
    assessment_time: Optional[float] = None
    status: Optional[str] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    input_contract_version: Optional[str] = None
    features_used_count: Optional[int] = None
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[float] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True
    message: Optional[str] = None


class SensorDataSubmit(BaseModel):
    """Sensor data submission."""
    water_level_percent: Optional[float] = Field(None, ge=0, le=100)
    rainfall_mm: Optional[float] = Field(None, ge=0)
    gate_opening_percent: Optional[float] = Field(None, ge=0, le=100)
    timestamp: Optional[float] = None


def _build_data_contract(
    observed_at: Optional[float],
    data_available: bool,
    *,
    raw_status: str,
    message: Optional[str] = None,
) -> dict:
    return build_contract(
        source="observed" if data_available else "unavailable",
        observed_at=observed_at,
        data_available=data_available,
        raw_status=raw_status,
        message=message,
        stale_after_sec=3600,
    )


# ============ Routes ============

@router.get("/status")
async def get_status():
    """Service status endpoint."""
    missing_models: list[str] = []
    contract = build_contract(
        source="forecasting_service",
        observed_at=time.time(),
        data_available=True,
        raw_status="ok",
    )
    return {
        "service": "Time-Series Forecasting Service",
        "status": "ok",
        "data_points": forecasting_system.data_summary,
        "model_ready": forecasting_system.is_ready,
        "strict_live_data": settings.is_strict_live_data,
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": ["baseline_linear_regression"],
        "loaded_models": ["baseline_linear_regression"],
        "missing_models": missing_models,
        "timestamp": time.time(),
        **contract,
    }


@router.get("/model-summary")
async def get_model_summary():
    """Public model-readiness summary safe for farmer-facing panels.

    This intentionally exposes model metadata and readiness only. Training and
    admin prediction endpoints stay on the protected v1/v2 routes.
    """
    observed_at = time.time()
    contract = build_contract(
        source="forecasting_service",
        observed_at=observed_at,
        data_available=True,
        raw_status="ok",
    )
    data_summary = forecasting_system.data_summary

    advanced_available = bool(ADVANCED_ML_AVAILABLE and advanced_forecasting is not None)
    advanced_payload: Dict[str, Any] = {
        "available": advanced_available,
        "trained": False,
        "models": [],
        "best_model": None,
        "metrics": {},
        "features_engineered": 0,
        "data_points": 0,
        "uncertainty_supported": False,
        "message": None if advanced_available else "Advanced ML dependencies unavailable",
    }

    if advanced_available:
        metrics = getattr(advanced_forecasting, "metrics", None) or {}
        best_model = None
        if metrics:
            try:
                best_model = min(metrics.items(), key=lambda item: item[1].get("rmse", float("inf")))[0]
            except Exception:
                best_model = next(iter(metrics.keys()), None)

        df = getattr(advanced_forecasting, "df", None)
        advanced_payload.update(
            {
                "trained": bool(getattr(advanced_forecasting, "is_trained", False)),
                "models": list(metrics.keys()),
                "best_model": best_model,
                "metrics": metrics,
                "features_engineered": len(getattr(advanced_forecasting, "feature_cols", []) or []),
                "data_points": len(df) if df is not None else 0,
                "uncertainty_supported": bool(getattr(advanced_forecasting, "quantile_models", {}) or {}),
                "message": None
                if getattr(advanced_forecasting, "is_trained", False)
                else "Advanced models are available but not trained yet",
            }
        )

    return {
        "status": contract["status"],
        "source": contract["source"],
        "is_live": contract["is_live"],
        "observed_at": contract["observed_at"],
        "staleness_sec": contract["staleness_sec"],
        "quality": contract["quality"],
        "data_available": contract["data_available"],
        "message": contract["message"],
        "basic_model": {
            "name": forecasting_system.MODEL_NAME,
            "version": forecasting_system.MODEL_VERSION,
            "input_contract_version": forecasting_system.INPUT_CONTRACT_VERSION,
            "ready": forecasting_system.is_ready,
            "features_used_count": 24,
            "data_window": data_summary.get("model_data_window"),
            "data_points": data_summary,
            "last_ingest_at": data_summary.get("last_ingest_at"),
        },
        "advanced_models": advanced_payload,
        "scope": {
            "weather": "field_coordinates",
            "water_level_model": "service_observations",
            "field_specific_ml": False,
            "message": "Weather uses the field coordinates. Water-level ML uses forecasting-service observations until field_id is stored in F3 observations.",
        },
    }


@router.get("/current-data", response_model=CurrentDataResponse)
async def get_current_data():
    """
    Get current sensor readings and update data.
    
    Returns simulated current conditions and adds to historical data.
    """
    if not forecasting_system.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Forecasting system not initialized.",
        )
    
    current_data = forecasting_system.get_latest_observation()
    if not current_data:
        return CurrentDataResponse(
            status="data_unavailable",
            current_data=None,
            data_points_total=len(forecasting_system.water_level_data),
            **_build_data_contract(
                None,
                False,
                raw_status="data_unavailable",
                message="No observed data available",
            ),
        )

    logger.info(
        "Current conditions - Water: %s%%, Rainfall: %smm, Gates: %s%%",
        current_data.get("water_level_percent"),
        current_data.get("rainfall_mm"),
        current_data.get("gate_opening_percent"),
    )

    return CurrentDataResponse(
        status="ok",
        current_data=current_data,
        data_points_total=len(forecasting_system.water_level_data),
        **_build_data_contract(
            current_data.get("timestamp"),
            True,
            raw_status="ok",
        ),
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    hours: int = Query(24, ge=1, le=72, description="Hours ahead to forecast"),
    admin_context: dict = Depends(require_admin),
):
    """
    Get water level forecast.
    
    Args:
        hours: Number of hours to forecast (1-72)
    
    Returns:
        Forecast with predicted water levels.
    """
    del admin_context

    if not forecasting_system.is_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "source_unavailable",
                "message": "Forecasting system not initialized.",
                "source": "forecasting_service",
                "data_available": False,
            },
        )
    
    forecast = forecasting_system.forecast_water_level(hours)
    
    latest = forecasting_system.get_latest_observation()
    raw_status = forecast.get("status", "data_unavailable")
    if raw_status == "success":
        raw_status = "ok"
    elif raw_status == "insufficient_data":
        raw_status = "data_unavailable"
    message = forecast.get("message")

    contract = _build_data_contract(
        latest.get("timestamp") if latest else None,
        bool(latest),
        raw_status=raw_status,
        message=message,
    )

    if forecast["status"] in {"success", "ok"}:
        logger.info(f"Generated {hours}-hour forecast")

    return ForecastResponse(**forecast, status=contract["status"], **contract)


@router.get("/risk-assessment", response_model=RiskAssessmentResponse)
async def get_risk_assessment(admin_context: dict = Depends(require_admin)):
    """
    Get flood and drought risk assessment.
    
    Analyzes current trends and returns risk levels with alerts.
    """
    del admin_context

    if not forecasting_system.is_ready:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "source_unavailable",
                "message": "Forecasting system not initialized.",
                "source": "forecasting_service",
                "data_available": False,
            },
        )
    
    risk_analysis = forecasting_system.analyze_flood_risk()
    
    if "alerts" in risk_analysis and risk_analysis.get("alerts"):
        for alert in risk_analysis["alerts"]:
            logger.warning(f"ALERT: {alert}")

    latest = forecasting_system.get_latest_observation()
    raw_status = risk_analysis.get("status", "data_unavailable")
    if raw_status == "success":
        raw_status = "ok"
    elif raw_status == "insufficient_data":
        raw_status = "data_unavailable"
    message = risk_analysis.get("message")

    contract = _build_data_contract(
        latest.get("timestamp") if latest else None,
        bool(latest),
        raw_status=raw_status,
        message=message,
    )

    return RiskAssessmentResponse(**risk_analysis, status=contract["status"], **contract)


@router.post("/submit-data")
async def submit_sensor_data(
    data: SensorDataSubmit,
    admin_context: dict = Depends(require_admin),
):
    """
    Accept external sensor data.
    
    Allows external systems to submit sensor readings.
    """
    try:
        point = forecasting_system.add_observation(
            water_level_percent=data.water_level_percent,
            rainfall_mm=data.rainfall_mm,
            gate_opening_percent=data.gate_opening_percent,
            timestamp=data.timestamp,
        )
        source = f"admin:{admin_context.get('username') or admin_context.get('id') or 'unknown'}"
        async with session_scope() as session:
            await add_observation(
                session,
                observed_at=point.get("timestamp"),
                water_level_percent=point.get("water_level_percent"),
                rainfall_mm=point.get("rainfall_mm"),
                gate_opening_percent=point.get("gate_opening_percent"),
                source=source,
            )
        contract = _build_data_contract(
            point.get("timestamp"),
            True,
            raw_status="ok",
            message="Data recorded successfully",
        )
        return {
            **contract,
        }
    
    except Exception as e:
        logger.error(f"Error submitting data: {e}")
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=time.time(),
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to persist submitted data: {str(e)}",
            ),
        )

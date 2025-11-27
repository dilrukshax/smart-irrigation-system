"""
Forecast Routes

Provides endpoints for water level forecasting and current data.
"""

import time
import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from app.ml.forecasting_system import forecasting_system

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Forecast"])


# ============ Schemas ============

class CurrentDataResponse(BaseModel):
    """Current sensor data response."""
    status: str
    current_data: dict
    data_points_total: int


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


class SensorDataSubmit(BaseModel):
    """Sensor data submission."""
    water_level_percent: Optional[float] = Field(None, ge=0, le=100)
    rainfall_mm: Optional[float] = Field(None, ge=0)
    gate_opening_percent: Optional[float] = Field(None, ge=0, le=100)
    timestamp: Optional[float] = None


# ============ Routes ============

@router.get("/status")
async def get_status():
    """Service status endpoint."""
    return {
        "service": "Time-Series Forecasting Service",
        "status": "running",
        "data_points": forecasting_system.data_summary,
        "model_ready": forecasting_system.is_ready,
        "timestamp": time.time(),
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
    
    current_data = forecasting_system.simulate_current_data()
    
    logger.info(
        f"Current conditions - Water: {current_data['water_level_percent']}%, "
        f"Rainfall: {current_data['rainfall_mm']}mm, "
        f"Gates: {current_data['gate_opening_percent']}%"
    )
    
    return CurrentDataResponse(
        status="success",
        current_data=current_data,
        data_points_total=len(forecasting_system.water_level_data),
    )


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    hours: int = Query(24, ge=1, le=72, description="Hours ahead to forecast"),
):
    """
    Get water level forecast.
    
    Args:
        hours: Number of hours to forecast (1-72)
    
    Returns:
        Forecast with predicted water levels.
    """
    if not forecasting_system.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Forecasting system not initialized.",
        )
    
    forecast = forecasting_system.forecast_water_level(hours)
    
    if forecast["status"] == "success":
        logger.info(f"Generated {hours}-hour forecast")
    
    return ForecastResponse(**forecast)


@router.get("/risk-assessment", response_model=RiskAssessmentResponse)
async def get_risk_assessment():
    """
    Get flood and drought risk assessment.
    
    Analyzes current trends and returns risk levels with alerts.
    """
    if not forecasting_system.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Forecasting system not initialized.",
        )
    
    risk_analysis = forecasting_system.analyze_flood_risk()
    
    if "alerts" in risk_analysis and risk_analysis["alerts"]:
        for alert in risk_analysis["alerts"]:
            logger.warning(f"ALERT: {alert}")
    
    return RiskAssessmentResponse(**risk_analysis)


@router.post("/submit-data")
async def submit_sensor_data(data: SensorDataSubmit):
    """
    Accept external sensor data.
    
    Allows external systems to submit sensor readings.
    """
    try:
        ts = data.timestamp or time.time()
        
        if data.water_level_percent is not None:
            forecasting_system.water_level_data.append({
                "timestamp": ts,
                "water_level_percent": data.water_level_percent,
            })
        
        if data.rainfall_mm is not None:
            forecasting_system.rainfall_data.append({
                "timestamp": ts,
                "rainfall_mm": data.rainfall_mm,
            })
        
        if data.gate_opening_percent is not None:
            forecasting_system.dam_gate_data.append({
                "timestamp": ts,
                "gate_opening_percent": data.gate_opening_percent,
            })
        
        return {
            "status": "success",
            "message": "Data recorded successfully",
        }
    
    except Exception as e:
        logger.error(f"Error submitting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

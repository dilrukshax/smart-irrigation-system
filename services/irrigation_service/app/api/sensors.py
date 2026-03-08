"""
Sensor Data Routes

Provides endpoints for sensor data simulation and irrigation predictions.
"""

import random
import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.ml.irrigation_model import irrigation_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Sensors"])


# ============ Schemas ============

class SensorData(BaseModel):
    """Sensor reading data."""
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture %")
    temperature: float = Field(..., ge=-10, le=60, description="Temperature °C")
    humidity: float = Field(..., ge=0, le=100, description="Humidity %")
    timestamp: float = Field(default_factory=time.time)


class IrrigationPrediction(BaseModel):
    """Irrigation prediction result."""
    irrigation_needed: bool
    confidence: float
    recommendation: str
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    input_contract_version: Optional[str] = None
    features_used_count: Optional[int] = None
    data_available: bool = True


class SensorResponse(BaseModel):
    """Response with sensor data and prediction."""
    sensor_data: SensorData
    prediction: IrrigationPrediction
    actuator_signal: str
    source: str = "simulated"
    is_live: bool = False
    observed_at: Optional[float] = None
    staleness_sec: Optional[float] = None
    quality: str = "unknown"
    data_available: bool = True


class ManualControlRequest(BaseModel):
    """Manual irrigation control request."""
    action: str = Field(..., pattern="^(WATER_ON|WATER_OFF)$")


class ManualControlResponse(BaseModel):
    """Manual control response."""
    status: str
    action_taken: str
    timestamp: float


# ============ Utility Functions ============

def simulate_sensor_data() -> SensorData:
    """Simulate IoT sensor readings."""
    return SensorData(
        soil_moisture=round(random.uniform(10, 90), 2),
        temperature=round(random.uniform(20, 40), 2),
        humidity=round(random.uniform(30, 90), 2),
        timestamp=time.time(),
    )


# ============ Routes ============

@router.get("/status")
async def get_status():
    """Service status endpoint."""
    return {
        "service": "Smart Irrigation Service",
        "status": "running",
        "model_ready": irrigation_model.is_ready,
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": ["irrigation_rf"],
        "loaded_models": ["irrigation_rf"] if irrigation_model.is_ready else [],
        "missing_models": [] if irrigation_model.is_ready else ["irrigation_rf"],
        "timestamp": time.time(),
    }


@router.get("/sensor-data", response_model=SensorResponse)
async def get_sensor_data():
    """
    Get current sensor readings with irrigation prediction.
    
    Returns simulated sensor data and ML-based irrigation recommendation.
    """
    if not irrigation_model.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ML model not initialized. Service is starting up.",
        )

    if settings.is_ml_only_mode:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "source_unavailable",
                "message": "ML-only mode requires live sensor stream; simulated sensor endpoint is disabled.",
                "source": "sensor_stream",
                "data_available": False,
                "missing_features": ["soil_moisture", "temperature", "humidity", "hour_of_day"],
            },
        )
    
    sensor_data = simulate_sensor_data()
    
    prediction = irrigation_model.predict_irrigation_need(
        soil_moisture=sensor_data.soil_moisture,
        temperature=sensor_data.temperature,
        humidity=sensor_data.humidity,
        hour_of_day=time.localtime().tm_hour,
    )
    
    logger.info(
        f"Sensor reading: {sensor_data.soil_moisture}% moisture, "
        f"{sensor_data.temperature}°C - Action: {prediction['recommendation']}"
    )
    
    return SensorResponse(
        sensor_data=sensor_data,
        prediction=IrrigationPrediction(**prediction),
        actuator_signal=prediction["recommendation"],
        source="simulated",
        is_live=False,
        observed_at=sensor_data.timestamp,
        staleness_sec=0.0,
        quality="unknown",
        data_available=True,
    )


@router.get("/sensors")
async def list_sensors():
    """Canonical route for gateway compatibility."""
    if settings.is_ml_only_mode:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "source_unavailable",
                "message": "ML-only mode requires live sensor registry.",
                "source": "sensor_registry",
                "data_available": False,
            },
        )
    return {
        "status": "ok",
        "source": "simulated",
        "is_live": False,
        "data_available": True,
        "count": 1,
        "sensors": [
            {
                "sensor_id": "simulated-sensor-01",
                "type": "virtual",
                "status": "active",
            }
        ],
    }


@router.get("/sensors/{sensor_id}")
async def get_sensor(sensor_id: str):
    """Canonical route for gateway compatibility."""
    if settings.is_ml_only_mode:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "source_unavailable",
                "message": "ML-only mode requires live sensor registry.",
                "source": "sensor_registry",
                "data_available": False,
            },
        )
    return {
        "status": "ok",
        "source": "simulated",
        "is_live": False,
        "data_available": True,
        "sensor_id": sensor_id,
        "type": "virtual",
        "message": "Simulated sensor endpoint",
    }


@router.get("/sensors/{sensor_id}/data", response_model=SensorResponse)
async def get_sensor_data_by_id(sensor_id: str):
    """Canonical route for gateway compatibility."""
    _ = sensor_id
    return await get_sensor_data()


@router.post("/irrigation-control", response_model=ManualControlResponse)
async def irrigation_control(request: ManualControlRequest):
    """
    Manual irrigation control endpoint.
    
    Allows manual override of irrigation system.
    """
    logger.info(f"Manual irrigation control: {request.action}")
    
    return ManualControlResponse(
        status="success",
        action_taken=request.action,
        timestamp=time.time(),
    )


@router.post("/predict")
async def predict_irrigation(sensor_data: SensorData):
    """
    Get irrigation prediction for provided sensor data.
    
    Args:
        sensor_data: SensorData with moisture, temperature, humidity
    
    Returns:
        Irrigation prediction with confidence score.
    """
    if not irrigation_model.is_ready:
        raise HTTPException(
            status_code=503,
            detail="ML model not initialized.",
        )
    
    prediction = irrigation_model.predict_irrigation_need(
        soil_moisture=sensor_data.soil_moisture,
        temperature=sensor_data.temperature,
        humidity=sensor_data.humidity,
        hour_of_day=time.localtime().tm_hour,
    )
    
    return {
        "input": sensor_data.model_dump(),
        "prediction": prediction,
        "status": "ok",
        "data_available": True,
    }

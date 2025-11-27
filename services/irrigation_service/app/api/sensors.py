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


class SensorResponse(BaseModel):
    """Response with sensor data and prediction."""
    sensor_data: SensorData
    prediction: IrrigationPrediction
    actuator_signal: str


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
    )


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
    }

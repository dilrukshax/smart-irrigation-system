"""
Health Check API Router.

Provides health and readiness endpoints for the IoT service.
"""

from fastapi import APIRouter

from app.core.config import settings
from app.iot.schemas import HealthResponse
from app.iot.influx_repo import influx_repo
from app.iot.mqtt_client import get_mqtt_client

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns service status including InfluxDB and MQTT connection states.
    """
    mqtt = get_mqtt_client()
    
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
        influxdb_connected=influx_repo.is_connected,
        mqtt_connected=mqtt.is_connected if mqtt else False,
    )


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint.
    
    Returns 200 if service is ready to accept requests.
    """
    mqtt = get_mqtt_client()
    influx_ok = influx_repo.is_connected
    mqtt_ok = mqtt.is_connected if mqtt else False
    
    return {
        "ready": influx_ok,  # Ready if InfluxDB is connected (MQTT is optional)
        "influxdb": influx_ok,
        "mqtt": mqtt_ok,
    }

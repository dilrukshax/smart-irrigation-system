"""
Health Check API Router.

Provides health and readiness endpoints for the IoT service.
"""

from fastapi import APIRouter

from app.core.config import settings
from app.iot.schemas import HealthResponse
from app.iot.pg_repo import pg_repo
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
        db_connected=pg_repo.is_connected,
        mqtt_connected=mqtt.is_connected if mqtt else False,
    )


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint.

    Returns 200 if service is ready to accept requests.
    """
    mqtt = get_mqtt_client()
    db_ok = pg_repo.is_connected
    mqtt_ok = mqtt.is_connected if mqtt else False

    return {
        "ready": db_ok,
        "db": db_ok,
        "mqtt": mqtt_ok,
    }

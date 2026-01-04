"""
IoT Telemetry Service - FastAPI Application

Microservice for ESP32 sensor telemetry ingestion providing:
- MQTT subscription for real-time device telemetry
- InfluxDB time-series storage
- REST APIs for device data and commands

This service continuously listens for MQTT messages from ESP32 devices,
validates and processes the telemetry data, stores it in InfluxDB,
and exposes REST endpoints for the frontend to query device data.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.health import router as health_router
from app.api.iot import router as iot_router
from app.iot.influx_repo import influx_repo
from app.iot.mqtt_client import create_mqtt_client, get_mqtt_client
from app.iot.service import iot_service
from app.iot.schemas import TelemetryPayload

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def handle_telemetry(payload: TelemetryPayload) -> None:
    """
    Callback for MQTT telemetry messages.
    
    Processes incoming telemetry and stores in InfluxDB.
    """
    iot_service.process_telemetry(payload)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    On startup:
    - Connect to InfluxDB
    - Start MQTT subscriber in background
    
    On shutdown:
    - Stop MQTT client
    - Disconnect from InfluxDB
    """
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    
    # Connect to InfluxDB
    influx_connected = influx_repo.connect()
    if influx_connected:
        logger.info("InfluxDB connection established")
    else:
        logger.warning("InfluxDB connection failed - telemetry storage disabled")
    
    # Create and start MQTT client
    mqtt_client = create_mqtt_client(on_telemetry=handle_telemetry)
    mqtt_connected = mqtt_client.connect()
    
    if mqtt_connected:
        # Start MQTT loop in background thread
        mqtt_client.start()
        logger.info("MQTT subscriber started")
    else:
        logger.warning("MQTT connection failed - will retry on reconnect")
    
    logger.info(f"IoT Telemetry Service ready on port {settings.port}")
    
    yield
    
    # Shutdown
    logger.info(f"Shutting down {settings.app_name}...")
    
    # Stop MQTT client
    mqtt = get_mqtt_client()
    if mqtt:
        mqtt.stop()
        logger.info("MQTT client stopped")
    
    # Disconnect from InfluxDB
    influx_repo.disconnect()
    logger.info("InfluxDB connection closed")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=(
        "IoT Telemetry microservice for ESP32 sensor data ingestion. "
        "Provides MQTT subscription for real-time data and REST APIs "
        "for device queries and commands."
    ),
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(iot_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - service information."""
    mqtt = get_mqtt_client()
    
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "description": "IoT Telemetry Service for ESP32 sensors",
        "environment": settings.environment,
        "docs": "/docs",
        "status": {
            "influxdb": influx_repo.is_connected,
            "mqtt": mqtt.is_connected if mqtt else False,
        },
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

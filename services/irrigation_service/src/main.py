"""
Irrigation Service - FastAPI Application

Smart irrigation microservice providing:
- Real-time sensor data simulation
- ML-based irrigation predictions
- Manual irrigation control

This service uses a RandomForestClassifier to predict irrigation needs
based on soil moisture, temperature, humidity, and time of day.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.logging_config import setup_logging
from src.api.health import router as health_router
from src.api.sensors import router as sensors_router
from src.ml.irrigation_model import irrigation_model

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    On startup: Initialize and train ML model
    On shutdown: Cleanup resources
    """
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    
    # Initialize and train ML model
    irrigation_model.train_model()
    logger.info("Irrigation ML model initialized and ready")
    
    yield
    
    # Shutdown
    logger.info(f"Shutting down {settings.app_name}...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=(
        "Smart Irrigation microservice providing ML-based irrigation predictions "
        "and IoT sensor data management."
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
app.include_router(sensors_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "description": "Smart Irrigation Service with ML predictions",
        "environment": settings.environment,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

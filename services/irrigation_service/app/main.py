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
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.health import router as health_router
from app.api.sensors import router as sensors_router
from app.api.water_management import router as water_management_router
from app.api.crop_fields import router as crop_fields_router
from app.ml.irrigation_model import irrigation_model
from app.ml.water_management_model import water_management_model

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

    required_models = {
        "irrigation_rf": irrigation_model.model_path,
        "water_management_hgbr": str(
            Path(__file__).resolve().parents[1] / "notebooks" / "smart_water_mgmt_release_predictor.joblib"
        ),
    }
    loaded_models = []
    missing_models = []

    # Load primary irrigation model artifact.
    if irrigation_model.load_model():
        loaded_models.append("irrigation_rf")
        logger.info("Irrigation ML model loaded and ready")
    else:
        missing_models.append("irrigation_rf")
        if settings.is_ml_only_mode:
            raise RuntimeError(
                "ML-only mode is enabled and irrigation model artifact is missing."
            )
        irrigation_model.train_model()
        logger.warning("Irrigation artifact missing; trained synthetic fallback (ML-only disabled).")

    # Load smart water-management model artifact.
    water_management_model.load_model()
    if water_management_model.model is not None:
        loaded_models.append("water_management_hgbr")
        logger.info("Water Management ML model loaded and ready")
    else:
        missing_models.append("water_management_hgbr")
        if settings.is_ml_only_mode:
            raise RuntimeError(
                "ML-only mode is enabled and water-management model artifact is missing."
            )
        logger.warning("Water-management artifact missing; fallback remains enabled (ML-only disabled).")

    app.state.model_readiness = {
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": required_models,
        "loaded_models": loaded_models,
        "missing_models": missing_models,
        "dependencies": {
            "joblib": True,
            "sklearn": True,
        },
    }
    
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
app.include_router(water_management_router)
app.include_router(crop_fields_router)


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
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

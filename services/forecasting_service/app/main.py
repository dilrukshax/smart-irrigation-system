"""
Forecasting Service - FastAPI Application

Time-series forecasting microservice providing:
- Water level forecasting
- Flood and drought risk assessment
- Historical data management

Uses linear regression with historical patterns for predictions.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.api.health import router as health_router
from app.api.forecast import router as forecast_router
from app.ml import forecasting_system, ADVANCED_ML_AVAILABLE
from app.db.repository import list_recent_observations
from app.db.session import close_db, init_db, session_scope

# Only import advanced features if TensorFlow is available
if ADVANCED_ML_AVAILABLE:
    from app.api.advanced_forecast import router as advanced_forecast_router

# Import new routers
from app.api.weather import router as weather_router
from app.api.analytics import router as analytics_router

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    On startup: Initialize forecasting system with historical data
    On shutdown: Cleanup resources
    """
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    
    await init_db()
    async with session_scope() as session:
        observations = await list_recent_observations(session, limit=10000)
    forecasting_system.initialize_historical_data(observations)
    logger.info("Forecasting DB initialized and runtime state hydrated")

    dependencies = {
        "tensorflow": bool(ADVANCED_ML_AVAILABLE),
        "numpy": True,
        "sklearn": True,
    }
    required_models = {
        "baseline_linear_regression": "builtin",
    }
    loaded_models = ["baseline_linear_regression"]
    missing_models = []

    app.state.model_readiness = {
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": required_models,
        "loaded_models": loaded_models,
        "missing_models": missing_models,
        "dependencies": dependencies,
    }
    
    yield
    
    # Shutdown
    await close_db()
    logger.info(f"Shutting down {settings.app_name}...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=(
        "Time-series forecasting microservice providing water level predictions "
        "and flood/drought risk assessments."
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
app.include_router(forecast_router)

# Always include advanced router (it handles availability internally)
from app.api.advanced_forecast import router as advanced_forecast_router
app.include_router(advanced_forecast_router)

# Include new routers
app.include_router(weather_router)
app.include_router(analytics_router)

# Log ML feature status
if ADVANCED_ML_AVAILABLE:
    logger.info("Advanced ML features enabled")
else:
    logger.warning("Advanced ML features disabled (TensorFlow not available)")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "description": "Time-Series Forecasting Service",
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

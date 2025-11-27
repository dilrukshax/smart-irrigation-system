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

from src.core.config import settings
from src.core.logging_config import setup_logging
from src.api.health import router as health_router
from src.api.forecast import router as forecast_router
from src.ml.forecasting_system import forecasting_system

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
    
    # Initialize forecasting system with historical data
    forecasting_system.initialize_historical_data()
    logger.info("Forecasting system initialized with historical data")
    
    yield
    
    # Shutdown
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
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

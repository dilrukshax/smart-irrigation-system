"""
ACA-O Service - Main Application Entry Point

This module creates and configures the FastAPI application for the
Adaptive Crop & Area Optimization microservice.

The service provides:
- Crop recommendations based on field conditions and constraints
- Mid-season replanning (Plan B) when quotas or prices change
- National supply aggregation for agricultural managers
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.api.routes_health import router as health_router
from app.api.routes_recommendations import router as recommendations_router
from app.api.routes_planb import router as planb_router
from app.api.routes_supply import router as supply_router

# Import core modules
from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.exceptions import register_exception_handlers

# Get settings
settings = get_settings()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    This replaces the deprecated @app.on_event decorators.

    On startup:
        - Load all ML models
        - Verify database connection
        - Log service information

    On shutdown:
        - Clean up resources
    """
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.app_env} mode...")
    logger.info(f"API documentation available at /docs")

    # Load ML Models
    logger.info("=" * 60)
    logger.info("Loading ML Models...")
    logger.info("=" * 60)

    try:
        # Import and initialize all ML models
        from app.ml.price_model import get_price_model
        from app.ml.yield_model import get_yield_model
        from app.ml.crop_recommendation_model import get_crop_recommendation_model

        # Load Price Prediction Model (LightGBM + 24 features)
        logger.info("Loading Price Prediction Model...")
        price_model = get_price_model()
        if price_model.model_loaded:
            logger.info("✓ Price Prediction Model loaded successfully")
        else:
            logger.warning("⚠ Price Prediction Model failed to load - using fallback")

        # Load Yield Prediction Model (Rule-based heuristic)
        logger.info("Loading Yield Prediction Model...")
        yield_model = get_yield_model()
        if yield_model.model_loaded:
            logger.info("✓ Yield Prediction Model loaded successfully")
        else:
            logger.warning("⚠ Yield Prediction Model not available")

        # Load Crop Recommendation Model (Random Forest)
        logger.info("Loading Crop Recommendation Model...")
        crop_model = get_crop_recommendation_model()
        if crop_model.model_loaded:
            logger.info("✓ Crop Recommendation Model loaded successfully")
        else:
            logger.warning("⚠ Crop Recommendation Model failed to load")

        logger.info("=" * 60)
        logger.info("ML Models initialization complete")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        logger.warning("Service will continue with fallback predictions")

    # Database connection check
    try:
        from app.data.db import engine
        with engine.connect() as conn:
            logger.info("✓ Database connection verified")
    except Exception as e:
        logger.warning(f"⚠ Database connection failed: {e}")

    logger.info(f"✓ {settings.app_name} is ready to accept requests")

    yield  # Application runs here

    # Shutdown
    logger.info(f"Shutting down {settings.app_name}...")
    logger.info("Cleanup complete. Goodbye!")


# Create FastAPI application instance
app = FastAPI(
    title="ACA-O Service",
    description=(
        "Adaptive Crop & Area Optimization microservice for smart irrigation systems. "
        "Provides crop recommendations, mid-season replanning, and national supply aggregation."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS middleware
# Allow requests from localhost during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:8005",  # React dev server
        "http://localhost:8080",  # Vue dev server
        "http://127.0.0.1",
        "http://127.0.0.1:8005",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Register custom exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(health_router)
app.include_router(recommendations_router)
app.include_router(planb_router)
app.include_router(supply_router)

# Import and include demo router (for testing without database)
from app.api.routes_demo import router as demo_router
app.include_router(demo_router)

# Import and include adaptive recommendations router
from app.api.routes_adaptive import router as adaptive_router
app.include_router(adaptive_router)


@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint - returns basic service information.
    
    Returns:
        dict: Service name and version information
    """
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "description": "Adaptive Crop & Area Optimization Service",
        "docs": "/docs",
    }


# This allows running with: python -m app.main (for debugging)
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=settings.app_env == "development",
    )

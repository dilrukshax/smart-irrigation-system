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
from src.api.routes_health import router as health_router
from src.api.routes_recommendations import router as recommendations_router
from src.api.routes_planb import router as planb_router
from src.api.routes_supply import router as supply_router

# Import core modules
from src.core.config import get_settings
from src.core.logging_config import setup_logging
from src.core.exceptions import register_exception_handlers

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
        - Log that the service has started
        - Optionally verify database connection
    
    On shutdown:
        - Log that the service is stopping
        - Clean up any resources
    """
    # Startup
    logger.info(f"Starting {settings.app_name} in {settings.app_env} mode...")
    logger.info(f"API documentation available at /docs")
    
    # You could add DB connection check here:
    # from src.data.db import engine
    # try:
    #     with engine.connect() as conn:
    #         logger.info("Database connection verified")
    # except Exception as e:
    #     logger.warning(f"Database connection failed: {e}")
    
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
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Vue dev server
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
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


# This allows running with: python -m src.main (for debugging)
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=settings.app_env == "development",
    )

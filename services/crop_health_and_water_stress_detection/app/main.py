"""
Crop Health & Water Stress Detection Service
Main FastAPI application entry point.

This service provides:
- Satellite-based crop health analysis
- Health zone mapping with NDVI/NDWI indices
- Image-based crop disease/stress prediction using MobileNetV2
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.models.crop_health_model import get_model
from app.api.routes import health_analysis, prediction

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Loads the ML model at startup and cleanup at shutdown.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Load the ML model
    logger.info("Loading crop health prediction model...")
    model = get_model()
    model_loaded = model.load_model()
    
    if model_loaded:
        logger.info("✅ Model loaded successfully")
    else:
        logger.warning("⚠️ Model not found, using fallback prediction mode")
    
    logger.info("Application startup complete")
    
    yield  # Application is running
    
    # Shutdown
    logger.info("Shutting down application...")
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## Crop Health & Water Stress Detection API

This service provides AI-powered crop health monitoring and analysis.

### Features

- **Satellite Analysis**: Analyze crop health using satellite imagery indices (NDVI, NDWI)
- **Zone Mapping**: Generate health status maps with color-coded zones
- **Image Prediction**: Upload images for disease/stress classification using MobileNetV2
- **Health Recommendations**: Get actionable recommendations based on analysis

### Health Classifications

| Status | NDVI Range | Color | Risk Level |
|--------|------------|-------|------------|
| Healthy | > 0.55 | 🟢 Green | Low |
| Mild Stress | 0.4 - 0.55 | 🟡 Yellow | Medium |
| Severe Stress | < 0.4 | 🔴 Red | High |

### API Endpoints

- `POST /api/v1/crop-health/analyze` - Analyze satellite data for an area
- `GET /api/v1/crop-health/zones` - Get health zones for a location
- `POST /api/v1/crop-health/predict` - Predict health from uploaded image
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(health_analysis.router)
app.include_router(prediction.router)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for service monitoring."""
    model = get_model()
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "model_loaded": model.loaded
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "analyze": "/api/v1/crop-health/analyze",
            "zones": "/api/v1/crop-health/zones",
            "predict": "/api/v1/crop-health/predict"
        }
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print(f"  {settings.APP_NAME}")
    print("=" * 60)
    print(f"  Version: {settings.APP_VERSION}")
    print(f"  Host: {settings.HOST}")
    print(f"  Port: {settings.PORT}")
    print(f"  Docs: http://localhost:{settings.PORT}/docs")
    print("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
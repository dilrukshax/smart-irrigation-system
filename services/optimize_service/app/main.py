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
import csv
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.api.routes_health import router as health_router
from app.api.routes_recommendations import router as recommendations_router
from app.api.routes_planb import router as planb_router
from app.api.routes_supply import router as supply_router
from app.api.routes_internal import router as internal_router

# Import core modules
from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.exceptions import register_exception_handlers

# Get settings
settings = get_settings()

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def _safe_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _safe_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _seed_crop_catalog_if_empty() -> None:
    """Idempotently seed crop catalog from CSV when DB catalog is empty."""
    try:
        from app.data.db import SessionLocal
        from app.data.models_orm import Crop
    except Exception as exc:  # pragma: no cover - defensive import path
        logger.warning("Unable to import DB models for crop bootstrap: %s", exc)
        return

    data_path = Path(__file__).resolve().parents[1] / "data" / "crops.csv"
    if not data_path.exists():
        logger.warning("Crop seed file not found: %s", data_path)
        return

    db = SessionLocal()
    try:
        existing = db.query(Crop).count()
        if existing > 0:
            logger.info("Crop catalog already populated (%s rows); bootstrap skipped", existing)
            return

        inserted = 0
        with data_path.open("r", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                crop_id = str(row.get("crop_id") or "").strip()
                if not crop_id:
                    continue
                db.add(
                    Crop(
                        id=crop_id,
                        name=row.get("crop_name") or crop_id,
                        category=row.get("category"),
                        water_sensitivity=row.get("water_sensitivity"),
                        growth_duration_days=_safe_int(row.get("growth_duration_days")),
                        base_yield_t_per_ha=_safe_float(
                            row.get("base_yield_t_per_ha") or row.get("typical_yield_t_ha")
                        ),
                        water_requirement_mm=_safe_float(row.get("water_requirement_mm")),
                        ph_min=_safe_float(row.get("ph_min")),
                        ph_max=_safe_float(row.get("ph_max")),
                        ec_max=_safe_float(row.get("ec_max")),
                    )
                )
                inserted += 1

        db.commit()
        logger.info("Crop catalog bootstrap inserted %s rows from %s", inserted, data_path)
    except Exception as exc:
        db.rollback()
        logger.warning("Crop catalog bootstrap failed: %s", exc)
    finally:
        db.close()


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

        required_models = {
            "price_prediction_lgb": str(price_model.model_path),
            "crop_recommendation_rf": str(Path(crop_model.model_path).resolve()),
            "yield_model": "external_joblib_required_for_ml_only",
        }
        loaded_models = []
        missing_models = []

        if price_model.model_loaded:
            loaded_models.append("price_prediction_lgb")
        else:
            missing_models.append("price_prediction_lgb")

        if crop_model.model_loaded:
            loaded_models.append("crop_recommendation_rf")
        else:
            missing_models.append("crop_recommendation_rf")

        if getattr(yield_model, "_model", None) is not None and not yield_model.use_heuristic:
            loaded_models.append("yield_model")
        else:
            missing_models.append("yield_model")

        if settings.is_ml_only_mode and missing_models:
            raise RuntimeError(
                "ML-only mode requires all optimization model artifacts. Missing: "
                + ", ".join(missing_models)
            )

        app.state.model_readiness = {
            "ml_only_mode": settings.is_ml_only_mode,
            "required_models": required_models,
            "loaded_models": loaded_models,
            "missing_models": missing_models,
            "dependencies": {"joblib": True, "numpy": True, "sklearn": True},
        }

    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        if settings.is_ml_only_mode:
            raise
        logger.warning("Service will continue with fallback predictions")
        app.state.model_readiness = {
            "ml_only_mode": settings.is_ml_only_mode,
            "required_models": {},
            "loaded_models": [],
            "missing_models": ["price_prediction_lgb", "crop_recommendation_rf", "yield_model"],
            "dependencies": {"joblib": True, "numpy": True, "sklearn": True},
        }

    # Database connection check
    try:
        from app.data.db import engine
        with engine.connect() as conn:
            logger.info("✓ Database connection verified")
    except Exception as e:
        logger.warning(f"⚠ Database connection failed: {e}")
    else:
        _seed_crop_catalog_if_empty()

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
app.include_router(internal_router)

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

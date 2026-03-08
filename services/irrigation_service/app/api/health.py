"""
Health Check Routes for Irrigation Service.
"""

from fastapi import APIRouter, Request

from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(request: Request):
    """Health check endpoint."""
    readiness = getattr(request.app.state, "model_readiness", {})
    return {
        "status": "healthy",
        "service": "irrigation-service",
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": readiness.get("required_models", {}),
        "loaded_models": readiness.get("loaded_models", []),
        "missing_models": readiness.get("missing_models", []),
    }


@router.get("/ready")
async def readiness_check(request: Request):
    """Readiness check endpoint."""
    readiness = getattr(request.app.state, "model_readiness", {})
    missing = readiness.get("missing_models", [])
    ready = len(missing) == 0 or not settings.is_ml_only_mode
    return {
        "status": "ready" if ready else "source_unavailable",
        "service": "irrigation-service",
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": readiness.get("required_models", {}),
        "loaded_models": readiness.get("loaded_models", []),
        "missing_models": missing,
        "dependencies": readiness.get("dependencies", {}),
        "data_available": ready,
    }

"""
Health Check Routes

This module provides the health check endpoint for the ACA-O service.
The health endpoint is used by:
- Load balancers to check if the service is alive
- Kubernetes/Docker for liveness and readiness probes
- Monitoring systems to track service availability
"""

from fastapi import APIRouter

from src.core.config import get_settings

# Create router with prefix and tags for OpenAPI documentation
router = APIRouter(
    prefix="/health",
    tags=["health"],
)

# Get application settings
settings = get_settings()


@router.get("")
@router.get("/")
async def health_check() -> dict:
    """
    Basic health check endpoint.
    
    Returns a simple JSON response indicating the service is running.
    This endpoint should always return quickly and not depend on
    external services (like the database) to avoid false negatives.
    
    Returns:
        dict: Health status with service name
            - status: "ok" if service is healthy
            - service: Name of the service
    
    Example response:
        {"status": "ok", "service": "aca-o-service"}
    """
    return {
        "status": "ok",
        "service": settings.app_name,
    }


@router.get("/ready")
async def readiness_check() -> dict:
    """
    Readiness check endpoint.
    
    This endpoint can be extended to check if the service is ready
    to accept traffic (e.g., database connection is established,
    ML models are loaded, etc.).
    
    Returns:
        dict: Readiness status with details
    
    Example response:
        {"status": "ready", "checks": {"database": "ok", "models": "ok"}}
    """
    # TODO: Add actual readiness checks when implementing real features
    # For example:
    # - Check database connectivity
    # - Verify ML models are loaded
    # - Check external service availability
    
    return {
        "status": "ready",
        "checks": {
            "database": "ok",  # Placeholder - implement real check later
            "models": "ok",    # Placeholder - implement real check later
        },
    }

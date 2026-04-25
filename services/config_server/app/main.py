"""Config Server for Smart Irrigation local runtime."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query

from app.config_registry import get_all_configs, get_service_config, list_profiles

app = FastAPI(
    title="Smart Irrigation Config Server",
    version="1.0.0",
    description="Centralized runtime configuration service for local Docker profile.",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Service health endpoint."""
    return {
        "status": "healthy",
        "service": "config-server",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/config/all")
def get_all(profile: str = Query(default="docker")) -> dict[str, object]:
    """Return merged config for all services in a profile."""
    try:
        config = get_all_configs(profile)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "service": "all",
        "profile": profile,
        "config": config,
    }


@app.get("/config/{service_name}")
def get_config(
    service_name: str,
    profile: str = Query(default="docker"),
) -> dict[str, object]:
    """Return merged config for one service within a profile."""
    try:
        config = get_service_config(profile, service_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "service": service_name,
        "profile": profile,
        "config": config,
    }


@app.get("/")
def root() -> dict[str, object]:
    """Root endpoint with profile metadata."""
    return {
        "service": "config-server",
        "version": "1.0.0",
        "profiles": list_profiles(),
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8010"))
    uvicorn.run("app.main:app", host=host, port=port)

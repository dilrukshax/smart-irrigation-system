"""
API Gateway - Local Development
A simple FastAPI-based API Gateway for local development.
Routes all requests to the appropriate microservices.

Service Route Structure:
- Auth Service (8001): /api/auth/*, /api/admin/*, /health
- Irrigation Service (8002): /api/v1/*, /health
- Forecasting Service (8003): /api/v1/*, /health  
- ACA-O Service (8004): /f4/*, /health/*
"""

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service URLs - Local Development
SERVICES = {
    "auth": "http://127.0.0.1:8001",
    "crop_health": "http://127.0.0.1:8002",
    "forecasting": "http://127.0.0.1:8003",
    "optimization": "http://127.0.0.1:8004",
    "iot": "http://127.0.0.1:8006",
}

# API Tags for categorization in docs
tags_metadata = [
    {
        "name": "Gateway Health",
        "description": "Health check endpoints for the API Gateway and all services",
    },
    {
        "name": "Auth Service",
        "description": "Authentication and authorization endpoints - Login, Register, Token management",
    },
    {
        "name": "Admin Service",
        "description": "Administrative endpoints - User management, System configuration",
    },
    {
        "name": "Irrigation Service (F1)",
        "description": "Smart irrigation management - Sensors, Schedules, Events, Control",
    },
    {
        "name": "Crop Health Service (F2)",
        "description": "Crop health monitoring - Satellite analysis, Image prediction, Health zones, Stress detection",
    },
    {
        "name": "Forecasting Service (F3)",
        "description": "Weather and resource forecasting - Predictions, Alerts, Simulations",
    },
    {
        "name": "Optimization Service (F4/ACA-O)",
        "description": "AI-driven optimization - Recommendations, Plan B, Water budget, Supply management",
    },
    {
        "name": "IoT Service",
        "description": "ESP32 sensor telemetry - Device data, Commands, Real-time ingestion",
    },
]

# Create FastAPI app
app = FastAPI(
    title="Smart Irrigation API Gateway",
    description="""
## Smart Irrigation System - API Gateway

This API Gateway routes requests to the appropriate microservices.

### Services

| Service | Port | Description |
|---------|------|-------------|
| **Auth** | 8001 | Authentication & Authorization |
| **Crop Health (F2)** | 8002 | Satellite analysis & Image prediction |
| **Forecasting (F3)** | 8003 | Weather & Resource predictions |
| **Optimization (F4)** | 8004 | AI recommendations & Planning |

### Route Mappings

- `/api/v1/auth/*` → Auth Service
- `/api/v1/admin/*` → Admin endpoints (Auth Service)
- `/api/v1/irrigation/*` → Irrigation Service (F1)
- `/api/v1/crop-health/*` → Crop Health Service (F2)
- `/api/v1/forecast/*` → Forecasting Service (F3)
- `/api/v1/optimization/*` → Optimization Service (F4/ACA-O)
    """,
    version="1.0.0",
    openapi_tags=tags_metadata,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8005",
        "http://127.0.0.1:8005",
        "http://localhost:8006",
        "http://127.0.0.1:8006",
        "http://localhost:8007",
        "http://127.0.0.1:8007",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP client with timeout
http_client = httpx.AsyncClient(timeout=30.0)


async def proxy_request(
    service_url: str,
    path: str,
    request: Request,
) -> JSONResponse:
    """Proxy a request to a backend service."""
    
    # Build the target URL
    url = f"{service_url}{path}"
    
    # Get query params
    query_params = str(request.query_params) if request.query_params else ""
    if query_params:
        url = f"{url}?{query_params}"
    
    # Get headers (forward auth token)
    headers = {}
    if "authorization" in request.headers:
        headers["Authorization"] = request.headers["authorization"]
    if "content-type" in request.headers:
        headers["Content-Type"] = request.headers["content-type"]
    
    # Get body for POST/PUT/PATCH
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body = await request.body()
    
    try:
        logger.info(f"Proxying {request.method} {url}")
        
        response = await http_client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
        
        # Return the response
        try:
            content = response.json() if response.content else {}
        except:
            content = {"message": response.text}
            
        return JSONResponse(
            content=content,
            status_code=response.status_code,
        )
        
    except httpx.ConnectError:
        logger.error(f"Service unavailable: {service_url}")
        raise HTTPException(status_code=503, detail=f"Service unavailable")
    except httpx.TimeoutException:
        logger.error(f"Service timeout: {service_url}")
        raise HTTPException(status_code=504, detail="Service timeout")
    except Exception as e:
        logger.error(f"Proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =================== Health Endpoints ===================

@app.get("/health", tags=["Gateway Health"], summary="Gateway Health Check")
async def gateway_health():
    """Check if the API Gateway is running and healthy."""
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/services/health", tags=["Gateway Health"], summary="All Services Health")
async def all_services_health():
    """Check health status of all backend microservices."""
    results = {}
    
    for name, url in SERVICES.items():
        try:
            response = await http_client.get(f"{url}/health", timeout=5.0)
            results[name] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "url": url,
            }
        except Exception as e:
            results[name] = {"status": "unavailable", "url": url, "error": str(e)}
    
    return results


# =================== Auth Service Routes ===================

@app.get("/api/v1/auth/health", tags=["Auth Service"], summary="Auth Service Health")
async def auth_health(request: Request):
    """Check Auth Service health status."""
    return await proxy_request(SERVICES["auth"], "/health", request)


@app.post("/api/v1/auth/login", tags=["Auth Service"], summary="User Login")
async def auth_login(request: Request):
    """Authenticate user and get access token."""
    return await proxy_request(SERVICES["auth"], "/api/auth/login", request)


@app.post("/api/v1/auth/register", tags=["Auth Service"], summary="User Registration")
async def auth_register(request: Request):
    """Register a new user account."""
    return await proxy_request(SERVICES["auth"], "/api/auth/register", request)


@app.post("/api/v1/auth/refresh", tags=["Auth Service"], summary="Refresh Token")
async def auth_refresh(request: Request):
    """Refresh access token using refresh token."""
    return await proxy_request(SERVICES["auth"], "/api/auth/refresh", request)


@app.get("/api/v1/auth/me", tags=["Auth Service"], summary="Get Current User")
async def auth_me(request: Request):
    """Get current authenticated user's profile."""
    return await proxy_request(SERVICES["auth"], "/api/auth/me", request)


@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Auth Service"], summary="Auth Service Proxy", include_in_schema=False)
async def auth_proxy(path: str, request: Request):
    """Proxy to Auth Service - maps /api/v1/auth/* -> /api/auth/*"""
    return await proxy_request(SERVICES["auth"], f"/api/auth/{path}", request)


# =================== Admin Service Routes ===================

@app.get("/api/v1/admin/users", tags=["Admin Service"], summary="List All Users")
async def admin_list_users(request: Request):
    """Get list of all users (Admin only)."""
    return await proxy_request(SERVICES["auth"], "/api/admin/users", request)


@app.get("/api/v1/admin/users/{user_id}", tags=["Admin Service"], summary="Get User by ID")
async def admin_get_user(user_id: str, request: Request):
    """Get user details by ID (Admin only)."""
    return await proxy_request(SERVICES["auth"], f"/api/admin/users/{user_id}", request)


@app.api_route("/api/v1/admin/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Admin Service"], summary="Admin Service Proxy", include_in_schema=False)
async def admin_proxy(path: str, request: Request):
    """Proxy to Auth Service Admin - maps /api/v1/admin/* -> /api/admin/*"""
    return await proxy_request(SERVICES["auth"], f"/api/admin/{path}", request)


# =================== Irrigation Service Routes ===================

@app.get("/api/v1/irrigation/health", tags=["Irrigation Service (F1)"], summary="Irrigation Service Health")
async def irrigation_health(request: Request):
    """Check Irrigation Service health status."""
    return await proxy_request(SERVICES["irrigation"], "/health", request)


@app.get("/api/v1/irrigation/sensors", tags=["Irrigation Service (F1)"], summary="Get All Sensors")
async def irrigation_get_sensors(request: Request):
    """Get list of all irrigation sensors."""
    return await proxy_request(SERVICES["irrigation"], "/api/v1/sensors", request)


@app.get("/api/v1/irrigation/sensors/{sensor_id}", tags=["Irrigation Service (F1)"], summary="Get Sensor by ID")
async def irrigation_get_sensor(sensor_id: str, request: Request):
    """Get sensor details by ID."""
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/sensors/{sensor_id}", request)


@app.get("/api/v1/irrigation/sensors/{sensor_id}/data", tags=["Irrigation Service (F1)"], summary="Get Sensor Data")
async def irrigation_get_sensor_data(sensor_id: str, request: Request):
    """Get historical data for a specific sensor."""
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/sensors/{sensor_id}/data", request)


@app.post("/api/v1/irrigation/sensors/predict", tags=["Irrigation Service (F1)"], summary="Predict Irrigation Need")
async def irrigation_predict(request: Request):
    """Predict irrigation need based on sensor data."""
    return await proxy_request(SERVICES["irrigation"], "/api/v1/sensors/predict", request)


@app.api_route("/api/v1/irrigation/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Irrigation Service (F1)"], summary="Irrigation Service Proxy", include_in_schema=False)
async def irrigation_proxy(path: str, request: Request):
    """Proxy to Irrigation Service - maps /api/v1/irrigation/* -> /api/v1/*"""
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/{path}", request)


# =================== Crop Health Service Routes (F2) ===================

@app.get("/api/v1/crop-health/health", tags=["Crop Health Service (F2)"], summary="Crop Health Service Health")
async def crop_health_service_health(request: Request):
    """Check Crop Health Service health status."""
    return await proxy_request(SERVICES["crop_health"], "/health", request)


@app.post("/api/v1/crop-health/analyze", tags=["Crop Health Service (F2)"], summary="Analyze Satellite Data")
async def crop_health_analyze(request: Request):
    """Analyze satellite imagery for crop health assessment."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/analyze", request)


@app.get("/api/v1/crop-health/zones", tags=["Crop Health Service (F2)"], summary="Get Health Zones")
async def crop_health_get_zones(request: Request):
    """Get crop health zones for a location."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/zones", request)


@app.get("/api/v1/crop-health/zones/geojson", tags=["Crop Health Service (F2)"], summary="Get Zones as GeoJSON")
async def crop_health_get_zones_geojson(request: Request):
    """Get crop health zones as GeoJSON format."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/zones/geojson", request)


@app.get("/api/v1/crop-health/zones/summary", tags=["Crop Health Service (F2)"], summary="Get Zones Summary")
async def crop_health_get_zones_summary(request: Request):
    """Get summary statistics for health zones."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/zones/summary", request)


@app.post("/api/v1/crop-health/predict", tags=["Crop Health Service (F2)"], summary="Predict Crop Health from Image")
async def crop_health_predict(request: Request):
    """Predict crop health from uploaded image using ML model."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/predict", request)


@app.post("/api/v1/crop-health/predict/url", tags=["Crop Health Service (F2)"], summary="Predict from Image URL")
async def crop_health_predict_url(request: Request):
    """Predict crop health from image URL."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/predict/url", request)


@app.get("/api/v1/crop-health/model/status", tags=["Crop Health Service (F2)"], summary="Get Model Status")
async def crop_health_model_status(request: Request):
    """Get ML model status and information."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/model/status", request)


@app.get("/api/v1/crop-health/model/classes", tags=["Crop Health Service (F2)"], summary="Get Model Classes")
async def crop_health_model_classes(request: Request):
    """Get list of classes the model can predict."""
    return await proxy_request(SERVICES["crop_health"], "/api/v1/crop-health/model/classes", request)


@app.api_route("/api/v1/crop-health/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Crop Health Service (F2)"], summary="Crop Health Service Proxy", include_in_schema=False)
async def crop_health_proxy(path: str, request: Request):
    """Proxy to Crop Health Service - maps /api/v1/crop-health/* -> /api/v1/crop-health/*"""
    return await proxy_request(SERVICES["crop_health"], f"/api/v1/crop-health/{path}", request)


# =================== Forecasting Service Routes ===================

@app.get("/api/v1/forecast/health", tags=["Forecasting Service (F3)"], summary="Forecasting Service Health")
async def forecast_health(request: Request):
    """Check Forecasting Service health status."""
    return await proxy_request(SERVICES["forecasting"], "/health", request)


@app.get("/api/v1/forecast/weather", tags=["Forecasting Service (F3)"], summary="Get Weather Forecast")
async def forecast_weather(request: Request):
    """Get weather forecast data."""
    return await proxy_request(SERVICES["forecasting"], "/api/v1/weather", request)


@app.get("/api/v1/forecast/predictions", tags=["Forecasting Service (F3)"], summary="Get Predictions")
async def forecast_predictions(request: Request):
    """Get resource usage predictions."""
    return await proxy_request(SERVICES["forecasting"], "/api/v1/predictions", request)


@app.api_route("/api/v1/forecast/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Forecasting Service (F3)"], summary="Forecasting Service Proxy", include_in_schema=False)
async def forecasting_proxy(path: str, request: Request):
    """Proxy to Forecasting Service - maps /api/v1/forecast/* -> /api/v1/*"""
    return await proxy_request(SERVICES["forecasting"], f"/api/v1/{path}", request)


# =================== Optimization Service Routes (ACA-O) ===================

@app.get("/api/v1/optimization/health", tags=["Optimization Service (F4/ACA-O)"], summary="Optimization Service Health")
async def optimization_health(request: Request):
    """Check Optimization Service (ACA-O) health status."""
    return await proxy_request(SERVICES["optimization"], "/health", request)


@app.get("/api/v1/optimization/recommendations", tags=["Optimization Service (F4/ACA-O)"], summary="Get Recommendations")
async def optimization_recommendations(request: Request):
    """Get AI-driven irrigation recommendations."""
    return await proxy_request(SERVICES["optimization"], "/f4/recommendations", request)


@app.post("/api/v1/optimization/recommendations", tags=["Optimization Service (F4/ACA-O)"], summary="Generate Recommendations")
async def optimization_generate_recommendations(request: Request):
    """Generate new optimization recommendations."""
    return await proxy_request(SERVICES["optimization"], "/f4/recommendations", request)


@app.get("/api/v1/optimization/planb", tags=["Optimization Service (F4/ACA-O)"], summary="Get Plan B Options")
async def optimization_planb(request: Request):
    """Get alternative plan options when primary plan fails."""
    return await proxy_request(SERVICES["optimization"], "/f4/planb", request)


@app.post("/api/v1/optimization/planb/generate", tags=["Optimization Service (F4/ACA-O)"], summary="Generate Plan B")
async def optimization_generate_planb(request: Request):
    """Generate alternative plans."""
    return await proxy_request(SERVICES["optimization"], "/f4/planb/generate", request)


@app.get("/api/v1/optimization/supply", tags=["Optimization Service (F4/ACA-O)"], summary="Get Water Supply Status")
async def optimization_supply(request: Request):
    """Get current water supply status and availability."""
    return await proxy_request(SERVICES["optimization"], "/f4/supply", request)


@app.api_route("/api/v1/optimization/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["Optimization Service (F4/ACA-O)"], summary="Optimization Service Proxy", include_in_schema=False)
async def optimization_proxy(path: str, request: Request):
    """Proxy to Optimization Service (ACA-O) - maps /api/v1/optimization/* -> /f4/*"""
    return await proxy_request(SERVICES["optimization"], f"/f4/{path}", request)


# =================== IoT Service Routes ===================

@app.get("/api/v1/iot/health", tags=["IoT Service"], summary="IoT Service Health")
async def iot_health(request: Request):
    """Check IoT Telemetry Service health status."""
    return await proxy_request(SERVICES["iot"], "/health", request)


@app.get("/api/v1/iot/devices", tags=["IoT Service"], summary="List All Devices")
async def iot_list_devices(request: Request):
    """Get list of all known IoT devices with their status."""
    return await proxy_request(SERVICES["iot"], "/api/v1/iot/devices", request)


@app.get("/api/v1/iot/devices/{device_id}/latest", tags=["IoT Service"], summary="Get Latest Reading")
async def iot_get_latest(device_id: str, request: Request):
    """Get the latest telemetry reading for a device."""
    return await proxy_request(SERVICES["iot"], f"/api/v1/iot/devices/{device_id}/latest", request)


@app.get("/api/v1/iot/devices/{device_id}/range", tags=["IoT Service"], summary="Get Readings Range")
async def iot_get_range(device_id: str, request: Request):
    """Get telemetry readings within a time range."""
    return await proxy_request(SERVICES["iot"], f"/api/v1/iot/devices/{device_id}/range", request)


@app.post("/api/v1/iot/devices/{device_id}/cmd", tags=["IoT Service"], summary="Send Device Command")
async def iot_send_command(device_id: str, request: Request):
    """Send a command to an IoT device via MQTT."""
    return await proxy_request(SERVICES["iot"], f"/api/v1/iot/devices/{device_id}/cmd", request)


@app.post("/api/v1/iot/telemetry", tags=["IoT Service"], summary="Ingest Telemetry")
async def iot_ingest_telemetry(request: Request):
    """Manually ingest telemetry data (for testing without MQTT)."""
    return await proxy_request(SERVICES["iot"], "/api/v1/iot/telemetry", request)


@app.api_route("/api/v1/iot/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], 
               tags=["IoT Service"], summary="IoT Service Proxy", include_in_schema=False)
async def iot_proxy(path: str, request: Request):
    """Proxy to IoT Service - maps /api/v1/iot/* -> /api/v1/iot/*"""
    return await proxy_request(SERVICES["iot"], f"/api/v1/iot/{path}", request)


# =================== Startup/Shutdown ===================

@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown."""
    await http_client.aclose()


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("Smart Irrigation API Gateway")
    print("=" * 60)
    print(f"Gateway URL: http://localhost:8000")
    print(f"API Docs:    http://localhost:8000/docs")
    print("-" * 60)
    print("Route Mappings:")
    print("  /api/v1/auth/*         -> Auth Service /api/auth/*")
    print("  /api/v1/admin/*        -> Auth Service /api/admin/*")
    print("  /api/v1/irrigation/*   -> Irrigation Service /api/v1/*")
    print("  /api/v1/forecast/*     -> Forecasting Service /api/v1/*")
    print("  /api/v1/optimization/* -> ACA-O Service /f4/*")
    print("  /api/v1/iot/*          -> IoT Service /api/v1/iot/*")
    print("-" * 60)
    print("Backend Services:")
    for name, url in SERVICES.items():
        print(f"  - {name}: {url}")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

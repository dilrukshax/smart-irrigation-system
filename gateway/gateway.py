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
    "irrigation": "http://127.0.0.1:8002",
    "forecasting": "http://127.0.0.1:8003",
    "optimization": "http://127.0.0.1:8004",
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
        "name": "Forecasting Service (F3)",
        "description": "Weather and resource forecasting - Predictions, Alerts, Simulations",
    },
    {
        "name": "Optimization Service (F4/ACA-O)",
        "description": "AI-driven optimization - Recommendations, Plan B, Water budget, Supply management",
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
| **Irrigation (F1)** | 8002 | Sensor data & Irrigation control |
| **Forecasting (F3)** | 8003 | Weather & Resource predictions |
| **Optimization (F4)** | 8004 | AI recommendations & Planning |

### Route Mappings

- `/api/v1/auth/*` → Auth Service
- `/api/v1/admin/*` → Admin endpoints (Auth Service)
- `/api/v1/irrigation/*` → Irrigation Service
- `/api/v1/forecast/*` → Forecasting Service
- `/api/v1/optimization/*` → Optimization Service (ACA-O)
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
    print("-" * 60)
    print("Backend Services:")
    for name, url in SERVICES.items():
        print(f"  - {name}: {url}")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

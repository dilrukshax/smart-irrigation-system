"""Smart Irrigation API Gateway with grouped v1 namespaces."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config_bootstrap import apply_remote_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

apply_remote_config(default_service_name="gateway", logger=logger)

SERVICES = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8001"),
    "irrigation": os.getenv("IRRIGATION_SERVICE_URL", "http://127.0.0.1:8002"),
    "forecasting": os.getenv("FORECASTING_SERVICE_URL", "http://127.0.0.1:8003"),
    "planning": os.getenv("PLANNING_SERVICE_URL", "http://127.0.0.1:8004"),
    "iot": os.getenv("IOT_SERVICE_URL", "http://127.0.0.1:8006"),
    "crop_health": os.getenv("CROP_HEALTH_SERVICE_URL", "http://127.0.0.1:8007"),
}

app = FastAPI(
    title="Smart Irrigation API Gateway",
    version="2.0.0",
    description="Grouped namespace gateway for farmer/officer/authority operations.",
)

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

http_client = httpx.AsyncClient(timeout=30.0)


def _copy_headers(request: Request) -> Dict[str, str]:
    headers: Dict[str, str] = {}
    for key in ("authorization", "content-type", "x-request-id"):
        if key in request.headers:
            headers[key.title() if key != "authorization" else "Authorization"] = request.headers[key]
    return headers


async def proxy_request(service_url: str, path: str, request: Request) -> JSONResponse:
    url = f"{service_url}{path}"
    query_params = str(request.query_params) if request.query_params else ""
    if query_params:
        url = f"{url}?{query_params}"

    body = None
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        body = await request.body()

    try:
        response = await http_client.request(
            method=request.method,
            url=url,
            headers=_copy_headers(request),
            content=body,
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {service_url}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"Service timeout: {service_url}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    try:
        content = response.json() if response.content else {}
    except Exception:
        content = {"message": response.text}

    return JSONResponse(content=content, status_code=response.status_code)


def _contract_from_payload(payload: Dict[str, Any], *, fallback_source: str) -> Dict[str, Any]:
    status_value = payload.get("status") if isinstance(payload.get("status"), str) else "ok"
    source = payload.get("source") if isinstance(payload.get("source"), str) else fallback_source
    return {
        "status": status_value,
        "source": source,
        "is_live": bool(payload.get("is_live", status_value == "ok")),
        "observed_at": payload.get("observed_at"),
        "staleness_sec": payload.get("staleness_sec"),
        "quality": payload.get("quality") if isinstance(payload.get("quality"), str) else "unknown",
        "data_available": bool(payload.get("data_available", True)),
        "message": payload.get("message") if isinstance(payload.get("message"), str) else None,
    }


def _as_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _extract_f4_view(
    recs_payload: Optional[Dict[str, Any]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    payload = _as_dict(recs_payload)
    rows = payload.get("data")
    if not isinstance(rows, list) or not rows:
        return {
            "recommendation_summary": None,
            "income_projection": None,
            "market_snapshot": None,
            "selected_crop": None,
        }

    first_row = _as_dict(rows[0])
    recommendations = first_row.get("recommendations")
    if not isinstance(recommendations, list) or not recommendations:
        return {
            "recommendation_summary": None,
            "income_projection": None,
            "market_snapshot": None,
            "selected_crop": None,
        }

    top = _as_dict(recommendations[0])
    crop_name = top.get("crop_name") or top.get("crop_type") or top.get("crop_id")
    expected_profit = top.get("expected_profit_per_ha") or top.get("profit_per_ha")
    predicted_price = top.get("predicted_price_per_kg")
    predicted_yield = top.get("expected_yield_t_per_ha") or top.get("predicted_yield")
    risk = top.get("risk_band") or top.get("risk")

    return {
        "recommendation_summary": {
            "crop_name": crop_name,
            "risk": risk,
            "ranked_count": len(recommendations),
        },
        "income_projection": {
            "expected_profit_per_ha": expected_profit,
            "predicted_yield_t_per_ha": predicted_yield,
        },
        "market_snapshot": {
            "predicted_price_per_kg": predicted_price,
        },
        "selected_crop": {
            "crop_type": crop_name,
            "source": "f4.recommendations.top_candidate",
        },
    }


async def _fetch_json(url: str, headers: Dict[str, str]) -> tuple[Optional[Dict[str, Any]], Optional[str], int]:
    try:
        response = await http_client.get(url, headers=headers)
    except Exception as exc:
        return None, f"upstream request failed: {exc}", 503

    if response.status_code >= 400:
        detail = None
        try:
            payload = response.json()
            detail = payload.get("detail") or payload.get("message")
        except Exception:
            detail = response.text
        return None, f"{response.status_code}: {detail}", response.status_code

    try:
        return response.json() if response.content else {}, None, response.status_code
    except Exception:
        return {}, None, response.status_code


@app.get("/health")
async def gateway_health():
    return {"status": "healthy", "service": "api-gateway", "version": "2.0.0"}


@app.get("/services/health")
async def all_services_health():
    results = {}
    for name, url in SERVICES.items():
        try:
            response = await http_client.get(f"{url}/health", timeout=5.0)
            results[name] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "url": url,
            }
        except Exception as exc:
            results[name] = {"status": "unavailable", "url": url, "error": str(exc)}
    return results


# ---------- Auth ----------


@app.api_route("/api/v1/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def auth_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["auth"], f"/api/auth/{path}", request)


# ---------- Authority ----------


@app.api_route("/api/v1/authority/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def authority_proxy(path: str, request: Request):
    # policy endpoints are hosted by irrigation service
    if path.startswith("policies"):
        return await proxy_request(SERVICES["irrigation"], f"/api/v1/authority/{path}", request)
    # authority user/role management is hosted by auth service
    return await proxy_request(SERVICES["auth"], f"/api/authority/{path}", request)


# ---------- Farm ----------


@app.get("/api/v1/farm/fields/{field_id}/profile")
async def unified_field_profile(field_id: str, request: Request):
    headers = _copy_headers(request)
    errors: list[str] = []

    f1_status, err, _ = await _fetch_json(
        f"{SERVICES['irrigation']}/api/v1/irrigation/fields/{field_id}/status",
        headers,
    )
    if err:
        errors.append(f"f1.status: {err}")

    f1_decision, err, _ = await _fetch_json(
        f"{SERVICES['irrigation']}/api/v1/irrigation/fields/{field_id}/auto-decision",
        headers,
    )
    if err:
        errors.append(f"f1.decision: {err}")

    f2_stress, err, _ = await _fetch_json(
        f"{SERVICES['crop_health']}/api/v1/crop-health/fields/{field_id}/stress-summary",
        headers,
    )
    if err:
        errors.append(f"f2.stress: {err}")

    f3_weather, err, _ = await _fetch_json(
        f"{SERVICES['forecasting']}/api/weather/summary",
        headers,
    )
    if err:
        errors.append(f"f3.weather: {err}")

    f3_rec, err, _ = await _fetch_json(
        f"{SERVICES['forecasting']}/api/weather/irrigation-recommendation",
        headers,
    )
    if err:
        errors.append(f"f3.recommendation: {err}")

    f4_recs, err, _ = await _fetch_json(
        f"{SERVICES['planning']}/f4/recommendations?field_id={field_id}",
        headers,
    )
    if err:
        errors.append(f"f4.recommendations: {err}")

    f4_budget, err, _ = await _fetch_json(
        f"{SERVICES['planning']}/f4/supply/water-budget?field_id={field_id}",
        headers,
    )
    if err:
        errors.append(f"f4.water_budget: {err}")

    f1_payload = f1_status or {}
    f1_contract = _contract_from_payload(f1_payload, fallback_source="irrigation")
    if f1_decision and "status" not in f1_decision:
        f1_decision.update(f1_contract)

    f2_payload = f2_stress or {}
    f2_contract = _contract_from_payload(f2_payload, fallback_source="crop_health")

    # f3 can be stale even when available from simulated forecast
    f3_payload = f3_rec or f3_weather or {}
    f3_contract = _contract_from_payload(f3_payload, fallback_source="forecasting")

    f4_payload = f4_recs or f4_budget or {}
    f4_contract = _contract_from_payload(f4_payload, fallback_source="planning")

    statuses = [f1_contract["status"], f2_contract["status"], f3_contract["status"], f4_contract["status"]]
    overall_status = "ok"
    if any(status_value == "source_unavailable" for status_value in statuses):
        overall_status = "source_unavailable"
    elif any(status_value == "stale" for status_value in statuses):
        overall_status = "stale"

    f4_view = _extract_f4_view(f4_recs)
    selected_crop = f4_view.get("selected_crop")
    crop_type = _as_dict(f1_status).get("crop_type")
    if isinstance(crop_type, str) and crop_type and crop_type.lower() != "unassigned":
        selected_crop = {"crop_type": crop_type, "source": "f1.field_status"}

    return {
        "field_id": field_id,
        "generated_at": datetime.utcnow().isoformat(),
        "partial_failure": len(errors) > 0,
        "errors": errors,
        "status": overall_status,
        "source": "gateway.aggregate",
        "is_live": overall_status == "ok",
        "observed_at": datetime.utcnow().isoformat(),
        "staleness_sec": 0,
        "quality": "good" if overall_status == "ok" else "unknown",
        "data_available": len(errors) < 7,
        "selected_crop": selected_crop,
        "satellite_stress_summary": f2_stress,
        "sections": {
            "f1": {
                **f1_contract,
                "field_status": f1_status,
                "auto_decision": f1_decision,
                "controls": {
                    "command": f"/api/v1/irrigation/fields/{field_id}/commands",
                    "manual_request": f"/api/v1/irrigation/fields/{field_id}/manual-requests",
                },
            },
            "f2": {
                **f2_contract,
                "stress_summary": f2_stress,
            },
            "f3": {
                **f3_contract,
                "weather_summary": f3_weather,
                "irrigation_recommendation": f3_rec,
            },
            "f4": {
                **f4_contract,
                "recommendations": f4_recs,
                "optimization_context": f4_budget,
                "recommendation_summary": f4_view.get("recommendation_summary"),
                "income_projection": f4_view.get("income_projection"),
                "market_snapshot": f4_view.get("market_snapshot"),
                "actions": {
                    "scenario_evaluate": "/api/v1/planning/scenario-evaluate",
                    "plan_b": "/api/v1/planning/planb",
                },
            },
        },
    }


@app.api_route("/api/v1/farm/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def farm_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/farm/{path}", request)


# ---------- Devices ----------


@app.api_route("/api/v1/devices/pairing/{path:path}", methods=["GET", "POST", "PUT", "PATCH"])
async def devices_pairing_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/devices/pairing/{path}", request)


@app.get("/api/v1/devices")
async def devices_list(request: Request):
    # authoritative device catalog from irrigation field mappings
    return await proxy_request(SERVICES["irrigation"], "/api/v1/devices", request)


@app.api_route("/api/v1/devices/{path:path}", methods=["GET", "POST"])
async def devices_proxy(path: str, request: Request):
    # optional passthrough for direct device latest/range/command operations
    return await proxy_request(SERVICES["iot"], f"/api/v1/iot/devices/{path}", request)


# ---------- Telemetry ----------


@app.post("/api/v1/telemetry/ingest")
async def telemetry_ingest(request: Request):
    # App-initiated ingest should land on irrigation for lifecycle/pairing transitions.
    return await proxy_request(SERVICES["irrigation"], "/api/v1/telemetry/ingest", request)


@app.api_route("/api/v1/telemetry/fields/{path:path}", methods=["GET"])
async def telemetry_field_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/telemetry/fields/{path}", request)


# ---------- Irrigation ----------


@app.api_route("/api/v1/irrigation/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def irrigation_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["irrigation"], f"/api/v1/irrigation/{path}", request)


# ---------- Crop Health ----------


@app.api_route("/api/v1/crop-health/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def crop_health_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["crop_health"], f"/api/v1/crop-health/{path}", request)


# ---------- Forecast ----------


def _map_forecast_path(path: str) -> str:
    if path == "health":
        return "/health"
    if path.startswith("weather/"):
        return f"/api/weather/{path[len('weather/') :]}"
    if path == "weather":
        return "/api/weather/forecast"
    if path.startswith("v2/"):
        return f"/api/v2/{path[len('v2/') :]}"
    if path == "v2":
        return "/api/v2/status"
    return f"/api/v1/{path}"


@app.api_route("/api/v1/forecast/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def forecast_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["forecasting"], _map_forecast_path(path), request)


# ---------- Planning ----------


def _map_planning_path(path: str) -> str:
    if path == "recommendations":
        return "/f4/recommendations"
    if path == "scenario-evaluate":
        return "/f4/recommendations/scenario-evaluate"
    if path == "planb":
        return "/f4/planb"
    if path == "supply/water-budget":
        return "/f4/supply/water-budget"
    return f"/f4/{path}"


@app.api_route("/api/v1/planning/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def planning_proxy(path: str, request: Request):
    return await proxy_request(SERVICES["planning"], _map_planning_path(path), request)


@app.on_event("shutdown")
async def shutdown() -> None:
    await http_client.aclose()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
    )

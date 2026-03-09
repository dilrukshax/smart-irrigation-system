"""
Smart Water Management API Routes

Provides endpoints for:
- Water release predictions using ML model
- Reservoir status monitoring
- Actuator control decisions
- Historical data management
"""

import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional, List

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.ml.water_management_model import water_management_model
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/water-management", tags=["Water Management"])


def _ml_only_unavailable_detail(message: str, *, missing_models: Optional[list] = None, missing_features: Optional[list] = None) -> dict:
    return {
        "status": "source_unavailable",
        "message": message,
        "source": "water_management_model",
        "data_available": False,
        "missing_models": missing_models or [],
        "missing_features": missing_features or [],
    }


# ============ Request/Response Schemas ============

class ReservoirData(BaseModel):
    """Current reservoir and weather sensor data."""
    water_level_mmsl: float = Field(..., description="Reservoir water level (mMSL)")
    total_storage_mcm: float = Field(..., ge=0, description="Total storage capacity (MCM)")
    active_storage_mcm: float = Field(..., ge=0, description="Active storage capacity (MCM)")
    inflow_mcm: float = Field(0.0, ge=0, description="Current inflow (MCM)")
    rain_mm: float = Field(0.0, ge=0, description="Rainfall (mm)")
    main_canals_mcm: float = Field(0.0, ge=0, description="Current main canal release (MCM)")
    lb_main_canal_mcm: float = Field(0.0, ge=0, description="Left bank canal release (MCM)")
    rb_main_canal_mcm: float = Field(0.0, ge=0, description="Right bank canal release (MCM)")
    evap_mm: Optional[float] = Field(None, ge=0, description="Evaporation (mm)")
    spillway_mcm: Optional[float] = Field(None, ge=0, description="Spillway release (MCM)")
    wind_speed_ms: Optional[float] = Field(None, ge=0, description="Wind speed (m/s)")


class ReservoirDataWithLags(ReservoirData):
    """Reservoir data with optional lag and rolling features."""
    # Lag features (optional - will use defaults if not provided)
    water_level_mmsl_lag1: Optional[float] = None
    water_level_mmsl_lag7: Optional[float] = None
    inflow_mcm_lag1: Optional[float] = None
    rain_mm_lag7: Optional[float] = None
    main_canals_mcm_lag1: Optional[float] = None

    # Rolling means (optional)
    rain_mm_roll7: Optional[float] = None
    inflow_mcm_roll7: Optional[float] = None


class PredictionResponse(BaseModel):
    """Water release prediction response."""
    predicted_release_mcm: float
    confidence: float
    model_used: str
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    input_contract_version: Optional[str] = None
    features_used_count: Optional[int] = None
    status: str = "ok"
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True


class DecisionResponse(BaseModel):
    """Actuator control decision response."""
    action: str
    valve_position: int
    reason: str
    priority: str
    status: str = "ok"
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True


class ReservoirStatusResponse(BaseModel):
    """Reservoir status assessment."""
    level_mmsl: float
    total_storage_mcm: float
    active_storage_mcm: float
    storage_percentage: float
    status: str
    alert: Optional[str]


class RecommendationResponse(BaseModel):
    """Complete water management recommendation."""
    timestamp: str
    prediction: PredictionResponse
    decision: DecisionResponse
    reservoir_status: ReservoirStatusResponse
    input_data: dict
    data_source: Optional[str] = "simulated"


class ThresholdConfig(BaseModel):
    """Configuration for decision thresholds."""
    release_threshold_mcm: float = Field(0.5, ge=0, description="Release threshold (MCM)")
    min_safe_level_mmsl: float = Field(80.0, description="Minimum safe reservoir level (mMSL)")
    max_safe_level_mmsl: float = Field(95.0, description="Maximum safe reservoir level (mMSL)")


class ManualOverrideRequest(BaseModel):
    """Manual control override request."""
    action: str = Field(..., pattern="^(OPEN|CLOSE|HOLD|EMERGENCY_RELEASE)$")
    valve_position: int = Field(..., ge=0, le=100, description="Valve position percentage")
    reason: str = Field(..., min_length=1, description="Reason for manual override")
    operator_id: Optional[str] = None


class ManualOverrideResponse(BaseModel):
    """Manual control override response."""
    status: str
    action_taken: str
    valve_position: int
    timestamp: float
    override_active: bool


# ============ Simulated Sensor Data ============

# Udawalawe reservoir physical constants
UDAWALAWE_DEAD_LEVEL_MMSL = 70.0   # mMSL – dead storage level
UDAWALAWE_FULL_LEVEL_MMSL = 95.0   # mMSL – full supply level
UDAWALAWE_TOTAL_MCM = 268.0        # MCM – total storage capacity

# IoT service URL (override via env var for Docker networking)
IOT_SERVICE_URL = os.getenv("IOT_SERVICE_URL", "http://localhost:8006")


def get_simulated_reservoir_data() -> dict:
    """
    Generate simulated reservoir sensor data for demonstration.
    In production, this is replaced by real IoT sensor readings.
    """
    import random
    import math

    # Simulate seasonal variations
    day_of_year = datetime.now().timetuple().tm_yday
    seasonal_factor = math.sin(2 * math.pi * day_of_year / 365)  # -1 to 1

    # Base values with seasonal adjustment
    base_level = 85.0 + seasonal_factor * 5  # 80-90 mMSL
    base_inflow = 0.5 + seasonal_factor * 0.3

    # Add daily noise
    water_level = round(base_level + random.uniform(-2, 2), 2)
    inflow = round(max(0, base_inflow + random.uniform(-0.1, 0.2)), 3)
    rain = round(max(0, random.gauss(5, 10) if seasonal_factor > 0 else random.gauss(2, 5)), 1)

    active_storage = round(
        UDAWALAWE_TOTAL_MCM * (water_level - UDAWALAWE_DEAD_LEVEL_MMSL)
        / (UDAWALAWE_FULL_LEVEL_MMSL - UDAWALAWE_DEAD_LEVEL_MMSL),
        2,
    )

    return {
        "water_level_mmsl": water_level,
        "total_storage_mcm": UDAWALAWE_TOTAL_MCM,
        "active_storage_mcm": max(0.0, active_storage),
        "inflow_mcm": inflow,
        "rain_mm": rain,
        "main_canals_mcm": round(random.uniform(0.2, 0.8), 3),
        "lb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
        "rb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
        "evap_mm": round(random.uniform(3, 8), 2),
        "spillway_mcm": round(random.uniform(0, 0.2), 3) if water_level > 90 else 0.0,
        "wind_speed_ms": round(random.uniform(1, 5), 2),
        "data_source": "simulated",
    }


async def _fetch_iot_reservoir_data() -> Optional[dict]:
    """
    Try to pull the latest water-level reading from any online IoT device
    and convert it to reservoir-scale parameters for the ML model.

    Returns enriched reservoir dict on success, or None if unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{IOT_SERVICE_URL}/api/v1/iot/devices")
            if resp.status_code != 200:
                return None

            devices = resp.json()
            if not isinstance(devices, list) or not devices:
                return None

            for device in devices:
                if not device.get("is_online", False):
                    continue

                device_id = device.get("device_id") or device.get("id")
                if not device_id:
                    continue

                dev_resp = await client.get(
                    f"{IOT_SERVICE_URL}/api/v1/iot/devices/{device_id}/latest"
                )
                if dev_resp.status_code != 200:
                    continue

                reading = dev_resp.json()
                water_level_pct = reading.get("water_level_pct")
                if water_level_pct is None:
                    continue

                # Convert field-sensor percentage to reservoir mMSL
                water_level_mmsl = round(
                    UDAWALAWE_DEAD_LEVEL_MMSL
                    + (water_level_pct / 100.0)
                    * (UDAWALAWE_FULL_LEVEL_MMSL - UDAWALAWE_DEAD_LEVEL_MMSL),
                    2,
                )
                active_storage_mcm = round(
                    max(0.0, (water_level_pct / 100.0) * UDAWALAWE_TOTAL_MCM), 2
                )

                # Blend real level with simulated weather/inflow values
                import random
                import math
                day_of_year = datetime.now().timetuple().tm_yday
                seasonal_factor = math.sin(2 * math.pi * day_of_year / 365)

                soil_moisture_pct = reading.get("soil_moisture_pct")

                data = {
                    # Real sensor values
                    "water_level_mmsl": water_level_mmsl,
                    "active_storage_mcm": active_storage_mcm,
                    "total_storage_mcm": UDAWALAWE_TOTAL_MCM,
                    # Estimated environmental parameters
                    "inflow_mcm": round(max(0, 0.5 + seasonal_factor * 0.3 + random.uniform(-0.1, 0.2)), 3),
                    "rain_mm": round(max(0, random.gauss(5, 10) if seasonal_factor > 0 else random.gauss(2, 5)), 1),
                    "main_canals_mcm": round(random.uniform(0.2, 0.8), 3),
                    "lb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
                    "rb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
                    "evap_mm": round(random.uniform(3, 8), 2),
                    "spillway_mcm": round(random.uniform(0, 0.2), 3) if water_level_mmsl > 90 else 0.0,
                    "wind_speed_ms": round(random.uniform(1, 5), 2),
                    # Metadata
                    "data_source": "iot_sensors",
                    "device_id": device_id,
                    "water_level_pct": water_level_pct,
                    "soil_moisture_pct": soil_moisture_pct,
                }
                logger.info(
                    "Using real IoT sensor data from device %s: "
                    "water_level_pct=%.1f%% → water_level_mmsl=%.2f mMSL",
                    device_id, water_level_pct, water_level_mmsl,
                )
                return data

    except Exception as exc:
        logger.warning("Could not fetch IoT sensor data (%s) – using simulated data", exc)

    return None


# ============ State Management ============

# In-memory state for demonstration (use database in production)
_current_state = {
    "manual_override_active": False,
    "manual_override_action": None,
    "manual_valve_position": None,
    "last_prediction": None,
    "last_decision": None
}


def _safe_datetime_parse(ts: Optional[str]) -> Optional[datetime]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _build_data_contract(
    *,
    source: str,
    observed_at: Optional[str],
    data_available: bool,
    stale_after_sec: int = 600,
) -> dict:
    now = datetime.utcnow()
    observed_dt = _safe_datetime_parse(observed_at)
    staleness = (now - observed_dt).total_seconds() if observed_dt else None

    if not data_available:
        status = "data_unavailable"
        quality = "unknown"
        is_live = False
    elif source == "simulated":
        status = "stale"
        quality = "unknown"
        is_live = False
    elif staleness is not None and staleness > stale_after_sec:
        status = "stale"
        quality = "stale"
        is_live = False
    else:
        status = "ok"
        quality = "good"
        is_live = True

    return {
        "status": status,
        "source": source,
        "is_live": is_live,
        "observed_at": observed_at,
        "staleness_sec": round(float(staleness), 2) if staleness is not None else None,
        "quality": quality,
        "data_available": data_available,
    }


def _persist_state() -> None:
    path = settings.water_management_state_path
    try:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(_current_state, fh)
    except Exception as exc:
        logger.warning("Failed to persist water-management state: %s", exc)


def _load_state() -> None:
    path = settings.water_management_state_path
    if not path or not os.path.exists(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
        _current_state.update(payload or {})
    except Exception as exc:
        logger.warning("Failed to load water-management state: %s", exc)


def _persist_reservoir_snapshot(data: dict) -> None:
    path = settings.reservoir_snapshot_path
    payload = dict(data)
    payload["observed_at"] = payload.get("timestamp") or datetime.utcnow().isoformat()
    try:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
    except Exception as exc:
        logger.warning("Failed to persist reservoir snapshot: %s", exc)


def _load_reservoir_snapshot() -> Optional[dict]:
    path = settings.reservoir_snapshot_path
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
        return payload
    except Exception as exc:
        logger.warning("Failed to load reservoir snapshot: %s", exc)
        return None


_load_state()


# ============ Routes ============

@router.get("/status")
async def get_water_management_status():
    """Get water management service status."""
    missing_models = []
    if water_management_model.model is None:
        missing_models.append("water_management_hgbr")
    return {
        "service": "Smart Water Management",
        "status": "running",
        "model_ready": water_management_model.is_ready,
        "model_type": "HistGradientBoostingRegressor",
        "timestamp": datetime.now().isoformat(),
        "manual_override_active": _current_state["manual_override_active"],
        "strict_live_data": settings.is_strict_live_data,
        "ml_only_mode": settings.is_ml_only_mode,
        "required_models": ["water_management_hgbr"],
        "loaded_models": [] if missing_models else ["water_management_hgbr"],
        "missing_models": missing_models,
        "dependencies": {"joblib": True, "numpy": True},
    }


@router.get("/reservoir/current", response_model=dict)
async def get_current_reservoir_data():
    """
    Get current reservoir sensor readings.

    Tries real IoT sensor data first; falls back to simulated values.
    """
    iot_data = await _fetch_iot_reservoir_data()
    if iot_data:
        iot_data["timestamp"] = datetime.now().isoformat()
        return iot_data

    data = get_simulated_reservoir_data()
    data["timestamp"] = datetime.now().isoformat()
async def predict_water_release(data: ReservoirData):
    """
    Predict next-day irrigation water release.

    Uses the trained ML model to predict the required water release
    based on current reservoir conditions and weather data.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()

    prediction = water_management_model.predict_release(data.model_dump())

    logger.info(
        f"Water release prediction: {prediction['predicted_release_mcm']:.3f} MCM "
        f"(confidence: {prediction['confidence']:.2f})"
    )

    _current_state["last_prediction"] = prediction

    return PredictionResponse(**prediction)


@router.post("/decide", response_model=DecisionResponse)
async def get_control_decision(
    data: ReservoirDataWithLags,
    thresholds: Optional[ThresholdConfig] = None
):
    """
    Get actuator control decision based on prediction and reservoir status.

    Returns a decision on whether to open/close irrigation valves
    based on the ML prediction and safety thresholds.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()

    # Check for manual override
    if _current_state["manual_override_active"]:
        return DecisionResponse(
            action=_current_state["manual_override_action"],
            valve_position=_current_state["manual_valve_position"],
            reason="Manual override active",
            priority="high"
        )

    # Get prediction first
    prediction = water_management_model.predict_release(data.model_dump())

    # Get decision with custom thresholds if provided
    threshold_params = thresholds.model_dump() if thresholds else {}
    decision = water_management_model.decide_actuation(
        predicted_release_mcm=prediction["predicted_release_mcm"],
        reservoir_level_mmsl=data.water_level_mmsl,
        **threshold_params
    )

    logger.info(
        f"Control decision: {decision['action']} (valve: {decision['valve_position']}%) - "
        f"{decision['reason']}"
    )

    _current_state["last_decision"] = decision

    return DecisionResponse(**decision)


@router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendation(data: ReservoirDataWithLags):
    """
    Get complete water management recommendation.

    Combines prediction, decision, and reservoir status assessment
    into a comprehensive recommendation for the irrigation system.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()

    recommendation = water_management_model.get_recommendation(data.model_dump())

    # Update historical data
    water_management_model.update_historical_data(data.model_dump())

    logger.info(
        f"Recommendation generated: {recommendation['decision']['action']} - "
        f"Reservoir status: {recommendation['reservoir_status']['status']}"
    )

    return RecommendationResponse(**recommendation)


@router.get("/recommend/auto", response_model=RecommendationResponse)
async def get_auto_recommendation():
    """
    Get recommendation using current sensor data.

    Tries to fetch live water-level data from the IoT service first.
    Falls back to seasonally-adjusted simulated values when IoT data
    is unavailable.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()

    # Prefer real IoT sensor data; fall back to simulated
    data = await _fetch_iot_reservoir_data()
    if data is None:
        data = get_simulated_reservoir_data()

    # Get ML recommendation
    recommendation = water_management_model.get_recommendation(data)

    # Update rolling historical window
    water_management_model.update_historical_data(data)

    # Attach data-source metadata so the frontend can show it
    recommendation["data_source"] = data.get("data_source", "simulated")

    return RecommendationResponse(**recommendation)


@router.post("/manual-override", response_model=ManualOverrideResponse)
async def set_manual_override(request: ManualOverrideRequest):
    """
    Set manual control override.

    Allows operators to manually control the irrigation system,
    bypassing ML-based decisions. Logged for audit purposes.
    """
    _current_state["manual_override_active"] = True
    _current_state["manual_override_action"] = request.action
    _current_state["manual_valve_position"] = request.valve_position

    logger.warning(
        f"MANUAL OVERRIDE: {request.action} by {request.operator_id or 'unknown'} - "
        f"Reason: {request.reason}"
    )

    return ManualOverrideResponse(
        status="success",
        action_taken=request.action,
        valve_position=request.valve_position,
        timestamp=time.time(),
        override_active=True
    )


@router.post("/manual-override/cancel", response_model=ManualOverrideResponse)
async def cancel_manual_override():
    """Cancel manual override and return to automatic control."""
    previous_action = _current_state["manual_override_action"]

    _current_state["manual_override_active"] = False
    _current_state["manual_override_action"] = None
    _current_state["manual_valve_position"] = None

    logger.info("Manual override cancelled - returning to automatic control")

    return ManualOverrideResponse(
        status="success",
        action_taken="AUTO",
        valve_position=50,  # Default position
        timestamp=time.time(),
        override_active=False
    )


@router.get("/manual-override/status")
async def get_override_status():
    """Get current manual override status."""
    return {
        "override_active": _current_state["manual_override_active"],
        "current_action": _current_state["manual_override_action"],
        "valve_position": _current_state["manual_valve_position"]
    }


@router.get("/thresholds/defaults")
async def get_default_thresholds():
    """Get default decision thresholds."""
    return {
        "release_threshold_mcm": water_management_model.DEFAULT_RELEASE_THRESHOLD_MCM,
        "min_safe_level_mmsl": water_management_model.DEFAULT_MIN_SAFE_LEVEL_MMSL,
        "max_safe_level_mmsl": water_management_model.DEFAULT_MAX_SAFE_LEVEL_MMSL
    }


@router.get("/model/info")
async def get_model_info():
    """Get information about the ML model."""
    return {
        "model_type": "HistGradientBoostingRegressor",
        "training_data": "Udawalawe Hydrological Data 1994-2025",
        "target": "Next-day main canal water release (MCM)",
        "features": [
            "Reservoir water level (mMSL)",
            "Total and active storage (MCM)",
            "Inflow and rainfall",
            "Canal releases (LB + RB)",
            "Lag features (1, 2, 3, 7 days)",
            "Rolling averages (3, 7, 14 days)",
            "Calendar features (month, day of week)"
        ],
        "metrics": water_management_model.model_metrics,
        "is_loaded": water_management_model.is_ready
    }

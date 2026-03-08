"""
Smart Water Management API Routes

Provides endpoints for:
- Water release predictions using ML model
- Reservoir status monitoring
- Actuator control decisions
- Historical data management
"""

import logging
import time
import json
import os
from datetime import datetime
from typing import Optional, List

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
    status: str = "ok"
    source: str = "observed"
    is_live: bool = True
    observed_at: Optional[str] = None
    staleness_sec: Optional[float] = None
    quality: str = "good"
    data_available: bool = True


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

def get_simulated_reservoir_data() -> dict:
    """
    Generate simulated reservoir sensor data for demonstration.
    In production, this would read from actual IoT sensors.
    """
    import random
    import math
    
    # Simulate seasonal variations
    day_of_year = datetime.now().timetuple().tm_yday
    seasonal_factor = math.sin(2 * math.pi * day_of_year / 365)  # -1 to 1
    
    # Base values with seasonal adjustment
    base_level = 85.0 + seasonal_factor * 5  # 80-90 mMSL
    base_inflow = 0.5 + seasonal_factor * 0.3  # Varies with season
    
    # Add some daily noise
    water_level = round(base_level + random.uniform(-2, 2), 2)
    inflow = round(max(0, base_inflow + random.uniform(-0.1, 0.2)), 3)
    rain = round(max(0, random.gauss(5, 10) if seasonal_factor > 0 else random.gauss(2, 5)), 1)
    
    total_storage = 268.0  # Udawalawe capacity (MCM)
    active_storage = round(total_storage * (water_level - 70) / 30, 2)  # Simplified calculation
    
    return {
        "water_level_mmsl": water_level,
        "total_storage_mcm": total_storage,
        "active_storage_mcm": max(0, active_storage),
        "inflow_mcm": inflow,
        "rain_mm": rain,
        "main_canals_mcm": round(random.uniform(0.2, 0.8), 3),
        "lb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
        "rb_main_canal_mcm": round(random.uniform(0.1, 0.4), 3),
        "evap_mm": round(random.uniform(3, 8), 2),
        "spillway_mcm": round(random.uniform(0, 0.2), 3) if water_level > 90 else 0,
        "wind_speed_ms": round(random.uniform(1, 5), 2)
    }


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
    
    Returns simulated data for demonstration.
    In production, integrates with IoT sensors.
    """
    snapshot = _load_reservoir_snapshot()
    if snapshot:
        observed_at = snapshot.get("observed_at") or snapshot.get("timestamp")
        contract = _build_data_contract(
            source="reservoir_ingest",
            observed_at=observed_at,
            data_available=True,
        )
        snapshot.update(contract)
        return snapshot

    if settings.is_strict_live_data:
        contract = _build_data_contract(
            source="unavailable",
            observed_at=None,
            data_available=False,
        )
        return {"message": "No live reservoir snapshot available", **contract}

    data = get_simulated_reservoir_data()
    now = datetime.utcnow().isoformat()
    contract = _build_data_contract(
        source="simulated",
        observed_at=now,
        data_available=True,
    )
    return {
        **data,
        "timestamp": now,
        **contract,
    }


@router.post("/reservoir/ingest")
async def ingest_reservoir_data(data: ReservoirData):
    """Persist latest observed reservoir snapshot for live recommendation flow."""
    payload = data.model_dump()
    payload["timestamp"] = datetime.utcnow().isoformat()
    _persist_reservoir_snapshot(payload)
    contract = _build_data_contract(
        source="reservoir_ingest",
        observed_at=payload["timestamp"],
        data_available=True,
    )
    return {"status": "ok", "message": "Reservoir snapshot ingested", **contract}


@router.post("/predict", response_model=PredictionResponse)
async def predict_water_release(data: ReservoirDataWithLags):
    """
    Predict next-day irrigation water release.
    
    Uses the trained ML model to predict the required water release
    based on current reservoir conditions and weather data.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()
    
    try:
        prediction = water_management_model.predict_release(data.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=_ml_only_unavailable_detail(str(exc)),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=_ml_only_unavailable_detail(
                str(exc),
                missing_models=["water_management_hgbr"] if water_management_model.model is None else [],
            ),
        )
    
    logger.info(
        f"Water release prediction: {prediction['predicted_release_mcm']:.3f} MCM "
        f"(confidence: {prediction['confidence']:.2f})"
    )
    
    _current_state["last_prediction"] = prediction
    _persist_state()
    
    contract = _build_data_contract(
        source="observed",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
    )
    return PredictionResponse(**prediction, **contract)


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
    try:
        prediction = water_management_model.predict_release(data.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=_ml_only_unavailable_detail(str(exc)),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=_ml_only_unavailable_detail(
                str(exc),
                missing_models=["water_management_hgbr"] if water_management_model.model is None else [],
            ),
        )
    
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
    _persist_state()
    
    contract = _build_data_contract(
        source="observed",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
    )
    return DecisionResponse(**decision, **contract)


@router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendation(data: ReservoirDataWithLags):
    """
    Get complete water management recommendation.
    
    Combines prediction, decision, and reservoir status assessment
    into a comprehensive recommendation for the irrigation system.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()
    
    try:
        recommendation = water_management_model.get_recommendation(data.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=_ml_only_unavailable_detail(str(exc)),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=_ml_only_unavailable_detail(
                str(exc),
                missing_models=["water_management_hgbr"] if water_management_model.model is None else [],
            ),
        )
    
    # Update historical data
    water_management_model.update_historical_data(data.model_dump())
    
    logger.info(
        f"Recommendation generated: {recommendation['decision']['action']} - "
        f"Reservoir status: {recommendation['reservoir_status']['status']}"
    )
    
    contract = _build_data_contract(
        source="observed",
        observed_at=datetime.utcnow().isoformat(),
        data_available=True,
    )
    recommendation.update(contract)
    recommendation["prediction"] = {**recommendation.get("prediction", {}), **contract}
    recommendation["decision"] = {**recommendation.get("decision", {}), **contract}
    return RecommendationResponse(**recommendation)


@router.get("/recommend/auto", response_model=RecommendationResponse)
async def get_auto_recommendation():
    """
    Get recommendation using current (simulated) sensor data.
    
    Automatically fetches current sensor readings and generates
    a recommendation. Useful for dashboard integration.
    """
    if not water_management_model.is_ready:
        water_management_model.load_model()
    
    snapshot = _load_reservoir_snapshot()
    contract: dict
    if snapshot:
        data = {
            "water_level_mmsl": snapshot.get("water_level_mmsl"),
            "total_storage_mcm": snapshot.get("total_storage_mcm"),
            "active_storage_mcm": snapshot.get("active_storage_mcm"),
            "inflow_mcm": snapshot.get("inflow_mcm", 0.0),
            "rain_mm": snapshot.get("rain_mm", 0.0),
            "main_canals_mcm": snapshot.get("main_canals_mcm", 0.0),
            "lb_main_canal_mcm": snapshot.get("lb_main_canal_mcm", 0.0),
            "rb_main_canal_mcm": snapshot.get("rb_main_canal_mcm", 0.0),
            "evap_mm": snapshot.get("evap_mm"),
            "spillway_mcm": snapshot.get("spillway_mcm"),
            "wind_speed_ms": snapshot.get("wind_speed_ms"),
        }
        observed_at = snapshot.get("observed_at") or snapshot.get("timestamp")
        contract = _build_data_contract(
            source="reservoir_ingest",
            observed_at=observed_at,
            data_available=True,
        )
    elif settings.is_strict_live_data:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "No live reservoir data available",
                **_build_data_contract(
                    source="unavailable",
                    observed_at=None,
                    data_available=False,
                ),
            },
        )
    else:
        if settings.is_ml_only_mode:
            raise HTTPException(
                status_code=503,
                detail=_ml_only_unavailable_detail(
                    "ML-only mode requires live reservoir ingest data; simulated source is disabled.",
                    missing_models=["water_management_hgbr"] if water_management_model.model is None else [],
                    missing_features=["reservoir_snapshot"],
                ),
            )
        data = get_simulated_reservoir_data()
        contract = _build_data_contract(
            source="simulated",
            observed_at=datetime.utcnow().isoformat(),
            data_available=True,
        )
    
    # Get recommendation
    try:
        recommendation = water_management_model.get_recommendation(data)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=_ml_only_unavailable_detail(str(exc)),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=_ml_only_unavailable_detail(
                str(exc),
                missing_models=["water_management_hgbr"] if water_management_model.model is None else [],
            ),
        )
    
    # Update historical data
    water_management_model.update_historical_data(data)
    
    recommendation.update(contract)
    recommendation["prediction"] = {**recommendation.get("prediction", {}), **contract}
    recommendation["decision"] = {**recommendation.get("decision", {}), **contract}
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
    _persist_state()
    
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
    _persist_state()
    
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

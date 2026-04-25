"""
Crop Field Management API Routes

Provides endpoints for:
- Crop field configuration (water level, soil moisture thresholds)
- IoT sensor data integration
- Auto valve control based on sensor readings
- Rice field specific defaults
"""

import logging
import os
import math
import random
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import requests

from app.core.config import settings

try:
    import paho.mqtt.client as mqtt
except Exception:  # pragma: no cover - optional at runtime
    mqtt = None

IOT_SERVICE_URL = os.getenv("IOT_SERVICE_URL", "http://localhost:8006")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crop-fields", tags=["Crop Fields"])


# ============ Crop Configuration Defaults ============

CROP_DEFAULTS = {
    "rice": {
        "name": "Rice (Paddy)",
        "description": "Wetland rice cultivation - requires standing water",
        # Water level thresholds (percentage of field capacity)
        "water_level_min_pct": 50,      # Minimum water level before valve opens
        "water_level_max_pct": 80,      # Maximum water level - valve closes
        "water_level_optimal_pct": 65,  # Optimal water level for growth
        "water_level_critical_pct": 30, # Critical low - emergency irrigation
        # Soil moisture thresholds (percentage)
        "soil_moisture_min_pct": 70,    # Minimum soil moisture
        "soil_moisture_max_pct": 95,    # Maximum (saturated)
        "soil_moisture_optimal_pct": 85,
        "soil_moisture_critical_pct": 50,
        # Irrigation parameters
        "irrigation_duration_minutes": 30,  # Default irrigation duration
        "check_interval_seconds": 60,       # Sensor check interval
        "valve_response_delay_seconds": 5,  # Delay before valve action
    },
    "wheat": {
        "name": "Wheat",
        "description": "Dryland crop - moderate water needs",
        "water_level_min_pct": 20,
        "water_level_max_pct": 50,
        "water_level_optimal_pct": 35,
        "water_level_critical_pct": 10,
        "soil_moisture_min_pct": 40,
        "soil_moisture_max_pct": 70,
        "soil_moisture_optimal_pct": 55,
        "soil_moisture_critical_pct": 25,
        "irrigation_duration_minutes": 20,
        "check_interval_seconds": 120,
        "valve_response_delay_seconds": 5,
    },
    "vegetables": {
        "name": "Vegetables",
        "description": "Mixed vegetable crops - regular watering",
        "water_level_min_pct": 25,
        "water_level_max_pct": 55,
        "water_level_optimal_pct": 40,
        "water_level_critical_pct": 15,
        "soil_moisture_min_pct": 50,
        "soil_moisture_max_pct": 80,
        "soil_moisture_optimal_pct": 65,
        "soil_moisture_critical_pct": 35,
        "irrigation_duration_minutes": 15,
        "check_interval_seconds": 90,
        "valve_response_delay_seconds": 5,
    },
    "sugarcane": {
        "name": "Sugarcane",
        "description": "High water requirement crop",
        "water_level_min_pct": 40,
        "water_level_max_pct": 70,
        "water_level_optimal_pct": 55,
        "water_level_critical_pct": 25,
        "soil_moisture_min_pct": 60,
        "soil_moisture_max_pct": 90,
        "soil_moisture_optimal_pct": 75,
        "soil_moisture_critical_pct": 40,
        "irrigation_duration_minutes": 45,
        "check_interval_seconds": 60,
        "valve_response_delay_seconds": 5,
    },
}


# ============ Request/Response Schemas ============

class CropFieldConfig(BaseModel):
    """Crop field configuration with thresholds."""
    field_id: str = Field(..., description="Unique field identifier")
    field_name: str = Field(..., description="Human-readable field name")
    crop_type: str = Field(..., description="Type of crop (rice, wheat, vegetables, etc.)")
    area_hectares: float = Field(1.0, ge=0.1, description="Field area in hectares")
    device_id: Optional[str] = Field(None, description="IoT device ID for this field")

    # Water level thresholds
    water_level_min_pct: float = Field(..., ge=0, le=100)
    water_level_max_pct: float = Field(..., ge=0, le=100)
    water_level_optimal_pct: float = Field(..., ge=0, le=100)
    water_level_critical_pct: float = Field(..., ge=0, le=100)

    # Soil moisture thresholds
    soil_moisture_min_pct: float = Field(..., ge=0, le=100)
    soil_moisture_max_pct: float = Field(..., ge=0, le=100)
    soil_moisture_optimal_pct: float = Field(..., ge=0, le=100)
    soil_moisture_critical_pct: float = Field(..., ge=0, le=100)

    # Irrigation parameters
    irrigation_duration_minutes: int = Field(30, ge=1, le=120)
    auto_control_enabled: bool = Field(True, description="Enable automatic valve control")


class CropFieldStatus(BaseModel):
    """Current status of a crop field with sensor data."""
    field_id: str
    field_name: str
    crop_type: str
    device_id: Optional[str]

    # Sensor connection status
    sensor_connected: bool = Field(False, description="Whether IoT sensor is connected and sending data")
    is_simulated: bool = Field(True, description="Whether data is simulated or from real IoT device")
    last_real_data_time: Optional[str] = Field(None, description="Last time real sensor data was received")

    # Current sensor readings
    current_water_level_pct: float
    current_soil_moisture_pct: float

    # Valve status
    valve_status: str  # "OPEN", "CLOSED", "OPENING", "CLOSING"
    valve_position_pct: int

    # Status assessment
    water_status: str  # "CRITICAL", "LOW", "OPTIMAL", "HIGH", "EXCESS"
    soil_status: str   # "CRITICAL", "DRY", "OPTIMAL", "WET", "SATURATED"
    overall_status: str  # "OK", "WARNING", "CRITICAL", "IRRIGATING", "NO_SENSOR"

    # Timestamps
    last_sensor_reading: str
    last_valve_action: Optional[str]

    # Auto control
    auto_control_enabled: bool
    next_action: Optional[str]

    # Data provenance
    status: str = Field(default="ok", description="ok|stale|data_unavailable|source_unavailable")
    source: str = Field(default="iot_sensors", description="Data source identifier")
    is_live: bool = Field(default=True, description="Whether payload came from live observed data")
    observed_at: Optional[str] = Field(default=None, description="Timestamp of source observation")
    staleness_sec: Optional[float] = Field(default=None, description="Seconds since source observation")
    quality: str = Field(default="good", description="good|stale|unknown")
    data_available: bool = Field(default=True, description="Whether source data was available")


class IoTSensorData(BaseModel):
    """IoT sensor data from field devices."""
    device_id: str
    timestamp: str
    soil_moisture_pct: float = Field(..., ge=0, le=100)
    water_level_pct: float = Field(..., ge=0, le=100)
    soil_ao: Optional[int] = Field(None, ge=0, le=4095)
    water_ao: Optional[int] = Field(None, ge=0, le=4095)
    rssi: Optional[int] = None
    battery_v: Optional[float] = None


class ValveControlRequest(BaseModel):
    """Request to control field valve."""
    action: str = Field(..., pattern="^(OPEN|CLOSE|AUTO)$")
    position_pct: int = Field(100, ge=0, le=100)
    reason: str = Field("Manual control", description="Reason for valve action")


class ValveControlResponse(BaseModel):
    """Response from valve control action."""
    field_id: str
    action_taken: str
    valve_position_pct: int
    timestamp: str
    status: str
    message: str


class AutoControlDecision(BaseModel):
    """Automatic valve control decision based on sensor data."""
    field_id: str
    timestamp: str

    # Sensor inputs
    water_level_pct: float
    soil_moisture_pct: float

    # Thresholds used
    water_level_min: float
    water_level_max: float
    soil_moisture_min: float
    soil_moisture_max: float

    # Decision
    action: str  # "OPEN", "CLOSE", "HOLD"
    valve_position_pct: int
    reason: str
    priority: str  # "low", "medium", "high", "critical"

    # ML model inputs (if applicable)
    ml_prediction: Optional[Dict[str, Any]] = None

    # Data provenance
    status: str = Field(default="ok", description="ok|stale|data_unavailable|source_unavailable")
    source: str = Field(default="iot_sensors", description="Data source identifier")
    is_live: bool = Field(default=True, description="Whether payload came from live observed data")
    observed_at: Optional[str] = Field(default=None, description="Timestamp of source observation")
    staleness_sec: Optional[float] = Field(default=None, description="Seconds since source observation")
    quality: str = Field(default="good", description="good|stale|unknown")
    data_available: bool = Field(default=True, description="Whether source data was available")


# ============ In-Memory State (Use database in production) ============

_crop_fields: Dict[str, CropFieldConfig] = {}
_field_status: Dict[str, dict] = {}
_valve_states: Dict[str, dict] = {}
_sensor_history: Dict[str, List[dict]] = {}
_last_real_sensor_data: Dict[str, dict] = {}  # Stores last real IoT sensor data per field
_sensor_connection_timeout_seconds: int = 120  # Consider sensor disconnected after this time


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
) -> Dict[str, Any]:
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
    elif staleness is not None and staleness > _sensor_connection_timeout_seconds:
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
    """Persist mutable runtime state so service restarts do not lose control context."""
    payload = {
        "crop_fields": {k: v.model_dump() for k, v in _crop_fields.items()},
        "field_status": _field_status,
        "valve_states": _valve_states,
        "sensor_history": _sensor_history,
        "last_real_sensor_data": _last_real_sensor_data,
    }
    try:
        path = settings.crop_fields_state_path
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
    except Exception as exc:
        logger.warning("Failed to persist crop field state: %s", exc)


def _load_state() -> bool:
    """Load persisted runtime state if available."""
    path = settings.crop_fields_state_path
    if not path or not os.path.exists(path):
        return False
    try:
        with open(path, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
        _crop_fields.clear()
        for field_id, cfg in (payload.get("crop_fields") or {}).items():
            _crop_fields[field_id] = CropFieldConfig(**cfg)
        _field_status.clear()
        _field_status.update(payload.get("field_status") or {})
        _valve_states.clear()
        _valve_states.update(payload.get("valve_states") or {})
        _sensor_history.clear()
        _sensor_history.update(payload.get("sensor_history") or {})
        _last_real_sensor_data.clear()
        _last_real_sensor_data.update(payload.get("last_real_sensor_data") or {})
        return True
    except Exception as exc:
        logger.warning("Failed to load crop field state: %s", exc)
        return False


def _emit_event(event_name: str, payload: Dict[str, Any]) -> None:
    """Emit versioned events to MQTT for observability."""
    if mqtt is None:
        return
    client = mqtt.Client(client_id=f"irrigation-service-{event_name}")
    try:
        client.connect(settings.mqtt_broker, settings.mqtt_port, keepalive=10)
        envelope = {
            "event": event_name,
            "occurred_at": datetime.utcnow().isoformat(),
            **payload,
        }
        client.publish(f"events/{event_name}", json.dumps(envelope), qos=1)
    except Exception as exc:
        logger.debug(f"Skipping event publish {event_name}: {exc}")
    finally:
        try:
            client.disconnect()
        except Exception:
            pass


def _fetch_forecast_adjustment() -> Dict[str, Any]:
    """
    Pull short-horizon weather adjustment from F3.
    Returns adjustment as percent where 100 means no change.
    """
    default_payload = {
        "adjustment_pct": None if settings.is_ml_only_mode else 100.0,
        "overall_recommendation": "NORMAL",
        "net_water_balance_mm": 0.0,
        "alert": None,
        "data_available": False,
    }
    try:
        response = requests.get(
            f"{settings.forecasting_service_url}/api/weather/irrigation-recommendation",
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()
        weekly = payload.get("weekly_outlook", {})
        adjustment = float(weekly.get("average_irrigation_adjustment_percent") or 100.0)
        recommendation = payload.get("overall_recommendation", "NORMAL")
        net_balance = float(weekly.get("net_water_balance_mm") or 0.0)
        alert = None
        if adjustment >= 125:
            alert = "Increase irrigation demand expected"
        elif adjustment <= 75:
            alert = "Rainfall surplus expected; reduce irrigation"
        return {
            "adjustment_pct": adjustment,
            "overall_recommendation": recommendation,
            "net_water_balance_mm": net_balance,
            "alert": alert,
            "data_available": True,
        }
    except Exception as exc:
        logger.debug(f"Forecast adjustment unavailable: {exc}")
        return default_payload


def _fetch_stress_summary(field_id: str) -> Dict[str, Any]:
    """Pull field stress priority from F2."""
    default_payload = {
        "stress_index": None if settings.is_ml_only_mode else 0.2,
        "priority": "unknown" if settings.is_ml_only_mode else "low",
        "stress_penalty_factor": None if settings.is_ml_only_mode else 0.05,
        "data_available": False,
    }
    try:
        response = requests.get(
            f"{settings.crop_health_service_url}/api/v1/crop-health/fields/{field_id}/stress-summary",
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()
        return {
            "stress_index": float(payload.get("stress_index") or 0.0),
            "priority": str(payload.get("priority") or "low"),
            "stress_penalty_factor": float(payload.get("stress_penalty_factor") or 0.0),
            "data_available": bool(payload.get("data_available", True)),
        }
    except Exception as exc:
        logger.debug(f"Stress summary unavailable for {field_id}: {exc}")
        return default_payload


def _initialize_default_rice_field():
    """Initialize a default rice field for demonstration."""
    rice_defaults = CROP_DEFAULTS["rice"]
    default_field = CropFieldConfig(
        field_id="field-rice-01",
        field_name="Rice Paddy Field A1",
        crop_type="rice",
        area_hectares=2.5,
        device_id="esp32-01",
        water_level_min_pct=rice_defaults["water_level_min_pct"],
        water_level_max_pct=rice_defaults["water_level_max_pct"],
        water_level_optimal_pct=rice_defaults["water_level_optimal_pct"],
        water_level_critical_pct=rice_defaults["water_level_critical_pct"],
        soil_moisture_min_pct=rice_defaults["soil_moisture_min_pct"],
        soil_moisture_max_pct=rice_defaults["soil_moisture_max_pct"],
        soil_moisture_optimal_pct=rice_defaults["soil_moisture_optimal_pct"],
        soil_moisture_critical_pct=rice_defaults["soil_moisture_critical_pct"],
        irrigation_duration_minutes=rice_defaults["irrigation_duration_minutes"],
        auto_control_enabled=True,
    )
    _crop_fields[default_field.field_id] = default_field
    _valve_states[default_field.field_id] = {
        "status": "CLOSED",
        "position_pct": 0,
        "last_action": None,
        "last_action_time": None,
    }


# Initialize persisted/default state
if not _load_state():
    _initialize_default_rice_field()
    _persist_state()


# ============ Helper Functions ============

async def ensure_default_field_seed() -> None:
    """Compatibility hook used by app startup to guarantee at least one field."""
    if _crop_fields:
        return
    _initialize_default_rice_field()
    _persist_state()

async def _fetch_iot_sensor_data(device_id: str) -> Optional[IoTSensorData]:
    """
    Fetch the latest real sensor reading from the IoT service for a given device.
    Returns None if device not found or IoT service is unavailable.
    """
    try:
        url = f"{IOT_SERVICE_URL}/api/v1/iot/devices/{device_id}/latest"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            logger.info(f"IoT pull OK for {device_id}: ts={data.get('timestamp')}, soil={data.get('soil_moisture_pct')}, water={data.get('water_level_pct')}")
            return IoTSensorData(
                device_id=data["device_id"],
                timestamp=data["timestamp"],
                soil_moisture_pct=float(data["soil_moisture_pct"]),
                water_level_pct=float(data["water_level_pct"]),
                soil_ao=data.get("soil_ao"),
                water_ao=data.get("water_ao"),
                rssi=data.get("rssi"),
                battery_v=data.get("battery_v"),
            )
        logger.warning(f"IoT service returned {resp.status_code} for {device_id}")
        return None
    except Exception as e:
        logger.warning(f"IoT service unavailable for device {device_id}: {e}")
        return None


def _get_simulated_sensor_data(field_id: str, config: CropFieldConfig) -> IoTSensorData:
    """Generate simulated sensor data for testing."""
    # Get valve state to simulate water level changes
    valve_state = _valve_states.get(field_id, {"status": "CLOSED", "position_pct": 0})

    # Base values with some randomness
    base_water = 60 if valve_state["status"] == "OPEN" else 45
    base_soil = 75 if valve_state["status"] == "OPEN" else 60

    # Add time-based variation
    hour = datetime.now().hour
    time_factor = math.sin(2 * math.pi * hour / 24) * 5

    water_level = round(max(0, min(100, base_water + time_factor + random.uniform(-5, 5))), 1)
    soil_moisture = round(max(0, min(100, base_soil + time_factor + random.uniform(-3, 3))), 1)

    return IoTSensorData(
        device_id=config.device_id or f"sim-{field_id}",
        timestamp=datetime.now().isoformat(),
        soil_moisture_pct=soil_moisture,
        water_level_pct=water_level,
        soil_ao=int((100 - soil_moisture) * 40.95),  # Inverse relationship
        water_ao=int((100 - water_level) * 40.95),
        rssi=-45,
        battery_v=3.7,
    )


def _assess_water_status(water_level: float, config: CropFieldConfig) -> str:
    """Assess water level status based on thresholds."""
    if water_level <= config.water_level_critical_pct:
        return "CRITICAL"
    elif water_level < config.water_level_min_pct:
        return "LOW"
    elif water_level <= config.water_level_optimal_pct + 5:
        return "OPTIMAL"
    elif water_level <= config.water_level_max_pct:
        return "HIGH"
    else:
        return "EXCESS"


def _assess_soil_status(soil_moisture: float, config: CropFieldConfig) -> str:
    """Assess soil moisture status based on thresholds."""
    if soil_moisture <= config.soil_moisture_critical_pct:
        return "CRITICAL"
    elif soil_moisture < config.soil_moisture_min_pct:
        return "DRY"
    elif soil_moisture <= config.soil_moisture_optimal_pct + 5:
        return "OPTIMAL"
    elif soil_moisture <= config.soil_moisture_max_pct:
        return "WET"
    else:
        return "SATURATED"


def _make_auto_control_decision(
    field_id: str,
    config: CropFieldConfig,
    sensor_data: IoTSensorData
) -> AutoControlDecision:
    """
    Make automatic valve control decision based on sensor data and thresholds.

    Logic for Rice fields:
    1. OPEN valve if water level is below minimum threshold
    2. CLOSE valve if water level reaches maximum threshold
    3. HOLD if water level is within acceptable range
    4. Consider soil moisture as secondary factor
    """
    water_level = sensor_data.water_level_pct
    soil_moisture = sensor_data.soil_moisture_pct

    # Critical condition - immediate action needed
    if water_level <= config.water_level_critical_pct:
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=effective_water_min,
            water_level_max=effective_water_max,
            soil_moisture_min=effective_soil_min,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=100,
            reason=f"CRITICAL: Water level ({water_level}%) below critical threshold ({config.water_level_critical_pct}%)",
            priority="critical",
            ml_prediction={
                "forecast_adjustment_pct": adjustment_pct,
                "stress_index": stress_index,
                "stress_priority": stress_priority,
            },
        )

    # Water level below minimum - need irrigation
    if water_level < effective_water_min:
        valve_position = min(100, int((effective_water_min - water_level) * 5))
        if stress_priority in {"high", "critical"}:
            valve_position = min(100, valve_position + 20)
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=effective_water_min,
            water_level_max=effective_water_max,
            soil_moisture_min=effective_soil_min,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=valve_position,
            reason=(
                f"Water level ({water_level}%) below effective minimum "
                f"({effective_water_min:.1f}%) after forecast/stress adjustment"
            ),
            priority="critical" if stress_priority in {"high", "critical"} else "high",
            ml_prediction={
                "forecast_adjustment_pct": adjustment_pct,
                "stress_index": stress_index,
                "stress_priority": stress_priority,
            },
        )

    # Water level at or above maximum - close valve
    if water_level >= effective_water_max:
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=effective_water_min,
            water_level_max=effective_water_max,
            soil_moisture_min=effective_soil_min,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="CLOSE",
            valve_position_pct=0,
            reason=f"Water level ({water_level}%) reached effective maximum ({effective_water_max:.1f}%)",
            priority="medium",
            ml_prediction={
                "forecast_adjustment_pct": adjustment_pct,
                "stress_index": stress_index,
                "stress_priority": stress_priority,
            },
        )

    # Check soil moisture as secondary factor
    if soil_moisture < effective_soil_min and water_level < config.water_level_optimal_pct:
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=effective_water_min,
            water_level_max=effective_water_max,
            soil_moisture_min=effective_soil_min,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=65 if stress_priority in {"high", "critical"} else 50,
            reason=f"Soil moisture ({soil_moisture}%) below effective minimum ({effective_soil_min:.1f}%)",
            priority="high" if stress_priority in {"high", "critical"} else "medium",
            ml_prediction={
                "forecast_adjustment_pct": adjustment_pct,
                "stress_index": stress_index,
                "stress_priority": stress_priority,
            },
        )

    # Normal operation - maintain current state
    current_valve = _valve_states.get(field_id, {"status": "CLOSED"})
    return AutoControlDecision(
        field_id=field_id,
        timestamp=datetime.now().isoformat(),
        water_level_pct=water_level,
        soil_moisture_pct=soil_moisture,
        water_level_min=effective_water_min,
        water_level_max=effective_water_max,
        soil_moisture_min=effective_soil_min,
        soil_moisture_max=config.soil_moisture_max_pct,
        action="HOLD",
        valve_position_pct=current_valve.get("position_pct", 0),
        reason=f"Water level ({water_level}%) and soil moisture ({soil_moisture}%) within acceptable range",
        priority="low",
        ml_prediction={
            "forecast_adjustment_pct": adjustment_pct,
            "stress_index": stress_index,
            "stress_priority": stress_priority,
        },
    )


# ============ API Routes ============

@router.get("/crops/defaults")
async def get_crop_defaults():
    """Get default configuration values for all supported crop types."""
    return {
        "crops": CROP_DEFAULTS,
        "supported_crops": list(CROP_DEFAULTS.keys()),
    }


@router.get("/crops/defaults/{crop_type}")
async def get_crop_default(crop_type: str):
    """Get default configuration for a specific crop type."""
    if crop_type not in CROP_DEFAULTS:
        raise HTTPException(
            status_code=404,
            detail=f"Crop type '{crop_type}' not found. Supported: {list(CROP_DEFAULTS.keys())}"
        )
    return CROP_DEFAULTS[crop_type]


@router.get("/fields", response_model=List[CropFieldConfig])
async def list_fields():
    """List all configured crop fields."""
    return list(_crop_fields.values())


@router.post("/fields", response_model=CropFieldConfig)
async def create_field(config: CropFieldConfig):
    """Create a new crop field configuration."""
    if config.field_id in _crop_fields:
        raise HTTPException(
            status_code=409,
            detail=f"Field '{config.field_id}' already exists"
        )

    _crop_fields[config.field_id] = config
    _valve_states[config.field_id] = {
        "status": "CLOSED",
        "position_pct": 0,
        "last_action": None,
        "last_action_time": None,
    }

    logger.info(f"Created crop field: {config.field_id} ({config.crop_type})")
    return config


@router.get("/fields/{field_id}", response_model=CropFieldConfig)
async def get_field(field_id: str):
    """Get configuration for a specific field."""
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")
    return _crop_fields[field_id]


@router.get("/devices/{device_id}/resolve")
async def resolve_device_to_field(device_id: str):
    """
    Resolve IoT device to field mapping for IoT->F1 bridge.
    """
    for field in _crop_fields.values():
        if field.device_id == device_id:
            return {
                "device_id": device_id,
                "field_id": field.field_id,
                "field_name": field.field_name,
            }
    raise HTTPException(status_code=404, detail=f"No field mapped for device '{device_id}'")


@router.put("/fields/{field_id}", response_model=CropFieldConfig)
async def update_field(field_id: str, config: CropFieldConfig):
    """Update crop field configuration."""
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    config.field_id = field_id  # Ensure field_id matches
    _crop_fields[field_id] = config

    logger.info(f"Updated crop field: {field_id}")
    return config


@router.delete("/fields/{field_id}")
async def delete_field(field_id: str):
    """Delete a crop field configuration."""
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    del _crop_fields[field_id]
    _valve_states.pop(field_id, None)
    _sensor_history.pop(field_id, None)

    logger.info(f"Deleted crop field: {field_id}")
    return {"status": "deleted", "field_id": field_id}


@router.get("/fields/{field_id}/status", response_model=CropFieldStatus)
async def get_field_status(field_id: str, use_simulated: bool = False):
    """
    Get current status of a crop field including sensor data and valve state.

    When the field has a device_id the endpoint first tries to fetch the latest
    reading directly from the IoT service.  If the reading is fresh (within the
    connection-timeout window) it is used as live data; otherwise the cached push
    data (from POST /sensor-data) is tried, and finally simulated data is used as
    a fallback (unless use_simulated=False).
    """
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    config = _crop_fields[field_id]
    valve_state = _valve_states.get(field_id, {"status": "CLOSED", "position_pct": 0})

    sensor_connected = False
    is_simulated = True
    last_real_data_time = None
    sensor_data = None

    # 1. Try to fetch fresh data directly from the IoT service
    if config.device_id:
        iot_reading = await _fetch_iot_sensor_data(config.device_id)
        if iot_reading is not None:
            try:
                last_time = datetime.fromisoformat(iot_reading.timestamp.replace("Z", "+00:00"))
                # IoT service stores UTC timestamps; compare against UTC now
                time_diff = (datetime.utcnow() - last_time.replace(tzinfo=None)).total_seconds()
                if abs(time_diff) <= _sensor_connection_timeout_seconds:
                    sensor_connected = True
                    is_simulated = False
                    sensor_data = iot_reading
                    last_real_data_time = iot_reading.timestamp
                    # Also update the push-cache so history is consistent
                    _last_real_sensor_data[field_id] = iot_reading.model_dump()
                    logger.info(
                        f"Live IoT data for {field_id} from device {config.device_id}: "
                        f"water={iot_reading.water_level_pct}%, soil={iot_reading.soil_moisture_pct}%"
                    )
            except Exception as e:
                logger.warning(f"Could not parse IoT timestamp for {config.device_id}: {e}")

    # 2. Fall back to push-received cache if IoT service didn't return fresh data
    if not sensor_connected and field_id in _last_real_sensor_data:
        real_data = _last_real_sensor_data[field_id]
        last_real_data_time = real_data.get("timestamp")
        if last_real_data_time:
            try:
                last_time = datetime.fromisoformat(last_real_data_time.replace("Z", "+00:00"))
                time_diff = (datetime.utcnow() - last_time.replace(tzinfo=None)).total_seconds()
                if abs(time_diff) <= _sensor_connection_timeout_seconds:
                    sensor_connected = True
                    is_simulated = False
                    sensor_data = IoTSensorData(**real_data)
            except Exception as e:
                logger.warning(f"Error parsing cached sensor timestamp: {e}")

    # 3. If no valid real data and simulation not requested, return "no sensor" status
    if not sensor_connected and not use_simulated:
        return CropFieldStatus(
            field_id=field_id,
            field_name=config.field_name,
            crop_type=config.crop_type,
            device_id=config.device_id,
            sensor_connected=False,
            is_simulated=False,
            last_real_data_time=last_real_data_time,
            current_water_level_pct=0,
            current_soil_moisture_pct=0,
            valve_status=valve_state["status"],
            valve_position_pct=valve_state["position_pct"],
            water_status="UNKNOWN",
            soil_status="UNKNOWN",
            overall_status="NO_SENSOR",
            last_sensor_reading=datetime.now().isoformat(),
            last_valve_action=valve_state.get("last_action_time"),
            auto_control_enabled=config.auto_control_enabled,
            next_action="Waiting for sensor data...",
            **contract,
        )

    # Get sensor data (real, simulated based on request)
    if not sensor_data:
        sensor_data = _get_simulated_sensor_data(field_id, config)
        is_simulated = True

    # Store in history
    if field_id not in _sensor_history:
        _sensor_history[field_id] = []
    _sensor_history[field_id].append(sensor_data.model_dump())
    if len(_sensor_history[field_id]) > 100:
        _sensor_history[field_id] = _sensor_history[field_id][-100:]

    # Assess status
    water_status = _assess_water_status(sensor_data.water_level_pct, config)
    soil_status = _assess_soil_status(sensor_data.soil_moisture_pct, config)

    # Determine overall status
    if not sensor_connected and not effective_use_simulated:
        overall_status = "NO_SENSOR"
    elif water_status == "CRITICAL" or soil_status == "CRITICAL":
        overall_status = "CRITICAL"
    elif valve_state["status"] == "OPEN":
        overall_status = "IRRIGATING"
    elif water_status in ["LOW", "HIGH"] or soil_status in ["DRY", "WET"]:
        overall_status = "WARNING"
    else:
        overall_status = "OK"

    # Get next action recommendation
    decision = _make_auto_control_decision(field_id, config, sensor_data)
    next_action = f"{decision.action} (valve {decision.valve_position_pct}%)" if decision.action != "HOLD" else None

    return CropFieldStatus(
        field_id=field_id,
        field_name=config.field_name,
        crop_type=config.crop_type,
        device_id=config.device_id,
        sensor_connected=sensor_connected,
        is_simulated=is_simulated,
        last_real_data_time=last_real_data_time,
        current_water_level_pct=sensor_data.water_level_pct,
        current_soil_moisture_pct=sensor_data.soil_moisture_pct,
        valve_status=valve_state["status"],
        valve_position_pct=valve_state["position_pct"],
        water_status=water_status,
        soil_status=soil_status,
        overall_status=overall_status,
        last_sensor_reading=sensor_data.timestamp,
        last_valve_action=valve_state.get("last_action_time"),
        auto_control_enabled=config.auto_control_enabled,
        next_action=next_action,
        **contract,
    )


@router.post("/fields/{field_id}/sensor-data")
async def receive_sensor_data(field_id: str, data: IoTSensorData):
    """
    Receive IoT sensor data from field device.

    This endpoint is called by the IoT gateway when new sensor data arrives.
    It processes the data and triggers auto control if enabled.
    """
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    config = _crop_fields[field_id]

    # Store as last real sensor data for this field
    _last_real_sensor_data[field_id] = data.model_dump()
    logger.info(f"Received real sensor data for {field_id}: water={data.water_level_pct}%, soil={data.soil_moisture_pct}%")

    # Store sensor data in history
    if field_id not in _sensor_history:
        _sensor_history[field_id] = []
    _sensor_history[field_id].append(data.model_dump())
    if len(_sensor_history[field_id]) > 100:
        _sensor_history[field_id] = _sensor_history[field_id][-100:]

    # Auto control if enabled
    result = {"data_received": True, "auto_control_triggered": False, "sensor_connected": True}

    if config.auto_control_enabled:
        decision = _make_auto_control_decision(field_id, config, data)

        # Execute decision if action needed
        if decision.action != "HOLD":
            valve_state = _valve_states.get(field_id, {})
            valve_state["status"] = "OPEN" if decision.action == "OPEN" else "CLOSED"
            valve_state["position_pct"] = decision.valve_position_pct
            valve_state["last_action"] = decision.action
            valve_state["last_action_time"] = datetime.now().isoformat()
            _valve_states[field_id] = valve_state

            result["auto_control_triggered"] = True
            result["decision"] = decision.model_dump()

            logger.info(
                f"Auto control for {field_id}: {decision.action} "
                f"(water: {data.water_level_pct}%, soil: {data.soil_moisture_pct}%)"
            )

    return result


@router.post("/fields/{field_id}/valve", response_model=ValveControlResponse)
async def control_valve(field_id: str, request: ValveControlRequest):
    """
    Manually control the field valve or switch to auto mode.

    Actions:
    - OPEN: Open valve to specified position
    - CLOSE: Close valve completely
    - AUTO: Enable automatic control based on sensors
    """
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    config = _crop_fields[field_id]
    valve_state = _valve_states.get(field_id, {})

    if request.action == "AUTO":
        # Enable auto control
        config.auto_control_enabled = True
        _crop_fields[field_id] = config

        return ValveControlResponse(
            field_id=field_id,
            action_taken="AUTO_ENABLED",
            valve_position_pct=valve_state.get("position_pct", 0),
            timestamp=datetime.now().isoformat(),
            status="success",
            message="Automatic control enabled",
        )

    # Manual control - disable auto
    config.auto_control_enabled = False
    _crop_fields[field_id] = config

    valve_state["status"] = request.action
    valve_state["position_pct"] = request.position_pct if request.action == "OPEN" else 0
    valve_state["last_action"] = request.action
    valve_state["last_action_time"] = datetime.now().isoformat()
    _valve_states[field_id] = valve_state

    logger.info(f"Manual valve control for {field_id}: {request.action} ({request.reason})")

    return ValveControlResponse(
        field_id=field_id,
        action_taken=request.action,
        valve_position_pct=valve_state["position_pct"],
        timestamp=datetime.now().isoformat(),
        status="success",
        message=f"Valve {request.action.lower()} successfully",
    )


@router.get("/fields/{field_id}/auto-decision", response_model=AutoControlDecision)
async def get_auto_decision(field_id: str, use_simulated: bool = False):
    """
    Get the current auto-control decision for a field based on sensor data.

    This shows what action the system would take if auto-control is enabled.
    """
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    config = _crop_fields[field_id]

    # Get sensor data
    if use_simulated:
        sensor_data = _get_simulated_sensor_data(field_id, config)
    else:
        # In production, fetch from IoT service
        sensor_data = _get_simulated_sensor_data(field_id, config)

    decision = _make_auto_control_decision(field_id, config, sensor_data)
    source = "simulated" if effective_use_simulated and field_id not in _last_real_sensor_data else "iot_sensors"
    contract = _build_data_contract(
        source=source,
        observed_at=sensor_data.timestamp,
        data_available=True,
    )
    for key, value in contract.items():
        setattr(decision, key, value)
    return decision


@router.get("/fields/{field_id}/sensor-history")
async def get_sensor_history(
    field_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    """Get recent sensor data history for a field."""
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")

    history = _sensor_history.get(field_id, [])
    return {
        "field_id": field_id,
        "count": len(history[-limit:]),
        "readings": history[-limit:],
    }

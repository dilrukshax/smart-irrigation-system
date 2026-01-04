"""
Crop Field Management API Routes

Provides endpoints for:
- Crop field configuration (water level, soil moisture thresholds)
- IoT sensor data integration
- Auto valve control based on sensor readings
- Rice field specific defaults
"""

import logging
import time
import math
import random
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

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


# ============ In-Memory State (Use database in production) ============

_crop_fields: Dict[str, CropFieldConfig] = {}
_field_status: Dict[str, dict] = {}
_valve_states: Dict[str, dict] = {}
_sensor_history: Dict[str, List[dict]] = {}
_last_real_sensor_data: Dict[str, dict] = {}  # Stores last real IoT sensor data per field
_sensor_connection_timeout_seconds: int = 60  # Consider sensor disconnected after this time


def _initialize_default_rice_field():
    """Initialize a default rice field for demonstration."""
    rice_defaults = CROP_DEFAULTS["rice"]
    default_field = CropFieldConfig(
        field_id="field-rice-01",
        field_name="Rice Paddy Field A1",
        crop_type="rice",
        area_hectares=2.5,
        device_id="esp32-rice-01",
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


# Initialize default field
_initialize_default_rice_field()


# ============ Helper Functions ============

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
            water_level_min=config.water_level_min_pct,
            water_level_max=config.water_level_max_pct,
            soil_moisture_min=config.soil_moisture_min_pct,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=100,
            reason=f"CRITICAL: Water level ({water_level}%) below critical threshold ({config.water_level_critical_pct}%)",
            priority="critical",
        )
    
    # Water level below minimum - need irrigation
    if water_level < config.water_level_min_pct:
        valve_position = min(100, int((config.water_level_min_pct - water_level) * 5))
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=config.water_level_min_pct,
            water_level_max=config.water_level_max_pct,
            soil_moisture_min=config.soil_moisture_min_pct,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=valve_position,
            reason=f"Water level ({water_level}%) below minimum ({config.water_level_min_pct}%)",
            priority="high",
        )
    
    # Water level at or above maximum - close valve
    if water_level >= config.water_level_max_pct:
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=config.water_level_min_pct,
            water_level_max=config.water_level_max_pct,
            soil_moisture_min=config.soil_moisture_min_pct,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="CLOSE",
            valve_position_pct=0,
            reason=f"Water level ({water_level}%) reached maximum ({config.water_level_max_pct}%)",
            priority="medium",
        )
    
    # Check soil moisture as secondary factor
    if soil_moisture < config.soil_moisture_min_pct and water_level < config.water_level_optimal_pct:
        return AutoControlDecision(
            field_id=field_id,
            timestamp=datetime.now().isoformat(),
            water_level_pct=water_level,
            soil_moisture_pct=soil_moisture,
            water_level_min=config.water_level_min_pct,
            water_level_max=config.water_level_max_pct,
            soil_moisture_min=config.soil_moisture_min_pct,
            soil_moisture_max=config.soil_moisture_max_pct,
            action="OPEN",
            valve_position_pct=50,
            reason=f"Soil moisture ({soil_moisture}%) below minimum ({config.soil_moisture_min_pct}%)",
            priority="medium",
        )
    
    # Normal operation - maintain current state
    current_valve = _valve_states.get(field_id, {"status": "CLOSED"})
    return AutoControlDecision(
        field_id=field_id,
        timestamp=datetime.now().isoformat(),
        water_level_pct=water_level,
        soil_moisture_pct=soil_moisture,
        water_level_min=config.water_level_min_pct,
        water_level_max=config.water_level_max_pct,
        soil_moisture_min=config.soil_moisture_min_pct,
        soil_moisture_max=config.soil_moisture_max_pct,
        action="HOLD",
        valve_position_pct=current_valve.get("position_pct", 0),
        reason=f"Water level ({water_level}%) and soil moisture ({soil_moisture}%) within acceptable range",
        priority="low",
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
async def get_field_status(field_id: str, use_simulated: bool = True):
    """
    Get current status of a crop field including sensor data and valve state.
    
    Args:
        field_id: Field identifier
        use_simulated: Use simulated sensor data (True) or wait for real IoT data (False)
    """
    if field_id not in _crop_fields:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found")
    
    config = _crop_fields[field_id]
    valve_state = _valve_states.get(field_id, {"status": "CLOSED", "position_pct": 0})
    
    # Check if we have real sensor data and if it's still valid (not timed out)
    sensor_connected = False
    is_simulated = True
    last_real_data_time = None
    sensor_data = None
    
    if field_id in _last_real_sensor_data:
        real_data = _last_real_sensor_data[field_id]
        last_real_data_time = real_data.get("timestamp")
        
        # Check if data is still valid (within timeout period)
        if last_real_data_time:
            try:
                last_time = datetime.fromisoformat(last_real_data_time.replace("Z", "+00:00"))
                time_diff = (datetime.now() - last_time.replace(tzinfo=None)).total_seconds()
                
                if time_diff <= _sensor_connection_timeout_seconds:
                    # Real sensor data is valid
                    sensor_connected = True
                    is_simulated = False
                    sensor_data = IoTSensorData(**real_data)
            except Exception as e:
                logger.warning(f"Error parsing sensor timestamp: {e}")
    
    # If no valid real data and simulation not requested, return "no sensor" status
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
    if not sensor_connected and not use_simulated:
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
async def get_auto_decision(field_id: str, use_simulated: bool = True):
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

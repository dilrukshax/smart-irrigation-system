"""
Pydantic schemas for IoT telemetry payloads and API responses.

Defines the data models for:
- ESP32 sensor telemetry (input)
- API responses for device data
- Command payloads for device control
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from dateutil import parser as date_parser


class TelemetryPayload(BaseModel):
    """
    Telemetry payload received from ESP32 devices.
    
    Required fields:
    - device_id: Unique identifier for the device
    - ts or ts_ms: Timestamp (ISO8601 string or epoch milliseconds)
    - soil_ao: Analog reading from soil moisture sensor (ADC raw value)
    - water_ao: Analog reading from water level sensor (ADC raw value)
    
    Optional fields:
    - soil_do: Digital reading from soil moisture sensor (0 or 1)
    - rssi: WiFi signal strength in dBm
    - battery_v: Battery voltage
    - firmware: Firmware version string
    - ip: Device IP address
    - sampling_ms: Sampling interval in milliseconds
    - soil_moisture_pct: Calculated soil moisture percentage
    - water_level_pct: Calculated water level percentage
    """
    
    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device identifier")
    ts: Optional[datetime] = Field(None, description="Timestamp (ISO8601 or epoch ms)")
    ts_ms: Optional[int] = Field(None, description="Timestamp in epoch milliseconds (from ESP32)")
    soil_ao: int = Field(..., ge=0, le=4095, description="Soil moisture ADC raw value (0-4095)")
    water_ao: int = Field(..., ge=0, le=4095, description="Water level ADC raw value (0-4095)")
    
    # Optional fields
    soil_do: Optional[int] = Field(None, ge=0, le=1, description="Soil moisture digital output (0/1)")
    rssi: Optional[int] = Field(None, ge=-100, le=0, description="WiFi RSSI in dBm")
    battery_v: Optional[float] = Field(None, ge=0, le=5.0, description="Battery voltage")
    firmware: Optional[str] = Field(None, max_length=32, description="Firmware version")
    ip: Optional[str] = Field(None, max_length=45, description="Device IP address")
    sampling_ms: Optional[int] = Field(None, ge=100, le=3600000, description="Sampling interval in ms")
    soil_moisture_pct: Optional[int] = Field(None, ge=0, le=100, description="Calculated soil moisture %")
    water_level_pct: Optional[int] = Field(None, ge=0, le=100, description="Calculated water level %")
    
    @field_validator("ts", mode="before")
    @classmethod
    def parse_timestamp(cls, value):
        """Parse timestamp from various formats."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            # Epoch milliseconds
            if value > 1e12:  # Milliseconds
                return datetime.fromtimestamp(value / 1000)
            else:  # Seconds
                return datetime.fromtimestamp(value)
        if isinstance(value, str):
            return date_parser.parse(value)
        raise ValueError(f"Invalid timestamp format: {value}")
    
    def get_timestamp(self) -> datetime:
        """Get the timestamp, preferring ts over ts_ms."""
        if self.ts is not None:
            return self.ts
        if self.ts_ms is not None:
            # ts_ms from ESP32 is millis() - device uptime, use current time instead
            return datetime.utcnow()
        return datetime.utcnow()


class TelemetryWithDerived(BaseModel):
    """
    Telemetry data with derived percentage values.
    This is used for storage and API responses.
    """
    
    device_id: str
    timestamp: datetime
    
    # Raw sensor values
    soil_ao: int
    soil_do: Optional[int] = None
    water_ao: int
    
    # Derived percentage values (0-100)
    soil_moisture_pct: float = Field(..., ge=0, le=100, description="Soil moisture percentage")
    water_level_pct: float = Field(..., ge=0, le=100, description="Water level percentage")
    
    # Optional device metadata
    rssi: Optional[int] = None
    battery_v: Optional[float] = None
    firmware: Optional[str] = None
    ip: Optional[str] = None
    sampling_ms: Optional[int] = None


class TelemetryResponse(BaseModel):
    """Single telemetry reading response."""
    
    device_id: str
    timestamp: datetime
    soil_ao: int
    soil_do: Optional[int] = None
    water_ao: int
    soil_moisture_pct: float
    water_level_pct: float
    rssi: Optional[int] = None
    battery_v: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TelemetryRangeResponse(BaseModel):
    """Response for telemetry range queries."""
    
    device_id: str
    count: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    readings: List[TelemetryResponse]


class DeviceInfo(BaseModel):
    """Device information and latest status."""
    
    device_id: str
    last_seen: Optional[datetime] = None
    latest_reading: Optional[TelemetryResponse] = None
    is_online: bool = False
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class DeviceListResponse(BaseModel):
    """Response for listing all devices."""
    
    count: int
    devices: List[DeviceInfo]


class DeviceCommand(BaseModel):
    """
    Command payload to send to a device.
    
    Supported command types:
    - set_interval_ms: Change sampling interval
    - reboot: Restart the device
    - calibrate: Trigger sensor calibration
    - update_firmware: Trigger OTA update
    """
    
    type: Literal["set_interval_ms", "reboot", "calibrate", "update_firmware"] = Field(
        ..., description="Command type"
    )
    value: Optional[int | str] = Field(None, description="Command value (if applicable)")
    
    @field_validator("value")
    @classmethod
    def validate_value(cls, v, info):
        """Validate value based on command type."""
        cmd_type = info.data.get("type")
        
        if cmd_type == "set_interval_ms":
            if v is None:
                raise ValueError("set_interval_ms requires a value")
            if not isinstance(v, int) or v < 1000 or v > 3600000:
                raise ValueError("interval_ms must be between 1000 and 3600000")
        
        return v


class DeviceCommandResponse(BaseModel):
    """Response after sending a command to a device."""
    
    device_id: str
    command_type: str
    status: Literal["sent", "queued", "failed"]
    message: str
    topic: str


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str
    service: str
    version: str
    influxdb_connected: bool
    mqtt_connected: bool

"""
IoT Telemetry API Router.

Provides REST endpoints for:
- Listing devices
- Getting latest/historical readings
- Sending commands to devices
- Manual telemetry ingestion (for testing)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from dateutil import parser as date_parser

from app.iot.schemas import (
    TelemetryPayload,
    TelemetryResponse,
    TelemetryRangeResponse,
    DeviceListResponse,
    DeviceInfo,
    DeviceCommand,
    DeviceCommandResponse,
)
from app.iot.service import iot_service

router = APIRouter(prefix="/api/v1/iot", tags=["IoT Telemetry"])


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices():
    """
    List all known IoT devices.
    
    Returns devices that have sent telemetry in the last 30 days,
    along with their online status and latest reading.
    """
    return iot_service.get_all_devices()


@router.get("/devices/{device_id}/latest", response_model=TelemetryResponse)
async def get_latest_reading(device_id: str):
    """
    Get the latest telemetry reading for a device.
    
    Args:
        device_id: Unique device identifier.
        
    Returns:
        Most recent telemetry reading.
        
    Raises:
        404: Device not found or no readings available.
    """
    reading = iot_service.get_latest_reading(device_id)
    
    if not reading:
        raise HTTPException(
            status_code=404,
            detail=f"No readings found for device: {device_id}",
        )
    
    return reading


@router.get("/devices/{device_id}/range", response_model=TelemetryRangeResponse)
async def get_readings_range(
    device_id: str,
    start: Optional[str] = Query(
        None,
        alias="from",
        description="Start time (ISO8601 or epoch ms)",
        example="2024-01-01T00:00:00Z",
    ),
    end: Optional[str] = Query(
        None,
        alias="to",
        description="End time (ISO8601 or epoch ms)",
        example="2024-01-02T00:00:00Z",
    ),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of readings"),
):
    """
    Get telemetry readings within a time range.
    
    Args:
        device_id: Unique device identifier.
        start: Range start time (default: 24 hours ago).
        end: Range end time (default: now).
        limit: Maximum results (default: 100, max: 1000).
        
    Returns:
        List of telemetry readings within the specified range.
    """
    start_time = None
    end_time = None
    
    # Parse start time
    if start:
        try:
            if start.isdigit():
                # Epoch milliseconds
                start_time = datetime.fromtimestamp(int(start) / 1000)
            else:
                start_time = date_parser.parse(start)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'from' parameter format. Use ISO8601 or epoch ms.",
            )
    
    # Parse end time
    if end:
        try:
            if end.isdigit():
                # Epoch milliseconds
                end_time = datetime.fromtimestamp(int(end) / 1000)
            else:
                end_time = date_parser.parse(end)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'to' parameter format. Use ISO8601 or epoch ms.",
            )
    
    return iot_service.get_readings_range(
        device_id=device_id,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )


@router.post("/devices/{device_id}/cmd", response_model=DeviceCommandResponse)
async def send_device_command(device_id: str, command: DeviceCommand):
    """
    Send a command to a device via MQTT.
    
    Publishes the command to topic: devices/{device_id}/cmd
    
    Supported commands:
    - set_interval_ms: Change sampling interval (value: 1000-3600000)
    - reboot: Restart the device
    - calibrate: Trigger sensor calibration
    - update_firmware: Trigger OTA update
    
    Args:
        device_id: Target device identifier.
        command: Command to send.
        
    Returns:
        Command status (sent/queued/failed).
    """
    return iot_service.send_command(device_id, command)


@router.post("/telemetry", response_model=TelemetryResponse, status_code=201)
async def ingest_telemetry(payload: TelemetryPayload):
    """
    Manually ingest telemetry data (for testing without MQTT).
    
    This endpoint allows direct HTTP ingestion of telemetry data,
    bypassing the MQTT broker. Useful for testing and debugging.
    
    The payload will be processed the same way as MQTT messages:
    - Validated against schema
    - Derived values calculated
    - Stored in InfluxDB
    
    Args:
        payload: Telemetry payload from device.
        
    Returns:
        Processed telemetry with derived values.
        
    Raises:
        500: Failed to store telemetry.
    """
    result = iot_service.process_telemetry(payload)
    
    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to store telemetry data",
        )
    
    return TelemetryResponse(
        device_id=result.device_id,
        timestamp=result.timestamp,
        soil_ao=result.soil_ao,
        soil_do=result.soil_do,
        water_ao=result.water_ao,
        soil_moisture_pct=result.soil_moisture_pct,
        water_level_pct=result.water_level_pct,
        rssi=result.rssi,
        battery_v=result.battery_v,
    )

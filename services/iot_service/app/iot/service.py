"""
IoT Service - Business Logic Layer.

Provides high-level operations for:
- Processing and storing telemetry data
- Querying device data
- Sending commands to devices
- Calibration-based value conversion
"""

import logging
from datetime import datetime
from typing import Optional, List

from app.core.config import settings
from app.iot.schemas import (
    TelemetryPayload,
    TelemetryWithDerived,
    TelemetryResponse,
    TelemetryRangeResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceCommand,
    DeviceCommandResponse,
)
from app.iot.pg_repo import pg_repo
from app.iot.mqtt_client import get_mqtt_client

logger = logging.getLogger(__name__)


class IoTService:
    """
    Business logic service for IoT operations.

    Handles:
    - Telemetry processing with calibration
    - Data storage and retrieval
    - Device command publishing
    """

    # Must match ESP32 firmware constants
    WATER_SENSOR_HEIGHT_CM: float = 4.0
    SOIL_PROBE_DEPTH_CM: float = 5.0

    @staticmethod
    def _soil_status_label(pct: float) -> str:
        """Map soil moisture % to human-readable label matching ESP32 firmware."""
        if pct < 30:
            return "dry"
        if pct < 60:
            return "moderate"
        if pct <= 80:
            return "optimal"
        return "wet"

    @staticmethod
    def _water_status_label(pct: float) -> str:
        """Map water level % to human-readable label matching ESP32 firmware."""
        if pct < 20:
            return "low"
        if pct < 70:
            return "medium"
        return "high"

    @staticmethod
    def calculate_soil_moisture_pct(adc_value: int) -> float:
        """
        Convert soil moisture ADC value to percentage.

        Uses linear interpolation based on calibration values.
        Dry = 0%, Wet = 100%

        Args:
            adc_value: Raw ADC value (0-4095)

        Returns:
            Moisture percentage (0-100)
        """
        dry = settings.soil_adc_dry
        wet = settings.soil_adc_wet

        # Clamp value to calibration range
        clamped = max(wet, min(dry, adc_value))

        # Linear interpolation: dry=0%, wet=100%
        # Note: Higher ADC = drier (inverted relationship)
        pct = ((dry - clamped) / (dry - wet)) * 100

        return round(max(0, min(100, pct)), 1)

    @staticmethod
    def calculate_water_level_pct(adc_value: int) -> float:
        """
        Convert water level ADC value to percentage.

        Uses linear interpolation based on calibration values.
        Empty = 0%, Full = 100%

        Args:
            adc_value: Raw ADC value (0-4095)

        Returns:
            Water level percentage (0-100)
        """
        empty = settings.water_adc_empty
        full = settings.water_adc_full

        # Clamp value to calibration range
        clamped = max(full, min(empty, adc_value))

        # Linear interpolation: empty=0%, full=100%
        # Note: Higher ADC = lower level (inverted relationship)
        pct = ((empty - clamped) / (empty - full)) * 100

        return round(max(0, min(100, pct)), 1)

    @classmethod
    def process_telemetry(cls, payload: TelemetryPayload) -> Optional[TelemetryWithDerived]:
        """
        Process incoming telemetry payload.

        - Calculates derived percentage values
        - Computes physical water_level_cm from percentage x sensor height
        - Derives status labels (dry/moderate/optimal/wet, low/medium/high)
        - Writes to PostgreSQL

        Args:
            payload: Raw telemetry from device.

        Returns:
            Processed telemetry with derived values, or None on failure.
        """
        try:
            # Always recalculate from raw ADC using backend calibration constants.
            # This ensures accuracy even when the ESP32 firmware uses different
            # (e.g. older) calibration values.
            soil_moisture_pct = cls.calculate_soil_moisture_pct(payload.soil_ao)
            water_level_pct = cls.calculate_water_level_pct(payload.water_ao)

            # Physical sensor dimensions (prefer ESP32 values, fall back to firmware defaults)
            water_sensor_height_cm = payload.water_sensor_height_cm or cls.WATER_SENSOR_HEIGHT_CM
            soil_probe_depth_cm = payload.soil_probe_depth_cm or cls.SOIL_PROBE_DEPTH_CM

            # Core physical measurement: actual water depth in cm
            water_level_cm = (
                payload.water_level_cm
                if payload.water_level_cm is not None
                else round((water_level_pct / 100.0) * water_sensor_height_cm, 2)
            )

            # Status labels — use ESP32 label if sent, else derive from percentage
            soil_status = payload.soil_status or cls._soil_status_label(soil_moisture_pct)
            water_status = payload.water_status or cls._water_status_label(water_level_pct)

            telemetry = TelemetryWithDerived(
                device_id=payload.device_id,
                timestamp=payload.get_timestamp(),
                soil_ao=payload.soil_ao,
                soil_do=payload.soil_do,
                water_ao=payload.water_ao,
                soil_moisture_pct=soil_moisture_pct,
                water_level_pct=water_level_pct,
                water_level_cm=water_level_cm,
                soil_probe_depth_cm=soil_probe_depth_cm,
                water_sensor_height_cm=water_sensor_height_cm,
                soil_status=soil_status,
                water_status=water_status,
                rssi=payload.rssi,
                battery_v=payload.battery_v,
                firmware=payload.firmware,
                ip=payload.ip,
                sampling_ms=payload.sampling_ms,
            )

# Write to PostgreSQL
            success = pg_repo.write_point(telemetry)

            if success:
                logger.info(
                    f"Stored telemetry from {payload.device_id}: "
                    f"soil={soil_moisture_pct:.1f}% ({soil_status}), "
                    f"water={water_level_pct:.1f}% = {water_level_cm:.2f}cm ({water_status})"
                )
                return telemetry
            else:
                logger.error(f"Failed to store telemetry from {payload.device_id}")
                return None

        except Exception as e:
            logger.error(f"Error processing telemetry: {e}")
            return None

    @staticmethod
    def get_all_devices() -> DeviceListResponse:
        """
        Get list of all known devices.

        Returns:
            Device list response with count and device info.
        """
        devices = pg_repo.get_all_devices()
        return DeviceListResponse(
            count=len(devices),
            devices=devices,
        )

    @staticmethod
    def get_latest_reading(device_id: str) -> Optional[TelemetryResponse]:
        """
        Get latest reading for a device.

        Args:
            device_id: Device identifier.

        Returns:
            Latest telemetry response or None.
        """
        return pg_repo.query_latest(device_id)

    @staticmethod
    def get_readings_range(
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> TelemetryRangeResponse:
        """
        Get readings for a device within a time range.
        """
        readings = pg_repo.query_range(
            device_id=device_id,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
        )
        return TelemetryRangeResponse(
            device_id=device_id,
            count=len(readings),
            start_time=start_time,
            end_time=end_time,
            readings=readings,
        )

    @staticmethod
    def send_command(device_id: str, command: DeviceCommand) -> DeviceCommandResponse:
        """
        Send a command to a device via MQTT.

        Args:
            device_id: Target device identifier.
            command: Command to send.

        Returns:
            Command response with status.
        """
        mqtt = get_mqtt_client()
        topic = f"devices/{device_id}/cmd"

        if not mqtt or not mqtt.is_connected:
            return DeviceCommandResponse(
                device_id=device_id,
                command_type=command.type,
                status="failed",
                message="MQTT client not connected",
                topic=topic,
            )

        # Build command payload
        cmd_payload = {
            "type": command.type,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if command.value is not None:
            cmd_payload["value"] = command.value

        # Publish command
        success = mqtt.publish_command(device_id, cmd_payload)

        if success:
            return DeviceCommandResponse(
                device_id=device_id,
                command_type=command.type,
                status="sent",
                message=f"Command {command.type} sent successfully",
                topic=topic,
            )
        else:
            return DeviceCommandResponse(
                device_id=device_id,
                command_type=command.type,
                status="failed",
                message="Failed to publish command to MQTT",
                topic=topic,
            )


# Global service instance
iot_service = IoTService()

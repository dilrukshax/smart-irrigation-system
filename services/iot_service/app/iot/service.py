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
from typing import Optional

import requests

from app.core.config import settings
from app.iot.mqtt_client import get_mqtt_client
from app.iot.pg_repo import pg_repo
from app.iot.schemas import (
    DeviceCommand,
    DeviceCommandResponse,
    DeviceListResponse,
    TelemetryPayload,
    TelemetryRangeResponse,
    TelemetryResponse,
    TelemetryWithDerived,
)

logger = logging.getLogger(__name__)


class IoTService:
    """
    Business logic service for IoT operations.

    Handles:
    - Telemetry processing with calibration
    - Data storage and retrieval
    - Device command publishing
    """

    @staticmethod
    def calculate_soil_moisture_pct(adc_value: int) -> float:
        dry = settings.soil_adc_dry
        wet = settings.soil_adc_wet

        clamped = max(wet, min(dry, adc_value))
        pct = ((dry - clamped) / (dry - wet)) * 100
        return round(max(0, min(100, pct)), 1)

    @staticmethod
    def calculate_water_level_pct(adc_value: int) -> float:
        empty = settings.water_adc_empty
        full = settings.water_adc_full

        clamped = max(full, min(empty, adc_value))
        pct = ((empty - clamped) / (empty - full)) * 100
        return round(max(0, min(100, pct)), 1)

    @classmethod
    def process_telemetry(cls, payload: TelemetryPayload) -> Optional[TelemetryWithDerived]:
        try:
            soil_moisture_pct = (
                payload.soil_moisture_pct
                if payload.soil_moisture_pct is not None
                else cls.calculate_soil_moisture_pct(payload.soil_ao)
            )
            water_level_pct = (
                payload.water_level_pct
                if payload.water_level_pct is not None
                else cls.calculate_water_level_pct(payload.water_ao)
            )

            telemetry = TelemetryWithDerived(
                device_id=payload.device_id,
                timestamp=payload.get_timestamp(),
                soil_ao=payload.soil_ao,
                soil_do=payload.soil_do,
                water_ao=payload.water_ao,
                soil_moisture_pct=soil_moisture_pct,
                water_level_pct=water_level_pct,
                rssi=payload.rssi,
                battery_v=payload.battery_v,
                firmware=payload.firmware,
                ip=payload.ip,
                sampling_ms=payload.sampling_ms,
            )

            success = pg_repo.write_point(telemetry)
            if not success:
                logger.error("Failed to store telemetry from %s", payload.device_id)
                return None

            field_id = cls._resolve_field_id(payload.device_id)
            cls._forward_to_irrigation(field_id=field_id, telemetry=telemetry)
            cls._emit_sensor_event(field_id=field_id, telemetry=telemetry)

            logger.info(
                "Stored telemetry from %s: soil=%s%% water=%s%%",
                payload.device_id,
                soil_moisture_pct,
                water_level_pct,
            )
            return telemetry

        except Exception as exc:
            logger.error("Error processing telemetry: %s", exc)
            return None

    @staticmethod
    def get_all_devices() -> DeviceListResponse:
        devices = pg_repo.get_all_devices()
        return DeviceListResponse(count=len(devices), devices=devices)

    @staticmethod
    def get_latest_reading(device_id: str) -> Optional[TelemetryResponse]:
        return pg_repo.query_latest(device_id)

    @staticmethod
    def get_readings_range(
        device_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> TelemetryRangeResponse:
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

        cmd_payload = {
            "type": command.type,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if command.value is not None:
            cmd_payload["value"] = command.value

        success = mqtt.publish_command(device_id, cmd_payload)
        if success:
            return DeviceCommandResponse(
                device_id=device_id,
                command_type=command.type,
                status="sent",
                message=f"Command {command.type} sent successfully",
                topic=topic,
            )

        return DeviceCommandResponse(
            device_id=device_id,
            command_type=command.type,
            status="failed",
            message="Failed to publish command to MQTT",
            topic=topic,
        )

    @classmethod
    def _resolve_field_id(cls, device_id: str) -> Optional[str]:
        """Resolve field mapping through static map first, then irrigation service."""
        static_map = settings.get_device_field_map()
        if device_id in static_map:
            return static_map[device_id]

        try:
            response = requests.get(
                f"{settings.irrigation_service_url}/api/v1/farm/devices/{device_id}/field",
                timeout=4,
            )
            if response.status_code >= 400:
                return None
            payload = response.json() if response.content else {}
            field_id = payload.get("field_id")
            return str(field_id) if field_id else None
        except Exception as exc:
            logger.debug("Field resolve failed for %s: %s", device_id, exc)
            return None

    @classmethod
    def _forward_to_irrigation(cls, field_id: Optional[str], telemetry: TelemetryWithDerived) -> None:
        """Forward telemetry to irrigation service grouped endpoint."""
        try:
            payload = {
                "field_id": field_id,
                "device_id": telemetry.device_id,
                "timestamp": telemetry.timestamp.isoformat(),
                "soil_moisture_pct": telemetry.soil_moisture_pct,
                "water_level_pct": telemetry.water_level_pct,
                "soil_ao": telemetry.soil_ao,
                "water_ao": telemetry.water_ao,
                "rssi": telemetry.rssi,
                "battery_v": telemetry.battery_v,
            }
            response = requests.post(
                f"{settings.irrigation_service_url}/api/v1/telemetry/ingest",
                json=payload,
                timeout=4,
            )
            if response.status_code >= 400:
                logger.warning(
                    "Telemetry bridge rejected by irrigation: status=%s body=%s",
                    response.status_code,
                    response.text,
                )
        except Exception as exc:
            logger.debug("Telemetry bridge failed: %s", exc)

    @classmethod
    def _emit_sensor_event(cls, field_id: Optional[str], telemetry: TelemetryWithDerived) -> None:
        mqtt = get_mqtt_client()
        if not mqtt:
            return

        event_payload = {
            "event": "sensor.reading.v1",
            "occurred_at": datetime.utcnow().isoformat(),
            "device_id": telemetry.device_id,
            "field_id": field_id,
            "soil_moisture_pct": telemetry.soil_moisture_pct,
            "water_level_pct": telemetry.water_level_pct,
        }
        mqtt.publish_event("sensor.reading.v1", event_payload)


# Global service instance
iot_service = IoTService()

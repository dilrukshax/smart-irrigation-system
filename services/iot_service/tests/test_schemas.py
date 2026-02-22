"""
Unit tests for IoT telemetry schemas.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.iot.schemas import (
    TelemetryPayload,
    TelemetryWithDerived,
    DeviceCommand,
)


class TestTelemetryPayload:
    """Tests for TelemetryPayload schema."""
    
    def test_valid_payload_with_iso_timestamp(self):
        """Test valid payload with ISO8601 timestamp."""
        payload = TelemetryPayload(
            device_id="esp32-001",
            ts="2024-01-15T10:30:00Z",
            soil_ao=2500,
            water_ao=1500,
        )
        
        assert payload.device_id == "esp32-001"
        assert payload.soil_ao == 2500
        assert payload.water_ao == 1500
        assert isinstance(payload.ts, datetime)
    
    def test_valid_payload_with_epoch_ms(self):
        """Test valid payload with epoch milliseconds timestamp."""
        epoch_ms = 1705315800000  # 2024-01-15T10:30:00Z
        payload = TelemetryPayload(
            device_id="esp32-001",
            ts=epoch_ms,
            soil_ao=2500,
            water_ao=1500,
        )
        
        assert isinstance(payload.ts, datetime)
    
    def test_valid_payload_with_optional_fields(self):
        """Test payload with all optional fields."""
        payload = TelemetryPayload(
            device_id="esp32-001",
            ts=datetime.utcnow(),
            soil_ao=2500,
            soil_do=1,
            water_ao=1500,
            rssi=-65,
            battery_v=3.7,
            firmware="1.0.0",
            ip="192.168.1.100",
            sampling_ms=60000,
        )
        
        assert payload.soil_do == 1
        assert payload.rssi == -65
        assert payload.battery_v == 3.7
        assert payload.firmware == "1.0.0"
    
    def test_invalid_soil_ao_out_of_range(self):
        """Test validation fails for soil_ao out of ADC range."""
        with pytest.raises(ValidationError) as exc_info:
            TelemetryPayload(
                device_id="esp32-001",
                ts=datetime.utcnow(),
                soil_ao=5000,  # Out of range (max 4095)
                water_ao=1500,
            )
        
        assert "soil_ao" in str(exc_info.value)
    
    def test_invalid_device_id_empty(self):
        """Test validation fails for empty device_id."""
        with pytest.raises(ValidationError) as exc_info:
            TelemetryPayload(
                device_id="",
                ts=datetime.utcnow(),
                soil_ao=2500,
                water_ao=1500,
            )
        
        assert "device_id" in str(exc_info.value)
    
    def test_missing_required_fields(self):
        """Test validation fails for missing required fields."""
        with pytest.raises(ValidationError):
            TelemetryPayload(
                device_id="esp32-001",
                ts=datetime.utcnow(),
                # Missing soil_ao and water_ao
            )


class TestDeviceCommand:
    """Tests for DeviceCommand schema."""
    
    def test_valid_set_interval_command(self):
        """Test valid set_interval_ms command."""
        cmd = DeviceCommand(
            type="set_interval_ms",
            value=60000,
        )
        
        assert cmd.type == "set_interval_ms"
        assert cmd.value == 60000
    
    def test_valid_reboot_command(self):
        """Test valid reboot command (no value needed)."""
        cmd = DeviceCommand(type="reboot")
        
        assert cmd.type == "reboot"
        assert cmd.value is None
    
    def test_invalid_command_type(self):
        """Test validation fails for invalid command type."""
        with pytest.raises(ValidationError) as exc_info:
            DeviceCommand(
                type="invalid_command",
                value=100,
            )
        
        assert "type" in str(exc_info.value)
    
    def test_set_interval_requires_value(self):
        """Test set_interval_ms requires a value."""
        with pytest.raises(ValidationError) as exc_info:
            DeviceCommand(type="set_interval_ms")
        
        assert "value" in str(exc_info.value)


class TestTelemetryWithDerived:
    """Tests for TelemetryWithDerived schema."""
    
    def test_valid_telemetry_with_derived(self):
        """Test valid telemetry with derived percentages."""
        telemetry = TelemetryWithDerived(
            device_id="esp32-001",
            timestamp=datetime.utcnow(),
            soil_ao=2500,
            water_ao=1500,
            soil_moisture_pct=50.0,
            water_level_pct=75.0,
        )
        
        assert telemetry.soil_moisture_pct == 50.0
        assert telemetry.water_level_pct == 75.0
    
    def test_percentage_bounds(self):
        """Test percentage values are bounded 0-100."""
        with pytest.raises(ValidationError):
            TelemetryWithDerived(
                device_id="esp32-001",
                timestamp=datetime.utcnow(),
                soil_ao=2500,
                water_ao=1500,
                soil_moisture_pct=150.0,  # Out of bounds
                water_level_pct=75.0,
            )

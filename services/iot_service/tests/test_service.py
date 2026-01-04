"""
Unit tests for IoT service business logic.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch

from app.iot.service import IoTService
from app.iot.schemas import TelemetryPayload, DeviceCommand


class TestCalibrationCalculations:
    """Tests for sensor calibration calculations."""
    
    def test_soil_moisture_fully_dry(self):
        """Test soil moisture at fully dry (ADC max)."""
        # Default: dry=4095, wet=1000
        pct = IoTService.calculate_soil_moisture_pct(4095)
        assert pct == 0.0
    
    def test_soil_moisture_fully_wet(self):
        """Test soil moisture at fully wet (ADC min)."""
        pct = IoTService.calculate_soil_moisture_pct(1000)
        assert pct == 100.0
    
    def test_soil_moisture_midpoint(self):
        """Test soil moisture at midpoint."""
        # Midpoint between 4095 and 1000 = 2547.5
        pct = IoTService.calculate_soil_moisture_pct(2548)
        assert 45.0 <= pct <= 55.0  # Approximately 50%
    
    def test_water_level_empty(self):
        """Test water level at empty (ADC max)."""
        # Default: empty=4095, full=500
        pct = IoTService.calculate_water_level_pct(4095)
        assert pct == 0.0
    
    def test_water_level_full(self):
        """Test water level at full (ADC min)."""
        pct = IoTService.calculate_water_level_pct(500)
        assert pct == 100.0
    
    def test_values_clamped_above_max(self):
        """Test ADC values above max are clamped."""
        # Value above dry threshold should still return 0%
        pct = IoTService.calculate_soil_moisture_pct(5000)
        assert pct == 0.0
    
    def test_values_clamped_below_min(self):
        """Test ADC values below min are clamped."""
        # Value below wet threshold should still return 100%
        pct = IoTService.calculate_soil_moisture_pct(500)
        assert pct == 100.0


class TestProcessTelemetry:
    """Tests for telemetry processing."""
    
    @patch('app.iot.service.influx_repo')
    def test_process_telemetry_success(self, mock_influx_repo):
        """Test successful telemetry processing."""
        mock_influx_repo.write_point.return_value = True
        
        payload = TelemetryPayload(
            device_id="esp32-001",
            ts=datetime.utcnow(),
            soil_ao=2500,
            water_ao=1500,
        )
        
        result = IoTService.process_telemetry(payload)
        
        assert result is not None
        assert result.device_id == "esp32-001"
        assert 0.0 <= result.soil_moisture_pct <= 100.0
        assert 0.0 <= result.water_level_pct <= 100.0
        mock_influx_repo.write_point.assert_called_once()
    
    @patch('app.iot.service.influx_repo')
    def test_process_telemetry_influx_failure(self, mock_influx_repo):
        """Test telemetry processing when InfluxDB write fails."""
        mock_influx_repo.write_point.return_value = False
        
        payload = TelemetryPayload(
            device_id="esp32-001",
            ts=datetime.utcnow(),
            soil_ao=2500,
            water_ao=1500,
        )
        
        result = IoTService.process_telemetry(payload)
        
        assert result is None


class TestSendCommand:
    """Tests for device command sending."""
    
    @patch('app.iot.service.get_mqtt_client')
    def test_send_command_success(self, mock_get_mqtt):
        """Test successful command sending."""
        mock_mqtt = Mock()
        mock_mqtt.is_connected = True
        mock_mqtt.publish_command.return_value = True
        mock_get_mqtt.return_value = mock_mqtt
        
        command = DeviceCommand(
            type="set_interval_ms",
            value=60000,
        )
        
        result = IoTService.send_command("esp32-001", command)
        
        assert result.status == "sent"
        assert result.device_id == "esp32-001"
        mock_mqtt.publish_command.assert_called_once()
    
    @patch('app.iot.service.get_mqtt_client')
    def test_send_command_mqtt_disconnected(self, mock_get_mqtt):
        """Test command sending when MQTT is disconnected."""
        mock_mqtt = Mock()
        mock_mqtt.is_connected = False
        mock_get_mqtt.return_value = mock_mqtt
        
        command = DeviceCommand(type="reboot")
        
        result = IoTService.send_command("esp32-001", command)
        
        assert result.status == "failed"
        assert "not connected" in result.message
    
    @patch('app.iot.service.get_mqtt_client')
    def test_send_command_no_mqtt_client(self, mock_get_mqtt):
        """Test command sending when MQTT client doesn't exist."""
        mock_get_mqtt.return_value = None
        
        command = DeviceCommand(type="reboot")
        
        result = IoTService.send_command("esp32-001", command)
        
        assert result.status == "failed"

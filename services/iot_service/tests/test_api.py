"""
Integration tests for IoT API endpoints.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_influx():
    """Mock InfluxDB repository."""
    with patch('app.iot.service.influx_repo') as mock:
        mock.is_connected = True
        yield mock


@pytest.fixture
def mock_mqtt():
    """Mock MQTT client."""
    with patch('app.iot.service.get_mqtt_client') as mock_get:
        mock_client = Mock()
        mock_client.is_connected = True
        mock_get.return_value = mock_client
        yield mock_client


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    @patch('app.api.health.influx_repo')
    @patch('app.api.health.get_mqtt_client')
    def test_health_check(self, mock_get_mqtt, mock_influx, client):
        """Test health endpoint returns correct status."""
        mock_influx.is_connected = True
        mock_mqtt_client = Mock()
        mock_mqtt_client.is_connected = True
        mock_get_mqtt.return_value = mock_mqtt_client
        
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "IoT Telemetry Service"
        assert "influxdb_connected" in data
        assert "mqtt_connected" in data


class TestTelemetryIngestion:
    """Tests for telemetry ingestion endpoint."""
    
    @patch('app.iot.service.influx_repo')
    def test_ingest_telemetry_success(self, mock_influx, client):
        """Test successful telemetry ingestion."""
        mock_influx.write_point.return_value = True
        
        payload = {
            "device_id": "esp32-001",
            "ts": datetime.utcnow().isoformat(),
            "soil_ao": 2500,
            "water_ao": 1500,
        }
        
        response = client.post("/api/v1/iot/telemetry", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["device_id"] == "esp32-001"
        assert "soil_moisture_pct" in data
        assert "water_level_pct" in data
    
    def test_ingest_telemetry_invalid_payload(self, client):
        """Test telemetry ingestion with invalid payload."""
        payload = {
            "device_id": "esp32-001",
            # Missing required fields
        }
        
        response = client.post("/api/v1/iot/telemetry", json=payload)
        
        assert response.status_code == 422  # Validation error


class TestDeviceEndpoints:
    """Tests for device-related endpoints."""
    
    @patch('app.iot.service.influx_repo')
    def test_list_devices(self, mock_influx, client):
        """Test listing devices."""
        mock_influx.get_all_devices.return_value = []
        
        response = client.get("/api/v1/iot/devices")
        
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert "devices" in data
    
    @patch('app.iot.service.influx_repo')
    def test_get_latest_reading_not_found(self, mock_influx, client):
        """Test getting latest reading for non-existent device."""
        mock_influx.query_latest.return_value = None
        
        response = client.get("/api/v1/iot/devices/unknown-device/latest")
        
        assert response.status_code == 404
    
    @patch('app.iot.service.influx_repo')
    def test_get_readings_range(self, mock_influx, client):
        """Test getting readings range."""
        mock_influx.query_range.return_value = []
        
        response = client.get(
            "/api/v1/iot/devices/esp32-001/range",
            params={"from": "2024-01-01T00:00:00Z", "to": "2024-01-02T00:00:00Z"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["device_id"] == "esp32-001"
        assert "readings" in data


class TestCommandEndpoints:
    """Tests for device command endpoints."""
    
    @patch('app.iot.service.get_mqtt_client')
    def test_send_command_success(self, mock_get_mqtt, client):
        """Test sending command to device."""
        mock_mqtt = Mock()
        mock_mqtt.is_connected = True
        mock_mqtt.publish_command.return_value = True
        mock_get_mqtt.return_value = mock_mqtt
        
        response = client.post(
            "/api/v1/iot/devices/esp32-001/cmd",
            json={"type": "set_interval_ms", "value": 60000}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"
    
    def test_send_command_invalid_type(self, client):
        """Test sending command with invalid type."""
        response = client.post(
            "/api/v1/iot/devices/esp32-001/cmd",
            json={"type": "invalid_command"}
        )
        
        assert response.status_code == 422

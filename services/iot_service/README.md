# IoT Telemetry Service

ESP32 sensor telemetry ingestion microservice for the Smart Irrigation System.

## Overview

This service provides:
- **MQTT Subscription**: Real-time telemetry ingestion from ESP32 devices
- **InfluxDB Storage**: Time-series storage for sensor data
- **REST APIs**: Query device data and send commands
- **Calibration**: Automatic conversion of raw ADC values to percentages

## Architecture

```
ESP32 Sensors ──MQTT──> IoT Service ──> InfluxDB
                             │
                             └── REST API ──> Frontend/Gateway
```

## MQTT Topics

### Telemetry (Devices → Service)
**Topic:** `devices/{device_id}/telemetry`

Devices publish sensor readings to this topic. The service subscribes to `devices/+/telemetry` to receive all device telemetry.

### Commands (Service → Devices)
**Topic:** `devices/{device_id}/cmd`

Commands are published to device-specific topics for device control.

## Telemetry Payload Format

ESP32 devices should send JSON payloads with the following structure:

```json
{
  "device_id": "esp32-001",
  "ts": "2024-01-15T10:30:00Z",
  "soil_ao": 2500,
  "water_ao": 1500,
  "soil_do": 1,
  "rssi": -65,
  "battery_v": 3.7,
  "firmware": "1.0.0",
  "ip": "192.168.1.100",
  "sampling_ms": 60000
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | string | Unique device identifier (1-64 chars) |
| `ts` | string/int | Timestamp - ISO8601 string or epoch milliseconds |
| `soil_ao` | int | Soil moisture ADC value (0-4095) |
| `water_ao` | int | Water level ADC value (0-4095) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `soil_do` | int | Digital output (0 or 1) |
| `rssi` | int | WiFi signal strength in dBm (-100 to 0) |
| `battery_v` | float | Battery voltage (0-5.0V) |
| `firmware` | string | Firmware version |
| `ip` | string | Device IP address |
| `sampling_ms` | int | Sampling interval (1000-3600000 ms) |

## Derived Values

The service calculates percentage values from raw ADC readings:

- **soil_moisture_pct**: 0% (dry) to 100% (wet)
- **water_level_pct**: 0% (empty) to 100% (full)

Calibration thresholds are configurable via environment variables.

## Command Format

Commands sent to devices have this structure:

```json
{
  "type": "set_interval_ms",
  "value": 60000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Supported Commands

| Type | Value | Description |
|------|-------|-------------|
| `set_interval_ms` | int | Change sampling interval (1000-3600000 ms) |
| `reboot` | - | Restart the device |
| `calibrate` | - | Trigger sensor calibration |
| `update_firmware` | string | Trigger OTA update |

## REST API Endpoints

All endpoints are available at `/api/v1/iot/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all known devices |
| GET | `/devices/{device_id}/latest` | Get latest reading |
| GET | `/devices/{device_id}/range?from=...&to=...` | Get historical readings |
| POST | `/devices/{device_id}/cmd` | Send command to device |
| POST | `/telemetry` | Manual telemetry ingestion (testing) |

### Gateway Routes

Via the API Gateway, these endpoints are accessible at:
- `GET /api/v1/iot/devices`
- `GET /api/v1/iot/devices/{device_id}/latest`
- etc.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INFLUXDB_URL` | `http://influxdb:8086` | InfluxDB connection URL |
| `INFLUXDB_TOKEN` | - | InfluxDB authentication token |
| `INFLUXDB_ORG` | `smart-irrigation` | InfluxDB organization |
| `INFLUXDB_BUCKET` | `sensors` | InfluxDB bucket name |
| `MQTT_BROKER` | `mosquitto` | MQTT broker hostname |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_USERNAME` | - | MQTT authentication username |
| `MQTT_PASSWORD` | - | MQTT authentication password |
| `DEVICE_API_KEYS` | - | Device authentication keys (comma-sep or JSON) |

### Calibration Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `SOIL_ADC_DRY` | `4095` | ADC value when soil is dry |
| `SOIL_ADC_WET` | `1000` | ADC value when soil is wet |
| `WATER_ADC_EMPTY` | `4095` | ADC value when tank is empty |
| `WATER_ADC_FULL` | `500` | ADC value when tank is full |

## Local Development

### Running Standalone

```bash
cd services/iot_service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8006
```

### Running with Docker Compose

```bash
cd infrastructure/docker
docker-compose up iot-service influxdb mosquitto
```

### Testing MQTT

Using mosquitto_pub to simulate a device:

```bash
# Publish telemetry
mosquitto_pub -h localhost -t "devices/esp32-test/telemetry" -m '{
  "device_id": "esp32-test",
  "ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "soil_ao": 2500,
  "water_ao": 1500
}'
```

### Testing REST API

```bash
# Manual telemetry ingestion
curl -X POST http://localhost:8006/api/v1/iot/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "ts": "2024-01-15T10:30:00Z",
    "soil_ao": 2500,
    "water_ao": 1500
  }'

# Get latest reading
curl http://localhost:8006/api/v1/iot/devices/test-device/latest

# Send command
curl -X POST http://localhost:8006/api/v1/iot/devices/test-device/cmd \
  -H "Content-Type: application/json" \
  -d '{"type": "set_interval_ms", "value": 60000}'
```

## Running Tests

```bash
cd services/iot_service
pytest tests/ -v
```

## InfluxDB Schema

**Measurement:** `sensor_readings`

**Tags:**
- `device_id`: Device identifier

**Fields:**
- `soil_ao`: Soil moisture ADC value (int)
- `soil_do`: Soil moisture digital output (int, optional)
- `water_ao`: Water level ADC value (int)
- `soil_moisture_pct`: Soil moisture percentage (float)
- `water_level_pct`: Water level percentage (float)
- `rssi`: WiFi signal strength (int, optional)
- `battery_v`: Battery voltage (float, optional)

## ESP32 Client Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* mqtt_server = "your-mqtt-broker";
const char* device_id = "esp32-001";

WiFiClient espClient;
PubSubClient client(espClient);

void publishTelemetry() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = device_id;
  doc["ts"] = millis();  // or use NTP time
  doc["soil_ao"] = analogRead(SOIL_SENSOR_PIN);
  doc["water_ao"] = analogRead(WATER_SENSOR_PIN);
  doc["rssi"] = WiFi.RSSI();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  String topic = "devices/" + String(device_id) + "/telemetry";
  client.publish(topic.c_str(), buffer);
}

void onCommand(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<128> doc;
  deserializeJson(doc, payload, length);
  
  const char* cmdType = doc["type"];
  if (strcmp(cmdType, "set_interval_ms") == 0) {
    samplingInterval = doc["value"];
  } else if (strcmp(cmdType, "reboot") == 0) {
    ESP.restart();
  }
}

void setup() {
  client.setServer(mqtt_server, 1883);
  client.setCallback(onCommand);
  
  // Subscribe to commands
  String cmdTopic = "devices/" + String(device_id) + "/cmd";
  client.subscribe(cmdTopic.c_str());
}
```

## Health Check

The service exposes health endpoints:

- `GET /health` - Detailed health status including InfluxDB and MQTT connection state
- `GET /ready` - Readiness check for container orchestration

## Troubleshooting

### MQTT Connection Issues
- Check `MQTT_BROKER` hostname resolves correctly
- Verify Mosquitto is running: `docker-compose logs mosquitto`
- Check for authentication requirements

### InfluxDB Write Failures
- Verify `INFLUXDB_TOKEN` is set correctly
- Check organization and bucket exist
- View InfluxDB logs: `docker-compose logs influxdb`

### No Data Appearing
- Verify devices are publishing to correct topic
- Check telemetry format matches schema
- Review service logs for validation errors

# IoT Telemetry System - Setup Guide

This guide covers how to run the IoT telemetry ingestion system for ESP32 sensors.

## Architecture Overview

```
┌─────────────┐     MQTT      ┌─────────────┐     REST API    ┌─────────────┐
│   ESP32     │──────────────▶│ IoT Service │◀───────────────▶│  Frontend   │
│  Sensors    │  (port 1883)  │ (port 8006) │   (port 8000)   │ (port 5173) │
└─────────────┘               └──────┬──────┘                 └─────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  InfluxDB   │
                              │ (port 8086) │
                              └─────────────┘
```

## Prerequisites

- **Docker & Docker Compose** (recommended)
- **Python 3.11+** (for local development)
- **Node.js 18+** (for frontend)
- **ESP32 device** (optional - can simulate data)

---

## Quick Start with Docker Compose

### 1. Start IoT Services Only (Recommended)

Run only the IoT-related containers without starting the entire stack:

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\infrastructure\docker

# Start only IoT service + dependencies (InfluxDB, Mosquitto)
docker-compose up --build iot-service influxdb mosquitto
```

Or run in detached mode (background):

```powershell
docker-compose up -d --build iot-service influxdb mosquitto
```

### 2. Start All Services (Full Stack)

If you want to run everything including other microservices:

```powershell
docker-compose up --build
```

### 3. Start Frontend

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\web
npm install
npm run dev
```

### 3. Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8000 |
| IoT Service | http://localhost:8006 |
| InfluxDB | http://localhost:8086 |

Navigate to **Sensor Telemetry** in the sidebar to view live data.

---

## Useful Docker Commands

### Start/Stop IoT Services

```powershell
# Start IoT stack only
docker-compose up -d iot-service influxdb mosquitto

# Stop IoT stack only
docker-compose stop iot-service influxdb mosquitto

# Restart IoT service
docker-compose restart iot-service

# View IoT service logs
docker-compose logs -f iot-service

# View all IoT stack logs
docker-compose logs -f iot-service influxdb mosquitto
```

### Rebuild After Code Changes

```powershell
# Rebuild and restart IoT service only
docker-compose up -d --build iot-service

# Force rebuild without cache
docker-compose build --no-cache iot-service
docker-compose up -d iot-service
```

### Clean Up

```powershell
# Stop and remove IoT containers
docker-compose rm -sf iot-service influxdb mosquitto

# Remove IoT volumes (WARNING: deletes all data)
docker-compose down -v --remove-orphans
```

---

## Local Development Setup

### Step 1: Start Dependencies Only

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\infrastructure\docker
docker-compose up -d influxdb mosquitto
```

### Step 2: Run IoT Service

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\services\iot_service

# Create virtual environment (first time only)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --reload --port 8006
```

### Step 3: Run Frontend

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\web
npm install
npm run dev
```

---

## Testing Without ESP32 Hardware

### Option A: Use the REST API (Simulate Telemetry)

Send test data via the REST endpoint:

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:8006/api/v1/iot/telemetry" -Method POST -ContentType "application/json" -Body '{
  "device_id": "esp32-test-001",
  "soil_ao": 2048,
  "water_ao": 1500,
  "rssi": -55,
  "battery_v": 3.7
}'
```

Or using curl:

```bash
curl -X POST http://localhost:8006/api/v1/iot/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32-test-001",
    "soil_ao": 2048,
    "water_ao": 1500,
    "rssi": -55,
    "battery_v": 3.7
  }'
```

### Option B: Use MQTT (Simulate ESP32)

Publish to the MQTT broker using any MQTT client:

**Topic:** `devices/{device_id}/telemetry`

**Payload (JSON):**
```json
{
  "device_id": "esp32-test-001",
  "soil_ao": 2048,
  "water_ao": 1500,
  "rssi": -55,
  "battery_v": 3.7
}
```

Using mosquitto_pub:

```bash
mosquitto_pub -h localhost -p 1883 -t "devices/esp32-test-001/telemetry" -m '{
  "device_id": "esp32-test-001",
  "soil_ao": 2048,
  "water_ao": 1500,
  "rssi": -55,
  "battery_v": 3.7
}'
```

### Option C: Python Simulator Script

Create a file `simulate_esp32.py`:

```python
import paho.mqtt.client as mqtt
import json
import time
import random

BROKER_HOST = "localhost"
BROKER_PORT = 1883
DEVICE_ID = "esp32-sim-001"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER_HOST, BROKER_PORT, 60)

print(f"Simulating ESP32 device: {DEVICE_ID}")
print("Press Ctrl+C to stop\n")

try:
    while True:
        payload = {
            "device_id": DEVICE_ID,
            "soil_ao": random.randint(1000, 3500),
            "water_ao": random.randint(500, 3000),
            "rssi": random.randint(-80, -40),
            "battery_v": round(random.uniform(3.0, 4.2), 2)
        }
        
        topic = f"devices/{DEVICE_ID}/telemetry"
        client.publish(topic, json.dumps(payload))
        print(f"Published: {payload}")
        
        time.sleep(5)  # Send every 5 seconds
except KeyboardInterrupt:
    print("\nStopped")
    client.disconnect()
```

Run it:

```powershell
pip install paho-mqtt
python simulate_esp32.py
```

---

## ESP32 Firmware Configuration

For real ESP32 devices, configure your firmware to:

### MQTT Settings

| Setting | Value |
|---------|-------|
| Broker Host | Your server IP or `localhost` |
| Broker Port | `1883` |
| Topic | `devices/{DEVICE_ID}/telemetry` |

### Payload Format

```json
{
  "device_id": "esp32-unique-id",
  "soil_ao": 2048,
  "water_ao": 1500,
  "rssi": -55,
  "battery_v": 3.7
}
```

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | string | Unique device identifier |
| `soil_ao` | int | Soil moisture ADC reading (0-4095) |
| `water_ao` | int | Water level ADC reading (0-4095) |
| `rssi` | int | WiFi signal strength in dBm (optional) |
| `battery_v` | float | Battery voltage (optional) |

### Receiving Commands

Subscribe to: `devices/{DEVICE_ID}/cmd`

Command payload example:
```json
{
  "type": "set_interval_ms",
  "value": 30000
}
```

---

## API Endpoints

### IoT Service Endpoints (port 8006)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/iot/devices` | List all devices |
| GET | `/api/v1/iot/devices/{id}/latest` | Get latest reading |
| GET | `/api/v1/iot/devices/{id}/range` | Get historical data |
| POST | `/api/v1/iot/devices/{id}/cmd` | Send command to device |
| POST | `/api/v1/iot/telemetry` | Ingest telemetry via REST |
| GET | `/health` | Health check |

### Query Parameters for `/range`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start` | ISO datetime | 1 hour ago | Start time |
| `stop` | ISO datetime | now | End time |
| `limit` | int | 100 | Max records |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INFLUXDB_URL` | `http://localhost:8086` | InfluxDB connection URL |
| `INFLUXDB_TOKEN` | `dev-token-12345` | InfluxDB auth token |
| `INFLUXDB_ORG` | `smart-irrigation` | InfluxDB organization |
| `INFLUXDB_BUCKET` | `telemetry` | InfluxDB bucket name |
| `MQTT_BROKER_HOST` | `localhost` | MQTT broker hostname |
| `MQTT_BROKER_PORT` | `1883` | MQTT broker port |
| `SOIL_AO_DRY` | `4095` | ADC value for dry soil |
| `SOIL_AO_WET` | `1000` | ADC value for wet soil |
| `WATER_AO_EMPTY` | `4095` | ADC value for empty tank |
| `WATER_AO_FULL` | `500` | ADC value for full tank |

---

## Troubleshooting

### No devices showing up

1. Check if IoT service is running: `http://localhost:8006/health`
2. Check if MQTT broker is running: `docker ps | grep mosquitto`
3. Check IoT service logs: `docker logs iot-service`

### InfluxDB connection errors

1. Verify InfluxDB is running: `http://localhost:8086`
2. Check token matches in environment variables
3. Ensure bucket `telemetry` exists

### Frontend not loading data

1. Check browser console for errors
2. Verify gateway is routing correctly: `http://localhost:8000/api/v1/iot/devices`
3. Check CORS settings if running on different ports

### MQTT messages not received

1. Test MQTT connection:
   ```bash
   mosquitto_sub -h localhost -p 1883 -t "devices/#" -v
   ```
2. Check if IoT service MQTT client connected (check logs)

---

## Running Tests

```powershell
cd c:\Users\dilan\Projact\smart-irrigation-system\services\iot_service
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

---

## File Structure

```
services/iot_service/
├── app/
│   ├── api/
│   │   ├── health.py        # Health check endpoint
│   │   └── iot.py            # IoT REST endpoints
│   ├── core/
│   │   └── config.py         # Environment configuration
│   ├── iot/
│   │   ├── influx_repo.py    # InfluxDB operations
│   │   ├── mqtt_client.py    # MQTT subscriber
│   │   ├── schemas.py        # Pydantic models
│   │   └── service.py        # Business logic
│   └── main.py               # FastAPI application
├── tests/
│   ├── test_api.py
│   ├── test_schemas.py
│   └── test_service.py
├── Dockerfile
├── requirements.txt
└── README.md
```

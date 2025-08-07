# 🌾 Smart Irrigation System for Sri Lankan Agriculture

A proof-of-concept Smart Irrigation System designed for Sri Lankan agriculture, consisting of three independently running Python microservices maintained in a single monorepo. Each microservice is Dockerized and connected using docker-compose.

## 🏗️ System Architecture

### Services Overview

1. **Smart Irrigation Service** (Port 5001)
   - Reads soil moisture, temperature, and humidity data from simulated IoT sensors
   - Uses machine learning to predict irrigation needs
   - Sends control signals (water ON/OFF) to simulated actuators

2. **Autonomous Sediment Mapping Service** (Port 5002)
   - Accepts GPS and depth sensor data from simulated survey boats
   - Maps reservoir floor and identifies sediment buildup using ML clustering
   - Stores geospatial sediment map data

3. **Time-Series Forecasting Service** (Port 5003)
   - Collects water level, rainfall, and dam gate data
   - Uses time-series analysis to forecast floods or droughts
   - Triggers alerts for critical conditions

## 📁 Project Structure

```
smart-irrigation-system/
├── irrigation_service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       └── main.py
├── sediment_mapping_service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       └── main.py
├── forecasting_service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       └── main.py
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- At least 4GB RAM available for containers

### Setup & Launch

1. **Clone/Download the repository**
   ```bash
   git clone <repository-url>
   cd smart-irrigation-system
   ```

2. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

3. **Verify services are running**
   ```bash
   # Check container status
   docker-compose ps
   
   # View logs
   docker-compose logs -f
   ```

### Service URLs

Once running, the services will be available at:

- **Irrigation Service**: http://localhost:5001
- **Sediment Mapping Service**: http://localhost:5002
- **Forecasting Service**: http://localhost:5003

## 🔧 API Endpoints

### Irrigation Service (Port 5001)

- `GET /status` - Service health check
- `GET /sensor-data` - Get current sensor readings and irrigation predictions
- `POST /irrigation-control` - Manual irrigation control
  ```json
  {
    "action": "WATER_ON" // or "WATER_OFF"
  }
  ```

### Sediment Mapping Service (Port 5002)

- `GET /status` - Service health check
- `GET /collect-data` - Simulate collecting boat sensor data
- `GET /sediment-analysis` - Get sediment buildup analysis
- `POST /submit-data` - Submit external sensor data
  ```json
  {
    "gps_coordinates": {
      "latitude": 7.2905715,
      "longitude": 80.6337262
    },
    "depth_meters": 12.5,
    "sediment_thickness_cm": 3.2
  }
  ```

### Forecasting Service (Port 5003)

- `GET /status` - Service health check
- `GET /current-data` - Get current conditions and update data
- `GET /forecast?hours=24` - Get water level forecast (1-72 hours)
- `GET /risk-assessment` - Get flood/drought risk analysis
- `POST /submit-data` - Submit sensor data
  ```json
  {
    "water_level_percent": 75.5,
    "rainfall_mm": 12.3,
    "gate_opening_percent": 45.0
  }
  ```

## 🧪 Testing the System

### 1. Test Individual Services

```bash
# Test irrigation service
curl http://localhost:5001/status
curl http://localhost:5001/sensor-data

# Test sediment mapping
curl http://localhost:5002/status
curl http://localhost:5002/collect-data

# Test forecasting
curl http://localhost:5003/status
curl http://localhost:5003/current-data
```

### 2. Simulate Data Flow

```bash
# Generate irrigation data
curl http://localhost:5001/sensor-data

# Collect sediment mapping data
for i in {1..10}; do
  curl http://localhost:5002/collect-data
  sleep 1
done

# Get sediment analysis
curl http://localhost:5002/sediment-analysis

# Generate forecasting data and get predictions
curl http://localhost:5003/current-data
curl http://localhost:5003/forecast?hours=48
curl http://localhost:5003/risk-assessment
```

## 🛠️ Development

### Running Individual Services

```bash
# Run irrigation service only
docker-compose up irrigation-service

# Run with dependencies
docker-compose up irrigation-service sediment-mapping-service
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f irrigation-service
```

### Rebuild After Changes

```bash
# Rebuild specific service
docker-compose build irrigation-service

# Rebuild and restart
docker-compose up --build irrigation-service
```

## 🏭 Production Considerations

### For Sri Lankan Agricultural Deployment

1. **Sensor Integration**
   - Replace simulated data with real IoT sensors
   - Implement proper sensor calibration for Sri Lankan soil conditions
   - Add support for LoRaWAN or GSM connectivity for remote fields

2. **Machine Learning Improvements**
   - Train models with actual Sri Lankan agricultural data
   - Incorporate monsoon season patterns
   - Add crop-specific irrigation requirements

3. **Data Persistence**
   - Add PostgreSQL or MongoDB for data storage
   - Implement data backup and recovery
   - Add historical data analysis capabilities

4. **Security & Monitoring**
   - Add authentication and authorization
   - Implement proper logging and monitoring
   - Add SSL/TLS encryption for production APIs

### Scaling Options

```yaml
# Add to docker-compose.yml for scaling
services:
  irrigation-service:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 📊 Monitoring & Alerts

The system includes built-in monitoring:

- **Health Checks**: Each service has health check endpoints
- **Alert System**: Forecasting service generates flood/drought warnings
- **Logging**: Structured logging for all operations

### View System Status

```bash
# Check all service health
curl http://localhost:5001/status && \
curl http://localhost:5002/status && \
curl http://localhost:5003/status
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-sensor`)
3. Commit changes (`git commit -am 'Add new sensor type'`)
4. Push to branch (`git push origin feature/new-sensor`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Designed for Sri Lankan agricultural needs
- Built with modern microservices architecture
- Optimized for Docker containerization
- Ready for cloud deployment (Azure, AWS, GCP)

---

**🌱 Built for sustainable agriculture in Sri Lanka 🇱🇰**

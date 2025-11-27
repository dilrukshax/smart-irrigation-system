# Irrigation Service

Smart irrigation microservice providing ML-based irrigation predictions and IoT sensor data management.

## Features

- **ML-based Irrigation Predictions**: Uses RandomForestClassifier to predict irrigation needs
- **Sensor Data Simulation**: Simulates IoT sensor readings for development
- **Manual Control**: API for manual irrigation control override
- **RESTful API**: FastAPI-based API with automatic documentation

## Tech Stack

- **Framework**: FastAPI
- **ML**: scikit-learn (RandomForestClassifier)
- **Python**: 3.11+

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service information |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| GET | `/api/v1/status` | Service status with model state |
| GET | `/api/v1/sensor-data` | Get sensor readings with prediction |
| POST | `/api/v1/irrigation-control` | Manual irrigation control |
| POST | `/api/v1/predict` | Get prediction for custom sensor data |

## Running Locally

### Prerequisites

- Python 3.11+
- pip

### Setup

```bash
# Navigate to service directory
cd services/irrigation_service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the service
uvicorn app.main:app --reload --port 8002
```

### Docker

```bash
# Build image
docker build -t irrigation-service .

# Run container
docker run -p 8002:8002 irrigation-service
```

## API Documentation

When running, visit:
- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Project Structure

```
irrigation_service/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # Health check routes
│   │   └── sensors.py       # Sensor data routes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Configuration
│   │   └── logging_config.py
│   └── ml/
│       ├── __init__.py
│       └── irrigation_model.py  # ML model
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

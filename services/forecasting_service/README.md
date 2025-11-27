# Forecasting Service

Time-series forecasting microservice providing water level predictions and flood/drought risk assessments.

## Features

- **Water Level Forecasting**: Predicts water levels up to 72 hours ahead
- **Risk Assessment**: Analyzes flood and drought risks
- **Historical Data**: Maintains historical sensor data for analysis
- **External Data Input**: Accepts sensor data from external systems
- **RESTful API**: FastAPI-based API with automatic documentation

## Tech Stack

- **Framework**: FastAPI
- **ML**: scikit-learn (LinearRegression)
- **Python**: 3.11+

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service information |
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| GET | `/api/v1/status` | Service status with data summary |
| GET | `/api/v1/current-data` | Get current sensor readings |
| GET | `/api/v1/forecast` | Get water level forecast |
| GET | `/api/v1/risk-assessment` | Get flood/drought risk assessment |
| POST | `/api/v1/submit-data` | Submit external sensor data |

## Running Locally

### Prerequisites

- Python 3.11+
- pip

### Setup

```bash
# Navigate to service directory
cd services/forecasting_service

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
uvicorn app.main:app --reload --port 8003
```

### Docker

```bash
# Build image
docker build -t forecasting-service .

# Run container
docker run -p 8003:8003 forecasting-service
```

## API Documentation

When running, visit:
- Swagger UI: http://localhost:8003/docs
- ReDoc: http://localhost:8003/redoc

## Project Structure

```
forecasting_service/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   ├── __init__.py
│   │   ├── health.py        # Health check routes
│   │   └── forecast.py      # Forecasting routes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # Configuration
│   │   └── logging_config.py
│   └── ml/
│       ├── __init__.py
│       └── forecasting_system.py  # Forecasting ML system
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

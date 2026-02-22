# 🌊 Time-Series Forecasting Service

## Overview

**Advanced ML-powered forecasting service** for water resource management providing:
- Multi-model ensemble predictions (Random Forest, Gradient Boosting, LSTM)
- 72-hour water level forecasting with uncertainty quantification
- Flood and drought risk assessment with confidence scores
- 30+ engineered features for accurate predictions
- Real-time API endpoints for system integration

## ✨ New Features (v2.0)

### 🤖 Advanced ML Models
- **Random Forest**: 91.39% R² accuracy, best for non-linear patterns
- **Gradient Boosting**: 91.32% R², sequential error correction
- **LSTM Neural Network**: 89.68% R², deep learning for temporal dependencies
- **Quantile Regression**: Probabilistic forecasting with 80% prediction intervals

### 🎯 Enhanced Capabilities
- **30+ Engineered Features**: Lag features, rolling statistics, cyclical encoding
- **Model Comparison**: Automatic benchmarking and best model selection
- **Feature Importance**: Understand what drives predictions
- **Uncertainty Quantification**: 10th-90th percentile bounds
- **Production Ready**: Model persistence, error handling, comprehensive logging

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Service
```bash
python -m app.main
# Service runs on http://localhost:8002
```

### 3. Train ML Models (First Time)
```bash
curl -X POST http://localhost:8002/api/v2/train
```

### 4. Get Predictions
```bash
# 72-hour forecast with uncertainty
curl "http://localhost:8002/api/v2/forecast?hours=72&model=best&uncertainty=true"

# Risk assessment
curl http://localhost:8002/api/v2/risk-assessment

# Compare models
curl http://localhost:8002/api/v2/model-comparison
```

## 📡 API Endpoints

### Basic Endpoints (v1)
- `GET /api/v1/status` - Service status
- `GET /api/v1/current-data` - Current sensor readings
- `GET /api/v1/forecast?hours=24` - Basic linear forecast
- `GET /api/v1/risk-assessment` - Basic risk analysis

### Advanced ML Endpoints (v2) ⭐ NEW
- `POST /api/v2/train` - Train all ML models
- `GET /api/v2/forecast?hours=72&model=best&uncertainty=true` - ML forecast
- `GET /api/v2/model-comparison` - Compare model performance
- `GET /api/v2/risk-assessment` - ML-based risk with confidence
- `GET /api/v2/model-analysis/{model}` - Detailed model metrics
- `GET /api/v2/feature-importance?model=rf` - Feature rankings
- `POST /api/v2/update-data` - Retrain with new data

**📖 Full API Docs**: http://localhost:8002/docs

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

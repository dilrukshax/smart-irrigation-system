# Smart Irrigation System - Backend Services

This folder contains all backend microservices for the Adaptive Smart Irrigation & Crop Optimization Platform.

## Architecture Overview

```
backend/
├── aca_o_service/          # F4 - Adaptive Crop Area Optimization (Dilruksha)
├── forecasting_service/    # F3 - Yield & Price Forecasting (Yasiru)
├── irrigation_service/     # F1 - Smart Irrigation Scheduling (Dineth)
├── sediment_mapping_service/ # F2 - Crop Health Monitoring (Dulari) [To be created]
├── docker-compose.yml      # Container orchestration
├── health_check.py         # Service health monitoring script
└── start.bat              # Windows startup script
```

## Services

| Service | Port | Owner | Description |
|---------|------|-------|-------------|
| irrigation-service | 5001 | Dineth | Real-time IoT sensor data processing & irrigation scheduling |
| sediment-mapping-service | 5002 | Dulari | Satellite image processing & crop health analysis |
| forecasting-service | 5003 | Yasiru | Yield prediction & market price forecasting |
| aca-o-service | 8000 | Dilruksha | Multi-objective crop area optimization |

## Quick Start

### Using Docker Compose (Recommended)

```bash
cd backend
docker-compose up --build
```

### Running Individual Services

Each service can be run independently for development:

```bash
# F4 - ACA-O Service
cd aca_o_service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# F3 - Forecasting Service  
cd forecasting_service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 5003

# F1 - Irrigation Service
cd irrigation_service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 5001
```

### Using start.bat (Windows)

```batch
start.bat
```

## Service Communication

Services communicate via REST APIs:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   irrigation    │     │    sediment     │     │   forecasting   │
│    service      │     │    mapping      │     │    service      │
│    (5001)       │     │    (5002)       │     │    (5003)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     ACA-O Service      │
                    │        (8000)          │
                    │                        │
                    │  - Aggregates data     │
                    │  - Runs optimization   │
                    │  - Provides recs       │
                    └────────────────────────┘
```

## API Documentation

When services are running, OpenAPI documentation is available at:

- **ACA-O Service**: http://localhost:8000/docs
- **Irrigation Service**: http://localhost:5001/docs
- **Forecasting Service**: http://localhost:5003/docs
- **Sediment Mapping**: http://localhost:5002/docs

## Health Checks

Run the health check script to verify all services:

```bash
python health_check.py
```

## Environment Variables

Each service supports configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | sqlite:///./app.db | Database connection string |
| SERVICE_PORT | varies | Port the service listens on |
| LOG_LEVEL | INFO | Logging level |
| DEBUG | false | Enable debug mode |

## Development

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (for containerized deployment)
- pip or conda for dependency management

### Project Structure (per service)

```
service_name/
├── Dockerfile
├── requirements.txt
├── pyproject.toml
├── src/
│   ├── main.py           # FastAPI app entry point
│   ├── api/              # Route handlers
│   ├── core/             # Config, schemas, exceptions
│   ├── data/             # Database models & repositories
│   ├── services/         # Business logic
│   ├── ml/               # Machine learning models
│   └── features/         # Feature engineering
└── tests/
    └── test_*.py
```

## Testing

```bash
# Run tests for a specific service
cd aca_o_service
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

## Docker Commands

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f aca-o-service

# Stop all services
docker-compose down

# Rebuild a specific service
docker-compose up --build aca-o-service
```

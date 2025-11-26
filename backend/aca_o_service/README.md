# ACA-O Service (Adaptive Crop & Area Optimization)

A Python microservice built with **FastAPI** that provides adaptive crop recommendations and area optimization for smart irrigation systems.

## Overview

The ACA-O service is part of a larger smart irrigation system. It provides:

- **Adaptive Crop Recommendations**: Suggests optimal crops for each field based on soil conditions, water availability, climate forecasts, and market prices.
- **Mid-Season Replanning (Plan B)**: Recalculates recommendations when water quotas or market prices change.
- **National Supply Aggregation**: Provides aggregate statistics for agricultural managers to plan at a regional/national level.

## Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/f4/recommendations` | POST | Get adaptive crop recommendations for a field |
| `/f4/planb` | POST | Mid-season replanning with updated constraints |
| `/f4/national-supply` | GET | Aggregate supply/area per crop for managers |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│   (routes_health, routes_recommendations, routes_planb,     │
│    routes_supply)                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Service Layer                            │
│   (RecommendationService, PlanBService, SupplyService)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼───────┐ ┌───▼───┐ ┌───────▼───────┐
│   Features    │ │  ML   │ │ Optimization  │
│ (water_budget,│ │(yield,│ │  (LP/MIP      │
│  feature_     │ │price, │ │   optimizer)  │
│  builder)     │ │TOPSIS)│ │               │
└───────┬───────┘ └───┬───┘ └───────────────┘
        │             │
┌───────▼─────────────▼───────────────────────────────────────┐
│                    Data Layer                               │
│   (db.py, models_orm.py, repositories.py)                   │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Create a Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

Key environment variables:
- `APP_NAME`: Service name (default: `aca-o-service`)
- `APP_ENV`: Environment (development/production)
- `APP_PORT`: Port to run on (default: 5004)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL connection details

### 4. Run the Application

```bash
# From the aca_o_service directory
uvicorn src.main:app --reload --port 5004
```

Or with custom host/port:

```bash
uvicorn src.main:app --host 0.0.0.0 --port 5004 --reload
```

### 5. Access the API

- **API Docs (Swagger UI)**: http://localhost:5004/docs
- **ReDoc**: http://localhost:5004/redoc
- **Health Check**: http://localhost:5004/health

## Running with Docker

```bash
# Build the image
docker build -t aca-o-service .

# Run the container
docker run -p 5004:5004 --env-file .env aca-o-service
```

## Running Tests

```bash
pytest src/tests/ -v
```

## Project Structure

```
aca_o_service/
├── README.md
├── requirements.txt
├── .gitignore
├── .env.example
├── Dockerfile
└── src/
    ├── main.py                 # FastAPI app entry point
    ├── api/                    # API routes
    │   ├── routes_health.py
    │   ├── routes_recommendations.py
    │   ├── routes_planb.py
    │   └── routes_supply.py
    ├── core/                   # Core configuration and schemas
    │   ├── config.py
    │   ├── schemas.py
    │   ├── exceptions.py
    │   └── logging_config.py
    ├── data/                   # Database layer
    │   ├── db.py
    │   ├── models_orm.py
    │   └── repositories.py
    ├── features/               # Feature engineering
    │   ├── water_budget.py
    │   └── feature_builder.py
    ├── ml/                     # Machine learning models
    │   ├── suitability_fuzzy_topsis.py
    │   ├── yield_model.py
    │   ├── price_model.py
    │   └── inference.py
    ├── optimization/           # Optimization logic
    │   ├── constraints.py
    │   └── optimizer.py
    ├── services/               # Business logic services
    │   ├── recommendation_service.py
    │   ├── planb_service.py
    │   └── supply_service.py
    └── tests/                  # Unit tests
        ├── test_health.py
        └── test_recommendations_api.py
```

## Future Enhancements

- [ ] Implement real Fuzzy-TOPSIS algorithm for crop suitability
- [ ] Train and integrate actual yield prediction ML models
- [ ] Connect to real-time price APIs
- [ ] Implement full LP/MIP optimization with PuLP
- [ ] Add async database operations with asyncpg
- [ ] Integrate with IoT sensor data streams
- [ ] Add authentication and authorization

## License

This project is part of the Smart Irrigation System developed for educational purposes.

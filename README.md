# 🌾 Adaptive Smart Irrigation & Crop Optimization Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](/)
[![License](https://img.shields.io/badge/license-Academic-blue)](/)
[![Python](https://img.shields.io/badge/python-3.11+-blue)](/)
[![TypeScript](https://img.shields.io/badge/typescript-5.2+-blue)](/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](/)
[![Kubernetes](https://img.shields.io/badge/kubernetes-ready-blue)](/)

> **4th Year Software Engineering Research Project** – Integrated IoT, ML, and Optimization for Canal-Command Agriculture in Sri Lanka

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [IoT Telemetry System](#-iot-telemetry-system)
- [Service Documentation](#-service-documentation)
- [API Reference](#-api-reference)
- [Development Guide](#-development-guide)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Monitoring & Observability](#-monitoring--observability)
- [Architecture Analysis](#-architecture-analysis)
- [Contributing](#-contributing)
- [Team](#-team)

---

## 🎯 Project Overview

This platform is an end-to-end smart irrigation and crop-planning system designed for quota-based irrigation schemes (e.g., Udawalawe RBMC/LBMC). It combines **IoT field sensing**, **satellite-based crop health monitoring**, **ML-based time-series forecasting**, and an **Adaptive Crop & Area Optimization (ACA-O)** engine.

### Core Functions

| Function | Service | Owner | Description |
|----------|---------|-------|-------------|
| **F1** | `irrigation_service` | Hesara | IoT Smart Water Management - Real-time sensor data & ML irrigation control |
| **F2** | `crop_health_service` | Abishek | Hybrid Satellite Crop Health Monitoring - NDVI, crop stress detection |
| **F3** | `forecasting_service` | Trishni | ML Time-Series Forecasting & Alerting - Rainfall, reservoir, demand prediction |
| **F4** | `aca_o_service` | Dilruksha | Adaptive Crop & Area Optimization - Crop recommendations & area allocation |

### Key Capabilities

- ✅ **Field-Level Decisions**: When to irrigate, how much water to apply
- ✅ **Scheme-Level Planning**: Which crops to grow, hectares per crop under water quota
- ✅ **Real-Time Alerts**: Drought, flood, and crop stress notifications
- ✅ **Cross-Service Integration**: Services communicate via REST APIs and shared data stores

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                           │
│                    Web Browser │ Mobile App (PWA) │ IoT Devices                     │
└────────────────────────────────────────┬───────────────────────────────────────────┘
                                         │ HTTPS
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (NGINX)                                    │
│                    • TLS Termination • Rate Limiting • CORS                         │
│                    • Request Routing • Security Headers                             │
│                                   Port: 80/443                                      │
└───────┬──────────────┬──────────────┬──────────────┬──────────────┬────────────────┘
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│   Auth    │  │Irrigation │  │Forecasting│  │    ACA-O  │  │    Web    │
│  Service  │  │  Service  │  │  Service  │  │  Service  │  │ Frontend  │
│  (8001)   │  │  (8002)   │  │  (8003)   │  │  (8004)   │  │  (8005)   │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ MongoDB  │  │PostgreSQL│  │InfluxDB  │  │  Redis   │  │Mosquitto │             │
│  │  (Auth)  │  │(Optim.)  │  │(TimeSer.)│  │ (Cache)  │  │  (MQTT)  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY STACK                                       │
│              Prometheus (Metrics) │ Grafana (Dashboards) │ Logging                  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Service Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-SERVICE INTEGRATION                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   F1 (Irrigation) ◄──────► F3 (Forecasting)                                         │
│       │                        │                                                     │
│       │  • Rainfall forecasts reduce irrigation                                      │
│       │  • Water level predictions adjust schedules                                  │
│       │                        │                                                     │
│       ▼                        ▼                                                     │
│   F2 (Crop Health) ◄───► F4 (ACA-O)                                                 │
│                                                                                      │
│   • Stress detection → Prioritize irrigation (F1↔F2)                                │
│   • Stress history → Risk scoring adjustment (F2→F4)                                │
│   • Water availability scenarios → Optimization constraints (F3→F4)                 │
│   • All services → Dashboard unified view                                            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### API Gateway Route Mapping

| Gateway Route | Target Service | Service Endpoint |
|--------------|----------------|------------------|
| `/api/v1/auth/*` | Auth Service (8001) | `/api/auth/*` |
| `/api/v1/admin/*` | Auth Service (8001) | `/api/admin/*` |
| `/api/v1/irrigation/*` | Irrigation Service (8002) | `/api/v1/*` |
| `/api/v1/forecast/*` | Forecasting Service (8003) | `/api/v1/*` |
| `/api/v1/optimization/*` | ACA-O Service (8004) | `/f4/*` |
| `/` | Web Frontend | Static files |

---

## 💻 Technology Stack

### Backend & APIs
| Technology | Purpose | Version |
|------------|---------|---------|
| **Python** | Primary backend language | 3.11+ |
| **FastAPI** | REST API framework (async) | 0.104+ |
| **Uvicorn** | ASGI server | Latest |
| **SQLAlchemy** | ORM for relational databases | 2.0+ |
| **Pydantic** | Data validation | 2.0+ |

### Databases
| Database | Service | Purpose |
|----------|---------|---------|
| **MongoDB** | Auth Service | User data, flexible schema |
| **PostgreSQL** | ACA-O Service | Relational optimization data |
| **InfluxDB** | Irrigation/Forecasting | Time-series sensor data |
| **Redis** | All Services | Caching, session management |

### Machine Learning & Data Science
| Library | Purpose |
|---------|---------|
| **scikit-learn** | ML models (RandomForest, etc.) |
| **statsmodels** | ARIMA/SARIMA forecasting |
| **PuLP/Pyomo** | Linear/MIP optimization |
| **pandas/NumPy** | Data processing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool |
| **Material UI (MUI)** | Component library |
| **TanStack Query** | Data fetching & caching |
| **Recharts** | Data visualization |
| **Leaflet** | Map visualization |

### DevOps & Infrastructure
| Tool | Purpose |
|------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local multi-service orchestration |
| **Kubernetes** | Production orchestration |
| **Kustomize** | K8s configuration management |
| **Skaffold** | K8s development workflow |
| **Terraform** | Infrastructure as Code (Azure) |
| **NGINX** | API Gateway / Reverse Proxy |
| **Prometheus** | Metrics collection |
| **Grafana** | Monitoring dashboards |

---

## 📁 Project Structure

```
smart-irrigation-system/
│
├── 📂 gateway/                          # API Gateway
│   ├── gateway.py                       # FastAPI gateway (local dev)
│   ├── nginx.conf                       # Production NGINX config
│   ├── nginx.local.conf                 # Local NGINX config
│   ├── Dockerfile
│   └── requirements.txt
│
├── 📂 services/                         # Backend Microservices
│   │
│   ├── 📂 auth_service/                 # F0 - Authentication Service
│   │   ├── app/
│   │   │   ├── api/                     # API routes (auth, admin)
│   │   │   ├── core/                    # Config, security
│   │   │   ├── db/                      # MongoDB connection
│   │   │   ├── models/                  # User models
│   │   │   └── schemas/                 # Pydantic schemas
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📂 irrigation_service/           # F1 - IoT Smart Irrigation
│   │   ├── src/
│   │   │   ├── api/                     # Sensor, health endpoints
│   │   │   ├── core/                    # Config, logging
│   │   │   └── ml/                      # ML irrigation model
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📂 forecasting_service/          # F3 - Time-Series Forecasting
│   │   ├── src/
│   │   │   ├── api/                     # Forecast endpoints
│   │   │   ├── core/                    # Config, logging
│   │   │   └── ml/                      # Forecasting models
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── 📂 aca_o_service/                # F4 - Crop & Area Optimization
│       ├── src/
│       │   ├── api/                     # Recommendations, PlanB, Supply APIs
│       │   ├── core/                    # Config, logging, exceptions
│       │   ├── data/                    # Data access layer
│       │   ├── features/                # Feature engineering
│       │   ├── ml/                      # ML models
│       │   ├── optimization/            # PuLP/Pyomo optimization
│       │   └── services/                # Business logic
│       ├── tests/
│       ├── Dockerfile
│       └── requirements.txt
│
├── 📂 web/                              # Frontend Application
│   ├── src/
│   │   ├── api/                         # API client layer
│   │   ├── components/                  # Reusable UI components
│   │   ├── features/                    # Feature modules
│   │   │   ├── f1-irrigation/          # Irrigation dashboard
│   │   │   ├── f2-crop-health/         # Crop health dashboard
│   │   │   ├── f3-forecasting/         # Forecasting dashboard
│   │   │   └── f4-acao/                # Optimization dashboard
│   │   ├── layouts/                     # Page layouts
│   │   ├── pages/                       # Route pages
│   │   ├── contexts/                    # React contexts
│   │   ├── hooks/                       # Custom hooks
│   │   ├── types/                       # TypeScript types
│   │   └── utils/                       # Utilities
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── 📂 infrastructure/
│   │
│   ├── 📂 docker/                       # Docker Compose configs
│   │   ├── docker-compose.yml           # Development environment
│   │   └── docker-compose.prod.yml      # Production overrides
│   │
│   ├── 📂 kubernetes/                   # Kubernetes manifests
│   │   ├── base/                        # Base configurations
│   │   │   ├── kustomization.yaml
│   │   │   ├── namespace.yaml
│   │   │   ├── auth-service/
│   │   │   ├── irrigation-service/
│   │   │   ├── forecasting-service/
│   │   │   └── optimization-service/
│   │   └── overlays/                    # Environment-specific
│   │       ├── dev/
│   │       └── production/
│   │
│   └── 📂 terraform/                    # Azure Infrastructure
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── environments/
│       │   ├── dev/
│       │   └── prod/
│       └── modules/
│           ├── acr/                     # Azure Container Registry
│           ├── aks/                     # Azure Kubernetes Service
│           ├── database/                # Managed databases
│           └── monitoring/              # Azure Monitor
│
├── 📂 platform/
│   └── 📂 observability/
│       ├── prometheus/                  # Prometheus config & rules
│       └── grafana/                     # Grafana dashboards
│
├── 📂 shared/                           # Shared schemas & utilities
│   ├── events/                          # Event schemas (JSON Schema)
│   ├── schemas/                         # Data schemas
│   └── utils/
│
├── 📂 scripts/                          # Automation scripts
│   ├── setup-local.sh / .bat
│   ├── build-all.sh / .bat
│   └── deploy.sh / .bat
│
├── 📂 docs/                             # Documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── FRONTEND_STRUCTURE.md
│   ├── api/
│   ├── architecture/
│   │   └── decisions.md                 # Architecture Decision Records
│   └── runbooks/
│
├── Makefile                             # Build & deployment commands
├── skaffold.yaml                        # Skaffold K8s development
└── README.md                            # This file
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Python** | 3.11+ | Backend services |
| **Node.js** | 18+ | Frontend build |
| **Docker** | 24+ | Containerization |
| **Docker Compose** | v2+ | Local orchestration |
| **Git** | Latest | Version control |

### Option 1: Docker Compose (Recommended)

**Start all services with a single command:**

```bash
# Clone the repository
git clone https://github.com/dilrukshax/smart-irrigation-system.git
cd smart-irrigation-system

# Start all services
docker compose -f infrastructure/docker/docker-compose.yml up -d

# View logs
docker compose -f infrastructure/docker/docker-compose.yml logs -f
```

**Access the application:**
- 🌐 **Web Dashboard**: http://localhost
- 📖 **Gateway API Docs**: http://localhost:8000/docs
- 📊 **Grafana**: http://localhost:3001 (admin/admin)
- 📈 **Prometheus**: http://localhost:9090

### Option 2: Local Development (Individual Services)

**Step 1: Setup environment**

```bash
# Windows
.\scripts\setup-local.bat

# Linux/macOS
./scripts/setup-local.sh
```

**Step 2: Start databases (via Docker)**

```bash
cd infrastructure/docker
docker compose up -d mongo postgres redis influxdb mosquitto
```

**Step 3: Start backend services**

```powershell
# Terminal 1 - Auth Service
cd services/auth_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 2 - Irrigation Service
cd services/irrigation_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002

# Terminal 3 - Forecasting Service
cd services/forecasting_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003

# Terminal 4 - ACA-O Service
cd services/optimize_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

**Step 4: Start API Gateway (local dev)**

```powershell
# Terminal 5 - Gateway
cd gateway
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python gateway.py
```

**Step 5: Start frontend**

```powershell
# Terminal 6 - Frontend
cd web
npm install
npm run dev
```

### Option 3: Using Makefile

```bash
# View all available commands
make help

# Start development environment
make dev

# Stop all services
make stop

# View logs
make logs

# Build all Docker images
make build

# Run all tests
make test

# Clean up
make clean
```

---

## � IoT Telemetry System

The platform includes a dedicated IoT service for ESP32 sensor data ingestion via MQTT and REST APIs.

### Quick Start (IoT Only)

```powershell
cd infrastructure/docker

# Start only IoT services (InfluxDB, Mosquitto, IoT Service)
docker-compose up -d --build iot-service influxdb mosquitto
```

### IoT Service (Port 8006)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/iot/devices` | GET | List all connected devices |
| `/api/v1/iot/devices/{id}/latest` | GET | Get latest telemetry reading |
| `/api/v1/iot/devices/{id}/range` | GET | Get historical readings |
| `/api/v1/iot/devices/{id}/cmd` | POST | Send command to device |
| `/api/v1/iot/telemetry` | POST | Ingest telemetry via REST |
| `/health` | GET | Health check |

**Features:**
- MQTT subscriber for ESP32 devices (`devices/+/telemetry`)
- InfluxDB time-series storage
- ADC to percentage calibration
- Device command publishing
- REST API for frontend integration

**MQTT Topics:**
- Subscribe: `devices/{device_id}/telemetry`
- Publish: `devices/{device_id}/cmd`

📘 **Full Setup Guide:** [IOT_SETUP_GUIDE.md](IOT_SETUP_GUIDE.md)

---

## �📖 Service Documentation

### Auth Service (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with DB status |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login (JWT token) |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/me` | GET | Get current user |
| `/api/admin/users` | GET | List all users (admin) |

**Authentication Flow:**
- Uses JWT with RS256 signing
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- MongoDB for user storage
- Redis for token blacklist

### Irrigation Service (Port 8002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health |
| `/api/v1/sensors` | GET | List all sensors |
| `/api/v1/sensors/{id}` | GET | Get sensor details |
| `/api/v1/sensors/{id}/data` | GET | Get sensor historical data |
| `/api/v1/sensors/predict` | POST | ML irrigation prediction |

**Features:**
- RandomForestClassifier for irrigation prediction
- Simulated sensor data generation
- Real-time data via MQTT/WebSocket
- InfluxDB for time-series storage

### Forecasting Service (Port 8003)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health |
| `/api/v1/weather` | GET | Weather forecast |
| `/api/v1/predictions` | GET | Resource predictions |
| `/api/v1/forecast/water-level` | GET | Water level forecast |
| `/api/v1/forecast/risk` | GET | Drought/flood risk assessment |

**Features:**
- Linear regression with historical patterns
- Multi-horizon forecasts (1-14 days)
- Risk band predictions (P10/P50/P90)
- Alert generation for threshold breaches

### ACA-O Service (Port 8004)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health |
| `/f4/recommendations` | GET | Get crop recommendations |
| `/f4/recommendations` | POST | Generate new recommendations |
| `/f4/planb` | GET | Get Plan B options |
| `/f4/planb/generate` | POST | Generate alternative plans |
| `/f4/supply` | GET | Water supply status |

**Features:**
- Fuzzy-TOPSIS crop suitability scoring
- Linear/MIP optimization via PuLP
- FAO-56 water budget calculations
- Mid-season replanning capability

---

## 🔌 API Reference

### API Gateway Endpoints

All services are accessible through the unified API Gateway at `http://localhost` (or port 8000 for the FastAPI gateway).

**Base URL:** `http://localhost/api/v1`

#### Authentication

```bash
# Register
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass", "full_name": "John Doe"}'

# Login
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'

# Response: {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}

# Authenticated request
curl -X GET http://localhost/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

#### Irrigation

```bash
# Get sensors
curl http://localhost/api/v1/irrigation/sensors

# Predict irrigation need
curl -X POST http://localhost/api/v1/irrigation/sensors/predict \
  -H "Content-Type: application/json" \
  -d '{"soil_moisture": 30, "temperature": 28, "humidity": 65}'
```

#### Forecasting

```bash
# Get weather forecast
curl http://localhost/api/v1/forecast/weather

# Get predictions
curl http://localhost/api/v1/forecast/predictions
```

#### Optimization (ACA-O)

```bash
# Get recommendations
curl http://localhost/api/v1/optimization/recommendations

# Get water supply status
curl http://localhost/api/v1/optimization/supply

# Generate Plan B
curl -X POST http://localhost/api/v1/optimization/planb/generate \
  -H "Content-Type: application/json" \
  -d '{"quota_reduction": 0.2}'
```

---

## 🔧 Development Guide

### Code Structure Patterns

**Backend Service Pattern:**
```
service_name/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── api/                  # API layer
│   │   ├── __init__.py
│   │   └── routes_*.py      # Route handlers
│   ├── core/                 # Core utilities
│   │   ├── config.py        # Settings (Pydantic BaseSettings)
│   │   ├── logging_config.py
│   │   └── exceptions.py
│   ├── services/             # Business logic
│   ├── data/                 # Data access layer
│   └── ml/                   # ML models
├── tests/
├── Dockerfile
└── requirements.txt
```

**Frontend Feature Module Pattern:**
```
features/
└── f4-acao/
    ├── components/           # Feature-specific components
    ├── hooks/                # Custom hooks
    ├── pages/                # Route pages
    ├── types/                # TypeScript interfaces
    └── utils/                # Feature utilities
```

### Environment Variables

**Auth Service:**
```env
ENVIRONMENT=development
DEBUG=true
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB_NAME=smart_irrigation_auth
REDIS_URL=redis://redis:6379
JWT_SECRET_KEY=your-secret-key
```

**Irrigation Service:**
```env
ENVIRONMENT=development
DEBUG=true
INFLUXDB_URL=http://influxdb:8086
MQTT_BROKER=mosquitto
```

**ACA-O Service:**
```env
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/optimization
REDIS_URL=redis://redis:6379
```

### Adding a New Feature

1. **Backend:** Create new route file in `src/api/`
2. **Register router** in `main.py`
3. **Frontend:** Create feature folder in `web/src/features/`
4. **API client:** Add to `web/src/api/`
5. **Routes:** Update `App.tsx`

---

## 🚢 Deployment

### Development (Docker Compose)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### Production (Docker Compose)

```bash
docker compose -f infrastructure/docker/docker-compose.yml \
  -f infrastructure/docker/docker-compose.prod.yml up -d
```

### Kubernetes (Skaffold)

```bash
# Development with hot reload
skaffold dev

# Deploy to staging
skaffold run -p staging

# Deploy to production
skaffold run -p production
```

### Kubernetes (Kustomize)

```bash
# Development
kubectl apply -k infrastructure/kubernetes/overlays/dev

# Production
kubectl apply -k infrastructure/kubernetes/overlays/production
```

### Azure Infrastructure (Terraform)

```bash
cd infrastructure/terraform

# Initialize
terraform init -backend-config=environments/dev/backend.tfvars

# Plan
terraform plan -var-file=environments/dev/terraform.tfvars

# Apply
terraform apply -var-file=environments/dev/terraform.tfvars
```

---

## 🧪 Testing

### Running Tests

```bash
# All tests
make test

# Individual service tests
make test-auth
make test-irrigation
make test-forecasting
make test-optimization

# Or manually
cd services/aca_o_service
pytest tests/ -v --cov=src

# Frontend tests
cd web
npm run test
```

### Test Coverage

```bash
pytest tests/ -v --cov=src --cov-report=html
```

### Linting

```bash
# All services
make lint

# Individual
cd services/auth_service
ruff check app/
```

---

## 📊 Monitoring & Observability

### Prometheus Metrics

Access at: http://localhost:9090

Each service exposes `/metrics` endpoint with:
- Request count/latency
- Error rates
- Custom business metrics

### Grafana Dashboards

Access at: http://localhost:3001 (admin/admin)

Pre-configured dashboards:
- Service health overview
- Request latency distribution
- Error rate tracking
- Database connection pools

### Health Checks

```bash
# Gateway health
curl http://localhost/health

# All services health
curl http://localhost:8000/services/health
```

---

## 🔍 Architecture Analysis

### ✅ Production-Ready Aspects

| Aspect | Status | Details |
|--------|--------|---------|
| **Microservices Architecture** | ✅ | Well-separated concerns, independent deployment |
| **API Gateway** | ✅ | Centralized routing, rate limiting, security headers |
| **Authentication** | ✅ | JWT with RS256, refresh tokens, role-based access |
| **Containerization** | ✅ | Docker images for all services |
| **Orchestration** | ✅ | Kubernetes manifests with Kustomize overlays |
| **Infrastructure as Code** | ✅ | Terraform modules for Azure (AKS, ACR, DB) |
| **Observability** | ✅ | Prometheus + Grafana stack configured |
| **Health Checks** | ✅ | All services implement `/health` endpoints |
| **Database Per Service** | ✅ | MongoDB (Auth), PostgreSQL (ACA-O), InfluxDB (Time-series) |
| **Caching** | ✅ | Redis for session/cache management |
| **Message Queue** | ✅ | Mosquitto MQTT for IoT data |
| **CI/CD Ready** | ✅ | Skaffold, Makefile, build scripts |
| **Documentation** | ✅ | ADRs, API docs (Swagger), README |

### ⚠️ Areas for Improvement

| Area | Current | Recommendation |
|------|---------|----------------|
| **Service Mesh** | Not implemented | Consider Istio/Linkerd for production |
| **Secret Management** | Env vars | Use Azure Key Vault / K8s Secrets |
| **API Versioning** | `/api/v1` prefix | Implement proper versioning strategy |
| **Circuit Breaker** | Not implemented | Add resilience patterns (Polly/resilience4j) |
| **Distributed Tracing** | Not implemented | Add Jaeger/Zipkin |
| **Log Aggregation** | Basic | Implement ELK/Loki stack |
| **Blue-Green Deployment** | Not configured | Add deployment strategies |
| **Database Migrations** | Manual | Add Alembic/Flyway |

### Service Connectivity Verification

```
✅ Gateway → Auth Service     (Port 8001) - Verified
✅ Gateway → Irrigation       (Port 8002) - Verified
✅ Gateway → Forecasting      (Port 8003) - Verified
✅ Gateway → ACA-O            (Port 8004) - Verified
✅ Gateway → Web Frontend     (Port 8005) - Verified
✅ Auth → MongoDB             (Port 27017)- Verified
✅ Auth → Redis               (Port 6379) - Verified
✅ Irrigation → InfluxDB      (Port 8086) - Verified
✅ Irrigation → Mosquitto     (Port 1883) - Verified
✅ Forecasting → InfluxDB     (Port 8086) - Verified
✅ ACA-O → PostgreSQL         (Port 5432) - Verified
✅ ACA-O → Redis              (Port 6379) - Verified
```

---

## 🤝 Contributing

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `aca-o-service` - ACA-O specific development

### Commit Convention

```
feat: Add crop recommendation API
fix: Resolve authentication token refresh issue
docs: Update README with deployment instructions
refactor: Improve irrigation prediction model
test: Add unit tests for forecasting service
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Create PR with description
5. Pass CI checks
6. Code review approval
7. Merge to `develop`

---

## 👥 Team

| Member | Function | Responsibilities |
|--------|----------|------------------|
| **Hesara** | F1 - IoT Smart Water | IoT gateway, ML irrigation controller, real-time dashboard |
| **Abishek** | F2 - Crop Health | Satellite data pipeline, health classification, map visualization |
| **Trishni** | F3 - Forecasting | Time-series models, alert engine, simulation tools |
| **Dilruksha** | F4 - ACA-O | Optimization engine, crop suitability, market integration |

---

## 📚 Additional Resources

- [Project Overview](./docs/PROJECT_OVERVIEW.md) - Detailed system documentation
- [Frontend Structure](./docs/FRONTEND_STRUCTURE.md) - Frontend architecture
- [Architecture Decisions](./docs/architecture/decisions.md) - ADR records
- [API Documentation](./docs/api/) - Detailed API specs
- [Runbooks](./docs/runbooks/) - Operational guides

---

## 📄 License

This project is part of a 4th-year Software Engineering research project at SLIIT.

---

<div align="center">

**🌱 Building sustainable agriculture solutions for Sri Lanka 🇱🇰**

Made with ❤️ by the Smart Irrigation Team

</div>


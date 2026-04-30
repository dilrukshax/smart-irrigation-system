# CLAUDE.md — Smart Irrigation System

## Project Identity

**Name:** Adaptive Smart Irrigation and Crop Optimization Platform
**Type:** Full-stack, multi-service research platform (IoT + ML + Optimization + Web Dashboard)
**Domain:** Irrigation decision support and crop planning for quota-based irrigation schemes (Sri Lanka)
**Status:** 4th Year Software Engineering Research Project — 4-person team

### Current Project Idea

This repository is the working codebase for an adaptive smart irrigation platform that connects farmers, officers, and authorities through a single Next.js dashboard and a FastAPI microservice backend. The product idea is to combine field registration, ESP32 telemetry, irrigation control, satellite crop-stress signals, weather and reservoir forecasts, and crop/area optimization so each field can receive practical water and crop-planning guidance under limited scheme-level water quotas.

The active implementation is code-first: `services/*/app/`, `apps/web/src/`, gateway tests, service tests, Alembic migrations, infrastructure manifests, and ESP32 firmware are the source of truth. Documentation files can be useful context, but when they disagree with code, trust code and update `CLAUDE.md` to reflect the code-level reality.

---

## Team Structure (4 Functional Streams)

| Stream | Owner | Service | Port | Responsibility |
|--------|-------|---------|------|----------------|
| **F0** | Shared | `auth_service` | 8001 | Authentication, JWT, role-based access control |
| **F1** | Hesara | `irrigation_service` | 8002 | Field registration, device pairing, telemetry ingestion, valve decisions, water management, authority policies |
| **F2** | Abishek | `crop_health_and_water_stress_detection` | 8007 | Satellite zone health, image disease prediction, stress detection |
| **F3** | Trishni | `forecasting_service` | 8003 | Time-series forecasting, weather intelligence, risk alerts |
| **F4** | Dilruksha | `optimize_service` | 8004 | Crop suitability, area optimization, water budgeting, Plan B |
| **IoT** | Shared | `iot_service` | 8006 | MQTT telemetry ingest, device commands, ESP32 bridge |
| **Web** | Shared | `apps/web/` | 3000 (dev) | Next.js 16 dashboard app — farmers, officers, authority |
| **GW** | Shared | `gateway_service` | 8000 | API gateway, unified routing, header forwarding |
| **CFG** | Shared | `config_server` | 8010 | Runtime config registry for local/Docker service startup |

---

## Architecture Snapshot

```
Clients (Browser / Mobile PWA / ESP32)
         │ HTTPS / MQTT
         ▼
┌─────────────────────────────────────┐
│   API Gateway  (FastAPI, port 8000) │
│   TLS • Rate Limit • Route Proxy    │
└──┬───────┬──────┬──────┬────────────┘
   │       │      │      │
   ▼       ▼      ▼      ▼
Auth    F1-Irrig  F3-Fore F4-ACA-O
(8001)  (8002)   (8003)  (8004)
                            ▲
                     F2-CropHealth (8007)
                     IoT Service  (8006)
         │
         ▼
┌──────────────────────────────────┐
│  PostgreSQL • Redis • MQTT       │
│  (InfluxDB referenced, not live) │
└──────────────────────────────────┘
         │
         ▼
Prometheus + Grafana (observability)
```

### Cross-Service Integration Map
- **F1 → F3**: Pulls rainfall/water-level forecasts to adjust irrigation schedules
- **F1 → F2**: Pulls crop stress summaries to prioritize valve decisions
- **F1 → F4**: Receives field water context from optimization service
- **F4 → F1/F2/F3**: Pulls field data, stress history, and forecast risk for optimization constraints
- **IoT → F1**: Bridges MQTT telemetry to field sensor ingestion endpoint
- **ESP32 → IoT**: Publishes ADC sensor readings over MQTT topic `devices/{id}/telemetry`

---

## Repository Map

```
smart-irrigation-system/
├── services/
│   ├── gateway_service/             # API gateway (port 8000)
│   ├── auth_service/                # JWT auth, user roles (port 8001)
│   ├── irrigation_service/          # F1 (port 8002)
│   ├── forecasting_service/         # F3 (port 8003)
│   ├── optimize_service/            # F4 (port 8004)
│   ├── iot_service/                 # IoT telemetry bridge (port 8006)
│   ├── crop_health_and_water_stress_detection/  # F2 (port 8007)
│   └── config_server/               # Runtime config registry (port 8010)
├── apps/
│   └── web/                         # Next.js 16 dashboard + public routes (port 3000 dev)
├── web/                             # Legacy stub — contains only .next cache, not in active use
├── hardware/esp32/                  # ESP32 sensor firmware
├── infrastructure/
│   ├── docker/docker-compose.yml    # Local full-stack
│   ├── kubernetes/                  # K8s manifests + Kustomize overlays
│   └── terraform/                   # Azure IaC (AKS, ACR, DB, Monitoring)
├── platform/observability/          # Prometheus rules + Grafana configs
├── shared/                          # Shared placeholders; no active runtime code currently
├── docs/                            # Documentation; not source of truth when code differs
├── services/*/notebooks/            # Service-local ML notebooks and artifacts
├── AGENT.md                         # Operational guide (humans + AI agents)
├── README.md
├── Makefile
├── skaffold.yaml
└── start-all.ps1                    # Windows dev startup
```

---

## Technology Stack

| Category | Technology | Details |
|----------|-----------|---------|
| Backend language | Python 3.11+ | All microservices |
| Backend framework | FastAPI + Uvicorn | Async ASGI, all services |
| ORM | SQLAlchemy 2.0+ | Async sessions |
| Validation | Pydantic 2.0+ | Request/response models |
| Primary database | PostgreSQL 12+ | All services |
| Cache | Redis | Sessions, caching layer |
| Message broker | Mosquitto MQTT 2.0 | IoT telemetry |
| ML — classification | scikit-learn 1.3+ | RandomForest (F1) |
| ML — deep learning | TensorFlow/Keras 2.15+ | MobileNetV2 (F2) |
| ML — time-series | statsmodels 0.14+ | ARIMA/SARIMA (F3) |
| ML — optimization | PuLP 2.7+ | Linear/MIP programming (F4) |
| ML — MCDA | NumPy + custom | Fuzzy-TOPSIS (F4) |
| Data processing | pandas, NumPy | All ML services |
| Frontend language | TypeScript 5.2+ | Next.js codebase |
| Frontend framework | Next.js 16 + React 19 | App Router frontend |
| UI styling | Tailwind CSS v4 + global CSS | Active `apps/web` app |
| Routing | Next.js App Router | File-based frontend navigation |
| HTTP client | Fetch wrappers | `apps/web/src/lib/api.ts` |
| Containerization | Docker 24+ | Service images |
| Orchestration | Kubernetes 1.28+ | Production cluster |
| K8s config | Kustomize | Env overlays |
| Dev workflow | Skaffold | K8s hot-reload dev |
| Cloud IaC | Terraform + Azure | AKS, ACR, databases |
| Monitoring | Prometheus + Grafana | Metrics + dashboards |
| CI/CD | GitHub Actions | Build, test, deploy |

---

## F0 — Auth Service (`services/auth_service`, port 8001)

### What it does
- User registration, login, token refresh, `/me`
- Authority user management (create, update, role assignment, status, delete)
- JWT issuance and verification (HS256, Access: 15 min, Refresh: 7 days)
- Role model: `farmer`, `officer`, `authority`

### Key files
- `app/main.py` — FastAPI entry
- `app/api/routes/auth.py` — `/api/auth/*`
- `app/api/routes/authority.py` — `/api/authority/*`
- `app/db/postgres.py` — async PostgreSQL session
- `app/models/user.py` — ORM user model
- `app/core/config.py` — JWT settings

### API prefixes
- `/api/auth/*` — registration, login, refresh, me
- `/api/authority/*` — authority-level user management

### Notes
- Active code uses **PostgreSQL** (not MongoDB). A Mongo module exists but is not in the active import path.
- Token strategy: `localStorage` (primary, for API calls) + `asi_access_token` cookie (for Next.js proxy route protection). Both are set on login and cleared on logout.

---

## F1 — Irrigation Service (`services/irrigation_service`, port 8002)

### What it does
- IoT sensor data ingestion (soil moisture, temperature, humidity, water level)
- ML-driven auto valve open/close decisions (RandomForest model)
- Manual request + approval workflow when auto-control is gated
- Crop field profile management (create, update, pair device)
- Reservoir snapshot tracking and water-release prediction
- Cross-service decision blending (F3 rainfall forecast + F2 stress summary)

### ML Model — SmartIrrigationSystem (RandomForestClassifier)
| Attribute | Detail |
|-----------|--------|
| Algorithm | scikit-learn `RandomForestClassifier` |
| Version | 1.1.0 |
| Inputs | `soil_moisture` (%), `temperature` (°C), `humidity` (%), `hour_of_day` (0–24) |
| Output | Binary: 0 = no irrigation, 1 = irrigate |
| Training data | Synthetic, 1 000 samples; rule: irrigate if `soil_moisture < 30%` AND `temperature > 25°C` |
| Feature ranges | soil: 0–100, temp: 20–40°C, humidity: 30–90%, hour: 0–24 (uniform random) |
| Hyperparameters | `n_estimators=10`, `random_state=42` |
| Artifact | `services/irrigation_service/notebooks/irrigation_rf_model.joblib` |
| Fallback | Trains fresh with synthetic data if artifact not found |

### Key files
- `app/main.py`
- `app/ml/irrigation_model.py` — RandomForest wrapper
- `app/ml/water_management_model.py` — water management logic
- `app/api/farm_ops.py` — active field CRUD, device pairing, telemetry, irrigation, policy, and hydraulic routes
- `app/api/sensors.py` — legacy/basic sensor routes
- `app/api/water_management.py` — reservoir + override endpoints
- `app/db/models.py` — ORM models

### Active router note
`app/main.py` mounts `health`, `sensors`, `water_management`, and `farm_ops`. `app/api/crop_fields.py` exists in the tree but is not mounted by the active FastAPI app; do not add new field workflows there unless the router is intentionally restored and tested.

### Database tables (PostgreSQL)
```
irrigation_crop_fields
irrigation_valve_states
irrigation_sensor_readings
irrigation_manual_requests
irrigation_manual_request_audit
irrigation_device_pairings
irrigation_reservoir_snapshots
irrigation_hydraulic_schedules
irrigation_hydraulic_topology_nodes
irrigation_authority_policies
irrigation_authority_policy_audit
irrigation_water_management_state
```

### Key API endpoints (internal prefix `/api/v1`; gateway prefixes shown in Gateway Integration)
```
GET    /farm/crops/defaults                    Crop defaults
POST   /farm/fields                            Create field
GET    /farm/fields                            List fields
GET    /farm/fields/{id}                       Get field
PATCH  /farm/fields/{id}                       Update field
POST   /farm/fields/{id}/confirm-crop          Confirm selected crop
DELETE /farm/fields/{id}                       Delete field
POST   /devices/pairing/initiate               Start device pairing
GET    /devices/pairing/{id}                   Get pairing status
GET    /devices/fields/{field_id}/pairings     Field pairings
POST   /devices/pairing/{id}/confirm           Confirm pairing
GET    /devices                                Device catalog
POST   /telemetry/ingest                       Ingest telemetry
GET    /telemetry/fields/{field_id}/latest     Latest field telemetry
GET    /telemetry/fields/{field_id}/history    Field telemetry history
GET    /irrigation/fields/{id}/status          Field irrigation status
GET    /irrigation/fields/{id}/auto-decision   ML-based irrigation decision
POST   /irrigation/fields/{id}/commands        Valve command
POST   /irrigation/fields/{id}/manual-requests Submit manual request
GET    /irrigation/manual-requests             List requests (officer/authority)
POST   /irrigation/manual-requests/{id}/review Approve/reject
POST   /irrigation/manual-requests/{id}/close  Close manual request
GET    /irrigation/officer/overview            Officer overview
GET    /irrigation/network/state               Network state
GET    /irrigation/network/schedules           Hydraulic schedules
POST   /irrigation/network/schedules           Create schedule
GET    /irrigation/network/topology            Hydraulic topology
POST   /authority/policies                     Create authority policy
GET    /authority/policies                     List policies
POST   /authority/policies/{id}/publish        Publish policy
GET    /water-management/reservoir/current     Current reservoir state
POST   /water-management/predict               Water release prediction
POST   /water-management/decide                Water control decision
POST   /water-management/recommend             Recommendation
POST   /water-management/manual-override       Override water control
```

---

## F2 — Crop Health & Water Stress Detection (`services/crop_health_and_water_stress_detection`, port 8007)

### What it does
- Satellite-style zone-based health analysis (NDVI/NDWI-style metrics)
- Vegetation validation before analysis (rejects water bodies, urban areas, cloud cover)
- Image-based crop disease classification (MobileNetV2, 38 classes)
- Field-level stress summary endpoint consumed by F1

### ML Model — CropHealthModel (MobileNetV2)
| Attribute | Detail |
|-----------|--------|
| Algorithm | TensorFlow/Keras MobileNetV2 (transfer learning) |
| Version | 1.0.0 |
| Input | RGB image, 224×224 px |
| Output | 38-class crop disease/health label + confidence |
| Dataset | PlantVillage open-source (38 classes: apple, cherry, corn, grape, tomato, potato, etc.) |
| Preprocessing | Pillow load → resize to `IMG_SIZE` → normalize to [0,1] |
| Artifact | Configured via `settings.MODEL_PATH` (.h5 or SavedModel) |
| Health mapping | "healthy" → severity: none, risk: low; "disease" → moderate/medium; "severe_disease" → high/high |

**38 output classes cover:**
Apple (scab, black rot, cedar apple rust, healthy), Blueberry (healthy), Cherry (powdery mildew, healthy), Corn (gray leaf spot, common rust, northern leaf blight, healthy), Grape (black rot, esca, leaf blight, healthy), Orange (Huanglongbing), Peach (bacterial spot, healthy), Pepper bell (bacterial spot, healthy), Potato (early blight, late blight, healthy), Raspberry (healthy), Soybean (healthy), Squash (powdery mildew), Strawberry (leaf scorch, healthy), Tomato (bacterial spot, early blight, late blight, leaf mold, septoria leaf spot, spider mites, target spot, TRCV, yellow leaf curl, mosaic, healthy)

### Key files
- `app/main.py`
- `app/models/crop_health_model.py` — MobileNetV2 loader + inference
- `app/model.py` — health analysis engine
- `app/api/routes/health_analysis.py` — zone analysis
- `app/api/routes/prediction.py` — image prediction
- `app/core/config.py` — model path + image size settings

### Key API endpoints (gateway prefix `/api/v1/crop-health/`)
```
POST   /analyze                    Zone health analysis (coordinates + imagery)
GET    /zones                      Generate/query health zones
GET    /zones/geojson              GeoJSON health zones for maps
GET    /zones/summary              Zone health summary
GET    /fields/{field_id}/stress-summary  Field-level stress summary (used by F1/F4)
POST   /fields/{field_id}/stress-summary/ingest  Ingest live stress artifact (admin)
POST   /predict                    Disease prediction from image upload
POST   /predict/url                Disease prediction from image URL
GET    /model/status               Model readiness and contract status
GET    /model/classes              Available prediction classes
```

### Notes
- Artifacts persisted to `/tmp/crop_health_analysis_artifacts.json`
- Validation pipeline: water body → urban area → cloud cover → insufficient vegetation → proceed

---

## F3 — Forecasting Service (`services/forecasting_service`, port 8003)

### What it does
- Multi-horizon water level and rainfall forecasting (1–14 day horizons)
- Risk band outputs: P10 / P50 / P90 percentiles
- Weather intelligence and irrigation recommendation APIs
- Drought/flood alert generation
- Advanced analytics: ARIMA, ensemble, anomaly detection (admin-only routes)

### ML Models

#### Primary — TimeSeriesForecastingSystem (LinearRegression)
| Attribute | Detail |
|-----------|--------|
| Algorithm | scikit-learn `LinearRegression` with `MinMaxScaler` normalization |
| Version | 1.0.0 |
| Inputs | Historical time-series: `water_level_percent`, `rainfall_mm`, `gate_opening_percent` |
| Outputs | Multi-horizon forecasts + risk bands (P10/P50/P90) |
| Data management | In-memory circular buffer, last 10 000 points per series |
| Priority | Live observations preferred over model outputs (live-data-first strategy) |
| Mode flags | `STRICT_LIVE_DATA` — error on missing live data; `ML_ONLY_MODE` — bypass observations |

#### Secondary — ARIMAForecaster (statsmodels)
| Attribute | Detail |
|-----------|--------|
| Models | ARIMA, SARIMA, Auto ARIMA (pmdarima) |
| Stationarity | Augmented Dickey-Fuller (ADF) test |
| Decomposition | Trend, seasonal, residual |
| Dependencies | statsmodels, pmdarima (optional) |

#### Advanced (Research Pathway)
| Attribute | Detail |
|-----------|--------|
| Algorithms | RandomForest, GradientBoosting, LSTM |
| Loading | Conditional on available dependencies + training data |
| Flag | `ML_ONLY_MODE` env var |

### Key files
- `app/main.py`
- `app/ml/forecasting_system.py` — LinearRegression baseline
- `app/ml/arima_models.py` — ARIMA/SARIMA wrappers
- `app/ml/ensemble_models.py` — Ensemble combining
- `app/ml/advanced_forecasting.py` — RF/GB/LSTM pathway
- `app/ml/anomaly_detection.py` — Anomaly detection
- `app/api/forecast.py` — core forecast endpoints
- `app/api/weather.py` — weather + irrigation recommendation
- `app/api/advanced_forecast.py` — v2 advanced forecast routes
- `app/api/analytics.py` — ARIMA, ensemble, anomaly, seasonal analytics

### Database tables (PostgreSQL)
```
forecasting_observations
forecasting_weather_artifacts
forecasting_irrigation_recommendations
forecasting_v2_training_runs
```

### Key API endpoints (gateway prefix `/api/v1/forecast/`)
```
GET    /status                           Forecast service status
GET    /current-data                     Current observed data
GET    /forecast                         Multi-horizon forecasts
GET    /risk-assessment                  Risk assessment
POST   /submit-data                      Submit observation data
GET    /weather/current                  Current weather
GET    /weather/forecast                 Weather forecast
GET    /weather/summary                  Weather summary
GET    /weather/irrigation-recommendation  Irrigation guidance
GET    /v2/status                        Advanced forecast status
GET    /v2/forecast                      Advanced forecast
GET    /v2/risk-assessment               Advanced risk assessment
POST   /v2/analytics/arima/train         ARIMA training
POST   /v2/analytics/anomaly/detect      Anomaly detection
```

---

## F4 — Adaptive Crop & Area Optimization / ACA-O (`services/optimize_service`, port 8004)

### What it does
- Crop suitability scoring per field using Fuzzy-TOPSIS
- Yield and price inference for profit modeling
- Water budget calculations (FAO-56 framework)
- Scenario-based optimization under quota constraints (PuLP)
- Plan B (contingency) crop allocation generation
- Supply aggregation and water-budget reporting
- Adaptive parameterized recommendation pipeline

### ML Models

#### Fuzzy-TOPSIS (Crop Suitability Scorer)
| Attribute | Detail |
|-----------|--------|
| Algorithm | Fuzzy-TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) |
| Version | 1.0.0 |
| Inputs per crop | `soil_suitability` (0–1), `water_coverage_ratio` (0–1), `historical_yield_t_ha` (numeric), `water_sensitivity` (low/medium/high), `growth_duration_days` (numeric) |
| Output | Suitability score (0–1) per crop |
| Fuzzy representation | Trapezoidal membership: low=(0,0,0.3,0.5), medium=(0.3,0.5,0.5,0.7), high=(0.5,0.7,1,1) |
| Criteria weights | soil: 0.25, water: 0.25, yield: 0.20, sensitivity: 0.15, duration: 0.15 |
| Normalization | Min-max per criterion |

**Algorithm steps:**
1. Build decision matrix (crops × criteria)
2. Normalize matrix (min-max)
3. Apply expert-defined criteria weights
4. Determine ideal best and worst solutions
5. Calculate Euclidean distances to each ideal
6. Compute closeness coefficients → suitability scores

#### Yield Model
| Attribute | Detail |
|-----------|--------|
| Algorithm | Regression-based (linear or tree) |
| Input | Field properties + crop type |
| Output | Expected yield (t/ha) |

#### Price Model
| Attribute | Detail |
|-----------|--------|
| Algorithm | Time-series or trend-based |
| Input | Crop type + season/date |
| Output | Expected farmgate price (per kg) |

#### Optimizer (PuLP — Linear/Mixed-Integer Programming)
| Attribute | Detail |
|-----------|--------|
| Library | PuLP 2.7+ |
| Problem type | Crop area allocation |
| Objective | Maximize profit: Σ(area × expected_yield × predicted_price − cost) |
| Decision variables | Continuous area (ha) per crop per field |
| Constraints | Total area ≤ scheme area; total water ≤ quota (mm); minimum paddy area (policy); crop-specific soil suitability thresholds; crop water requirement ≤ available water per field |
| Output | Optimal area distribution (ha per crop per field) |

### Key files
- `app/main.py`
- `app/ml/suitability_fuzzy_topsis.py` — core TOPSIS implementation
- `app/ml/crop_recommendation_model.py` — suitability scorer wrapper
- `app/ml/yield_model.py` — yield inference
- `app/ml/price_model.py` — price inference
- `app/ml/inference.py` — inference pipeline
- `app/optimization/optimizer.py` — PuLP engine
- `app/optimization/constraints.py` — constraint definitions
- `app/api/routes_recommendations.py`
- `app/api/routes_planb.py`
- `app/api/routes_supply.py`
- `app/api/routes_adaptive.py`
- `app/api/routes_farmer.py` — farmer-facing recommendation workflow
- `app/api/routes_internal.py` — internal field sync
- `app/data/models_orm.py` — ORM models
- `app/data/repositories.py` — data access layer
- `app/services/recommendation_service.py` — business logic
- `app/services/farmer_service.py` — farmer wizard context, water banding, histories
- `app/models/*.joblib` — price and recommendation model artifacts

### Database tables (PostgreSQL)
```
fields
crops
historical_yields
price_records
recommendations
optimization_run_artifacts
```

### Key API endpoints (gateway prefix `/api/v1/planning/`, internal prefix `/f4/`)
```
GET    /recommendations                  List recommendations
POST   /recommendations                  Generate new recommendation
POST   /recommendations/optimize         Scenario evaluation / optimization run
POST   /recommendations/scenario-evaluate  Scenario contract route used by gateway
POST   /planb                            Generate Plan B
GET    /supply                           Water supply status
GET    /supply/water-budget              Detailed water budget
POST   /adaptive                         Adaptive crop recommendation pipeline
GET    /adaptive/parameters              Adaptive model parameters
GET    /adaptive/crops                   Adaptive crop catalog
GET    /farmer/current                   Latest saved farmer optimization plan
POST   /farmer/recommend                 Farmer wizard recommendation flow
GET    /farmer/crop-detail               Crop detail for latest recommendation
POST   /farmer/select                    Persist selected farmer crop
PUT    /internal/fields/{id}             Internal field sync (upstream use only)
DELETE /internal/fields/{id}             Internal field removal
```

---

## IoT Service (`services/iot_service`, port 8006)

### What it does
- MQTT subscription on `devices/+/telemetry`
- ADC calibration → percentage conversion
- REST telemetry ingestion and query APIs
- Device command publishing to `devices/{device_id}/cmd`
- Bridges to irrigation service field sensor ingestion

### Key files
- `app/main.py`
- `app/iot/mqtt_client.py`
- `app/iot/pg_repo.py` — PostgreSQL telemetry store
- `app/iot/service.py`
- `app/api/iot.py`

### Key API endpoints (service prefix `/api/v1/iot`; gateway exposes device passthrough at `/api/v1/devices/*`)
```
GET    /devices                   List known devices
GET    /devices/{id}/latest       Latest telemetry
GET    /devices/{id}/range        Range telemetry query
POST   /devices/{id}/cmd          Send command to device
POST   /telemetry                 Manual ingest (dev/test)
```

### Hardware (ESP32)
- Path: `hardware/esp32/main/main.ino`
- Reads soil moisture + water level from ADC pins
- Publishes JSON telemetry to MQTT `devices/{device_id}/telemetry`
- Subscribes to `devices/{device_id}/cmd` for remote control
- Supports remote sampling interval updates

---

## Config Server (`services/config_server`, port 8010)

### What it does
- Serves centralized runtime configuration for Docker/local/prod profiles.
- Exposes one-service and all-service config endpoints.
- Used by service `config_bootstrap.py` modules when `CONFIG_ENABLED=true`.

### Key files
- `app/main.py` — FastAPI entry
- `app/config_registry.py` — profile-specific config generation
- `tests/test_config_server.py` — config endpoint contract tests

### Key API endpoints
```
GET    /health
GET    /config/all?profile=docker|local|production
GET    /config/{service_name}?profile=docker|local|production
GET    /
```

---

## Web Frontend — Active Dashboard App (`apps/web/`)

The active frontend code lives under `apps/web/`. Public project pages such as `/`, `/domain`, `/milestones`, `/documents`, `/presentations`, `/about`, `/contact`, `/login`, and `/register` are implemented inside the dashboard app under `apps/web/src/app/(public)/`.

There is no active `apps/marketing-web/` application in the current source tree. If a marketing app is added later, update this section, the repository map, run commands, compose/build references, and route protection notes in the same change.

### Stack
Next.js 16 + React 19 + TypeScript 5 (App Router), Tailwind CSS v4, ESLint

---

### `apps/web/` — Dashboard App (port 3000)

The primary authenticated application serving farmers, officers, and authority users.

#### Route structure
```
src/app/
├── (public)/                  # Unauthenticated routes
│   ├── page.tsx               # Landing / home
│   ├── login/                 # Login
│   ├── register/              # Registration
│   ├── farmer/landing/        # Pre-auth farmer landing
│   ├── about/  contact/  domain/  milestones/  documents/  presentations/  routes/
├── farmer/                    # Farmer dashboard (role-guarded)
│   ├── page.tsx               # Farmer home
│   ├── fields/                # Field list
│   ├── field/[id]/            # Individual field detail
│   ├── onboarding/            # Farmer onboarding flow
│   └── register/              # Farmer self-registration
├── operations/                # Officer dashboard (role-guarded: officer | authority)
│   ├── page.tsx               # Operations overview
│   ├── requests/              # Manual irrigation requests
│   └── hydraulics/            # Hydraulic controls
├── irrigation/                # F1 module pages (officer | authority)
│   ├── page.tsx               # Irrigation overview
│   ├── water-management/      # Reservoir & water state
│   ├── water/                 # Water controls
│   └── telemetry/             # Sensor telemetry view
├── crop-health/               # F2 module page (officer | authority)
├── forecasting/               # F3 module page (officer | authority)
├── optimization/              # F4 module pages (authority-only)
│   ├── page.tsx               # Optimization overview
│   ├── recommendations/       # Crop recommendations
│   ├── planner/               # Crop area planner
│   ├── scenarios/             # What-if scenarios
│   └── adaptive/              # Adaptive parameter tuning
├── authority/                 # Authority governance (authority-only)
│   ├── users/                 # User management
│   └── policies/              # Policies & quotas
└── mobile/farmer/             # Mobile farmer view
```

#### Key shared modules
```
src/components/asi/
├── nav.ts                     # Role nav definitions (farmerNav, officerNav, authorityNav, irrigationNav, optNav)
├── page-header.tsx            # Consistent page header
├── public-top.tsx / public-footer.tsx  # Public layout shell
├── api-state.tsx              # API loading/error state component
└── ui.tsx                     # Shared UI primitives

src/lib/
├── api.ts                     # Typed fetch wrappers (apiGet/apiPost/apiPut/apiPatch/apiDelete/uploadFile)
└── auth.ts                    # JWT auth — login/logout, useAuth hook, role helpers

src/proxy.ts                   # Next.js 16 proxy (replaces middleware) — route protection by role
```

#### Route protection (proxy.ts)
- Public paths: `/`, `/login`, `/register`, `/domain`, `/milestones`, `/documents`, `/presentations`, `/about`, `/contact`, `/farmer/landing`
- `/farmer/*` — requires `farmer` role
- `/operations/*`, `/irrigation/*`, `/crop-health/*`, `/forecasting/*` — requires `officer` or `authority` role
- `/authority/*`, `/optimization/*` — requires `authority` role
- Token read from `asi_access_token` cookie (set at login; also mirrored in `localStorage`)

#### API client (`src/lib/api.ts`)
- Base URL: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api/v1`)
- Auto-injects `Authorization: Bearer <token>` from `localStorage`
- 401 → clears auth and redirects to `/login`

---

### Running the frontend app

```bash
# Dashboard app
cd apps/web && npm run dev          # http://localhost:3000
```

---

## Gateway Integration (`services/gateway_service/app/main.py`, port 8000)

### Route mapping

| Gateway prefix | Target service | Target prefix |
|----------------|----------------|---------------|
| `/api/v1/auth/*` | auth_service (8001) | `/api/auth/*` |
| `/api/v1/authority/users*` | auth_service (8001) | `/api/authority/*` |
| `/api/v1/authority/policies*` | irrigation_service (8002) | `/api/v1/authority/policies*` |
| `/api/v1/farm/*` | irrigation_service (8002) | `/api/v1/farm/*` |
| `/api/v1/farm/fields/{id}/profile` | gateway aggregate | F1 + F2 + F3 + F4 snapshot |
| `/api/v1/devices/pairing/*` | irrigation_service (8002) | `/api/v1/devices/pairing/*` |
| `/api/v1/devices/*` | iot_service (8006) | `/api/v1/iot/devices/*` |
| `/api/v1/telemetry/ingest` | irrigation_service (8002) | `/api/v1/telemetry/ingest` |
| `/api/v1/telemetry/fields/*` | irrigation_service (8002) | `/api/v1/telemetry/fields/*` |
| `/api/v1/irrigation/*` | irrigation_service (8002) | `/api/v1/irrigation/*` |
| `/api/v1/crop-health/*` | crop_health... (8007) | `/api/v1/crop-health/*` |
| `/api/v1/forecast/*` | forecasting_service (8003) | `/api/v1`, `/api/v2`, `/api/weather` |
| `/api/v1/planning/*` | optimize_service (8004) | `/f4/*` |

### Gateway behavior
- HTTP proxy; preserves `Authorization` headers, forwards query params and request bodies
- Preserves contract fields: `status`, `source`, `is_live`, `data_available`, `quality`, `observed_at`
- Timeout: 30s default
- Contract tests: `services/gateway_service/tests/test_gateway_contracts.py`

---

## Runtime Contracts

All services implement a consistent response contract:
- `status` — operational status string
- `source` — `"live"`, `"cached"`, `"simulated"`, `"model"`
- `data_available` — boolean
- `is_live` — boolean
- `observed_at` — ISO8601 timestamp
- `quality` — data quality indicator

**Mode flags (F3 especially):**
- `STRICT_LIVE_DATA=true` — return `source_unavailable` instead of fallback
- `ML_ONLY_MODE=true` — skip observation data, use only ML outputs

---

## Environment Variables

### Common (all services)
```
ENVIRONMENT=development|production
DEBUG=true|false
```

### Auth Service (8001)
```
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=...
CORS_ORIGINS=["*"]
```

### Irrigation Service (8002)
```
DATABASE_URL=postgresql+asyncpg://...
AUTH_SERVICE_URL=http://auth_service:8001
FORECASTING_SERVICE_URL=http://forecasting_service:8003
CROP_HEALTH_SERVICE_URL=http://crop_health_and_water_stress_detection:8007
OPTIMIZATION_SERVICE_URL=http://optimize_service:8004
IOT_SERVICE_URL=http://iot_service:8006
MQTT_BROKER=mosquitto
MQTT_PORT=1883
```

### Forecasting Service (8003)
```
DATABASE_URL=postgresql+asyncpg://...
AUTH_SERVICE_URL=http://auth_service:8001
STRICT_LIVE_DATA=false
ML_ONLY_MODE=false
```

### Optimize Service (8004)
```
DB_HOST=postgres
DB_PORT=5432
DB_USER=aca_o_user
DB_PASSWORD=aca_o_password
DB_NAME=aca_o_db
IRRIGATION_SERVICE_URL=http://irrigation_service:8002
FORECASTING_SERVICE_URL=http://forecasting_service:8003
CROP_HEALTH_SERVICE_URL=http://crop_health_and_water_stress_detection:8007
AUTH_SERVICE_URL=http://auth_service:8001
```

### Crop Health Service (8007)
```
MODEL_PATH=/path/to/model.h5
IMG_SIZE=224
MQTT_BROKER=mosquitto
MQTT_PORT=1883
```

### Frontend
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1    # dev
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1  # prod
```

---

## How to Run Locally

### Option A — Full Docker Compose stack
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
# Dashboard app: cd apps/web && npm run dev    -> http://localhost:3000
# Gateway:   http://localhost:8000
# Prometheus:http://localhost:9090
```

### Option B — Dependencies only, then run services manually
```bash
cd infrastructure/docker
docker compose up -d postgres redis mosquitto
# Then start each service separately with uvicorn
```

### Option C — Windows (PowerShell)
```powershell
.\start-all.ps1
```

### Option D — Kubernetes (Skaffold)
```bash
skaffold dev               # dev with hot reload
skaffold run -p staging    # staging deploy
skaffold run -p production # production deploy
```

### Health checks
Each service exposes `GET /health` — hit this to confirm startup.

---

## Testing

### Run all
```bash
make test
make lint
```

### Per-service test files
```
services/auth_service/tests/test_auth.py
services/auth_service/tests/test_auth_me_scheme_scope.py
services/irrigation_service/tests/test_decision_integration.py
services/forecasting_service/tests/test_forecasting_contracts.py
services/optimize_service/tests/test_recommendations_api.py
services/optimize_service/tests/test_farmer_routes.py
services/crop_health_and_water_stress_detection/tests/test_health_analysis_contracts.py
services/iot_service/tests/test_api.py
services/iot_service/tests/test_service.py
services/gateway_service/tests/test_gateway_contracts.py
services/config_server/tests/test_config_server.py
```

### IoT tests
```
test_api.py
test_schemas.py
test_config.py
test_service.py
```

---

## Known Issues and Mismatches

These affect AI agents and new contributors — read before editing.

1. **Optimization service naming** — Canonical path is `services/optimize_service`, service name is `optimize_service`, and gateway/public API namespace is planning (`/api/v1/planning/*`) even though the feature is shown as Optimization in the UI.

2. **Auth datastore docs vs code** — Docs mention MongoDB for auth. Active code uses PostgreSQL. A Mongo module exists but is not imported in `app/main.py`.

3. **Frontend build path drift** — Active frontend source is `apps/web/`, but the root `Makefile` still has `build-web` pointing at `web/Dockerfile`, and local Docker Compose currently builds `../../web`. Treat `apps/web/` as canonical until build files are corrected.

4. **Gateway is FastAPI** — The active proxy is `services/gateway_service/app/main.py`. Update gateway route tests for every route mapping change.

5. **Frontend relocated to `apps/`** — Active frontend is `apps/web/`. There is no active `apps/marketing-web/` source tree. The root `web/` directory is a legacy stub/cache location — do not edit it for product UI work.

6. **InfluxDB references** — IoT docs and some configs mention InfluxDB. Current active storage is PostgreSQL via `pg_repo.py`.

7. **Model artifacts** — F2 MobileNetV2 model artifact must be pre-trained and placed at `MODEL_PATH`. The service degrades gracefully without it but predictions won't work.

**Rule:** Treat service source code (`services/*/app/`) and service tests as the source of truth. Treat docs and compose files as guidance only.

---

## Claude Project Handling Protocol

Use this protocol whenever the user mentions `CLAUDE.md`, asks to update project guidance, or gives a project implementation prompt that should be governed by this file.

### Source-of-truth rule
1. Read `CLAUDE.md` first only to understand the existing rules and structure.
2. Analyze the active codebase at code level before changing guidance: service entrypoints, routers, schemas, config, models, tests, frontend routes, infrastructure manifests, and firmware when relevant.
3. Do not rely on README/docs notes for facts that can be verified in code. If docs and code disagree, use code as source of truth and record the mismatch in `CLAUDE.md`.
4. If the user explicitly says not to read documentation files, only read `CLAUDE.md` plus source/config/test files needed for the task.

### Prompt handling rule
For every implementation prompt:
1. Restate the intended outcome in practical terms.
2. Inspect the relevant code paths before deciding.
3. Ask concise questions only if missing information blocks a safe implementation.
4. Create a short plan and todo list before editing.
5. Make the needed code changes directly; do not stop at advice when the user asked for implementation.
6. Update or add focused tests when behavior changes.
7. Run the smallest reliable verification first, then broader tests when the change touches shared contracts, gateway routes, auth, persistence, or frontend/backend integration.
8. Summarize what changed, what was verified, and any remaining risk.

### CLAUDE.md maintenance rule
When a change affects architecture, service ownership, route structure, tests, environment variables, model artifacts, database tables, frontend routing, infrastructure, or agent workflow:
1. Update the matching section of `CLAUDE.md` in the same work session.
2. If the repository layout changes, update the "Repository Map" and any affected service/frontend sections.
3. If a gateway route changes, update "Gateway Integration" and run `services/gateway_service/tests/test_gateway_contracts.py`.
4. If a service contract changes, update "Runtime Contracts", the service section, and the relevant tests.
5. Add a dated entry under "CLAUDE.md Change Log" describing the guidance update.

### Default todo template
Use this shape unless the task is tiny:
```
1. Identify affected code paths and contracts.
2. Inspect existing implementation and tests.
3. Ask blocking questions, if any.
4. Plan the implementation.
5. Apply focused code changes.
6. Update tests and CLAUDE.md guidance when needed.
7. Run verification.
8. Report changed files, verification result, and follow-up risks.
```

---

## Agent / Developer Working Rules

1. **Confirm service paths** in `services/` before editing docs or compose files.
2. **Validate gateway routes** via `services/gateway_service/tests/test_gateway_contracts.py` after any routing change.
3. **Preserve contract fields** (`status/source/data_available/is_live/observed_at/quality`) on all new endpoints.
4. **Cross-service calls must include graceful fallback** and respect `STRICT_LIVE_DATA` mode.
5. **Update tests alongside behavior changes** — do not change endpoints without updating corresponding tests.
6. **Do not trust a single doc file** — verify against actual code before making assumptions.
7. **ML model changes** — always retrain with the training notebook and re-serialize the artifact. Do not hand-edit `.joblib` or `.h5` files.
8. **Schema migrations** — add Alembic migrations; do not drop/alter tables manually.
9. **Frontend API changes** — update `apps/web/src/lib/api.ts` and relevant page modules to match backend contracts. Do not edit the root `web/` directory.
10. **Similar scope across F1–F4** — when adding a feature to one function, consider if analogous functionality is needed in the others (aligned research contribution requirement).
11. **Planning namespace** — public gateway routes for F4 optimization use `/api/v1/planning/*`; internal optimize service routes use `/f4/*`.
12. **CLAUDE.md updates** — when this file is part of the request, update it only from verified code-level facts and add a dated change-log entry.

---

## CLAUDE.md Change Log

- 2026-04-30 — Added current project idea, code-as-source-of-truth rule, Claude project handling protocol, CLAUDE.md maintenance rule, config server ownership, active `apps/web` frontend clarification, and corrected F4 gateway namespace to `/api/v1/planning/*`.

## Documentation Index

| Document | Location | Purpose |
|----------|----------|---------|
| AGENT.md | root | Operational guide for AI agents and contributors |
| README.md | root | Project overview, quick start, architecture |
| Docs index | docs/README.md | Small map of the organized docs folder |
| Project overview | docs/overview/project-overview.md | Full system design, features, use cases |
| Frontend structure | docs/frontend/frontend-structure.md | Legacy React/Vite reference (superseded by `apps/web/`) |
| Role flows and flaws | docs/frontend/role-functional-flows-and-flaws.md | Farmer, officer, and authority flow notes |
| Farmer portal notes | docs/planning/farmer-portal-implementation-notes.md | Farmer portal features, API, multilingual |
| F1 Irrigation | docs/functions/f1-irrigation.md | F1 endpoints, persistence, role guards, flows |
| F2 Crop Health | docs/functions/f2-crop-health.md | F2 zone analysis, validation, image prediction |
| F3 Forecasting | docs/functions/f3-forecasting.md | F3 models, weather, risk, alerts |
| F4 Optimize | docs/functions/f4-optimize.md | F4 recommendations, optimization, Plan B |
| Architecture Decisions | docs/architecture/decisions.md | ADR records |
| Runbooks | docs/runbooks/ | Service recovery, migration guides |
| Local Dev Guide | docs/guides/local-development.md | Step-by-step local setup |
| IoT Setup | docs/guides/iot-setup.md | ESP32 hardware setup and MQTT config |

---

## Immediate Stabilization Backlog

Priority items for engineering alignment:

1. Fix frontend build path drift so Makefile and Docker Compose build from `apps/web/` instead of legacy `web/`.
2. Keep the generated route map aligned with `services/gateway_service/app/main.py` and mounted service routers.
3. Green all gateway + contract test suites after each integration change.
4. Update auth references to reflect PostgreSQL as the active datastore unless the code intentionally changes.
5. Add F2 model artifact provisioning and readiness checks to setup/run guidance.
6. Decide whether `shared/` should remain documentation-only or gain real shared runtime schemas/events.

# CLAUDE.md — Smart Irrigation System

## Project Identity

**Name:** Adaptive Smart Irrigation and Crop Optimization Platform
**Type:** Full-stack, multi-service research platform (IoT + ML + Optimization + Web Dashboard)
**Domain:** Irrigation decision support and crop planning for quota-based irrigation schemes (Sri Lanka)
**Status:** 4th Year Software Engineering Research Project — 4-person team

---

## Team Structure (4 Functional Streams)

| Stream | Owner | Service | Port | Responsibility |
|--------|-------|---------|------|----------------|
| **F0** | Shared | `auth_service` | 8001 | Authentication, JWT, role-based access control |
| **F1** | Hesara | `irrigation_service` | 8002 | IoT sensor ingestion, ML valve control, crop fields, water management |
| **F2** | Abishek | `crop_health_and_water_stress_detection` | 8007 | Satellite zone health, image disease prediction, stress detection |
| **F3** | Trishni | `forecasting_service` | 8003 | Time-series forecasting, weather intelligence, risk alerts |
| **F4** | Dilruksha | `optimize_service` | 8004 | Crop suitability, area optimization, water budgeting, Plan B |
| **IoT** | Shared | `iot_service` | 8006 | MQTT telemetry ingest, device commands, ESP32 bridge |
| **Web** | Shared | `web/` | 3000 (dev) | Next.js + TypeScript frontend (migration in progress) |
| **GW** | Shared | `gateway_service` | 8000 | API gateway, unified routing, header forwarding |

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
│   └── crop_health_and_water_stress_detection/  # F2 (port 8007)
├── web/                             # Next.js + TypeScript frontend (port 3000 dev)
├── hardware/esp32/                  # ESP32 sensor firmware
├── infrastructure/
│   ├── docker/docker-compose.yml    # Local full-stack
│   ├── kubernetes/                  # K8s manifests + Kustomize overlays
│   └── terraform/                   # Azure IaC (AKS, ACR, DB, Monitoring)
├── platform/observability/          # Prometheus rules + Grafana configs
├── shared/                          # Shared JSON schema / event definitions
├── docs/                            # Project and function documentation
├── notebooks/                       # ML training notebooks
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
| UI styling | CSS Modules + global CSS | Current scaffold baseline |
| Routing | Next.js App Router | File-based frontend navigation |
| HTTP client | Fetch/Axios (project choice) | API calls |
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
- Legacy frontend stored tokens in localStorage; confirm final token strategy during Next.js migration.

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
- `app/api/crop_fields.py` — field CRUD + sensor ingestion
- `app/api/water_management.py` — reservoir + override endpoints
- `app/db/models.py` — ORM models

### Database tables (PostgreSQL)
```
irrigation_crop_fields
irrigation_valve_states
irrigation_sensor_readings
irrigation_manual_requests
irrigation_manual_request_audit
irrigation_device_pairings
irrigation_reservoir_snapshots
irrigation_water_management_state
```

### Key API endpoints (internal prefix `/api/v1`, gateway prefix `/api/v1/irrigation/`)
```
POST   /crop-fields/fields                     Create field
GET    /crop-fields/fields/{id}                Get field
PUT    /crop-fields/fields/{id}                Update field
POST   /crop-fields/fields/{id}/sensor-data    Ingest sensor telemetry
GET    /crop-fields/fields/{id}/status         Field status + live sensor
GET    /crop-fields/fields/{id}/auto-decision  ML-based irrigation decision
POST   /crop-fields/fields/{id}/valve          Manual valve control
POST   /crop-fields/fields/{id}/manual-requests  Submit manual request
GET    /crop-fields/manual-requests            List requests (officer/authority)
POST   /crop-fields/manual-requests/{id}/review  Approve/reject (officer)
GET    /water-management/reservoir/current     Current reservoir state
POST   /water-management/reservoir/ingest      Ingest reservoir snapshot
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
POST   /zones/analyze              Zone health analysis (coordinates + imagery)
GET    /zones/{zone_id}            Zone health status
POST   /predict/image-url          Disease prediction from image URL
POST   /predict/image-upload       Disease prediction from upload
GET    /fields/{field_id}          Field-level stress summary (used by F1)
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
- `app/api/routes_forecast.py` — core forecast endpoints
- `app/api/routes_weather.py` — weather + irrigation recommendation
- `app/api/routes_advanced.py` — admin analytics (v2)

### Database tables (PostgreSQL)
```
forecasting_observations
forecasting_artifacts
forecasting_alerts
forecasting_training_metadata
```

### Key API endpoints (gateway prefix `/api/v1/forecast/`)
```
GET    /weather                          Weather summary + conditions
GET    /predictions                      Multi-horizon forecasts (1–14 days)
GET    /risk                             Risk assessment (P10/P50/P90)
GET    /weather/irrigation-recommendation  Irrigation guidance
POST   /observations                     Submit historical data (admin)
GET    /v2/analytics/arima               ARIMA analysis (admin)
GET    /v2/analytics/ensemble            Ensemble analysis (admin)
GET    /v2/analytics/anomaly             Anomaly detection (admin)
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
- `app/data/models_orm.py` — ORM models
- `app/data/repositories.py` — data access layer
- `app/services/recommendation_service.py` — business logic

### Database tables (PostgreSQL)
```
fields
crops
historical_yields
price_records
recommendations
optimization_run_artifacts
```

### Key API endpoints (gateway prefix `/api/v1/optimization/`, internal prefix `/f4/`)
```
GET    /recommendations                  List recommendations
POST   /recommendations                  Generate new recommendation
POST   /recommendations/optimize         Scenario evaluation / optimization run
GET    /planb                            Get Plan B alternatives
POST   /planb/generate                   Generate Plan B
GET    /supply                           Water supply status
GET    /supply/water-budget              Detailed water budget
GET    /adaptive                         Adaptive parameters
POST   /adaptive/simulate                What-if simulation
POST   /internal/fields/{id}            Internal field sync (upstream use only)
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

### Key API endpoints (gateway prefix `/api/v1/iot/`)
```
GET    /devices                   List known devices
GET    /devices/{id}/telemetry/latest  Latest telemetry
GET    /devices/{id}/telemetry    Range telemetry query
POST   /devices/{id}/telemetry    Manual ingest (dev/test)
POST   /devices/{id}/cmd          Send command to device
```

### Hardware (ESP32)
- Path: `hardware/esp32/main/main.ino`
- Reads soil moisture + water level from ADC pins
- Publishes JSON telemetry to MQTT `devices/{device_id}/telemetry`
- Subscribes to `devices/{device_id}/cmd` for remote control
- Supports remote sampling interval updates

---

## Web Frontend (`web/`, Next.js dev port 3000)

### Stack
Next.js 16 + TypeScript + React 19 (App Router), ESLint, CSS Modules

### Current status
- Legacy Vite frontend has been replaced by the new Next.js scaffold.
- Feature pages and old `f1..f4` modules need migration into the new app structure.

### Key directories (current scaffold)
```
web/
├── src/app/               # App Router entry (layout/page)
├── public/                # Static assets
├── next.config.ts         # Next.js config
├── tsconfig.json          # TypeScript config
├── eslint.config.mjs      # Lint config
└── package.json
```

### Route status
- Current scaffold route: `/`
- Farmer/Officer/Authority route migration is pending implementation.

### API strategy
- Use `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000/api/v1`)
- Build shared API client modules under `web/src/` as migration proceeds.

---

## Gateway Integration (`services/gateway_service/app/main.py`, port 8000)

### Route mapping

| Gateway prefix | Target service | Target prefix |
|----------------|----------------|---------------|
| `/api/v1/auth/*` | auth_service (8001) | `/api/auth/*` |
| `/api/v1/authority/*` | auth_service (8001) | `/api/authority/*` |
| `/api/v1/irrigation/*` | irrigation_service (8002) | `/api/v1/*` |
| `/api/v1/crop-health/*` | crop_health... (8007) | `/api/v1/crop-health/*` |
| `/api/v1/forecast/*` | forecasting_service (8003) | `/api/v1`, `/api/v2`, `/api/weather` |
| `/api/v1/optimization/*` | optimize_service (8004) | `/f4/*` |
| `/api/v1/iot/*` | iot_service (8006) | `/api/v1/iot/*` |

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
# Web (Next.js): run separately with `cd web && npm run dev` -> http://localhost:3000
# Gateway:   http://localhost:8000
# Grafana:   http://localhost:3001
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
services/irrigation_service/tests/test_decision_integration.py
services/forecasting_service/tests/test_forecasting_contracts.py
services/optimize_service/tests/test_recommendations_api.py
services/crop_health_and_water_stress_detection/tests/test_health_analysis_contracts.py
services/gateway_service/tests/test_gateway_contracts.py
```

### IoT utilities
```
test_api.py
test_mqtt_send.py
test_crop_health.py
```

---

## Known Issues and Mismatches

These affect AI agents and new contributors — read before editing.

1. **Service naming drift** — Some docs/compose files reference `aca_o_service`; canonical path is `services/optimize_service`. Use `optimize_service` everywhere.

2. **Auth datastore docs vs code** — Docs mention MongoDB for auth. Active code uses PostgreSQL. A Mongo module exists but is not imported in `app/main.py`.

3. **docker-compose.yml inconsistencies** — Contains both `iot-service` and `iot_service` entries; also references non-existent `services/aca_o_service` for the optimization service path. Do not trust these entries literally.

4. **NGINX config stale** — Gateway Nginx config files contain outdated routes and duplicate upstreams. The FastAPI gateway (`services/gateway_service/`) is the active proxy — not Nginx.

5. **Frontend migration in progress** — Some docs/compose entries may still reference legacy Vite frontend behavior and ports.

6. **InfluxDB references** — IoT docs and some configs mention InfluxDB. Current active storage is PostgreSQL via `pg_repo.py`.

7. **Model artifacts** — F2 MobileNetV2 model artifact must be pre-trained and placed at `MODEL_PATH`. The service degrades gracefully without it but predictions won't work.

**Rule:** Treat service source code (`services/*/app/`) and service tests as the source of truth. Treat docs and compose files as guidance only.

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
9. **Frontend API changes** — update the active Next.js client modules under `web/src/` to match backend contracts.
10. **Similar scope across F1–F4** — when adding a feature to one function, consider if analogous functionality is needed in the others (aligned research contribution requirement).

---

## Documentation Index

| Document | Location | Purpose |
|----------|----------|---------|
| AGENT.md | root | Operational guide for AI agents and contributors |
| README.md | root | Project overview, quick start, architecture |
| PROJECT_OVERVIEW.md | docs/ | Full system design, features, use cases |
| FRONTEND_STRUCTURE.md | docs/ | Legacy React/Vite folder layout reference (outdated during Next.js migration) |
| SYSTEM_REDESIGN_ARCHITECTURE_AND_USER_FLOWS.md | root/docs/ | Role-based redesign: Farmer/Officer/Authority |
| FARMER_PORTAL_IMPLEMENTATION_NOTES.md | docs/ | Farmer portal features, API, multilingual |
| F1 README | docs/f1-irrigation-function/ | F1 endpoints, persistence, role guards, flows |
| F2 README | docs/f2-crop-health-function/ | F2 zone analysis, validation, image prediction |
| F3 README | docs/f3-forecasting-function/ | F3 models, weather, risk, alerts |
| F4 README | docs/f4-optimize-function/ | F4 recommendations, optimization, Plan B |
| Architecture Decisions | docs/architecture/decisions.md | ADR records |
| Runbooks | docs/runbooks/ | Service recovery, migration guides |
| Local Dev Guide | docs/LOCAL_DEVELOPMENT_GUIDE.md | Step-by-step local setup |
| IoT Setup | docs/IOT_SETUP_GUIDE.md | ESP32 hardware setup and MQTT config |

---

## Immediate Stabilization Backlog

Priority items for engineering alignment:

1. Normalize service naming in compose files and docs (`optimize_service` everywhere, remove `aca_o_service` references).
2. Fix duplicate and misaligned compose entries (`iot-service` vs `iot_service`, fix optimize path).
3. Retire or correct Nginx gateway configs — FastAPI gateway is the active proxy.
4. Update auth documentation to reflect PostgreSQL (or intentionally migrate to Mongo and update code).
5. Generate a single authoritative route map from gateway + service routers.
6. Green all gateway + contract test suites after each integration change.
7. Add F2 model artifact provisioning step to setup guides.

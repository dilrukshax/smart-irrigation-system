# AGENT.md

## Purpose
This file is the operational guide for humans and AI agents working in the `smart-irrigation-system` repository.

Use it to quickly understand:
- What this project is
- What each service does (F0-F4 + IoT)
- How services integrate
- How to run, test, and safely extend the system
- Known mismatches and risks to avoid

---

## Project Identity

**Project name:** Adaptive Smart Irrigation and Crop Optimization Platform  
**Type:** Full-stack, multi-service research platform (IoT + ML + optimization + web dashboard)  
**Primary domain:** Irrigation decision support and crop planning for Sri Lankan agriculture schemes  

### Core Functional Streams
- **F0:** Authentication and role-based access
- **F1:** Smart irrigation and water management
- **F2:** Crop health and stress detection
- **F3:** Forecasting and weather intelligence
- **F4:** Adaptive crop and area optimization (ACA-O)
- **IoT:** Telemetry ingestion and command path for field devices

---

## Architecture Snapshot

### Runtime Services and Ports

| Layer | Service | Path | Port | Role |
|---|---|---|---:|---|
| Gateway | FastAPI Gateway | `services/gateway_service/` | 8000 | Unified API routing in local development |
| Auth | Auth Service | `services/auth_service/` | 8001 | JWT auth, authority/officer provisioning, role + scheme checks |
| F1 | Irrigation Service | `services/irrigation_service/` | 8002 | Sensor status, crop fields, valve decisions, water mgmt |
| F3 | Forecasting Service | `services/forecasting_service/` | 8003 | Forecasting, weather, risk, analytics |
| F4 | Optimize Service | `services/optimize_service/` | 8004 | Recommendations, plan B, adaptive optimization, supply |
| Web | React Frontend | `web/` | 8005 | Farmer/officer/authority dashboards |
| IoT | IoT Telemetry Service | `services/iot_service/` | 8006 | MQTT ingest, telemetry query, device commands |
| F2 | Crop Health Service | `services/crop_health_and_water_stress_detection/` | 8007 | Zone analysis + image health prediction |

### Data + Messaging Components
- PostgreSQL (used by most backend services in current implementation)
- Redis (some environments/configs)
- Mosquitto MQTT broker
- InfluxDB referenced in docs/config, but IoT storage currently uses PostgreSQL repository code
- Prometheus + Grafana + Jaeger for observability tooling

---

## Repository Map

- `services/gateway_service/` - FastAPI gateway service + gateway tests
- `services/` - All backend microservices
- `web/` - React + TypeScript frontend
- `hardware/esp32/` - ESP32 firmware for telemetry publishing
- `infrastructure/docker/` - Docker Compose for local stack
- `infrastructure/kubernetes/` - K8s manifests and overlays
- `infrastructure/terraform/` - Azure IaC modules
- `platform/observability/` - Prometheus rules/config
- `shared/` - Shared event/schema notes
- `docs/` - Project and function documentation

---

## Service Responsibilities and Functional Coverage

## F0 - Auth Service (`services/auth_service`)

### What it does
- User registration/login/refresh/me
- Authority user management APIs (create/update/status/role/delete)
- JWT token issuance and verification flow
- Role model: `farmer`, `officer`, `authority`

### Important details
- Main API prefixes: `/api/auth`, `/api/authority`
- Uses SQLAlchemy async + PostgreSQL in current code path
- JWT algorithm default is HS256 in config

---

## F1 - Irrigation Service (`services/irrigation_service`)

### What it does
- Sensor and prediction APIs under `/api/v1`
- Crop field management under `/api/v1/crop-fields`
- Water management API under `/api/v1/water-management`
- Auto-control decisions for valve actions
- Manual override and manual request workflow
- Cross-service decision blending (forecast + crop stress)

### Functional highlights
- Field configuration per crop type (rice/wheat/vegetables/sugarcane defaults)
- Field status including sensor availability and simulated fallback behavior
- Sensor ingestion endpoint for real IoT pushed data
- Auto decision endpoint and manual review path
- Reservoir/water-release prediction and actuation decision

### Data and state
- PostgreSQL persistence models for crop fields, valve states, sensor readings, manual requests, reservoir snapshots
- Also persists some runtime snapshots to `/tmp/*.json`

---

## F2 - Crop Health Service (`services/crop_health_and_water_stress_detection`)

### What it does
- Satellite-style zone health analysis
- Vegetation validation before analysis
- Image-based disease/stress prediction (MobileNet model if available)
- Field stress summary endpoint for integration consumers

### Functional highlights
- Validation categories: water body, urban area, insufficient vegetation, high cloud cover
- Zone generation with NDVI/NDWI style metrics
- Image upload and URL-based prediction endpoints
- Contract fields include source/status/data availability metadata

### Data and state
- Model artifact expected under service notebook path
- Stress analysis artifacts persisted to `/tmp/crop_health_analysis_artifacts.json`

---

## F3 - Forecasting Service (`services/forecasting_service`)

### What it does
- Basic forecasting routes (`/api/v1`) for forecast/risk/current-data
- Weather intelligence routes (`/api/weather`)
- Advanced forecast routes (`/api/v2`) for model training/analysis
- Advanced analytics routes (`/api/v2/analytics`) for ARIMA/anomaly/ensemble

### Functional highlights
- Baseline linear regression forecasting system with observed-data-first behavior
- Weather summary + irrigation recommendation APIs
- Advanced ML module integration path (RandomForest/GB/LSTM) when dependencies and training are available
- Admin-protected endpoints for data submission and most v2 routes

### Data and state
- PostgreSQL tables for observations, weather artifacts, irrigation recommendation artifacts, and v2 training metadata

---

## F4 - Optimize Service (`services/optimize_service`)

### What it does
- Field recommendation generation (`/f4/recommendations`)
- Scenario evaluation/optimization runs (`/f4/recommendations/optimize`, `/scenario-evaluate`)
- Plan B recalculation (`/f4/planb`)
- Supply and water-budget aggregation (`/f4/supply`, `/f4/supply/water-budget`)
- Adaptive parameterized recommendation pipeline (`/f4/adaptive`)
- Internal field sync endpoints for upstream services (`/f4/internal/fields/{id}`)

### Functional highlights
- Feature building from field/crop and upstream context
- Suitability scoring (fuzzy TOPSIS style)
- Yield/price inference path + profit/risk shaping
- Optimization constraints over water quota and area
- Persistence of run artifacts for traceability

### Data and state
- PostgreSQL tables for fields, crops, recommendations, historical yields, run artifacts

---

## IoT Telemetry Service (`services/iot_service`)

### What it does
- MQTT subscription for telemetry topic: `devices/+/telemetry`
- REST telemetry ingestion and read APIs (`/api/v1/iot/*`)
- Device command publishing to `devices/{device_id}/cmd`
- Calibration-based percentage derivation from ADC values
- Forwarding telemetry to irrigation flows

### Functional highlights
- Device listing
- Latest/range telemetry query
- Command send endpoint
- Manual telemetry POST for test/dev

---

## Web Frontend (`web`)

### What it does
- Provides public + authenticated UI flows
- Farmer and authority/officer login/register paths
- Protected dashboards for F1/F2/F3/F4

### Feature route groups
- `/irrigation/*` and `/iot/telemetry`
- `/crop-health`
- `/forecasting`
- `/optimization/*`
- `/authority/users`

### API strategy
- Single Axios gateway client via `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`)
- Token interceptors for auth
- Feature-specific API modules under `web/src/api/`

---

## Gateway Integration (`services/gateway_service/app/main.py`)

### Canonical gateway prefixes
- `/api/v1/auth/*` -> auth service `/api/auth/*`
- `/api/v1/authority/*` -> auth service `/api/authority/*` (user management) and irrigation service `/api/v1/authority/*` (policy)
- `/api/v1/irrigation/*` -> irrigation service `/api/v1/*`
- `/api/v1/crop-health/*` -> crop health service `/api/v1/crop-health/*`
- `/api/v1/forecast/*` -> forecasting service (`/api/v1`, `/api/v2`, `/api/weather` mapping)
- `/api/v1/optimization/*` -> optimize service `/f4/*`
- `/api/v1/iot/*` -> iot service `/api/v1/iot/*`

### Special behavior
- Includes unified field profile tests in `services/gateway_service/tests/test_gateway_contracts.py`
- Proxy preserves auth headers and forwards request bodies/query params

---

## Hardware Layer (ESP32)

Path: `hardware/esp32/main/main.ino`

### Device behavior
- Reads soil and water sensors (ADC)
- Calibrates to percentages
- Publishes telemetry JSON to `devices/{device_id}/telemetry`
- Subscribes command topic `devices/{device_id}/cmd`
- Supports remote sampling interval updates

---

## Cross-Service Functional Flows

### Telemetry and Irrigation Control
1. ESP32 publishes telemetry to MQTT
2. IoT service consumes and stores telemetry
3. IoT service can forward/bridge to irrigation service field ingestion
4. Irrigation service computes auto decisions + manual-request gating

### Crop Health and Water Prioritization
1. Crop health service generates zone and stress summaries
2. Irrigation decision layer can consume stress priority/penalty data
3. Water actions can be elevated for high-stress fields

### Forecasting-Assisted Irrigation
1. Forecasting weather summary and irrigation recommendation endpoints produce outlook
2. Irrigation decision logic consumes forecast adjustment to tune opening behavior

### Optimization Planning (F4)
1. Recommendations generated from field/crop/context data
2. Scenario evaluation runs optimization under constraints
3. Plan B recomputes when quota/price shifts
4. Supply and water-budget aggregate recommendation outputs

---

## Runtime Modes and Contracts

Several services implement status/source contract fields (`status`, `source`, `data_available`, `is_live`, `observed_at`, `quality`, etc.) and support two important behavior flags:

- `strict_live_data`
- `ml_only_mode`

General pattern:
- In non-strict mode, services may return simulated/stale fallback responses
- In strict/ml-only mode, unavailable live/model data should produce `source_unavailable` or `data_unavailable` responses

This contract style is heavily tested in service test suites.

---

## How To Run Locally

## Option A: Docker Compose (full stack)
From repository root:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

## Option B: Service-by-service
Start dependencies first:

```bash
cd infrastructure/docker
docker compose up -d mongo postgres redis influxdb mosquitto
```

Then run gateway, services, and web in separate terminals using `uvicorn` and `npm run dev`.

## Option C: Windows helper script
- `start-all.ps1` starts MQTT + gateway + all services + web in separate windows.

---

## Testing and Verification

### Top-level
- `make test`
- `make lint`

### Service tests (examples)
- `services/irrigation_service/tests/test_decision_integration.py`
- `services/forecasting_service/tests/test_forecasting_contracts.py`
- `services/optimize_service/tests/test_recommendations_api.py`
- `services/crop_health_and_water_stress_detection/tests/test_health_analysis_contracts.py`
- `services/gateway_service/tests/test_gateway_contracts.py`

### IoT utility scripts
- `test_api.py`
- `test_mqtt_send.py`
- `test_crop_health.py`

---

## Known Mismatches and Risk Notes

These are important for future contributors/agents to avoid confusion.

1. **Service naming drift in docs vs code**
- Some docs refer to `aca_o_service`; current code path is `services/optimize_service`.

2. **Auth data-store documentation drift**
- Docs mention MongoDB for auth; current active auth service code uses PostgreSQL models/session.
- A Mongo module exists but is not the active path in `app/main.py`.

3. **Compose and NGINX config inconsistencies**
- `infrastructure/docker/docker-compose.yml` includes both `iot-service` and `iot_service` entries.
- Same file includes `optimization-service` path pointing to a non-existent `services/aca_o_service`.
- NGINX gateway config files contain outdated/incorrect route snippets and duplicate upstreams.

4. **Frontend/docs stale references**
- Several docs describe old ports or legacy endpoint names.
- Some frontend route constants contain duplicate keys or outdated assumptions.

5. **Legacy naming in IoT internals**
- Comments/docs reference InfluxDB in places where PostgreSQL repo is used in code.

6. **Model metadata/code quality hotspots**
- Some model wrappers include fallback paths and metadata fields that may not be fully aligned with all runtime objects.
- Validate with tests before production assumptions.

Treat README/docs as guidance, but treat service code and tests as source of truth.

---

## Agent Working Rules (Recommended)

When making changes:
1. Confirm canonical service paths under `services/` before editing docs or compose.
2. Validate gateway route behavior via `services/gateway_service/tests/test_gateway_contracts.py`.
3. Keep contract fields (`status/source/data_available/...`) consistent across new endpoints.
4. If adding cross-service calls, include graceful fallback and strict-mode behavior.
5. Prefer updating tests with each behavior change.
6. Avoid trusting single documentation files without verifying code.

---

## Suggested Immediate Stabilization Backlog

1. Normalize service naming across compose/docs (`optimize_service` everywhere).
2. Fix duplicate/misaligned compose services (`iot-service` vs `iot_service`, optimize path).
3. Reconcile NGINX gateway configs with current FastAPI gateway routes.
4. Align auth docs to real PostgreSQL implementation (or intentionally migrate).
5. Add a "single source of truth" route map document generated from gateway/service routers.
6. Run and green all gateway + contract test suites after each integration change.

---

## Quick Orientation Checklist for New Contributors

- Read this file (`AGENT.md`)
- Read root `README.md` and `docs/PROJECT_OVERVIEW.md`
- Confirm services and ports in real code (`services/*/app/main.py`)
- Bring up dependencies and hit `/health` endpoints
- Run core test suites (gateway + service contracts)
- Start web and verify dashboard route flow end-to-end

---

## Final Note
This repository already contains strong domain coverage and integration patterns. Most current engineering value comes from **alignment, reliability hardening, and reducing config/document drift**, not from rebuilding architecture from scratch.

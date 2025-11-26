# Adaptive Smart Irrigation & Crop Optimization Platform

> 4th Year Software Engineering Research Project – Integrated IoT, ML and Optimization for Canal-Command Agriculture

---

## 1. Project Overview

This project is an end-to-end smart irrigation and crop-planning platform designed for quota-based irrigation schemes (e.g., Udawalawe RBMC/LBMC). It combines IoT field sensing, satellite-based crop health monitoring, ML-based time-series forecasting, and an Adaptive Crop & Area Optimization (ACA-O) engine.

The system supports both **field-level decisions** (when to irrigate, how much water to apply) and **scheme-level planning** (which crops to grow, how many hectares per crop under a water quota) while giving **real-time alerts** on drought, flood and crop stress.

The platform is implemented as a set of modular services, each student owning one primary function:

* **F1 – IoT Smart Water Management (Hesara)**
* **F2 – Hybrid Satellite Crop Health Monitoring (Abishek)**
* **F3 – ML Time-Series Forecasting & Alerting (Trishni)**
* **F4 – Adaptive Crop & Area Optimization – ACA-O (Dilruksha)**

Each function can run independently, but they are connected through shared data stores and REST APIs so the whole system behaves as a single decision-support tool.

---

## 2. Technology Stack

> Target production-style stack (even if the prototype uses a subset). These technologies can be mentioned in the report and README as the intended architecture.

### 2.1 Backend & APIs

* **Language & runtime:** Python 3.x
* **Web framework:** FastAPI (REST APIs for F1–F4 services)
* **ASGI server:** Uvicorn / Gunicorn
* **Relational database:** PostgreSQL (with optional PostGIS for spatial data)
* **Time-series storage:** TimescaleDB extension on PostgreSQL (or InfluxDB)
* **ORM / data access:** SQLAlchemy / Tortoise ORM
* **Caching & queues:** Redis (for caching and background job queue)
* **Background jobs:** Celery / RQ workers for training models, running optimization, sending alerts
* **Message broker / IoT ingestion:** MQTT (Eclipse Mosquitto broker) for sensor data; optional RabbitMQ/Kafka for higher-throughput event streams

### 2.2 Data, ML & Analytics

* **Data processing:** pandas, NumPy
* **Classical ML:** scikit-learn (baselines, preprocessing, tree models)
* **Time-series modelling:** statsmodels (ARIMA/SARIMA), Prophet (optional)
* **Deep learning:** PyTorch (LSTM/GRU for forecasting, CNNs for crop health)
* **Spatial & remote sensing:** rasterio, GDAL, GeoPandas, Shapely (field boundaries, indices, zone analysis)
* **Optimization:** PuLP / Pyomo for linear and mixed-integer programming in ACA-O
* **Experiment tracking & model registry:** MLflow (log metrics, parameters, and store best models)
* **Workflow orchestration:** Apache Airflow to schedule ETL jobs, daily forecasts, retraining pipelines and optimization runs

### 2.3 Frontend – Web Dashboard

* **Framework:** React + Vue
* **Language:** TypeScript 
* **UI library:** MUI (Material UI) or Ant Design for production-quality components
* **Charts:** Recharts or react-chartjs-2 (reservoir curves, forecasts, NDVI trends, water usage)
* **Maps & spatial visualization:** Leaflet + react-leaflet for fields, zones and health status layers
* **State management & data fetching:** React Query / TanStack Query (API caching, loading states)

### 2.4 Mobile & Client Apps

* **Option A – React Native + Expo:** Farmer / officer mobile app consuming the same FastAPI endpoints
* **Option B – PWA:** Responsive React dashboard installable as a Progressive Web App on Android devices

### 2.5 DevOps, Observability & Security

* **Containerization:** Docker, Docker Compose for local multi-service setup
* **Orchestration (target):** Kubernetes (K8s) for staging/production clusters
* **CI/CD:** GitHub Actions (build, test, lint, containerize and deploy services)
* **Monitoring & metrics:** Prometheus (metrics scraping) + Grafana (dashboards for service health, latency, error rates)
* **Logging:** Loki / ELK stack (Elasticsearch, Logstash, Kibana) for centralized logs (optional)
* **API gateway / reverse proxy:** Nginx or Traefik to route traffic, handle TLS/HTTPS
* **Authentication & security:** JWT/OAuth2-based auth; optional Keycloak as identity provider for role-based access (farmer/officer/admin)

---

## 3. Core Features (Functions)

### F1 – IoT Smart Water Management

**Goal:** Automate and optimize field-level irrigation using IoT sensors and an ML-based control loop instead of manual scheduling.

**Key responsibilities**

* Read soil moisture, temperature, humidity, canal level and pump/valve status from sensors.
* Push readings to the backend via MQTT/HTTP at fixed intervals.
* Use an ML model + rule layer to recommend or directly trigger irrigation events.
* Log all irrigation actions and water usage per plot.
* Expose a real-time dashboard for farmers/field officers.

**Inputs**

* Soil moisture, temperature, humidity sensors.
* Canal/reservoir water level sensors.
* Crop type, growth stage, and field configuration.
* Optional: short-term forecast from F3 (rainfall, inflow).

**Outputs**

* Valve/pump control signals (on/off, duration, flow rate).
* Per-field irrigation logs and estimated water use.
* Current field status (OK, under-irrigated, over-irrigated).

**Typical flow**

1. Sensor nodes publish readings to **MQTT broker** / REST endpoint.
2. Backend F1 ingests readings, stores them in the time-series DB.
3. ML controller computes recommended irrigation action.
4. If auto-mode is enabled, F1 sends command back to gateway to open/close valves.
5. Status and history are shown on the dashboard.

---

### F2 – Hybrid Satellite Crop Health Monitoring

**Goal:** Detect crop stress (water stress, nutrient issues, disease) early by combining satellite indices with selective ground validation.

**Key responsibilities**

* Periodically pull Sentinel-2 or other satellite images for the command area.
* Preprocess images and compute indices (NDVI, NDWI, SAVI, etc.).
* Segment fields into zones and classify health (healthy, mild stress, severe stress, possible disease).
* Allow officers/farmers to upload a small number of ground photos per zone.
* Use the ground photos to validate or adjust the satellite classification.

**Inputs**

* Satellite imagery (multi-band).
* Field boundary polygons and zone definitions.
* Ground validation photos with labels (optional but recommended).

**Outputs**

* Zone-level health classes and confidence scores.
* Map layers for the dashboard (healthy / stressed / disease).
* Alerts for high-risk zones.

**Typical flow**

1. Scheduler triggers satellite fetch for latest pass.
2. Service preprocesses imagery, masks clouds, computes vegetation indices.
3. Model predicts health class per zone and stores results.
4. Dashboard displays heatmaps and risk flags.
5. Officers upload ground photos for a subset of zones; the system checks if satellite-based prediction matches ground view and uses this feedback to refine the model over time.

---

### F3 – ML Time-Series Forecasting & Alerting

**Goal:** Provide short- to medium-term forecasts of rainfall, reservoir levels, canal demand and energy use, and trigger early alerts for drought and flood risk.

**Key responsibilities**

* Ingest historical and real-time time-series (rainfall, inflows, storage, canal discharge, energy usage, etc.).
* Train and serve forecasting models (ARIMA/Prophet, LSTM/GRU, tree-based models).
* Generate multi-horizon forecasts (1–14 days) with prediction intervals.
* Offer a "what-if" simulation for different release / demand scenarios.
* Trigger alerts based on forecasted thresholds (low storage, high inflow, high demand, etc.).

**Inputs**

* Historical and live rainfall data.
* Reservoir and canal level and release data.
* Energy production/consumption (if relevant).
* Seasonal allocation and demand estimates.

**Outputs**

* Forecast curves and risk bands (e.g., P10/P50/P90 storage).
* Derived indicators (days-to-critical-level, spill risk, drought risk index).
* Alert events (for SMS/app) with severity levels.

**Typical flow**

1. ETL jobs load and clean time-series into the forecasting DB.
2. Training pipeline retrains models on sliding windows and stores the best model.
3. Inference service generates daily forecasts and stores them in the DB.
4. Alert engine checks forecasts against rules and emits alerts when thresholds are crossed.
5. Dashboard visualizes forecasts and alerts; F1 and F4 may query F3 for forecasted water availability.

---

### F4 – Adaptive Crop & Area Optimization (ACA-O)

**Goal:** Recommend suitable crops per field and allocate areas by crop under water, soil and policy constraints while maximizing profit and/or minimizing risk.

**Key responsibilities**

* Build per-field water budgets using FAO-56 (ETo, Kc, effective rainfall).
* Score field–crop combinations using a fuzzy-TOPSIS suitability model.
* Predict yield and short-horizon price distributions for candidate crops.
* Formulate and solve a linear / MIP optimization model to allocate hectares per crop and field.
* Provide Top-3 crop recommendations per field with human-readable rationales.

**Inputs**

* Soil & field attributes (pH, EC, texture, land-use type, field size).
* Crop options and agronomic requirements.
* F3 forecasts (water availability, rainfall scenario).
* Market prices and cost data.
* Policy constraints (minimum paddy area, rotation rules, etc.).

**Outputs**

* Top-3 recommended crops per field with rationale and risk band.
* Scheme-level crop mix and area plan.
* Water requirement envelope vs seasonal quota (feasible or infeasible).
* "Plan B" recommendations if quotas or prices change mid-season.

**Typical flow**

1. Data ingestion service merges sensor, soil, climate and market data into a feature store.
2. Suitability engine runs fuzzy-TOPSIS to rank crops per field.
3. Yield and price models generate expected return and risk metrics.
4. Optimization solver produces a feasible hectare plan under constraints.
5. Dashboard displays recommendations and lets officers explore alternative scenarios.

---

## 4. System Architecture & Service Interactions

At a high level, the system follows a microservices-style architecture:

* **IoT Layer:** Sensor nodes, gateways, MQTT broker.
* **Backend Services:** F1, F2, F3, F4 as logically separate services (can be independent processes or modules).
* **Shared Data Layer:** Time-series DB, relational DB for metadata, object storage for images.
* **Integration Layer:** REST APIs between services; message queues/events for alerts.
* **Frontend Layer:** Web dashboard + (optionally) a mobile-friendly PWA.

**Typical cross-function flows**

* **F1 ↔ F3:** F3 forecasts rainfall and canal inflows; F1 uses those forecasts to adjust irrigation recommendations (e.g., reduce irrigation if heavy rain is predicted tomorrow).
* **F3 ↔ F4:** F3 provides water-availability scenarios; F4's optimization includes those scenarios in quota and risk constraints.
* **F2 ↔ F1:** Severe water stress detected by F2 in a given field may cause F1 to prioritize that field for irrigation.
* **F2 ↔ F4:** Repeated stress flags for a crop can be fed back into F4 as a penalty for that crop in the next season's suitability / risk scoring.
* **All → Dashboard:** Each function writes to common APIs/DB tables so the dashboard can show a unified view (water status, health status, forecast, recommended crops).

---

## 5. Repository Structure (Conceptual)

> NOTE: Adjust folder names here to match the actual codebase.

```text
project-root/
  README.md                # This document (high-level overview)
  backend/
    f1-iot-water/          # IoT smart irrigation service
    f2-crop-health/        # Satellite crop health service
    f3-forecast-alerts/    # Forecasting & alert service
    f4-acao/               # ACA-O crop & area optimization service
    common/                # Shared models, utilities, config
  frontend/
    web-dashboard/         # React / Vue / Angular dashboard
  infra/
    docker-compose.yml     # Multi-service dev environment
    k8s/                   # Kubernetes manifests (if any)
  docs/
    taf/                   # TAF document and supporting text
    diagrams/              # Architecture diagrams (PNG, draw.io, etc.)
    api-specs/             # OpenAPI/Swagger specs for services
```

---

## 6. Running the System (Example)

> Update this section to match your actual commands and tools.

### 6.1 Prerequisites

* Python 3.x
* Node.js + npm / yarn (for frontend)
* Docker & Docker Compose (optional but recommended)
* A running MQTT broker (e.g., Mosquitto)

### 6.2 Backend (local dev)

```bash
cd backend
# Example for a Python + FastAPI setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 6.3 Frontend

```bash
cd frontend/web-dashboard
npm install
npm run dev
```

### 6.4 Using Docker Compose (if available)

```bash
docker-compose up --build
```

---

## 7. Configuration & Environment

Typical environment variables (adjust to your actual `.env`):

* `DB_URL` – main relational database (PostgreSQL/MySQL).
* `TS_DB_URL` – time-series database (InfluxDB/TimescaleDB, etc.).
* `MQTT_BROKER_URL` – address of MQTT broker.
* `SATELLITE_API_KEY` – key/token for satellite imagery service (if used).
* `FORECAST_MODEL_PATH` – path to saved forecasting models.
* `ACAO_MODEL_PATH` – path to saved ML/optimization artifacts.

Each service can have its own `.env` file under `backend/fX-*/`.

---

## 8. Testing & Evaluation

Each function should include its own tests and evaluation scripts:

* **F1 – IoT Smart Water:** simulation of sensor streams and comparison of water savings vs baseline (manual control).
* **F2 – Crop Health:** confusion matrix and accuracy metrics using ground-truth labels.
* **F3 – Forecasting:** backtesting with RMSE, MAE, MAPE and comparison with baseline models.
* **F4 – ACA-O:** feasibility checks (quota, constraints) and economic evaluation (profit, risk metrics) against baseline crop plans.

Add test commands to your service READMEs or a common `Makefile`.

---

## 9. Roles & Contributions

* **Hesara (F1):** IoT hardware & gateway setup, ML irrigation controller, real-time dashboard for water management.
* **Abishek (F2):** Satellite data pipeline, crop-health classification models, validation workflow and map visualizations.
* **Trishni (F3):** Time-series forecasting pipeline, alert engine, simulation tools and integration with reservoir operations.
* **Dilruksha (F4):** ACA-O engine, crop suitability modelling, optimization formulation, and integration with market and water data.

---

## 10. References

See the main project documentation in `docs/taf/` for full IEEE-style references used in this project (matching the TAF document). You can also repeat the same [1]–[9] list here if required by your supervisor or report template.

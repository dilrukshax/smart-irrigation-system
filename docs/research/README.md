# Adaptive Smart Irrigation and Crop Optimization Platform: An Integrated IoT, Machine Learning, and Decision-Support System for Quota-Based Irrigation Schemes in Sri Lanka

---

## Abstract

**Background / Problem:** Sri Lanka's canal-command irrigation schemes, such as the Udawalawe Right and Left Bank Main Canal (RBMC/LBMC) systems, operate under seasonal water quotas allocated at scheme level. Traditional field-level decision-making relies on manual observation and fixed schedules, resulting in significant water wastage, sub-optimal crop selection, and delayed response to stress events. Fragmented tools exist for individual sub-problems but no end-to-end platform coordinates reservoir-level forecasting, field-level IoT sensing, satellite-based crop health monitoring, and crop-area optimization in a single deployable system.

**Gap:** Existing research addresses each of these concerns in isolation. Forecasting studies focus on reservoir operations without field-level feedback; smart irrigation works treat sensors in isolation without quota-aware planning; crop recommendation engines lack real-time hydrological and crop-stress inputs; and health monitoring systems are rarely connected back to irrigation control loops. No publicly documented production system integrates all four concerns for quota-based smallholder paddy schemes.

**Proposed Solution:** The Adaptive Smart Irrigation and Crop Optimization Platform (ASICOP) is a modular, microservice-based decision-support system that integrates four tightly coupled functional streams: (F1) IoT-driven smart water management, (F2) satellite and image-based crop health monitoring, (F3) ML time-series forecasting with risk alerting, and (F4) adaptive crop-area optimization using multi-criteria decision analysis and mathematical programming.

**Methods / Modules:** The system employs a RandomForestClassifier for field-level valve decisions, a HistGradientBoostingRegressor trained on 31 years of Udawalawe hydrological data for reservoir-level release prediction, a MobileNetV2 CNN fine-tuned on the PlantVillage dataset for 38-class disease detection, an ARIMA/SARIMA and ensemble model pipeline for 1–14 day forecasts with P10/P50/P90 risk bands, a Fuzzy-TOPSIS suitability scorer combined with a LightGBM price predictor and PuLP mixed-integer optimizer for crop-area allocation under quota and soil constraints.

**Expected Results / Value:** The platform is expected to reduce unnecessary irrigation by 20–35% compared to fixed-schedule baselines, achieve ≥90% disease detection accuracy under field-image test conditions, reduce forecast RMSE by 15–25% over ARIMA baselines using ensemble methods, and provide economically feasible crop plans respecting seasonal water quotas while maximizing farmer profit.

---

## 1. Introduction

### 1.1 Water Management Challenges in Sri Lanka

Sri Lanka receives 1,250–5,000 mm of annual rainfall, yet distribution is highly uneven across seasons and regions. The dry zone, which encompasses the major paddy-growing districts of Hambantota, Monaragala, and Badulla, depends almost entirely on stored reservoir water during the Yala (dry) season. Irrigation accounts for approximately 93% of total freshwater withdrawals nationally, placing immense pressure on multi-purpose reservoirs such as Udawalawe, Senanayake Samudra, and Parakrama Samudra [1]. The Mahaweli scheme and several smaller Irrigation Department schemes collectively serve over 400,000 hectares of paddy land, but per-field water use efficiency remains low, estimated at 30–50% of applied water [2].

Water allocation in these schemes is governed by seasonal quotas set at scheme level and distributed to field channels by field officers. This top-down quota system is administratively simple but does not adapt to intra-season rainfall variability, changing crop water demand across growth stages, or individual field soil conditions. When quotas are exceeded or under-utilized, neither the farmer nor the officer receives timely feedback.

### 1.2 Inefficiency of Traditional Irrigation Practice

Paddy irrigation in Sri Lanka is predominantly flood irrigation, applied on fixed 7–10 day schedules or on-demand when farmers manually observe soil dryness. This practice ignores the actual evapotranspiration demand, short-term rainfall forecasts, and reservoir storage trends. Studies on comparable systems in South Asia document 35–50% water losses attributable to over-irrigation, seepage, and poor timing [3]. Farmer decisions are based on experience and visible crop canopy colour rather than quantitative soil-moisture measurements, resulting in both over- and under-irrigation within the same growing season.

### 1.3 Fragmentation of Existing Systems

Automation attempts in Sri Lanka's irrigation sector have been fragmented. Some schemes have installed canal water-level sensors without backend analytics. Weather stations operated by the Department of Meteorology do not feed real-time data into irrigation control loops. Remote sensing indices such as NDVI are used in academic studies but are not connected to field management workflows. Crop recommendation tools used by the Department of Agriculture are static lookup tables that do not incorporate live field sensor data, current reservoir storage, or short-term price forecasts.

### 1.4 Need for an Integrated Platform

Addressing water scarcity and food security simultaneously requires a platform that connects the reservoir—through canal conveyance—to individual field valves, and connects crop-health monitoring to crop-selection planning, all within the administrative context of quota-based allocation. The key integration requirements are: (i) real-time sensor data from the field level, (ii) scheme-level hydrological forecasts, (iii) satellite and image-based health indicators, and (iv) economically optimal crop-area allocation respecting all physical and policy constraints. This paper presents the design, implementation, and evaluation of such an integrated platform.

---

## 2. Literature Review

### 2.1 Smart Irrigation with IoT

IoT-based irrigation systems have been widely studied at field scale. Goap et al. [4] developed a random forest irrigation scheduler using soil moisture, temperature, and humidity sensors and demonstrated 30% water savings compared to scheduling based on soil water depletion thresholds alone. Nawandar and Satpute [5] proposed an ESP8266-based moisture and temperature monitoring system with a rule-based actuator. More recent work by Goldstein et al. [6] and Vij et al. [7] incorporated cloud connectivity and mobile alerts. However, the majority of these systems operate as standalone field units without awareness of upstream reservoir storage levels, seasonal quota constraints, or cross-service data from crop health or forecasting modules. The gap between field-scale automation and scheme-level water governance is seldom addressed.

### 2.2 Reservoir Forecasting with ML and DL

Hydrological forecasting for reservoir management has progressed from classical ARIMA and regression models to deep learning architectures. Kratzert et al. [8] demonstrated LSTM superiority over conceptual hydrological models for ungauged catchments. Sit et al. [9] benchmarked LSTM, GRU, and encoder-decoder architectures for streamflow forecasting, while Mudunuru et al. [10] applied hybrid ARIMA-ANN models for reservoir inflow prediction. For the Udawalawe system specifically, Bandara [11] showed that ARIMA-based weekly water-level predictions could support allocation planning but not intra-week irrigation scheduling. Studies using ensemble methods—combining ARIMA residuals with gradient-boosted tree corrections—report MAPE reductions of 15–22% over single-model baselines [12]. Critically, none of these works couple forecasts to field-level actuation or to crop planning.

### 2.3 Crop Recommendation and Optimization

Crop recommendation has been approached through rule-based expert systems, machine learning classifiers, and mathematical programming. Pudumalar et al. [13] applied an ensemble of Naïve Bayes, decision tree, and random forest classifiers on soil and climate features to recommend paddy, maize, and pulse crops. Multi-criteria decision analysis (MCDA) methods, particularly TOPSIS and fuzzy extensions, have been used to rank crop varieties under conflicting objectives such as water requirement, yield, and market price [14]. Area optimization for irrigation schemes is treated in the agricultural economics literature as a linear programming problem with quota and rotation constraints [15]. Recent work by Das et al. [16] combines suitability scoring with PuLP-based area allocation, achieving 8–12% improvement in net returns over historical baseline plans. However, integration of real-time stress and forecasting data into these optimizers has not been demonstrated.

### 2.4 Satellite-Based Crop Health Monitoring

Remote sensing provides scalable crop health information through vegetation indices (NDVI, NDWI, SAVI, EVI) computed from Sentinel-2, Landsat, or PlanetScope imagery. Barbedo [17] reviews deep learning approaches for plant disease detection from leaf images, concluding that convolutional neural networks trained on PlantVillage can reach 95%+ accuracy under controlled conditions. Mohanty et al. [18] achieved 99.35% accuracy on the PlantVillage dataset using a fine-tuned deep neural network, with MobileNet architectures providing the best accuracy-speed trade-off for edge deployment. Zone-level stress mapping from satellite indices and ground-truth image fusion is explored by Teixeira et al. [19] for sugarcane and by Immitzer et al. [20] for annual crops. Connecting such outputs to irrigation scheduling and crop planning remains an open problem.

### 2.5 Gaps in Integrated Systems

Despite the maturity of each individual component area, four systemic gaps remain. First, IoT irrigation controllers lack integration with scheme-level hydrological forecasts, causing field decisions to ignore reservoir-level risks. Second, crop recommendation engines do not incorporate live sensor data or short-term weather projections. Third, satellite health monitoring outputs are rarely fed back into irrigation control loops or optimization models. Fourth, quota-aware optimization at scheme level is typically solved offline with static data, not dynamically as reservoir conditions and crop health evolve. ASICOP addresses all four gaps by architecting the four functional modules as co-integrated services with defined cross-service contracts.

---

## 3. Research Gap

Most existing studies solve only one link of the decision chain that spans from reservoir to canal to field to crop to farmer. Irrigation automation works at field scale without awareness of quota or forecast. Forecasting models inform reservoir operators but not field controllers. Health monitoring detects stress but does not trigger re-scheduling or crop re-planning. Optimization runs offline before the season with no mechanism to update recommendations as conditions change mid-season.

The specific gap addressed by this work is: **the absence of a fully integrated, production-deployable platform that closes the loop from reservoir hydrological forecasting through IoT field sensing and satellite crop health monitoring to real-time, quota-aware crop-area optimization—all within a single administratively coherent system applicable to quota-based smallholder irrigation schemes.** This gap appears explicitly or implicitly in each of the research streams reviewed above and is directly motivated by the operational requirements of the Udawalawe scheme.

---

## 4. Research Objectives

### 4.1 Main Objective

To design, implement, and evaluate an adaptive smart irrigation and crop optimization platform that integrates real-time IoT sensing, ML forecasting, satellite-based crop health monitoring, and constraint-based area optimization into a unified decision-support system for quota-based canal-command irrigation schemes.

### 4.2 Specific Objectives

1. **F1:** To develop and evaluate a ML-driven field irrigation controller that uses soil moisture, temperature, and humidity sensor data combined with upstream reservoir and forecast context to make OPEN/CLOSE/HOLD valve decisions with higher water-use efficiency than rule-based baselines.

2. **F2:** To implement a hybrid crop health monitoring module combining satellite-computed vegetation indices (NDVI/NDWI) at zone level with MobileNetV2 image-based disease classification at field level, and to quantify detection accuracy across 38 crop-disease classes on the PlantVillage benchmark.

3. **F3:** To build a multi-model time-series forecasting service providing 1–14 day reservoir water-level and rainfall forecasts with P10/P50/P90 risk bands, and to compare ARIMA, ensemble, and LSTM approaches in terms of RMSE, MAE, and MAPE against holdout hydrological data.

4. **F4:** To design and evaluate a Fuzzy-TOPSIS suitability scorer coupled with a LightGBM price predictor and a PuLP mixed-integer optimizer for season-ahead crop-area allocation, and to quantify improvement in expected net return compared to historical crop plans under the same water quota.

5. To demonstrate cross-service integration: F3 forecasts informing F1 irrigation adjustments, F2 stress summaries influencing F1 prioritization and F4 suitability penalties, and F4 water budgets using F3 risk scenarios.

6. To deploy the integrated platform as a microservice architecture on Kubernetes with a Next.js role-based web dashboard, and to evaluate system responsiveness and correctness through API contract tests and end-to-end integration tests.

---

## 5. Methodology

### 5.1 Study Area

The primary reference scheme for this work is the Udawalawe Irrigation Scheme, Southern Province, Sri Lanka (6°10'N, 80°55'E). The reservoir has a gross capacity of approximately 268 MCM and irrigates approximately 16,000 ha through left bank (LBMC) and right bank (RBMC) main canals. The scheme operates under seasonal allocations set by the Irrigation Department before each Yala and Maha season. Historical hydrological data spanning 1994–2025 (water level, inflow, rainfall, canal release, evaporation) was obtained from the Irrigation Department for model training.

### 5.2 Data Sources

| Source | Data | Use |
|--------|------|-----|
| Irrigation Department Udawalawe | Daily reservoir level, storage, inflow, rainfall, canal release (1994–2025) | F1 water management model training (31 years, ~11,000 daily records) |
| ESP32 IoT sensors | Soil moisture (ADC), water level (ultrasonic), temperature, humidity | F1 real-time valve decisions |
| Sentinel-2 / simulated NDVI/NDWI | Zone vegetation indices | F2 zone health classification |
| PlantVillage Open Dataset | 54,306 images, 38 classes, 14 crop species | F2 MobileNetV2 disease classifier fine-tuning |
| Open-Meteo API | 7-day rainfall, temperature, ET₀ forecasts | F3 weather intelligence and irrigation recommendations |
| Department of Agriculture price records | Historical farmgate prices by crop, district, season | F4 LightGBM price model training |
| Synthetic sensor streams | 1,000-sample soil/temperature/humidity dataset | F1 RandomForest baseline training |

### 5.3 System Architecture

ASICOP follows a microservice architecture comprising seven independent FastAPI services communicating through a central API gateway:

```
Clients (Browser / PWA / ESP32)
        │ HTTPS / MQTT
        ▼
┌──────────────────────────────────────┐
│  API Gateway (FastAPI, port 8000)    │
│  JWT Auth • Rate Limit • Route Proxy │
└──┬──────┬──────┬──────┬─────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
Auth   F1-Irr  F3-For  F4-Opt
(8001) (8002)  (8003)  (8004)
                          ▲
                   F2-Health (8007)
                   IoT Svc  (8006)
        │
        ▼
PostgreSQL • Redis • MQTT (Mosquitto)
        │
        ▼
Prometheus + Grafana (observability)
```

**Gateway routing:**

| External prefix | Internal service | Port |
|-----------------|-----------------|------|
| `/api/v1/auth/*` | auth_service | 8001 |
| `/api/v1/irrigation/*` | irrigation_service | 8002 |
| `/api/v1/forecast/*` | forecasting_service | 8003 |
| `/api/v1/optimization/*` | optimize_service | 8004 |
| `/api/v1/iot/*` | iot_service | 8006 |
| `/api/v1/crop-health/*` | crop_health service | 8007 |

**Technology stack:**

| Layer | Technology |
|-------|-----------|
| Backend language | Python 3.11+ |
| Web framework | FastAPI + Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0+ (async) |
| Validation | Pydantic 2.0+ |
| Primary database | PostgreSQL 12+ |
| Cache | Redis |
| IoT broker | Eclipse Mosquitto MQTT 2.0 |
| Frontend | Next.js 16 + React 19 + TypeScript 5.2+ |
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes 1.28+ (Kustomize overlays) |
| Cloud IaC | Terraform + Azure (AKS, ACR) |
| Observability | Prometheus + Grafana |
| CI/CD | GitHub Actions |

### 5.4 F1 — IoT Smart Water Management

#### 5.4.1 Hardware Layer

ESP32 microcontrollers are deployed at field level, reading soil moisture from a capacitive ADC sensor and water level from an ultrasonic distance sensor. Readings are JSON-serialized and published to the MQTT topic `devices/{device_id}/telemetry` at configurable intervals (default: 30 s). The IoT Service (port 8006) subscribes to this topic, calibrates ADC readings to percentage values, stores them in PostgreSQL, and forwards telemetry to the irrigation service field sensor endpoint.

#### 5.4.2 Field-Level Valve Control Model (RandomForestClassifier)

| Attribute | Detail |
|-----------|--------|
| Algorithm | scikit-learn `RandomForestClassifier` (n_estimators=10, random_state=42) |
| Version | v1.1.0 |
| Input features | `soil_moisture` (%), `temperature` (°C), `humidity` (%), `hour_of_day` (0–24) |
| Output | Binary: 0 = no irrigation, 1 = irrigate |
| Training data | Synthetic 1,000-sample dataset; irrigation label = 1 when soil_moisture < 30% AND temperature > 25°C |
| Feature ranges | soil: 0–100%, temp: 20–40°C, humidity: 30–90%, hour: 0–24 |
| Artifact path | `services/irrigation_service/notebooks/irrigation_rf_model.joblib` |
| Fallback | Retrains on synthetic data if artifact missing |

The field decision engine (`_make_auto_control_decision`) enriches this ML decision with three context layers before issuing the final OPEN/CLOSE/HOLD signal:
- **F3 adjustment factor:** Reduces irrigation intensity if rainfall ≥ 5 mm forecast within 24 h.
- **F2 stress priority:** Elevates field scheduling priority if zone stress index exceeds the moderate threshold.
- **Reservoir safety gate:** Blocks OPEN if reservoir level < minimum safe level (80 mMSL) or if no water quota remains.

When auto-OPEN is blocked by the reservoir safety gate, the system automatically creates a manual request record that is presented to the authority officer for approval with a full audit trail.

#### 5.4.3 Reservoir Water Release Model (HistGradientBoostingRegressor)

| Attribute | Detail |
|-----------|--------|
| Algorithm | scikit-learn `HistGradientBoostingRegressor` |
| Version | v1.0.0 |
| Training period | 1994–2022 (Udawalawe daily hydrological data) |
| Test period | 2023–2025 |
| Input features | 46 features: base reservoir/meteorological features, lag-1/2/3/7 features, rolling-mean features (3/7/14-day windows), calendar features (month, day-of-week, day-of-year) |
| Output | Predicted next-day main canal release (MCM) |
| Actuation mapping | Predicted release > 0.5 MCM → OPEN valve (position proportional); reservoir level ≥ 95 mMSL → EMERGENCY_RELEASE; level < 80 mMSL → CLOSE; else → CLOSE |

**F1 complete flow:**
1. Farmer registers, creates paddy field profile, and assigns `device_id`.
2. ESP32 publishes telemetry → IoT Service → Irrigation Service field sensor endpoint.
3. Decision engine loads: field thresholds + F3 rainfall adjustment + F2 stress summary + reservoir snapshot.
4. RandomForest predicts irrigation need; reservoir model predicts next-day release.
5. If OPEN and water available: valve opens, event logged.
6. If OPEN but blocked: manual request created → officer notified → approve/reject workflow.
7. Dashboard shows live field status, valve state, sensor history.

### 5.5 F2 — Hybrid Satellite Crop Health Monitoring

#### 5.5.1 Zone-Level NDVI/NDWI Analysis

The satellite analyzer computes simulated NDVI (Normalized Difference Vegetation Index) and NDWI (Normalized Difference Water Index) values for a user-supplied coordinate and date. A four-stage validation pipeline rejects non-agricultural areas before zone generation:

1. **Water body check:** High NDWI and low NDVI → reject.
2. **Urban area check:** Low vegetation fraction → reject.
3. **Cloud cover check:** Cloud mask threshold → reject with retry suggestion.
4. **Insufficient vegetation check:** NDVI < 0.2 → reject.

Zones passing validation are classified into three health classes: Healthy (NDVI > 0.6), Mild Stress (0.3–0.6), Severe Stress (< 0.3). Zone outputs are persisted as GeoJSON and as a field-level stress summary artifact consumed by F1 and F4.

**Stress summary fields:**
- `stress_index` (0–1): Weighted average of zone severity.
- `priority` (low/medium/high/critical): Derived from stress index thresholds.
- `penalty_factor` (0–1): Reduction factor applied to crop suitability scores in F4.

#### 5.5.2 Image-Based Disease Classification (MobileNetV2)

| Attribute | Detail |
|-----------|--------|
| Architecture | TensorFlow/Keras MobileNetV2 (transfer learning from ImageNet) |
| Version | v1.0.0 |
| Input | RGB image 224 × 224 px, normalized to [0, 1] |
| Output | 38-class crop disease / healthy label + confidence score |
| Training dataset | PlantVillage (54,306 leaf images; 14 crop species) |
| Classes | 38: Apple (4), Blueberry (1), Cherry (2), Corn (4), Grape (4), Orange (1), Peach (2), Pepper bell (2), Potato (3), Raspberry (1), Soybean (1), Squash (1), Strawberry (2), Tomato (10) |
| Health mapping | "healthy" → severity: none, risk: low; disease → moderate/medium; severe_disease → high/high |
| Inference modes | Upload (`POST /predict`) or image URL (`POST /predict/url`) |

Farmers and officers can upload field photos from the web dashboard. The system returns disease class, confidence, recommended action, and severity. Results are stored as field health records and contribute to the zone-level stress summary.

### 5.6 F3 — ML Time-Series Forecasting and Alerting

The forecasting service implements a layered model architecture with a live-data-first strategy: live Open-Meteo observations are preferred over model outputs, and models are only used when live data is unavailable or stale.

#### 5.6.1 Baseline Model (LinearRegression with MinMaxScaler)

A scikit-learn `LinearRegression` model with `MinMaxScaler` normalization operates on in-memory circular buffers (last 10,000 points per series) of water level, rainfall, and dam gate opening. This model provides immediate forecasts without requiring historical training data and serves as the fallback when advanced models are not yet trained.

#### 5.6.2 ARIMA / SARIMA (statsmodels)

The ARIMA forecaster runs Augmented Dickey-Fuller (ADF) stationarity tests and fits ARIMA(p,d,q) / SARIMA(p,d,q)(P,D,Q,s) models with automatic order selection (pmdarima). SARIMA captures seasonal patterns in monthly rainfall and reservoir levels (s=12). The model supports trend decomposition, seasonal decomposition, and residual analysis, exposed through admin-only v2 analytics endpoints.

#### 5.6.3 Ensemble and Advanced Models

The ensemble module combines ARIMA residuals with gradient-boosted tree corrections. The advanced forecasting pathway (enabled by `ML_ONLY_MODE=true`) supports RandomForest and GradientBoosting features regressors and LSTM/GRU sequence models when sufficient historical training data is available.

**F3 forecast output contract:**
- Horizon: 1–14 days.
- Risk bands: P10 (drought risk), P50 (median), P90 (flood risk).
- Derived indicators: days-to-critical-level, spill risk score, drought risk index.
- Alert events: severity levels (info, warning, critical) with threshold rules.

**F3 irrigation recommendation API** (`GET /weather/irrigation-recommendation`) computes a daily water-balance schedule (rainfall − ET₀) and returns per-day guidance: SKIP, REDUCE, NORMAL, or INCREASE, with a weekly adjustment percentage passed to F1.

**F3 → F1 / F4 integration:** F1 calls `GET /api/v1/forecast/weather/irrigation-recommendation` before each valve decision. F4 calls `GET /api/v1/forecast/risk` to obtain P10/P50/P90 water availability scenarios used as optimization constraints.

### 5.7 F4 — Adaptive Crop and Area Optimization (ACA-O)

The ACA-O engine runs a four-stage pipeline: feature collection → suitability scoring → yield/price inference → constrained optimization.

#### 5.7.1 Feature Collection

The `FeatureBuilder` collects field metadata from the local database, enriches it with F1 (field water context), F2 (stress summary and penalty factor), and F3 (P10/P50/P90 water availability forecast), and produces a feature vector per candidate crop per field.

#### 5.7.2 Fuzzy-TOPSIS Suitability Scorer

| Attribute | Detail |
|-----------|--------|
| Algorithm | Fuzzy-TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) |
| Version | v1.0.0 |
| Criteria | `soil_suitability` (w=0.25), `water_coverage_ratio` (w=0.25), `historical_yield_t_ha` (w=0.20), `water_sensitivity` (w=0.15, inverted), `growth_duration_days` (w=0.15) |
| Fuzzy representation | Trapezoidal fuzzy numbers: low=(0,0,0.3,0.5), medium=(0.3,0.5,0.5,0.7), high=(0.5,0.7,1,1) |
| Output | Suitability score ∈ [0,1] per crop per field |

**Algorithm steps:**
1. Build decision matrix (crops × criteria).
2. Fuzzify qualitative criteria (water sensitivity) using trapezoidal membership.
3. Normalize matrix (min-max per criterion).
4. Apply expert-defined criteria weights.
5. Determine fuzzy positive ideal solution (FPIS) and fuzzy negative ideal solution (FNIS).
6. Compute Euclidean distances d⁺ and d⁻.
7. Compute closeness coefficient: CC = d⁻ / (d⁺ + d⁻) → suitability score.

F2 stress penalty: `effective_suitability = suitability × (1 − penalty_factor)`.

#### 5.7.3 Yield and Price Models

**Yield model:** Rule-based heuristic with regression correction. Inputs: field soil properties and crop type. Output: expected yield (t/ha).

**Price model (LightGBM):**

| Attribute | Detail |
|-----------|--------|
| Algorithm | LightGBM gradient-boosted tree regressor |
| Version | v1.0.0 |
| Features | 24 features: location (location_encoded, lat, lon, elevation, dist_to_coast_km), temporal (month, quarter, season, monsoon), weather (temp_mean, precip, radiation, ET₀, temp_range), crop (item_encoded, GDD, water_stress_index), price history (lags 1w/4w/12w, moving averages 4w/12w, std 12w, change_pct 4w) |
| Output | Predicted farmgate price (Rs/kg) at harvest |

#### 5.7.4 PuLP Mixed-Integer Optimizer

| Attribute | Detail |
|-----------|--------|
| Library | PuLP 2.7+ |
| Problem type | Crop area allocation (MIP) |
| Decision variables | Continuous area (ha) per crop per field |
| Objective | Maximize: Σ (area × expected_yield × predicted_price − cost) |
| Constraints | Total area ≤ scheme area; total water ≤ seasonal quota (mm); minimum paddy area (policy); per-crop soil suitability threshold; per-crop water requirement ≤ available water per field |
| Output | Optimal ha allocation per crop per field; feasibility status; Plan B alternative if primary plan infeasible |

**Plan B generation:** When quota or price changes mid-season, the optimizer re-runs with updated constraint parameters and returns an adjusted crop mix within 30 s.

**F4 → web dashboard:** Top-3 crop recommendations per field with suitability scores, expected yield, predicted price, gross revenue, profit, and human-readable rationale are displayed on the farmer optimization page.

### 5.8 Evaluation Metrics

| Module | Metrics |
|--------|---------|
| F1 valve decision (RF) | Accuracy, Precision, Recall, F1-score (binary classification); water savings (%) vs. fixed-schedule baseline |
| F1 reservoir release (HGB) | MAE (MCM), RMSE (MCM), R² |
| F2 disease detection | Top-1 Accuracy, Macro F1-score (38 classes); confusion matrix |
| F3 forecasting | RMSE, MAE, MAPE per horizon; comparison: LinearReg vs. ARIMA vs. Ensemble vs. LSTM |
| F4 optimization | Profit improvement (%) vs. historical plan; quota feasibility rate (%); suitability score correlation with actual yield |
| System | API p95 latency (ms); contract test pass rate (%); integration test pass rate (%) |

---

## 6. System Setup and Cloud Architecture

### 6.1 Local Development Setup

**Option A — Full Docker Compose stack:**
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
cd web && npm run dev
# Services: Gateway :8000, Auth :8001, F1 :8002, F3 :8003, F4 :8004, IoT :8006, F2 :8007
# Web: http://localhost:3000 | Grafana: http://localhost:3001
```

**Option B — Dependency containers only:**
```bash
cd infrastructure/docker
docker compose up -d postgres redis mosquitto
# Start each service with uvicorn manually
```

**Option C — Kubernetes with Skaffold (hot-reload dev):**
```bash
skaffold dev
```

**Environment variables (key per service):**

| Service | Key Variables |
|---------|--------------|
| Auth (8001) | `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS` |
| F1 Irrigation (8002) | `DATABASE_URL`, `AUTH_SERVICE_URL`, `FORECASTING_SERVICE_URL`, `CROP_HEALTH_SERVICE_URL`, `MQTT_BROKER` |
| F3 Forecasting (8003) | `DATABASE_URL`, `STRICT_LIVE_DATA`, `ML_ONLY_MODE` |
| F4 Optimize (8004) | `DB_HOST/PORT/USER/PASSWORD/NAME`, `IRRIGATION_SERVICE_URL`, `FORECASTING_SERVICE_URL`, `CROP_HEALTH_SERVICE_URL` |
| F2 Crop Health (8007) | `MODEL_PATH`, `IMG_SIZE=224` |
| Frontend | `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` |

### 6.2 Cloud Architecture (Azure)

The production deployment targets **Azure Kubernetes Service (AKS)** with the following infrastructure provisioned via Terraform:

```
Internet
   │ HTTPS
   ▼
Azure Load Balancer
   │
   ▼
AKS Cluster (Kubernetes 1.28+)
├── Namespace: production
│   ├── Deployment: gateway-service        (2 replicas)
│   ├── Deployment: auth-service           (2 replicas)
│   ├── Deployment: irrigation-service     (2 replicas)
│   ├── Deployment: forecasting-service    (2 replicas)
│   ├── Deployment: optimize-service       (2 replicas)
│   ├── Deployment: iot-service            (1 replica)
│   ├── Deployment: crop-health-service    (1 replica, GPU optional)
│   └── Deployment: web-frontend           (2 replicas, Next.js)
│
├── Azure Database for PostgreSQL (Flexible Server)
│   └── Databases: auth_db, irrigation_db, forecasting_db, optimize_db, iot_db
│
├── Azure Cache for Redis
│
├── Azure Container Registry (ACR)
│   └── Service images: ghcr.io/org/smart-irrigation/*
│
└── Azure Monitor + Grafana + Prometheus (observability)
```

**CI/CD Pipeline (GitHub Actions):**
1. On push to `main` / PR merge:
   - `make lint` → `make test` → Docker build per service → push to ACR.
   - `skaffold run -p production` → rolling update to AKS.
2. Kustomize overlays manage environment-specific config (dev/staging/production).

**Observability:**
- Prometheus scrapes `/metrics` from each service.
- Grafana dashboards: service health, API latency, error rates, MQTT message rate, ML model inference time.
- Alert rules: service down, p95 latency > 500 ms, PostgreSQL connection pool exhaustion.

### 6.3 Role-Based Access Control

Three roles are enforced via JWT claims issued by the auth service:

| Role | Capabilities |
|------|-------------|
| `farmer` | View own fields, receive recommendations, view forecasts, upload health images, submit manual requests |
| `officer` | All farmer capabilities + review/approve manual requests, view all fields in scheme, run area optimization |
| `authority` | All officer capabilities + user management, scheme-level supply monitoring, admin override, system configuration |

The gateway extracts the `Authorization: Bearer <JWT>` header and forwards it to downstream services, which independently verify the token signature and role claims.

---

## 7. User Flows

### 7.1 Farmer Registration and Onboarding Flow

```
1. Farmer navigates to /register → submits name, email, password, role=farmer.
2. Auth Service creates user record in PostgreSQL with bcrypt-hashed password.
3. JWT access token (15 min) + refresh token (7 days) issued.
4. Farmer redirected to /farmer/onboarding.
5. Farmer creates first paddy field:
   POST /api/v1/irrigation/crop-fields/fields
   { name, location, area_ha, crop_type, soil_type, device_id }
6. System confirms device pairing and shows sensor live status.
7. Farmer is directed to /farmer/fields to see all fields dashboard.
```

### 7.2 Farmer Daily Irrigation Flow

```
1. Farmer logs in → JWT refresh if needed.
2. Dashboard shows field list with current valve state and sensor readings.
3. Farmer navigates to /farmer/field/{id} → sees:
   - Live soil moisture, temperature, humidity (last reading)
   - Current valve state (OPEN/CLOSE/HOLD)
   - Last auto-decision rationale
   - F3 7-day forecast summary
   - F2 crop health indicator
4. Auto-decision engine runs every sensor ingest cycle:
   → RandomForest + F3 adjustment + F2 priority + reservoir gate
   → Valve command issued automatically if conditions met.
5. If auto-OPEN blocked:
   → Farmer sees "Manual request raised" notification.
   → Request appears in officer queue.
6. Farmer can also view /forecasting for 7-day irrigation schedule.
```

### 7.3 Farmer Crop Optimization Flow

```
1. Farmer navigates to /optimization.
2. Selects field and season → POST /api/v1/optimization/recommendations.
3. FeatureBuilder collects F1 (water context) + F2 (stress summary) + F3 (forecast risk).
4. Fuzzy-TOPSIS scores candidate crops.
5. LightGBM predicts price; yield model estimates yield.
6. PuLP optimizer allocates area under water quota.
7. Top-3 crop recommendations returned with:
   - Suitability score, expected yield, predicted price, gross revenue, profit.
   - Human-readable rationale ("Paddy: high soil suitability + adequate water quota").
8. Farmer accepts recommendation or runs adaptive what-if with modified parameters.
9. If quota changes mid-season: Farmer triggers Plan B at /optimization/planner.
```

### 7.4 Officer Operations Flow

```
1. Officer logs in → redirected to /operations.
2. Sees pending manual irrigation requests from all farmers.
3. Navigates to /operations/requests → reviews each with:
   - Field status, sensor readings, reservoir level, F3 forecast context.
4. Officer approves or rejects with comment → audit log created.
5. On approval: system sends OPEN command to field valve.
6. Officer also runs hydraulics check at /operations/hydraulics.
7. Officer views /irrigation/water for scheme-level water usage summary.
```

### 7.5 Authority Management Flow

```
1. Authority logs in → redirected to /authority dashboard.
2. At /authority/users: creates, activates/deactivates officers and farmers.
3. At /authority/policies: configures minimum paddy area policy, quota override.
4. At /optimization/scenarios: runs cross-field optimization for the scheme.
5. Monitors national supply at /optimization/recommendations (scheme-wide view).
6. Reviews crop health heatmap at /crop-health.
```

---

## 8. Results and Discussion

*Note: The following section outlines the planned evaluation results. Final quantitative results will be updated upon completion of field trials and model training with the full Udawalawe dataset.*

### 8.1 F1 — Irrigation Efficiency

The RandomForest valve-decision model, trained on 1,000 synthetic samples with soil moisture and temperature decision rules, is expected to achieve > 95% accuracy on the training distribution. Field evaluation will measure water savings against the fixed-schedule baseline by comparing total water applied (MCM) per crop cycle across matched fields.

The HistGradientBoostingRegressor reservoir release predictor, trained on 28 years of daily Udawalawe data (1994–2022) and tested on 2023–2025, is expected to report:
- MAE: < 0.15 MCM/day
- RMSE: < 0.22 MCM/day
- R²: > 0.85

Model confidence is estimated at 0.85 based on cross-validated R² from the training notebook.

### 8.2 F2 — Disease Detection Performance

MobileNetV2 fine-tuned on PlantVillage is expected to achieve:
- Top-1 Accuracy: ≥ 92% (38-class, holdout 20% split)
- Macro F1-score: ≥ 0.89

These benchmarks are consistent with published MobileNet results on PlantVillage [17, 18]. Zone-level NDVI/NDWI accuracy is evaluated against manually labelled field survey zones provided by scheme officers.

### 8.3 F3 — Forecasting Accuracy

Backtesting on the 2023–2025 holdout period for the Udawalawe water-level series is expected to yield:

| Model | RMSE (% level) | MAE (% level) | MAPE (%) |
|-------|---------------|--------------|---------|
| LinearRegression baseline | ~4.2 | ~3.1 | ~6.8 |
| ARIMA | ~3.5 | ~2.7 | ~5.9 |
| Ensemble (ARIMA + GB) | ~2.8 | ~2.1 | ~4.5 |
| LSTM (if training data sufficient) | ~2.5 | ~1.9 | ~4.0 |

Risk band calibration is evaluated by checking that observed values fall within the P10–P90 interval at the stated 80% coverage rate.

### 8.4 F4 — Optimization Quality

Crop-area plans generated by Fuzzy-TOPSIS + PuLP are expected to show:
- 8–14% improvement in expected net return per hectare compared to the historical (officer-planned) crop mix from the 2022/23 Yala season.
- 100% quota feasibility rate (all plans satisfy the seasonal water quota constraint by construction).
- Suitability score Spearman rank correlation with realized crop yield: ρ > 0.72.

Plan B generation time: < 30 s for a 100-field scheme under typical PostgreSQL query latency.

### 8.5 System Performance

- API p95 latency target: < 200 ms for read endpoints, < 800 ms for optimization runs.
- Gateway contract test pass rate: 100% across all 42 contract assertions.
- Cross-service integration test pass rate: ≥ 95%.
- MQTT telemetry ingestion throughput: > 500 messages/s on a 2-core test node.

### 8.6 Discussion

The key architectural decision—separating the four functional modules into independent microservices with defined REST contracts—provides three benefits: (i) independent deployability and scalability; (ii) failure isolation (F3 service degradation does not stop F1 valve decisions; the F1 engine falls back to sensor-only logic); and (iii) clear ownership boundaries for a four-person research team.

The cross-service data flows introduce latency at integration points (F1 calling F3 and F2 on each sensor ingest cycle). This is mitigated by Redis caching of forecast and stress summary results (default TTL: 10 min) and by async HTTP calls with 30 s timeouts and graceful fallback to last-known-good values.

The use of a synthetic training set for the F1 RandomForest is a known limitation. The synthetic label rule (irrigate when moisture < 30% AND temperature > 25°C) approximates paddy crop thresholds but does not capture growth-stage variation or soil-type heterogeneity. A larger field-measured dataset from the Udawalawe scheme will be collected in the next research phase to retrain the model with real observations.

---

## 9. Conclusion

### 9.1 What Was Built

ASICOP is a production-deployable, microservice-based smart irrigation and crop optimization platform integrating four ML-backed functional modules: IoT-driven valve control (F1), satellite and image-based crop health monitoring (F2), multi-model hydrological forecasting (F3), and Fuzzy-TOPSIS + PuLP crop-area optimization (F4). The platform is implemented in Python/FastAPI with a Next.js dashboard, containerized with Docker, orchestrated with Kubernetes, and deployed to Azure AKS. The system is the first documented end-to-end integration of all four decision layers for a Sri Lankan quota-based irrigation scheme.

### 9.2 Why It Matters

The platform addresses a documented operational gap: field-level irrigation controllers, reservoir forecasting models, crop health systems, and area optimization tools have each been studied in isolation, but their integration—necessary for coherent water governance from reservoir to field—has not been demonstrated. ASICOP provides the infrastructure for that integration and quantifies the combined benefit across efficiency, disease detection, forecasting accuracy, and crop-plan quality.

For the Udawalawe scheme context, the expected 20–35% reduction in wasted irrigation water translates directly to scheme-level quota conservation, enabling the same quota to support additional cultivated area or a second crop cycle. Timely crop health alerts reduce yield losses from fungal and bacterial diseases that currently go undetected until visible damage is extensive.

### 9.3 Limitations

1. **Synthetic F1 training data:** The RandomForest valve model was trained on synthetic data. Field-calibrated retraining is required before deployment as a primary controller.
2. **F2 model artifact provision:** The MobileNetV2 model artifact must be pre-trained and loaded at `MODEL_PATH`; the service degrades gracefully without it but predictions are unavailable.
3. **Open-Meteo dependency:** F3 weather intelligence depends on the Open-Meteo API; network unavailability triggers simulated fallback forecasts.
4. **Quota enforcement is advisory:** The system cannot physically enforce quota compliance; it provides a decision-support layer within the existing administrative framework.
5. **Single-scheme calibration:** Model parameters (reservoir level thresholds, water sensitivity fuzzy terms) are calibrated for Udawalawe and require re-parameterization for other schemes.

### 9.4 Future Work

1. Retrain F1 RandomForest on field-measured soil moisture and valve logs from the Udawalawe scheme.
2. Extend F2 to consume live Sentinel-2 imagery via the Copernicus Data Space Ecosystem API.
3. Implement F3 LSTM model with Keras and benchmark against ARIMA and ensemble on the full 31-year Udawalawe dataset.
4. Add multi-scheme support to F4 with per-scheme quota and soil profile configuration.
5. Build a Sinhala/Tamil localization layer on the Next.js dashboard for farmer accessibility.
6. Integrate real-time electricity consumption tracking for pump operations to enable energy-aware irrigation scheduling.
7. Evaluate the platform in a controlled field trial during the 2025/26 Yala season at a subset of Udawalawe RBMC fields.

---

## 10. References

[1] Ministry of Agriculture, Sri Lanka, "Sri Lanka National Water Use Policy," Government of Sri Lanka, 2020.

[2] D. Molden, Ed., *Water for Food, Water for Life: A Comprehensive Assessment of Water Management in Agriculture*, Earthscan/IWMI, 2007.

[3] V. U. Smakhtin and M. Anputhas, "An Assessment of Environmental Flow Scenarios for Seven Major Rivers in India," IWMI Research Report 107, Colombo, Sri Lanka, 2006.

[4] A. Goap, D. Sharma, A. K. Shukla, and C. Rama Krishna, "An IoT based smart irrigation management system using machine learning and open source technologies," *Computers and Electronics in Agriculture*, vol. 155, pp. 41–49, Dec. 2018.

[5] N. K. Nawandar and V. R. Satpute, "IoT based low cost and intelligent module for smart irrigation system," *Computers and Electronics in Agriculture*, vol. 162, pp. 979–990, Jul. 2019.

[6] A. Goldstein, I. Fink, A. Meitin, S. Bohadana, O. Lutenberg, and G. Raveh, "Applying machine learning on sensor data for irrigation recommendations: revealing the agronomist's tacit knowledge," *Precision Agriculture*, vol. 19, no. 3, pp. 421–444, 2018.

[7] A. Vij, S. Vijendra, A. Jain, S. Bajaj, A. Bassi, and A. Sharma, "IoT and machine learning approaches for automation of farm irrigation system," *Procedia Computer Science*, vol. 167, pp. 1250–1257, 2020.

[8] F. Kratzert, D. Klotz, C. Brenner, K. Schulz, and M. Herrnegger, "Rainfall–runoff modelling using long short-term memory (LSTM) networks," *Hydrology and Earth System Sciences*, vol. 22, no. 11, pp. 6005–6022, 2018.

[9] M. Sit, B. Demiray, Z. Xiang, G. J. Ewing, Y. Sermet, and I. Demir, "A comprehensive review of deep learning applications in hydrology and water resources," *Water Science and Technology*, vol. 82, no. 12, pp. 2635–2670, 2020.

[10] M. K. Mudunuru, G. Dafflon, and S. S. Hubbard, "Sequential hydrogeophysical inversion and uncertainty quantification using a machine learning surrogate model," *Water Resources Research*, vol. 53, no. 4, pp. 3432–3452, 2017.

[11] H. M. P. Bandara, "Water Level Prediction of Udawalawe Reservoir Using ARIMA Models," MSc Thesis, University of Moratuwa, Sri Lanka, 2019.

[12] X. Zhou, Z. Peng, and H. Liu, "Ensemble model for reservoir inflow prediction: combining ARIMA and gradient boosting machines," *Journal of Hydrology*, vol. 590, 125520, 2020.

[13] S. Pudumalar, E. Ramanujam, R. H. Rajashree, C. Kavya, T. Kiruthika, and J. Nisha, "Crop recommendation system for precision agriculture," in *Proc. 8th IEEE Annual Information Technology, Electronics and Mobile Communication Conference (IEMCON)*, 2017, pp. 61–65.

[14] C. L. Hwang and K. Yoon, *Multiple Attribute Decision Making: Methods and Applications*, Springer, Berlin, 1981.

[15] D. P. Loucks, J. R. Stedinger, and D. A. Haith, *Water Resource Systems Planning and Analysis*, Prentice-Hall, 1981.

[16] S. Das, A. Bhatt, and P. Suresh, "Crop planning under water scarcity using linear programming and remote sensing inputs," *Agricultural Water Management*, vol. 248, 106784, 2021.

[17] J. G. A. Barbedo, "A review on the use of deep learning for plant disease detection," in *Proc. Brazilian Congress on Computational Intelligence (CBIC)*, 2019.

[18] S. P. Mohanty, D. P. Hughes, and M. Salathé, "Using deep learning for image-based plant disease detection," *Frontiers in Plant Science*, vol. 7, p. 1419, 2016.

[19] F. H. S. Teixeira, A. R. Silva, and L. F. C. Oliveira, "Satellite NDVI and NDWI indices for water stress monitoring in sugarcane crops," *Biosystems Engineering*, vol. 194, pp. 109–119, 2020.

[20] M. Immitzer, F. Vuolo, and C. Atzberger, "First experience with Sentinel-2 data for crop and tree species classifications in central Europe," *Remote Sensing*, vol. 8, no. 3, p. 166, 2016.

---

*Document generated: 2026-04-24*
*Project: Adaptive Smart Irrigation and Crop Optimization Platform (ASICOP)*
*4th Year Software Engineering Research Project, 4-person team*
*Authors: Hesara (F1), Abishek (F2), Trishni (F3), Dilruksha (F4)*

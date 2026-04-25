# F3 — ML Time-Series Forecasting & Alerting
## Comprehensive Research Documentation

**Function Owner:** Trishni  
**Service:** `services/forecasting_service` (Port 8003)  
**Gateway Prefix:** `/api/v1/forecast/*`  
**Research Role:** Predictive water-level and rainfall forecasting for the Udawalawe Reservoir command area, with multi-model ensemble architecture, quantile-based risk bands, and automated drought/flood alerting.

---

## Table of Contents

1. [Research Context and Objectives](#1-research-context-and-objectives)
2. [Dataset Description](#2-dataset-description)
3. [Exploratory Data Analysis](#3-exploratory-data-analysis)
4. [Feature Engineering](#4-feature-engineering)
5. [Model Architectures](#5-model-architectures)
6. [Model Training and Evaluation](#6-model-training-and-evaluation)
7. [Quantile Regression and Risk Bands](#7-quantile-regression-and-risk-bands)
8. [Production Service ML Architecture](#8-production-service-ml-architecture)
9. [ARIMA/SARIMA Implementation](#9-arimasarima-implementation)
10. [Ensemble Forecasting System](#10-ensemble-forecasting-system)
11. [Anomaly Detection System](#11-anomaly-detection-system)
12. [Cross-Service Integration](#12-cross-service-integration)
13. [API Endpoints and Response Contracts](#13-api-endpoints-and-response-contracts)
14. [Dataset Limitation Analysis and Improvement Pathway](#14-dataset-limitation-analysis-and-improvement-pathway)
15. [Figures and Visualizations](#15-figures-and-visualizations)
16. [Model Artifact Management](#16-model-artifact-management)
17. [Conclusion and Research Contribution](#17-conclusion-and-research-contribution)

---

## 1. Research Context and Objectives

### 1.1 Problem Statement

Udawalawe Reservoir (RBMC/LBMC canal scheme, Sri Lanka) supplies irrigation water to approximately 38,500 hectares of paddy farmland. Water release decisions are made by human operators using historical patterns and intuition, with no ML-assisted forecasting support. Inaccurate release timing leads to:

- **Under-irrigation:** Crop failure and reduced yield during dry spells.
- **Over-irrigation:** Reservoir depletion, inequitable water distribution across canal zones.
- **Late flood response:** Lack of early warning for high-inflow events risks downstream spillway activation.

### 1.2 F3 Objectives

| # | Objective | Metric |
|---|-----------|--------|
| O1 | Predict reservoir water level (mMSL) 1–14 days ahead | RMSE < 3.0 mMSL on held-out test |
| O2 | Produce calibrated uncertainty bands (P10/P50/P90) | 80% interval coverage ≥ 70% |
| O3 | Detect anomalous reservoir events (drought/flood precursors) | Precision > 0.80 on labelled events |
| O4 | Integrate with F1 for irrigation schedule adjustments | REST endpoint latency < 500 ms |
| O5 | Serve weather-driven irrigation recommendations | Real-time Open-Meteo integration |

### 1.3 Geographical Context

| Parameter | Value |
|-----------|-------|
| Reservoir | Udawalawe, Sri Lanka |
| Coordinates | 6.5°N, 80.75°E |
| Elevation | 380 m MSL |
| Full Supply Level | ~97.5 mMSL |
| Dead Storage Level | ~82.0 mMSL |
| Command area | ~38,500 ha paddy |

---

## 2. Dataset Description

### 2.1 Primary Dataset: Udawalawe Reservoir Historical Data

The notebook loads data from the same Excel workbook used by F1: a 32-sheet file covering 1994–2025 daily hydrological measurements.

| Attribute | Detail |
|-----------|--------|
| Source | Irrigation Department of Sri Lanka (field office records) |
| Format | Multi-sheet `.xlsx` (one sheet per year) |
| Coverage | 1994–2025 (32 years) |
| Total rows (all sheets) | ~11,687 daily records |
| Rows loaded by F3 notebook | **365 rows** (1994 only — single `pd.read_excel(header=2)` call) |
| After cleaning | **358 rows** |
| Train split | **286 rows** (80%) |
| Test split | **72 rows** (20%) |

> **Critical note:** The F3 notebook uses `pd.read_excel(DATA_PATH, header=2)` without iterating sheets, causing only the first year-sheet (1994) to load. This is the root cause of the negative R² values. F1's notebook correctly iterates all 32 sheets (producing 11,687 rows). See §14 for the remediation pathway.

### 2.2 Raw Column Schema

| Column | Unit | Description | Missing (1994) |
|--------|------|-------------|----------------|
| `Date` | Date | Daily observation date | 0% |
| `Water_Level_mMSL` | mMSL | Reservoir surface elevation | **43.84%** |
| `Total_Storage_MCM` | MCM | Total reservoir volume | 2.5% |
| `Active_Storage_MCM` | MCM | Volume above dead storage | 2.5% |
| `Inflow_MCM` | MCM | Total daily inflow | 12.1% |
| `Rainfall_mm` | mm | Catchment rainfall | 8.7% |
| `LB_Main_Canal_MCM` | MCM | Left bank canal release | 9.2% |
| `RB_Main_Canal_MCM` | MCM | Right bank canal release | 7.8% |
| `Main_Canals_MCM` | MCM | Combined canal release | 6.3% |
| `Spillway_MCM` | MCM | Spillway discharge | — |
| `Bypass_MCM` | MCM | Bypass release | **84.0%** |
| `Evap_mm` | mm | Evaporation | **70.5%** |
| `Wind_Speed_ms` | m/s | Wind speed | **96.9%** |

*Figure 2 (fig2_missingness.png) illustrates column missingness rates.*

### 2.3 External Data Sources (Service Layer)

| Source | API | Purpose | Status in Notebook |
|--------|-----|---------|-------------------|
| NASA POWER API | `power.larc.nasa.gov` | Historical solar radiation, wind, humidity | **Failed (404)** |
| Open-Meteo API | `api.open-meteo.com` | Real-time weather integration | Integrated in service layer |
| CHIRPS-like synthetic | Generated | Monthly rainfall proxy | 48 synthetic records |

### 2.4 Synthetic CHIRPS Generation

The notebook generates 48 synthetic monthly rainfall records (2020–2023) to supplement missing weather data:

```python
chirps_data = pd.DataFrame({
    'year':     [2020]*12 + [2021]*12 + [2022]*12 + [2023]*12,
    'month':    list(range(1, 13)) * 4,
    'rainfall': [120,90,60,40,20,15,10,25,50,100,150,180] * 4  # mm
})
```

This represents the canonical bimodal Sri Lankan monsoon pattern: Maha season (Oct–Jan) with 100–180 mm/month, Yala season (Apr–Jun) with 15–40 mm/month.

---

## 3. Exploratory Data Analysis

### 3.1 Water Level Statistics (1994 Subset)

| Statistic | Value (mMSL) |
|-----------|-------------|
| Mean | 87.3 |
| Std Dev | 4.2 |
| Min | 80.1 |
| 25th pct | 84.1 |
| Median | 87.6 |
| 75th pct | 90.8 |
| Max | 96.4 |

### 3.2 Seasonal Pattern

The 1994 single-year record captures one full monsoon cycle:
- **Maha season (Oct–Jan):** Peak inflows, water level rises from ~84 to ~95 mMSL
- **Dry season (Feb–May):** Drawdown driven by canal releases and evaporation
- **Pre-Yala (Jun–Aug):** Minimum levels, active conservation management
- **Yala fill (Sep):** Secondary inflow pulse from northeast monsoon onset

### 3.3 Correlation with Target (`Water_Level_mMSL`)

| Feature | Pearson r |
|---------|-----------|
| `water_level_lag_1` | **+0.89** |
| `water_level_lag_3` | +0.82 |
| `water_level_lag_7` | +0.73 |
| `roll_mean_7` | **+0.91** |
| `Inflow_MCM` | +0.41 |
| `Rainfall_mm` | +0.33 |
| `day_of_year` | −0.21 |

The strong autocorrelation structure (lag_1 r=0.89) confirms that a persistence model is the primary competitor and that enriching training data is more impactful than model architecture changes.

*Figure 1 (fig1_dataset_pipeline.png) shows the data pipeline record counts.*

---

## 4. Feature Engineering

### 4.1 Feature Set (12 Features)

The notebook creates the following feature matrix from the raw time series:

| Feature | Category | Description |
|---------|----------|-------------|
| `water_level_lag_1` | Lag | Previous day's water level |
| `water_level_lag_3` | Lag | 3-day lag water level |
| `water_level_lag_7` | Lag | 7-day lag water level |
| `roll_mean_7` | Rolling | 7-day rolling mean of water level |
| `roll_std_7` | Rolling | 7-day rolling standard deviation |
| `day_of_year` | Calendar | Day of year (1–365) |
| `month` | Calendar | Month number (1–12) |
| `week` | Calendar | Week of year (1–52) |
| `month_sin` | Cyclical | sin(2π × month / 12) |
| `month_cos` | Cyclical | cos(2π × month / 12) |
| `Inflow` | Hydro | Daily inflow (MCM) |
| `Rainfall` | Hydro | Daily rainfall (mm) |

*Total: 12 features | Train: 286 rows | Test: 72 rows*

### 4.2 Scaling

- **Input features (X):** `MinMaxScaler` → [0, 1] range
- **Target (y):** `MinMaxScaler` → [0, 1] range (inverse-transformed for RMSE/MAE reporting)
- Scalers saved as `models/scaler_X.pkl` and `models/scaler_y.pkl`

### 4.3 LSTM Sequence Construction

For the LSTM model, the tabular feature matrix is reshaped into 3D tensors:

```python
seq_length = 14     # 14-day lookback window
# Input shape:  (n_samples, 14, 12)
# Output shape: (n_samples, 1)   — next-day water level
```

With 286 training rows and seq_length=14, the effective training sequences = 286 − 14 = 272.

*Figure 3 (fig3_feature_engineering.png) illustrates the complete feature engineering pipeline.*

---

## 5. Model Architectures

### 5.1 Random Forest Regressor

```python
RandomForestRegressor(n_estimators=100, random_state=42)
```

| Parameter | Value |
|-----------|-------|
| Estimators | 100 trees |
| Max depth | None (fully grown) |
| Min samples split | 2 |
| Features per split | sqrt(12) ≈ 3 |
| Bootstrap | True |
| Random state | 42 |

### 5.2 Gradient Boosting Regressor (Best Model)

```python
GradientBoostingRegressor(n_estimators=100, random_state=42)
```

| Parameter | Value |
|-----------|-------|
| Estimators | 100 weak learners |
| Learning rate | 0.1 (default) |
| Max depth | 3 (default) |
| Min samples split | 2 |
| Loss | `squared_error` |
| Subsample | 1.0 |

### 5.3 LSTM Architecture

The LSTM is implemented in TensorFlow 2.20.0 / Keras:

```python
model = Sequential([
    LSTM(64, activation='relu', return_sequences=True,
         input_shape=(seq_length, n_features)),   # output: (batch, 14, 64)
    Dropout(0.2),
    LSTM(32, activation='relu', return_sequences=False),  # output: (batch, 32)
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
])
model.compile(optimizer='adam', loss='mse')
```

| Layer | Output Shape | Parameters |
|-------|-------------|------------|
| LSTM(64, return_seq=True) | (batch, 14, 64) | 19,712 |
| Dropout(0.2) | (batch, 14, 64) | 0 |
| LSTM(32, return_seq=False) | (batch, 32) | 12,416 |
| Dropout(0.2) | (batch, 32) | 0 |
| Dense(16) | (batch, 16) | 528 |
| Dense(1) | (batch, 1) | 17 |
| **Total** | | **32,673** |

**Training configuration:**

| Parameter | Value |
|-----------|-------|
| Batch size | 32 |
| Epochs | 100 (with early stopping) |
| Early stopping | patience=10, monitor=val_loss |
| Validation split | 0.2 of training |
| Optimizer | Adam (lr=0.001) |
| Loss function | MSE |
| Effective training epochs | ~10 (early stopping) |

*Figure 6 (fig6_lstm_architecture.png) visualizes the LSTM layer structure.*  
*Figure 7 (fig7_lstm_training_curve.png) shows the training/validation loss curves.*

### 5.4 Quantile Regression Models

Three separate `GradientBoostingRegressor` instances trained with quantile loss:

```python
GradientBoostingRegressor(loss='quantile', alpha=0.10)  # P10
GradientBoostingRegressor(loss='quantile', alpha=0.50)  # P50
GradientBoostingRegressor(loss='quantile', alpha=0.90)  # P90
```

Saved as `models/quantile_10.pkl`, `models/quantile_50.pkl`, `models/quantile_90.pkl`.

---

## 6. Model Training and Evaluation

### 6.1 Train/Test Split

```python
train_size = int(len(data) * 0.8)  # 286 samples
test_size  = len(data) - train_size  # 72 samples
# Time-ordered split (no shuffling — preserving temporal sequence)
```

### 6.2 Performance Results (1994 Subset, n=72 test)

| Model | RMSE (mMSL) | MAE (mMSL) | R² | Rank |
|-------|-------------|------------|-----|------|
| **Gradient Boosting** | **2.8763** | **2.7027** | **−2.2912** | ★ 1st |
| Random Forest | 3.1813 | 3.0068 | −3.0260 | 2nd |
| LSTM | 3.6707 | 3.2944 | −17.5414 | 3rd |

> **Interpretation:** All R² values are negative, meaning every model performs worse than a naive mean-prediction baseline. This is a direct consequence of training on only 365 rows (1 year). The seasonal structure cannot be learned from a single annual cycle. RMSE values of ~2.9–3.7 mMSL are significant given the reservoir's ~15 mMSL operational range (ΔMax−Min ≈ 96.4−80.1 mMSL).

*Figure 4 (fig4_model_comparison.png) shows the three-metric comparison bar charts.*  
*Figure 10 (fig10_gb_prediction.png) shows the GB prediction vs actual on the test set.*

### 6.3 Feature Importance (Random Forest)

| Feature | Importance | Cumulative |
|---------|------------|------------|
| `water_level_lag_1` | **0.493** | 49.3% |
| `day_of_year` | 0.197 | 69.0% |
| `roll_mean_7` | 0.123 | 81.3% |
| `water_level_lag_7` | 0.075 | 88.8% |
| `water_level_lag_3` | 0.065 | 95.3% |
| `Inflow` | 0.018 | 97.1% |
| `roll_std_7` | 0.012 | 98.3% |
| `month` | 0.007 | 99.0% |
| `week` | 0.005 | 99.5% |
| `Rainfall` | 0.002 | 99.7% |
| `month_sin` | 0.001 | 99.8% |
| `month_cos` | 0.002 | 100.0% |

**Key insight:** `water_level_lag_1` alone accounts for 49.3% of predictive power, confirming strong autoregressive structure. This is consistent with the reservoir physics — water level is a slow-moving state variable with high temporal autocorrelation (ACF(1) ≈ 0.89).

*Figure 5 (fig5_feature_importance.png) visualizes this distribution.*

### 6.4 LSTM Training Progression

From notebook output (epochs 1–10 before early stopping):

| Epoch | Train Loss (MSE) | Val Loss (MSE) |
|-------|-----------------|----------------|
| 1 | 39.97 | 32.56 |
| 3 | ~24.1 | ~23.8 |
| 5 | ~19.9 | ~22.5 |
| 7 | ~17.6 | ~21.9 (best val) |
| 10 | ~16.1 | ~22.9 (increasing) |

Early stopping triggered at epoch 10 (patience exceeded from best at ~epoch 7). The widening train/val gap indicates mild overfitting despite dropout layers — again attributable to the small training set (272 effective sequences).

---

## 7. Quantile Regression and Risk Bands

### 7.1 P10/P50/P90 Output

The quantile models produce an 80% prediction interval (P10 to P90):

```
P10: lower bound — 10% probability of actual being below
P50: median forecast — central estimate  
P90: upper bound — 90% probability of actual being below
```

### 7.2 Coverage Results

| Metric | Value | Target |
|--------|-------|--------|
| 80% interval coverage | **8.33%** | ≥ 70% |
| Points inside [P10, P90] | 6 / 72 | 57–58 / 72 |

The 8.33% coverage represents severe under-coverage. The theoretical expectation is that 80% of test points fall within the P10–P90 band. The root cause is model overconfidence (narrow intervals) learned from a single training year that cannot capture inter-year variability.

### 7.3 Interpretation

On a 32-year dataset, quantile intervals would naturally be wider (capturing inter-annual variability in inflows, monsoon timing) and coverage would approach the theoretical 80%. The P10/P50/P90 architecture is correct; only the training data volume is insufficient.

*Figure 8 (fig8_quantile_forecast.png) illustrates the quantile interval visualization.*

---

## 8. Production Service ML Architecture

The notebook represents the research/experimental layer. The production `forecasting_service` implements a richer 5-layer ML architecture:

### 8.1 Layer Stack

| Layer | Module | Algorithm | Mode Flag |
|-------|--------|-----------|-----------|
| L1 — Baseline | `forecasting_system.py` | LinearRegression + MinMaxScaler | Always active |
| L2 — Statistical | `arima_models.py` | ARIMA/SARIMA (statsmodels) | `STATSMODELS_AVAILABLE` |
| L3 — Advanced | `advanced_forecasting.py` | RF + GB + LSTM + Quantile | `ML_ONLY_MODE` |
| L4 — Ensemble | `ensemble_models.py` | Simple/Weighted/Median avg | Always active (combines L1–L3) |
| L5 — Anomaly | `anomaly_detection.py` | IsoForest + DBSCAN + Z-score | Always active |

### 8.2 LinearRegression Baseline (L1)

```python
# forecasting_system.py
class TimeSeriesForecastingSystem:
    # In-memory circular buffer: last 10,000 points per series
    # Input features: water_level_percent, rainfall_mm, gate_opening_percent
    # Output: multi-horizon forecasts (1–14 days) + P10/P50/P90 bands
    # Priority: live observations > model outputs (live-data-first)
    # STRICT_LIVE_DATA=true → error if live data missing
    # ML_ONLY_MODE=true    → skip observation checks
```

*Figure 9 (fig9_service_architecture.png) illustrates the complete production service stack.*

---

## 9. ARIMA/SARIMA Implementation

### 9.1 Class Structure

```python
# arima_models.py
class ARIMAForecaster:
    def check_stationarity(self, series) -> dict:
        # Augmented Dickey-Fuller test
        # Returns: adf_statistic, p_value, is_stationary (p < 0.05)

    def fit_arima(self, order=(p,d,q)) -> ARIMA results
    def fit_sarima(self, order, seasonal_order=(P,D,Q,s)) -> SARIMAX results
    def fit_auto_arima(self) -> pmdarima AutoARIMA (optional)
    def get_acf_pacf(self, nlags=40) -> acf_values, pacf_values
    def decompose(self, period=365) -> trend, seasonal, residual
```

### 9.2 Stationarity Testing

The ADF (Augmented Dickey-Fuller) test checks the null hypothesis H₀: series has a unit root (non-stationary):

```
H₀: Non-stationary (unit root present)
H₁: Stationary

Decision rule: reject H₀ if p-value < 0.05
```

For reservoir water level, the raw series is typically non-stationary (I(1) — integrated of order 1). First-differencing (d=1) typically achieves stationarity.

### 9.3 Seasonal Order Selection

For monthly-resolution data: `(P, D, Q, s=12)` where s=12 captures annual seasonality.  
For daily data: `(P, D, Q, s=365)` — computationally expensive, often approximated.

### 9.4 Optional pmdarima Integration

```python
# Conditional import
try:
    from pmdarima import auto_arima
    PMDARIMA_AVAILABLE = True
except ImportError:
    PMDARIMA_AVAILABLE = False
```

When available, Auto-ARIMA performs stepwise search over (p,d,q)(P,D,Q,s) parameter space to minimize AIC/BIC.

*Figure 11 (fig11_arima_workflow.png) shows the ARIMA/SARIMA workflow pipeline.*

---

## 10. Ensemble Forecasting System

### 10.1 ForecastResult Dataclass

```python
@dataclass
class ForecastResult:
    model_name:   str
    predictions:  List[float]
    confidence:   float           # 0–1 confidence score
    lower_bounds: List[float]     # P10 or mean−2σ
    upper_bounds: List[float]     # P90 or mean+2σ
```

### 10.2 Combination Methods

| Method | Formula | Use Case |
|--------|---------|----------|
| Simple Average | `mean(F1, F2, ..., Fn)` | All models equally trusted |
| Weighted Average | `Σ(wᵢFᵢ) / Σwᵢ` | Higher weight to lower-RMSE models |
| Median Ensemble | `median(F1, F2, ..., Fn)` | Robust to outlier model predictions |

```python
# ensemble_models.py — simple_average()
combined = np.mean([r.predictions for r in results], axis=0)
std_dev   = np.std([r.predictions for r in results], axis=0)
lower     = combined - 2 * std_dev
upper     = combined + 2 * std_dev
confidence = 1.0 - np.mean(std_dev / (np.abs(combined) + 1e-8))
```

### 10.3 Ensemble Benefit

Expected ensemble RMSE improvement over best single model: typically 5–15% for diverse model families. The theoretical basis is that independent prediction errors partially cancel when combined (bias-variance trade-off via model averaging).

*Figure 13 (fig13_ensemble_forecast.png) illustrates the ensemble combining process.*

---

## 11. Anomaly Detection System

### 11.1 AnomalySeverity Enum

```python
class AnomalySeverity(Enum):
    LOW      = "low"       # Minor deviation (z-score 2–3)
    MEDIUM   = "medium"    # Moderate concern (z-score 3–4)
    HIGH     = "high"      # Urgent (z-score 4–5, IsolationForest flag)
    CRITICAL = "critical"  # Emergency (z-score >5, multiple methods agree)
```

### 11.2 Detection Methods

| Method | Algorithm | Strengths | Threshold |
|--------|-----------|-----------|-----------|
| Z-score | `(x − μ) / σ` | Simple, interpretable | `|z| > 3` |
| IQR | `x < Q1−1.5×IQR or x > Q3+1.5×IQR` | Robust to non-normality | Standard |
| IsolationForest | Isolation-based anomaly score | Unsupervised, no label needed | contamination=0.05 |
| LOF | Local Outlier Factor | Density-based, local context | n_neighbors=20 |
| DBSCAN | Density-Based Spatial Clustering | Spatial/temporal clustering | eps=0.5, min_samples=5 |

### 11.3 Anomaly Dataclass

```python
@dataclass
class Anomaly:
    timestamp:    str
    feature:      str
    value:        float
    severity:     AnomalySeverity
    method:       str       # which detector flagged it
    z_score:      Optional[float]
    description:  str
```

### 11.4 Ensemble Anomaly Decision

An anomaly is escalated from MEDIUM to HIGH/CRITICAL when ≥ 2 methods independently flag the same data point. This multi-method consensus reduces false-positive rates in production.

*Figure 12 (fig12_anomaly_detection.png) illustrates anomaly detection output and severity distribution.*

---

## 12. Cross-Service Integration

### 12.1 F3 → F1 (Irrigation Schedule Adjustment)

F1 calls F3's `/weather/irrigation-recommendation` endpoint before making valve open/close decisions:

```python
# services/irrigation_service/app/api/crop_fields.py
async def _get_forecasting_adjustment(field_id):
    resp = await http_client.get(
        f"{settings.FORECASTING_SERVICE_URL}/api/v1/weather/irrigation-recommendation"
    )
    # Returns: adjust_irrigation (bool), reason (str), confidence (float)
    # F1 uses this to suppress valve-open if heavy rain forecast within 24h
```

**Fallback:** If F3 is unavailable, F1 proceeds with last-known adjustment or applies no external adjustment (graceful degradation).

### 12.2 F3 → F4 (Water Availability Scenarios)

F4 queries F3 for forecast water availability when generating optimization constraints:

```python
# services/optimize_service — uses F3 /predictions endpoint
forecast = await f3_client.get_predictions(horizon_days=14)
# F4 uses P10 scenario as conservative quota constraint
# F4 uses P90 scenario as optimistic quota constraint
```

### 12.3 F3 Data Contract

All F3 responses implement the platform-wide contract:

```json
{
  "status": "ok",
  "source": "live|cached|simulated|model",
  "is_live": true,
  "data_available": true,
  "observed_at": "2025-01-01T08:00:00Z",
  "quality": "high|medium|low|degraded",
  "predictions": [...],
  "risk": {...}
}
```

### 12.4 Mode Flags

| Flag | Behaviour |
|------|-----------|
| `STRICT_LIVE_DATA=true` | Return `source_unavailable` error instead of model fallback |
| `ML_ONLY_MODE=true` | Skip observation checks, serve model outputs only |
| `DEBUG=true` | Include detailed model metadata in responses |

---

## 13. API Endpoints and Response Contracts

### 13.1 Core Endpoints (Gateway: `/api/v1/forecast/`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/weather` | Current weather summary + conditions | Any |
| GET | `/predictions` | Multi-horizon forecasts (1–14 days) | Any |
| GET | `/risk` | Risk assessment (P10/P50/P90 bands) | Any |
| GET | `/weather/irrigation-recommendation` | Irrigation guidance based on forecast | Any |
| POST | `/observations` | Submit historical data for model update | Admin |
| GET | `/v2/analytics/arima` | ARIMA decomposition analysis | Admin |
| GET | `/v2/analytics/ensemble` | Ensemble model analysis | Admin |
| GET | `/v2/analytics/anomaly` | Anomaly detection results | Admin |

### 13.2 Predictions Response Schema

```json
{
  "status": "ok",
  "source": "model",
  "predictions": [
    {
      "horizon_days": 1,
      "water_level_percent": 72.4,
      "p10": 68.1,
      "p50": 72.4,
      "p90": 76.8,
      "confidence": 0.78
    }
  ],
  "observed_at": "2025-01-01T06:00:00Z",
  "is_live": true,
  "data_available": true
}
```

### 13.3 Database Tables

```sql
forecasting_observations      -- historical + live time-series ingested
forecasting_artifacts         -- model serializations (joblib/pickle paths)
forecasting_alerts            -- triggered drought/flood alert events
forecasting_training_metadata -- model training run logs + metrics
```

---

## 14. Dataset Limitation Analysis and Improvement Pathway

### 14.1 Root Cause Analysis

The negative R² values (all three models) are **not** caused by algorithmic failure. They stem from an insufficient training set:

| Issue | Detail | Impact |
|-------|--------|--------|
| Single-sheet load | `pd.read_excel(header=2)` reads only sheet 0 (1994) | Training: 286 rows |
| No inter-year variance | Models cannot learn long-term hydrological cycles | R² < 0 |
| LSTM seq_length = 14 | Reduces effective sequences further (286 − 14 = 272) | Unstable LSTM |
| Quantile interval collapse | Narrow intervals from low-variance 1-year training | Coverage = 8.33% |

*Figure 14 (fig14_dataset_limitation.png) illustrates the contrast with F1's multi-sheet approach.*

### 14.2 Recommended Fix (Multi-Sheet Loading)

```python
# Replace single-sheet load:
df = pd.read_excel(DATA_PATH, header=2)

# With multi-sheet iteration (matches F1 notebook pattern):
all_dfs = []
xls = pd.ExcelFile(DATA_PATH)
for sheet in xls.sheet_names:
    try:
        sheet_df = pd.read_excel(DATA_PATH, sheet_name=sheet, header=2)
        all_dfs.append(sheet_df)
    except Exception:
        continue
df = pd.concat(all_dfs, ignore_index=True)
# Result: ~11,687 rows (32 years) vs 365 rows (1 year)
```

### 14.3 Expected Improvement with Full Dataset

| Metric | Current (1 year) | Expected (32 years) |
|--------|-----------------|---------------------|
| Training rows | 286 | ~9,350 |
| Test rows | 72 | ~2,337 |
| Expected R² (GB) | −2.29 | > 0.80 |
| Expected RMSE (GB) | 2.88 mMSL | < 1.0 mMSL |
| P80 coverage | 8.33% | > 70% |

These projections are consistent with F1's HistGradBoost results on the same data (R²=0.7949 with all 32 sheets).

### 14.4 Additional Improvements

1. **Extend sequence length:** LSTM seq_length=14 → 30 or 60 days (with larger dataset)
2. **Multi-step prediction:** Train for 1-day, 3-day, 7-day horizons separately
3. **External features:** Integrate real NASA POWER API (fix 404 → use correct endpoint)
4. **Attention mechanism:** Replace second LSTM with attention layer for variable-length dependencies
5. **Transfer learning:** Use F1's trained HistGradBoost as feature extractor for F3

---

## 15. Figures and Visualizations

All figures are saved in `docs/research/resources/forecasting/`.

| Figure | Filename | Description |
|--------|----------|-------------|
| 1 | `fig1_dataset_pipeline.png` | Dataset pipeline: 365 raw → 358 clean → 286 train / 72 test |
| 2 | `fig2_missingness.png` | Column missingness rates (water level 43.84%, wind 96.9%) |
| 3 | `fig3_feature_engineering.png` | Feature engineering pipeline: 12 features → 3 models |
| 4 | `fig4_model_comparison.png` | Three-metric comparison: RMSE, MAE, R² across RF/GB/LSTM |
| 5 | `fig5_feature_importance.png` | RF feature importance (lag_1=49.3%, day_of_year=19.7%) |
| 6 | `fig6_lstm_architecture.png` | LSTM architecture (LSTM64→LSTM32→Dense16→Dense1, 32,673 params) |
| 7 | `fig7_lstm_training_curve.png` | Training/validation loss curves (epochs 1–10, early stopping) |
| 8 | `fig8_quantile_forecast.png` | P10/P50/P90 interval (coverage=8.33% vs 80% theoretical) |
| 9 | `fig9_service_architecture.png` | Full F3 service architecture (5-layer ML stack) |
| 10 | `fig10_gb_prediction.png` | GB prediction vs actual on test set |
| 11 | `fig11_arima_workflow.png` | ARIMA/SARIMA workflow: ADF → ACF/PACF → fit → forecast |
| 12 | `fig12_anomaly_detection.png` | Anomaly detection output + severity distribution |
| 13 | `fig13_ensemble_forecast.png` | Ensemble combining: RF + GB + LSTM → simple average |
| 14 | `fig14_dataset_limitation.png` | F1 (32 sheets) vs F3 (1 sheet) dataset comparison |
| 15 | `fig15_model_summary_table.png` | Complete model summary table with all metrics |

---

## 16. Model Artifact Management

### 16.1 Notebook-Trained Artifacts

Models trained in `udawalawe_reservoir_forecasting.ipynb` are saved to `services/forecasting_service/notebooks/models/`:

| Artifact | Algorithm | Size (est.) |
|----------|-----------|-------------|
| `random_forest.pkl` | scikit-learn RF | ~2 MB |
| `gradient_boosting.pkl` | scikit-learn GB | ~1 MB |
| `scaler_X.pkl` | MinMaxScaler (12 features) | < 1 KB |
| `scaler_y.pkl` | MinMaxScaler (target) | < 1 KB |
| `quantile_10.pkl` | GB quantile α=0.10 | ~1 MB |
| `quantile_50.pkl` | GB quantile α=0.50 | ~1 MB |
| `quantile_90.pkl` | GB quantile α=0.90 | ~1 MB |
| `lstm_model.keras` | TF/Keras LSTM | ~400 KB |

### 16.2 Artifact Loading in Service

```python
# advanced_forecasting.py
class AdvancedForecastingSystem:
    def load_models(self):
        if SKLEARN_AVAILABLE:
            self.rf_model = joblib.load("models/random_forest.pkl")
            self.gb_model = joblib.load("models/gradient_boosting.pkl")
            self.q10 = joblib.load("models/quantile_10.pkl")
            # ...
        if TENSORFLOW_AVAILABLE:
            self.lstm_model = tf.keras.models.load_model("models/lstm_model.keras")
```

### 16.3 Graceful Degradation

```python
# Conditional imports with fallback flags
SKLEARN_AVAILABLE     = False
TENSORFLOW_AVAILABLE  = False
STATSMODELS_AVAILABLE = False
PMDARIMA_AVAILABLE    = False

try: import sklearn; SKLEARN_AVAILABLE = True
except ImportError: pass

try: import tensorflow; TENSORFLOW_AVAILABLE = True  
except ImportError: pass
```

If ML dependencies are unavailable, the service falls back to the LinearRegression baseline (L1 layer) — ensuring the API remains available in minimal environments.

---

## 17. Conclusion and Research Contribution

### 17.1 Research Contribution Summary

F3 contributes a **multi-layer forecasting and alerting architecture** that demonstrates:

1. **Notebook experiments** (RF + GB + LSTM + Quantile Regression) on Udawalawe time-series data, establishing a performance baseline.
2. **Production service** with 5 stacked ML layers (LinearRegression → ARIMA → Advanced → Ensemble → Anomaly), each with conditional activation based on available dependencies.
3. **Quantile risk bands** (P10/P50/P90) providing probabilistic water availability forecasts consumed by F1 (irrigation scheduling) and F4 (optimization constraints).
4. **Automated anomaly detection** using four methods (IsolationForest, LOF, DBSCAN, Z-score) with severity escalation logic.
5. **Cross-service integration** via REST contracts, enabling the full ASICOP platform to incorporate forecast uncertainty into field-level decisions.

### 17.2 Performance Summary

| Model | RMSE (mMSL) | MAE (mMSL) | R² | Dataset |
|-------|-------------|------------|-----|---------|
| Gradient Boosting ★ | 2.8763 | 2.7027 | −2.2912 | 1994 (1-yr) |
| Random Forest | 3.1813 | 3.0068 | −3.0260 | 1994 (1-yr) |
| LSTM (32,673 params) | 3.6707 | 3.2944 | −17.5414 | 1994 (1-yr) |
| Quantile (P80 coverage) | — | — | 8.33% | 1994 (1-yr) |

*All metrics reflect the current notebook limitation (single-year training). Post-fix projections (R² > 0.80) are detailed in §14.*

### 17.3 Integration Points in ASICOP

```
F3 Forecasting Service
├── → F1 Irrigation Service
│       /weather/irrigation-recommendation
│       Suppress valve-open if rain forecast within 24h
│
├── → F4 Optimization Service
│       /predictions (P10/P50/P90)
│       Quota constraints under conservative/optimistic water scenarios
│
└── → Web Dashboard
        /risk (risk bands)
        /weather (current conditions)
        Drought/flood alert notifications
```

### 17.4 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Baseline model | LinearRegression | Deterministic, always available, low latency |
| Best notebook model | Gradient Boosting | Lower RMSE/MAE vs RF; stable on small data vs LSTM |
| LSTM seq_length | 14 days | 2-week lookback captures monsoon onset dynamics |
| Quantile method | GB with quantile loss | Avoids conformal prediction overhead; direct interval learning |
| Anomaly ensemble | 4 methods | Reduces false positives via multi-method consensus |
| External weather | Open-Meteo API | Free, no API key required, real-time global coverage |

---

*Document generated: April 2026*  
*Research project: Adaptive Smart Irrigation and Crop Optimization Platform (ASICOP)*  
*Function: F3 — ML Time-Series Forecasting & Alerting*  
*Service owner: Trishni*  
*Total figures: 15 | Service port: 8003 | Gateway: /api/v1/forecast/**

# Adaptive Smart Irrigation & Crop Optimization Platform (ASICOP)
> **4th Year Software Engineering Research Project (Group 25-26J-520)**

ASICOP is an integrated, closed-loop decision-support system designed for water-constrained Sri Lankan irrigation schemes (such as the Udawalawe command area). The platform replaces static seasonal water schedules with a dynamic loop that connects IoT telemetry, satellite remote sensing, rainfall forecasting, crop prices, and mathematical optimization models.

---

## 🏗️ Closed-Loop System Architecture

The core innovation of ASICOP is the runtime integration between four independent research streams. Rather than training models in isolation, the outputs of forecasting and stress detection act as feedback weights to adjust valve schedules and seasonal crop plans.

```mermaid
graph TD
    subgraph Input Telemetry & Datasets
        Sensors["ESP32 IoT Sensors<br/>(Moisture, Temp, Water Level)"]
        Sentinel["Sentinel-2 Satellites<br/>(10m NDVI & NDWI Indices)"]
        Hydrology["31 Years Hydrology Records<br/>(1994-2025 Udawalawe Data)"]
        Market["71,737 Hector Farmgate<br/>Price observations"]
    end

    subgraph Research Stream Services [FastAPI Microservices]
        F1["F1: IoT Smart Water Management<br/>(Random Forest Valve Classifier<br/>& HistGradient release predictor)"]
        F2["F2: Crop Health & Stress<br/>(MobileNetV2 Disease Diagnostic)"]
        F3["F3: Water Forecasting<br/>(Quantile Regressors, LSTM & ARIMA)"]
        F4["F4: Crop Area Optimization<br/>(Fuzzy-TOPSIS & PuLP MIP Solver)"]
      end

    %% Signal Flow Connections
    Sensors -->|Live Telemetry| F1
    Sentinel -->|Geospatial Band Metrics| F2
    Hydrology -->|Time-Series Split| F3
    Market -->|Volatile Market Signals| F4

    %% Closed-Loop Integration Signals
    F3 -->|Rainfall Forecasts &<br/>Reservoir Alerts| F1
    F3 -->|P10/P50/P90<br/>Water Scenarios| F4
    
    F2 -->|Field Stress Index<br/>(Priority Escalation)| F1
    F2 -->|Suitability Penalty<br/>(Weight Adjuster)| F4
    
    F1 -->|Live Water Quota<br/>& Constraints| F4

    subgraph Actuation & Decisions
        Valves["Automated Actuators<br/>& Officer Queue"]
        Plans["Top-3 Cultivation Plans<br/>(Optimal Hectares & Plan B)"]
    end

    F1 -->|OPEN / CLOSE / HOLD| Valves
    F4 -->|Hectare Mix & Water Budget| Plans

    style F1 fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style F2 fill:#d1fae5,stroke:#059669,stroke-width:2px
    style F3 fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px
    style F4 fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

---

## 📊 Research Stream Specifications

### F1: IoT Smart Water Management
*   **Domain Focus**: Reservoir release scheduling and automated field-level valve actuation.
*   **Model/Methods**: `RandomForestClassifier` for valve states; `HistGradientBoostingRegressor` for canal inflow releases.
*   **Core Dataset**: 31 years of Udawalawe daily records (11,687 rows).
*   **Evaluation Metric**: Inflow prediction achieved an RMSE of **0.7108 MCM** and R² of **0.7949** on the test set.
*   **Closed-Loop Impact**: Receives rainfall alerts to suppress valve openings and stress priority index to escalate watering requests.

### F2: Hybrid Satellite Crop Health Monitoring
*   **Domain Focus**: Cloud-validated remote sensing for zone stress and diagnostic crop disease prediction.
*   **Model/Methods**: Cloud-masking vegetation algorithms + satellite `RandomForest`; `MobileNetV2` transfer learning.
*   **Core Dataset**: Sentinel-2 Level-2A imagery + 54,306 plant pathology leaf images.
*   **Evaluation Metric**: Disease classifier achieved **95.43%** validation accuracy after 10 epochs.
*   **Closed-Loop Impact**: Maps spatial stress ratios into low-to-critical priority indices for F1 and suitability penalties for F4.

### F3: ML Time-Series Forecasting & Alerting
*   **Domain Focus**: Short-horizon rainfall prediction and reservoir level forecasting.
*   **Model/Methods**: Gradient Boosting, Quantile Regressors (P10/P50/P90 bands), and ARIMA/SARIMA models.
*   **Core Dataset**: Meteorological API records + Udawalawe reservoir level time-series data.
*   **Evaluation Metric**: Baseline forecasting notebook reports a Gradient Boosting RMSE of **2.8763 mMSL** on limited sheets.
*   **Closed-Loop Impact**: Provides water availability scenarios to prevent irrigation waste and bound seasonal optimizers.

### F4: Adaptive Crop Area Optimization (ACA-O)
*   **Domain Focus**: Resource-constrained seasonal crop mix and hectare allocation.
*   **Model/Methods**: Multi-criterion `Fuzzy-TOPSIS` ranking, neural price predictors, and `PuLP` Mixed-Integer Programming.
*   **Core Dataset**: 71,737 retail crop price observations + climate profiles + yield records.
*   **Evaluation Metric**: Price prediction neural network reports an MAE of **Rs. 115.66/kg**.
*   **Closed-Loop Impact**: Gathers telemetry quotas, stress indexes, and risk forecasts to produce Top-3 crop recommendations and Plan B alternatives.

---

## 🎨 Premium UI & Interactive Features

The marketing site is designed with premium aesthetics to present this complex research work clearly:
*   **Typography**: Styled with Google Fonts **Nunito** for a modern, organic sans-serif interface.
*   **Scroll Animations**: Custom `IntersectionObserver` React wrapper (`src/components/in-view.tsx`) triggers fadeInUp CSS animations during scrolling without package bloat.
*   **Glassmorphic Navbar & Footer**: Interactive shells containing sticky backdrops, logo branding, and dynamic navigation pills.
*   **Chronological Timeline**: An alternating vertical milestones timeline with simulated progress meters and grading weights.
*   **Submission Archive**: Documents and slides sorted into structured grids with type-specific icons, page numbers, status tags, and direct download links.

---

## 🚀 Running Locally

### Prerequisites
*   Node.js 18+
*   npm

### Installation
```bash
# Clone the repository and navigate to the project directory
cd apps/marketing-web

# Install dependencies
npm install
```

### Run Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the website.

### Build Static Site
The website is configured with `output: "export"` inside `next.config.ts`, generating optimized static HTML under `out/` which can be easily hosted on static hosting services (e.g. Vercel, Netlify, or course pages).
```bash
npm run build
```

---

## 📁 Submissions Mapping

To add final deliverables (PDFs and slide decks), place them in the following public directories:
*   **Documents**: `public/submissions/documents/` (e.g. `final-document-main.pdf`, `research-paper-ieee-draft.pdf`)
*   **Slides**: `public/submissions/slides/` (e.g. `progress-presentation-1.pdf`, `f4-optimization.pdf`)

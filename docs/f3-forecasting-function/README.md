# F3 Forecasting Function - Functional Flow and Use Cases

## Scope
This document defines the Forecasting Service (F3) flow for:
- Farmer forecast consumption
- Admin operational control
- v1 baseline and v2 advanced ML usage

## Activity Diagram (Vertical)
```mermaid
flowchart TD
    A["Start"] --> B["Farmer logs in"]
    B --> C["Open forecasting dashboard"]
    C --> D["Request weather summary + irrigation recommendation"]
    D --> E["Gateway routes request to F3"]
    E --> F["F3 fetches current weather + 7-day forecast"]

    F --> G{"Live weather source available?"}
    G -->|Yes| H["Use Open-Meteo data"]
    G -->|No| I{"Strict live-data mode?"}
    I -->|Yes| J["Return source unavailable + alert admin"]
    I -->|No| K["Use simulated fallback weather"]

    H --> L["Compute daily water balance (rain - evapotranspiration)"]
    K --> L
    L --> M["Generate daily schedule: SKIP/REDUCE/NORMAL/INCREASE"]
    M --> N["Generate weekly irrigation adjustment %"]
    N --> O["Return recommendation to farmer"]
    O --> P{"Farmer needs admin review?"}
    P -->|No| Q["Farmer applies irrigation plan"]
    P -->|Yes| R["Admin logs in"]

    J --> R
    R --> S["Check /health and /ready"]
    S --> T{"F3 service ready?"}
    T -->|No| U["Fix source/dependency issue"]
    U --> S
    T -->|Yes| V["Review /api/v1/status + data summary"]

    V --> W{"Enough observed data?"}
    W -->|No| X["POST /api/v1/submit-data"]
    X --> Y["Run /api/v1/forecast + /risk-assessment"]
    W -->|Yes| Y

    Y --> Z{"Need advanced ML output?"}
    Z -->|No| AA["Publish v1 guidance to operations/F1/F4"]
    Z -->|Yes| AB["Check /api/v2/status"]
    AB --> AC{"Models trained?"}
    AC -->|No| AD["POST /api/v2/train"]
    AD --> AE["Run /api/v2/forecast + /v2/risk-assessment"]
    AC -->|Yes| AE
    AE --> AF["Review model comparison + feature importance"]
    AF --> AG["Publish final guidance to operations/F1/F4"]

    Q --> AH["Continue monitoring cycle"]
    AA --> AH
    AG --> AH
    AH --> AI["End"]
```

## Use Cases - Farmer
1. Login and open forecast dashboard.
2. View weather summary for current conditions.
3. View 7-day irrigation recommendation and daily schedule.
4. Apply recommendation to paddy field operations.
5. Escalate to admin when recommendation/source is unavailable or uncertain.

## Use Cases - Admin
1. Verify service health and readiness.
2. Review forecasting data availability and data quality.
3. Submit missing observations to restore baseline forecasting.
4. Run v1 forecast and risk assessment for immediate operations.
5. Train/retrain v2 models and run advanced forecast/risk.
6. Review model comparison and feature importance.
7. Publish final guidance to dependent services (F1 irrigation, F4 optimization).

## Endpoint Map for the Flow
- Farmer-facing:
  - `GET /api/v1/forecast/weather/summary`
  - `GET /api/v1/forecast/weather/irrigation-recommendation`
  - `GET /api/v1/forecast/weather/forecast`
- Admin baseline (v1):
  - `GET /api/v1/forecast/health`
  - `GET /api/v1/forecast/ready`
  - `GET /api/v1/forecast/status`
  - `POST /api/v1/forecast/submit-data`
  - `GET /api/v1/forecast/forecast`
  - `GET /api/v1/forecast/risk-assessment`
- Admin advanced (v2):
  - `GET /api/v1/forecast/v2/status`
  - `POST /api/v1/forecast/v2/train`
  - `GET /api/v1/forecast/v2/forecast`
  - `GET /api/v1/forecast/v2/risk-assessment`
  - `GET /api/v1/forecast/v2/model-comparison`
  - `GET /api/v1/forecast/v2/feature-importance`

# 📊 Forecasting Service - PP1 Presentation Diagrams

> Visual diagrams for Progress Presentation 1 (PP1) - F3: ML Time-Series Forecasting & Alerting

---

## 1. System Architecture Overview

*Shows where Forecasting Service (F3) fits in the overall system*

```mermaid
flowchart TB
    subgraph External["External Data Sources"]
        SENSORS["IoT Sensors<br/>Water Level, Rainfall"]
        WEATHER["Weather APIs"]
    end
    
    subgraph F3["F3 - Forecasting Service"]
        direction TB
        API["FastAPI REST API<br/>Port 8002"]
        ML["ML Engine"]
        MODELS["Trained Models<br/>RF, GB, LSTM"]
        RISK["Risk Assessment"]
    end
    
    subgraph Consumers["Service Consumers"]
        F1["F1 - IoT Irrigation<br/>Service"]
        F4["F4 - Optimization<br/>Service"]
        WEB["Web Dashboard<br/>React Frontend"]
    end
    
    subgraph Storage["Data Layer"]
        DB[("PostgreSQL +<br/>TimescaleDB")]
    end
    
    SENSORS -->|"Sensor Data"| API
    WEATHER -->|"Weather Data"| API
    API --> ML
    ML --> MODELS
    ML --> RISK
    API -->|"Forecasts"| F1
    API -->|"Water Availability"| F4
    API -->|"Charts & Alerts"| WEB
    API <-->|"Historical Data"| DB
```

**Key Points to Mention:**
- Central position receiving data from IoT sensors
- Feeds predictions to both Irrigation (F1) and Optimization (F4) services
- RESTful API design enables dashboard integration

---

## 2. Input → Processing → Output Flow

*Shows the data transformation pipeline*

```mermaid
flowchart LR
    subgraph Input["INPUTS"]
        direction TB
        I1["Water Level Data"]
        I2["Rainfall Readings"]
        I3["Dam Gate Status"]
        I4["Historical Records"]
    end
    
    subgraph Processing["ML PROCESSING"]
        direction TB
        P1["Feature Engineering<br/>30+ Features"]
        P2["Model Training"]
        P3["Ensemble Prediction"]
        P4["Risk Analysis"]
        
        P1 --> P2
        P2 --> P3
        P3 --> P4
    end
    
    subgraph Output["OUTPUTS"]
        direction TB
        O1["72-Hour Forecasts"]
        O2["Confidence Intervals<br/>P10/P50/P90"]
        O3["Flood Risk Score"]
        O4["Drought Risk Score"]
        O5["Priority Alerts"]
    end
    
    Input --> Processing
    Processing --> Output
```

**Key Points to Mention:**
- Multiple data sources ingested
- 30+ engineered features for ML models
- Outputs include both predictions AND uncertainty quantification

---

## 3. ML Pipeline Architecture

*Shows the machine learning model ensemble*

```mermaid
flowchart TB
    subgraph FE["Feature Engineering"]
        direction LR
        LAG["Lag Features<br/>1h, 3h, 7h, 24h"]
        ROLL["Rolling Stats<br/>Mean, Std Dev"]
        CYC["Cyclical Encoding<br/>Hour, Month"]
    end
    
    subgraph Models["Model Training"]
        direction TB
        RF["Random Forest<br/>R2: 91.39%"]
        GB["Gradient Boosting<br/>R2: 91.32%"]
        LSTM["LSTM Neural Net<br/>R2: 89.68%"]
        QR["Quantile Regression<br/>Uncertainty Bounds"]
    end
    
    subgraph Select["Model Selection"]
        BEST["Best Model Selector<br/>Based on RMSE"]
    end
    
    subgraph Forecast["Forecasting"]
        PRED["Multi-Hour Predictions"]
        CONF["Confidence Intervals"]
    end
    
    FE --> Models
    RF --> Select
    GB --> Select
    LSTM --> Select
    QR --> CONF
    Select --> PRED
    PRED --> Forecast
```

**Key Points to Mention:**
- Three different ML approaches for robustness
- Automatic best model selection based on performance
- Quantile regression provides uncertainty bounds (P10-P90)

---

## 4. Service Interaction Sequence

*Shows how the service handles requests*

```mermaid
sequenceDiagram
    autonumber
    participant S as IoT Sensors
    participant F3 as Forecasting Service
    participant ML as ML Engine
    participant DB as Database
    participant F1 as Irrigation Service
    participant D as Dashboard

    S->>F3: POST /api/v1/submit-data
    F3->>DB: Store sensor readings
    
    Note over F3,ML: Scheduled Training
    F3->>ML: Train models with historical data
    ML->>ML: Feature Engineering
    ML->>ML: Train RF, GB, LSTM
    ML-->>F3: Models trained
    
    D->>F3: GET /api/v2/forecast?hours=72
    F3->>ML: Generate predictions
    ML-->>F3: Forecasts with confidence
    F3-->>D: Return forecast response
    
    F1->>F3: GET /api/v2/risk-assessment
    F3->>ML: Analyze flood/drought risk
    ML-->>F3: Risk scores + alerts
    F3-->>F1: Return risk assessment
```

**Key Points to Mention:**
- Asynchronous data ingestion from sensors
- RESTful API endpoints for different consumers
- Scheduled model retraining keeps predictions accurate

---

## 5. Microservices Architecture

*Shows the full platform architecture*

```mermaid
flowchart LR
    subgraph Client["External Clients"]
        WEB["Web Dashboard"]
        MOBILE["Mobile App"]
    end
    
    subgraph Gateway["API Gateway"]
        NGINX["NGINX<br/>Reverse Proxy"]
    end
    
    subgraph Services["Microservices"]
        AUTH["Auth Service<br/>Port 8001"]
        FORE["Forecasting Service<br/>Port 8002"]
        IRR["Irrigation Service<br/>Port 8003"]
        OPT["Optimization Service<br/>Port 8004"]
    end
    
    subgraph Platform["Platform"]
        K8S["Kubernetes"]
        PROM["Prometheus"]
    end
    
    Client --> NGINX
    NGINX --> AUTH
    NGINX --> FORE
    NGINX --> IRR
    NGINX --> OPT
    Services --> K8S
    Services --> PROM
```

**Key Points to Mention:**
- Each service is independently deployable
- NGINX gateway handles routing and cross-cutting concerns
- Kubernetes orchestration enables scaling

---

## 6. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **API Framework** | FastAPI | High-performance async REST API |
| **ML - Classical** | scikit-learn | Random Forest, Gradient Boosting |
| **ML - Deep Learning** | TensorFlow/Keras | LSTM Neural Networks |
| **Data Processing** | Pandas, NumPy | Feature engineering |
| **Validation** | Pydantic | Type-safe request/response |
| **Database** | PostgreSQL + TimescaleDB | Time-series storage |
| **Container** | Docker | Containerization |
| **Orchestration** | Kubernetes | Production deployment |

---

## 7. Model Performance Comparison

| Model | R² Score | RMSE | Best For |
|-------|----------|------|----------|
| **Random Forest** | 91.39% | Low | Non-linear patterns |
| **Gradient Boosting** | 91.32% | Low | Sequential error correction |
| **LSTM** | 89.68% | Medium | Long-term temporal dependencies |

---

## 8. API Endpoints Summary

| Version | Endpoint | Description |
|---------|----------|-------------|
| v1 | `GET /api/v1/forecast` | Basic linear forecast |
| v1 | `GET /api/v1/risk-assessment` | Simple risk analysis |
| v2 | `POST /api/v2/train` | Train all ML models |
| v2 | `GET /api/v2/forecast?hours=72` | ML-based forecast with uncertainty |
| v2 | `GET /api/v2/model-comparison` | Compare model performance |
| v2 | `GET /api/v2/risk-assessment` | ML-based risk with confidence |

---

## Presentation Tips

1. **Start with Diagram 1** - Show where your service fits in the big picture
2. **Use Diagram 2** - Explain inputs → outputs simply
3. **Highlight Diagram 3** - Emphasize ML specialization with accuracy metrics
4. **Demo with Diagram 4** - Show the actual API flow
5. **End with business value** - Flood prevention, crop protection

**Time allocation:**
- 30 sec: Architecture overview
- 30 sec: Input/Output flow
- 30 sec: ML models and accuracy
- 30 sec: Demo capability + value

---

*Generated for PP1 Presentation - Smart Irrigation System Project*

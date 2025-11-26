# 🌾 Adaptive Smart Irrigation & Crop Optimization Platform

A comprehensive 4th-year Software Engineering research project for Sri Lankan canal-command agriculture, combining IoT sensors, satellite imagery, machine learning, and multi-objective optimization.

## 🎯 Project Overview

This platform addresses water scarcity and crop optimization challenges in Sri Lanka's canal-command agricultural regions through four integrated functions:

| Function | Name | Owner | Description |
|----------|------|-------|-------------|
| **F1** | Smart Irrigation Scheduling | Dineth | Real-time IoT sensor data processing & irrigation scheduling |
| **F2** | Crop Health Monitoring | Dulari | Satellite image processing & crop health analysis |
| **F3** | Yield & Price Forecasting | Yasiru | Time-series forecasting for yield and market prices |
| **F4** | Adaptive Crop Area Optimization | Dilruksha | Multi-objective optimization for crop area allocation |

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React + Vite)                        │
│                           http://localhost:3000                          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Backend Services                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │  Irrigation   │  │   Sediment    │  │  Forecasting  │  │   ACA-O   │ │
│  │   Service     │  │   Mapping     │  │   Service     │  │  Service  │ │
│  │   (5001)      │  │   (5002)      │  │   (5003)      │  │  (8000)   │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
smart-irrigation-system/
├── frontend/                    # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── features/           # Feature modules (F1-F4)
│   │   ├── components/         # Reusable UI components
│   │   ├── api/                # API client layer
│   │   └── ...
│   └── package.json
│
├── backend/                     # Python microservices
│   ├── aca_o_service/          # F4 - Crop Area Optimization
│   ├── forecasting_service/    # F3 - Yield & Price Forecasting
│   ├── irrigation_service/     # F1 - Smart Irrigation
│   ├── sediment_mapping_service/ # F2 - Crop Health (To be created)
│   ├── docker-compose.yml
│   └── README.md
│
├── docs/                        # Project documentation
│   ├── PROJECT_OVERVIEW.md
│   └── FRONTEND_STRUCTURE.md
│
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (for frontend)
- **Python 3.11+** (for backend)
- **Docker & Docker Compose** (optional, for containerized deployment)

### 1. Start Backend Services

```bash
cd backend

# Using Docker (recommended)
docker-compose up --build

# Or run individual services
cd aca_o_service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

## 📚 Documentation

- [Project Overview](./docs/PROJECT_OVERVIEW.md) - Complete system documentation
- [Frontend Structure](./docs/FRONTEND_STRUCTURE.md) - Frontend architecture details
- [Backend Services](./backend/README.md) - Backend microservices guide

## 🔧 Service Endpoints

| Service | Port | Health Check | API Docs |
|---------|------|--------------|----------|
| Frontend | 3000 | N/A | N/A |
| ACA-O Service | 8000 | /health | /docs |
| Irrigation Service | 5001 | /health | /docs |
| Sediment Mapping | 5002 | /health | /docs |
| Forecasting Service | 5003 | /health | /docs |

## 🧪 Testing

```bash
# Backend tests
cd backend/aca_o_service
pytest tests/ -v

# Frontend tests
cd frontend
npm run test
```

## 👥 Team

| Member | Function | Focus Area |
|--------|----------|------------|
| Dineth | F1 | IoT Sensors & Irrigation Scheduling |
| Dulari | F2 | Satellite Imagery & Crop Health |
| Yasiru | F3 | Time-Series Forecasting |
| Dilruksha | F4 | Optimization & Integration |

## 📄 License

This project is part of a 4th-year Software Engineering research project at SLIIT.

---

**🌱 Building sustainable agriculture solutions for Sri Lanka 🇱🇰**


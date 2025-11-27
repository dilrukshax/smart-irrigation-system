# 🚀 Local Development Guide

This guide explains how to run the Smart Irrigation System locally with each service in separate terminals.

---

## 📋 Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| Docker Desktop | 24+ | `docker --version` |

---

## 🗂️ Services Overview

| Terminal | Service | Port | Directory | Run Command |
|----------|---------|------|-----------|-------------|
| 1 | Databases | - | `infrastructure/docker` | `docker compose up -d mongo postgres redis influxdb mosquitto` |
| 2 | Auth Service | 8001 | `services/auth_service` | `uvicorn app.main:app --reload --port 8001` |
| 3 | Irrigation Service | 8002 | `services/irrigation_service` | `uvicorn app.main:app --reload --port 8002` |
| 4 | Forecasting Service | 8003 | `services/forecasting_service` | `uvicorn app.main:app --reload --port 8003` |
| 5 | ACA-O Service | 8004 | `services/optimize_service` | `uvicorn app.main:app --reload --port 8004` |
| 6 | API Gateway | 8000 | `gateway` | `python gateway.py` |
| 7 | Web Frontend | 5173 | `web` | `npm run dev` |

---

## 🐳 Step 1: Start Databases

Start Docker Desktop first, then run:

```powershell
cd infrastructure/docker
docker compose up -d mongo postgres redis influxdb mosquitto
```

Wait **10-15 seconds** for databases to initialize.

---

## 🌐 Step 2: Run API Gateway

The API Gateway routes all requests to the appropriate backend services.

### Gateway Setup

```powershell
# Navigate to gateway directory
cd gateway

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the gateway
python gateway.py
```

### Gateway Details

| Property | Value |
|----------|-------|
| **URL** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

### Route Mappings

The gateway maps frontend requests to backend services:

| Gateway Route | Target Service | Backend Endpoint |
|---------------|----------------|------------------|
| `/api/v1/auth/*` | Auth Service (8001) | `/api/auth/*` |
| `/api/v1/admin/*` | Auth Service (8001) | `/api/admin/*` |
| `/api/v1/irrigation/*` | Irrigation Service (8002) | `/api/v1/*` |
| `/api/v1/forecast/*` | Forecasting Service (8003) | `/api/v1/*` |
| `/api/v1/optimization/*` | ACA-O Service (8004) | `/f4/*` |

### Gateway Output

When the gateway starts, you'll see:
```
============================================================
Smart Irrigation API Gateway
============================================================
Gateway URL: http://localhost:8000
API Docs:    http://localhost:8000/docs
------------------------------------------------------------
Route Mappings:
  /api/v1/auth/*         -> Auth Service /api/auth/*
  /api/v1/admin/*        -> Auth Service /api/admin/*
  /api/v1/irrigation/*   -> Irrigation Service /api/v1/*
  /api/v1/forecast/*     -> Forecasting Service /api/v1/*
  /api/v1/optimization/* -> ACA-O Service /f4/*
------------------------------------------------------------
Backend Services:
  - auth: http://127.0.0.1:8001
  - irrigation: http://127.0.0.1:8002
  - forecasting: http://127.0.0.1:8003
  - optimization: http://127.0.0.1:8004
============================================================
```

---

## 🔧 Step 3: Run Backend Services

For each service, open a **new terminal** and run:

### Generic Setup (All Services)

```powershell
# Navigate to service directory
cd services/<service_name>

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn <module>:app --reload --port <port>
```

### Service-Specific Commands

| Service | Directory | Module | Port |
|---------|-----------|--------|------|
| Auth | `services/auth_service` | `app.main` | 8001 |
| Irrigation | `services/irrigation_service` | `src.main` | 8002 |
| Forecasting | `services/forecasting_service` | `src.main` | 8003 |
| ACA-O | `services/optimize_service` | `src.main` | 8004 |

---

## 🖥️ Step 4: Run Frontend

```powershell
cd web
npm install
npm run dev
```

**Access:** http://localhost:5173

---

## 🔗 Access URLs

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:5173 |
| API Gateway Docs | http://localhost:8000/docs |
| Auth Service Docs | http://localhost:8001/docs |
| Irrigation Service Docs | http://localhost:8002/docs |
| Forecasting Service Docs | http://localhost:8003/docs |
| ACA-O Service Docs | http://localhost:8004/docs |

---

## ✅ Health Checks

```powershell
# Gateway (checks all services)
curl http://localhost:8000/services/health

# Individual services
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

---

## 🛑 Stopping Services

- **Individual service:** Press `Ctrl + C` in the terminal
- **Databases:** `docker compose down` (in `infrastructure/docker`)
- **Clean reset:** `docker compose down -v`

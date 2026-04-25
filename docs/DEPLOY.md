# Deployment Guide — Smart Irrigation System

This guide covers deploying the full platform on a Linux VM (e.g., Ashu VM) using Docker and the single `scripts/deploy.sh` script.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Deploying with deploy.sh](#4-deploying-with-deploysh)
5. [Available Commands](#5-available-commands)
6. [Port Reference](#6-port-reference)
7. [Health Checks](#7-health-checks)
8. [Managing the Stack After Deployment](#8-managing-the-stack-after-deployment)
9. [Logs and Debugging](#9-logs-and-debugging)
10. [Updating the Deployment](#10-updating-the-deployment)
11. [What the Script Builds](#11-what-the-script-builds)
12. [Architecture of the Running Stack](#12-architecture-of-the-running-stack)
13. [Common Issues](#13-common-issues)

---

## 1. Prerequisites

Install the following on the VM before running the script.

### Docker Engine

```bash
# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Allow running Docker without sudo (optional but recommended)

```bash
sudo usermod -aG docker $USER
newgrp docker          # apply without logging out
```

### Verify installation

```bash
docker --version        # Docker version 24+
docker compose version  # Docker Compose version v2+
```

### System requirements

| Resource | Minimum |
|----------|---------|
| CPU      | 2 cores |
| RAM      | 4 GB    |
| Disk     | 20 GB free |
| OS       | Ubuntu 20.04+ / Debian 11+ |

---

## 2. Repository Setup

```bash
# Clone the repository onto the VM
git clone <your-repo-url> smart-irrigation-system
cd smart-irrigation-system
```

---

## 3. Environment Configuration

The script reads environment variables from `infrastructure/docker/.env`.  
This file is already created in the repository with safe defaults.  
**You must change `JWT_SECRET_KEY` before any real deployment.**

```bash
# Edit the env file
nano infrastructure/docker/.env
```

### Key variables

| Variable | Default | What to change |
|----------|---------|----------------|
| `JWT_SECRET_KEY` | `change-this-...` | Generate with `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `aca_o_password` | Change for production |
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Change the Grafana password |
| `INFLUXDB_TOKEN` | `dev-token-smart-irrigation` | Change for production |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | empty | Set if you want MQTT auth |

### Generate a secure JWT key

```bash
openssl rand -hex 32
# Copy the output into JWT_SECRET_KEY= in infrastructure/docker/.env
```

---

## 4. Deploying with deploy.sh

The single script at `scripts/deploy.sh` handles the entire lifecycle.

### First-time deployment (clean build)

```bash
# From the project root:
./scripts/deploy.sh
```

This will:
1. Check Docker and Docker Compose are available
2. Validate / auto-create the `.env` file
3. Ensure the Mosquitto MQTT config exists
4. Build all 9 Docker images **from scratch** (`--no-cache --pull`)
5. Start infrastructure services first (Postgres, Redis, InfluxDB, Mosquitto, MongoDB)
6. Wait 15 seconds for databases to initialise
7. Start all application services
8. Poll every 8 seconds until every `/health` endpoint responds (up to 3 minutes)
9. Print the access URL table for your VM's IP

### Expected output (abbreviated)

```
── Pre-flight checks ──
[ OK ]  Docker: Docker version 24.0.5
[ OK ]  Compose: v2.21.0
[ OK ]  Compose file: .../infrastructure/docker/docker-compose.yml

── Building Docker images (no-cache) ──
[INFO]  Building → config_server
[ OK ]  Built   → config_server
[INFO]  Building → auth_service
[ OK ]  Built   → auth_service
...
[ OK ]  All images built.

── Starting infrastructure ──
...
── Starting application services ──
...
── Waiting for services to become healthy ──
  config_server (:8010)            ......... healthy
  auth_service (:8001)             ......... healthy
  ...

── Access URLs ──
  Web Dashboard               http://192.168.1.10:8005
  API Gateway                 http://192.168.1.10:8000
  Swagger / API Docs          http://192.168.1.10:8000/docs
  Grafana                     http://192.168.1.10:3001  (admin / admin)
  ...
```

---

## 5. Available Commands

```bash
./scripts/deploy.sh               # Full clean build + start (default)
./scripts/deploy.sh start         # Start with existing images (no rebuild)
./scripts/deploy.sh stop          # Stop all containers (volumes kept)
./scripts/deploy.sh restart       # Stop → clean build → start
./scripts/deploy.sh status        # Show container status + URLs
./scripts/deploy.sh logs          # Tail logs for all services
./scripts/deploy.sh logs <name>   # Tail logs for a specific service
./scripts/deploy.sh clean         # Stop + delete all data volumes (asks for confirmation)
./scripts/deploy.sh help          # Show usage
```

### When to use each command

| Situation | Command |
|-----------|---------|
| First deployment | `./scripts/deploy.sh` |
| Pulled new code, need full rebuild | `./scripts/deploy.sh restart` |
| VM reboot, images already built | `./scripts/deploy.sh start` |
| Something is broken, check logs | `./scripts/deploy.sh logs auth_service` |
| Shut down the platform temporarily | `./scripts/deploy.sh stop` |
| Wipe everything and start fresh | `./scripts/deploy.sh clean` then `./scripts/deploy.sh` |

---

## 6. Port Reference

| Service | Host port | Purpose |
|---------|-----------|---------|
| API Gateway | **8000** | All API traffic entry point |
| Auth Service | 8001 | JWT auth, user management |
| Irrigation Service | 8002 | IoT sensors, ML valve control |
| Forecasting Service | 8003 | Weather, time-series forecasts |
| Optimisation Service | 8004 | Crop recommendations, ACA-O |
| Web Dashboard (Next.js) | **8005** | Frontend UI |
| IoT Service | 8006 | MQTT bridge, device telemetry |
| Crop Health Service | 8007 | Satellite health, disease detection |
| Config Server | 8010 | Internal service config |
| PostgreSQL | 5432 | Relational database |
| InfluxDB | 8086 | Time-series database |
| MQTT Broker | **1883** | ESP32 device telemetry |
| Prometheus | 9090 | Metrics collection |
| Grafana | **3001** | Monitoring dashboards |

### Firewall rules (open on the VM)

Only expose what users and devices need to reach:

```bash
# Allow web and API access
sudo ufw allow 8000/tcp   # API Gateway
sudo ufw allow 8005/tcp   # Web Dashboard
sudo ufw allow 3001/tcp   # Grafana

# Only if ESP32 devices connect from outside the VM network
sudo ufw allow 1883/tcp   # MQTT
```

---

## 7. Health Checks

Every service exposes `GET /health`.  
You can verify any service manually:

```bash
curl http://localhost:8000/health   # Gateway
curl http://localhost:8001/health   # Auth
curl http://localhost:8002/health   # Irrigation
curl http://localhost:8003/health   # Forecasting
curl http://localhost:8004/health   # Optimisation
curl http://localhost:8006/health   # IoT
curl http://localhost:8007/health   # Crop Health
curl http://localhost:8010/health   # Config Server
```

Check all at once:

```bash
for port in 8000 8001 8002 8003 8004 8006 8007 8010; do
  status=$(curl -sf http://localhost:${port}/health -o /dev/null -w "%{http_code}" 2>/dev/null || echo "DOWN")
  printf "  Port %-5s  %s\n" "$port" "$status"
done
```

---

## 8. Managing the Stack After Deployment

All manual docker compose commands should be run from `infrastructure/docker/`:

```bash
cd infrastructure/docker

# View running containers
docker compose --env-file .env ps

# Rebuild and restart a single service (e.g. after a code change)
docker compose --env-file .env build --no-cache irrigation_service
docker compose --env-file .env up -d --no-deps irrigation_service

# Scale a service (run 2 replicas of the gateway)
docker compose --env-file .env up -d --scale gateway=2

# Execute a shell inside a running container
docker compose --env-file .env exec auth_service bash

# View resource usage
docker stats
```

---

## 9. Logs and Debugging

### Via the deploy script

```bash
./scripts/deploy.sh logs                        # all services
./scripts/deploy.sh logs auth_service           # single service
./scripts/deploy.sh logs irrigation_service     # single service
```

### Via docker compose directly

```bash
cd infrastructure/docker

docker compose --env-file .env logs -f --tail=100            # all, last 100 lines
docker compose --env-file .env logs -f --tail=50 gateway     # gateway only
docker compose --env-file .env logs --since=5m               # last 5 minutes
```

### Inspect a container

```bash
docker compose --env-file .env exec auth_service bash
# Inside the container:
cat /app/app/main.py
env | grep DATABASE
```

---

## 10. Updating the Deployment

After pulling new code:

```bash
git pull origin main

# Option A — full clean rebuild (recommended after dependency changes)
./scripts/deploy.sh restart

# Option B — rebuild only the changed service
cd infrastructure/docker
docker compose --env-file .env build --no-cache <service_name>
docker compose --env-file .env up -d --no-deps <service_name>
```

---

## 11. What the Script Builds

The script builds **9 Docker images** from the repository source:

| Image (compose service name) | Source directory | Language |
|------------------------------|------------------|----------|
| `config_server` | `services/config_server/` | Python 3.11 |
| `auth_service` | `services/auth_service/` | Python 3.11 |
| `irrigation_service` | `services/irrigation_service/` | Python 3.11 |
| `forecasting_service` | `services/forecasting_service/` | Python 3.11 |
| `optimize_service` | `services/optimize_service/` | Python 3.11 |
| `iot_service` | `services/iot_service/` | Python 3.11 (multi-stage) |
| `crop_health_and_water_stress_detection` | `services/crop_health_and_water_stress_detection/` | Python 3.11 |
| `gateway` | `services/gateway_service/` | Python 3.11 |
| `web` | `web/` | Node 20 → Next.js standalone |

It also pulls these **infrastructure images** from Docker Hub (no build required):

| Image | Version | Purpose |
|-------|---------|---------|
| `postgres` | 16-alpine | Primary relational database |
| `mongo` | 7 | MongoDB (used by auth legacy path) |
| `redis` | 7-alpine | Cache layer |
| `influxdb` | 2.7-alpine | IoT time-series data |
| `eclipse-mosquitto` | 2 | MQTT broker for ESP32 devices |
| `prom/prometheus` | latest | Metrics collection |
| `grafana/grafana` | latest | Dashboards |
| `jaegertracing/all-in-one` | 1.53 | Distributed tracing |

---

## 12. Architecture of the Running Stack

```
Browser / Mobile / ESP32
        │ HTTP / MQTT
        ▼
  Gateway  :8000   ──────────────────────────────────────┐
        │                                                │
  ┌─────┴──────────────────────────────────────┐        │
  │              Application Services          │        │
  │  auth      :8001   irrigation  :8002       │      Web
  │  forecast  :8003   optimize    :8004       │     :8005
  │  iot       :8006   crop-health :8007       │
  │  config    :8010                           │
  └──────────────────────────────────────────┬─┘
                                             │
  ┌──────────────────────────────────────────┴──────┐
  │              Infrastructure                      │
  │  Postgres :5432   Redis  :6379                   │
  │  InfluxDB :8086   MQTT   :1883   Mongo :27017    │
  └─────────────────────────────────────────────────┘
                         │
  ┌──────────────────────┴──────────────────────────┐
  │         Observability                            │
  │  Prometheus :9090   Grafana :3001   Jaeger :16686│
  └─────────────────────────────────────────────────┘
```

---

## 13. Common Issues

### Build fails: "no such file or directory: data/"

**Cause:** optimize_service Dockerfile was referencing a non-existent directory.  
**Status:** Already fixed in `services/optimize_service/Dockerfile`.

---

### Health check fails: "executable file not found: curl"

**Cause:** The python:3.11-slim base image doesn't include `curl`.  
**Status:** All health checks in `docker-compose.yml` use `python -c urllib.request` instead.

---

### Web service health check fails immediately

**Cause:** Next.js standalone mode requires `output: "standalone"` in `next.config.ts`.  
**Status:** Already set in `web/next.config.ts`.

---

### Port conflict: "address already in use"

```bash
# Find what's using the port, e.g. 8000
sudo lsof -i :8000
sudo kill -9 <PID>
```

---

### Database connection refused

The app services start before Postgres is fully ready.  
The deploy script waits 15 s after starting infra, but if it's still failing:

```bash
# Check Postgres is running
docker compose --env-file infrastructure/docker/.env ps postgres

# Check Postgres logs
./scripts/deploy.sh logs postgres
```

---

### "docker compose" not found but "docker-compose" is

The script detects both. If neither is found, install the plugin:

```bash
sudo apt-get install docker-compose-plugin
```

---

### Services restart in a loop

```bash
# Check what's happening inside the container
./scripts/deploy.sh logs <service_name>

# Check exit code
docker compose --env-file infrastructure/docker/.env ps
```

Common causes: missing environment variable, database not yet ready (increase sleep if needed), or a Python import error in the service.

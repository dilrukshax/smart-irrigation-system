# API Gateway

NGINX-based API Gateway for the Smart Irrigation System.

## Features

- Reverse proxy for all microservices
- Rate limiting
- Security headers
- Health check aggregation
- Load balancing ready

## Endpoints

| Path | Service |
|------|---------|
| `/` | Web Frontend |
| `/api/v1/auth/*` | Auth Service |
| `/api/v1/irrigation/*` | Irrigation Service |
| `/api/v1/forecast/*` | Forecasting Service |
| `/api/v1/optimization/*` | Optimization Service |
| `/services/health/*` | Service health checks |

## Build & Run

```bash
docker build -t smart-irrigation/gateway:latest .
docker run -p 80:80 smart-irrigation/gateway:latest
```

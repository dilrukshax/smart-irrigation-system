# API Documentation

## Overview

The Smart Irrigation System exposes a RESTful API through the API Gateway. All endpoints require authentication unless otherwise noted.

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:80` |
| Staging | `https://api-staging.smartirrigation.example.com` |
| Production | `https://api.smartirrigation.example.com` |

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Obtain Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

---

## Auth Service (`/api/v1/auth`)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | User login |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout (invalidate refresh token) |
| GET | `/me` | Get current user profile |

---

## Irrigation Service (`/api/v1/irrigation`)

### Sensors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sensors` | List all sensors |
| GET | `/sensors/{id}` | Get sensor details |
| GET | `/sensors/{id}/readings` | Get sensor readings |
| POST | `/sensors/{id}/readings` | Submit sensor reading |

### Predictions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/predictions` | Get irrigation predictions |
| GET | `/predictions/history` | Get prediction history |

### Control

| Method | Path | Description |
|--------|------|-------------|
| GET | `/zones` | List irrigation zones |
| POST | `/zones/{id}/irrigate` | Start irrigation |
| POST | `/zones/{id}/stop` | Stop irrigation |
| GET | `/schedule` | Get irrigation schedule |
| PUT | `/schedule` | Update schedule |

---

## Forecasting Service (`/api/v1/forecasting`)

### Forecast

| Method | Path | Description |
|--------|------|-------------|
| POST | `/forecast` | Generate forecast |
| GET | `/forecast/water-level` | Water level predictions |
| GET | `/forecast/rainfall` | Rainfall predictions |

### Risk Assessment

| Method | Path | Description |
|--------|------|-------------|
| GET | `/risk/drought` | Drought risk assessment |
| GET | `/risk/flood` | Flood risk assessment |
| POST | `/risk/analyze` | Custom risk analysis |

---

## Optimization Service (`/api/v1/optimization`)

### Recommendations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recommendations` | Get crop recommendations |
| GET | `/recommendations/{id}` | Get specific recommendation |
| GET | `/recommendations/history` | Recommendation history |

### Plan B

| Method | Path | Description |
|--------|------|-------------|
| POST | `/planb/replan` | Trigger replanning |
| GET | `/planb/scenarios` | Get replanning scenarios |
| PUT | `/planb/apply/{id}` | Apply a scenario |

### Supply

| Method | Path | Description |
|--------|------|-------------|
| GET | `/supply/aggregate` | Get supply aggregation |
| POST | `/supply/optimize` | Optimize supply chain |

---

## Health Endpoints

All services expose health endpoints (no authentication required):

| Path | Description |
|------|-------------|
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe |
| `/metrics` | Prometheus metrics |

---

## Error Responses

All errors follow this format:

```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

The API Gateway enforces rate limits:

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 req/min |
| Read operations | 100 req/min |
| Write operations | 30 req/min |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

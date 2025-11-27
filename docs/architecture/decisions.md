# Architecture Decision Records

## ADR-001: Microservices Architecture

### Status
Accepted

### Context
The smart irrigation system needs to handle multiple concerns: authentication, sensor data processing, forecasting, and optimization. Each has different scaling requirements and development lifecycles.

### Decision
Adopt a microservices architecture with the following services:
- **Auth Service**: User authentication and authorization
- **Irrigation Service**: Sensor data and actuator control
- **Forecasting Service**: Time-series predictions
- **Optimization Service**: Crop and area optimization

### Consequences
- **Positive**: Independent scaling, technology flexibility, fault isolation
- **Negative**: Increased operational complexity, network latency

---

## ADR-002: API Gateway Pattern

### Status
Accepted

### Context
Multiple microservices need a single entry point for external clients.

### Decision
Use NGINX as the API Gateway for:
- Request routing
- Rate limiting
- TLS termination
- CORS handling

### Consequences
- **Positive**: Simplified client interaction, centralized cross-cutting concerns
- **Negative**: Single point of failure (mitigated with replicas)

---

## ADR-003: FastAPI for Python Services

### Status
Accepted

### Context
Need a modern, high-performance Python web framework.

### Decision
Use FastAPI for all Python microservices because:
- Native async support
- Automatic OpenAPI documentation
- Pydantic for data validation
- Excellent performance

### Consequences
- **Positive**: Consistent development experience, automatic API docs
- **Negative**: Requires Python 3.8+

---

## ADR-004: Kubernetes for Container Orchestration

### Status
Accepted

### Context
Need reliable container orchestration for production deployments.

### Decision
Use Kubernetes (AKS on Azure) with:
- Kustomize for environment-specific configurations
- Horizontal Pod Autoscaler for scaling
- Network policies for service isolation

### Consequences
- **Positive**: Industry standard, excellent tooling, self-healing
- **Negative**: Steep learning curve, operational complexity

---

## ADR-005: Database Per Service

### Status
Accepted

### Context
Microservices need data isolation and appropriate database technologies.

### Decision
Each service owns its data:
- **Auth Service**: MongoDB (flexible user schema)
- **Irrigation Service**: PostgreSQL + TimescaleDB (sensor time-series)
- **Forecasting Service**: PostgreSQL + TimescaleDB
- **Optimization Service**: PostgreSQL (relational data)

### Consequences
- **Positive**: Data isolation, technology fit, independent scaling
- **Negative**: Data consistency challenges, more operational overhead

---

## ADR-006: JWT for Authentication

### Status
Accepted

### Context
Need stateless authentication for microservices.

### Decision
Use JWT (JSON Web Tokens) with:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- RS256 algorithm for token signing

### Consequences
- **Positive**: Stateless, scalable, standard format
- **Negative**: Token revocation complexity

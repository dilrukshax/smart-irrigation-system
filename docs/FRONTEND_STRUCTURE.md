# Frontend Structure Documentation

> Smart Irrigation & Crop Optimization Platform - Web Dashboard

---

## Technology Stack

Based on the project requirements (Section 2.3 of PROJECT_OVERVIEW.md):

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + Vite |
| **Language** | TypeScript |
| **UI Library** | MUI (Material UI) v5 |
| **Charts** | Recharts |
| **Maps** | Leaflet + react-leaflet |
| **State/Data Fetching** | TanStack Query (React Query) |
| **Routing** | React Router v6 |
| **HTTP Client** | Axios |
| **Form Handling** | React Hook Form + Zod |
| **Date Utilities** | date-fns |

---

## Folder Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── assets/
│       └── images/
│
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Root component with providers
│   ├── vite-env.d.ts               # Vite type declarations
│   │
│   ├── api/                        # API layer
│   │   ├── index.ts                # Axios instance & interceptors
│   │   ├── endpoints.ts            # API endpoint constants
│   │   ├── f1-irrigation.api.ts    # F1 - IoT Water Management APIs
│   │   ├── f2-crop-health.api.ts   # F2 - Crop Health APIs
│   │   ├── f3-forecasting.api.ts   # F3 - Forecasting & Alerts APIs
│   │   └── f4-acao.api.ts          # F4 - ACA-O Optimization APIs
│   │
│   ├── assets/                     # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   │       └── global.css
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── common/                 # Generic components
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── DataTable/
│   │   │   ├── LoadingSpinner/
│   │   │   ├── Modal/
│   │   │   ├── Navbar/
│   │   │   ├── Sidebar/
│   │   │   └── StatusBadge/
│   │   │
│   │   ├── charts/                 # Chart components
│   │   │   ├── LineChart/
│   │   │   ├── BarChart/
│   │   │   ├── AreaChart/
│   │   │   ├── GaugeChart/
│   │   │   └── ForecastChart/
│   │   │
│   │   ├── maps/                   # Map components
│   │   │   ├── BaseMap/
│   │   │   ├── FieldMap/
│   │   │   ├── HealthHeatmap/
│   │   │   └── ZoneLayer/
│   │   │
│   │   └── forms/                  # Form components
│   │       ├── FieldForm/
│   │       ├── CropSelectionForm/
│   │       └── ConstraintForm/
│   │
│   ├── config/                     # Configuration files
│   │   ├── constants.ts            # App-wide constants
│   │   ├── routes.ts               # Route definitions
│   │   └── theme.ts                # MUI theme customization
│   │
│   ├── contexts/                   # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   ├── features/                   # Feature-based modules (by function)
│   │   │
│   │   ├── f1-irrigation/          # F1 - IoT Smart Water Management
│   │   │   ├── components/
│   │   │   │   ├── SensorStatus.tsx
│   │   │   │   ├── IrrigationSchedule.tsx
│   │   │   │   ├── WaterUsageChart.tsx
│   │   │   │   ├── ValveControl.tsx
│   │   │   │   └── FieldStatusCard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSensorData.ts
│   │   │   │   └── useIrrigationControl.ts
│   │   │   ├── pages/
│   │   │   │   ├── IrrigationDashboard.tsx
│   │   │   │   ├── SensorMonitoring.tsx
│   │   │   │   └── IrrigationHistory.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── f2-crop-health/         # F2 - Satellite Crop Health
│   │   │   ├── components/
│   │   │   │   ├── HealthStatusMap.tsx
│   │   │   │   ├── NDVITrendChart.tsx
│   │   │   │   ├── ZoneHealthCard.tsx
│   │   │   │   ├── StressAlertList.tsx
│   │   │   │   └── GroundValidationUpload.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCropHealth.ts
│   │   │   │   └── useVegetationIndices.ts
│   │   │   ├── pages/
│   │   │   │   ├── CropHealthDashboard.tsx
│   │   │   │   ├── ZoneAnalysis.tsx
│   │   │   │   └── ValidationPortal.tsx
│   │   │   └── types.ts
│   │   │
│   │   ├── f3-forecasting/         # F3 - Time-Series Forecasting
│   │   │   ├── components/
│   │   │   │   ├── ForecastChart.tsx
│   │   │   │   ├── ReservoirLevelGauge.tsx
│   │   │   │   ├── RainfallPrediction.tsx
│   │   │   │   ├── AlertTimeline.tsx
│   │   │   │   ├── RiskIndicator.tsx
│   │   │   │   └── WhatIfSimulator.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useForecast.ts
│   │   │   │   └── useAlerts.ts
│   │   │   ├── pages/
│   │   │   │   ├── ForecastDashboard.tsx
│   │   │   │   ├── AlertManagement.tsx
│   │   │   │   └── SimulationTool.tsx
│   │   │   └── types.ts
│   │   │
│   │   └── f4-acao/                # F4 - Adaptive Crop & Area Optimization
│   │       ├── components/
│   │       │   ├── CropRecommendationCard.tsx
│   │       │   ├── SuitabilityMatrix.tsx
│   │       │   ├── OptimizationResults.tsx
│   │       │   ├── WaterBudgetChart.tsx
│   │       │   ├── ProfitRiskChart.tsx
│   │       │   ├── ConstraintEditor.tsx
│   │       │   └── PlanBComparison.tsx
│   │       ├── hooks/
│   │       │   ├── useRecommendations.ts
│   │       │   ├── useOptimization.ts
│   │       │   └── usePlanB.ts
│   │       ├── pages/
│   │       │   ├── ACAODashboard.tsx
│   │       │   ├── FieldRecommendations.tsx
│   │       │   ├── OptimizationPlanner.tsx
│   │       │   └── ScenarioAnalysis.tsx
│   │       └── types.ts
│   │
│   ├── hooks/                      # Global custom hooks
│   │   ├── useAuth.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── layouts/                    # Page layouts
│   │   ├── MainLayout.tsx          # Dashboard layout with sidebar
│   │   ├── AuthLayout.tsx          # Login/Register layout
│   │   └── MinimalLayout.tsx       # Minimal layout for errors
│   │
│   ├── pages/                      # Top-level pages
│   │   ├── Home.tsx                # Landing/Overview dashboard
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   └── NotFound.tsx
│   │
│   ├── services/                   # Business logic services
│   │   ├── auth.service.ts
│   │   ├── notification.service.ts
│   │   └── storage.service.ts
│   │
│   ├── store/                      # State management (if needed beyond React Query)
│   │   └── index.ts
│   │
│   ├── types/                      # Global TypeScript types
│   │   ├── api.types.ts            # API response types
│   │   ├── models.types.ts         # Domain model types
│   │   ├── common.types.ts         # Common/shared types
│   │   └── index.ts
│   │
│   └── utils/                      # Utility functions
│       ├── formatters.ts           # Date, number, currency formatters
│       ├── validators.ts           # Validation helpers
│       ├── mapHelpers.ts           # GeoJSON, coordinate utilities
│       └── chartHelpers.ts         # Chart data transformations
│
├── .env.example                    # Environment variables template
├── .env.local                      # Local environment (git-ignored)
├── .eslintrc.cjs                   # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── .gitignore
├── index.html                      # HTML entry point
├── package.json
├── tsconfig.json                   # TypeScript config
├── tsconfig.node.json              # TypeScript config for Node
├── vite.config.ts                  # Vite configuration
└── README.md                       # Frontend README
```

---

## Feature Modules Overview

### F1 - IoT Smart Water Management (`features/f1-irrigation/`)

| Component | Purpose |
|-----------|---------|
| `SensorStatus` | Real-time sensor readings display |
| `IrrigationSchedule` | Scheduled irrigation events calendar |
| `WaterUsageChart` | Historical water consumption charts |
| `ValveControl` | Manual valve/pump control interface |
| `FieldStatusCard` | Per-field irrigation status summary |

**Pages:**
- **IrrigationDashboard** - Main overview with live sensor data
- **SensorMonitoring** - Detailed sensor analytics
- **IrrigationHistory** - Historical logs and water usage trends

---

### F2 - Satellite Crop Health (`features/f2-crop-health/`)

| Component | Purpose |
|-----------|---------|
| `HealthStatusMap` | Interactive map with health overlays |
| `NDVITrendChart` | NDVI/NDWI time-series visualization |
| `ZoneHealthCard` | Zone-level health summary card |
| `StressAlertList` | List of stress/disease alerts |
| `GroundValidationUpload` | Photo upload for validation |

**Pages:**
- **CropHealthDashboard** - Overview with health heatmaps
- **ZoneAnalysis** - Detailed zone-by-zone analysis
- **ValidationPortal** - Ground truth submission interface

---

### F3 - Time-Series Forecasting (`features/f3-forecasting/`)

| Component | Purpose |
|-----------|---------|
| `ForecastChart` | Multi-horizon forecast visualization |
| `ReservoirLevelGauge` | Current vs predicted reservoir level |
| `RainfallPrediction` | Rainfall forecast display |
| `AlertTimeline` | Chronological alert history |
| `RiskIndicator` | Drought/flood risk badges |
| `WhatIfSimulator` | Interactive scenario simulator |

**Pages:**
- **ForecastDashboard** - Forecasts overview with risk bands
- **AlertManagement** - Alert configuration and history
- **SimulationTool** - What-if scenario analysis

---

### F4 - Adaptive Crop & Area Optimization (`features/f4-acao/`)

| Component | Purpose |
|-----------|---------|
| `CropRecommendationCard` | Top-3 crop recommendations per field |
| `SuitabilityMatrix` | Fuzzy-TOPSIS suitability scores |
| `OptimizationResults` | LP/MIP optimization output display |
| `WaterBudgetChart` | Water requirement vs quota visualization |
| `ProfitRiskChart` | Expected profit and risk metrics |
| `ConstraintEditor` | Edit policy/area constraints |
| `PlanBComparison` | Compare primary vs Plan B scenarios |

**Pages:**
- **ACAODashboard** - Main optimization overview
- **FieldRecommendations** - Per-field crop recommendations
- **OptimizationPlanner** - Full area allocation planning
- **ScenarioAnalysis** - Alternative scenario exploration

---

## API Integration Pattern

Each feature module has its own API file in `src/api/`:

```typescript
// Example: src/api/f4-acao.api.ts
import { apiClient } from './index';
import { RecommendationResponse, OptimizationRequest } from '@/types';

export const acaoApi = {
  getRecommendations: (fieldId: string) => 
    apiClient.get<RecommendationResponse>(`/acao/recommendations/${fieldId}`),
  
  runOptimization: (params: OptimizationRequest) =>
    apiClient.post('/acao/optimize', params),
  
  getPlanB: (scenarioId: string) =>
    apiClient.get(`/acao/planb/${scenarioId}`),
};
```

---

## Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_F1_SERVICE_URL=http://localhost:8001
VITE_F2_SERVICE_URL=http://localhost:8002
VITE_F3_SERVICE_URL=http://localhost:8003
VITE_F4_SERVICE_URL=http://localhost:8004

# Map Configuration
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_DEFAULT_MAP_CENTER=6.9271,79.8612
VITE_DEFAULT_MAP_ZOOM=10

# Feature Flags
VITE_ENABLE_F1_MODULE=true
VITE_ENABLE_F2_MODULE=true
VITE_ENABLE_F3_MODULE=true
VITE_ENABLE_F4_MODULE=true

# Authentication
VITE_AUTH_ENABLED=true
```

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Routing Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Main dashboard overview |
| `/login` | Login | User authentication |
| `/irrigation/*` | F1 Pages | IoT water management |
| `/crop-health/*` | F2 Pages | Crop health monitoring |
| `/forecasting/*` | F3 Pages | Forecasts & alerts |
| `/optimization/*` | F4 Pages | ACA-O recommendations |
| `/settings` | Settings | User preferences |
| `/profile` | Profile | User profile |

---

## Design System

The dashboard uses **MUI (Material UI)** with a custom theme:

- **Primary Color:** Blue (#1976d2) - Water/irrigation theme
- **Secondary Color:** Green (#2e7d32) - Agriculture/crop theme
- **Warning Color:** Orange (#ed6c02) - Alerts and caution
- **Error Color:** Red (#d32f2f) - Critical alerts
- **Background:** Light gray (#f5f5f5) with white cards

---

## Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Specifications](./api-specs/) *(to be created)*
- [Architecture Diagrams](./diagrams/) *(to be created)*

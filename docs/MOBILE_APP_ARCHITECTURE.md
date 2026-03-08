# 📱 Smart Agriculture Mobile Application — Architecture & Design Document

> **Companion Mobile App for the Adaptive Smart Irrigation & Crop Optimization Platform**
> Version 1.0 | March 2026 | Final Year Research Project — SLIIT

---

## Table of Contents

1. [System Analysis & Understanding](#1-system-analysis--understanding)
2. [Mobile App Purpose](#2-mobile-app-purpose)
3. [User Roles](#3-user-roles)
4. [Core Mobile App Features](#4-core-mobile-app-features)
5. [Mobile App Screen Structure](#5-mobile-app-screen-structure)
6. [UI/UX Design Approach](#6-uiux-design-approach)
7. [Technology Recommendation](#7-technology-recommendation)
8. [API & Integration Strategy](#8-api--integration-strategy)
9. [Notification System](#9-notification-system)
10. [Special Focus: Crop Health & Water Stress Monitoring](#10-special-focus-crop-health--water-stress-monitoring)
11. [Final Mobile App Architecture](#11-final-mobile-app-architecture)
12. [Development Plan & Roadmap](#12-development-plan--roadmap)
13. [Appendix — Screen Wireframe Descriptions](#13-appendix--screen-wireframe-descriptions)

---

## 1. System Analysis & Understanding

### 1.1 Platform Summary

The **Adaptive Smart Irrigation & Crop Optimization Platform** is an end-to-end agricultural decision-support system designed for quota-based irrigation schemes in Sri Lanka (e.g., Udawalawe RBMC/LBMC). It integrates **IoT field sensing**, **satellite-based crop health monitoring**, **ML-based time-series forecasting**, and an **Adaptive Crop & Area Optimization (ACA-O)** engine.

### 1.2 Existing Architecture Recap

The platform follows a **microservices architecture** with:

| Service | Port | Technology | Database | Responsibility |
|---------|------|------------|----------|---------------|
| **Auth Service** | 8001 | FastAPI + MongoDB | MongoDB | JWT authentication, RBAC (admin, farmer, officer) |
| **Irrigation Service (F1)** | 8002 | FastAPI + InfluxDB | InfluxDB (time-series) | IoT sensor ingestion, ML irrigation control, valve management |
| **Crop Health Service (F2)** | 8006 | FastAPI + MobileNetV2 | — | Satellite NDVI/NDWI analysis, image-based disease prediction |
| **Forecasting Service (F3)** | 8003 | FastAPI + InfluxDB | InfluxDB | ARIMA/LSTM rainfall & reservoir forecasting, disaster alerts |
| **Optimization Service (F4)** | 8004 | FastAPI + PostgreSQL | PostgreSQL | Fuzzy-TOPSIS crop suitability, PuLP/Pyomo area optimization |
| **API Gateway** | 8000 | FastAPI/NGINX | — | Request routing, CORS, TLS, rate limiting |
| **Web Frontend** | 5173 | React 18 + TypeScript + MUI | — | Dashboard, analytics, admin panel |

**Cross-service data flows:**
- F1 ↔ F3: Rainfall forecasts reduce irrigation; water-level predictions adjust schedules
- F2 ↔ F1: Crop stress triggers irrigation priority
- F2 ↔ F4: Stress history adjusts crop risk scoring
- F3 → F4: Water-availability scenarios constrain optimization

### 1.3 Current API Route Structure

All client requests flow through a single **API Gateway** at `http://<host>:8000/api/v1/`:

```
/api/v1/auth/*           → Auth Service (login, register, refresh, me)
/api/v1/admin/*          → Admin endpoints (user management)
/api/v1/irrigation/*     → Irrigation Service (sensors, schedules, predictions)
/api/v1/crop-health/*    → Crop Health Service (analyze, zones, predict, model)
/api/v1/forecast/*       → Forecasting Service (forecasts, alerts, simulation)
/api/v1/optimization/*   → Optimization Service (recommendations, scenarios, planB)
```

### 1.4 Authentication Model

- **JWT-based** with short-lived access tokens (15 min) and long-lived refresh tokens (7 days)
- Roles: `admin`, `farmer`, `officer` (field officer / agricultural expert)
- Token stored client-side and passed via `Authorization: Bearer <token>`

### 1.5 The Gap

The web dashboard is feature-rich but requires a desktop/laptop and reliable internet. Farmers in the field need:
- Quick access to alerts on their phone
- Ability to check sensor status while walking the field
- Camera-based crop health scanning
- Simple Sinhala/Tamil/English interfaces
- Offline-capable critical data viewing

---

## 2. Mobile App Purpose

### Primary Objective

The mobile application serves as a **field companion tool** that empowers farmers and field officers to:

1. **Monitor in real time** — View live sensor readings (soil moisture, temperature, canal levels) from anywhere
2. **Receive critical alerts** — Get push notifications for irrigation failures, crop disease detection, flood/drought warnings
3. **Take immediate action** — Manually override irrigation valves, acknowledge alerts, report field conditions
4. **Scan & diagnose** — Use the phone camera to photograph crops and get instant disease/stress classification via the ML model
5. **Plan & optimize** — View crop recommendations, seasonal plans, and water budgets for their assigned fields

### Secondary Objectives

- Serve as a **lightweight admin panel** for administrators to manage users and monitor system health
- Provide **offline access** to recent sensor data, alerts, and recommendations when internet is unavailable
- Support **multi-language** interfaces (English, Sinhala, Tamil) for Sri Lankan farmers

---

## 3. User Roles

### 3.1 Role Definitions

| Role | Description | Primary Mobile Actions |
|------|-------------|----------------------|
| **Farmer** | Land owner or cultivator managing one or more field plots | View sensors, receive alerts, scan crops, view recommendations, control irrigation (own fields only) |
| **Field Officer** | Agricultural extension officer supervising multiple farmers/fields in a zone | All farmer actions + zone-level overview, ground validation uploads, approve/adjust recommendations |
| **Administrator** | System administrator managing the platform | User management, system health monitoring, service status dashboard, broadcast announcements |

### 3.2 Role-Based Access Matrix

| Feature | Farmer | Field Officer | Admin |
|---------|--------|--------------|-------|
| View own field sensors | ✅ | ✅ | ✅ |
| View zone-wide sensors | ❌ | ✅ | ✅ |
| Irrigation manual control | ✅ (own) | ✅ (zone) | ✅ (all) |
| Crop health scan (camera) | ✅ | ✅ | ✅ |
| Satellite health maps | ✅ (own) | ✅ (zone) | ✅ (all) |
| Receive alerts | ✅ | ✅ | ✅ |
| Forecasting dashboards | ✅ | ✅ | ✅ |
| Crop recommendations | ✅ | ✅ | ✅ |
| Ground validation upload | ❌ | ✅ | ❌ |
| User management | ❌ | ❌ | ✅ |
| Service health monitoring | ❌ | ❌ | ✅ |
| Broadcast notifications | ❌ | ❌ | ✅ |

---

## 4. Core Mobile App Features

### 4.1 Feature Map by Module

#### 🌊 Module F1 — Irrigation Management

| Feature | Description |
|---------|-------------|
| **Live Sensor Dashboard** | Real-time display of soil moisture, temperature, humidity, canal water level |
| **Sensor Detail View** | Historical graphs with daily/weekly trends for each sensor |
| **Irrigation Control** | Toggle valves ON/OFF, set manual irrigation duration, view auto-mode decisions |
| **Irrigation Prediction** | ML-based irrigation need prediction with accept/reject action |
| **Water Usage Tracking** | Per-field water consumption over time |

#### 🌿 Module F2 — Crop Health & Water Stress (Primary Focus)

| Feature | Description |
|---------|-------------|
| **Camera Scan** | Photograph a crop and get instant MobileNetV2-based disease/stress classification |
| **Satellite Health Map** | Interactive map with NDVI/NDWI color-coded zones (green/yellow/red) |
| **Zone Health Cards** | Summary cards per zone with health status, confidence, risk level |
| **Stress Detection Alerts** | Push notifications when zone transitions from healthy → stressed |
| **Water Level Monitoring** | NDWI-based water availability indicator per zone |
| **Recommendation Engine** | Actionable suggestions based on detected condition (e.g., "Apply nitrogen fertilizer") |
| **History Timeline** | Track health status changes over days/weeks for each zone |

#### 🌤️ Module F3 — Forecasting & Disaster Alerts

| Feature | Description |
|---------|-------------|
| **Weather Forecast** | 1–14 day rainfall and temperature forecast charts |
| **Reservoir Levels** | Current vs. predicted reservoir/canal levels with gauge visualization |
| **Disaster Early Warnings** | Flood risk, drought risk, extreme weather alerts with severity badges |
| **Risk Indicator** | Color-coded risk index (days-to-critical, spill probability) |
| **What-If Scenarios** | Simplified simulator for "what if rainfall is 50% less" questions |

#### 🌾 Module F4 — Crop & Area Optimization

| Feature | Description |
|---------|-------------|
| **Top-3 Crop Recommendations** | Per-field recommended crops with rationale, expected yield, profit |
| **Suitability Scores** | Visual comparison of crop suitability via charts |
| **Water Budget** | Seasonal water requirement vs. available quota |
| **Plan B Scenarios** | Alternative plans if conditions change mid-season |
| **Market Price Insights** | Expected prices for recommended crops |

#### 🔐 Cross-Cutting Features

| Feature | Description |
|---------|-------------|
| **Authentication** | Login, registration, biometric (fingerprint) login option |
| **Push Notifications** | Firebase Cloud Messaging for real-time alerts |
| **Offline Mode** | Cache recent sensor data, last health maps, active alerts locally |
| **Multi-Language** | English, Sinhala, Tamil with easy toggle |
| **Profile & Settings** | Edit profile, notification preferences, language, theme (dark/light) |
| **Help & Tutorials** | In-app guides for first-time farmers |

---

## 5. Mobile App Screen Structure

### 5.1 Complete Screen Map

```
📱 Smart Agriculture Mobile App
│
├── 🔐 Authentication Flow
│   ├── S01: Splash Screen
│   ├── S02: Login Screen
│   ├── S03: Registration Screen
│   └── S04: Forgot Password Screen
│
├── 🏠 Main Tab Navigation (Bottom Tabs)
│   │
│   ├── Tab 1: 🏠 Home / Dashboard
│   │   └── S05: Dashboard Screen
│   │       ├── Weather summary widget
│   │       ├── Active alerts count badge
│   │       ├── Field status overview cards
│   │       ├── Quick actions (Scan Crop, Control Irrigation)
│   │       └── Recent notifications preview
│   │
│   ├── Tab 2: 🌿 Crop Health
│   │   ├── S06: Crop Health Overview
│   │   │   ├── Zone health map (satellite)
│   │   │   ├── Zone list with status cards
│   │   │   └── Quick scan button (floating)
│   │   ├── S07: Zone Detail Screen
│   │   │   ├── NDVI/NDWI trend charts
│   │   │   ├── Health classification history
│   │   │   ├── Water availability indicator
│   │   │   └── Recommendations for this zone
│   │   ├── S08: Camera Scan Screen
│   │   │   ├── Camera viewfinder with overlay guide
│   │   │   ├── Capture button
│   │   │   ├── Gallery selection option
│   │   │   └── S09: Scan Result Screen
│   │   │       ├── Predicted disease/health class
│   │   │       ├── Confidence percentage
│   │   │       ├── Severity badge (Low/Medium/High)
│   │   │       ├── Color-coded status bar
│   │   │       └── Recommended actions list
│   │   └── S10: Crop Health History
│   │       ├── Timeline view of health changes
│   │       └── Per-zone health graphs
│   │
│   ├── Tab 3: 💧 Irrigation
│   │   ├── S11: Irrigation Dashboard
│   │   │   ├── Active sensors list with live values
│   │   │   ├── Field status cards (OK/Under/Over-irrigated)
│   │   │   └── Today's irrigation schedule
│   │   ├── S12: Sensor Detail Screen
│   │   │   ├── Real-time reading (gauge)
│   │   │   ├── 24h / 7d / 30d historical chart
│   │   │   └── Threshold indicator
│   │   ├── S13: Irrigation Control Screen
│   │   │   ├── Valve ON/OFF toggle per field
│   │   │   ├── Duration selector
│   │   │   ├── Auto/Manual mode switch
│   │   │   └── ML prediction confirmation
│   │   └── S14: Irrigation History
│   │       ├── Water usage charts
│   │       └── Event log (start/stop with timestamps)
│   │
│   ├── Tab 4: ⚠️ Alerts
│   │   ├── S15: Alert Center
│   │   │   ├── Tabs: All | Crop | Irrigation | Weather
│   │   │   ├── Alert cards with severity & timestamp
│   │   │   └── Mark as read / acknowledge action
│   │   └── S16: Alert Detail Screen
│   │       ├── Full alert description
│   │       ├── Affected field/zone info
│   │       ├── Recommended action steps
│   │       └── Quick action buttons (e.g., "Start Irrigation")
│   │
│   └── Tab 5: 👤 More (Menu)
│       ├── S17: Profile Screen
│       ├── S18: Settings Screen
│       │   ├── Notification preferences
│       │   ├── Language selection
│       │   ├── Theme (dark/light)
│       │   └── Offline data management
│       ├── S19: Forecast Screen
│       │   ├── Rainfall prediction chart
│       │   ├── Reservoir level gauge
│       │   ├── Risk index cards
│       │   └── Disaster warnings
│       ├── S20: Crop Recommendations Screen
│       │   ├── Top-3 crops per field
│       │   ├── Suitability comparison chart
│       │   ├── Water budget summary
│       │   └── Plan B section
│       ├── S21: Admin Panel (admin role only)
│       │   ├── User management list
│       │   ├── Service health status
│       │   └── Broadcast notification composer
│       └── S22: Help & About
│           ├── Tutorial slides
│           └── App version / contact info
```

### 5.2 Screen Detail Descriptions

#### S05: Dashboard Screen (Home)

The dashboard is the first screen a farmer sees after login. It provides a **single-glance summary** of the entire system status:

| Widget | Content | Tap Action |
|--------|---------|-----------|
| **Weather Card** | Current temp, humidity, 3-day rainfall mini-forecast | → Forecast Screen |
| **Alert Badge** | Number of unread critical alerts | → Alert Center |
| **Field Status Row** | Horizontal scroll of field cards with status color (green/yellow/red) | → Irrigation Dashboard |
| **Crop Health Ring** | Donut chart: % healthy vs stressed vs critical zones | → Crop Health Overview |
| **Quick Actions** | Two prominent buttons: "📷 Scan Crop" and "💧 Control Irrigation" | → Camera Scan / Irrigation Control |
| **Recent Notifications** | Last 3 alert previews | → Alert Center |

#### S06: Crop Health Overview

An interactive satellite-derived health map with zone overlays:

- **Map View**: Leaflet/Mapbox map centered on the farmer's assigned area. Zones are color-coded polygons:
  - 🟢 Green: Healthy (NDVI > 0.55)
  - 🟡 Yellow: Mild Stress (NDVI 0.4–0.55)
  - 🔴 Red: Severe Stress (NDVI < 0.4)
- **Zone Cards**: Swipeable list below the map showing each zone's health status, NDWI water level, confidence %, and risk level
- **Floating Action Button**: 📷 "Scan Crop" camera button

#### S08: Camera Scan Screen

- Full-screen camera viewfinder with a frame guide
- "Capture" button at bottom center
- "Gallery" icon to select an existing photo
- After capture: shows a preview with "Analyze" / "Retake" buttons
- Calls `POST /api/v1/crop-health/predict` with the image

#### S09: Scan Result Screen

Displays the MobileNetV2 prediction result with:
- **Disease/Class Name** (large, prominent)
- **Confidence** (progress bar, e.g., 94%)
- **Severity Badge** (Low 🟢 / Medium 🟡 / High 🔴)
- **Health Status Bar** (color-coded gradient)
- **Recommendations** (numbered action items, e.g., "1. Apply copper-based fungicide")
- **Save to History** button
- **Share** button (send report to officer)

#### S13: Irrigation Control Screen

- Per-field card with current valve status (ON/OFF indicator)
- Toggle switch for manual ON/OFF
- Duration selector (15min / 30min / 1hr / Custom)
- Auto-mode indicator with "ML says: Irrigate for 45min" suggestion and Accept/Reject
- Confirmation dialog before any valve action

---

## 6. UI/UX Design Approach

### 6.1 Design Principles for Farmers

| Principle | Implementation |
|-----------|---------------|
| **Simplicity First** | Maximum 3 taps to reach any critical feature; large touch targets (≥48dp); minimal text |
| **Visual Language** | Color-coded statuses (🟢🟡🔴) universally understood; icons over text labels; gauge/ring charts over tables |
| **Glanceable Information** | Dashboard widgets show status at a glance; no scrolling needed for critical info |
| **Offline Resilience** | Graceful degradation; show cached data with "Last updated 2h ago" label; queue actions for sync |
| **Accessibility** | High-contrast colors; adjustable font sizes; screen reader support; haptic feedback for alerts |
| **Multi-Language** | Toggle between English, Sinhala (සිංහල), Tamil (தமிழ்) from any screen's header |

### 6.2 Design System

#### Color Palette

```
Primary:        #2E7D32 (Agricultural Green)
Primary Dark:   #1B5E20
Secondary:      #1565C0 (Water Blue)
Background:     #FAFAFA (Light) / #121212 (Dark)
Surface:        #FFFFFF (Light) / #1E1E1E (Dark)
  
Status Colors:
  Healthy:      #4CAF50 (Green)
  Warning:      #FF9800 (Orange)
  Critical:     #F44336 (Red)
  Info:         #2196F3 (Blue)
  Unknown:      #9E9E9E (Grey)
```

#### Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 28sp | Bold | Screen titles |
| H2 | 22sp | SemiBold | Section headers |
| Body | 16sp | Regular | General text |
| Caption | 13sp | Regular | Timestamps, secondary info |
| Label | 14sp | Medium | Button labels, badges |

#### Component Library

- Use **Material Design 3** components for consistency
- Custom reusable components:
  - `StatusBadge` — Color-coded health/status indicator
  - `SensorGauge` — Circular gauge for sensor readings
  - `HealthZoneCard` — Card with zone name, NDVI bar, status color
  - `AlertCard` — Card with severity icon, title, time, action button
  - `QuickActionButton` — Large rounded icon button for primary actions

### 6.3 Navigation Pattern

```
┌─────────────────────────────────────────────────────┐
│  [Status Bar]                                        │
├─────────────────────────────────────────────────────┤
│  [App Bar: Title | Language Toggle | Notifications] │
├─────────────────────────────────────────────────────┤
│                                                      │
│             [Screen Content Area]                    │
│                                                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│  🏠 Home  🌿 Crop  💧 Water  ⚠️ Alerts  ☰ More     │
└─────────────────────────────────────────────────────┘
```

- **Bottom Tab Navigation** (5 tabs) for primary sections
- **Stack Navigation** within each tab for drill-down screens
- **Floating Action Button** on Crop Health tab for quick camera scan
- **Pull-to-Refresh** on all data screens

---

## 7. Technology Recommendation

### 7.1 Recommended Stack: React Native + Expo

| Category | Technology | Justification |
|----------|------------|--------------|
| **Framework** | **React Native** (with Expo) | The existing web frontend uses **React 18 + TypeScript**. React Native allows maximum code reuse of types, API client logic, and business logic. The team already has React/TypeScript expertise. |
| **Language** | **TypeScript** | Already used across the entire web codebase; provides type safety and consistency |
| **UI Library** | **React Native Paper** (Material Design 3) | MD3 components matching the web's MUI design language; excellent theming support |
| **Navigation** | **React Navigation v6** | Industry-standard tab + stack navigation |
| **State/Data** | **TanStack Query (React Query)** | Already used in the web app for API caching; identical API hooks can be shared |
| **HTTP Client** | **Axios** | Already used in the web app; identical interceptors for JWT handling |
| **Maps** | **react-native-maps** | Native map rendering for satellite health overlays |
| **Camera** | **expo-camera** + **expo-image-picker** | For crop scanning feature (image capture & upload) |
| **Charts** | **react-native-chart-kit** or **Victory Native** | Sensor graphs, forecast charts, health trends |
| **Notifications** | **Firebase Cloud Messaging (FCM)** via **expo-notifications** | Real-time push notifications for alerts |
| **Offline Storage** | **WatermelonDB** or **AsyncStorage + MMKV** | Local caching of sensor data, alerts, recommendations |
| **i18n** | **i18next + react-i18next** | Multi-language support (EN, SI, TA) |
| **Auth Storage** | **expo-secure-store** | Secure JWT token storage on device |

### 7.2 Why React Native Over Alternatives

| Criteria | React Native | Flutter | Native Android |
|----------|-------------|---------|----------------|
| **Code Reuse with Web** | ✅ High (same TypeScript, shared types, API client, React Query hooks) | ❌ None (Dart vs TypeScript) | ❌ None (Kotlin vs TypeScript) |
| **Team Expertise** | ✅ Team already knows React + TypeScript | ❌ Requires learning Dart & Flutter | ⚠️ Partial (new language) |
| **Cross-Platform** | ✅ iOS + Android from single codebase | ✅ iOS + Android | ❌ Android only |
| **Shared API Types** | ✅ Import directly from web project | ❌ Must redefine in Dart | ❌ Must redefine in Kotlin |
| **Development Speed** | ✅ Fast with Expo managed workflow | ✅ Fast hot-reload | ❌ Slower build cycles |
| **Native Camera Access** | ✅ expo-camera is mature | ✅ Good camera plugins | ✅ Native best |
| **Map Performance** | ✅ react-native-maps (native) | ⚠️ Plugin-dependent | ✅ Native best |
| **Community/Ecosystem** | ✅ Largest RN ecosystem | ✅ Growing fast | ✅ Mature |

**Verdict**: **React Native + Expo** is the optimal choice because:
1. The team already works in React + TypeScript daily
2. Types from `web/src/types/` can be directly shared
3. The API client pattern (`axios` + `React Query`) is identical
4. Expo simplifies camera, notifications, and OTA updates
5. Single codebase covers both Android and (future) iOS

### 7.3 Shared Code Strategy

```
smart-irrigation-system/
├── shared/                      # Shared across web & mobile
│   ├── types/                   # TypeScript interfaces/types
│   │   ├── sensor.types.ts
│   │   ├── crop-health.types.ts
│   │   ├── forecast.types.ts
│   │   ├── optimization.types.ts
│   │   └── auth.types.ts
│   ├── api/                     # API endpoint constants
│   │   └── endpoints.ts
│   └── utils/                   # Pure utility functions
│       ├── formatters.ts
│       └── validators.ts
│
├── web/                         # Existing web app
│   └── src/
│       ├── api/index.ts         # Web-specific Axios instance
│       └── ...
│
├── mobile/                      # NEW: React Native app
│   └── src/
│       ├── api/index.ts         # Mobile-specific Axios instance (SecureStore tokens)
│       └── ...
```

---

## 8. API & Integration Strategy

### 8.1 Communication Architecture

The mobile app communicates with the **exact same API Gateway** that the web frontend uses. No new backend endpoints are needed.

```
┌──────────────┐     HTTPS / REST      ┌──────────────────┐
│  Mobile App  │ ────────────────────── │   API Gateway    │
│ (React Native│     JSON + JWT         │  (NGINX/FastAPI) │
│   + Expo)    │ ────────────────────── │   Port 8000      │
└──────────────┘                        └───────┬──────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │               │           │           │               │
              ┌─────▼─────┐  ┌─────▼─────┐ ┌───▼───┐ ┌────▼────┐ ┌───────▼───────┐
              │   Auth    │  │ Irrigation│ │ Crop  │ │Forecast │ │ Optimization  │
              │  :8001    │  │  :8002    │ │Health │ │  :8003  │ │    :8004      │
              │           │  │           │ │ :8006 │ │         │ │               │
              └───────────┘  └───────────┘ └───────┘ └─────────┘ └───────────────┘
```

### 8.2 API Endpoints Consumed by Mobile

| Screen | HTTP Method | Endpoint | Purpose |
|--------|-------------|----------|---------|
| Login | POST | `/api/v1/auth/login` | Authenticate user |
| Register | POST | `/api/v1/auth/register` | Create account |
| Token Refresh | POST | `/api/v1/auth/refresh` | Refresh JWT |
| Profile | GET | `/api/v1/auth/me` | Get user profile |
| Sensor List | GET | `/api/v1/irrigation/sensors` | All sensors |
| Sensor Data | GET | `/api/v1/irrigation/sensors/{id}/data` | Historical data |
| Irrigation Predict | POST | `/api/v1/irrigation/sensors/predict` | ML irrigation need |
| Crop Health Analyze | POST | `/api/v1/crop-health/analyze` | Satellite analysis |
| Health Zones | GET | `/api/v1/crop-health/zones` | Zone health map |
| Zone Summary | GET | `/api/v1/crop-health/zones/summary` | Zone summary stats |
| Zone GeoJSON | GET | `/api/v1/crop-health/zones/geojson` | GeoJSON for map |
| Image Predict | POST | `/api/v1/crop-health/predict` | Camera image prediction |
| Image URL Predict | POST | `/api/v1/crop-health/predict/url` | URL-based prediction |
| Model Status | GET | `/api/v1/crop-health/model/status` | ML model readiness |
| Forecasts | GET | `/api/v1/forecast/forecasts/{metric}` | Forecast data |
| Forecast Alerts | GET | `/api/v1/forecast/alerts` | Disaster/weather alerts |
| Risk Index | GET | `/api/v1/forecast/risk` | Risk indicators |
| Recommendations | GET | `/api/v1/optimization/recommendations` | Crop recommendations |
| Field Recs | GET | `/api/v1/optimization/recommendations/{id}` | Per-field recommendations |
| Water Budget | GET | `/api/v1/optimization/water-budget` | Water budget data |
| Plan B | GET | `/api/v1/optimization/planb` | Alternative plans |
| Admin Users | GET | `/api/v1/admin/users` | User management |

### 8.3 Mobile-Specific API Considerations

#### Image Upload for Crop Scanning

The crop health prediction endpoint (`POST /api/v1/crop-health/predict`) already accepts `multipart/form-data` with a file field. The mobile app will:

```typescript
// Mobile image upload flow
const scanCrop = async (imageUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'crop_scan.jpg',
    type: 'image/jpeg',
  } as any);

  const response = await apiClient.post('/crop-health/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

#### Offline Data Sync Strategy

```
┌────────────────────────────────────────────┐
│           OFFLINE STRATEGY                  │
├────────────────────────────────────────────┤
│                                             │
│  Online Mode:                               │
│  ┌───────────┐     ┌───────────────────┐   │
│  │  API Call  │────▶│  Cache Response   │   │
│  └───────────┘     │  (WatermelonDB)   │   │
│                     └───────────────────┘   │
│                                             │
│  Offline Mode:                              │
│  ┌───────────┐     ┌───────────────────┐   │
│  │  Request   │────▶│  Serve from Cache │   │
│  └───────────┘     └───────────────────┘   │
│                     ┌───────────────────┐   │
│  │  Write Ops │────▶│  Queue for Sync   │   │
│  └───────────┘     └───────────────────┘   │
│                                             │
│  Back Online:                               │
│  ┌───────────────────┐                      │
│  │  Flush Queue &    │                      │
│  │  Refresh Cache    │                      │
│  └───────────────────┘                      │
└────────────────────────────────────────────┘
```

**What gets cached:**
- Last 24h sensor readings
- Current zone health status & map data
- Active alerts and recent notifications
- Crop recommendations for assigned fields
- Latest forecast data

**What gets queued for sync:**
- Irrigation control commands (valve on/off)
- Scanned crop images (upload when online)
- Alert acknowledgments

### 8.4 Real-Time Data (Future Enhancement)

For real-time sensor streaming (beyond polling), add a **WebSocket** endpoint or **Server-Sent Events (SSE)** from the gateway:

```
ws://host:8000/ws/sensors    →  Live sensor readings
ws://host:8000/ws/alerts     →  Live alert stream
```

This is a Phase 2 enhancement. Phase 1 uses **polling** with React Query's `refetchInterval`:

```typescript
const { data } = useQuery({
  queryKey: ['sensors'],
  queryFn: fetchSensors,
  refetchInterval: 30_000,  // Poll every 30 seconds
});
```

---

## 9. Notification System

### 9.1 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION FLOW                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────────┐         │
│  │ Backend │───▶│ Notification│───▶│ Firebase Cloud   │         │
│  │ Service │    │   Service   │    │ Messaging (FCM)  │         │
│  │ (F1-F4) │    │ (New)       │    │                  │         │
│  └─────────┘    └─────────────┘    └────────┬─────────┘         │
│                                              │                   │
│                                              ▼                   │
│                                    ┌─────────────────┐          │
│                                    │  Mobile Device  │          │
│                                    │  Push Notif.    │          │
│                                    └─────────────────┘          │
│                                                                   │
│  Alert Types & Channels:                                         │
│  ┌──────────────────┬──────────┬───────────────────────┐        │
│  │ Alert Type       │ Priority │ Delivery              │        │
│  ├──────────────────┼──────────┼───────────────────────┤        │
│  │ Flood Warning    │ CRITICAL │ Push + Sound + Vibrate│        │
│  │ Drought Alert    │ HIGH     │ Push + Sound          │        │
│  │ Crop Disease     │ HIGH     │ Push + Sound          │        │
│  │ Irrigation Fail  │ HIGH     │ Push + Sound          │        │
│  │ Crop Stress      │ MEDIUM   │ Push (silent)         │        │
│  │ Low Moisture     │ MEDIUM   │ Push (silent)         │        │
│  │ Recommendation   │ LOW      │ In-app only           │        │
│  │ System Update    │ LOW      │ In-app only           │        │
│  └──────────────────┴──────────┴───────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Notification Categories

| Category | Example Messages | Sound | Badge |
|----------|-----------------|-------|-------|
| **🚨 Disaster** | "Flood risk HIGH for Udawalawe — Expected in 48h" | Alarm | Yes |
| **🌿 Crop Health** | "Zone B3 — Severe water stress detected (NDVI: 0.32)" | Default | Yes |
| **💧 Irrigation** | "Irrigation pump failure on Field A2 — Manual check required" | Default | Yes |
| **🌤️ Weather** | "Heavy rainfall predicted tomorrow — Irrigation paused" | Silent | Yes |
| **📋 Recommendation** | "New crop recommendations available for your fields" | None | No |
| **🔧 System** | "System maintenance scheduled: 2AM–4AM Sunday" | None | No |

### 9.3 Backend Notification Service (New Microservice)

A lightweight **Notification Service** will be added to the backend to:

1. **Subscribe to events** from F1–F4 services (via Redis Pub/Sub or REST callbacks)
2. **Determine recipients** based on field/zone assignments and user roles
3. **Send push notifications** via FCM
4. **Store notification history** in MongoDB for in-app notification center
5. **Respect user preferences** (mute specific categories, quiet hours)

```python
# notification_service/app/main.py (conceptual)
@app.post("/internal/notify")
async def send_notification(payload: NotificationPayload):
    """Called by F1-F4 services when an alert is generated."""
    recipients = await get_recipients(payload.zone_id, payload.target_roles)
    
    for user in recipients:
        if user.notification_preferences.is_enabled(payload.category):
            await send_fcm(user.fcm_token, {
                "title": payload.title,
                "body": payload.body,
                "data": {
                    "type": payload.category,
                    "alert_id": payload.alert_id,
                    "deep_link": payload.deep_link,
                }
            })
    
    await store_notification_history(payload, recipients)
```

### 9.4 Deep Linking

Push notifications include a `deep_link` field that navigates directly to the relevant screen:

| Alert Type | Deep Link | Opens Screen |
|------------|-----------|-------------|
| Crop stress | `irrigo://crop-health/zones/{zone_id}` | Zone Detail |
| Irrigation failure | `irrigo://irrigation/control/{field_id}` | Irrigation Control |
| Flood warning | `irrigo://alerts/{alert_id}` | Alert Detail |
| Recommendation | `irrigo://optimization/recommendations/{field_id}` | Crop Recommendations |

---

## 10. Special Focus: Crop Health & Water Stress Monitoring

> This is your primary module (F2). The mobile app must provide the richest experience for this feature.

### 10.1 Feature Deep-Dive

#### 📷 10.1.1 Camera-Based Crop Scanning

**User Flow:**
```
Farmer opens Crop Health tab
    └──▶ Taps floating 📷 button
         └──▶ Camera opens with frame guide
              └──▶ Captures photo of crop leaf/field
                   └──▶ Photo preview: "Analyze" / "Retake"
                        └──▶ Loading spinner: "Analyzing with AI..."
                             └──▶ Result screen with:
                                  ├── Disease name (e.g., "Late Blight")
                                  ├── Confidence: 94%
                                  ├── Severity: HIGH 🔴
                                  ├── Color bar: Red
                                  ├── Risk Level: Critical
                                  ├── Recommendations:
                                  │    1. Apply copper-based fungicide
                                  │    2. Remove infected leaves
                                  │    3. Improve drainage
                                  └── Actions: [Save] [Share] [Scan Again]
```

**Technical Implementation:**
- Uses `expo-camera` for capture, `expo-image-picker` for gallery
- Image compressed to ≤1MB before upload (JPEG quality 80%)
- Calls `POST /api/v1/crop-health/predict` with multipart form-data
- Response mapped to `ImagePredictionResponse` type:
  ```typescript
  interface CropScanResult {
    predicted_class: string;     // e.g., "Late_Blight"
    confidence: number;          // e.g., 0.94
    health_status: string;       // "Diseased" | "Healthy" | "Stressed"
    severity: string;            // "low" | "medium" | "high"
    color: string;               // hex color for UI
    risk_level: string;          // "Low" | "Medium" | "High" | "Critical"
    recommendation: string;      // Actionable advice
    model_used: string;          // "MobileNetV2" | "fallback"
    timestamp: string;           // ISO datetime
  }
  ```
- Results cached locally so farmers can review past scans offline

#### 🗺️ 10.1.2 Satellite Health Map

**Visualization:**
- Interactive map using `react-native-maps` with polygon overlays
- Each zone rendered as a colored polygon based on NDVI classification:
  - **Green zones** (NDVI > 0.55): Healthy vegetation
  - **Yellow zones** (NDVI 0.4–0.55): Mild stress — watch closely
  - **Red zones** (NDVI < 0.4): Severe stress — immediate attention needed
- Tap on zone → Zone Detail bottom sheet with:
  - Zone ID, area (ha), NDVI value, NDWI value
  - Health status & confidence
  - Trend arrow (↑ improving, ↓ declining, → stable)
  - "View History" button

**Data Source:** `GET /api/v1/crop-health/zones/geojson` returns GeoJSON FeatureCollection

#### 💧 10.1.3 Water Level Monitoring

**Visualization Approach:**
- **NDWI Gauge**: For each zone, a horizontal bar showing water availability derived from NDWI index
  - 🔵 Adequate (NDWI > 0.2)
  - 🟡 Low (NDWI 0.0–0.2)
  - 🔴 Critical (NDWI < 0.0)
- **Soil Moisture** (from F1 sensors): Circular gauge showing current % vs. threshold
- **Canal Water Level**: Bar chart from F1 sensor data

**Combined View:**
```
┌──────────────────────────────────────┐
│  Zone B3 — Water Status              │
├──────────────────────────────────────┤
│  🌊 NDWI Water Index:  ████████░░  │
│                          0.15 (Low)  │
│                                      │
│  💧 Soil Moisture:      ████████░░  │
│                          68% (OK)    │
│                                      │
│  🚰 Canal Level:        ██████░░░░  │
│                          54% (Low)   │
│                                      │
│  ⚠️ Alert: Water stress detected    │
│     Zone trending dry for 5 days     │
│                                      │
│  💡 Recommendation:                  │
│     Schedule irrigation within 24h   │
│     Estimated need: 45mm             │
└──────────────────────────────────────┘
```

#### 🔔 10.1.4 Stress Detection Alerts

**Alert triggers (from backend F2 service):**

| Trigger | Condition | Severity | Alert Message |
|---------|-----------|----------|---------------|
| NDVI Drop | Zone NDVI drops >0.1 in one analysis cycle | HIGH | "Zone {X}: Rapid vegetation decline detected" |
| Severe Stress | Zone NDVI < 0.4 | HIGH | "Zone {X}: Severe crop stress — immediate attention" |
| Disease Detected | Camera prediction = disease class with >80% confidence | HIGH | "Possible {disease} detected in {field}" |
| Water Deficiency | NDWI < 0.0 for a zone | MEDIUM | "Zone {X}: Water deficiency — consider irrigation" |
| Mild Stress Onset | Zone transitions from Healthy → Mild Stress | MEDIUM | "Zone {X}: Early stress signs — monitor closely" |
| Recovery | Zone transitions from Stress → Healthy | LOW | "Zone {X}: Health improving ✅" |

#### 📊 10.1.5 Health History Timeline

A chronological view showing how each zone's health has changed:

```
Zone B3 — Health Timeline
─────────────────────────

🟢 Mar 1  │ Healthy (NDVI: 0.62)
🟢 Mar 4  │ Healthy (NDVI: 0.59)
🟡 Mar 7  │ Mild Stress (NDVI: 0.48) ← Alert sent
🟡 Mar 10 │ Mild Stress (NDVI: 0.45)
🔴 Mar 13 │ Severe Stress (NDVI: 0.35) ← Alert sent
🟡 Mar 16 │ Mild Stress (NDVI: 0.43) ← Recovering
🟢 Mar 19 │ Healthy (NDVI: 0.56) ← Recovery confirmed
```

### 10.2 Crop Health Mobile Component Architecture

```
src/features/crop-health/
├── screens/
│   ├── CropHealthOverview.tsx       # Main screen with map + zone list
│   ├── ZoneDetail.tsx               # Zone-specific health details
│   ├── CameraScan.tsx               # Camera capture screen
│   ├── ScanResult.tsx               # ML prediction result display
│   └── HealthHistory.tsx            # Timeline history view
├── components/
│   ├── HealthMap.tsx                # react-native-maps with zone polygons
│   ├── ZoneCard.tsx                 # Zone health summary card
│   ├── WaterStatusBar.tsx           # NDWI/moisture gauge bar
│   ├── HealthBadge.tsx              # Color-coded status badge
│   ├── NDVITrendChart.tsx           # NDVI trend line chart
│   ├── ConfidenceBar.tsx            # Prediction confidence progress bar
│   ├── RecommendationCard.tsx       # Actionable recommendation display
│   ├── ScanHistoryList.tsx          # List of past camera scans
│   └── HealthTimeline.tsx           # Chronological health changes
├── hooks/
│   ├── useCropHealthZones.ts        # Fetch zone data (React Query)
│   ├── useCropScan.ts              # Image upload & prediction
│   ├── useHealthHistory.ts          # Zone health history
│   └── useWaterStatus.ts            # Combined water metrics
├── api/
│   └── cropHealth.api.ts            # API functions for crop health endpoints
├── types/
│   └── cropHealth.types.ts          # TypeScript types for crop health
└── utils/
    ├── ndviColorMapper.ts           # NDVI value → color mapping
    └── geoJsonParser.ts             # Parse GeoJSON for map rendering
```

---

## 11. Final Mobile App Architecture

### 11.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MOBILE APPLICATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     React Native + Expo App                          │    │
│  │                                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │   Home   │  │  Crop    │  │Irrigation│  │  Alerts  │           │    │
│  │  │Dashboard │  │  Health  │  │ Control  │  │  Center  │  [More]   │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │    │
│  │       └──────────────┼──────────────┼──────────────┘                │    │
│  │                      ▼                                              │    │
│  │  ┌─────────────────────────────────────────────────────────┐       │    │
│  │  │              Shared Hooks & State Layer                  │       │    │
│  │  │  TanStack Query │ React Context │ Local State            │       │    │
│  │  └───────────────────────┬─────────────────────────────────┘       │    │
│  │                          ▼                                          │    │
│  │  ┌─────────────────────────────────────────────────────────┐       │    │
│  │  │                   API Client Layer                       │       │    │
│  │  │  Axios Instance │ JWT Interceptor │ Offline Queue        │       │    │
│  │  └───────────────────────┬─────────────────────────────────┘       │    │
│  │                          ▼                                          │    │
│  │  ┌─────────────────────────────────────────────────────────┐       │    │
│  │  │              Local Storage Layer                          │       │    │
│  │  │  SecureStore (tokens) │ MMKV (cache) │ WatermelonDB      │       │    │
│  │  └───────────────────────┬─────────────────────────────────┘       │    │
│  │                          │                                          │    │
│  │  ┌─────────────────────────────────────────────────────────┐       │    │
│  │  │              Native Modules                              │       │    │
│  │  │  Camera │ Notifications │ Biometrics │ GPS │ Network     │       │    │
│  │  └─────────────────────────────────────────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                              HTTPS / REST
                              JSON + JWT
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                         API GATEWAY (NGINX / FastAPI)                        │
│                      Port 8000 — TLS, CORS, Rate Limiting                   │
│                                                                              │
│  /api/v1/auth/*  /api/v1/irrigation/*  /api/v1/crop-health/*               │
│  /api/v1/admin/* /api/v1/forecast/*    /api/v1/optimization/*              │
└──────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐
│   Auth   │  │Irrigation│  │  Crop    │  │Forecast  │  │  Optimization    │
│ Service  │  │ Service  │  │  Health  │  │ Service  │  │    Service       │
│  :8001   │  │  :8002   │  │ Service  │  │  :8003   │  │    :8004         │
│ (FastAPI)│  │ (FastAPI)│  │  :8006   │  │(FastAPI) │  │   (FastAPI)      │
│          │  │          │  │(FastAPI) │  │          │  │                  │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DATA & INFRASTRUCTURE LAYER                        │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ MongoDB  │  │PostgreSQL│  │ InfluxDB │  │  Redis   │  │Mosquitto │     │
│  │  (Auth)  │  │(Optim.)  │  │(TimeSer.)│  │ (Cache)  │  │  (MQTT)  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                    IoT Sensor Nodes                                │      │
│  │  Soil Moisture │ Temperature │ Humidity │ Canal Level │ Pumps      │      │
│  │         ↓ MQTT Publish ↓                                          │      │
│  │  ┌─────────────────────────────────┐                              │      │
│  │  │     Mosquitto MQTT Broker       │                              │      │
│  │  └──────────────┬──────────────────┘                              │      │
│  │                 │                                                  │      │
│  │                 ▼                                                  │      │
│  │  ┌─────────────────────────────────┐                              │      │
│  │  │    Irrigation Service (F1)      │  ← Stores in InfluxDB       │      │
│  │  └─────────────────────────────────┘                              │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                    External Data Sources                           │      │
│  │  Sentinel-2 Satellite │ Weather APIs │ Market Price APIs          │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                 Firebase Cloud Messaging (FCM)                     │      │
│  │                 Push Notifications to Mobile App                   │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Data Flow Diagram — Crop Health Scan

```
┌───────────┐                                    ┌──────────────────┐
│  Farmer's │  1. Captures photo                 │  Crop Health     │
│  Phone    │──────────────────────────────────▶ │  Service (F2)    │
│  Camera   │  POST /api/v1/crop-health/predict  │  Port 8006       │
└───────────┘  (multipart image)                 │                  │
                                                  │  2. Preprocess   │
                                                  │     Image        │
                                                  │  3. MobileNetV2  │
                                                  │     Inference    │
                                                  │  4. Generate     │
                                                  │     Prediction   │
┌───────────┐                                    │                  │
│  Scan     │  5. Response:                      │                  │
│  Result   │◀──────────────────────────────────│                  │
│  Screen   │  {class, confidence, severity,     └──────────────────┘
│           │   recommendation}                          │
│  Shows:   │                                            │ 6. If severity=HIGH
│  • Disease│                                            ▼
│  • Actions│                                   ┌──────────────────┐
│  • Tips   │                                   │  Notification    │
└───────────┘                                   │  Service         │
                                                 │  Sends FCM push  │
                                                 │  to field officer │
                                                 └──────────────────┘
```

### 11.3 Data Flow Diagram — Real-Time Sensor Monitoring

```
┌───────────┐     MQTT      ┌──────────┐    Store    ┌──────────┐
│IoT Sensor │──────────────▶│Mosquitto │───────────▶ │ InfluxDB │
│  Node     │  (publish)    │  Broker  │  (via F1)   │          │
└───────────┘               └──────────┘             └─────┬────┘
                                                           │
                                                           │ Query
                                                           ▼
┌───────────┐   REST/JSON   ┌──────────┐   REST     ┌──────────┐
│  Mobile   │◀─────────────│   API    │◀────────── │Irrigation│
│   App     │  sensor data  │ Gateway  │            │ Service  │
│           │  (polled Q30s)│ :8000    │            │  :8002   │
└───────────┘               └──────────┘            └──────────┘
```

---

## 12. Development Plan & Roadmap

### 12.1 Phase Breakdown

#### Phase 1: Foundation (Week 1–2)

| Task | Details | Deliverable |
|------|---------|------------|
| Project setup | Initialize React Native + Expo project with TypeScript | Bootable app shell |
| Navigation | Implement bottom tab navigation + stack navigators | All screens reachable (placeholder content) |
| Auth flow | Login, Register, Token storage (SecureStore), Auto-refresh | Working auth with backend |
| API client | Axios instance with JWT interceptor, base URL config | Shared API module |
| Shared types | Port TypeScript types from web project | `shared/types/` directory |

#### Phase 2: Core Screens (Week 3–4)

| Task | Details | Deliverable |
|------|---------|------------|
| Dashboard | Weather widget, field status cards, quick actions, alert count | Home screen fully functional |
| Sensor list | List all sensors with live values, status colors | Irrigation overview working |
| Sensor detail | Historical charts (24h/7d/30d), gauge component | Drill-down charts functional |
| Alert center | Alert list with severity filtering, mark-as-read | Alerts screen working |

#### Phase 3: Crop Health (Week 5–6) — YOUR PRIMARY MODULE

| Task | Details | Deliverable |
|------|---------|------------|
| Camera scan | Expo Camera integration, image capture, gallery picker | Camera + capture working |
| Image upload & predict | Connect to `/crop-health/predict`, display result | Full scan flow end-to-end |
| Scan result screen | Disease name, confidence bar, severity badge, recommendations | Beautiful result display |
| Health map | react-native-maps with zone polygons from GeoJSON | Interactive health map |
| Zone detail | NDVI/NDWI charts, water status bars, trend arrows | Zone drill-down screen |
| Health history | Timeline component with health status changes | History timeline working |

#### Phase 4: Advanced Features (Week 7–8)

| Task | Details | Deliverable |
|------|---------|------------|
| Irrigation control | Valve ON/OFF, duration picker, ML prediction accept/reject | Control screen functional |
| Forecasting | Rainfall charts, reservoir gauge, risk indicators | Forecast screen complete |
| Crop recommendations | Top-3 crops cards, suitability charts, water budget | Optimization screen done |
| Push notifications | FCM setup, notification handler, deep linking | Notifications working |

#### Phase 5: Polish & Release (Week 9–10)

| Task | Details | Deliverable |
|------|---------|------------|
| Offline mode | WatermelonDB caching, offline queue, sync | Offline functionality |
| Multi-language | i18next setup, EN/SI/TA translations | Language switching working |
| Admin panel | User management, service health, broadcast | Admin screens complete |
| UI polish | Animations, loading states, error boundaries, dark theme | Production-quality UI |
| Testing | Unit tests, integration tests, user acceptance testing | Test reports |
| Build & deploy | EAS Build for APK/IPA, app store preparation | Distributable builds |

### 12.2 Project Structure

```
mobile/
├── app.json                         # Expo configuration
├── App.tsx                          # Root component
├── package.json
├── tsconfig.json
├── babel.config.js
├── eas.json                         # EAS Build configuration
│
├── assets/                          # Images, fonts, icons
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── src/
│   ├── api/                         # API client layer
│   │   ├── client.ts                # Axios instance with JWT
│   │   ├── endpoints.ts             # Shared endpoint constants
│   │   ├── auth.api.ts
│   │   ├── irrigation.api.ts
│   │   ├── cropHealth.api.ts
│   │   ├── forecast.api.ts
│   │   └── optimization.api.ts
│   │
│   ├── components/                  # Shared UI components
│   │   ├── StatusBadge.tsx
│   │   ├── SensorGauge.tsx
│   │   ├── AlertCard.tsx
│   │   ├── QuickActionButton.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── LanguageToggle.tsx
│   │
│   ├── config/                      # App configuration
│   │   ├── constants.ts
│   │   ├── theme.ts                 # React Native Paper theme
│   │   └── i18n.ts                  # i18next configuration
│   │
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── OfflineContext.tsx
│   │
│   ├── features/                    # Feature modules
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── RegisterScreen.tsx
│   │   │   └── hooks/
│   │   │       └── useAuth.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   │   └── DashboardScreen.tsx
│   │   │   └── components/
│   │   │       ├── WeatherWidget.tsx
│   │   │       ├── FieldStatusCards.tsx
│   │   │       ├── AlertCountBadge.tsx
│   │   │       └── QuickActions.tsx
│   │   │
│   │   ├── crop-health/             # YOUR PRIMARY MODULE
│   │   │   ├── screens/
│   │   │   │   ├── CropHealthOverview.tsx
│   │   │   │   ├── ZoneDetail.tsx
│   │   │   │   ├── CameraScan.tsx
│   │   │   │   ├── ScanResult.tsx
│   │   │   │   └── HealthHistory.tsx
│   │   │   ├── components/
│   │   │   │   ├── HealthMap.tsx
│   │   │   │   ├── ZoneCard.tsx
│   │   │   │   ├── WaterStatusBar.tsx
│   │   │   │   ├── HealthBadge.tsx
│   │   │   │   ├── NDVITrendChart.tsx
│   │   │   │   ├── ConfidenceBar.tsx
│   │   │   │   ├── RecommendationCard.tsx
│   │   │   │   ├── ScanHistoryList.tsx
│   │   │   │   └── HealthTimeline.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCropHealthZones.ts
│   │   │   │   ├── useCropScan.ts
│   │   │   │   ├── useHealthHistory.ts
│   │   │   │   └── useWaterStatus.ts
│   │   │   ├── api/
│   │   │   │   └── cropHealth.api.ts
│   │   │   ├── types/
│   │   │   │   └── cropHealth.types.ts
│   │   │   └── utils/
│   │   │       ├── ndviColorMapper.ts
│   │   │       └── geoJsonParser.ts
│   │   │
│   │   ├── irrigation/
│   │   │   ├── screens/
│   │   │   │   ├── IrrigationDashboard.tsx
│   │   │   │   ├── SensorDetail.tsx
│   │   │   │   ├── IrrigationControl.tsx
│   │   │   │   └── IrrigationHistory.tsx
│   │   │   ├── components/
│   │   │   │   ├── SensorList.tsx
│   │   │   │   ├── ValveToggle.tsx
│   │   │   │   └── WaterUsageChart.tsx
│   │   │   └── hooks/
│   │   │       ├── useSensors.ts
│   │   │       └── useIrrigationControl.ts
│   │   │
│   │   ├── alerts/
│   │   │   ├── screens/
│   │   │   │   ├── AlertCenter.tsx
│   │   │   │   └── AlertDetail.tsx
│   │   │   ├── components/
│   │   │   │   ├── AlertList.tsx
│   │   │   │   └── SeverityFilter.tsx
│   │   │   └── hooks/
│   │   │       └── useAlerts.ts
│   │   │
│   │   ├── forecast/
│   │   │   ├── screens/
│   │   │   │   └── ForecastScreen.tsx
│   │   │   └── components/
│   │   │       ├── RainfallChart.tsx
│   │   │       ├── ReservoirGauge.tsx
│   │   │       └── RiskIndicator.tsx
│   │   │
│   │   ├── optimization/
│   │   │   ├── screens/
│   │   │   │   └── RecommendationsScreen.tsx
│   │   │   └── components/
│   │   │       ├── CropRecommendationCard.tsx
│   │   │       ├── SuitabilityChart.tsx
│   │   │       └── WaterBudgetChart.tsx
│   │   │
│   │   └── admin/
│   │       └── screens/
│   │           ├── AdminPanel.tsx
│   │           └── UserManagement.tsx
│   │
│   ├── hooks/                       # Global hooks
│   │   ├── useOffline.ts
│   │   ├── useNetworkStatus.ts
│   │   └── usePushNotifications.ts
│   │
│   ├── navigation/                  # React Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── CropHealthStack.tsx
│   │   ├── IrrigationStack.tsx
│   │   ├── AlertStack.tsx
│   │   └── MoreStack.tsx
│   │
│   ├── services/                    # Business logic
│   │   ├── notification.service.ts
│   │   ├── offline.service.ts
│   │   └── storage.service.ts
│   │
│   ├── store/                       # Local database
│   │   ├── database.ts              # WatermelonDB setup
│   │   └── models/                  # Offline data models
│   │       ├── CachedSensorData.ts
│   │       ├── CachedAlert.ts
│   │       └── ScanHistory.ts
│   │
│   ├── types/                       # Global TypeScript types
│   │   ├── api.types.ts
│   │   ├── navigation.types.ts
│   │   └── models.types.ts
│   │
│   ├── utils/                       # Utilities
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── imageCompressor.ts
│   │
│   └── locales/                     # i18n translation files
│       ├── en.json                  # English
│       ├── si.json                  # Sinhala
│       └── ta.json                  # Tamil
│
└── __tests__/                       # Test files
    ├── components/
    ├── hooks/
    └── screens/
```

### 12.3 Key Dependencies (package.json)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-camera": "~15.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-notifications": "~0.28.0",
    "expo-secure-store": "~13.0.0",
    "expo-localization": "~15.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-paper": "^5.12.0",
    "react-native-maps": "1.10.0",
    "react-native-chart-kit": "^6.12.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/stack": "^6.3.0",
    "@tanstack/react-query": "^5.8.0",
    "axios": "^1.6.0",
    "i18next": "^23.7.0",
    "react-i18next": "^14.0.0",
    "@nozbe/watermelondb": "^0.27.0",
    "react-native-mmkv": "^2.12.0",
    "react-native-reanimated": "~3.10.0"
  }
}
```

---

## 13. Appendix — Screen Wireframe Descriptions

### A. Dashboard Screen Wireframe

```
┌─────────────────────────────────────────┐
│ ☰  Smart Agriculture      🌐 EN  🔔 3  │  ← App bar
├─────────────────────────────────────────┤
│                                          │
│  🌤️ Udawalawe | 32°C | Humidity 78%     │  ← Weather card
│  🌧️ Rain expected: Tomorrow 15mm         │
│                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐       │  ← Field status
│  │Field A │ │Field B │ │Field C │       │     (horizontal scroll)
│  │  🟢 OK │ │ 🟡 Low │ │ 🔴 Dry │       │
│  │ 72% 💧 │ │ 45% 💧 │ │ 28% 💧 │       │
│  └────────┘ └────────┘ └────────┘       │
│                                          │
│  ┌──────────────┐ ┌──────────────┐      │  ← Quick actions
│  │ 📷 Scan Crop │ │ 💧 Irrigate  │      │
│  └──────────────┘ └──────────────┘      │
│                                          │
│  🌿 Crop Health                          │  ← Health donut
│  ┌─────────────────────────────────┐    │
│  │  🟢 65% Healthy                 │    │
│  │  🟡 25% Mild Stress             │    │
│  │  🔴 10% Severe                  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ⚠️ Recent Alerts                       │  ← Alert preview
│  • 🔴 Flood risk HIGH — 2h ago          │
│  • 🟡 Zone B3 stress — 5h ago           │
│  • 🟢 Field A irrigated — 8h ago        │
│                                          │
├─────────────────────────────────────────┤
│  🏠    🌿    💧    ⚠️    ☰             │  ← Bottom tabs
└─────────────────────────────────────────┘
```

### B. Camera Scan Result Wireframe

```
┌─────────────────────────────────────────┐
│  ← Back    Scan Result                   │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────┐    │
│  │         [Scanned Image]          │    │
│  │         (thumbnail)              │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ╔═══════════════════════════════════╗   │
│  ║  🔴  LATE BLIGHT                 ║   │  ← Disease name
│  ║      Severity: HIGH               ║   │
│  ╚═══════════════════════════════════╝   │
│                                          │
│  Confidence                              │
│  ████████████████████░░░ 94%            │  ← Confidence bar
│                                          │
│  Model: MobileNetV2 ✓                   │
│  Scanned: Mar 7, 2026 at 10:32 AM       │
│                                          │
│  ─────────────────────────────────       │
│  💡 Recommendations                      │
│  ─────────────────────────────────       │
│  1. Apply copper-based fungicide         │
│  2. Remove and destroy infected leaves   │
│  3. Improve air circulation              │
│  4. Avoid overhead irrigation            │
│                                          │
│  ┌──────────────┐ ┌──────────────┐      │
│  │  💾 Save      │ │  📤 Share    │      │
│  └──────────────┘ └──────────────┘      │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │       📷 Scan Another Crop       │   │
│  └──────────────────────────────────┘   │
│                                          │
├─────────────────────────────────────────┤
│  🏠    🌿    💧    ⚠️    ☰             │
└─────────────────────────────────────────┘
```

### C. Crop Health Map Wireframe

```
┌─────────────────────────────────────────┐
│  ← Back    Crop Health      🔄 Refresh   │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────┐    │
│  │         [MAP VIEW]               │    │
│  │                                  │    │
│  │    ┌─── 🟢 ───┐                │    │
│  │    │  Zone A1  │ ┌─── 🟡 ───┐ │    │
│  │    └───────────┘ │  Zone A2  │ │    │
│  │    ┌─── 🟢 ───┐ └───────────┘ │    │
│  │    │  Zone B1  │ ┌─── 🔴 ───┐ │    │
│  │    └───────────┘ │  Zone B3  │ │    │
│  │                  └───────────┘ │    │
│  │                          📷    │    │  ← FAB scan button
│  └─────────────────────────────────┘    │
│                                          │
│  Zone Health Summary                     │
│  ┌─────────────────────────────────┐    │
│  │ 🟢 Zone A1  │ NDVI 0.62 │ OK   │    │
│  ├─────────────────────────────────┤    │
│  │ 🟡 Zone A2  │ NDVI 0.48 │ Warn │    │
│  ├─────────────────────────────────┤    │
│  │ 🟢 Zone B1  │ NDVI 0.58 │ OK   │    │
│  ├─────────────────────────────────┤    │
│  │ 🔴 Zone B3  │ NDVI 0.32 │ CRIT │  > │
│  └─────────────────────────────────┘    │
│                                          │
├─────────────────────────────────────────┤
│  🏠    🌿    💧    ⚠️    ☰             │
└─────────────────────────────────────────┘
```

---

## Summary

This document provides a **complete, production-ready blueprint** for the Smart Agriculture mobile application. The key design decisions are:

1. **React Native + Expo** — Maximum code reuse with the existing React/TypeScript web app
2. **Same API Gateway** — No new backend needed; mobile consumes identical REST endpoints
3. **5-tab navigation** — Home, Crop Health, Irrigation, Alerts, More
4. **Crop Health is the hero feature** — Camera scanning, satellite maps, water monitoring, stress alerts
5. **Push notifications via FCM** — Critical alerts reach farmers instantly
6. **Offline-first with caching** — Works in areas with poor connectivity
7. **Multi-language** — English, Sinhala, Tamil for Sri Lankan farmers
8. **10-week phased development** — From foundation to polished release

The mobile app transforms the platform from a desk-bound dashboard into a **field-ready decision tool** that farmers can use while walking their fields — the core objective of this research project.

---

*Document generated for the Adaptive Smart Irrigation & Crop Optimization Platform — SLIIT 4th Year Final Year Research Project*

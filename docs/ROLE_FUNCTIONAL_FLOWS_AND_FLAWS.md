# Role Functional Flows & Known Flaws

This document captures the complete functional flow for each user role (Farmer, Officer, Authority) and all known issues identified across the frontend and auth layer.

---

## Table of Contents

1. [Farmer Flow](#1-farmer-flow)
2. [Officer Flow](#2-officer-flow)
3. [Authority Flow](#3-authority-flow)
4. [Cross-Role Flaw Summary](#4-cross-role-flaw-summary)
5. [Shared Auth Flaws](#5-shared-auth-flaws)

---

## 1. Farmer Flow

### Role Purpose
A farmer registers their land, pairs their IoT sensor, monitors soil conditions, and requests irrigation when the ML auto-decision doesn't trigger.

### 1.1 Registration (`/register`)

**Requirement:** New farmer creates an account and is assigned the `farmer` role automatically.

```
User fills: Full Name + Email + Password
            ↓
POST /api/v1/auth/register
            ↓
Auth Service creates User { roles: ["farmer"] }
            ↓
Redirect → /farmer/onboarding
```

**Flaws:**
- After registration, the page redirects directly to `/farmer/onboarding` without calling `login()`. No JWT is written to localStorage or cookie. The onboarding page will immediately get a 401 on its first API call and bounce the user back to `/login`.
- The NIC field is displayed on the form but never included in the API payload — it is collected for nothing.
- The form sends `username: fullName` (e.g. `"Nimal Perera"` with a space). The backend lowercases it to `"nimal perera"`. The login page labels the field "Email or NIC" with no hint that the username is the full name.

---

### 1.2 Onboarding (`/farmer/onboarding`) — 4 Steps

**Requirement:** First-time farmer registers their physical field and pairs their ESP32 sensor kit.

```
Step 1 — Field Details
    Input: field name, scheme zone, area (ha), soil type, GPS (lat/lng)

Step 2 — Crop Selection
    Input: primary crop for the season (Paddy, Maize, Chili, etc.)
    Action: POST /api/v1/irrigation/crop-fields/fields
            → creates field record in DB, returns field_id

Step 3 — Device Pairing
    Input: Device ID from ESP32 kit label
    Action 1: POST /api/v1/iot/devices/pairing/initiate  → pairing_session_id
    Action 2: POST /api/v1/iot/devices/pairing/{session_id}/confirm → CONFIRMED

Step 4 — Done
    Links: → /farmer (dashboard)  |  → /farmer/field/{field_id}
```

**Flaws:**
- API paths in the code are wrong:
  - `POST /farm/fields` should be `POST /irrigation/crop-fields/fields`
  - `POST /devices/pairing/initiate` should be `POST /iot/devices/pairing/initiate`
  - `POST /devices/pairing/{id}/confirm` should be `POST /iot/devices/pairing/{id}/confirm`
- Step 2 (Crop Selection) is skipped in the form flow — clicking "Continue" on Step 1 goes directly to `handleFieldCreate` which creates the field with `cropType` from state but the farmer never explicitly advances through a crop confirmation step.

---

### 1.3 Login (`/login`)

**Requirement:** Existing farmer authenticates and is redirected to their role-appropriate dashboard.

```
User fills: Username (or Email) + Password
            ↓
POST /api/v1/auth/login
            ↓
Returns: { access_token, refresh_token, user: { id, username, roles } }
            ↓
Tokens saved → localStorage + cookie (max-age: 900s)
            ↓
Role check on user.roles[0]:
    "farmer"    → /farmer
    "officer"   → /operations
    "authority" → /authority/users
```

**Flaws:**
- The role selector (Farmer / Officer / Authority tabs) is purely cosmetic. It sets a `role` state that is never used in the login call. Redirect is based entirely on the JWT roles returned from the backend.
- "Forgot password?" link points to `/register` — no password reset flow exists on the backend or frontend.
- `scheme_ids` is not returned in the login `TokenResponse` (only in `/auth/me`). The farmer dashboard shows `user?.scheme_ids?.[0] || 'H-04'` — it will always fall back to `'H-04'` until a `/me` call is made, which never happens automatically.

---

### 1.4 Farmer Dashboard (`/farmer`)

**Requirement:** Daily overview of water quota usage, current weather, and all registered fields with live sensor readings.

```
On load — 3 parallel API calls:
    ├── GET /irrigation/crop-fields/fields         → field list
    ├── GET /irrigation/water-management/reservoir/current  → quota state
    └── GET /forecast/weather                      → current conditions

Renders:
    ├── Water Budget card   → Gauge (% quota used), quota mm / used mm / remaining mm
    ├── Weather card        → temperature, humidity, condition, live/cached chip
    ├── Quick Scenario card → links to /optimization/planner + /optimization/adaptive
    └── Fields table        → moisture %, valve open/closed, health status
                                      ↓ click row
                             /farmer/field/{id}  (field detail)

Actions:
    ├── Refresh button   → re-runs all 3 API calls
    └── New Field button → /farmer/onboarding
```

**Flaws:**
- `GET /farm/fields` should be `GET /irrigation/crop-fields/fields` — will 404.
- `GET /water-management/reservoir/current` should be `GET /irrigation/water-management/reservoir/current` — will 404.
- Links to `/optimization/adaptive` and `/optimization/planner` exist on this page, but the proxy guards those routes as authority-only. A logged-in farmer clicking those links would be bounced to `/login`.

---

### 1.5 Field Detail (`/farmer/field/[id]`)

**Requirement:** Deep-dive on one field — live telemetry, ML auto-decision, valve control, manual irrigation request submission.

```
On load:
    GET /irrigation/crop-fields/fields/{id}/status      → live sensor snapshot
    GET /irrigation/crop-fields/fields/{id}/auto-decision → ML irrigation decision (0/1)

Farmer actions:
    ├── Manual valve toggle  → POST /irrigation/crop-fields/fields/{id}/valve
    └── Submit manual request:
            POST /irrigation/crop-fields/fields/{id}/manual-requests
                    ↓
            Officer receives request in their review queue
            Officer approves/rejects
                    ↓
            Farmer sees updated valve state on next refresh
```

---

## 2. Officer Flow

### Role Purpose
An officer monitors all fields across their scheme, approves or rejects farmer manual irrigation requests, and schedules hydraulic water releases from the reservoir to canal nodes.

### 2.1 Operations Overview (`/operations`)

**Requirement:** Scheme-wide real-time view of field status, pending requests, and active alerts.

```
On load — 2 parallel API calls:
    ├── GET /irrigation/officer-overview   → field counts, online/offline, anomalies
    └── GET /irrigation/manual-requests    → all requests (filtered to PENDING locally)

Renders:
    ├── Metrics row: Active fields | Pending requests | Open alerts | Valves open | Online/Offline
    ├── Alerts card   → list of anomalies with severity chips
    └── Pending requests card (top 5) → link to /operations/requests
```

**Flaws:**
- `GET /irrigation/officer-overview` does not exist in the irrigation service backend. The entire metrics row will always show zero.
- `GET /irrigation/manual-requests` should be `GET /irrigation/crop-fields/manual-requests`.

---

### 2.2 Manual Request Review (`/operations/requests`)

**Requirement:** Officer reviews all farmer irrigation requests, approves or rejects each with an optional note.

```
On load:
    GET /irrigation/crop-fields/manual-requests → full list

Tabs: PENDING | APPROVED | REJECTED  (filtered client-side)

Per request card:
    ├── Field name, farmer name, timestamp
    ├── Requested action + position %
    ├── Farmer's reason (italic quote)
    ├── ML recommendation (model name + confidence) if present
    └── [PENDING only] Optional note input + Reject / Approve buttons

Approve:
    POST /irrigation/crop-fields/manual-requests/{id}/review { decision: "APPROVE", note }

Reject:
    POST /irrigation/crop-fields/manual-requests/{id}/review { decision: "REJECT", note }
```

**Flaws:**
- `GET /irrigation/manual-requests` and `POST /irrigation/manual-requests/{id}/review` both use the wrong path — missing `/crop-fields/` segment.
- The "Optional note" field means an officer can reject a farmer's water request with zero explanation. No minimum validation on rejection reason.
- No scheme-level filtering — an officer sees requests from all fields across all schemes, not just their own scheme.

---

### 2.3 Hydraulics (`/operations/hydraulics`)

**Requirement:** View reservoir water level, see all scheduled canal releases, and queue new timed releases to irrigation nodes.

```
On load — 3 parallel API calls:
    ├── GET /irrigation/network/state     → network nodes list
    ├── GET /irrigation/network/schedules → scheduled releases
    └── GET /irrigation/water-management/reservoir/current → reservoir level

Renders:
    ├── Scheduled releases table (node, action, start, end, flow m³/s, status)
    └── Sidebar:
            ├── Reservoir gauge (% full, MCM)
            └── Add Release form:
                    Select node, start datetime, end datetime, volume (mm)
                    POST /irrigation/network/schedules
```

**Flaws:**
- `GET /irrigation/network/state`, `GET /irrigation/network/schedules`, and `POST /irrigation/network/schedules` do not exist in the irrigation service. The entire Hydraulics page loads empty and the "Queue release" form always fails.
- `GET /water-management/reservoir/current` is missing the `/irrigation/` prefix — will 404.
- The node selector is populated from `networkState?.nodes` — since that call 404s, the dropdown is always empty. The officer cannot select any node to schedule a release.

---

### 2.4 Sidebar Navigation Issues (Officer)

**Nav badge is hardcoded:**
`badge: 12` is static in [nav.ts](../web/src/components/asi/nav.ts). The "Manual Requests" sidebar item always shows "12" regardless of actual pending count.

**Alert Queue nav item has no page:**
The sidebar shows "Alert Queue" but no `/operations/alert-queue` route exists — clicking it returns a 404.

---

## 3. Authority Flow

### Role Purpose
The authority governs the entire irrigation scheme — manages all users (farmers and officers), sets season-wide water quotas and crop policy constraints, and publishes policies that drive the F4 optimization engine.

### 3.1 User Management (`/authority/users`)

**Requirement:** Full CRUD over all system users — view, create, activate/deactivate, delete.

```
On load:
    GET /authority/users → full user list

View: table with name, email, roles, schemes, status, created date

Filter: search (username/email) | role filter | status filter

Invite new user (modal):
    POST /authority/users {
        username, email, password, roles: [role], is_active: true, scheme_ids: [schemeId]
    }
    → creates officer or farmer account with a temporary password

Toggle user status:
    PATCH /authority/users/{id}/status { is_active: !current }

Delete user:
    DELETE /authority/users/{id}
```

**Flaws:**
- No role editing on existing users — the table only has Activate/Deactivate and Delete. There is no way to change a user's role after creation via the UI.
- The authority can create another authority-level user — the invite modal lists "Authority" as a role option with no restriction. No backend guard exists either.
- Invite sends a plaintext temporary password in the request body. There is no "must change on first login" enforcement anywhere in the system. The authority must communicate the password to the user out-of-band.
- Delete confirmation uses the browser-native `confirm()` dialog — no styled modal, not available in embedded/iframe contexts.

---

### 3.2 Policies & Quotas (`/authority/policies`)

**Requirement:** Authority sets season-wide constraints that feed into the F4 optimizer — quota limits, per-field caps, minimum paddy area, emergency mode.

```
On load:
    GET /authority/policies → list of existing policy drafts

Draft new policy form:
    Fields: Scheme ID, Quota (MCM), Max field open %, Season quota (mm),
            Min paddy area %, Max per-field quota (mm), Emergency mode toggle

Save draft:
    POST /authority/policies {
        scheme_id, quota_mcm, max_field_open_pct, emergency_mode,
        constraints: { season_quota_mm, min_paddy_area_pct, max_per_field_quota_mm }
    }
    → saved as status: DRAFT

Publish policy:
    POST /authority/policies/{id}/publish
    → status changes to ACTIVE
    → F4 optimizer uses these constraints for crop area allocation
```

**Flaws:**
- `GET /authority/policies`, `POST /authority/policies`, and `POST /authority/policies/{id}/publish` do not exist in the auth service authority router. All calls on this page will 404 — policies cannot be loaded, saved, or published.
- There is no confirmation step before publishing — a single click on "Publish" activates policy constraints scheme-wide with no review dialog.
- No versioning UI — published policies can't be rolled back from the frontend.

---

### 3.3 Sidebar Navigation Issues (Authority)

Four sidebar nav items exist in [nav.ts](../web/src/components/asi/nav.ts) with no corresponding route pages:

| Nav Item | Expected Route | Page File |
|----------|---------------|-----------|
| Scheme Zones | `/authority/scheme-zones` | Missing |
| Audit Log | `/authority/audit-log` | Missing |
| System Health | `/authority/system-health` | Missing |
| Seasonal Summary | `/authority/seasonal-summary` | Missing |

All four will 404 when clicked.

---

## 4. Cross-Role Flaw Summary

| Role | Login Destination | Core Action | Missing Pages | Critical API Flaws |
|------|------------------|-------------|---------------|-------------------|
| Farmer | `/farmer` | Monitor fields, request irrigation | None | Wrong base paths on fields + reservoir calls |
| Officer | `/operations` | Approve requests, schedule releases | Alert Queue | `officer-overview` + all hydraulics endpoints don't exist |
| Authority | `/authority/users` | Manage users, set quotas | 4 pages | Policies API doesn't exist |

---

## 5. Shared Auth Flaws

These affect all three roles.

### 5.1 Route Protection is Non-Functional
The middleware file is named `proxy.ts` instead of `middleware.ts`. Next.js only executes a file named `middleware.ts` at the `src/` root. No route protection is running — any unauthenticated user can directly access `/farmer`, `/operations`, `/authority/users` without a token.

**Fix:** Rename `web/src/proxy.ts` → `web/src/middleware.ts`.

### 5.2 No Token Auto-Refresh
The access token expires after 15 minutes. `api.ts` on 401 immediately wipes localStorage and redirects to `/login`. The refresh token is stored but `POST /auth/refresh` is never called anywhere. After 15 minutes of activity every user gets force-logged out.

### 5.3 `scheme_ids` Never in Login Response
The `/auth/login` endpoint returns `UserInfo { id, username, roles }` — no `scheme_ids`. All three portals display `user?.scheme_ids?.[0] || 'H-04'` as the scheme label. It will always show `'H-04'` unless `/auth/me` is explicitly called after login.

### 5.4 Optimization Routes Blocked for Farmers
`proxy.ts` guards `/optimization` for authority-only. The farmer dashboard directly links to `/optimization/adaptive` and `/optimization/planner`. When route protection is enabled, farmers following those links will be bounced to login.

### 5.5 Token Cookie Lifespan Matches JWT — No Sliding Window
The cookie is set with `max-age=900` (matching the 15-min JWT). There is no sliding expiry or silent refresh. Users doing continuous work are still kicked after exactly 15 minutes.

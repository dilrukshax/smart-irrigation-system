# F1 Irrigation Function - Paddy Field Functional Flow

## Scope
Main function flow for:
- Farmer paddy field setup
- IoT sensor connection and reconnection
- ML-driven automatic valve control
- Manual request path to Admin
- Admin reservoir and override operations

## Core Functions and Endpoints
| Area | Main Function/Endpoint | Purpose |
|---|---|---|
| Field setup | `POST /api/v1/irrigation/crop-fields/fields` | Create paddy field configuration |
| Sensor mapping | `PUT /api/v1/irrigation/crop-fields/fields/{field_id}` | Attach/update `device_id` |
| Device resolve | `GET /api/v1/irrigation/crop-fields/devices/{device_id}/resolve` | Map IoT device to field |
| Live ingest | `POST /api/v1/irrigation/crop-fields/fields/{field_id}/sensor-data` | Receive live sensor telemetry |
| Auto decision | `_make_auto_control_decision()` | Decide `OPEN/CLOSE/HOLD` |
| Field status | `GET /api/v1/irrigation/crop-fields/fields/{field_id}/status` | Farmer monitoring view |
| Decision preview | `GET /api/v1/irrigation/crop-fields/fields/{field_id}/auto-decision` | Show current engine decision |
| Manual valve | `POST /api/v1/irrigation/crop-fields/fields/{field_id}/valve` | Manual field-level valve action |
| Farmer manual request | `POST /api/v1/irrigation/crop-fields/fields/{field_id}/manual-requests` | Raise request when auto-open is blocked or manual intervention is needed |
| Admin request list | `GET /api/v1/irrigation/crop-fields/manual-requests` | View pending/reviewed manual requests |
| Admin request review | `POST /api/v1/irrigation/crop-fields/manual-requests/{request_id}/review` | Approve or reject with audit trail |
| Reservoir current | `GET /api/v1/irrigation/water-management/reservoir/current` | Admin reservoir check |
| Reservoir ingest | `POST /api/v1/irrigation/water-management/reservoir/ingest` | Push live reservoir snapshot |
| Water recommendation | `GET /api/v1/irrigation/water-management/recommend/auto` | ML recommendation from current data |
| Admin override | `POST /api/v1/irrigation/water-management/manual-override` | Emergency/manual control |

## Persistence
- All Function 1 runtime data is persisted in PostgreSQL via `DATABASE_URL` in `.env`.
- Runtime tables:
  - `irrigation_crop_fields`
  - `irrigation_valve_states`
  - `irrigation_sensor_readings`
  - `irrigation_reservoir_snapshots`
  - `irrigation_manual_requests`
  - `irrigation_manual_request_audit`
  - `irrigation_water_management_state`

## Role Guarding
- Admin-only:
  - `POST /api/v1/irrigation/crop-fields/fields/{field_id}/valve`
  - `GET /api/v1/irrigation/crop-fields/manual-requests`
  - `POST /api/v1/irrigation/crop-fields/manual-requests/{request_id}/review`
  - `POST /api/v1/irrigation/water-management/reservoir/ingest`
  - `POST /api/v1/irrigation/water-management/manual-override`
  - `POST /api/v1/irrigation/water-management/manual-override/cancel`
  - `GET /api/v1/irrigation/water-management/manual-override/status`
- Authenticated users (farmer/admin):
  - `POST /api/v1/irrigation/crop-fields/fields/{field_id}/manual-requests`

## Use Case Flow (Main)
1. Farmer logs in.
2. Farmer creates paddy field and assigns `device_id`.
3. IoT device sends water level and soil moisture data.
4. System validates telemetry and resolves device-to-field.
5. Decision engine loads context:
   - field thresholds
   - F3 forecast adjustment
   - F2 crop-stress summary
   - reservoir safety context
6. ML/rule engine decides `OPEN`, `CLOSE`, or `HOLD`.
7. If auto action is feasible, valve state is updated and event is logged.
8. If auto action is blocked (no safe/available water or issue), manual request is raised to Admin.
9. Admin reviews reservoir status and request.
10. Admin approves/rejects manual action or sets override.
11. System logs result and continues monitoring loop.

## F1 Contract Notes
F1 status/decision responses align to the shared contract fields:
- `status`
- `source`
- `is_live`
- `observed_at`
- `staleness_sec`
- `quality`
- `data_available`
- `message`

Blocked auto-open decisions include:
- `manual_request_required`
- `manual_request_id`
- `manual_request_status`
- `manual_request_reason`

## Activity Diagram (ML + Manual Path)
```mermaid
flowchart TD
    A["Farmer Login"] --> B["Create/Update Paddy Field"]
    B --> C["Assign Sensor Device (device_id)"]
    C --> D["IoT Sends Telemetry"]

    D --> E{"Telemetry Valid?"}
    E -->|No| F["Reconnect Sensor / Fix Device Mapping"]
    F --> D

    E -->|Yes| G["Build Decision Context"]
    G1["F3 Forecast Adjustment"] --> G
    G2["F2 Stress Summary"] --> G
    G3["Reservoir Snapshot"] --> G

    G --> H["Auto Control Engine: OPEN/CLOSE/HOLD"]
    H --> I{"Decision"}

    I -->|HOLD| J["Keep Current Valve State"]
    J --> D

    I -->|CLOSE| K["Close Valve"]
    K --> L["Log + Notify"]
    L --> D

    I -->|OPEN| M{"Water Available and Safe?"}
    M -->|Yes| N["Open Valve Automatically"]
    N --> O["Monitor Water Level Feedback"]
    O --> P{"Target Level Reached?"}
    P -->|No| O
    P -->|Yes| K

    M -->|No| Q["Create Manual Request to Admin"]
    Q --> R["Admin Reviews Request + Reservoir"]
    R --> S{"Approve?"}
    S -->|No| T["Reject + Notify Farmer"]
    T --> D
    S -->|Yes| U["Admin Manual Override OPEN/CLOSE"]
    U --> L
```

## Sequence (Roles and Services)
```mermaid
sequenceDiagram
    participant Farmer
    participant IoT as IoT Device
    participant F1 as Irrigation Service (F1)
    participant F3 as Forecasting (F3)
    participant F2 as Crop Health (F2)
    participant Admin

    Farmer->>F1: Create/Update field + device_id
    IoT->>F1: Send sensor-data(field_id)
    F1->>F3: Get irrigation adjustment
    F1->>F2: Get stress summary
    F1->>F1: _make_auto_control_decision()

    alt OPEN and safe water available
        F1->>F1: Apply valve OPEN
        F1-->>Farmer: Status/decision update
    else CLOSE
        F1->>F1: Apply valve CLOSE
        F1-->>Farmer: Status/decision update
    else HOLD
        F1-->>Farmer: No valve change
    else OPEN but blocked
        F1-->>Admin: Manual request raised
        Admin->>F1: Manual override decision
        F1-->>Farmer: Final action update
    end
```

## Where to Modify Logic
- Field decision logic: `services/irrigation_service/app/api/crop_fields.py` (`_make_auto_control_decision`)
- Auto action execution on ingest: `services/irrigation_service/app/api/crop_fields.py` (`receive_sensor_data`)
- Reservoir-driven admin control: `services/irrigation_service/app/api/water_management.py`
- IoT to F1 bridge path: `services/iot_service/app/iot/service.py` (`_forward_to_irrigation`)

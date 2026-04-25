# Seamless Smart Irrigation Product Plan (Farmer-First)

## Summary
- Connected product flow: `Login -> Field Setup -> Adaptive Crop Recommendation -> Unified Dashboard -> Satellite Monitoring -> Irrigation Actions -> Authority Operations`.
- Locked decisions:
  - Field setup does **not** require crop selection.
  - pH is out of scope for v1.
  - Hybrid ML + fallback mode is enabled.

## Implemented Core Units

### Unit 1 - Foundation and Contract Alignment
- Added compatibility settings in optimize service config (`resolved_database_url`, `auth_service_url`, `is_strict_live_data`, `is_ml_only_mode`).
- Normalized admin/authority role handling in service-level admin checks.
- Updated optimization irrigation context integration to use current irrigation endpoint (`/api/v1/irrigation/fields/{field_id}/status`).

### Unit 2 - Farmer Field Setup (Crop-Agnostic)
- Added `soil_type` to irrigation field model and persistence mapping.
- Added migration: `20260413_0003_field_soil_type.py`.
- Field create now supports crop-agnostic onboarding (`crop_type` defaults to `unassigned`).
- Onboarding UI now captures: field name, area, scheme, soil type, location name, latitude, longitude, and device pairing.

### Unit 3 - Adaptive Crop Recommendation + Crop Confirmation
- Added API: `POST /api/v1/farm/fields/{field_id}/confirm-crop`.
- Crop confirmation updates field crop profile and irrigation thresholds.
- Field profile UI now supports selecting a recommended crop directly from F4 recommendations.

### Unit 4 - Unified Farmer Dashboard
- Enhanced gateway unified profile payload to include:
  - `selected_crop`
  - `satellite_stress_summary`
  - `sections.f4.recommendation_summary`
  - `sections.f4.income_projection`
  - `sections.f4.market_snapshot`
- Field profile UI now displays selected crop, soil type, projected income, and market snapshot.

### Unit 5 - Satellite and Crop Health Integration
- Satellite stress summary remains integrated through F2 stress endpoint and is now exposed at top-level unified profile for dashboard composition.

### Unit 6 - Irrigation + Authority Control Loop
- Existing telemetry, policy-aware auto-decision, manual request, and authority review workflows retained.
- Role alias handling improved for authority-like admin contracts.

## Public API / Interface Changes

### Field API
- `POST /api/v1/farm/fields`
  - `crop_type` optional (defaults to `unassigned`).
  - accepts `soil_type`, `scheme_id`, `location_name`, `latitude`, `longitude`.
- `PATCH /api/v1/farm/fields/{field_id}`
  - accepts `soil_type` updates.

### Crop Confirmation API
- `POST /api/v1/farm/fields/{field_id}/confirm-crop`
  - Applies crop profile thresholds and confirms selected crop.

### Sync / Orchestration
- Irrigation service now performs best-effort sync to optimize service internal endpoints on field create/update/delete.

### Gateway Unified Profile
- Added aggregated fields:
  - `selected_crop`
  - `satellite_stress_summary`
  - `sections.f4.recommendation_summary`
  - `sections.f4.income_projection`
  - `sections.f4.market_snapshot`

### Frontend Types / API
- Extended field types with `soil_type`.
- Added client API method `cropFieldsApi.confirmCrop(...)`.

## Validation Run
- `gateway/tests/test_gateway_contracts.py`: passed.
- `services/forecasting_service/tests/test_forecasting_contracts.py`: passed.
- `services/irrigation_service/tests/test_decision_integration.py`: passed.
- `services/optimize_service/tests/test_planning_integration.py`: skipped (environment-dependent in current setup).
- `web` production build (`npm run build`): passed.

## Assumptions and Defaults
- v1 excludes live pH ingestion and pH-based decision logic.
- Map capture is point-based (latitude/longitude), not polygon drawing.
- Hybrid ML mode remains default; fallback paths are preserved.

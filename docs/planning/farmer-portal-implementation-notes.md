# Farmer Portal Implementation Notes

## Scope Delivered

- Farmer-first portal at `/farmer` with:
  - dismissible top announcement banner,
  - language toggle (EN/SI/TA) scoped to farmer portal text,
  - current detail cards (fields, weather/forecast, optimization, water budget),
  - water-budget analytics (quota, usage, remaining, utilization, status band),
  - crop-level water contribution list,
  - quick scenario simulation widget,
  - quick adaptive simulation widget.
- Open farmer self-signup:
  - public registration accepts `role=user|farmer`,
  - `farmer` signup stores roles as `["user", "farmer"]`,
  - invalid public roles (such as `admin`) are rejected by schema validation.
- Post-login behavior:
  - farmer users default to `/farmer`,
  - one-time farmer login announcement is shown via frontend notification.
- Farmer-focused navigation:
  - farmer menu emphasizes Farmer Portal, Crop Fields, Scenarios, and Adaptive Simulation.

## Public API / Interface Changes

- `POST /api/v1/auth/register`
  - Added optional `role` request field.
  - Supported values: `user`, `farmer`.
  - Default value: `user`.
- Frontend interfaces:
  - `RegisterRequest` now includes optional `role`.
  - Registration UI includes account type selector.
- Route contract:
  - Added `ROUTES.FARMER.ROOT = "/farmer"`.

## Project Budget Estimate (Implementation Effort)

- Auth/API changes: **1.5 days**
- Farmer portal + multilingual + announcement: **4.5 days**
- Routing/navigation integration: **1.5 days**
- QA/regression/docs: **1.5 days**

**Total:** ~**9 engineering days** (±2 days)

## Localization Note

- Sinhala and Tamil strings are included for farmer portal v1.
- Native-speaker review is recommended before production release.

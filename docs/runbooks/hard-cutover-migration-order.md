# Hard Cutover Migration Order (Farmer-First Release)

## Scope
- Role model cutover: `admin` -> `authority`
- New grouped namespaces: `farm`, `devices`, `telemetry`, `irrigation`, `authority`, `planning`
- Alembic-managed schema evolution for `auth_service` and `irrigation_service`

## Required Order
1. Put system in maintenance mode (stop writes from frontend and IoT test clients).
2. Run `auth_service` Alembic migrations.
3. Run `irrigation_service` Alembic migrations.
4. Seed authority/officer users and scheme assignments.
5. Deploy services (`auth`, `irrigation`, `iot`, `gateway`, `web`) with new route contracts.
6. Run smoke checks on farmer onboarding + manual request + authority policy publish.

## Auth Service
```bash
cd services/auth_service
alembic upgrade head
python seed_admin.py
```

What this migration does:
- Normalizes legacy roles (`admin` -> `authority`, removes `user`, defaults to `farmer`)
- Creates `scheme_assignments` table for officer/authority scope control
- Seeds default test users for `farmer`, `officer`, and `authority`

## Irrigation Service
```bash
cd services/irrigation_service
alembic upgrade head
```

What this migration does:
- Extends field ownership/scheme/lifecycle metadata
- Adds pairing session table
- Adds hydraulic schedule table
- Adds authority policy table
- Extends manual request lifecycle fields for execution/close tracking

## Post-Deploy Smoke Checklist
1. Farmer self-registers and logs in.
2. Farmer creates field and starts pairing.
3. First telemetry transitions field lifecycle to `LIVE` and confirms pairing.
4. Policy-blocked `OPEN` creates pending manual request.
5. Officer reviews and approves request.
6. Authority creates + publishes policy and verifies constraint changes in next auto decision.

## Officer Rollout Checks
1. Confirm `/api/v1/auth/me` for officer users includes non-empty `scheme_ids`.
2. Confirm officer with no assignments receives `403` for:
   - `/api/v1/irrigation/officer/overview`
   - `/api/v1/irrigation/manual-requests`
   - `/api/v1/irrigation/network/*`
3. Confirm officer can only edit `/api/v1/farm/fields/{field_id}` for in-scheme fields.
4. Confirm hydraulic scheduling remains workflow-only (`ACCEPTED`/`REJECTED`), with no direct actuator endpoint.

## Officer SLA and Monitoring Guidance
- Pending manual request backlog:
  - Warning: `pending_requests >= 10` for a scheme
  - Critical: `pending_requests >= 20` for a scheme
- Telemetry freshness:
  - Warning: any field stale for `> 300s`
  - Critical: `stale_fields >= 5` or all fields stale/no-data in a scheme
- Hydraulic planning quality:
  - Warning: `rejected_schedules > 0` in rolling 24h
  - Critical: repeated overlap/policy rejections for same turnout in rolling 24h

Use `/api/v1/irrigation/officer/overview` as the primary board feed for the above indicators.

# Test Data README

This document provides sample login data for local and QA testing.

## Scope

- Service: `auth_service`
- Seeder script: `services/auth_service/seed_admin.py`
- Purpose: quickly test farmer, officer, authority, multi-role, and inactive-user flows.

## Run Seeder

From repository root:

```bash
cd services/auth_service
python seed_admin.py
```

If you use a virtual environment:

```bash
cd services/auth_service
./venv/bin/python seed_admin.py
```

The script is idempotent. Running it again will:

- keep the same usernames
- reset passwords to the values in this document
- reset roles and scheme assignments
- reset active/inactive status

## Seeded Login Accounts

| Username | Password | Roles | Active | Scheme IDs | Suggested checks |
|---|---|---|---|---|---|
| farmer | farmer123 | farmer | true | (none) | Basic farmer login, `/me`, farmer-only screens |
| farmer_demo_01 | farmer123 | farmer | true | (none) | Multi-user farmer testing |
| farmer_demo_02 | farmer123 | farmer | true | (none) | Ownership and user-isolation checks |
| officer | officer123 | officer | true | scheme-default | Officer overview and scoped workflows |
| officer_noscope | officer123 | officer | true | (none) | Verify scoped endpoints reject with 403 |
| authority | authority123 | authority | true | scheme-default | Authority user management and policy flows |
| authority_regional | authority123 | authority | true | scheme-default, scheme-mahaweli-left-bank | Multi-scheme authority checks |
| ops_supervisor | ops12345 | authority, officer | true | scheme-default, scheme-mahaweli-left-bank | Multi-role behavior and token role checks |
| farmer_inactive | farmer123 | farmer | false | (none) | Login should fail with deactivated account message |

## Login Endpoint

Via gateway (recommended):

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authority","password":"authority123"}'
```

Direct auth service:

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authority","password":"authority123"}'
```

## Quick Validation Checklist

1. Login with `farmer`, `officer`, and `authority` and verify token + role payload.
2. Call `GET /api/v1/auth/me` with each token and confirm role and scheme IDs.
3. Call a scheme-scoped officer endpoint with `officer_noscope` and verify `403`.
4. Try login with `farmer_inactive` and verify account-deactivated behavior.
5. Use `authority` or `authority_regional` to test authority management routes.

## Notes

- This dataset is for development and testing only.
- Do not use these credentials in production.

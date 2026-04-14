# Config Server

Centralized runtime configuration service for the Smart Irrigation local Docker stack.

## Endpoints

- `GET /health`
- `GET /config/{service_name}?profile=docker`
- `GET /config/all?profile=docker`
- `GET /config/{service_name}?profile=local`
- `GET /config/all?profile=local`

## Run locally

```bash
cd services/config_server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

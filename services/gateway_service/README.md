# Gateway Service

FastAPI API gateway for the Smart Irrigation System.

## Run locally

```bash
cd services/gateway_service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Tests

```bash
python -m pytest tests/ -v
```

# Crop Health & Water Stress Detection service

Run locally:
1. cd services/crop_health_and_water_stress_detection
2. python -m venv .venv
3. .\\.venv\\Scripts\\activate
4. pip install -r requirements.txt
5. uvicorn app.main:app --host 0.0.0.0 --port 8007 --reload

Build with Docker:
docker build -t crop-stress-service .
docker run -p 8007:8007 crop-stress-service

Add this service to your docker-compose.yml:
```yaml
crop_health_and_water_stress_detection:
  build:
    context: ./services/crop_health_and_water_stress_detection
  ports:
    - "8007:8007"
  depends_on:
    - auth_service  # if needed
```

Endpoints:
- GET /health
- POST /predict (multipart form file, field name `file`)

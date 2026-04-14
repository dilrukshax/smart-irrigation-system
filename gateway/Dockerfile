# API Gateway Dockerfile (FastAPI runtime)

FROM python:3.11-slim

LABEL org.opencontainers.image.title="API Gateway"
LABEL org.opencontainers.image.description="FastAPI API Gateway for Smart Irrigation"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "gateway:app", "--host", "0.0.0.0", "--port", "8000"]

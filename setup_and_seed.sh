#!/bin/bash
set -e

echo "Extracting DATABASE_URL..."
export DATABASE_URL=$(grep NEON_DATABASE_URL .env | cut -d '=' -f 2- | tr -d '\r' | tr -d '"' | tr -d "'")
export DATABASE_URL=${DATABASE_URL/postgresql:\/\//postgresql+asyncpg://}
export DATABASE_URL=${DATABASE_URL/\?sslmode=require\&channel_binding=require/}
export DATABASE_URL=${DATABASE_URL/\?sslmode=require/}
echo "Will use DB URL: $DATABASE_URL"

for svc in auth_service irrigation_service optimize_service forecasting_service iot_service crop_health_and_water_stress_detection gateway_service; do
    echo "========================================"
    echo "Setting up $svc..."
    cd services/$svc
    
    if [ ! -d "venv" ]; then
        /opt/homebrew/bin/python3.11 -m venv venv
    fi
    
    ./venv/bin/python -m pip install --upgrade pip > /dev/null
    if [ -f "requirements.txt" ]; then
        ./venv/bin/python -m pip install -r requirements.txt > /dev/null
    elif [ -f "requirements-basic.txt" ]; then
        ./venv/bin/python -m pip install -r requirements-basic.txt > /dev/null
    fi
    ./venv/bin/python -m pip install alembic psycopg2-binary asyncpg > /dev/null
    
    if [ -f "alembic.ini" ]; then
        echo "Running migrations for $svc..."
        ./venv/bin/alembic upgrade head || echo "Migration failed or empty for $svc, continuing"
    else
        echo "No alembic.ini found for $svc, skipping migrations."
    fi
    cd ../..
done

echo "========================================"
echo "Running shared demo seeder..."
services/auth_service/venv/bin/python seed_data.py
echo "All done!"

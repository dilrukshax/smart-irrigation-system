#!/bin/bash
set -e

echo "Extracting DATABASE_URL..."
export DATABASE_URL=$(grep NEON_DATABASE_URL .env | cut -d '=' -f 2- | tr -d '\r' | tr -d '"' | tr -d "'")
export DATABASE_URL=${DATABASE_URL/postgresql:\/\//postgresql+asyncpg://}
# Remove sslmode parameters for asyncpg if any
export DATABASE_URL=${DATABASE_URL/\?sslmode=require\&channel_binding=require/}
export DATABASE_URL=${DATABASE_URL/\?sslmode=require/}
echo "Will use DB URL: $DATABASE_URL"

for svc in auth_service irrigation_service optimize_service forecasting_service iot_service crop_health_and_water_stress_detection; do
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
    # Ensure alembic and async database drivers are present
    ./venv/bin/python -m pip install alembic psycopg2-binary asyncpg > /dev/null
    
    if [ -f "alembic.ini" ]; then
        echo "Running migrations for $svc..."
        ./venv/bin/alembic upgrade head
    else
        echo "No alembic.ini found for $svc, skipping migrations."
    fi
    cd ../..
done

echo "========================================"
echo "Creating and running seed script for Auth/Irrigation side..."

cat << 'SEEDEOF' > seed_data.py
import asyncio
import os
import uuid
import random
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from datetime import datetime, timezone, timedelta

url = os.environ.get("DATABASE_URL")
if not url:
    raise ValueError("DATABASE_URL not set")

engine = create_async_engine(url, connect_args={"ssl": True})
AsyncSessionLocal = async_sessionmaker(engine)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Get users
        res = await session.execute(text("SELECT id, username FROM users WHERE username IN ('farmer', 'officer', 'authority')"))
        users = {row[1]: row[0] for row in res.fetchall()}
        
        farmer_id = users.get('farmer')
        if not farmer_id:
            print("Farmer user not found. Did the auth seeder run? Skipping irrigation seed.")
            return
            
        print(f"Farmer ID found: {farmer_id}")
        
        # 1. Create Crop Fields
        print("Creating crop fields...")
        field_id_1 = str(uuid.uuid4())
        field_id_2 = str(uuid.uuid4())
        
        # Delete existing to prevent duplication issues
        await session.execute(text("DELETE FROM irrigation_sensor_readings"))
        await session.execute(text("DELETE FROM irrigation_valve_states"))
        await session.execute(text("DELETE FROM irrigation_device_pairings"))
        await session.execute(text("DELETE FROM irrigation_crop_fields"))
        
        await session.execute(
            text("""
            INSERT INTO irrigation_crop_fields 
            (id, owner_id, scheme_id, name, location_latitude, location_longitude, area_ha, crop_type, grid_assigned, created_at, updated_at) 
            VALUES (:id, :owner_id, :scheme_id, :name, :lat, :lon, :area, :crop, :grid, :created_at, :updated_at)
            """),
            [
                {"id": field_id_1, "owner_id": farmer_id, "scheme_id": "scheme-default", "name": "North Paddy Field", "lat": 6.42, "lon": 80.89, "area": 2.5, "crop": "Paddy", "grid": "Grid-A", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
                {"id": field_id_2, "owner_id": farmer_id, "scheme_id": "scheme-default", "name": "East Vegetable Patch", "lat": 6.43, "lon": 80.90, "area": 1.2, "crop": "Tomato", "grid": "Grid-B", "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}
            ]
        )
        
        # 2. Add pairings, valves
        device_1 = "ESP32_PADDY_01"
        device_2 = "ESP32_VEG_01"
        
        await session.execute(text("""
            INSERT INTO irrigation_device_pairings (id, field_id, device_id, status, paired_at) 
            VALUES (:id, :field_id, :device_id, 'active', :paired_at)
        """), [
            {"id": str(uuid.uuid4()), "field_id": field_id_1, "device_id": device_1, "paired_at": datetime.now(timezone.utc)},
            {"id": str(uuid.uuid4()), "field_id": field_id_2, "device_id": device_2, "paired_at": datetime.now(timezone.utc)}
        ])
        
        await session.execute(text("""
            INSERT INTO irrigation_valve_states (field_id, status, is_open, water_flow_rate_l_s, source, updated_at) 
            VALUES (:field_id, 'online', :is_open, :flow, 'manual', :updated_at)
        """), [
            {"field_id": field_id_1, "is_open": True, "flow": 2.5, "updated_at": datetime.now(timezone.utc)},
            {"field_id": field_id_2, "is_open": False, "flow": 0.0, "updated_at": datetime.now(timezone.utc)}
        ])
        
        # 3. Create sensor telemetry for graphs (last 10 hours, 1 reading per hour)
        print("Seeding sensor data...")
        readings = []
        now = datetime.now(timezone.utc)
        for i in range(10):
            ts = now - timedelta(hours=i)
            # Field 1
            readings.append({"id": str(uuid.uuid4()), "field_id": field_id_1, "soil_moisture": random.uniform(20, 60), "temperature": random.uniform(25, 30), "humidity": random.uniform(70, 85), "timestamp": ts})
            # Field 2
            readings.append({"id": str(uuid.uuid4()), "field_id": field_id_2, "soil_moisture": random.uniform(30, 80), "temperature": random.uniform(22, 28), "humidity": random.uniform(60, 80), "timestamp": ts})
            
        await session.execute(text("""
            INSERT INTO irrigation_sensor_readings (id, field_id, soil_moisture_percent, temperature_celsius, humidity_percent, reading_timestamp)
            VALUES (:id, :field_id, :soil_moisture, :temperature, :humidity, :timestamp)
        """), readings)
        
        await session.commit()
        print("Irrigation data saturated securely!")

asyncio.run(seed_data())
SEEDEOF

services/auth_service/venv/bin/python seed_data.py
rm seed_data.py
echo "All done!"

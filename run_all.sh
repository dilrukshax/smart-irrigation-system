#!/bin/bash
export DATABASE_URL=$(grep NEON_DATABASE_URL .env | cut -d '=' -f 2- | tr -d '\r' | tr -d '"' | tr -d "'")
export DATABASE_URL=${DATABASE_URL/postgresql:\/\//postgresql+asyncpg://}
export DATABASE_URL=${DATABASE_URL/\?sslmode=require\&channel_binding=require/}
export DATABASE_URL=${DATABASE_URL/\?sslmode=require/}

# Seed Auth users
echo "Seeding users..."
cd services/auth_service
./venv/bin/python seed_admin.py || echo "Auth seed maybe failed"
cd ../..

echo "Seeding dashboard demo data..."
services/auth_service/venv/bin/python seed_data.py || echo "Demo seed maybe failed"

echo "Done running everything"

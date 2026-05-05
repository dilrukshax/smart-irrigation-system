#!/bin/bash
set -e

for svc in auth_service irrigation_service optimize_service; do
    echo "========================================"
    echo "Force migrating $svc..."
    cd /Users/dilandilaruksha/Project/smart-irrigation-system/services/$svc
    
    if [ -f "alembic.ini" ]; then
        ./venv/bin/alembic downgrade base || true
        ./venv/bin/alembic upgrade head
    fi
done

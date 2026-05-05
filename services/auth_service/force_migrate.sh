#!/bin/bash
set -e

for svc in auth_service irrigation_service optimize_service; do
    echo "========================================"
    echo "Force migrating $svc..."
    cd services/$svc
    
    if [ -f "alembic.ini" ]; then
        # Force downgrade to base to wipe out any stale alembic states
        ./venv/bin/alembic downgrade base || true
        # Run upgrade
        ./venv/bin/alembic upgrade head
    fi
    cd ../..
done

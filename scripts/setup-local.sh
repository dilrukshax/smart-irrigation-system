#!/bin/bash
# Setup local development environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Setting up local development environment..."

# Check prerequisites
echo "Checking prerequisites..."

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is not installed"
    return 1
  else
    echo "✓ $1 is installed"
    return 0
  fi
}

missing=0
check_command docker || missing=1
check_command docker-compose || check_command "docker compose" || missing=1
check_command python3 || missing=1
check_command node || missing=1
check_command npm || missing=1

if [ $missing -eq 1 ]; then
  echo ""
  echo "Please install missing prerequisites and try again."
  exit 1
fi

# Setup environment files
echo ""
echo "Setting up environment files..."

if [ ! -f "${PROJECT_ROOT}/infrastructure/docker/.env" ]; then
  cp "${PROJECT_ROOT}/infrastructure/docker/.env.example" "${PROJECT_ROOT}/infrastructure/docker/.env"
  echo "✓ Created .env file (please update with your values)"
else
  echo "✓ .env file already exists"
fi

# Setup Python virtual environments for services
echo ""
echo "Setting up Python virtual environments..."

services=(
  "services/auth-service"
  "services/irrigation-service"
  "services/forecasting-service"
  "services/optimization-service"
)

for service in "${services[@]}"; do
  service_path="${PROJECT_ROOT}/${service}"
  if [ -f "${service_path}/requirements.txt" ]; then
    echo "Setting up ${service}..."
    if [ ! -d "${service_path}/venv" ]; then
      python3 -m venv "${service_path}/venv"
    fi
    source "${service_path}/venv/bin/activate" 2>/dev/null || . "${service_path}/venv/Scripts/activate"
    pip install -q -r "${service_path}/requirements.txt"
    deactivate 2>/dev/null || true
    echo "✓ ${service} environment ready"
  fi
done

# Setup frontend
echo ""
echo "Setting up frontend..."
cd "${PROJECT_ROOT}/frontend"
npm install
echo "✓ Frontend dependencies installed"

# Start infrastructure services
echo ""
echo "Starting infrastructure services (MongoDB, PostgreSQL, Redis)..."
cd "${PROJECT_ROOT}/infrastructure/docker"
docker compose up -d mongodb postgres redis

echo ""
echo "Waiting for services to be ready..."
sleep 10

echo ""
echo "============================================"
echo "Local development environment is ready!"
echo "============================================"
echo ""
echo "To start all services with Docker Compose:"
echo "  cd infrastructure/docker && docker compose up"
echo ""
echo "To start individual services for development:"
echo "  cd services/auth-service && source venv/bin/activate && uvicorn app.main:app --reload --port 8001"
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""

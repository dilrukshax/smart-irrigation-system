#!/usr/bin/env bash
# =============================================================================
#  Smart Irrigation System — VM Docker Deployment Script
#  Target: Linux VM (Ashu VM) running Docker + Docker Compose
#
#  Usage:
#    ./scripts/deploy-vm.sh [OPTIONS]
#
#  Options:
#    --build-only     Build images without starting containers
#    --start-only     Start containers using existing images (no rebuild)
#    --restart        Stop running stack, rebuild, and restart
#    --stop           Stop and remove all containers (data volumes preserved)
#    --logs           Tail logs for all services after deploy
#    --help           Show this help message
#
#  Environment:
#    Set REGISTRY=<registry>/<project> to tag images for a remote registry.
#    Default: builds locally only.
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/infrastructure/docker/docker-compose.yml"
ENV_FILE="${PROJECT_ROOT}/infrastructure/docker/.env"

# ---------------------------------------------------------------------------
# Colours
# ---------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}=== $* ===${RESET}\n"; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
BUILD_ONLY=false
START_ONLY=false
RESTART=false
STOP=false
TAIL_LOGS=false

for arg in "$@"; do
  case "$arg" in
    --build-only)  BUILD_ONLY=true ;;
    --start-only)  START_ONLY=true ;;
    --restart)     RESTART=true ;;
    --stop)        STOP=true ;;
    --logs)        TAIL_LOGS=true ;;
    --help)
      sed -n '/^#  Usage:/,/^# ====/p' "$0" | sed 's/^#  \{0,2\}//'
      exit 0
      ;;
    *) error "Unknown option: $arg"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Pre-flight: prerequisites
# ---------------------------------------------------------------------------
header "Pre-flight checks"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    success "$1 found: $(command -v "$1")"
    return 0
  else
    return 1
  fi
}

# Detect docker compose command (v2 plugin vs standalone)
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  error "Neither 'docker compose' (v2) nor 'docker-compose' is available."
  error "Install Docker Desktop or the Docker Compose plugin and retry."
  exit 1
fi
success "Docker Compose command: ${DC}"

check_cmd docker || { error "Docker is not installed."; exit 1; }

DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
info "Docker version: ${DOCKER_VERSION}"

# ---------------------------------------------------------------------------
# --stop
# ---------------------------------------------------------------------------
if $STOP; then
  header "Stopping stack"
  cd "${PROJECT_ROOT}/infrastructure/docker"
  $DC --env-file "${ENV_FILE}" down
  success "All containers stopped. Data volumes preserved."
  exit 0
fi

# ---------------------------------------------------------------------------
# --restart — stop first, then fall through to normal deploy
# ---------------------------------------------------------------------------
if $RESTART; then
  header "Stopping existing stack before restart"
  cd "${PROJECT_ROOT}/infrastructure/docker"
  $DC --env-file "${ENV_FILE}" down || true
fi

# ---------------------------------------------------------------------------
# Environment file
# ---------------------------------------------------------------------------
header "Environment setup"

if [[ ! -f "${ENV_FILE}" ]]; then
  if [[ -f "${PROJECT_ROOT}/infrastructure/docker/.env.example" ]]; then
    cp "${PROJECT_ROOT}/infrastructure/docker/.env.example" "${ENV_FILE}"
    warn ".env not found — copied from .env.example."
    warn "Edit ${ENV_FILE} and set JWT_SECRET_KEY before production use."
  else
    warn ".env not found and no .env.example. Creating minimal default."
    cat > "${ENV_FILE}" <<'ENVEOF'
JWT_SECRET_KEY=dev-only-change-before-production
POSTGRES_USER=aca_o_user
POSTGRES_PASSWORD=aca_o_password
POSTGRES_DB=aca_o_db
INFLUXDB_TOKEN=dev-token-smart-irrigation
MQTT_USERNAME=
MQTT_PASSWORD=
DEVICE_API_KEYS=
DEVICE_FIELD_MAP=
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
ENVEOF
  fi
fi
success "Environment file: ${ENV_FILE}"

# Warn if JWT secret is still the default
JWT_KEY=$(grep -E '^JWT_SECRET_KEY=' "${ENV_FILE}" | cut -d= -f2- || true)
if [[ "$JWT_KEY" == "dev-only-change-before-production" || "$JWT_KEY" == "change-me-to-a-long-random-secret-key-in-production" ]]; then
  warn "JWT_SECRET_KEY is set to the default. Change it in ${ENV_FILE} for production."
fi

# ---------------------------------------------------------------------------
# Validate Mosquitto config
# ---------------------------------------------------------------------------
MOSQUITTO_CONF="${PROJECT_ROOT}/infrastructure/docker/mosquitto/mosquitto.conf"
if [[ ! -f "${MOSQUITTO_CONF}" ]]; then
  warn "mosquitto.conf not found at ${MOSQUITTO_CONF} — creating default."
  mkdir -p "$(dirname "${MOSQUITTO_CONF}")"
  cat > "${MOSQUITTO_CONF}" <<'MQTTEOF'
listener 1883 0.0.0.0
protocol mqtt
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest stdout
log_type all
connection_messages true
MQTTEOF
  success "Created default mosquitto.conf"
fi

# ---------------------------------------------------------------------------
# Build images
# ---------------------------------------------------------------------------
if ! $START_ONLY; then
  header "Building Docker images"
  info "This may take several minutes on first run (downloading base images + pip install)."

  SERVICES=(
    "config_server"
    "auth_service"
    "irrigation_service"
    "forecasting_service"
    "optimize_service"
    "iot_service"
    "crop_health_and_water_stress_detection"
    "gateway"
    "web"
  )

  cd "${PROJECT_ROOT}/infrastructure/docker"

  for svc in "${SERVICES[@]}"; do
    info "Building: ${svc}"
    if $DC --env-file "${ENV_FILE}" build --no-cache "${svc}" 2>&1; then
      success "Built: ${svc}"
    else
      error "Build failed for: ${svc}"
      error "Check the Dockerfile in the service directory and retry."
      exit 1
    fi
  done

  success "All images built successfully."
fi

# ---------------------------------------------------------------------------
# Start services
# ---------------------------------------------------------------------------
if ! $BUILD_ONLY; then
  header "Starting infrastructure services"
  cd "${PROJECT_ROOT}/infrastructure/docker"

  # Bring up infrastructure first and wait briefly so DBs are ready
  info "Starting databases and message broker..."
  $DC --env-file "${ENV_FILE}" up -d postgres redis influxdb mosquitto mongo

  info "Waiting 15 s for databases to initialise..."
  sleep 15

  header "Starting application services"
  $DC --env-file "${ENV_FILE}" up -d

  # ---------------------------------------------------------------------------
  # Health check polling
  # ---------------------------------------------------------------------------
  header "Waiting for services to become healthy"

  TIMEOUT=180
  INTERVAL=10
  ELAPSED=0

  declare -A PORTS=(
    ["config_server"]=8010
    ["auth_service"]=8001
    ["irrigation_service"]=8002
    ["forecasting_service"]=8003
    ["optimize_service"]=8004
    ["iot_service"]=8006
    ["crop_health_and_water_stress_detection"]=8007
    ["gateway"]=8000
  )

  ALL_HEALTHY=true
  for svc in "${!PORTS[@]}"; do
    port="${PORTS[$svc]}"
    ELAPSED=0
    printf "  Waiting for %-45s" "${svc} (:${port})"
    while true; do
      if curl -sf "http://localhost:${port}/health" -o /dev/null 2>/dev/null \
         || python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')" 2>/dev/null; then
        echo -e " ${GREEN}healthy${RESET}"
        break
      fi
      if [[ $ELAPSED -ge $TIMEOUT ]]; then
        echo -e " ${YELLOW}timeout (check logs)${RESET}"
        ALL_HEALTHY=false
        break
      fi
      printf "."
      sleep $INTERVAL
      ELAPSED=$((ELAPSED + INTERVAL))
    done
  done

  echo ""
  if $ALL_HEALTHY; then
    success "All services are healthy."
  else
    warn "Some services did not become healthy within ${TIMEOUT}s."
    warn "Run: $DC --env-file ${ENV_FILE} logs --tail=50 <service-name>"
  fi

  # ---------------------------------------------------------------------------
  # Status summary
  # ---------------------------------------------------------------------------
  header "Running containers"
  $DC --env-file "${ENV_FILE}" ps

  # ---------------------------------------------------------------------------
  # Access URLs
  # ---------------------------------------------------------------------------
  VM_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_VM_IP")
  echo ""
  echo -e "${BOLD}${GREEN}Deployment complete! Access the platform at:${RESET}"
  echo ""
  echo -e "  ${CYAN}Web Dashboard   ${RESET}  http://${VM_IP}:8005"
  echo -e "  ${CYAN}API Gateway     ${RESET}  http://${VM_IP}:8000"
  echo -e "  ${CYAN}API Docs        ${RESET}  http://${VM_IP}:8000/docs"
  echo -e "  ${CYAN}Auth Service    ${RESET}  http://${VM_IP}:8001"
  echo -e "  ${CYAN}Irrigation      ${RESET}  http://${VM_IP}:8002"
  echo -e "  ${CYAN}Forecasting     ${RESET}  http://${VM_IP}:8003"
  echo -e "  ${CYAN}Optimisation    ${RESET}  http://${VM_IP}:8004"
  echo -e "  ${CYAN}IoT Service     ${RESET}  http://${VM_IP}:8006"
  echo -e "  ${CYAN}Crop Health     ${RESET}  http://${VM_IP}:8007"
  echo -e "  ${CYAN}Grafana         ${RESET}  http://${VM_IP}:3001  (admin / admin)"
  echo -e "  ${CYAN}Prometheus      ${RESET}  http://${VM_IP}:9090"
  echo -e "  ${CYAN}InfluxDB        ${RESET}  http://${VM_IP}:8086"
  echo ""
  echo -e "${YELLOW}MQTT broker listening on port 1883 (TCP)${RESET}"
  echo ""

  if $TAIL_LOGS; then
    header "Tailing logs (Ctrl+C to stop)"
    $DC --env-file "${ENV_FILE}" logs -f
  fi
fi

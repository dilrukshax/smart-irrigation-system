#!/bin/bash
# Build all Docker images for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REGISTRY="${REGISTRY:-localhost:5000}"
TAG="${TAG:-latest}"

echo "Building all services..."

services=(
  "services/auth-service:auth-service"
  "services/irrigation-service:irrigation-service"
  "services/forecasting-service:forecasting-service"
  "services/optimization-service:optimization-service"
  "gateway:gateway"
  "web:web"
)

for service_info in "${services[@]}"; do
  IFS=':' read -r path name <<< "$service_info"
  echo "Building ${name}..."
  
  docker build \
    -t "${REGISTRY}/${name}:${TAG}" \
    -f "${PROJECT_ROOT}/${path}/Dockerfile" \
    "${PROJECT_ROOT}"
    
  echo "✓ Built ${name}"
done

echo ""
echo "All images built successfully!"
echo ""
echo "Images:"
for service_info in "${services[@]}"; do
  IFS=':' read -r path name <<< "$service_info"
  echo "  - ${REGISTRY}/${name}:${TAG}"
done

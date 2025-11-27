#!/bin/bash
# Deploy to Kubernetes cluster

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-dev}"

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
  echo "Usage: $0 <environment>"
  echo "  environment: dev, staging, or production"
  exit 1
fi

echo "Deploying to ${ENVIRONMENT}..."

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -k "${PROJECT_ROOT}/infrastructure/kubernetes/overlays/${ENVIRONMENT}"

# Wait for deployments
echo "Waiting for deployments to be ready..."

NAMESPACE="smart-irrigation-${ENVIRONMENT}"
if [ "$ENVIRONMENT" = "production" ]; then
  NAMESPACE="smart-irrigation-prod"
fi

PREFIX="${ENVIRONMENT}-"
if [ "$ENVIRONMENT" = "production" ]; then
  PREFIX="prod-"
fi

deployments=(
  "${PREFIX}auth-service"
  "${PREFIX}irrigation-service"
  "${PREFIX}forecasting-service"
  "${PREFIX}optimization-service"
)

for deployment in "${deployments[@]}"; do
  echo "Waiting for ${deployment}..."
  kubectl rollout status "deployment/${deployment}" -n "${NAMESPACE}" --timeout=300s
done

echo ""
echo "Deployment to ${ENVIRONMENT} complete!"
echo ""
echo "Service endpoints:"
kubectl get services -n "${NAMESPACE}"

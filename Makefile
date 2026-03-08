.PHONY: help build test lint deploy clean setup

# Default target
help:
	@echo "Smart Irrigation System - Makefile Commands"
	@echo ""
	@echo "Development:"
	@echo "  make setup          - Setup local development environment"
	@echo "  make dev            - Start all services in development mode"
	@echo "  make stop           - Stop all services"
	@echo ""
	@echo "Build:"
	@echo "  make build          - Build all Docker images"
	@echo "  make build-<svc>    - Build specific service (auth, irrigation, forecasting, optimize, iot, crop-health)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-<svc>     - Run tests for specific service"
	@echo "  make lint           - Run linting on all services"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-dev     - Deploy to development environment"
	@echo "  make deploy-prod    - Deploy to production environment"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Clean up build artifacts"
	@echo "  make logs           - View logs from all services"

# Variables
DOCKER_COMPOSE = docker compose -f infrastructure/docker/docker-compose.yml
REGISTRY ?= localhost:5000
TAG ?= latest

# Setup
setup:
	@./scripts/setup-local.sh

# Development
dev:
	$(DOCKER_COMPOSE) up -d

stop:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f

# Build
build:
	@./scripts/build-all.sh

build-auth:
	docker build -t $(REGISTRY)/auth-service:$(TAG) -f services/auth_service/Dockerfile .

build-irrigation:
	docker build -t $(REGISTRY)/irrigation-service:$(TAG) -f services/irrigation_service/Dockerfile .

build-forecasting:
	docker build -t $(REGISTRY)/forecasting-service:$(TAG) -f services/forecasting_service/Dockerfile .

build-optimize:
	docker build -t $(REGISTRY)/optimization-service:$(TAG) -f services/optimize_service/Dockerfile .

build-iot:
	docker build -t $(REGISTRY)/iot-service:$(TAG) -f services/iot_service/Dockerfile .

build-crop-health:
	docker build -t $(REGISTRY)/crop-health-service:$(TAG) -f services/crop_health_and_water_stress_detection/Dockerfile .

build-optimization: build-optimize

build-gateway:
	docker build -t $(REGISTRY)/gateway:$(TAG) -f gateway/Dockerfile .

build-web:
	docker build -t $(REGISTRY)/web:$(TAG) -f web/Dockerfile .

# Testing
test: test-auth test-irrigation test-forecasting test-optimize test-iot

test-auth:
	cd services/auth_service && python -m pytest tests/ -v

test-irrigation:
	cd services/irrigation_service && python -m pytest tests/ -v

test-forecasting:
	cd services/forecasting_service && python -m pytest tests/ -v

test-optimize:
	cd services/optimize_service && python -m pytest tests/ -v

test-iot:
	cd services/iot_service && python -m pytest tests/ -v

test-optimization: test-optimize

# Linting
lint: lint-auth lint-irrigation lint-forecasting lint-optimize lint-iot lint-crop-health

lint-auth:
	cd services/auth_service && ruff check app/

lint-irrigation:
	cd services/irrigation_service && ruff check app/

lint-forecasting:
	cd services/forecasting_service && ruff check app/

lint-optimize:
	cd services/optimize_service && ruff check app/

lint-iot:
	cd services/iot_service && ruff check app/

lint-crop-health:
	cd services/crop_health_and_water_stress_detection && ruff check app/

lint-optimization: lint-optimize

# Deployment
deploy-dev:
	@./scripts/deploy.sh dev

deploy-staging:
	@./scripts/deploy.sh staging

deploy-prod:
	@./scripts/deploy.sh production

# Infrastructure
infra-init:
	cd infrastructure/terraform && terraform init

infra-plan:
	cd infrastructure/terraform && terraform plan -var-file=environments/$(ENV)/terraform.tfvars

infra-apply:
	cd infrastructure/terraform && terraform apply -var-file=environments/$(ENV)/terraform.tfvars

# Clean
clean:
	docker system prune -f
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true

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
	@echo "  make build-<svc>    - Build specific service (auth, irrigation, forecasting, optimization)"
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
	docker build -t $(REGISTRY)/auth-service:$(TAG) -f services/auth-service/Dockerfile .

build-irrigation:
	docker build -t $(REGISTRY)/irrigation-service:$(TAG) -f services/irrigation-service/Dockerfile .

build-forecasting:
	docker build -t $(REGISTRY)/forecasting-service:$(TAG) -f services/forecasting-service/Dockerfile .

build-optimization:
	docker build -t $(REGISTRY)/optimization-service:$(TAG) -f services/optimization-service/Dockerfile .

build-gateway:
	docker build -t $(REGISTRY)/gateway:$(TAG) -f gateway/Dockerfile .

build-web:
	docker build -t $(REGISTRY)/web:$(TAG) -f web/Dockerfile .

# Testing
test: test-auth test-irrigation test-forecasting test-optimization

test-auth:
	cd services/auth-service && python -m pytest tests/ -v

test-irrigation:
	cd services/irrigation-service && python -m pytest tests/ -v

test-forecasting:
	cd services/forecasting-service && python -m pytest tests/ -v

test-optimization:
	cd services/optimization-service && python -m pytest tests/ -v

# Linting
lint: lint-auth lint-irrigation lint-forecasting lint-optimization

lint-auth:
	cd services/auth-service && ruff check src/

lint-irrigation:
	cd services/irrigation-service && ruff check src/

lint-forecasting:
	cd services/forecasting-service && ruff check src/

lint-optimization:
	cd services/optimization-service && ruff check src/

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

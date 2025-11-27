@echo off
REM Deploy to Kubernetes cluster

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

if not "%ENVIRONMENT%"=="dev" if not "%ENVIRONMENT%"=="staging" if not "%ENVIRONMENT%"=="production" (
    echo Usage: deploy.bat ^<environment^>
    echo   environment: dev, staging, or production
    exit /b 1
)

echo Deploying to %ENVIRONMENT%...

echo Applying Kubernetes manifests...
kubectl apply -k "infrastructure\kubernetes\overlays\%ENVIRONMENT%"

echo Waiting for deployments to be ready...

set NAMESPACE=smart-irrigation-%ENVIRONMENT%
if "%ENVIRONMENT%"=="production" set NAMESPACE=smart-irrigation-prod

set PREFIX=%ENVIRONMENT%-
if "%ENVIRONMENT%"=="production" set PREFIX=prod-

for %%d in (auth-service irrigation-service forecasting-service optimization-service) do (
    echo Waiting for %PREFIX%%%d...
    kubectl rollout status "deployment/%PREFIX%%%d" -n %NAMESPACE% --timeout=300s
)

echo.
echo Deployment to %ENVIRONMENT% complete!
echo.
echo Service endpoints:
kubectl get services -n %NAMESPACE%

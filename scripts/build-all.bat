@echo off
REM Build all Docker images for local development

setlocal enabledelayedexpansion

set REGISTRY=%REGISTRY%
if "%REGISTRY%"=="" set REGISTRY=localhost:5000

set TAG=%TAG%
if "%TAG%"=="" set TAG=latest

echo Building all services...

echo Building auth-service...
docker build -t %REGISTRY%/auth-service:%TAG% -f services/auth_service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built auth-service

echo Building irrigation-service...
docker build -t %REGISTRY%/irrigation-service:%TAG% -f services/irrigation_service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built irrigation-service

echo Building forecasting-service...
docker build -t %REGISTRY%/forecasting-service:%TAG% -f services/forecasting_service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built forecasting-service

echo Building optimization-service...
docker build -t %REGISTRY%/optimization-service:%TAG% -f services/optimize_service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built optimization-service

echo Building iot-service...
docker build -t %REGISTRY%/iot-service:%TAG% -f services/iot_service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built iot-service

echo Building crop-health-service...
docker build -t %REGISTRY%/crop-health-service:%TAG% -f services/crop_health_and_water_stress_detection/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built crop-health-service

echo Building gateway...
docker build -t %REGISTRY%/gateway:%TAG% -f gateway/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built gateway

echo Building web...
docker build -t %REGISTRY%/web:%TAG% -f web/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built web

echo.
echo All images built successfully!
echo.
echo Images:
echo   - %REGISTRY%/auth-service:%TAG%
echo   - %REGISTRY%/irrigation-service:%TAG%
echo   - %REGISTRY%/forecasting-service:%TAG%
echo   - %REGISTRY%/optimization-service:%TAG%
echo   - %REGISTRY%/iot-service:%TAG%
echo   - %REGISTRY%/crop-health-service:%TAG%
echo   - %REGISTRY%/gateway:%TAG%
echo   - %REGISTRY%/web:%TAG%

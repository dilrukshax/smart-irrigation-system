@echo off
REM Build all Docker images for local development

setlocal enabledelayedexpansion

set REGISTRY=%REGISTRY%
if "%REGISTRY%"=="" set REGISTRY=localhost:5000

set TAG=%TAG%
if "%TAG%"=="" set TAG=latest

echo Building all services...

echo Building auth-service...
docker build -t %REGISTRY%/auth-service:%TAG% -f services/auth-service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built auth-service

echo Building irrigation-service...
docker build -t %REGISTRY%/irrigation-service:%TAG% -f services/irrigation-service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built irrigation-service

echo Building forecasting-service...
docker build -t %REGISTRY%/forecasting-service:%TAG% -f services/forecasting-service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built forecasting-service

echo Building optimization-service...
docker build -t %REGISTRY%/optimization-service:%TAG% -f services/optimization-service/Dockerfile .
if %errorlevel% neq 0 exit /b %errorlevel%
echo [OK] Built optimization-service

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
echo   - %REGISTRY%/gateway:%TAG%
echo   - %REGISTRY%/web:%TAG%

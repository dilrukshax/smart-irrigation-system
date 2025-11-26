@echo off
echo.
echo ========================================
echo   Smart Irrigation System Quick Start
echo ========================================
echo.

REM Check if Docker is running
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not running
    echo Please install Docker Desktop and start it
    pause
    exit /b 1
)

echo ✅ Docker is available

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not available
    echo Please ensure Docker Compose is installed
    pause
    exit /b 1
)

echo ✅ Docker Compose is available
echo.

echo 🏗️  Building and starting Smart Irrigation System...
echo This may take a few minutes on first run...
echo.

REM Build and start all services
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start services
    echo Check Docker Desktop and try again
    pause
    exit /b 1
)

echo.
echo ✅ Services are starting up...
echo.

REM Wait a bit for services to initialize
echo ⏳ Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo 🌐 Services should now be available at:
echo   • Irrigation Service:      http://localhost:5001
echo   • Sediment Mapping:        http://localhost:5002  
echo   • Forecasting Service:     http://localhost:5003
echo.

echo 🔍 Testing service health...
echo.

REM Test if services are responding
curl -s http://localhost:5001/status >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Irrigation Service: OK
) else (
    echo ⏳ Irrigation Service: Still starting...
)

curl -s http://localhost:5002/status >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Sediment Mapping Service: OK
) else (
    echo ⏳ Sediment Mapping Service: Still starting...
)

curl -s http://localhost:5003/status >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Forecasting Service: OK
) else (
    echo ⏳ Forecasting Service: Still starting...
)

echo.
echo 📖 Quick Test Commands:
echo   • Get sensor data:         curl http://localhost:5001/sensor-data
echo   • Collect sediment data:   curl http://localhost:5002/collect-data
echo   • Get weather forecast:    curl http://localhost:5003/forecast
echo   • Check risk assessment:   curl http://localhost:5003/risk-assessment
echo.

echo 📊 To view logs: docker-compose logs -f
echo 🛑 To stop services: docker-compose down
echo 📋 To run health check: python health_check.py
echo.

echo 🎉 Smart Irrigation System is ready!
echo Press any key to continue...
pause >nul

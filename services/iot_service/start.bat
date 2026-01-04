@echo off
REM Start IoT Service locally for development

echo ========================================
echo Starting IoT Telemetry Service
echo ========================================

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q

REM Set default environment variables if not set
if "%INFLUXDB_URL%"=="" set INFLUXDB_URL=http://localhost:8086
if "%MQTT_BROKER%"=="" set MQTT_BROKER=localhost
if "%MQTT_PORT%"=="" set MQTT_PORT=1883
if "%INFLUXDB_ORG%"=="" set INFLUXDB_ORG=smart-irrigation
if "%INFLUXDB_BUCKET%"=="" set INFLUXDB_BUCKET=sensors

echo.
echo Environment:
echo   INFLUXDB_URL: %INFLUXDB_URL%
echo   MQTT_BROKER: %MQTT_BROKER%:%MQTT_PORT%
echo.

REM Start the service
echo Starting service on http://localhost:8006
echo API Docs: http://localhost:8006/docs
echo.
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8006

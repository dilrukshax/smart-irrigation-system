# ============================================================
# Smart Irrigation System - Start All Services (No Docker)
# ============================================================
# Services started:
#   MQTT Broker  (amqtt)      : port 1883
#   Gateway      (FastAPI)    : port 8000
#   Auth Service              : port 8001
#   Irrigation Service        : port 8002
#   Forecasting Service       : port 8003
#   Optimize Service (ACA-O)  : port 8004
#   Web Frontend  (Vite)      : port 8005
#   IoT Service               : port 8006
#   Crop Health Service       : port 8007
# ============================================================

$Root = $PSScriptRoot

function Start-Service {
  param(
    [string]$Title,
    [string]$WorkDir,
    [string]$Command
  )
  Write-Host "Starting $Title ..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkDir'; $Command" -WindowStyle Normal
  Start-Sleep -Milliseconds 500
}

# ------------------------------------------------------------------
# 1. MQTT Broker (amqtt) - required by IoT Service
# ------------------------------------------------------------------
$amqtt = "$Root\services\iot_service\venv\Scripts\amqtt.exe"
if (Test-Path $amqtt) {
  Write-Host "Starting MQTT Broker (amqtt) on port 1883 ..." -ForegroundColor Cyan
  Start-Process $amqtt -WindowStyle Minimized
}
else {
  Write-Host "WARNING: amqtt not found at $amqtt" -ForegroundColor Yellow
  Write-Host "  Install with: pip install amqtt" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ------------------------------------------------------------------
# 2. API Gateway (Python FastAPI) - port 8000
# ------------------------------------------------------------------
$gwVenv = "$Root\gateway\venv\Scripts\uvicorn.exe"
if (Test-Path $gwVenv) {
  Start-Service -Title "API Gateway (port 8000)" `
    -WorkDir "$Root\gateway" `
    -Command ".\venv\Scripts\uvicorn.exe gateway:app --host 0.0.0.0 --port 8000 --reload"
}
else {
  Write-Host "WARNING: Gateway venv not found. Setting up..." -ForegroundColor Yellow
  Start-Service -Title "API Gateway Setup + Start (port 8000)" `
    -WorkDir "$Root\gateway" `
    -Command "python -m venv venv; .\venv\Scripts\pip install -r requirements.txt; .\venv\Scripts\uvicorn.exe gateway:app --host 0.0.0.0 --port 8000 --reload"
}

# ------------------------------------------------------------------
# 3. Auth Service - port 8001
# ------------------------------------------------------------------
Start-Service -Title "Auth Service (port 8001)" `
  -WorkDir "$Root\services\auth_service" `
  -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001 --reload"

# ------------------------------------------------------------------
# 4. Irrigation Service - port 8002
# ------------------------------------------------------------------
Start-Service -Title "Irrigation Service (port 8002)" `
  -WorkDir "$Root\services\irrigation_service" `
  -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8002 --reload"

# ------------------------------------------------------------------
# 5. Forecasting Service - port 8003
# ------------------------------------------------------------------
Start-Service -Title "Forecasting Service (port 8003)" `
  -WorkDir "$Root\services\forecasting_service" `
  -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8003 --reload"

# ------------------------------------------------------------------
# 6. Optimize Service (ACA-O) - port 8004
# ------------------------------------------------------------------
Start-Service -Title "Optimize Service / ACA-O (port 8004)" `
  -WorkDir "$Root\services\optimize_service" `
  -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8004 --reload"

# ------------------------------------------------------------------
# 7. IoT Service - port 8006
# ------------------------------------------------------------------
Start-Service -Title "IoT Service (port 8006)" `
  -WorkDir "$Root\services\iot_service" `
  -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8006 --reload"

# ------------------------------------------------------------------
# 8. Crop Health Service - port 8007
# (TensorFlow required - first run will be slow if not installed)
# ------------------------------------------------------------------
$cropVenv = "$Root\services\crop_health_and_water_stress_detection\venv"
if (Test-Path "$cropVenv\Scripts\uvicorn.exe") {
  Start-Service -Title "Crop Health Service (port 8007)" `
    -WorkDir "$Root\services\crop_health_and_water_stress_detection" `
    -Command ".\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8007 --reload"
}
else {
  Write-Host "Setting up Crop Health Service venv (TensorFlow install may take a while)..." -ForegroundColor Yellow
  Start-Service -Title "Crop Health Service Setup + Start (port 8007)" `
    -WorkDir "$Root\services\crop_health_and_water_stress_detection" `
    -Command "python -m venv venv; .\venv\Scripts\pip install --upgrade pip; .\venv\Scripts\pip install -r requirements.txt; .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8007 --reload"
}

# ------------------------------------------------------------------
# 9. Web Frontend (Vite) - port 8005
# ------------------------------------------------------------------
$webNodeModules = "$Root\web\node_modules"
if (Test-Path $webNodeModules) {
  Start-Service -Title "Web Frontend (port 8005)" `
    -WorkDir "$Root\web" `
    -Command "npm run dev"
}
else {
  Write-Host "Installing web dependencies first..." -ForegroundColor Yellow
  Start-Service -Title "Web Frontend Setup + Start (port 8005)" `
    -WorkDir "$Root\web" `
    -Command "npm install; npm run dev"
}

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Smart Irrigation System - All Services Starting!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  MQTT Broker    : mqtt://localhost:1883" -ForegroundColor White
Write-Host "  API Gateway    : http://localhost:8000  /docs" -ForegroundColor White
Write-Host "  Auth Service   : http://localhost:8001  /docs" -ForegroundColor White
Write-Host "  Irrigation     : http://localhost:8002  /docs" -ForegroundColor White
Write-Host "  Forecasting    : http://localhost:8003  /docs" -ForegroundColor White
Write-Host "  Optimize/ACA-O : http://localhost:8004  /docs" -ForegroundColor White
Write-Host "  Web Frontend   : http://localhost:8005" -ForegroundColor White
Write-Host "  IoT Service    : http://localhost:8006  /docs" -ForegroundColor White
Write-Host "  Crop Health    : http://localhost:8007  /docs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Each service opened in its own PowerShell window." -ForegroundColor Cyan
Write-Host "Close individual windows to stop specific services." -ForegroundColor Cyan

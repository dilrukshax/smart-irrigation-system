@echo off
REM Setup local development environment for Windows

echo Setting up local development environment...
echo.

REM Check prerequisites
echo Checking prerequisites...

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Docker is not installed
    exit /b 1
) else (
    echo [OK] Docker is installed
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python is not installed
    exit /b 1
) else (
    echo [OK] Python is installed
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed
    exit /b 1
) else (
    echo [OK] Node.js is installed
)

echo.
echo Setting up environment files...

if not exist "infrastructure\docker\.env" (
    copy "infrastructure\docker\.env.example" "infrastructure\docker\.env"
    echo [OK] Created .env file - please update with your values
) else (
    echo [OK] .env file already exists
)

echo.
echo Setting up Python virtual environments...

for %%s in (auth-service irrigation-service forecasting-service optimization-service) do (
    if exist "services\%%s\requirements.txt" (
        echo Setting up services\%%s...
        if not exist "services\%%s\venv" (
            python -m venv "services\%%s\venv"
        )
        call "services\%%s\venv\Scripts\activate.bat"
        pip install -q -r "services\%%s\requirements.txt"
        call deactivate
        echo [OK] services\%%s environment ready
    )
)

echo.
echo Setting up frontend...
cd frontend
call npm install
cd ..
echo [OK] Frontend dependencies installed

echo.
echo Starting infrastructure services...
cd infrastructure\docker
docker compose up -d mongodb postgres redis
cd ..\..

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ============================================
echo Local development environment is ready!
echo ============================================
echo.
echo To start all services with Docker Compose:
echo   cd infrastructure\docker ^&^& docker compose up
echo.
echo To start individual services for development:
echo   cd services\auth-service
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload --port 8001
echo.
echo To start the frontend:
echo   cd frontend ^&^& npm run dev
echo.

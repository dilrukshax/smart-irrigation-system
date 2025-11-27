@echo off
echo Starting Auth Service...
cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run the service
echo Starting the service on port 8001...
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

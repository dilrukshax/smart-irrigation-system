@echo off
echo ========================================
echo Starting Forecasting Service
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Check if pydantic is working
echo Checking dependencies...
python -c "from app.ml import ADVANCED_ML_AVAILABLE; print('Advanced ML Available:', ADVANCED_ML_AVAILABLE)" 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Dependencies not properly installed!
    echo.
    echo Run one of these first:
    echo   1. fix-windows-install.bat  ^(automatic fix^)
    echo   2. pip install -r requirements-basic.txt  ^(basic ML only^)
    echo   3. pip install -r requirements.txt  ^(full ML with TensorFlow^)
    echo.
    pause
    exit /b 1
)

echo.
echo Starting service on http://localhost:8003...
echo.
echo [TIP] If you see multiprocessing errors, press Ctrl+C and run:
echo       uvicorn app.main:app --port 8003 --no-reload
echo.

REM Start service with reload
uvicorn app.main:app --reload --port 8003

pause

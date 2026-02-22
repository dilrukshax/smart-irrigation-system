@echo off
REM Fix Windows Installation Issues for Forecasting Service
echo.
echo ====================================================
echo   Forecasting Service - Windows Installation Fix
echo ====================================================
echo.

REM Step 1: Clean up
echo [1/7] Cleaning up old environment...
if exist venv (
    rmdir /s /q venv
    echo    - Removed old venv
)

REM Step 2: Create fresh venv
echo.
echo [2/7] Creating fresh virtual environment...
python -m venv venv
call venv\Scripts\activate.bat
echo    - Virtual environment created

REM Step 3: Upgrade pip
echo.
echo [3/7] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo    - pip upgraded

REM Step 4: Install core packages
echo.
echo [4/7] Installing core packages...
pip install --no-cache-dir fastapi uvicorn[standard] --quiet
pip install --no-cache-dir pydantic==2.12.5 pydantic-settings==2.12.0 python-dotenv --quiet
echo    - Core packages installed

REM Step 5: Install data science packages
echo.
echo [5/7] Installing data science packages...
pip install --no-cache-dir numpy pandas scikit-learn --quiet
pip install --no-cache-dir statsmodels matplotlib seaborn plotly --quiet
echo    - Data science packages installed

REM Step 6: Try to install TensorFlow
echo.
echo [6/7] Installing TensorFlow (may take a while)...
pip install --no-cache-dir tensorflow 2>nul
if %errorlevel% equ 0 (
    echo    - TensorFlow installed successfully
) else (
    echo    - TensorFlow installation skipped (not critical)
    echo    - Service will work without LSTM model
)

REM Step 7: Install remaining packages
echo.
echo [7/7] Installing remaining packages...
pip install --no-cache-dir requests httpx pytest pytest-asyncio --quiet
echo    - Remaining packages installed

echo.
echo ====================================================
echo   Installation Complete!
echo ====================================================
echo.
echo To start the service, run:
echo   uvicorn app.main:app --reload --port 8002
echo.
echo Or check WINDOWS_SETUP.md for more options.
echo.
pause

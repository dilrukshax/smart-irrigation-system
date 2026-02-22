@echo off
echo ========================================
echo Fixing Pydantic Installation
echo ========================================
echo.

echo This will fix the pydantic_core import error
echo.
pause

echo Activating virtual environment...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo Virtual environment activated
) else (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)
echo.

echo Step 1: Uninstalling corrupted pydantic packages...
pip uninstall -y pydantic pydantic-core pydantic-settings
echo.

echo Step 2: Clearing pip cache...
pip cache purge
echo.

echo Step 3: Reinstalling pydantic with no cache...
pip install --no-cache-dir pydantic==2.12.5
pip install --no-cache-dir pydantic-core==2.41.5
pip install --no-cache-dir pydantic-settings==2.12.0
echo.

echo ========================================
echo Testing pydantic import...
echo ========================================
python -c "import pydantic; print(f'Pydantic {pydantic.__version__} works!')"
if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Pydantic is now working.
    echo You can now start the service with:
    echo   uvicorn app.main:app --reload --port 8003
) else (
    echo.
    echo ERROR: Still having issues.
    echo Try running: fix-windows-install.bat
)
echo.
pause

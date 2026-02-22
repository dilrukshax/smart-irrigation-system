@echo off
echo ============================================================
echo Database Setup for F4 Optimize Service
echo ============================================================
echo.

echo Step 1: Installing psycopg2-binary...
pip install psycopg2-binary
echo.

echo Step 2: Running database setup script...
python setup_database.py
echo.

echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo Next step: Restart your backend
echo Command: uvicorn app.main:app --reload --port 8004
echo.
pause

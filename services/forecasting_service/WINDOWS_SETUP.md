# Windows Setup Guide - Forecasting Service

## Known Issues & Solutions

### Issue 1: TensorFlow Installation Failure (Long Path)

**Error**: `OSError: [Errno 2] No such file or directory` with very long TensorFlow paths

**Solution**: Windows has a 260 character path limit. Use one of these approaches:

#### Option A: Enable Long Paths (Recommended)

1. **Open Registry Editor** (Win + R, type `regedit`)
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Set `LongPathsEnabled` to `1`
4. Restart your computer

OR via PowerShell (Run as Administrator):
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

#### Option B: Install TensorFlow Separately with --no-cache-dir

```powershell
# Delete venv and start fresh
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\activate

# Install without TensorFlow first
pip install fastapi uvicorn[standard] pydantic pydantic-settings python-dotenv
pip install numpy pandas scikit-learn statsmodels matplotlib seaborn plotly
pip install requests httpx pytest pytest-asyncio

# Install TensorFlow separately with no cache
pip install --no-cache-dir tensorflow
```

#### Option C: Use Shorter Path

Move project to a shorter path:
```powershell
# Move to C:\projects\irrigation (much shorter!)
mkdir C:\projects
cd C:\projects
git clone [your-repo] irrigation
cd irrigation\services\forecasting_service
```

### Issue 2: pydantic_core Binary Module Error

**Error**: `ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'`

**Solution**: Reinstall pydantic packages with binary wheel:

```powershell
# Activate venv
.\venv\Scripts\activate

# Uninstall pydantic packages
pip uninstall -y pydantic pydantic-core pydantic-settings

# Reinstall with no cache
pip install --no-cache-dir pydantic==2.12.5
pip install --no-cache-dir pydantic-settings==2.12.0
```

## Quick Fix Script (Run in PowerShell)

Save this as `fix-windows-install.ps1`:

```powershell
# Fix Windows Installation Issues
Write-Host "🔧 Fixing Windows Installation Issues..." -ForegroundColor Cyan

# Step 1: Clean up
Write-Host "`n1. Cleaning up old environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Remove-Item -Recurse -Force venv
    Write-Host "   ✓ Removed old venv" -ForegroundColor Green
}

# Step 2: Create fresh venv
Write-Host "`n2. Creating fresh virtual environment..." -ForegroundColor Yellow
python -m venv venv
.\venv\Scripts\activate
Write-Host "   ✓ Virtual environment created" -ForegroundColor Green

# Step 3: Upgrade pip
Write-Host "`n3. Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip
Write-Host "   ✓ pip upgraded" -ForegroundColor Green

# Step 4: Install core packages first
Write-Host "`n4. Installing core packages..." -ForegroundColor Yellow
pip install --no-cache-dir fastapi uvicorn[standard]
pip install --no-cache-dir pydantic==2.12.5 pydantic-settings==2.12.0 python-dotenv
Write-Host "   ✓ Core packages installed" -ForegroundColor Green

# Step 5: Install data science packages
Write-Host "`n5. Installing data science packages..." -ForegroundColor Yellow
pip install --no-cache-dir numpy pandas scikit-learn
pip install --no-cache-dir statsmodels matplotlib seaborn plotly
Write-Host "   ✓ Data science packages installed" -ForegroundColor Green

# Step 6: Install TensorFlow (with error handling)
Write-Host "`n6. Installing TensorFlow (this may take a while)..." -ForegroundColor Yellow
try {
    pip install --no-cache-dir tensorflow==2.20.0
    Write-Host "   ✓ TensorFlow installed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ TensorFlow installation failed (not critical)" -ForegroundColor Yellow
    Write-Host "   The service will work without LSTM model" -ForegroundColor Yellow
}

# Step 7: Install remaining packages
Write-Host "`n7. Installing remaining packages..." -ForegroundColor Yellow
pip install --no-cache-dir requests httpx pytest pytest-asyncio
Write-Host "   ✓ Remaining packages installed" -ForegroundColor Green

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
Write-Host "`nTo start the service, run:" -ForegroundColor Cyan
Write-Host "  uvicorn app.main:app --reload --port 8002" -ForegroundColor White
```

Run it:
```powershell
cd services\forecasting_service
.\fix-windows-install.ps1
```

## Alternative: Use Without TensorFlow

If TensorFlow continues to fail, you can run the service without LSTM models:

1. **Create `requirements-minimal.txt`:**
```txt
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
python-dotenv>=1.0.0

# Data Processing
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0

# Basic ML (no TensorFlow)
statsmodels>=0.14.0

# Visualization
matplotlib>=3.7.0
seaborn>=0.12.0
plotly>=5.18.0

# HTTP
requests>=2.31.0
httpx>=0.25.0

# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
```

2. **Install minimal requirements:**
```powershell
pip install -r requirements-minimal.txt
```

3. **Comment out LSTM in `advanced_forecasting.py`:**
The service will automatically skip LSTM training if TensorFlow is not available.

## Starting the Service

After successful installation:

```powershell
# Activate environment
.\venv\Scripts\activate

# Verify installation
python -c "import fastapi, pydantic, numpy, pandas; print('✓ Core packages OK')"

# Start service
uvicorn app.main:app --reload --port 8002

# Or use the correct port from architecture
uvicorn app.main:app --reload --port 8003
```

## Troubleshooting

### Service won't start - Import errors

```powershell
# Check Python version
python --version  # Should be 3.11+

# Verify all imports
python -c "import app.main"
```

### pydantic_core still missing

```powershell
# Nuclear option - completely reinstall
pip uninstall -y pydantic pydantic-core pydantic-settings annotated-types typing-extensions
pip cache purge
pip install --no-cache-dir --force-reinstall pydantic==2.12.5
```

### Check installed packages

```powershell
pip list | Select-String -Pattern "pydantic|fastapi|tensorflow"
```

## Port Configuration

According to the project architecture:
- **Development**: Port 8002 or 8003 (check main README)
- **Gateway Route**: `/api/v1/forecast/*`
- **Direct Access**: `http://localhost:8002` or `http://localhost:8003`

Check `app/core/config.py` for the configured port.

## Success Indicators

You should see:
```
INFO:     Will watch for changes in these directories: ['C:\\documents\\Research_Project\\...']
INFO:     Uvicorn running on http://127.0.0.1:8002 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXX] using StatReload
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
2026-01-03 XX:XX:XX INFO     Starting Forecasting Service v2.0.0
2026-01-03 XX:XX:XX INFO     Environment: development
2026-01-03 XX:XX:XX INFO     Forecasting system initialized with historical data
INFO:     Application startup complete.
```

## API Test

After starting:
```powershell
# Test basic endpoint
curl http://localhost:8002/health

# Test advanced status
curl http://localhost:8002/api/v2/status

# Train models
curl -X POST http://localhost:8002/api/v2/train
```

## Note on Service Ports

The main README shows:
- Port 8002: Irrigation Service
- Port 8003: Forecasting Service

If you see conflicts, check which services are running:
```powershell
netstat -ano | findstr ":8002"
netstat -ano | findstr ":8003"
```

# Windows Installation Fix Guide

## Common Issues on Windows

### Issue 1: TensorFlow Path Length Error
**Error**: `OSError: [Errno 2] No such file or directory: 'C:\\...\\tensorflow\\include\\external\\com_github_grpc_grpc\\...`

**Cause**: Windows has a 260-character path limit, and TensorFlow's deep directory structure exceeds this.

**Solutions**:

#### Option A: Use TensorFlow-CPU (Recommended)
```powershell
pip uninstall tensorflow
pip install --no-cache-dir tensorflow-cpu
```

#### Option B: Enable Long Paths in Windows 10/11
1. Open Registry Editor (Win+R, type `regedit`)
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Set `LongPathsEnabled` to `1`
4. Restart computer
5. Retry installation

#### Option C: Run Without TensorFlow (Basic ML Only)
```powershell
pip install -r requirements-basic.txt
```
This installs everything except TensorFlow. You'll still have Random Forest and Gradient Boosting models.

### Issue 2: Pydantic Core Import Error
**Error**: `ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'`

**Cause**: Corrupted pydantic installation during previous attempts.

**Fix**:
```powershell
pip uninstall -y pydantic pydantic-core
pip install --no-cache-dir pydantic==2.12.5 pydantic-core==2.41.5
```

## Automated Fix Script

### Quick Fix (Recommended)
```powershell
# Run the automated fix script
.\fix-windows-install.bat
```

This script will:
1. Clean corrupted packages
2. Upgrade pip
3. Reinstall pydantic correctly
4. Install TensorFlow-CPU (shorter paths)
5. Install remaining dependencies

### Manual Fix Steps

#### 1. Clean Install
```powershell
# Delete virtual environment
rmdir /s /q venv

# Create new virtual environment
python -m venv venv
.\venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip
```

#### 2. Install Core Dependencies First
```powershell
# Install pydantic correctly
pip install --no-cache-dir pydantic==2.12.5 pydantic-core==2.41.5

# Install FastAPI
pip install --no-cache-dir fastapi uvicorn[standard]
```

#### 3. Choose Installation Method

**Method A: With TensorFlow (Full ML)**
```powershell
pip install --no-cache-dir tensorflow-cpu
pip install --no-cache-dir -r requirements.txt
```

**Method B: Without TensorFlow (Basic ML)**
```powershell
pip install --no-cache-dir -r requirements-basic.txt
```

## Running the Service

### Check Installation
```powershell
# Verify imports work
python -c "from app.ml import ADVANCED_ML_AVAILABLE; print(f'Advanced ML: {ADVANCED_ML_AVAILABLE}')"
```

### Start Service
```powershell
# With auto-reload (development)
uvicorn app.main:app --reload --port 8003

# Without reload (if multiprocessing issues)
uvicorn app.main:app --port 8003 --no-reload
```

### Test API
```powershell
# Open browser to:
# http://localhost:8003/docs
```

## Feature Availability

### Basic Installation (No TensorFlow)
✅ Basic forecasting (linear regression)
✅ Random Forest
✅ Gradient Boosting
✅ Quantile regression
❌ LSTM neural network

### Full Installation (With TensorFlow)
✅ All basic features
✅ LSTM neural network
✅ Complete feature set

## Troubleshooting

### Service Won't Start
**Error**: `ModuleNotFoundError` or import errors

**Fix**:
```powershell
# Check what's missing
python -c "import app.main"

# Reinstall specific package
pip install --no-cache-dir --force-reinstall <package-name>
```

### Port Already in Use
**Error**: `[Errno 10048] Only one usage of each socket address`

**Fix**:
```powershell
# Find process using port 8003
netstat -ano | findstr :8003

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or use different port
uvicorn app.main:app --reload --port 8004
```

### Multiprocessing Issues
**Error**: Process spawn errors on Windows

**Fix**:
```powershell
# Run without reload
uvicorn app.main:app --port 8003 --workers 1 --no-reload
```

### Import Errors After Installation
**Error**: Various import errors

**Fix**:
```powershell
# Clear Python cache
python -c "import shutil; shutil.rmtree('__pycache__', ignore_errors=True)"
python -c "import shutil; shutil.rmtree('app/__pycache__', ignore_errors=True)"

# Restart terminal
# Try again
```

## Alternative: Use Docker (Recommended for Complex Setups)

If Windows issues persist, use Docker:

```powershell
# Build Docker image
docker build -t forecasting-service .

# Run container
docker run -p 8003:8003 forecasting-service
```

## System Requirements

- **Windows 10/11** (64-bit)
- **Python 3.11+**
- **8GB+ RAM** (for ML models)
- **4GB+ free disk space**
- **Administrator rights** (for long path registry change)

## Quick Command Reference

```powershell
# Automated fix
.\fix-windows-install.bat

# Manual basic install
pip install -r requirements-basic.txt

# Manual full install
pip install --no-cache-dir tensorflow-cpu
pip install -r requirements.txt

# Start service
uvicorn app.main:app --reload --port 8003

# Test
curl http://localhost:8003/api/v1/status
```

## Support

If issues persist:
1. Check logs in terminal output
2. Try `requirements-basic.txt` (without TensorFlow)
3. Use Docker instead
4. Check [GitHub Issues](https://github.com/tensorflow/tensorflow/issues) for TensorFlow-specific problems

---

**Last Updated**: January 3, 2026

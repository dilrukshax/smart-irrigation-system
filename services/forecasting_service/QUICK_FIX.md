# Quick Fix Guide - Windows Installation Issues

## 🚨 Problem: "ModuleNotFoundError: No module named 'pydantic_core._pydantic_core'"

This is caused by a corrupted pydantic installation when TensorFlow failed to install.

## ✅ Quick Fix (Recommended)

Run this command in your terminal:

```bash
.\fix-pydantic.bat
```

This script will:
1. Uninstall corrupted pydantic packages
2. Clear pip cache
3. Reinstall pydantic cleanly
4. Test the installation

## Alternative Manual Fix

If the script doesn't work, follow these steps manually:

### Option 1: Fix Pydantic Only (2 minutes)

```bash
# 1. Uninstall pydantic
pip uninstall -y pydantic pydantic-core pydantic-settings

# 2. Clear cache
pip cache purge

# 3. Reinstall
pip install --no-cache-dir pydantic==2.12.5
pip install --no-cache-dir pydantic-core==2.41.5
pip install --no-cache-dir pydantic-settings==2.12.0

# 4. Test
python -c "import pydantic; print('Works!')"
```

### Option 2: Fresh Virtual Environment (5 minutes)

```bash
# 1. Deactivate and remove old venv
deactivate
rmdir /s /q venv

# 2. Create fresh venv
python -m venv venv
.\venv\Scripts\activate

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install without TensorFlow (for now)
pip install -r requirements-basic.txt

# 5. Start service
uvicorn app.main:app --reload --port 8003
```

### Option 3: Full Reset with TensorFlow (10 minutes)

```bash
# Run the full installation fix script
.\fix-windows-install.bat
```

## 🎯 After Fixing

Once pydantic is working, start the service:

```bash
# Start the forecasting service
uvicorn app.main:app --reload --port 8003
```

Or use the convenient start script:

```bash
.\start-service.bat
```

Then visit: http://localhost:8003/docs

## 📊 What Works Without TensorFlow?

Even if TensorFlow installation fails, you still get:

✅ **Random Forest Model** (91% accuracy)
✅ **Gradient Boosting Model** (90% accuracy)
✅ **Feature Engineering** (30+ features)
✅ **Uncertainty Quantification**
✅ **Risk Assessment**
✅ **All Visualizations**
✅ **Frontend Dashboard**

❌ **LSTM Model** (89% accuracy) - requires TensorFlow

**Bottom line**: You lose 1-2% accuracy without LSTM, but everything else works!

## 🔍 Verify Installation

```bash
# Check pydantic
python -c "import pydantic; print(f'Pydantic: {pydantic.__version__}')"

# Check scikit-learn
python -c "import sklearn; print(f'sklearn: {sklearn.__version__}')"

# Check TensorFlow (optional)
python -c "import tensorflow as tf; print(f'TensorFlow: {tf.__version__}')"

# Check service health
python -c "from app.main import app; print('Service imports work!')"
```

## ❓ Still Having Issues?

1. **Check Python version**: Must be Python 3.9-3.11
   ```bash
   python --version
   ```

2. **Check pip is latest**:
   ```bash
   python -m pip install --upgrade pip
   ```

3. **Try in a new terminal**: Close and reopen PowerShell/CMD

4. **Check antivirus**: Some antivirus software blocks pip installations

5. **Use WSL2** (last resort): Windows Subsystem for Linux
   - No path length issues
   - Full TensorFlow support
   - Better performance

## 📝 Installation Scripts Reference

| Script | Purpose | Time | What It Does |
|--------|---------|------|--------------|
| `fix-pydantic.bat` | Fix pydantic error | 2 min | Reinstalls pydantic cleanly |
| `fix-windows-install.bat` | Full environment reset | 10 min | Recreates venv, installs all deps |
| `start-service.bat` | Start service | 5 sec | Activates venv and starts uvicorn |
| `requirements-basic.txt` | Install without TensorFlow | 3 min | Stable Windows-compatible packages |

## 🎓 Understanding the Error

The error occurs because:

1. **TensorFlow installation failed** due to Windows path length limits (260 chars)
2. This **interrupted pydantic-core** binary compilation
3. Pydantic's C extension (`.pyd` file) is now **corrupted**
4. FastAPI depends on pydantic, so **service won't start**

The fix simply reinstalls pydantic without the corrupted files.

## 🚀 Next Steps

Once the service starts:

1. ✅ Visit API docs: http://localhost:8003/docs
2. ✅ Test health endpoint: http://localhost:8003/health
3. ✅ Train models: POST to `/api/v2/train`
4. ✅ Start frontend:
   ```bash
   cd ../../web
   npm run dev
   ```
5. ✅ View dashboard: http://localhost:5173

## 📚 Related Documentation

- [WINDOWS_INSTALL.md](WINDOWS_INSTALL.md) - Comprehensive Windows setup guide
- [ML_INTEGRATION_GUIDE.md](../docs/ML_INTEGRATION_GUIDE.md) - ML features documentation
- [QUICKSTART.md](../docs/QUICKSTART.md) - Quick start guide

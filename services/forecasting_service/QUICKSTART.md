# Forecasting Service - Quick Start

## 🚀 Start the Enhanced ML Forecasting Service

### Option 1: Development Mode (Recommended)

```bash
cd services/forecasting_service

# Install dependencies (if not done)
pip install -r requirements.txt

# Run with auto-reload
python -m app.main

# Or with uvicorn
uvicorn app.main:app --reload --port 8002
```

### Option 2: Production Mode

```bash
cd services/forecasting_service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4
```

## 📊 Train ML Models (First Time)

After starting the service, train the ML models:

```bash
# Using curl
curl -X POST http://localhost:8002/api/v2/train

# Using Python
python -c "import requests; print(requests.post('http://localhost:8002/api/v2/train').json())"
```

Expected output:
```json
{
  "status": "success",
  "message": "All models trained successfully",
  "data_points": 720,
  "models_trained": ["Random Forest", "Gradient Boosting", "LSTM"],
  "best_model": "Random Forest",
  "training_time": 1735931234.567
}
```

## 🔍 Test the API

### Get ML Forecast (72 hours)
```bash
curl "http://localhost:8002/api/v2/forecast?hours=72&model=best&uncertainty=true"
```

### Compare Models
```bash
curl http://localhost:8002/api/v2/model-comparison
```

### Risk Assessment
```bash
curl http://localhost:8002/api/v2/risk-assessment
```

### Feature Importance
```bash
curl "http://localhost:8002/api/v2/feature-importance?model=rf"
```

## 🎨 Access the Frontend

1. **Start the web app** (separate terminal):
   ```bash
   cd web
   npm install  # if not done
   npm run dev
   ```

2. **Navigate to Forecasting Dashboard**:
   - Open browser: http://localhost:5173
   - Login with credentials
   - Go to: **Forecasting → Advanced Dashboard**

3. **Train Models** (if not done):
   - Click "Train ML Models" button in the dashboard
   - Wait for training to complete (~30 seconds)
   - Dashboard will auto-refresh with ML predictions

## 📖 API Documentation

- **Interactive Docs**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc
- **OpenAPI JSON**: http://localhost:8002/openapi.json

## 🔧 Configuration

### Environment Variables

Create `.env` file in `services/forecasting_service/`:

```bash
# Service Configuration
APP_NAME="Forecasting Service"
APP_VERSION="2.0.0"
ENVIRONMENT="development"
DEBUG=true

# Server
HOST="0.0.0.0"
PORT=8002

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# Logging
LOG_LEVEL="INFO"
LOG_DIR="logs"
```

### Model Configuration

Edit `app/ml/advanced_forecasting.py` for:
- Model hyperparameters
- Feature engineering settings
- Sequence lengths
- Training split ratios

## 📊 Dashboard Features

### Forecast Tab
- **72-hour predictions** with uncertainty bands
- Current water level
- Model metrics (RMSE, R², MAE)
- Interactive line chart

### Risk Assessment Tab
- Flood risk level (LOW/MEDIUM/HIGH)
- Drought risk level
- Confidence scores
- Recent rainfall and trends
- Active alerts

### Model Comparison Tab
- Performance ranking
- Detailed metrics for each model
- Visual comparison bar chart

## 🐛 Troubleshooting

### Service won't start
```bash
# Check if port 8002 is in use
lsof -i :8002  # Linux/Mac
netstat -ano | findstr :8002  # Windows

# Kill existing process if needed
kill -9 <PID>  # Linux/Mac
```

### Models not training
```bash
# Check logs
tail -f logs/forecasting.log

# Verify TensorFlow installation
python -c "import tensorflow as tf; print(tf.__version__)"

# Reinstall if needed
pip install --upgrade tensorflow
```

### Frontend not connecting
```bash
# Check .env.local in web/
VITE_FORECASTING_SERVICE_URL=http://localhost:8002

# Test API directly
curl http://localhost:8002/api/v2/status
```

## 📈 Performance Tips

### For Faster Training
- Reduce `n_estimators` in Random Forest/Gradient Boosting
- Decrease LSTM epochs (50 → 30)
- Use smaller dataset for testing

### For Better Accuracy
- Increase historical data (720+ hours)
- Add more lag features
- Tune hyperparameters
- Collect real sensor data

## 🔄 Updating Data

Models automatically use historical data from the basic forecasting system. To add new data:

```bash
# Submit new sensor reading
curl -X POST http://localhost:8002/api/v1/submit-data \
  -H "Content-Type: application/json" \
  -d '{
    "water_level_percent": 75.5,
    "rainfall_mm": 5.2,
    "gate_opening_percent": 60.0
  }'

# Update ML models with new data
curl -X POST http://localhost:8002/api/v2/update-data
```

## 📚 Next Steps

1. ✅ Service running
2. ✅ Models trained
3. ✅ Frontend connected
4. 🔄 Connect real sensors
5. 🔄 Set up monitoring
6. 🔄 Deploy to production

## 🆘 Need Help?

- **API Issues**: Check http://localhost:8002/docs
- **Frontend Issues**: Check browser console (F12)
- **Model Issues**: Review logs in `logs/forecasting.log`
- **Documentation**: See `ML_INTEGRATION_GUIDE.md` for detailed info

---

**Ready to go!** 🎉

Your advanced ML forecasting system is now running with:
- 3 ML models (Random Forest, Gradient Boosting, LSTM)
- 30+ engineered features
- Probabilistic predictions with uncertainty
- Interactive dashboard with real-time charts

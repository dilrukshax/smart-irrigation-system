"""
Advanced Analytics API Endpoints

Provides endpoints for:
- ARIMA/SARIMA forecasting
- Ensemble model predictions
- Anomaly detection
- Time series analysis
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import numpy as np

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/analytics", tags=["Advanced Analytics"])

# Import ML modules
try:
    from ..ml.arima_models import arima_forecaster, seasonal_analyzer, STATSMODELS_AVAILABLE
    from ..ml.ensemble_models import ensemble_forecaster, hybrid_forecaster, ForecastResult
    from ..ml.anomaly_detection import anomaly_detector
    ML_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ML modules not fully available: {e}")
    ML_AVAILABLE = False
    STATSMODELS_AVAILABLE = False


# Request/Response Models
class TimeSeriesData(BaseModel):
    """Input time series data."""
    values: List[float] = Field(..., description="Time series values")
    timestamps: Optional[List[str]] = Field(None, description="Optional timestamps")
    data_type: str = Field(default="water_level", description="Type of data")


class ARIMATrainRequest(BaseModel):
    """Request for ARIMA training."""
    values: List[float] = Field(..., description="Training data")
    data_type: str = Field(default="water_level", description="Data type")
    order: Optional[List[int]] = Field(None, description="ARIMA order (p, d, q)")
    seasonal_order: Optional[List[int]] = Field(None, description="Seasonal order (P, D, Q, s)")
    auto: bool = Field(default=True, description="Use auto ARIMA")


class ForecastRequest(BaseModel):
    """Request for forecast generation."""
    data_type: str = Field(default="water_level", description="Data type to forecast")
    steps: int = Field(default=24, ge=1, le=168, description="Forecast steps")
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99, description="Confidence level")


class AnomalyDetectionRequest(BaseModel):
    """Request for anomaly detection."""
    values: List[float] = Field(..., description="Data to analyze")
    timestamps: Optional[List[str]] = Field(None, description="Optional timestamps")
    methods: Optional[List[str]] = Field(None, description="Detection methods to use")
    sensitivity: float = Field(default=1.0, ge=0.5, le=2.0, description="Detection sensitivity")


class EnsembleRequest(BaseModel):
    """Request for ensemble forecasting."""
    forecasts: List[dict] = Field(..., description="List of forecasts from different models")
    strategy: str = Field(default="weighted_average", description="Ensemble strategy")


# Endpoints

@router.get("/status")
async def get_analytics_status():
    """Get status of advanced analytics features."""
    return {
        "status": "available" if ML_AVAILABLE else "limited",
        "features": {
            "arima": STATSMODELS_AVAILABLE if ML_AVAILABLE else False,
            "ensemble": ML_AVAILABLE,
            "anomaly_detection": ML_AVAILABLE,
            "seasonal_analysis": STATSMODELS_AVAILABLE if ML_AVAILABLE else False
        },
        "message": "All advanced analytics features available" if ML_AVAILABLE else "Some features require additional dependencies"
    }


# ARIMA Endpoints

@router.post("/arima/train")
async def train_arima_model(request: ARIMATrainRequest):
    """
    Train ARIMA or SARIMA model on time series data.
    
    Uses auto ARIMA by default for optimal parameter selection.
    """
    if not ML_AVAILABLE or not STATSMODELS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="ARIMA models require statsmodels. Install with: pip install statsmodels pmdarima"
        )
    
    try:
        data = np.array(request.values)
        
        if request.auto:
            result = arima_forecaster.train_auto_arima(
                data=data,
                data_type=request.data_type,
                seasonal=request.seasonal_order is not None,
                m=request.seasonal_order[3] if request.seasonal_order and len(request.seasonal_order) > 3 else 24
            )
        else:
            order = tuple(request.order) if request.order else (1, 1, 1)
            seasonal = tuple(request.seasonal_order) if request.seasonal_order else None
            result = arima_forecaster.train_arima(
                data=data,
                data_type=request.data_type,
                order=order,
                seasonal_order=seasonal
            )
        
        return result
        
    except Exception as e:
        logger.error(f"ARIMA training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/arima/forecast")
async def generate_arima_forecast(request: ForecastRequest):
    """
    Generate forecasts using trained ARIMA model.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        result = arima_forecaster.forecast(
            data_type=request.data_type,
            steps=request.steps,
            confidence_level=request.confidence_level
        )
        
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ARIMA forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/arima/analyze")
async def analyze_time_series(request: TimeSeriesData):
    """
    Analyze time series for stationarity and seasonal patterns.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        data = np.array(request.values)
        
        results = {
            "data_length": len(data),
            "data_type": request.data_type
        }
        
        # Stationarity test
        if STATSMODELS_AVAILABLE:
            results["stationarity"] = arima_forecaster.check_stationarity(data)
            results["acf_pacf"] = arima_forecaster.get_acf_pacf(data, lags=min(40, len(data) // 3))
        
        # Daily pattern analysis
        if len(data) >= 24:
            results["daily_pattern"] = seasonal_analyzer.analyze_daily_pattern(data)
        
        # Weekly pattern if enough data
        if len(data) >= 168:
            daily_means = [np.mean(data[i:i+24]) for i in range(0, len(data)-23, 24)]
            if len(daily_means) >= 7:
                results["weekly_pattern"] = seasonal_analyzer.analyze_weekly_pattern(np.array(daily_means))
        
        return results
        
    except Exception as e:
        logger.error(f"Time series analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Ensemble Endpoints

@router.post("/ensemble/combine")
async def combine_forecasts(request: EnsembleRequest):
    """
    Combine multiple forecasts using ensemble methods.
    
    Strategies: simple_average, weighted_average, median, trimmed_mean, best_model, adaptive
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        # Convert input to ForecastResult objects
        forecast_results = []
        for f in request.forecasts:
            forecast_results.append(ForecastResult(
                model_name=f.get("model_name", "unknown"),
                predictions=np.array(f.get("predictions", [])),
                confidence=f.get("confidence", 1.0),
                lower_bound=np.array(f["lower_bound"]) if f.get("lower_bound") else None,
                upper_bound=np.array(f["upper_bound"]) if f.get("upper_bound") else None
            ))
        
        result = ensemble_forecaster.combine_with_strategy(
            forecasts=forecast_results,
            strategy=request.strategy
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Ensemble combination error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ensemble/rankings")
async def get_model_rankings():
    """
    Get performance rankings of tracked models.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        rankings = ensemble_forecaster.get_model_rankings()
        return {
            "rankings": rankings,
            "total_models_tracked": len(rankings)
        }
    except Exception as e:
        logger.error(f"Error getting rankings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Anomaly Detection Endpoints

@router.post("/anomaly/detect")
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Detect anomalies in time series data using multiple methods.
    
    Methods: z_score, iqr, isolation_forest, moving_average, seasonal, rate_of_change
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        # Update sensitivity
        anomaly_detector.sensitivity = request.sensitivity
        
        data = np.array(request.values)
        
        result = anomaly_detector.detect_all(
            data=data,
            timestamps=request.timestamps,
            methods=request.methods
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/anomaly/set-baseline")
async def set_anomaly_baseline(request: TimeSeriesData):
    """
    Set baseline statistics for anomaly detection.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        data = np.array(request.values)
        result = anomaly_detector.set_baseline(request.data_type, data)
        return result
    except Exception as e:
        logger.error(f"Error setting baseline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomaly/check/{data_type}")
async def check_value_against_baseline(
    data_type: str,
    value: float = Query(..., description="Value to check")
):
    """
    Check if a single value is anomalous against baseline.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        result = anomaly_detector.detect_against_baseline(data_type, value)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking value: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomaly/methods")
async def list_anomaly_detection_methods():
    """
    List available anomaly detection methods.
    """
    return {
        "methods": [
            {
                "name": "z_score",
                "description": "Statistical Z-score method",
                "best_for": "Normally distributed data"
            },
            {
                "name": "iqr",
                "description": "Interquartile Range method",
                "best_for": "Data with outliers, robust method"
            },
            {
                "name": "isolation_forest",
                "description": "ML-based Isolation Forest",
                "best_for": "Complex multivariate patterns",
                "requires": "scikit-learn"
            },
            {
                "name": "moving_average",
                "description": "Deviation from moving average",
                "best_for": "Trending data, sudden changes"
            },
            {
                "name": "seasonal",
                "description": "Seasonal pattern deviation",
                "best_for": "Data with daily/weekly patterns"
            },
            {
                "name": "rate_of_change",
                "description": "Rapid change detection",
                "best_for": "Spike/drop detection"
            }
        ]
    }


# Seasonal Analysis Endpoints

@router.post("/seasonal/analyze")
async def analyze_seasonal_patterns(request: TimeSeriesData):
    """
    Analyze seasonal patterns in time series data.
    """
    if not ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML features not available")
    
    try:
        data = np.array(request.values)
        
        result = {
            "data_type": request.data_type,
            "data_length": len(data)
        }
        
        # Daily pattern
        if len(data) >= 48:
            result["daily_pattern"] = seasonal_analyzer.analyze_daily_pattern(data)
        
        # Decomposition
        if STATSMODELS_AVAILABLE and len(data) >= 48:
            result["decomposition"] = arima_forecaster.decompose_series(data, period=24)
        
        return result
        
    except Exception as e:
        logger.error(f"Seasonal analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

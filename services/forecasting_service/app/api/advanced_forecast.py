"""
Advanced Forecast API Routes

Enhanced endpoints for ML-based forecasting with multiple models.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.ml.forecasting_system import forecasting_system
from app.ml import ADVANCED_ML_AVAILABLE

# Try to import advanced forecasting, but make it optional
try:
    from app.ml.advanced_forecasting import advanced_forecasting
except ImportError:
    advanced_forecasting = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["Advanced Forecast"])


# ============ Schemas ============

class ModelMetrics(BaseModel):
    """Model performance metrics."""
    rmse: float
    mae: float
    r2: float


class ModelInfo(BaseModel):
    """Model information."""
    name: str
    metrics: ModelMetrics
    rank: int


class PredictionPoint(BaseModel):
    """Single prediction point."""
    hour: int
    predicted_water_level: float
    timestamp: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class AdvancedForecastResponse(BaseModel):
    """Advanced forecast response with ML models."""
    status: str
    model_used: str
    current_level: float
    predictions: List[PredictionPoint]
    forecast_generated_at: float
    metrics: Optional[dict] = None


class ModelComparisonResponse(BaseModel):
    """Model comparison response."""
    status: str
    models: List[ModelInfo]
    best_model: str
    message: Optional[str] = None


class RiskAssessmentAdvanced(BaseModel):
    """Advanced risk assessment with ML predictions."""
    current_water_level: float
    flood_risk: str
    drought_risk: str
    confidence: float
    recent_rainfall_24h: float
    level_trend: float
    predicted_max_24h: float
    predicted_min_24h: float
    alerts: List[str]
    assessment_time: float
    model_metrics: dict


class TrainingStatus(BaseModel):
    """Model training status."""
    status: str
    message: str
    data_points: Optional[int] = None
    models_trained: Optional[List[str]] = None
    best_model: Optional[str] = None
    training_time: Optional[float] = None


class FeatureImportance(BaseModel):
    """Feature importance from models."""
    feature: str
    importance: float


class ModelAnalysis(BaseModel):
    """Detailed model analysis."""
    model_name: str
    metrics: ModelMetrics
    feature_importance: List[FeatureImportance]


# ============ Routes ============

@router.get("/status")
async def get_advanced_status():
    """
    Get advanced forecasting system status.
    
    Returns:
        System status with model information
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        return {
            "service": "Advanced ML Forecasting System",
            "status": "unavailable",
            "models_trained": False,
            "available_models": [],
            "data_points": 0,
            "features_engineered": 0,
            "timestamp": datetime.now().timestamp(),
            "message": "TensorFlow not installed. Advanced ML features unavailable. Use basic forecasting endpoints (/api/v1)."
        }
    
    return {
        "service": "Advanced ML Forecasting System",
        "status": "running",
        "models_trained": advanced_forecasting.is_trained,
        "available_models": list(advanced_forecasting.metrics.keys()) if advanced_forecasting.metrics else [],
        "data_points": len(advanced_forecasting.df) if advanced_forecasting.df is not None else 0,
        "features_engineered": len(advanced_forecasting.feature_cols),
        "timestamp": datetime.now().timestamp(),
    }


@router.post("/train")
async def train_models(background_tasks: BackgroundTasks):
    """
    Train all ML models on historical data.
    
    This endpoint trains:
    - Random Forest
    - Gradient Boosting
    - LSTM
    - Quantile Regression models
    
    Returns:
        Training status and results
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    try:
        # Get historical data from basic forecasting system
        if not forecasting_system.is_ready:
            raise HTTPException(
                status_code=400,
                detail="No historical data available. Initialize basic forecasting first."
            )
        
        # Prepare data for advanced system
        historical_data = []
        for i in range(len(forecasting_system.water_level_data)):
            historical_data.append({
                'timestamp': forecasting_system.water_level_data[i]['timestamp'],
                'water_level_percent': forecasting_system.water_level_data[i]['water_level_percent'],
                'rainfall_mm': forecasting_system.rainfall_data[i]['rainfall_mm'],
                'gate_opening_percent': forecasting_system.dam_gate_data[i]['gate_opening_percent'],
            })
        
        logger.info(f"Training models with {len(historical_data)} data points")
        
        # Initialize and train
        advanced_forecasting.initialize_data(historical_data)
        metrics = advanced_forecasting.train_models(test_size=0.2)
        
        # Get best model
        best_model = min(metrics.items(), key=lambda x: x[1]['rmse'])[0]
        
        return TrainingStatus(
            status="success",
            message="All models trained successfully",
            data_points=len(historical_data),
            models_trained=list(metrics.keys()),
            best_model=best_model,
            training_time=datetime.now().timestamp()
        )
    
    except Exception as e:
        logger.error(f"Error training models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast", response_model=AdvancedForecastResponse)
async def get_advanced_forecast(
    hours: int = Query(24, ge=1, le=168, description="Hours ahead to forecast"),
    model: str = Query('best', description="Model type: best, rf, gb, lstm"),
    uncertainty: bool = Query(True, description="Include uncertainty bounds")
):
    """
    Get advanced ML-based forecast.
    
    Args:
        hours: Number of hours to forecast (1-168)
        model: Model to use ('best', 'rf', 'gb', 'lstm')
        uncertainty: Include prediction intervals
    
    Returns:
        Detailed forecast with predictions and confidence intervals
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    if not advanced_forecasting.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Models not trained. Call /api/v2/train first."
        )
    
    try:
        forecast = advanced_forecasting.predict(
            hours_ahead=hours,
            model_type=model,
            include_uncertainty=uncertainty
        )
        
        logger.info(
            f"Generated {hours}-hour forecast using {forecast['model_used']} "
            f"(current: {forecast['current_level']}%)"
        )
        
        return AdvancedForecastResponse(**forecast)
    
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-comparison", response_model=ModelComparisonResponse)
async def get_model_comparison():
    """
    Compare all trained models.
    
    Returns:
        Performance metrics for all models ranked by accuracy
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    if not advanced_forecasting.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Models not trained. Call /api/v2/train first."
        )
    
    comparison = advanced_forecasting.get_model_comparison()
    return ModelComparisonResponse(**comparison)


@router.get("/risk-assessment", response_model=RiskAssessmentAdvanced)
async def get_advanced_risk_assessment():
    """
    Get advanced risk assessment using ML predictions.
    
    Analyzes:
    - Current water levels
    - 24-hour predictions
    - Rainfall patterns
    - Trend analysis
    
    Returns:
        Comprehensive risk assessment with confidence scores
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    if not advanced_forecasting.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Models not trained. Call /api/v2/train first."
        )
    
    try:
        risk_analysis = advanced_forecasting.analyze_risk()
        
        # Log high-risk alerts
        if risk_analysis.get('alerts'):
            for alert in risk_analysis['alerts']:
                logger.warning(f"RISK ALERT: {alert}")
        
        return RiskAssessmentAdvanced(**risk_analysis)
    
    except Exception as e:
        logger.error(f"Error analyzing risk: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-analysis/{model_name}")
async def get_model_analysis(model_name: str):
    """
    Get detailed analysis for a specific model.
    
    Detailed model metrics and feature importance
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    if not advanced_forecasting.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Models not trained."
        )
    
    # Format model name
    model_name_formatted = model_name.replace('_', ' ').title()
    
    if model_name_formatted not in advanced_forecasting.metrics:
        raise HTTPException(
            status_code=404,
            detail=f"Model {model_name} not found"
        )
    
    metrics = advanced_forecasting.metrics[model_name_formatted]
    
    # Get feature importance for tree-based models
    feature_importance = []
    if 'random' in model_name.lower() and advanced_forecasting.rf_model:
        importances = advanced_forecasting.rf_model.feature_importances_
        for feat, imp in zip(advanced_forecasting.feature_cols, importances):
            feature_importance.append({
                'feature': feat,
                'importance': float(imp)
            })
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
    elif 'gradient' in model_name.lower() and advanced_forecasting.gb_model:
        importances = advanced_forecasting.gb_model.feature_importances_
        for feat, imp in zip(advanced_forecasting.feature_cols, importances):
            feature_importance.append({
                'feature': feat,
                'importance': float(imp)
            })
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
    
    return ModelAnalysis(
        model_name=model_name_formatted,
        metrics=ModelMetrics(**metrics),
        feature_importance=feature_importance[:15]  # Top 15 features
    )


@router.get("/feature-importance")
async def get_feature_importance(model: str = Query('rf', description="Model: rf or gb")):
    """
    Get feature importance from tree-based models.
    
    Args:
        model: Model type ('rf' for Random Forest, 'gb' for Gradient Boosting)
    
    Returns:
        List of features sorted by importance
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    if not advanced_forecasting.is_trained:
        raise HTTPException(
            status_code=503,
            detail="Models not trained."
        )
    
    if model.lower() == 'rf' and advanced_forecasting.rf_model:
        importances = advanced_forecasting.rf_model.feature_importances_
    elif model.lower() == 'gb' and advanced_forecasting.gb_model:
        importances = advanced_forecasting.gb_model.feature_importances_
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Model {model} not available or not a tree-based model"
        )
    
    feature_importance = [
        FeatureImportance(feature=feat, importance=float(imp))
        for feat, imp in zip(advanced_forecasting.feature_cols, importances)
    ]
    
    # Sort by importance
    feature_importance.sort(key=lambda x: x.importance, reverse=True)
    
    return {
        'status': 'success',
        'model': model.upper(),
        'features': feature_importance[:20]  # Top 20
    }


@router.post("/update-data")
async def update_historical_data():
    """
    Update ML models with latest data from basic forecasting system.
    
    Re-trains models with new data.
    """
    if not ADVANCED_ML_AVAILABLE or advanced_forecasting is None:
        raise HTTPException(
            status_code=503,
            detail="Advanced ML features unavailable. TensorFlow not installed."
        )
    
    try:
        if not forecasting_system.is_ready:
            raise HTTPException(
                status_code=400,
                detail="No data available in basic forecasting system"
            )
        
        # Collect all historical data
        historical_data = []
        for i in range(len(forecasting_system.water_level_data)):
            historical_data.append({
                'timestamp': forecasting_system.water_level_data[i]['timestamp'],
                'water_level_percent': forecasting_system.water_level_data[i]['water_level_percent'],
                'rainfall_mm': forecasting_system.rainfall_data[i]['rainfall_mm'],
                'gate_opening_percent': forecasting_system.dam_gate_data[i]['gate_opening_percent'],
            })
        
        # Re-initialize with updated data
        advanced_forecasting.initialize_data(historical_data)
        
        # Retrain if sufficient data
        if len(historical_data) >= 100:
            metrics = advanced_forecasting.train_models(test_size=0.2)
            return {
                'status': 'success',
                'message': 'Data updated and models retrained',
                'data_points': len(historical_data),
                'models': list(metrics.keys())
            }
        else:
            return {
                'status': 'success',
                'message': 'Data updated but not enough for retraining',
                'data_points': len(historical_data),
                'required': 100
            }
    
    except Exception as e:
        logger.error(f"Error updating data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

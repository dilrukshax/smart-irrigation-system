"""
Smart Water Management ML Model

This module provides ML-based water release predictions using the trained
Histogram-based Gradient Boosting Regressor model from the Udawalawe
hydrological data (1994-2025).

The model predicts next-day irrigation water release requirements based on:
- Reservoir water level (mMSL)
- Total and active storage capacity (MCM)
- Rainfall and inflow data
- Historical lag features and rolling averages
"""

import logging
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import numpy as np

logger = logging.getLogger(__name__)

# Try to import joblib and pandas (optional for model loading)
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False
    logger.warning("joblib not available - will use fallback model")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


class WaterManagementModel:
    """
    Smart Water Management Model for predicting irrigation water releases.
    
    This model predicts the next-day main canal water release (MCM) based on
    reservoir conditions, inflows, rainfall, and historical patterns.
    """
    
    # Feature columns expected by the trained model
    FEATURE_COLUMNS = [
        'water_level_mmsl', 'total_storage_mcm', 'active_storage_mcm',
        'inflow_mcm', 'rain_mm', 'lb_main_canal_mcm', 'rb_main_canal_mcm',
        'main_canals_mcm', 'spillway_mcm', 'evap_mm', 'wind_speed_ms',
        # Lag features
        'water_level_mmsl_lag1', 'water_level_mmsl_lag2', 'water_level_mmsl_lag3', 'water_level_mmsl_lag7',
        'total_storage_mcm_lag1', 'total_storage_mcm_lag2', 'total_storage_mcm_lag3', 'total_storage_mcm_lag7',
        'inflow_mcm_lag1', 'inflow_mcm_lag2', 'inflow_mcm_lag3', 'inflow_mcm_lag7',
        'rain_mm_lag1', 'rain_mm_lag2', 'rain_mm_lag3', 'rain_mm_lag7',
        'main_canals_mcm_lag1', 'main_canals_mcm_lag2', 'main_canals_mcm_lag3', 'main_canals_mcm_lag7',
        # Rolling means
        'rain_mm_roll3', 'rain_mm_roll7', 'rain_mm_roll14',
        'inflow_mcm_roll3', 'inflow_mcm_roll7', 'inflow_mcm_roll14',
        'water_level_mmsl_roll3', 'water_level_mmsl_roll7', 'water_level_mmsl_roll14',
        # Calendar features
        'month', 'dow', 'dayofyear'
    ]
    
    # Default thresholds for control decisions
    DEFAULT_RELEASE_THRESHOLD_MCM = 0.5
    DEFAULT_MIN_SAFE_LEVEL_MMSL = 80.0
    DEFAULT_MAX_SAFE_LEVEL_MMSL = 95.0
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the Water Management Model.
        
        Args:
            model_path: Path to the trained joblib model file.
                       If None, looks in the notebooks directory.
        """
        self.model = None
        self._is_loaded = False
        self._model_path = model_path
        self._historical_data: List[Dict[str, float]] = []
        
        # Model performance metrics (from training)
        self.model_metrics = {
            "model_type": "HistGradientBoostingRegressor",
            "training_period": "1994-2022",
            "test_period": "2023-2025",
            "mae": None,
            "rmse": None,
            "r2": None
        }
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Load the trained ML model from disk.
        
        Args:
            model_path: Path to the joblib model file.
            
        Returns:
            True if model loaded successfully, False otherwise.
        """
        if not JOBLIB_AVAILABLE:
            logger.warning("joblib not available - using fallback prediction model")
            self._is_loaded = True
            return True
        
        path = model_path or self._model_path
        
        # Default path in notebooks directory
        if path is None:
            notebooks_dir = Path(__file__).parent.parent.parent / "notebooks"
            path = notebooks_dir / "smart_water_mgmt_release_predictor.joblib"
        
        path = Path(path)
        
        if not path.exists():
            logger.warning(f"Model file not found at {path}. Using fallback model.")
            self._is_loaded = True
            return True
        
        try:
            self.model = joblib.load(path)
            self._is_loaded = True
            logger.info(f"Loaded trained water management model from {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._is_loaded = True  # Still mark as loaded to use fallback
            return False
    
    def _create_feature_vector(self, data: Dict[str, float]) -> np.ndarray:
        """
        Create a feature vector from input data.
        
        Args:
            data: Dictionary containing sensor/reservoir readings
            
        Returns:
            numpy array of features in the expected order
        """
        features = []
        for col in self.FEATURE_COLUMNS:
            features.append(data.get(col, np.nan))
        return np.array([features])
    
    def _fallback_prediction(self, data: Dict[str, float]) -> float:
        """
        Fallback prediction when trained model is not available.
        
        Uses a simple rule-based approach based on reservoir conditions.
        """
        water_level = data.get('water_level_mmsl', 85.0)
        inflow = data.get('inflow_mcm', 0.5)
        rain = data.get('rain_mm', 0)
        storage_pct = data.get('gross_storage_pct', 50)
        
        # Base release estimate
        base_release = 0.3
        
        # Adjust based on storage level
        if storage_pct > 80:
            base_release += 0.4
        elif storage_pct > 60:
            base_release += 0.2
        elif storage_pct < 30:
            base_release -= 0.2
        
        # Adjust based on inflow
        base_release += inflow * 0.2
        
        # Reduce if recent rainfall
        if rain > 10:
            base_release -= 0.1
        
        return max(0.0, min(2.0, base_release))
    
    def predict_release(self, data: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict next-day irrigation water release.
        
        Args:
            data: Dictionary containing current reservoir and weather data:
                - water_level_mmsl: Reservoir water level (mMSL)
                - total_storage_mcm: Total storage capacity (MCM)
                - active_storage_mcm: Active storage capacity (MCM)
                - inflow_mcm: Current inflow (MCM)
                - rain_mm: Rainfall (mm)
                - main_canals_mcm: Current canal release (MCM)
                - Plus lag and rolling features if available
                
        Returns:
            Dictionary with prediction results:
                - predicted_release_mcm: Predicted next-day release
                - confidence: Prediction confidence
                - model_used: Type of model used
        """
        if not self._is_loaded:
            self.load_model()
        
        # Add calendar features if not present
        now = datetime.now()
        if 'month' not in data:
            data['month'] = now.month
        if 'dow' not in data:
            data['dow'] = now.weekday()
        if 'dayofyear' not in data:
            data['dayofyear'] = now.timetuple().tm_yday
        
        # Use trained model if available
        if self.model is not None:
            try:
                features = self._create_feature_vector(data)
                prediction = self.model.predict(features)[0]
                return {
                    "predicted_release_mcm": round(float(prediction), 4),
                    "confidence": 0.85,  # Estimated from training R2
                    "model_used": "HistGradientBoostingRegressor"
                }
            except Exception as e:
                logger.error(f"Model prediction failed: {e}")
        
        # Fallback prediction
        prediction = self._fallback_prediction(data)
        return {
            "predicted_release_mcm": round(prediction, 4),
            "confidence": 0.60,
            "model_used": "rule_based_fallback"
        }
    
    def decide_actuation(
        self,
        predicted_release_mcm: float,
        reservoir_level_mmsl: float,
        release_threshold_mcm: Optional[float] = None,
        min_safe_level_mmsl: Optional[float] = None,
        max_safe_level_mmsl: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate actuator control decision based on prediction and reservoir status.
        
        Args:
            predicted_release_mcm: Predicted next-day water release (MCM)
            reservoir_level_mmsl: Current reservoir water level (mMSL)
            release_threshold_mcm: Threshold above which to open valves
            min_safe_level_mmsl: Minimum safe reservoir level
            max_safe_level_mmsl: Maximum safe reservoir level (triggers spillway)
            
        Returns:
            Dictionary with control decision:
                - action: "OPEN", "CLOSE", "HOLD", or "EMERGENCY_RELEASE"
                - valve_position: 0-100 percentage
                - reason: Explanation for the decision
                - priority: "low", "medium", "high", "critical"
        """
        release_threshold = release_threshold_mcm or self.DEFAULT_RELEASE_THRESHOLD_MCM
        min_safe = min_safe_level_mmsl or self.DEFAULT_MIN_SAFE_LEVEL_MMSL
        max_safe = max_safe_level_mmsl or self.DEFAULT_MAX_SAFE_LEVEL_MMSL
        
        # Handle missing inputs
        if np.isnan(predicted_release_mcm) or np.isnan(reservoir_level_mmsl):
            return {
                "action": "HOLD",
                "valve_position": 50,
                "reason": "Missing sensor inputs - maintaining current state",
                "priority": "medium"
            }
        
        # Emergency: Reservoir too high - need to release water
        if reservoir_level_mmsl >= max_safe:
            return {
                "action": "EMERGENCY_RELEASE",
                "valve_position": 100,
                "reason": f"Reservoir level ({reservoir_level_mmsl:.1f} mMSL) exceeds maximum safe level ({max_safe} mMSL)",
                "priority": "critical"
            }
        
        # Reservoir too low - close valves to conserve water
        if reservoir_level_mmsl < min_safe:
            return {
                "action": "CLOSE",
                "valve_position": 0,
                "reason": f"Reservoir level ({reservoir_level_mmsl:.1f} mMSL) below minimum safe level ({min_safe} mMSL)",
                "priority": "high"
            }
        
        # Normal operation based on prediction
        if predicted_release_mcm > release_threshold:
            # Calculate valve position based on release amount
            valve_position = min(100, int((predicted_release_mcm / 2.0) * 100))
            return {
                "action": "OPEN",
                "valve_position": valve_position,
                "reason": f"Predicted release ({predicted_release_mcm:.3f} MCM) exceeds threshold ({release_threshold} MCM)",
                "priority": "medium"
            }
        
        return {
            "action": "CLOSE",
            "valve_position": 0,
            "reason": f"Low irrigation demand predicted ({predicted_release_mcm:.3f} MCM)",
            "priority": "low"
        }
    
    def get_recommendation(self, data: Dict[str, float]) -> Dict[str, Any]:
        """
        Get a complete irrigation recommendation including prediction and control decision.
        
        Args:
            data: Dictionary with reservoir and weather sensor data
            
        Returns:
            Complete recommendation including:
                - prediction: Next-day release prediction
                - decision: Actuator control decision
                - reservoir_status: Current reservoir assessment
                - timestamp: When the recommendation was generated
        """
        # Get prediction
        prediction = self.predict_release(data)
        
        # Get reservoir level
        water_level = data.get('water_level_mmsl', 85.0)
        total_storage = data.get('total_storage_mcm', 0)
        active_storage = data.get('active_storage_mcm', 0)
        
        # Determine reservoir status
        storage_pct = (active_storage / total_storage * 100) if total_storage > 0 else 50
        
        if storage_pct > 80:
            reservoir_status = "HIGH"
            reservoir_alert = None
        elif storage_pct > 40:
            reservoir_status = "NORMAL"
            reservoir_alert = None
        elif storage_pct > 20:
            reservoir_status = "LOW"
            reservoir_alert = "Low reservoir level - consider reducing releases"
        else:
            reservoir_status = "CRITICAL"
            reservoir_alert = "Critical reservoir level - immediate action required"
        
        # Get control decision
        decision = self.decide_actuation(
            predicted_release_mcm=prediction["predicted_release_mcm"],
            reservoir_level_mmsl=water_level
        )
        
        return {
            "timestamp": datetime.now().isoformat(),
            "prediction": prediction,
            "decision": decision,
            "reservoir_status": {
                "level_mmsl": water_level,
                "total_storage_mcm": total_storage,
                "active_storage_mcm": active_storage,
                "storage_percentage": round(storage_pct, 1),
                "status": reservoir_status,
                "alert": reservoir_alert
            },
            "input_data": {
                "inflow_mcm": data.get('inflow_mcm'),
                "rain_mm": data.get('rain_mm'),
                "main_canals_mcm": data.get('main_canals_mcm'),
                "evap_mm": data.get('evap_mm')
            }
        }
    
    def update_historical_data(self, data: Dict[str, float]) -> None:
        """
        Update historical data for computing lag and rolling features.
        
        Args:
            data: New data point to add to history
        """
        data['timestamp'] = datetime.now().isoformat()
        self._historical_data.append(data)
        
        # Keep only last 30 days of data
        if len(self._historical_data) > 30:
            self._historical_data = self._historical_data[-30:]
    
    @property
    def is_ready(self) -> bool:
        """Check if model is loaded and ready for predictions."""
        return self._is_loaded


# Singleton instance
water_management_model = WaterManagementModel()

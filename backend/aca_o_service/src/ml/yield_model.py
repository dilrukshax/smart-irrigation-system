"""
Yield Prediction Model

This module provides crop yield prediction functionality.
The model predicts expected yield (tonnes/hectare) based on:
- Field characteristics (soil, area, location)
- Crop type and variety
- Climate conditions
- Water availability
- Historical performance

Current Status:
    STUB implementation with deterministic fake predictions.
    Replace with actual ML model (e.g., Random Forest, XGBoost, or 
    Neural Network trained on historical yield data).

Future Implementation:
    1. Train model using historical yield data from HistoricalYield table
    2. Features: soil_type, soil_ph, soil_ec, water_applied, rainfall, 
                 temperature, crop_variety, season
    3. Use scikit-learn or similar for model training
    4. Store trained model as .joblib file
    5. Load model at service startup
"""

import logging
from typing import Dict, Any, Optional
import hashlib

logger = logging.getLogger(__name__)


class YieldModel:
    """
    Yield prediction model for crop recommendations.
    
    Predicts expected yield in tonnes per hectare based on
    field conditions, crop characteristics, and environmental factors.
    
    REQUIRES: Trained ML model file (.joblib) to be loaded.
    Without a trained model, predictions cannot be made.
    
    Usage:
        model = YieldModel()
        model.load_model("models/yield_model.joblib")
        
        yield_prediction = model.predict(
            field_id="FIELD-001",
            crop_id="CROP-001",
            features={"soil_ph": 6.5, "water_coverage_ratio": 0.9, ...}
        )
    
    Attributes:
        model_loaded: Whether the model is ready for predictions
        model_version: Version string of the loaded model
    """
    
    def __init__(self):
        """Initialize the yield model."""
        self.model_loaded = False
        self.model_version = None
        self._model = None
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Load the trained yield prediction model.
        
        Args:
            model_path: Path to the saved model file (.joblib)
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        if model_path is None:
            logger.warning(
                "No yield model path provided. "
                "Please train a model and provide the path to load it."
            )
            self.model_loaded = False
            return False
        
        try:
            import joblib
            self._model = joblib.load(model_path)
            self.model_loaded = True
            self.model_version = getattr(self._model, 'version', 'unknown')
            logger.info(f"Yield model loaded successfully from {model_path}")
            return True
        except FileNotFoundError:
            logger.error(f"Yield model file not found: {model_path}")
            self.model_loaded = False
            return False
        except Exception as e:
            logger.error(f"Failed to load yield model: {e}")
            self.model_loaded = False
            return False
    
    def predict(
        self,
        field_id: str,
        crop_id: str,
        features: Dict[str, Any],
    ) -> Optional[float]:
        """
        Predict yield for a specific field-crop combination.
        
        Args:
            field_id: Field identifier
            crop_id: Crop identifier
            features: Feature dictionary containing model inputs
        
        Returns:
            Predicted yield in tonnes per hectare, or None if model not loaded
        """
        if not self.model_loaded or self._model is None:
            logger.error(
                "Yield model not loaded. Cannot make predictions. "
                "Please load a trained model using load_model()."
            )
            return None
        
        try:
            feature_vector = self._prepare_features(features)
            prediction = float(self._model.predict([feature_vector])[0])
            logger.debug(f"Yield prediction for {crop_id} in {field_id}: {prediction:.2f} t/ha")
            return round(prediction, 2)
        except Exception as e:
            logger.error(f"Yield prediction failed: {e}")
            return None
    
    def _prepare_features(self, features: Dict[str, Any]) -> list:
        """
        Prepare feature vector for the ML model.
        
        Converts feature dictionary to ordered list matching
        model's expected input format.
        
        Args:
            features: Feature dictionary
        
        Returns:
            List of feature values in correct order
        """
        # Define feature order expected by model
        feature_order = [
            "soil_suitability",
            "water_coverage_ratio",
            "soil_ph",
            "soil_ec",
            "season_avg_temp",
            "season_rainfall_mm",
            "growth_duration_days",
        ]
        
        # Extract features with defaults
        defaults = {
            "soil_suitability": 0.7,
            "water_coverage_ratio": 0.8,
            "soil_ph": 6.5,
            "soil_ec": 1.0,
            "season_avg_temp": 28.0,
            "season_rainfall_mm": 250.0,
            "growth_duration_days": 120,
        }
        
        return [features.get(f, defaults.get(f, 0)) for f in feature_order]


# Module-level singleton instance
_yield_model: Optional[YieldModel] = None


def get_yield_model() -> YieldModel:
    """
    Get the singleton yield model instance.
    
    Note: Model must be explicitly loaded with a valid model path
    before predictions can be made.
    
    Returns:
        YieldModel: The shared yield model instance (may not be loaded)
    """
    global _yield_model
    if _yield_model is None:
        _yield_model = YieldModel()
        # Model is NOT auto-loaded - must be explicitly loaded with path
        logger.warning(
            "YieldModel instance created but not loaded. "
            "Call load_model() with a valid model path to enable predictions."
        )
    return _yield_model

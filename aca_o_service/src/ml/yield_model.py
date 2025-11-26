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
    
    Usage:
        model = YieldModel()
        model.load_model()
        
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
        self.model_version = "stub-v0.1"
        self._model = None
        
        # Base yields by crop category (tonnes/ha)
        # Used as fallback in stub implementation
        self._base_yields = {
            "cereal": 4.0,
            "pulse": 1.5,
            "vegetable": 10.0,
            "fruit": 8.0,
        }
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Load the trained yield prediction model.
        
        Args:
            model_path: Path to the saved model file (.joblib)
                       If None, uses default path or stub mode
        
        Returns:
            bool: True if model loaded successfully
        
        TODO:
            Implement actual model loading:
            ```python
            import joblib
            self._model = joblib.load(model_path)
            self.model_loaded = True
            ```
        """
        logger.info(f"Loading yield model (version: {self.model_version})")
        
        # STUB: Mark as loaded without actual model
        # In production, load the actual trained model here
        # try:
        #     import joblib
        #     self._model = joblib.load(model_path or "models/yield_model.joblib")
        #     self.model_loaded = True
        #     logger.info("Yield model loaded successfully")
        # except Exception as e:
        #     logger.error(f"Failed to load yield model: {e}")
        #     self.model_loaded = False
        
        self.model_loaded = True  # Stub always succeeds
        logger.info("Yield model ready (stub mode)")
        
        return self.model_loaded
    
    def predict(
        self,
        field_id: str,
        crop_id: str,
        features: Dict[str, Any],
    ) -> float:
        """
        Predict yield for a specific field-crop combination.
        
        Args:
            field_id: Field identifier
            crop_id: Crop identifier
            features: Feature dictionary containing:
                - soil_suitability: 0-1 score
                - water_coverage_ratio: 0-1 score
                - crop_category: e.g., "cereal"
                - base_yield_t_ha: Baseline yield
                - historical_yield_t_ha: Past performance
                - season_avg_temp: Average temperature
                - season_rainfall_mm: Total rainfall
        
        Returns:
            Predicted yield in tonnes per hectare
        
        Example:
            yield_pred = model.predict(
                field_id="FIELD-001",
                crop_id="CROP-001", 
                features={"soil_suitability": 0.85, "water_coverage_ratio": 0.9}
            )
            # Returns: 4.2 (tonnes/ha)
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, loading now...")
            self.load_model()
        
        # STUB: Use deterministic fake prediction based on features
        # In production, use actual model:
        # feature_vector = self._prepare_features(features)
        # return float(self._model.predict([feature_vector])[0])
        
        yield_prediction = self._stub_predict(field_id, crop_id, features)
        
        logger.debug(f"Yield prediction for {crop_id} in {field_id}: {yield_prediction:.2f} t/ha")
        
        return yield_prediction
    
    def _stub_predict(
        self,
        field_id: str,
        crop_id: str,
        features: Dict[str, Any],
    ) -> float:
        """
        Stub prediction using simple heuristics.
        
        Creates deterministic but reasonable-looking predictions
        based on features without a real ML model.
        """
        # Get base yield
        category = features.get("crop_category", "cereal")
        base_yield = features.get(
            "base_yield_t_ha",
            self._base_yields.get(category, 3.0)
        )
        
        # Adjust for historical performance
        hist_yield = features.get("historical_yield_t_ha", base_yield)
        
        # Blend historical and base (70% historical if available)
        if hist_yield > 0:
            expected_base = 0.7 * hist_yield + 0.3 * base_yield
        else:
            expected_base = base_yield
        
        # Adjustment factors
        soil_factor = features.get("soil_suitability", 0.7)
        water_factor = features.get("water_coverage_ratio", 0.8)
        
        # Water stress penalty for sensitive crops
        water_sensitivity = features.get("water_sensitivity", "medium")
        if water_sensitivity == "high" and water_factor < 0.9:
            water_factor *= 0.9  # Additional penalty
        
        # Create pseudo-random variation using field+crop hash
        # This ensures same inputs give same output (deterministic)
        hash_input = f"{field_id}_{crop_id}"
        hash_val = int(hashlib.md5(hash_input.encode()).hexdigest()[:8], 16)
        variation = 0.9 + (hash_val % 21) / 100  # 0.90 to 1.10
        
        # Final prediction
        prediction = expected_base * soil_factor * water_factor * variation
        
        # Ensure reasonable bounds
        prediction = max(0.5, min(prediction, base_yield * 1.5))
        
        return round(prediction, 2)
    
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
    
    Returns:
        YieldModel: The shared yield model instance
    """
    global _yield_model
    if _yield_model is None:
        _yield_model = YieldModel()
        _yield_model.load_model()
    return _yield_model

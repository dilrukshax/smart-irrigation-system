"""
Yield Prediction Model - Rule-Based Heuristic

This module provides crop yield prediction functionality using a rule-based heuristic.
The model predicts expected yield (tonnes/hectare) based on:
- Field characteristics (soil suitability, soil pH, soil EC)
- Water availability (water coverage ratio)
- Climate conditions (temperature, rainfall)
- Crop growth duration
- Historical performance

Implementation uses a weighted formula combining multiple factors with domain expertise.
Can be replaced with trained ML model in future for better accuracy.
"""

import logging
import numpy as np
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class YieldModel:
    """
    Yield prediction model using rule-based heuristic.

    Predicts expected yield in tonnes per hectare based on
    field conditions, crop characteristics, and environmental factors.

    Uses a weighted formula:
    yield = base_yield * soil_factor * water_factor * climate_factor * duration_factor
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the yield model.

        Args:
            model_path: Path to optional trained model (for future ML implementation)
        """
        self.model_loaded = True  # Rule-based model is always "loaded"
        self.model_version = "1.0.0-heuristic"
        self._model = None
        self.use_heuristic = True

        # Try to load ML model if path provided
        if model_path is not None:
            self.load_model(model_path)

    def load_model(self, model_path: str) -> bool:
        """
        Load a trained ML model from disk.

        Args:
            model_path: Path to the saved model file (.joblib)

        Returns:
            bool: True if model loaded successfully
        """
        try:
            import joblib
            from pathlib import Path

            model_file = Path(model_path)
            if not model_file.exists():
                logger.warning(f"Yield model file not found: {model_path}")
                logger.info("Using rule-based heuristic instead")
                return False

            self._model = joblib.load(str(model_file))
            self.use_heuristic = False
            self.model_loaded = True
            self.model_version = getattr(self._model, 'version', '1.0.0-ml')
            logger.info(f"Yield ML model loaded successfully from {model_path}")
            return True

        except Exception as e:
            logger.warning(f"Failed to load yield ML model: {e}")
            logger.info("Falling back to rule-based heuristic")
            self.use_heuristic = True
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
            features: Feature dictionary with keys:
                - soil_suitability (0-1)
                - water_coverage_ratio (0-1)
                - soil_ph (4-9)
                - soil_ec (mS/cm)
                - season_avg_temp (°C)
                - season_rainfall_mm (mm)
                - growth_duration_days (days)
                - historical_yield_avg (optional, t/ha)

        Returns:
            Predicted yield in tonnes per hectare
        """
        if self.use_heuristic:
            return self._predict_heuristic(field_id, crop_id, features)
        else:
            return self._predict_ml(field_id, crop_id, features)

    def _predict_heuristic(
        self,
        field_id: str,
        crop_id: str,
        features: Dict[str, Any]
    ) -> float:
        """
        Rule-based yield prediction using domain expertise.

        Formula:
        base_yield = 5.0 t/ha (typical crop yield)
        yield = base_yield * soil_factor * water_factor * climate_factor * duration_factor

        Args:
            field_id: Field identifier
            crop_id: Crop identifier
            features: Feature dictionary

        Returns:
            Predicted yield in tonnes per hectare
        """
        try:
            # Extract features with defaults
            soil_suitability = features.get("soil_suitability", 0.7)
            water_coverage_ratio = features.get("water_coverage_ratio", 0.8)
            soil_ph = features.get("soil_ph", 6.5)
            soil_ec = features.get("soil_ec", 1.0)
            season_avg_temp = features.get("season_avg_temp", 28.0)
            season_rainfall_mm = features.get("season_rainfall_mm", 250.0)
            growth_duration_days = features.get("growth_duration_days", 120)
            historical_yield_avg = features.get("historical_yield_avg", None)

            # Base yield for typical crops in Sri Lanka
            base_yield = 5.0  # tonnes per hectare

            # 1. Soil Factor (30% weight)
            # Combine soil suitability with pH and EC penalties
            optimal_ph = 6.5
            ph_deviation = abs(soil_ph - optimal_ph)
            ph_penalty = max(0, 1.0 - (ph_deviation / 2.0))  # Penalty for pH deviation

            # EC penalty (higher EC = more salinity = lower yield)
            optimal_ec = 1.0
            ec_penalty = 1.0 if soil_ec <= 2.0 else max(0.5, 1.0 - (soil_ec - 2.0) / 4.0)

            soil_factor = soil_suitability * ph_penalty * ec_penalty

            # 2. Water Factor (30% weight)
            # More water coverage = higher yield, but with diminishing returns
            water_factor = min(1.0, water_coverage_ratio + 0.2)

            # 3. Climate Factor (25% weight)
            # Temperature optimum (25-30°C for most crops)
            optimal_temp_range = (25, 30)
            if optimal_temp_range[0] <= season_avg_temp <= optimal_temp_range[1]:
                temp_factor = 1.0
            elif season_avg_temp < optimal_temp_range[0]:
                temp_factor = max(0.5, 1.0 - (optimal_temp_range[0] - season_avg_temp) / 10.0)
            else:
                temp_factor = max(0.5, 1.0 - (season_avg_temp - optimal_temp_range[1]) / 10.0)

            # Rainfall factor (200-400mm per season is good)
            optimal_rainfall_range = (200, 400)
            if optimal_rainfall_range[0] <= season_rainfall_mm <= optimal_rainfall_range[1]:
                rainfall_factor = 1.0
            elif season_rainfall_mm < optimal_rainfall_range[0]:
                rainfall_factor = max(0.6, season_rainfall_mm / optimal_rainfall_range[0])
            else:
                rainfall_factor = max(0.8, 1.0 - (season_rainfall_mm - optimal_rainfall_range[1]) / 1000.0)

            climate_factor = (temp_factor + rainfall_factor) / 2.0

            # 4. Growth Duration Factor (15% weight)
            # Longer duration crops typically have higher yields, but with diminishing returns
            # Normalize to typical 90-150 day range
            duration_normalized = growth_duration_days / 120.0
            duration_factor = min(1.2, max(0.7, duration_normalized))

            # Calculate predicted yield
            predicted_yield = base_yield * soil_factor * water_factor * climate_factor * duration_factor

            # 5. Adjust with historical average if available
            if historical_yield_avg is not None and historical_yield_avg > 0:
                # Weighted average: 70% heuristic, 30% historical
                predicted_yield = 0.7 * predicted_yield + 0.3 * historical_yield_avg

            # Add small random variation (±5%) to simulate natural variability
            variation = np.random.uniform(0.95, 1.05)
            predicted_yield *= variation

            # Ensure reasonable bounds (0.5 to 12 tonnes/ha)
            predicted_yield = max(0.5, min(12.0, predicted_yield))

            logger.debug(
                f"Yield prediction (heuristic) for {crop_id} in {field_id}: "
                f"{predicted_yield:.2f} t/ha "
                f"(soil={soil_factor:.2f}, water={water_factor:.2f}, "
                f"climate={climate_factor:.2f}, duration={duration_factor:.2f})"
            )

            return round(predicted_yield, 2)

        except Exception as e:
            logger.error(f"Heuristic yield prediction failed: {e}")
            # Return conservative default
            return 4.0

    def _predict_ml(
        self,
        field_id: str,
        crop_id: str,
        features: Dict[str, Any]
    ) -> Optional[float]:
        """
        ML-based yield prediction (if model is loaded).

        Args:
            field_id: Field identifier
            crop_id: Crop identifier
            features: Feature dictionary

        Returns:
            Predicted yield in tonnes per hectare, or None if prediction fails
        """
        if self._model is None:
            logger.error("ML model not loaded, cannot predict")
            return None

        try:
            feature_vector = self._prepare_features(features)
            prediction = float(self._model.predict([feature_vector])[0])
            logger.debug(f"Yield prediction (ML) for {crop_id} in {field_id}: {prediction:.2f} t/ha")
            return round(prediction, 2)
        except Exception as e:
            logger.error(f"ML yield prediction failed: {e}")
            # Fallback to heuristic
            return self._predict_heuristic(field_id, crop_id, features)

    def _prepare_features(self, features: Dict[str, Any]) -> list:
        """
        Prepare feature vector for ML model.

        Args:
            features: Feature dictionary

        Returns:
            List of feature values in correct order
        """
        # Define feature order expected by ML model
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

    def get_yield_factors(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Get individual yield factors for transparency.

        Args:
            features: Feature dictionary

        Returns:
            Dictionary with individual factor contributions
        """
        soil_suitability = features.get("soil_suitability", 0.7)
        water_coverage_ratio = features.get("water_coverage_ratio", 0.8)
        soil_ph = features.get("soil_ph", 6.5)
        soil_ec = features.get("soil_ec", 1.0)
        season_avg_temp = features.get("season_avg_temp", 28.0)
        season_rainfall_mm = features.get("season_rainfall_mm", 250.0)

        # Calculate factors
        optimal_ph = 6.5
        ph_deviation = abs(soil_ph - optimal_ph)
        ph_penalty = max(0, 1.0 - (ph_deviation / 2.0))
        ec_penalty = 1.0 if soil_ec <= 2.0 else max(0.5, 1.0 - (soil_ec - 2.0) / 4.0)
        soil_factor = soil_suitability * ph_penalty * ec_penalty

        water_factor = min(1.0, water_coverage_ratio + 0.2)

        # Temperature factor
        optimal_temp_range = (25, 30)
        if optimal_temp_range[0] <= season_avg_temp <= optimal_temp_range[1]:
            temp_factor = 1.0
        elif season_avg_temp < optimal_temp_range[0]:
            temp_factor = max(0.5, 1.0 - (optimal_temp_range[0] - season_avg_temp) / 10.0)
        else:
            temp_factor = max(0.5, 1.0 - (season_avg_temp - optimal_temp_range[1]) / 10.0)

        # Rainfall factor
        optimal_rainfall_range = (200, 400)
        if optimal_rainfall_range[0] <= season_rainfall_mm <= optimal_rainfall_range[1]:
            rainfall_factor = 1.0
        elif season_rainfall_mm < optimal_rainfall_range[0]:
            rainfall_factor = max(0.6, season_rainfall_mm / optimal_rainfall_range[0])
        else:
            rainfall_factor = max(0.8, 1.0 - (season_rainfall_mm - optimal_rainfall_range[1]) / 1000.0)

        climate_factor = (temp_factor + rainfall_factor) / 2.0

        return {
            "soil_factor": round(soil_factor, 3),
            "water_factor": round(water_factor, 3),
            "climate_factor": round(climate_factor, 3),
            "temp_factor": round(temp_factor, 3),
            "rainfall_factor": round(rainfall_factor, 3),
            "ph_penalty": round(ph_penalty, 3),
            "ec_penalty": round(ec_penalty, 3)
        }


# Module-level singleton instance
_yield_model: Optional[YieldModel] = None


def get_yield_model() -> YieldModel:
    """
    Get the singleton yield model instance.

    Returns:
        YieldModel: The shared yield model instance (auto-loaded with heuristic)
    """
    global _yield_model
    if _yield_model is None:
        _yield_model = YieldModel()
        logger.info("YieldModel instance created with rule-based heuristic")
    return _yield_model

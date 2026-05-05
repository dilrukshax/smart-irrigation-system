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
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Default artifact path relative to this file's directory.
_DEFAULT_MODEL_PATH = Path(__file__).parent.parent / "models" / "yield_regressor_gb.joblib"
_DEFAULT_P10_PATH = Path(__file__).parent.parent / "models" / "yield_regressor_p10.joblib"
_DEFAULT_P90_PATH = Path(__file__).parent.parent / "models" / "yield_regressor_p90.joblib"

# 9-feature order expected by the GBR artifact (must match bootstrap_yield_model.py).
_GBR_FEATURE_ORDER = [
    "soil_ph",
    "soil_ec",
    "soil_suitability",
    "water_availability_mm",
    "season_encoded",
    "growth_duration_days",
    "water_used_mm",
    "latitude",
    "longitude",
]


class YieldModel:
    """Yield prediction model: GBR artifact when available, heuristic fallback.

    At init, auto-discovers the trained GBR artifact at the default path.
    Preserves the 7-feature heuristic path as fallback when the artifact
    is absent or fails to load.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_loaded = True
        self.model_version = "1.0.0-heuristic"
        self._model = None
        self._model_p10 = None
        self._model_p90 = None
        self.use_heuristic = True

        # Auto-load from default location unless overridden or explicitly None.
        path = model_path if model_path is not None else str(_DEFAULT_MODEL_PATH)
        self.load_model(path)

    def load_model(self, model_path: str) -> bool:
        """Load the GBR artifact (and optional quantile siblings) from disk."""
        try:
            import joblib

            model_file = Path(model_path)
            if not model_file.exists():
                logger.info("Yield model file not found at %s — using heuristic", model_path)
                return False

            self._model = joblib.load(str(model_file))
            self.use_heuristic = False
            self.model_loaded = True
            self.model_version = getattr(self._model, "version", "2.0.0-gbr")
            logger.info("Yield GBR model loaded from %s", model_path)

            # Try loading quantile siblings for P10/P90 intervals.
            for attr, path in (("_model_p10", _DEFAULT_P10_PATH), ("_model_p90", _DEFAULT_P90_PATH)):
                if path.exists():
                    try:
                        setattr(self, attr, joblib.load(str(path)))
                        logger.info("Yield quantile model loaded from %s", path)
                    except Exception as qe:
                        logger.info("Quantile model %s not loaded: %s", path, qe)
            return True

        except Exception as exc:
            logger.warning("Failed to load yield ML model: %s — using heuristic", exc)
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
        if settings.is_ml_only_mode and (self._model is None or self.use_heuristic):
            raise RuntimeError(
                "ML-only mode is enabled and yield ML model artifact is unavailable."
            )
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
            if settings.is_ml_only_mode:
                return None
            return self._predict_heuristic(field_id, crop_id, features)

    def _prepare_features(self, features: Dict[str, Any]) -> list:
        """Prepare 9-feature vector for the GBR model in the expected order."""
        defaults: Dict[str, Any] = {
            "soil_ph": 6.5,
            "soil_ec": 1.0,
            "soil_suitability": 0.7,
            "water_availability_mm": 500.0,
            "season_encoded": 0,
            "growth_duration_days": 120,
            "water_used_mm": 700.0,
            "latitude": 8.0,
            "longitude": 80.5,
        }
        return [features.get(f, defaults[f]) for f in _GBR_FEATURE_ORDER]

    def get_yield_confidence_interval(
        self, features: Dict[str, Any]
    ) -> Tuple[float, float, float]:
        """Return (P10, P50, P90) yield confidence interval in t/ha.

        Falls back to symmetric ±15% around the point estimate when quantile
        models are not loaded.
        """
        p50 = self.predict("_ci", "_ci", features) or 4.0
        if self._model_p10 is not None and self._model_p90 is not None:
            try:
                fv = self._prepare_features(features)
                p10 = float(self._model_p10.predict([fv])[0])
                p90 = float(self._model_p90.predict([fv])[0])
                p10 = max(0.1, min(p10, p50))
                p90 = max(p50, p90)
                return round(p10, 2), round(p50, 2), round(p90, 2)
            except Exception as exc:
                logger.debug("Quantile prediction failed: %s", exc)
        # Symmetric fallback: ±15%
        return round(p50 * 0.85, 2), round(p50, 2), round(p50 * 1.15, 2)

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
    """Return the singleton YieldModel, auto-loading GBR artifact if present."""
    global _yield_model
    if _yield_model is None:
        _yield_model = YieldModel()
        mode = "GBR" if not _yield_model.use_heuristic else "heuristic"
        logger.info("YieldModel singleton created in %s mode", mode)
    return _yield_model

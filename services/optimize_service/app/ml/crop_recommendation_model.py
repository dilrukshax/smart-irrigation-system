"""
Crop Recommendation Model Wrapper
Loads and uses the trained Random Forest Classifier for crop recommendations
"""

import os
import joblib
import logging
import numpy as np
from typing import List, Dict, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class CropRecommendationModel:
    """Wrapper for the trained Random Forest crop recommendation model"""

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the crop recommendation model

        Args:
            model_path: Path to the trained model file. If None, uses default path.
        """
        self.model = None
        self.model_loaded = False

        if model_path is None:
            # Default path relative to this file
            base_dir = Path(__file__).parent.parent
            model_path = base_dir / "models" / "crop_recommendation_rf.joblib"

        self.model_path = str(model_path)

        # Load model on initialization
        self.load_model()

    def load_model(self) -> bool:
        """
        Load the trained Random Forest model from disk

        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"Crop recommendation model not found at {self.model_path}")
                return False

            logger.info(f"Loading crop recommendation model from {self.model_path}")
            self.model = joblib.load(self.model_path)
            self.model_loaded = True

            logger.info(f"Crop recommendation model loaded successfully")
            logger.info(f"Model type: {type(self.model).__name__}")
            logger.info(f"N estimators: {self.model.n_estimators}")
            logger.info(f"N features: {self.model.n_features_in_}")
            logger.info(f"N classes: {self.model.n_classes_}")

            return True

        except Exception as e:
            logger.error(f"Error loading crop recommendation model: {e}")
            self.model_loaded = False
            return False

    def predict_top_n(
        self,
        features: np.ndarray,
        crop_names: List[str],
        top_n: int = 3
    ) -> List[Dict[str, any]]:
        """
        Predict top-N recommended crops with confidence scores

        Args:
            features: Feature vector (16 features as per trained model)
            crop_names: List of crop names corresponding to model classes
            top_n: Number of top recommendations to return

        Returns:
            List of dicts with crop recommendations, sorted by confidence
            [{"crop_id": "CROP-001", "crop_name": "Paddy", "confidence": 0.85}, ...]
        """
        if not self.model_loaded:
            logger.warning("Model not loaded. Returning empty recommendations.")
            return []

        try:
            # Ensure features is 2D array
            if len(features.shape) == 1:
                features = features.reshape(1, -1)

            # Validate feature count
            if features.shape[1] != self.model.n_features_in_:
                logger.error(f"Expected {self.model.n_features_in_} features, got {features.shape[1]}")
                return []

            # Get prediction probabilities
            probabilities = self.model.predict_proba(features)[0]

            # Get top N indices
            top_indices = np.argsort(probabilities)[::-1][:top_n]

            # Build recommendations
            recommendations = []
            for idx in top_indices:
                confidence = float(probabilities[idx])

                # Get crop name from provided list or use class index
                if idx < len(crop_names):
                    crop_name = crop_names[idx]
                else:
                    crop_name = f"Crop_{idx}"

                recommendations.append({
                    "crop_id": f"CROP-{idx:03d}",
                    "crop_name": crop_name,
                    "confidence": round(confidence, 3),
                    "class_index": int(idx)
                })

            logger.info(f"Generated {len(recommendations)} crop recommendations")
            return recommendations

        except Exception as e:
            logger.error(f"Error predicting crops: {e}")
            return []

    def predict_single(self, features: np.ndarray) -> Tuple[int, float]:
        """
        Predict single best crop

        Args:
            features: Feature vector (16 features)

        Returns:
            Tuple of (predicted_class_index, confidence)
        """
        if not self.model_loaded:
            logger.warning("Model not loaded. Returning default prediction.")
            return 0, 0.0

        try:
            # Ensure features is 2D array
            if len(features.shape) == 1:
                features = features.reshape(1, -1)

            # Get prediction and probability
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            confidence = float(probabilities[prediction])

            return int(prediction), confidence

        except Exception as e:
            logger.error(f"Error predicting single crop: {e}")
            return 0, 0.0

    def get_feature_names(self) -> List[str]:
        """
        Get expected feature names for the model

        Returns:
            List of feature names (based on typical crop recommendation features)
        """
        # These are typical features for crop recommendation models
        # You may need to adjust based on your actual training data
        return [
            "soil_suitability",
            "water_coverage_ratio",
            "soil_ph",
            "soil_ec",
            "season_avg_temp",
            "season_rainfall_mm",
            "growth_duration_days",
            "climate_score",
            "price_zscore",
            "historical_yield_avg",
            "water_sensitivity_encoded",
            "terrain_type_encoded",
            "soil_type_encoded",
            "season_encoded",
            "location_latitude",
            "location_longitude"
        ]


# Global model instance
_crop_recommendation_model = None


def get_crop_recommendation_model() -> CropRecommendationModel:
    """
    Get the global crop recommendation model instance (singleton pattern)

    Returns:
        CropRecommendationModel instance
    """
    global _crop_recommendation_model

    if _crop_recommendation_model is None:
        _crop_recommendation_model = CropRecommendationModel()

    return _crop_recommendation_model


def predict_crops(
    features: np.ndarray,
    crop_names: List[str],
    top_n: int = 3
) -> List[Dict[str, any]]:
    """
    Convenience function to get crop recommendations

    Args:
        features: Feature vector (16 features)
        crop_names: List of crop names
        top_n: Number of recommendations

    Returns:
        List of crop recommendations
    """
    model = get_crop_recommendation_model()
    return model.predict_top_n(features, crop_names, top_n)

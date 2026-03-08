"""
Smart Irrigation ML Model

Provides machine learning-based irrigation predictions using
a RandomForestClassifier loaded from disk for production inference.
"""

from pathlib import Path
import logging
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, Any, Optional

try:
    import joblib
    JOBLIB_AVAILABLE = True
except Exception:
    JOBLIB_AVAILABLE = False

logger = logging.getLogger(__name__)


class SmartIrrigationSystem:
    """
    ML-based irrigation prediction system.
    
    Uses a RandomForestClassifier to predict irrigation needs
    based on soil moisture, temperature, humidity, and time of day.
    """

    MODEL_NAME = "RandomForestClassifier"
    MODEL_VERSION = "1.1.0"
    INPUT_CONTRACT_VERSION = "v1"
    REQUIRED_FEATURES = ("soil_moisture", "temperature", "humidity", "hour_of_day")

    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[RandomForestClassifier] = None
        self._is_trained = False
        self._model_path = model_path or str(
            Path(__file__).resolve().parents[2] / "notebooks" / "irrigation_rf_model.joblib"
        )

    def load_model(self, model_path: Optional[str] = None) -> bool:
        """Load model artifact from disk for inference."""
        if not JOBLIB_AVAILABLE:
            logger.error("joblib dependency not available for model loading.")
            return False

        model_file = Path(model_path or self._model_path)
        if not model_file.exists():
            logger.warning("Irrigation model artifact not found at %s", model_file)
            return False

        try:
            loaded = joblib.load(str(model_file))
            if not isinstance(loaded, RandomForestClassifier):
                logger.error("Unexpected irrigation model type: %s", type(loaded).__name__)
                return False
            self.model = loaded
            self._is_trained = True
            logger.info("Irrigation model loaded from %s", model_file)
            return True
        except Exception as exc:
            logger.error("Failed to load irrigation model: %s", exc)
            return False

    def train_model(self, save_path: Optional[str] = None):
        """
        Train the irrigation prediction model with synthetic data.
        
        In production, this would load pre-trained weights or
        train on actual historical sensor data.
        """
        logger.info("Training irrigation prediction model...")
        
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        X = np.random.rand(n_samples, 4)
        X[:, 0] = X[:, 0] * 100  # soil moisture (0-100%)
        X[:, 1] = X[:, 1] * 20 + 20  # temperature (20-40°C)
        X[:, 2] = X[:, 2] * 60 + 30  # humidity (30-90%)
        X[:, 3] = X[:, 3] * 24  # time of day (0-24 hours)
        
        # Rule: irrigate if soil moisture < 30% and temp > 25°C
        y = ((X[:, 0] < 30) & (X[:, 1] > 25)).astype(int)
        
        self.model = RandomForestClassifier(n_estimators=10, random_state=42)
        self.model.fit(X, y)
        self._is_trained = True

        if save_path and JOBLIB_AVAILABLE:
            try:
                joblib.dump(self.model, save_path)
                logger.info("Saved irrigation model artifact at %s", save_path)
            except Exception as exc:
                logger.warning("Unable to save irrigation model artifact: %s", exc)
        
        logger.info(f"Model trained successfully with {n_samples} samples")

    def _validate_input(
        self,
        *,
        soil_moisture: float,
        temperature: float,
        humidity: float,
        hour_of_day: int,
    ) -> Dict[str, float]:
        """Validate and normalize inference inputs."""
        payload = {
            "soil_moisture": float(soil_moisture),
            "temperature": float(temperature),
            "humidity": float(humidity),
            "hour_of_day": int(hour_of_day),
        }

        if not 0.0 <= payload["soil_moisture"] <= 100.0:
            raise ValueError("soil_moisture must be in range [0, 100]")
        if not -20.0 <= payload["temperature"] <= 70.0:
            raise ValueError("temperature must be in range [-20, 70]")
        if not 0.0 <= payload["humidity"] <= 100.0:
            raise ValueError("humidity must be in range [0, 100]")
        if not 0 <= payload["hour_of_day"] <= 23:
            raise ValueError("hour_of_day must be in range [0, 23]")

        return payload
    
    def predict_irrigation_need(
        self,
        soil_moisture: float,
        temperature: float,
        humidity: float,
        hour_of_day: int,
    ) -> Dict[str, Any]:
        """
        Predict if irrigation is needed based on sensor data.
        
        Args:
            soil_moisture: Soil moisture percentage (0-100)
            temperature: Temperature in Celsius
            humidity: Humidity percentage (0-100)
            hour_of_day: Current hour (0-23)
        
        Returns:
            Dict with prediction results including:
            - irrigation_needed: bool
            - confidence: float
            - recommendation: str ("WATER_ON" or "WATER_OFF")
        """
        if not self._is_trained or self.model is None:
            raise RuntimeError("Model not trained. Call train_model() first.")

        normalized = self._validate_input(
            soil_moisture=soil_moisture,
            temperature=temperature,
            humidity=humidity,
            hour_of_day=hour_of_day,
        )

        features = np.array([[
            normalized["soil_moisture"],
            normalized["temperature"],
            normalized["humidity"],
            normalized["hour_of_day"],
        ]])
        
        prediction = self.model.predict(features)[0]
        confidence = self.model.predict_proba(features)[0].max()
        
        return {
            "irrigation_needed": bool(prediction),
            "confidence": round(float(confidence), 3),
            "recommendation": "WATER_ON" if prediction else "WATER_OFF",
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "input_contract_version": self.INPUT_CONTRACT_VERSION,
            "features_used_count": len(self.REQUIRED_FEATURES),
            "data_available": True,
        }
    
    @property
    def is_ready(self) -> bool:
        """Check if model is trained and ready for predictions."""
        return self._is_trained and self.model is not None

    @property
    def model_path(self) -> str:
        return self._model_path


# Singleton instance
irrigation_model = SmartIrrigationSystem()

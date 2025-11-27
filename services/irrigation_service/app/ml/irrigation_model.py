"""
Smart Irrigation ML Model

Provides machine learning-based irrigation predictions using
a RandomForestClassifier trained on synthetic sensor data.
"""

import logging
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class SmartIrrigationSystem:
    """
    ML-based irrigation prediction system.
    
    Uses a RandomForestClassifier to predict irrigation needs
    based on soil moisture, temperature, humidity, and time of day.
    """
    
    def __init__(self):
        self.model: Optional[RandomForestClassifier] = None
        self._is_trained = False
    
    def train_model(self):
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
        
        logger.info(f"Model trained successfully with {n_samples} samples")
    
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
        
        features = np.array([[
            soil_moisture,
            temperature,
            humidity,
            hour_of_day
        ]])
        
        prediction = self.model.predict(features)[0]
        confidence = self.model.predict_proba(features)[0].max()
        
        return {
            "irrigation_needed": bool(prediction),
            "confidence": round(float(confidence), 3),
            "recommendation": "WATER_ON" if prediction else "WATER_OFF",
        }
    
    @property
    def is_ready(self) -> bool:
        """Check if model is trained and ready for predictions."""
        return self._is_trained and self.model is not None


# Singleton instance
irrigation_model = SmartIrrigationSystem()

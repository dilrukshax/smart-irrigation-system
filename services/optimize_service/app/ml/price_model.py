"""
Price Prediction Model - LightGBM Implementation

This module provides crop price prediction functionality using a trained LightGBM model.
The model predicts expected market price (Rs per kg) based on 24 features:
- Location & spatial (location_encoded, latitude, longitude, elevation, dist_to_coast_km)
- Temporal (month, quarter, season_encoded, monsoon_encoded)
- Weather (temp_mean_weekly, precip_weekly_sum, radiation_weekly_sum, et0_weekly_sum, temp_range_weekly)
- Crop (item_encoded, gdd_weekly, water_stress_index)
- Price history (price_lag_1w, price_lag_4w, price_lag_12w, price_ma_4w, price_ma_12w, price_std_12w, price_change_pct_4w)
"""

import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class PriceModel:
    """
    Price prediction model using LightGBM for crop profitability analysis.

    Predicts expected market price at harvest time for different crops.
    Requires 24 features to be engineered from field, weather, and historical data.
    """

    def __init__(self, model_dir: Optional[str] = None):
        """
        Initialize the price model.

        Args:
            model_dir: Directory containing model and encoder files
        """
        self.model_loaded = False
        self.model_version = "1.0.0"
        self._model = None
        self._encoders = {}

        # Default model directory
        if model_dir is None:
            base_dir = Path(__file__).parent.parent
            model_dir = base_dir / "models"

        self.model_dir = Path(model_dir)

        # Model and encoder file paths
        self.model_path = self.model_dir / "price_prediction_lgb.joblib"
        self.encoder_paths = {
            'item': self.model_dir / "label_encoder_item.joblib",
            'location': self.model_dir / "label_encoder_location.joblib",
            'season': self.model_dir / "label_encoder_season.joblib",
            'monsoon': self.model_dir / "label_encoder_monsoon.joblib"
        }

        # Expected feature names (24 features)
        self.feature_names = [
            'location_encoded', 'month', 'quarter', 'season_encoded', 'monsoon_encoded',
            'temp_mean_weekly', 'precip_weekly_sum', 'radiation_weekly_sum', 'et0_weekly_sum',
            'latitude', 'longitude', 'elevation', 'gdd_weekly', 'water_stress_index',
            'dist_to_coast_km', 'temp_range_weekly', 'item_encoded',
            'price_lag_1w', 'price_lag_4w', 'price_lag_12w',
            'price_ma_4w', 'price_ma_12w', 'price_std_12w', 'price_change_pct_4w'
        ]

        # Cache for weather and price data
        self._price_history_cache = {}
        self._weather_cache = {}

        # Load model on initialization
        self.load_model()

    def load_model(self) -> bool:
        """
        Load the trained LightGBM model and all label encoders.

        Returns:
            bool: True if all components loaded successfully
        """
        try:
            # Load LightGBM model
            if not self.model_path.exists():
                logger.error(f"Price prediction model not found at {self.model_path}")
                return False

            logger.info(f"Loading price prediction model from {self.model_path}")
            self._model = joblib.load(str(self.model_path))

            # Load all label encoders
            for encoder_name, encoder_path in self.encoder_paths.items():
                if not encoder_path.exists():
                    logger.warning(f"Label encoder '{encoder_name}' not found at {encoder_path}")
                    continue

                self._encoders[encoder_name] = joblib.load(str(encoder_path))
                logger.info(f"Loaded {encoder_name} encoder with {len(self._encoders[encoder_name].classes_)} classes")

            # Verify all encoders loaded
            required_encoders = ['item', 'location', 'season', 'monsoon']
            if not all(enc in self._encoders for enc in required_encoders):
                logger.error("Not all required encoders loaded")
                return False

            self.model_loaded = True
            logger.info(f"Price prediction model loaded successfully with {len(self.feature_names)} features")

            return True

        except Exception as e:
            logger.error(f"Error loading price prediction model: {e}")
            self.model_loaded = False
            return False

    def _encode_categorical(self, value: str, encoder_name: str, default: int = 0) -> int:
        """
        Encode a categorical value using the appropriate label encoder.

        Args:
            value: String value to encode
            encoder_name: Name of encoder to use ('item', 'location', 'season', 'monsoon')
            default: Default value if encoding fails

        Returns:
            Encoded integer value
        """
        if encoder_name not in self._encoders:
            logger.warning(f"Encoder '{encoder_name}' not found, using default value")
            return default

        encoder = self._encoders[encoder_name]

        try:
            # Check if value exists in encoder classes
            if value in encoder.classes_:
                return int(encoder.transform([value])[0])
            else:
                logger.warning(f"Value '{value}' not in {encoder_name} encoder classes, using default")
                return default
        except Exception as e:
            logger.warning(f"Error encoding {value} with {encoder_name}: {e}")
            return default

    def engineer_features(
        self,
        crop_name: str,
        location: str,
        forecast_date: datetime,
        weather_data: Optional[Dict[str, float]] = None,
        historical_prices: Optional[List[float]] = None,
        field_data: Optional[Dict[str, any]] = None
    ) -> Optional[np.ndarray]:
        """
        Engineer the 24 required features for price prediction.

        Args:
            crop_name: Name of the crop (e.g., "Tomato", "Onion")
            location: Location name (e.g., "Kandy", "Dambulla")
            forecast_date: Target date for price prediction
            weather_data: Dict with weather features (temp, precip, radiation, et0, etc.)
            historical_prices: List of historical prices (weekly, last 12 weeks)
            field_data: Dict with field properties (latitude, longitude, elevation)

        Returns:
            numpy array of 24 features, or None if feature engineering fails
        """
        try:
            features = {}

            # 1. Encode location
            features['location_encoded'] = self._encode_categorical(location, 'location')

            # 2. Temporal features
            features['month'] = forecast_date.month
            features['quarter'] = (forecast_date.month - 1) // 3 + 1

            # 3. Encode season (based on month)
            season = self._get_season(forecast_date.month)
            features['season_encoded'] = self._encode_categorical(season, 'season')

            # 4. Encode monsoon
            monsoon = self._get_monsoon(forecast_date.month)
            features['monsoon_encoded'] = self._encode_categorical(monsoon, 'monsoon')

            # 5. Weather features (use provided data or defaults)
            if weather_data:
                features['temp_mean_weekly'] = weather_data.get('temp_mean', 28.0)
                features['precip_weekly_sum'] = weather_data.get('precip_sum', 50.0)
                features['radiation_weekly_sum'] = weather_data.get('radiation_sum', 150.0)
                features['et0_weekly_sum'] = weather_data.get('et0_sum', 30.0)
                features['temp_range_weekly'] = weather_data.get('temp_range', 8.0)
            else:
                # Use Sri Lankan typical values as defaults
                features['temp_mean_weekly'] = 28.0
                features['precip_weekly_sum'] = 50.0
                features['radiation_weekly_sum'] = 150.0
                features['et0_weekly_sum'] = 30.0
                features['temp_range_weekly'] = 8.0

            # 6. Spatial features (use provided data or defaults)
            if field_data:
                features['latitude'] = field_data.get('latitude', 7.8731)  # Center of Sri Lanka
                features['longitude'] = field_data.get('longitude', 80.7718)
                features['elevation'] = field_data.get('elevation', 300.0)
                features['dist_to_coast_km'] = field_data.get('dist_to_coast', 50.0)
            else:
                # Default to center of Sri Lanka
                features['latitude'] = 7.8731
                features['longitude'] = 80.7718
                features['elevation'] = 300.0
                features['dist_to_coast_km'] = 50.0

            # 7. Crop-specific features
            features['item_encoded'] = self._encode_categorical(crop_name, 'item')

            # Calculate GDD (Growing Degree Days) - simplified
            base_temp = 10.0  # Base temperature for most crops
            features['gdd_weekly'] = max(0, (features['temp_mean_weekly'] - base_temp) * 7)

            # Calculate water stress index (simplified)
            # Higher when rainfall is low and ET0 is high
            features['water_stress_index'] = features['et0_weekly_sum'] / max(features['precip_weekly_sum'], 1.0)

            # 8. Price history features
            if historical_prices and len(historical_prices) >= 12:
                features['price_lag_1w'] = historical_prices[-1]
                features['price_lag_4w'] = historical_prices[-4]
                features['price_lag_12w'] = historical_prices[-12]
                features['price_ma_4w'] = np.mean(historical_prices[-4:])
                features['price_ma_12w'] = np.mean(historical_prices[-12:])
                features['price_std_12w'] = np.std(historical_prices[-12:])
                features['price_change_pct_4w'] = ((historical_prices[-1] - historical_prices[-4]) / historical_prices[-4]) * 100 if historical_prices[-4] > 0 else 0.0
            else:
                # Use default values if no history available
                default_price = 50.0  # Rs per kg
                features['price_lag_1w'] = default_price
                features['price_lag_4w'] = default_price
                features['price_lag_12w'] = default_price
                features['price_ma_4w'] = default_price
                features['price_ma_12w'] = default_price
                features['price_std_12w'] = 5.0
                features['price_change_pct_4w'] = 0.0

            # Convert to numpy array in correct order
            feature_array = np.array([features[fname] for fname in self.feature_names])

            logger.debug(f"Engineered 24 features for {crop_name} at {location}")
            return feature_array.reshape(1, -1)

        except Exception as e:
            logger.error(f"Error engineering features: {e}")
            return None

    def _get_season(self, month: int) -> str:
        """Get season name for Sri Lanka based on month"""
        if month in [5, 6, 7, 8, 9]:
            return "Yala"  # Southwest monsoon (May-Sep)
        else:
            return "Maha"  # Northeast monsoon (Oct-Apr)

    def _get_monsoon(self, month: int) -> str:
        """Get monsoon type for Sri Lanka based on month"""
        if month in [5, 6, 7, 8, 9]:
            return "Southwest"
        elif month in [10, 11, 12, 1, 2]:
            return "Northeast"
        else:
            return "Inter-monsoon"

    def predict(
        self,
        crop_id: str = None,
        crop_name: str = None,
        location: str = "Kandy",
        season: Optional[str] = None,
        horizon_days: int = 120,
        weather_data: Optional[Dict[str, float]] = None,
        historical_prices: Optional[List[float]] = None,
        field_data: Optional[Dict[str, any]] = None
    ) -> Optional[float]:
        """
        Predict market price for a crop at harvest time.

        Args:
            crop_id: Crop identifier (optional, for logging)
            crop_name: Crop name (e.g., "Tomato", "Onion")
            location: Location name (e.g., "Kandy", "Dambulla")
            season: Growing season (optional, auto-detected from current date)
            horizon_days: Days until harvest (forecast horizon)
            weather_data: Weather features dict
            historical_prices: List of weekly historical prices
            field_data: Field properties dict

        Returns:
            Predicted price per kg (Rs), or None if prediction fails
        """
        if not self.model_loaded or self._model is None:
            logger.error("Price model not loaded. Cannot make predictions.")
            return None

        try:
            # Calculate forecast date
            forecast_date = datetime.now() + timedelta(days=horizon_days)

            # Use crop_name if provided, otherwise try to infer from crop_id
            if crop_name is None:
                crop_name = "Tomato"  # Default crop
                logger.warning(f"No crop_name provided, using default: {crop_name}")

            # Engineer features
            features = self.engineer_features(
                crop_name=crop_name,
                location=location,
                forecast_date=forecast_date,
                weather_data=weather_data,
                historical_prices=historical_prices,
                field_data=field_data
            )

            if features is None:
                logger.error("Feature engineering failed")
                return None

            # Make prediction
            prediction = self._model.predict(features)[0]

            # Ensure prediction is positive
            prediction = max(prediction, 1.0)

            logger.info(f"Price prediction for {crop_name} at {location}: Rs {prediction:.2f}/kg")
            return round(float(prediction), 2)

        except Exception as e:
            logger.error(f"Price prediction failed: {e}")
            return None

    def get_price_confidence(
        self,
        crop_name: str,
        location: str = "Kandy",
        **kwargs
    ) -> Optional[Dict[str, float]]:
        """
        Get confidence interval for price prediction.

        Args:
            crop_name: Crop name
            location: Location name
            **kwargs: Additional arguments for feature engineering

        Returns:
            Dict with 'low', 'mid', 'high' price estimates
        """
        if not self.model_loaded:
            logger.error("Price model not loaded. Cannot get confidence intervals.")
            return None

        try:
            # Get base prediction
            mid_price = self.predict(crop_name=crop_name, location=location, **kwargs)

            if mid_price is None:
                return None

            # Estimate confidence interval (±15% for LightGBM)
            confidence_margin = 0.15
            low_price = mid_price * (1 - confidence_margin)
            high_price = mid_price * (1 + confidence_margin)

            return {
                'low': round(low_price, 2),
                'mid': round(mid_price, 2),
                'high': round(high_price, 2)
            }

        except Exception as e:
            logger.error(f"Failed to get price confidence: {e}")
            return None

    def get_risk_band(self, crop_name: str, **kwargs) -> str:
        """
        Get price risk classification for a crop.

        Args:
            crop_name: Crop name
            **kwargs: Additional arguments

        Returns:
            Risk band: "low", "medium", "high"
        """
        if not self.model_loaded:
            return "unknown"

        try:
            confidence = self.get_price_confidence(crop_name, **kwargs)

            if confidence is None:
                return "unknown"

            # Calculate relative variation
            variation = (confidence['high'] - confidence['low']) / confidence['mid']

            if variation < 0.2:
                return "low"
            elif variation < 0.4:
                return "medium"
            else:
                return "high"

        except Exception:
            return "unknown"


# Module-level singleton instance
_price_model: Optional[PriceModel] = None


def get_price_model() -> PriceModel:
    """
    Get the singleton price model instance.

    Returns:
        PriceModel: The shared price model instance (auto-loaded on first call)
    """
    global _price_model
    if _price_model is None:
        _price_model = PriceModel()
    return _price_model

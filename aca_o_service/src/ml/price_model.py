"""
Price Prediction Model

This module provides crop price prediction functionality.
The model predicts expected market price (per kg) based on:
- Historical price trends
- Seasonal patterns
- National supply/demand expectations
- External market factors

Current Status:
    STUB implementation with static price estimates.
    Replace with actual time series forecasting model.

Future Implementation:
    1. Use ARIMA, Prophet, or LSTM for price forecasting
    2. Incorporate external data (imports, exports, weather)
    3. Train on historical price data from PriceRecord table
    4. Consider seasonal decomposition
    5. Ensemble with sentiment analysis from news
"""

import logging
from typing import Dict, Any, Optional
import hashlib

logger = logging.getLogger(__name__)


class PriceModel:
    """
    Price prediction model for crop profitability analysis.
    
    Predicts expected market price at harvest time for different crops.
    Used to estimate profitability in crop recommendations.
    
    Usage:
        model = PriceModel()
        model.load_model()
        
        price = model.predict(crop_id="CROP-001")
        # Returns predicted price per kg
    
    Attributes:
        model_loaded: Whether the model is ready
        model_version: Version string
    """
    
    def __init__(self):
        """Initialize the price model."""
        self.model_loaded = False
        self.model_version = "stub-v0.1"
        self._model = None
        
        # Base prices by crop (LKR per kg)
        # These are approximate Sri Lankan farmgate prices
        self._base_prices = {
            "CROP-001": 85.0,   # Rice
            "CROP-002": 70.0,   # Maize
            "CROP-003": 350.0,  # Green Gram
            "CROP-004": 450.0,  # Chilli
            "CROP-005": 180.0,  # Onion
        }
        
        # Price volatility factors (standard deviation as fraction of price)
        self._volatility = {
            "CROP-001": 0.10,  # Rice - relatively stable
            "CROP-002": 0.15,  # Maize
            "CROP-003": 0.25,  # Green Gram - more volatile
            "CROP-004": 0.35,  # Chilli - highly volatile
            "CROP-005": 0.40,  # Onion - very volatile
        }
    
    def load_model(self, model_path: Optional[str] = None) -> bool:
        """
        Load the trained price prediction model.
        
        Args:
            model_path: Path to saved model (if any)
        
        Returns:
            bool: True if model ready
        
        TODO:
            Implement actual model loading for time series forecasting:
            ```python
            from prophet import Prophet
            import joblib
            self._model = joblib.load(model_path)
            ```
        """
        logger.info(f"Loading price model (version: {self.model_version})")
        
        # STUB: Always succeed
        self.model_loaded = True
        logger.info("Price model ready (stub mode)")
        
        return self.model_loaded
    
    def predict(
        self,
        crop_id: str,
        season: Optional[str] = None,
        horizon_days: int = 120,
    ) -> float:
        """
        Predict market price for a crop at harvest time.
        
        Args:
            crop_id: Crop identifier
            season: Growing season (affects seasonal price patterns)
            horizon_days: Days until harvest (forecast horizon)
        
        Returns:
            Predicted price per kg in local currency (LKR)
        
        Example:
            price = model.predict(crop_id="CROP-001", season="Maha-2025")
            # Returns: 88.5 (LKR per kg)
        """
        if not self.model_loaded:
            self.load_model()
        
        # STUB: Use base price with deterministic variation
        price = self._stub_predict(crop_id, season, horizon_days)
        
        logger.debug(f"Price prediction for {crop_id}: {price:.2f} LKR/kg")
        
        return price
    
    def _stub_predict(
        self,
        crop_id: str,
        season: Optional[str],
        horizon_days: int,
    ) -> float:
        """
        Stub prediction using simple heuristics.
        
        Creates deterministic price predictions based on:
        - Base prices by crop
        - Seasonal adjustment
        - Pseudo-random variation
        """
        # Get base price
        base_price = self._base_prices.get(crop_id, 100.0)
        
        # Seasonal adjustment
        seasonal_factor = 1.0
        if season:
            if "maha" in season.lower():
                # Maha harvest (Feb-Mar): More supply, slightly lower prices
                seasonal_factor = 0.95
            elif "yala" in season.lower():
                # Yala harvest (Aug-Sep): Less supply, slightly higher prices
                seasonal_factor = 1.05
        
        # Deterministic "random" variation using crop_id hash
        hash_val = int(hashlib.md5(f"{crop_id}_{season}".encode()).hexdigest()[:8], 16)
        variation = 0.9 + (hash_val % 21) / 100  # 0.90 to 1.10
        
        # Calculate predicted price
        predicted = base_price * seasonal_factor * variation
        
        return round(predicted, 2)
    
    def get_price_confidence(self, crop_id: str) -> Dict[str, float]:
        """
        Get confidence interval for price prediction.
        
        Returns low, mid, and high price estimates based on
        historical volatility.
        
        Args:
            crop_id: Crop identifier
        
        Returns:
            Dict with 'low', 'mid', 'high' price estimates
        """
        base = self._base_prices.get(crop_id, 100.0)
        vol = self._volatility.get(crop_id, 0.20)
        
        return {
            "low": round(base * (1 - vol), 2),
            "mid": base,
            "high": round(base * (1 + vol), 2),
        }
    
    def get_risk_band(self, crop_id: str) -> str:
        """
        Get price risk classification for a crop.
        
        Args:
            crop_id: Crop identifier
        
        Returns:
            Risk band: "low", "medium", or "high"
        """
        vol = self._volatility.get(crop_id, 0.20)
        
        if vol <= 0.15:
            return "low"
        elif vol <= 0.30:
            return "medium"
        else:
            return "high"


# Module-level singleton instance
_price_model: Optional[PriceModel] = None


def get_price_model() -> PriceModel:
    """
    Get the singleton price model instance.
    
    Returns:
        PriceModel: The shared price model instance
    """
    global _price_model
    if _price_model is None:
        _price_model = PriceModel()
        _price_model.load_model()
    return _price_model

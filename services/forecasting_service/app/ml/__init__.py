# Machine Learning Module

# Try to import advanced forecasting, but make it optional
try:
    from .advanced_forecasting import AdvancedForecastingSystem
    ADVANCED_ML_AVAILABLE = True
except ImportError as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Advanced ML features not available: {e}")
    logger.warning("TensorFlow not installed. Using basic forecasting only.")
    ADVANCED_ML_AVAILABLE = False
    AdvancedForecastingSystem = None

# Import the main forecasting system
from .forecasting_system import forecasting_system

__all__ = ['forecasting_system', 'AdvancedForecastingSystem', 'ADVANCED_ML_AVAILABLE']

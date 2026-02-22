"""
ARIMA and SARIMA Models for Time Series Forecasting

Provides statistical time series models for water level and rainfall forecasting:
- ARIMA (AutoRegressive Integrated Moving Average)
- SARIMA (Seasonal ARIMA)
- Auto ARIMA (automatic parameter selection)

These models complement the ML-based approaches for more robust ensemble forecasting.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import warnings

logger = logging.getLogger(__name__)

# Try to import statsmodels
try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.statespace.sarimax import SARIMAX
    from statsmodels.tsa.stattools import adfuller, acf, pacf
    from statsmodels.tsa.seasonal import seasonal_decompose
    STATSMODELS_AVAILABLE = True
    logger.info("Statsmodels available - ARIMA/SARIMA models enabled")
except ImportError:
    STATSMODELS_AVAILABLE = False
    logger.warning("Statsmodels not available - ARIMA/SARIMA models disabled")

# Try to import pmdarima for auto ARIMA
try:
    import pmdarima as pm
    PMDARIMA_AVAILABLE = True
    logger.info("pmdarima available - Auto ARIMA enabled")
except ImportError:
    PMDARIMA_AVAILABLE = False
    logger.warning("pmdarima not available - Auto ARIMA disabled")


class ARIMAForecaster:
    """
    ARIMA and SARIMA model wrapper for time series forecasting.
    
    Supports:
    - Manual ARIMA with specified (p, d, q) parameters
    - Manual SARIMA with seasonal (P, D, Q, s) parameters
    - Auto ARIMA for automatic parameter selection
    - Multiple data types (water level, rainfall, temperature)
    """
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.fitted_models: Dict[str, Any] = {}
        self.model_params: Dict[str, Dict] = {}
        self.training_data: Dict[str, np.ndarray] = {}
        self.is_trained: Dict[str, bool] = {}
    
    @property
    def available(self) -> bool:
        """Check if ARIMA models are available."""
        return STATSMODELS_AVAILABLE
    
    def check_stationarity(self, data: np.ndarray) -> Dict[str, Any]:
        """
        Check stationarity of time series using Augmented Dickey-Fuller test.
        
        Args:
            data: Time series data
            
        Returns:
            Dict with stationarity test results
        """
        if not STATSMODELS_AVAILABLE:
            return {"error": "statsmodels not available"}
        
        try:
            result = adfuller(data)
            return {
                "adf_statistic": float(result[0]),
                "p_value": float(result[1]),
                "used_lag": int(result[2]),
                "n_observations": int(result[3]),
                "critical_values": {k: float(v) for k, v in result[4].items()},
                "is_stationary": result[1] < 0.05,
                "interpretation": "Stationary" if result[1] < 0.05 else "Non-stationary"
            }
        except Exception as e:
            logger.error(f"Error in stationarity test: {e}")
            return {"error": str(e)}
    
    def decompose_series(
        self,
        data: np.ndarray,
        period: int = 24
    ) -> Dict[str, List[float]]:
        """
        Decompose time series into trend, seasonal, and residual components.
        
        Args:
            data: Time series data
            period: Seasonal period (default 24 for hourly data)
            
        Returns:
            Dict with decomposed components
        """
        if not STATSMODELS_AVAILABLE:
            return {"error": "statsmodels not available"}
        
        try:
            if len(data) < period * 2:
                return {"error": f"Need at least {period * 2} observations for decomposition"}
            
            decomposition = seasonal_decompose(data, model='additive', period=period)
            
            # Handle NaN values from decomposition edges
            trend = decomposition.trend
            seasonal = decomposition.seasonal
            resid = decomposition.resid
            
            return {
                "trend": [float(x) if not np.isnan(x) else None for x in trend],
                "seasonal": [float(x) if not np.isnan(x) else None for x in seasonal],
                "residual": [float(x) if not np.isnan(x) else None for x in resid],
                "period": period
            }
        except Exception as e:
            logger.error(f"Error in decomposition: {e}")
            return {"error": str(e)}
    
    def get_acf_pacf(
        self,
        data: np.ndarray,
        lags: int = 40
    ) -> Dict[str, List[float]]:
        """
        Calculate ACF and PACF for model order selection.
        
        Args:
            data: Time series data
            lags: Number of lags to compute
            
        Returns:
            Dict with ACF and PACF values
        """
        if not STATSMODELS_AVAILABLE:
            return {"error": "statsmodels not available"}
        
        try:
            acf_values = acf(data, nlags=min(lags, len(data) // 2 - 1))
            pacf_values = pacf(data, nlags=min(lags, len(data) // 2 - 1))
            
            return {
                "acf": [float(x) for x in acf_values],
                "pacf": [float(x) for x in pacf_values],
                "lags": list(range(len(acf_values)))
            }
        except Exception as e:
            logger.error(f"Error computing ACF/PACF: {e}")
            return {"error": str(e)}
    
    def train_arima(
        self,
        data: np.ndarray,
        data_type: str,
        order: Tuple[int, int, int] = (1, 1, 1),
        seasonal_order: Optional[Tuple[int, int, int, int]] = None
    ) -> Dict[str, Any]:
        """
        Train ARIMA or SARIMA model.
        
        Args:
            data: Training time series data
            data_type: Type of data ('water_level', 'rainfall', 'temperature')
            order: ARIMA order (p, d, q)
            seasonal_order: Optional SARIMA seasonal order (P, D, Q, s)
            
        Returns:
            Dict with training results
        """
        if not STATSMODELS_AVAILABLE:
            return {"status": "error", "message": "statsmodels not available"}
        
        try:
            self.training_data[data_type] = data
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                
                if seasonal_order:
                    model = SARIMAX(
                        data,
                        order=order,
                        seasonal_order=seasonal_order,
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    model_name = f"SARIMA{order}x{seasonal_order}"
                else:
                    model = ARIMA(data, order=order)
                    model_name = f"ARIMA{order}"
                
                fitted = model.fit()
            
            self.models[data_type] = model
            self.fitted_models[data_type] = fitted
            self.model_params[data_type] = {
                "order": order,
                "seasonal_order": seasonal_order,
                "model_type": model_name
            }
            self.is_trained[data_type] = True
            
            # Calculate fit metrics
            residuals = fitted.resid
            
            return {
                "status": "success",
                "data_type": data_type,
                "model_type": model_name,
                "order": order,
                "seasonal_order": seasonal_order,
                "n_observations": len(data),
                "metrics": {
                    "aic": float(fitted.aic),
                    "bic": float(fitted.bic),
                    "rmse": float(np.sqrt(np.mean(residuals**2))),
                    "mae": float(np.mean(np.abs(residuals)))
                }
            }
            
        except Exception as e:
            logger.error(f"Error training ARIMA for {data_type}: {e}")
            return {"status": "error", "message": str(e)}
    
    def train_auto_arima(
        self,
        data: np.ndarray,
        data_type: str,
        seasonal: bool = True,
        m: int = 24  # Seasonal period
    ) -> Dict[str, Any]:
        """
        Train model using Auto ARIMA for automatic parameter selection.
        
        Args:
            data: Training time series data
            data_type: Type of data
            seasonal: Whether to fit seasonal ARIMA
            m: Seasonal period (24 for hourly, 7 for daily)
            
        Returns:
            Dict with training results including selected parameters
        """
        if not PMDARIMA_AVAILABLE:
            # Fall back to default ARIMA parameters
            logger.warning("pmdarima not available, using default parameters")
            return self.train_arima(data, data_type, order=(1, 1, 1))
        
        try:
            self.training_data[data_type] = data
            
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                
                auto_model = pm.auto_arima(
                    data,
                    start_p=0, start_q=0,
                    max_p=5, max_q=5,
                    d=None,  # Auto select
                    seasonal=seasonal,
                    m=m if seasonal else 1,
                    start_P=0, start_Q=0,
                    max_P=2, max_Q=2,
                    D=None if seasonal else 0,
                    trace=False,
                    error_action='ignore',
                    suppress_warnings=True,
                    stepwise=True,
                    n_fits=50
                )
            
            self.fitted_models[data_type] = auto_model
            self.is_trained[data_type] = True
            
            order = auto_model.order
            seasonal_order = auto_model.seasonal_order if seasonal else None
            
            self.model_params[data_type] = {
                "order": order,
                "seasonal_order": seasonal_order,
                "model_type": f"Auto-ARIMA{order}" + (f"x{seasonal_order}" if seasonal_order else "")
            }
            
            return {
                "status": "success",
                "data_type": data_type,
                "model_type": self.model_params[data_type]["model_type"],
                "order": order,
                "seasonal_order": seasonal_order,
                "n_observations": len(data),
                "metrics": {
                    "aic": float(auto_model.aic()),
                    "bic": float(auto_model.bic())
                },
                "auto_selected": True
            }
            
        except Exception as e:
            logger.error(f"Error in Auto ARIMA for {data_type}: {e}")
            # Fall back to simple ARIMA
            return self.train_arima(data, data_type, order=(1, 1, 1))
    
    def forecast(
        self,
        data_type: str,
        steps: int = 24,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Generate forecasts using trained model.
        
        Args:
            data_type: Type of data to forecast
            steps: Number of steps ahead to forecast
            confidence_level: Confidence level for prediction intervals
            
        Returns:
            Dict with forecasts and prediction intervals
        """
        if data_type not in self.is_trained or not self.is_trained[data_type]:
            return {"status": "error", "message": f"No trained model for {data_type}"}
        
        try:
            model = self.fitted_models[data_type]
            
            if PMDARIMA_AVAILABLE and hasattr(model, 'predict'):
                # pmdarima model
                forecast_values = model.predict(n_periods=steps)
                conf_int = model.predict(n_periods=steps, return_conf_int=True, alpha=1 - confidence_level)
                
                if isinstance(conf_int, tuple):
                    forecast_values = conf_int[0]
                    intervals = conf_int[1]
                else:
                    forecast_values = conf_int
                    intervals = None
            else:
                # statsmodels model
                forecast_result = model.get_forecast(steps=steps)
                forecast_values = forecast_result.predicted_mean.values
                conf_int_df = forecast_result.conf_int(alpha=1 - confidence_level)
                intervals = conf_int_df.values
            
            # Generate timestamps
            now = datetime.now()
            timestamps = [(now + timedelta(hours=i)).isoformat() for i in range(steps)]
            
            result = {
                "status": "success",
                "data_type": data_type,
                "model_type": self.model_params[data_type]["model_type"],
                "forecast_steps": steps,
                "forecasts": [
                    {
                        "timestamp": timestamps[i],
                        "predicted_value": float(forecast_values[i]),
                        "lower_bound": float(intervals[i, 0]) if intervals is not None else None,
                        "upper_bound": float(intervals[i, 1]) if intervals is not None else None
                    }
                    for i in range(steps)
                ],
                "confidence_level": confidence_level
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error forecasting {data_type}: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_model_summary(self, data_type: str) -> Dict[str, Any]:
        """Get summary of trained model."""
        if data_type not in self.is_trained or not self.is_trained[data_type]:
            return {"status": "error", "message": f"No trained model for {data_type}"}
        
        model = self.fitted_models[data_type]
        params = self.model_params[data_type]
        
        summary = {
            "data_type": data_type,
            "model_type": params.get("model_type"),
            "order": params.get("order"),
            "seasonal_order": params.get("seasonal_order"),
            "is_trained": True
        }
        
        try:
            if hasattr(model, 'aic'):
                if callable(model.aic):
                    summary["aic"] = float(model.aic())
                else:
                    summary["aic"] = float(model.aic)
            if hasattr(model, 'bic'):
                if callable(model.bic):
                    summary["bic"] = float(model.bic())
                else:
                    summary["bic"] = float(model.bic)
        except Exception:
            pass
        
        return summary


class SeasonalPatternAnalyzer:
    """
    Analyzes and extracts seasonal patterns from time series data.
    
    Useful for understanding:
    - Daily patterns (24-hour cycle)
    - Weekly patterns (7-day cycle)
    - Monsoon patterns (seasonal variations)
    """
    
    def analyze_daily_pattern(
        self,
        data: np.ndarray,
        timestamps: Optional[List[datetime]] = None
    ) -> Dict[str, Any]:
        """
        Analyze daily (24-hour) patterns in the data.
        
        Args:
            data: Time series data (hourly)
            timestamps: Optional list of timestamps
            
        Returns:
            Dict with hourly averages and pattern characteristics
        """
        if len(data) < 24:
            return {"error": "Need at least 24 hours of data"}
        
        # Reshape into days
        n_complete_days = len(data) // 24
        daily_data = data[:n_complete_days * 24].reshape(n_complete_days, 24)
        
        hourly_mean = np.mean(daily_data, axis=0)
        hourly_std = np.std(daily_data, axis=0)
        
        peak_hour = int(np.argmax(hourly_mean))
        trough_hour = int(np.argmin(hourly_mean))
        
        return {
            "pattern_type": "daily",
            "n_days_analyzed": n_complete_days,
            "hourly_averages": [float(x) for x in hourly_mean],
            "hourly_std": [float(x) for x in hourly_std],
            "peak_hour": peak_hour,
            "peak_value": float(hourly_mean[peak_hour]),
            "trough_hour": trough_hour,
            "trough_value": float(hourly_mean[trough_hour]),
            "daily_range": float(hourly_mean.max() - hourly_mean.min()),
            "variability_index": float(np.mean(hourly_std) / np.mean(hourly_mean)) if np.mean(hourly_mean) > 0 else 0
        }
    
    def analyze_weekly_pattern(
        self,
        data: np.ndarray
    ) -> Dict[str, Any]:
        """
        Analyze weekly patterns in daily data.
        
        Args:
            data: Time series data (daily)
            
        Returns:
            Dict with day-of-week averages and pattern characteristics
        """
        if len(data) < 7:
            return {"error": "Need at least 7 days of data"}
        
        n_complete_weeks = len(data) // 7
        weekly_data = data[:n_complete_weeks * 7].reshape(n_complete_weeks, 7)
        
        daily_mean = np.mean(weekly_data, axis=0)
        daily_std = np.std(weekly_data, axis=0)
        
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        return {
            "pattern_type": "weekly",
            "n_weeks_analyzed": n_complete_weeks,
            "daily_averages": {day_names[i]: float(daily_mean[i]) for i in range(7)},
            "daily_std": {day_names[i]: float(daily_std[i]) for i in range(7)},
            "peak_day": day_names[int(np.argmax(daily_mean))],
            "trough_day": day_names[int(np.argmin(daily_mean))],
            "weekly_range": float(daily_mean.max() - daily_mean.min())
        }
    
    def detect_monsoon_patterns(
        self,
        monthly_data: Dict[int, List[float]]
    ) -> Dict[str, Any]:
        """
        Detect monsoon seasonal patterns (Sri Lanka specific).
        
        Args:
            monthly_data: Dict mapping month (1-12) to list of values
            
        Returns:
            Dict with seasonal analysis
        """
        # Sri Lanka monsoon seasons:
        # SW Monsoon: May-September
        # NE Monsoon: December-February
        # Inter-monsoon 1: March-April
        # Inter-monsoon 2: October-November
        
        seasons = {
            "sw_monsoon": [5, 6, 7, 8, 9],
            "ne_monsoon": [12, 1, 2],
            "inter_monsoon_1": [3, 4],
            "inter_monsoon_2": [10, 11]
        }
        
        season_stats = {}
        for season_name, months in seasons.items():
            values = []
            for month in months:
                if month in monthly_data:
                    values.extend(monthly_data[month])
            
            if values:
                season_stats[season_name] = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "count": len(values)
                }
        
        # Determine dominant patterns
        if season_stats:
            wettest = max(season_stats.keys(), key=lambda k: season_stats[k].get("mean", 0))
            driest = min(season_stats.keys(), key=lambda k: season_stats[k].get("mean", float('inf')))
        else:
            wettest = driest = "unknown"
        
        return {
            "analysis_type": "monsoon",
            "region": "Sri Lanka",
            "seasons": season_stats,
            "wettest_season": wettest,
            "driest_season": driest,
            "pattern_description": f"Wettest during {wettest.replace('_', ' ')}, driest during {driest.replace('_', ' ')}"
        }


# Singleton instances
arima_forecaster = ARIMAForecaster()
seasonal_analyzer = SeasonalPatternAnalyzer()

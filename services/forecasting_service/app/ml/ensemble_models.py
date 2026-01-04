"""
Ensemble Forecasting Models

Combines multiple forecasting approaches for improved accuracy:
- Model averaging (simple and weighted)
- Stacking ensemble
- Model selection based on recent performance
- Confidence-weighted combinations

Uses predictions from:
- ML models (RandomForest, GradientBoosting, LSTM)
- Statistical models (ARIMA, SARIMA)
- Baseline models (naive, seasonal naive)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ForecastResult:
    """Container for individual model forecasts."""
    model_name: str
    predictions: np.ndarray
    confidence: float = 1.0
    lower_bound: Optional[np.ndarray] = None
    upper_bound: Optional[np.ndarray] = None


class EnsembleForecaster:
    """
    Ensemble forecasting system combining multiple models.
    
    Supports various ensemble strategies:
    - Simple averaging
    - Weighted averaging based on historical performance
    - Median ensemble (robust to outliers)
    - Best model selection
    """
    
    def __init__(self):
        self.model_weights: Dict[str, float] = {}
        self.model_history: Dict[str, List[float]] = {}  # Track MAE for each model
        self.ensemble_history: List[Dict] = []
    
    def simple_average(
        self,
        forecasts: List[ForecastResult]
    ) -> Dict[str, Any]:
        """
        Combine forecasts using simple averaging.
        
        Args:
            forecasts: List of ForecastResult objects
            
        Returns:
            Dict with ensemble prediction and metadata
        """
        if not forecasts:
            return {"error": "No forecasts provided"}
        
        # Stack predictions
        predictions = np.array([f.predictions for f in forecasts])
        
        # Simple mean
        ensemble_mean = np.mean(predictions, axis=0)
        ensemble_std = np.std(predictions, axis=0)
        
        # Calculate bounds using spread of predictions
        lower_bound = ensemble_mean - 2 * ensemble_std
        upper_bound = ensemble_mean + 2 * ensemble_std
        
        return {
            "method": "simple_average",
            "n_models": len(forecasts),
            "models_used": [f.model_name for f in forecasts],
            "predictions": ensemble_mean.tolist(),
            "lower_bound": lower_bound.tolist(),
            "upper_bound": upper_bound.tolist(),
            "model_spread": ensemble_std.tolist(),
            "agreement_score": float(1.0 - np.mean(ensemble_std) / (np.mean(ensemble_mean) + 1e-6))
        }
    
    def weighted_average(
        self,
        forecasts: List[ForecastResult],
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Combine forecasts using weighted averaging.
        
        Args:
            forecasts: List of ForecastResult objects
            weights: Optional dict of model_name -> weight (uses stored weights if not provided)
            
        Returns:
            Dict with weighted ensemble prediction
        """
        if not forecasts:
            return {"error": "No forecasts provided"}
        
        weights = weights or self.model_weights
        
        # Get weights for each model (default to equal if not specified)
        model_weights = []
        for f in forecasts:
            w = weights.get(f.model_name, 1.0) * f.confidence
            model_weights.append(w)
        
        # Normalize weights
        total_weight = sum(model_weights)
        if total_weight > 0:
            model_weights = [w / total_weight for w in model_weights]
        else:
            model_weights = [1.0 / len(forecasts)] * len(forecasts)
        
        # Stack predictions and apply weights
        predictions = np.array([f.predictions for f in forecasts])
        weights_array = np.array(model_weights).reshape(-1, 1)
        
        ensemble_mean = np.sum(predictions * weights_array, axis=0)
        
        # Weighted variance
        weighted_var = np.sum(weights_array * (predictions - ensemble_mean) ** 2, axis=0)
        ensemble_std = np.sqrt(weighted_var)
        
        lower_bound = ensemble_mean - 2 * ensemble_std
        upper_bound = ensemble_mean + 2 * ensemble_std
        
        return {
            "method": "weighted_average",
            "n_models": len(forecasts),
            "models_used": [f.model_name for f in forecasts],
            "model_weights": {forecasts[i].model_name: float(model_weights[i]) for i in range(len(forecasts))},
            "predictions": ensemble_mean.tolist(),
            "lower_bound": lower_bound.tolist(),
            "upper_bound": upper_bound.tolist(),
            "model_spread": ensemble_std.tolist()
        }
    
    def median_ensemble(
        self,
        forecasts: List[ForecastResult]
    ) -> Dict[str, Any]:
        """
        Combine forecasts using median (robust to outliers).
        
        Args:
            forecasts: List of ForecastResult objects
            
        Returns:
            Dict with median ensemble prediction
        """
        if not forecasts:
            return {"error": "No forecasts provided"}
        
        predictions = np.array([f.predictions for f in forecasts])
        
        ensemble_median = np.median(predictions, axis=0)
        
        # Use interquartile range for bounds
        q25 = np.percentile(predictions, 25, axis=0)
        q75 = np.percentile(predictions, 75, axis=0)
        iqr = q75 - q25
        
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        
        return {
            "method": "median_ensemble",
            "n_models": len(forecasts),
            "models_used": [f.model_name for f in forecasts],
            "predictions": ensemble_median.tolist(),
            "lower_bound": lower_bound.tolist(),
            "upper_bound": upper_bound.tolist(),
            "q25": q25.tolist(),
            "q75": q75.tolist()
        }
    
    def trimmed_mean(
        self,
        forecasts: List[ForecastResult],
        trim_fraction: float = 0.1
    ) -> Dict[str, Any]:
        """
        Combine forecasts using trimmed mean (excludes extreme values).
        
        Args:
            forecasts: List of ForecastResult objects
            trim_fraction: Fraction of values to trim from each end
            
        Returns:
            Dict with trimmed mean ensemble prediction
        """
        if not forecasts or len(forecasts) < 3:
            return self.simple_average(forecasts)
        
        predictions = np.array([f.predictions for f in forecasts])
        n_models = len(forecasts)
        
        # Calculate trimmed mean for each time step
        ensemble_values = []
        for t in range(predictions.shape[1]):
            values = sorted(predictions[:, t])
            trim_count = max(1, int(n_models * trim_fraction))
            trimmed = values[trim_count:-trim_count] if len(values) > 2 * trim_count else values
            ensemble_values.append(np.mean(trimmed))
        
        ensemble_mean = np.array(ensemble_values)
        ensemble_std = np.std(predictions, axis=0)
        
        return {
            "method": "trimmed_mean",
            "trim_fraction": trim_fraction,
            "n_models": len(forecasts),
            "models_used": [f.model_name for f in forecasts],
            "predictions": ensemble_mean.tolist(),
            "lower_bound": (ensemble_mean - 2 * ensemble_std).tolist(),
            "upper_bound": (ensemble_mean + 2 * ensemble_std).tolist()
        }
    
    def best_model_selection(
        self,
        forecasts: List[ForecastResult],
        recent_errors: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Select the best performing model based on recent performance.
        
        Args:
            forecasts: List of ForecastResult objects
            recent_errors: Optional dict of model_name -> recent MAE
            
        Returns:
            Dict with best model prediction
        """
        if not forecasts:
            return {"error": "No forecasts provided"}
        
        if recent_errors:
            # Select model with lowest error
            best_model = None
            best_error = float('inf')
            
            for f in forecasts:
                error = recent_errors.get(f.model_name, float('inf'))
                if error < best_error:
                    best_error = error
                    best_model = f
            
            if best_model is None:
                best_model = forecasts[0]
        else:
            # Use confidence scores
            best_model = max(forecasts, key=lambda f: f.confidence)
        
        return {
            "method": "best_model_selection",
            "selected_model": best_model.model_name,
            "selection_reason": "lowest_error" if recent_errors else "highest_confidence",
            "confidence": float(best_model.confidence),
            "predictions": best_model.predictions.tolist(),
            "lower_bound": best_model.lower_bound.tolist() if best_model.lower_bound is not None else None,
            "upper_bound": best_model.upper_bound.tolist() if best_model.upper_bound is not None else None,
            "alternative_models": [f.model_name for f in forecasts if f.model_name != best_model.model_name]
        }
    
    def adaptive_ensemble(
        self,
        forecasts: List[ForecastResult],
        actual_values: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Adaptive ensemble that adjusts weights based on recent performance.
        
        Args:
            forecasts: List of ForecastResult objects
            actual_values: Optional recent actual values for weight adjustment
            
        Returns:
            Dict with adaptive ensemble prediction
        """
        if not forecasts:
            return {"error": "No forecasts provided"}
        
        # If we have actual values, update weights
        if actual_values is not None and len(self.model_history) > 0:
            for f in forecasts:
                if f.model_name in self.model_history:
                    history = self.model_history[f.model_name]
                    if history:
                        # Exponentially weighted average of recent errors
                        recent_mae = np.mean(history[-10:])
                        # Convert error to weight (lower error = higher weight)
                        self.model_weights[f.model_name] = 1.0 / (1.0 + recent_mae)
        
        # Use weighted average with adaptive weights
        result = self.weighted_average(forecasts)
        result["method"] = "adaptive_ensemble"
        result["weights_updated"] = actual_values is not None
        
        return result
    
    def update_model_performance(
        self,
        model_name: str,
        predictions: np.ndarray,
        actuals: np.ndarray
    ) -> Dict[str, float]:
        """
        Update model performance history with new observations.
        
        Args:
            model_name: Name of the model
            predictions: Model predictions
            actuals: Actual observed values
            
        Returns:
            Dict with updated performance metrics
        """
        mae = float(np.mean(np.abs(predictions - actuals)))
        rmse = float(np.sqrt(np.mean((predictions - actuals) ** 2)))
        
        if model_name not in self.model_history:
            self.model_history[model_name] = []
        
        self.model_history[model_name].append(mae)
        
        # Keep only last 100 observations
        if len(self.model_history[model_name]) > 100:
            self.model_history[model_name] = self.model_history[model_name][-100:]
        
        # Update weight
        avg_mae = np.mean(self.model_history[model_name])
        self.model_weights[model_name] = 1.0 / (1.0 + avg_mae)
        
        return {
            "model": model_name,
            "current_mae": mae,
            "current_rmse": rmse,
            "historical_avg_mae": float(avg_mae),
            "updated_weight": float(self.model_weights[model_name])
        }
    
    def get_model_rankings(self) -> List[Dict[str, Any]]:
        """Get ranking of models by performance."""
        rankings = []
        
        for model_name, history in self.model_history.items():
            if history:
                rankings.append({
                    "model": model_name,
                    "avg_mae": float(np.mean(history)),
                    "recent_mae": float(np.mean(history[-10:])) if len(history) >= 10 else float(np.mean(history)),
                    "n_evaluations": len(history),
                    "current_weight": float(self.model_weights.get(model_name, 0))
                })
        
        rankings.sort(key=lambda x: x["avg_mae"])
        
        for i, r in enumerate(rankings):
            r["rank"] = i + 1
        
        return rankings
    
    def combine_with_strategy(
        self,
        forecasts: List[ForecastResult],
        strategy: str = "weighted_average"
    ) -> Dict[str, Any]:
        """
        Combine forecasts using specified strategy.
        
        Args:
            forecasts: List of ForecastResult objects
            strategy: One of 'simple_average', 'weighted_average', 'median', 'trimmed_mean', 'best_model', 'adaptive'
            
        Returns:
            Dict with ensemble prediction
        """
        strategies = {
            "simple_average": self.simple_average,
            "weighted_average": self.weighted_average,
            "median": self.median_ensemble,
            "trimmed_mean": self.trimmed_mean,
            "best_model": self.best_model_selection,
            "adaptive": self.adaptive_ensemble
        }
        
        if strategy not in strategies:
            logger.warning(f"Unknown strategy '{strategy}', using weighted_average")
            strategy = "weighted_average"
        
        return strategies[strategy](forecasts)


class HybridForecaster:
    """
    Hybrid forecaster that combines ML and statistical models.
    
    Strategy:
    1. Use ARIMA for short-term trends
    2. Use ML models for pattern recognition
    3. Combine based on forecast horizon
    """
    
    def __init__(self):
        self.ensemble = EnsembleForecaster()
    
    def hybrid_forecast(
        self,
        ml_forecast: ForecastResult,
        arima_forecast: ForecastResult,
        horizon_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Create hybrid forecast combining ML and ARIMA.
        
        Uses higher ARIMA weight for short-term (< 6 hours)
        and higher ML weight for medium-term (> 12 hours).
        
        Args:
            ml_forecast: Forecast from ML model
            arima_forecast: Forecast from ARIMA model
            horizon_hours: Total forecast horizon
            
        Returns:
            Dict with hybrid forecast
        """
        n_steps = len(ml_forecast.predictions)
        
        # Create time-varying weights
        # ARIMA is better for very short-term
        # ML is better for medium-term patterns
        arima_weights = []
        ml_weights = []
        
        for i in range(n_steps):
            hours_ahead = (i + 1) * (horizon_hours / n_steps)
            
            if hours_ahead <= 6:
                # Short-term: favor ARIMA
                arima_w = 0.7
            elif hours_ahead <= 12:
                # Transition zone
                arima_w = 0.5
            else:
                # Medium-term: favor ML
                arima_w = 0.3
            
            arima_weights.append(arima_w)
            ml_weights.append(1 - arima_w)
        
        arima_weights = np.array(arima_weights)
        ml_weights = np.array(ml_weights)
        
        # Combine predictions
        hybrid_predictions = (
            arima_weights * arima_forecast.predictions +
            ml_weights * ml_forecast.predictions
        )
        
        # Combine bounds
        if arima_forecast.lower_bound is not None and ml_forecast.lower_bound is not None:
            hybrid_lower = (
                arima_weights * arima_forecast.lower_bound +
                ml_weights * ml_forecast.lower_bound
            )
            hybrid_upper = (
                arima_weights * arima_forecast.upper_bound +
                ml_weights * ml_forecast.upper_bound
            )
        else:
            hybrid_lower = hybrid_upper = None
        
        return {
            "method": "hybrid_ml_arima",
            "models": [ml_forecast.model_name, arima_forecast.model_name],
            "predictions": hybrid_predictions.tolist(),
            "lower_bound": hybrid_lower.tolist() if hybrid_lower is not None else None,
            "upper_bound": hybrid_upper.tolist() if hybrid_upper is not None else None,
            "weight_profile": {
                "arima_weights": arima_weights.tolist(),
                "ml_weights": ml_weights.tolist()
            },
            "strategy": "Time-varying weights: ARIMA for short-term, ML for medium-term"
        }


# Singleton instances
ensemble_forecaster = EnsembleForecaster()
hybrid_forecaster = HybridForecaster()

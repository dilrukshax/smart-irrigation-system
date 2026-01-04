"""
Advanced Time Series Forecasting System

Implements ML models from the research notebook:
- Random Forest Regressor
- Gradient Boosting Regressor
- LSTM (TensorFlow)
- Probabilistic forecasting with quantile regression
"""

import logging
import os
import pickle
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

logger = logging.getLogger(__name__)


class AdvancedForecastingSystem:
    """
    Advanced forecasting system with multiple ML models.
    
    Features:
    - Random Forest for non-linear patterns
    - Gradient Boosting for sequential learning
    - LSTM for deep learning time series
    - Quantile regression for uncertainty estimation
    - Feature engineering (lag, rolling, cyclical)
    """
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        os.makedirs(models_dir, exist_ok=True)
        
        # Models
        self.rf_model: Optional[RandomForestRegressor] = None
        self.gb_model: Optional[GradientBoostingRegressor] = None
        self.lstm_model: Optional[Sequential] = None
        self.quantile_models: Dict[float, GradientBoostingRegressor] = {}
        
        # Scalers
        self.scaler_X = MinMaxScaler()
        self.scaler_y = MinMaxScaler()
        
        # Data storage
        self.df: Optional[pd.DataFrame] = None
        self.feature_cols: List[str] = []
        self.target_col: str = "water_level_percent"
        
        # Model metrics
        self.metrics: Dict[str, Dict[str, float]] = {}
        
        # Configuration
        self.seq_length = 14  # LSTM sequence length
        self.is_trained = False
    
    def initialize_data(self, historical_data: List[Dict]) -> None:
        """
        Initialize with historical data.
        
        Args:
            historical_data: List of dicts with timestamp, water_level_percent, 
                           rainfall_mm, gate_opening_percent
        """
        logger.info(f"Initializing with {len(historical_data)} data points")
        
        # Convert to DataFrame
        self.df = pd.DataFrame(historical_data)
        
        # Ensure timestamp is datetime
        if 'timestamp' in self.df.columns:
            self.df['timestamp'] = pd.to_datetime(self.df['timestamp'], unit='s')
            self.df = self.df.set_index('timestamp').sort_index()
        
        # Ensure required columns exist
        required_cols = [self.target_col, 'rainfall_mm', 'gate_opening_percent']
        for col in required_cols:
            if col not in self.df.columns:
                logger.warning(f"Missing column {col}, creating with default values")
                self.df[col] = 0.0
        
        # Engineer features
        self._engineer_features()
        
        logger.info(f"Data initialized. Shape: {self.df.shape}")
    
    def _engineer_features(self) -> None:
        """Create temporal and lag features."""
        logger.info("Engineering features...")
        
        # Temporal features
        self.df['day_of_year'] = self.df.index.dayofyear
        self.df['month'] = self.df.index.month
        self.df['week'] = self.df.index.isocalendar().week.astype(int)
        self.df['hour'] = self.df.index.hour
        
        # Cyclical encoding
        self.df['month_sin'] = np.sin(2 * np.pi * self.df['month'] / 12)
        self.df['month_cos'] = np.cos(2 * np.pi * self.df['month'] / 12)
        self.df['hour_sin'] = np.sin(2 * np.pi * self.df['hour'] / 24)
        self.df['hour_cos'] = np.cos(2 * np.pi * self.df['hour'] / 24)
        
        # Lag features
        lag_periods = [1, 3, 7, 24]  # 1h, 3h, 7h, 1day
        for lag in lag_periods:
            self.df[f'{self.target_col}_lag_{lag}'] = self.df[self.target_col].shift(lag)
        
        # Rolling statistics
        windows = [7, 24, 168]  # 7h, 1day, 1week
        for window in windows:
            self.df[f'{self.target_col}_roll_mean_{window}'] = \
                self.df[self.target_col].rolling(window=window, min_periods=1).mean()
            self.df[f'{self.target_col}_roll_std_{window}'] = \
                self.df[self.target_col].rolling(window=window, min_periods=1).std()
        
        # Rainfall features
        self.df['rainfall_cumsum_24h'] = self.df['rainfall_mm'].rolling(window=24, min_periods=1).sum()
        self.df['rainfall_cumsum_168h'] = self.df['rainfall_mm'].rolling(window=168, min_periods=1).sum()
        
        # Drop NaN rows (from lag features)
        initial_size = len(self.df)
        self.df = self.df.dropna()
        logger.info(f"Dropped {initial_size - len(self.df)} rows with NaN values")
        
        # Store feature columns
        self.feature_cols = [col for col in self.df.columns if col != self.target_col]
        logger.info(f"Engineered {len(self.feature_cols)} features")
    
    def train_models(self, test_size: float = 0.2) -> Dict[str, Dict[str, float]]:
        """
        Train all ML models.
        
        Args:
            test_size: Proportion of data for testing
        
        Returns:
            Dict of model metrics
        """
        if self.df is None or len(self.df) < 100:
            raise ValueError("Insufficient data for training. Need at least 100 samples.")
        
        logger.info("Starting model training...")
        
        # Train-test split (time-based)
        train_size = int(len(self.df) * (1 - test_size))
        train_df = self.df.iloc[:train_size]
        test_df = self.df.iloc[train_size:]
        
        X_train = train_df[self.feature_cols]
        y_train = train_df[self.target_col]
        X_test = test_df[self.feature_cols]
        y_test = test_df[self.target_col]
        
        logger.info(f"Train: {len(X_train)} samples, Test: {len(X_test)} samples")
        
        # Scale data
        X_train_scaled = self.scaler_X.fit_transform(X_train)
        X_test_scaled = self.scaler_X.transform(X_test)
        
        y_train_scaled = self.scaler_y.fit_transform(y_train.values.reshape(-1, 1)).flatten()
        y_test_scaled = self.scaler_y.transform(y_test.values.reshape(-1, 1)).flatten()
        
        # Train Random Forest
        logger.info("Training Random Forest...")
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.rf_model.fit(X_train_scaled, y_train)
        rf_pred = self.rf_model.predict(X_test_scaled)
        self.metrics['Random Forest'] = self._calculate_metrics(y_test, rf_pred)
        
        # Train Gradient Boosting
        logger.info("Training Gradient Boosting...")
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.gb_model.fit(X_train_scaled, y_train)
        gb_pred = self.gb_model.predict(X_test_scaled)
        self.metrics['Gradient Boosting'] = self._calculate_metrics(y_test, gb_pred)
        
        # Train quantile regression models
        logger.info("Training Quantile Regression models...")
        quantiles = [0.1, 0.5, 0.9]
        for q in quantiles:
            model = GradientBoostingRegressor(
                loss='quantile',
                alpha=q,
                n_estimators=100,
                max_depth=5,
                random_state=42
            )
            model.fit(X_train_scaled, y_train)
            self.quantile_models[q] = model
        
        # Train LSTM
        logger.info("Training LSTM...")
        self._train_lstm(X_train_scaled, y_train_scaled, X_test_scaled, y_test)
        
        self.is_trained = True
        logger.info("All models trained successfully!")
        
        # Save models
        self.save_models()
        
        return self.metrics
    
    def _train_lstm(
        self,
        X_train_scaled: np.ndarray,
        y_train_scaled: np.ndarray,
        X_test_scaled: np.ndarray,
        y_test: pd.Series
    ) -> None:
        """Train LSTM model."""
        # Create sequences
        X_train_seq, y_train_seq = self._create_sequences(
            X_train_scaled, y_train_scaled, self.seq_length
        )
        X_test_seq, y_test_seq = self._create_sequences(
            X_test_scaled, 
            self.scaler_y.transform(y_test.values.reshape(-1, 1)).flatten(),
            self.seq_length
        )
        
        if len(X_train_seq) < 10:
            logger.warning("Insufficient data for LSTM training")
            return
        
        # Build LSTM
        self.lstm_model = Sequential([
            LSTM(64, activation='relu', return_sequences=True, 
                 input_shape=(self.seq_length, X_train_seq.shape[2])),
            Dropout(0.2),
            LSTM(32, activation='relu'),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        
        self.lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        early_stop = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        # Train
        self.lstm_model.fit(
            X_train_seq, y_train_seq,
            epochs=50,
            batch_size=32,
            validation_split=0.2,
            callbacks=[early_stop],
            verbose=0
        )
        
        # Evaluate
        lstm_pred_scaled = self.lstm_model.predict(X_test_seq, verbose=0)
        lstm_pred = self.scaler_y.inverse_transform(lstm_pred_scaled)
        y_test_actual = self.scaler_y.inverse_transform(y_test_seq.reshape(-1, 1))
        
        self.metrics['LSTM'] = self._calculate_metrics(
            y_test_actual.flatten(),
            lstm_pred.flatten()
        )
    
    def _create_sequences(
        self,
        X: np.ndarray,
        y: np.ndarray,
        seq_length: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM."""
        Xs, ys = [], []
        for i in range(len(X) - seq_length):
            Xs.append(X[i:(i + seq_length)])
            ys.append(y[i + seq_length])
        return np.array(Xs), np.array(ys)
    
    def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculate model performance metrics."""
        return {
            'rmse': float(np.sqrt(mean_squared_error(y_true, y_pred))),
            'mae': float(mean_absolute_error(y_true, y_pred)),
            'r2': float(r2_score(y_true, y_pred))
        }
    
    def predict(
        self,
        hours_ahead: int = 24,
        model_type: str = 'best',
        include_uncertainty: bool = True
    ) -> Dict[str, Any]:
        """
        Generate forecasts.
        
        Args:
            hours_ahead: Number of hours to forecast
            model_type: 'best', 'rf', 'gb', or 'lstm'
            include_uncertainty: Include prediction intervals
        
        Returns:
            Dict with predictions and metadata
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Select best model
        if model_type == 'best':
            best_model_name = min(self.metrics.items(), key=lambda x: x[1]['rmse'])[0]
            model_type = best_model_name.lower().replace(' ', '_')
        
        # Get current state
        current_data = self.df.iloc[-1:]
        current_level = float(current_data[self.target_col].values[0])
        
        predictions = []
        
        # Generate predictions iteratively
        for hour in range(1, hours_ahead + 1):
            # Prepare features for next hour
            # (In production, this would use actual forecasted weather, etc.)
            X_pred = current_data[self.feature_cols].values
            X_pred_scaled = self.scaler_X.transform(X_pred)
            
            # Predict based on model type
            if 'random' in model_type.lower() and self.rf_model:
                pred_scaled = self.rf_model.predict(X_pred_scaled)[0]
            elif 'gradient' in model_type.lower() and self.gb_model:
                pred_scaled = self.gb_model.predict(X_pred_scaled)[0]
            elif 'lstm' in model_type.lower() and self.lstm_model:
                # Use last sequence for LSTM
                X_seq = self.df[self.feature_cols].iloc[-self.seq_length:].values
                X_seq_scaled = self.scaler_X.transform(X_seq)
                X_seq_scaled = X_seq_scaled.reshape(1, self.seq_length, -1)
                pred_scaled = self.lstm_model.predict(X_seq_scaled, verbose=0)[0][0]
                pred_scaled = self.scaler_y.inverse_transform([[pred_scaled]])[0][0]
            else:
                pred_scaled = self.gb_model.predict(X_pred_scaled)[0]
            
            # Apply constraints
            predicted_level = float(np.clip(pred_scaled, 0, 100))
            
            pred_dict = {
                'hour': hour,
                'predicted_water_level': round(predicted_level, 2),
                'timestamp': (datetime.now() + timedelta(hours=hour)).timestamp()
            }
            
            # Add uncertainty bounds if requested
            if include_uncertainty and self.quantile_models:
                lower = float(np.clip(self.quantile_models[0.1].predict(X_pred_scaled)[0], 0, 100))
                upper = float(np.clip(self.quantile_models[0.9].predict(X_pred_scaled)[0], 0, 100))
                pred_dict['lower_bound'] = round(lower, 2)
                pred_dict['upper_bound'] = round(upper, 2)
            
            predictions.append(pred_dict)
        
        return {
            'status': 'success',
            'model_used': model_type,
            'current_level': round(current_level, 2),
            'predictions': predictions,
            'forecast_generated_at': datetime.now().timestamp(),
            'metrics': self.metrics.get(model_type.replace('_', ' ').title(), {})
        }
    
    def get_model_comparison(self) -> Dict[str, Any]:
        """Get comparison of all models."""
        if not self.metrics:
            return {'status': 'not_trained', 'message': 'Models not trained yet'}
        
        # Sort by RMSE
        sorted_models = sorted(
            self.metrics.items(),
            key=lambda x: x[1]['rmse']
        )
        
        return {
            'status': 'success',
            'models': [
                {
                    'name': name,
                    'metrics': metrics,
                    'rank': idx + 1
                }
                for idx, (name, metrics) in enumerate(sorted_models)
            ],
            'best_model': sorted_models[0][0] if sorted_models else None
        }
    
    def analyze_risk(self) -> Dict[str, Any]:
        """
        Analyze flood and drought risk with ML models.
        
        Returns:
            Risk assessment with confidence scores
        """
        if self.df is None or len(self.df) < 24:
            return {'status': 'insufficient_data'}
        
        current_level = float(self.df[self.target_col].iloc[-1])
        recent_rainfall = float(self.df['rainfall_mm'].iloc[-24:].sum())
        
        # Calculate trends
        recent_5 = float(self.df[self.target_col].iloc[-5:].mean())
        older_5 = float(self.df[self.target_col].iloc[-10:-5].mean())
        trend = recent_5 - older_5
        
        # Get 24h forecast
        forecast = self.predict(hours_ahead=24, include_uncertainty=True)
        predicted_levels = [p['predicted_water_level'] for p in forecast['predictions']]
        max_predicted = max(predicted_levels)
        min_predicted = min(predicted_levels)
        
        # Risk assessment with ML predictions
        flood_risk = 'LOW'
        drought_risk = 'LOW'
        alerts = []
        confidence = 0.0
        
        # Flood risk with prediction confidence
        if max_predicted > 85 and trend > 2:
            flood_risk = 'HIGH'
            confidence = 0.85
            alerts.append('FLOOD WARNING: ML model predicts critical water levels')
        elif max_predicted > 75 or (current_level > 60 and recent_rainfall > 50):
            flood_risk = 'MEDIUM'
            confidence = 0.70
            alerts.append('Flood watch: Monitor water levels closely')
        else:
            confidence = 0.90
        
        # Drought risk
        if min_predicted < 20 and trend < -1:
            drought_risk = 'HIGH'
            alerts.append('DROUGHT WARNING: ML model predicts critically low levels')
        elif min_predicted < 35 and recent_rainfall < 5:
            drought_risk = 'MEDIUM'
            alerts.append('Drought watch: Low water levels predicted')
        
        return {
            'current_water_level': round(current_level, 2),
            'flood_risk': flood_risk,
            'drought_risk': drought_risk,
            'confidence': round(confidence, 2),
            'recent_rainfall_24h': round(recent_rainfall, 2),
            'level_trend': round(trend, 2),
            'predicted_max_24h': round(max_predicted, 2),
            'predicted_min_24h': round(min_predicted, 2),
            'alerts': alerts,
            'assessment_time': datetime.now().timestamp(),
            'model_metrics': self.get_model_comparison()
        }
    
    def save_models(self) -> None:
        """Save trained models to disk."""
        logger.info(f"Saving models to {self.models_dir}...")
        
        if self.rf_model:
            with open(f"{self.models_dir}/random_forest.pkl", 'wb') as f:
                pickle.dump(self.rf_model, f)
        
        if self.gb_model:
            with open(f"{self.models_dir}/gradient_boosting.pkl", 'wb') as f:
                pickle.dump(self.gb_model, f)
        
        if self.lstm_model:
            self.lstm_model.save(f"{self.models_dir}/lstm_model.keras")
        
        for q, model in self.quantile_models.items():
            with open(f"{self.models_dir}/quantile_{int(q*100)}.pkl", 'wb') as f:
                pickle.dump(model, f)
        
        # Save scalers
        with open(f"{self.models_dir}/scaler_X.pkl", 'wb') as f:
            pickle.dump(self.scaler_X, f)
        with open(f"{self.models_dir}/scaler_y.pkl", 'wb') as f:
            pickle.dump(self.scaler_y, f)
        
        # Save metrics
        with open(f"{self.models_dir}/metrics.pkl", 'wb') as f:
            pickle.dump(self.metrics, f)
        
        logger.info("Models saved successfully")
    
    def load_models(self) -> bool:
        """Load trained models from disk."""
        try:
            logger.info(f"Loading models from {self.models_dir}...")
            
            with open(f"{self.models_dir}/random_forest.pkl", 'rb') as f:
                self.rf_model = pickle.load(f)
            
            with open(f"{self.models_dir}/gradient_boosting.pkl", 'rb') as f:
                self.gb_model = pickle.load(f)
            
            if os.path.exists(f"{self.models_dir}/lstm_model.keras"):
                self.lstm_model = load_model(f"{self.models_dir}/lstm_model.keras")
            
            # Load quantile models
            for q in [0.1, 0.5, 0.9]:
                path = f"{self.models_dir}/quantile_{int(q*100)}.pkl"
                if os.path.exists(path):
                    with open(path, 'rb') as f:
                        self.quantile_models[q] = pickle.load(f)
            
            # Load scalers
            with open(f"{self.models_dir}/scaler_X.pkl", 'rb') as f:
                self.scaler_X = pickle.load(f)
            with open(f"{self.models_dir}/scaler_y.pkl", 'rb') as f:
                self.scaler_y = pickle.load(f)
            
            # Load metrics
            if os.path.exists(f"{self.models_dir}/metrics.pkl"):
                with open(f"{self.models_dir}/metrics.pkl", 'rb') as f:
                    self.metrics = pickle.load(f)
            
            self.is_trained = True
            logger.info("Models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False


# Singleton instance
advanced_forecasting = AdvancedForecastingSystem()

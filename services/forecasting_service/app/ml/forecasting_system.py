"""
Time Series Forecasting System

Provides water level forecasting and flood/drought risk assessment
using historical data and linear regression.
"""

import logging
import random
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)


class TimeSeriesForecastingSystem:
    """
    Forecasting system for water level prediction and risk assessment.
    
    Maintains historical data for:
    - Water levels
    - Rainfall
    - Dam gate openings
    
    Provides:
    - Water level forecasting
    - Flood/drought risk assessment
    """
    
    def __init__(self):
        self.water_level_data: List[Dict[str, Any]] = []
        self.rainfall_data: List[Dict[str, Any]] = []
        self.dam_gate_data: List[Dict[str, Any]] = []
        self.scaler = MinMaxScaler()
        self.model = LinearRegression()
        self._is_initialized = False
    
    def initialize_historical_data(self):
        """
        Initialize with simulated historical data for forecasting.
        
        Generates 30 days of hourly data with seasonal patterns.
        """
        logger.info("Initializing historical data for forecasting...")
        
        base_time = time.time() - (30 * 24 * 3600)  # 30 days ago
        
        for i in range(720):  # 30 days * 24 hours
            timestamp = base_time + (i * 3600)
            
            # Seasonal pattern
            day_of_year = datetime.fromtimestamp(timestamp).timetuple().tm_yday
            seasonal_factor = 0.5 + 0.5 * np.sin(2 * np.pi * day_of_year / 365)
            
            # Water level (0-100% of capacity)
            base_level = 60 + 20 * seasonal_factor
            water_level = max(10, min(95, base_level + random.uniform(-10, 10)))
            
            # Rainfall (mm per hour)
            rainfall_prob = 0.3 if seasonal_factor > 0.6 else 0.1
            rainfall = random.uniform(0, 15) if random.random() < rainfall_prob else 0
            
            # Dam gate opening (0-100%)
            gate_opening = min(80, max(0, water_level - 50 + random.uniform(-10, 10)))
            
            self.water_level_data.append({
                "timestamp": timestamp,
                "water_level_percent": round(water_level, 2),
            })
            
            self.rainfall_data.append({
                "timestamp": timestamp,
                "rainfall_mm": round(rainfall, 2),
            })
            
            self.dam_gate_data.append({
                "timestamp": timestamp,
                "gate_opening_percent": round(gate_opening, 2),
            })
        
        self._is_initialized = True
        logger.info(f"Initialized {len(self.water_level_data)} hours of historical data")
    
    def simulate_current_data(self) -> Dict[str, Any]:
        """Simulate current sensor readings and add to history."""
        current_time = time.time()
        
        # Get recent trends
        recent_water = [d["water_level_percent"] for d in self.water_level_data[-5:]]
        recent_rainfall = [d["rainfall_mm"] for d in self.rainfall_data[-5:]]
        
        avg_water = np.mean(recent_water) if recent_water else 50
        avg_rainfall = np.mean(recent_rainfall) if recent_rainfall else 0
        
        # Simulate with trend continuation
        new_water_level = max(5, min(98, avg_water + random.uniform(-5, 5)))
        new_rainfall = max(0, avg_rainfall + random.uniform(-2, 8))
        new_gate_opening = min(90, max(0, new_water_level - 45 + random.uniform(-5, 5)))
        
        data = {
            "timestamp": current_time,
            "water_level_percent": round(new_water_level, 2),
            "rainfall_mm": round(new_rainfall, 2),
            "gate_opening_percent": round(new_gate_opening, 2),
        }
        
        # Add to historical data
        self.water_level_data.append({
            "timestamp": current_time,
            "water_level_percent": data["water_level_percent"],
        })
        self.rainfall_data.append({
            "timestamp": current_time,
            "rainfall_mm": data["rainfall_mm"],
        })
        self.dam_gate_data.append({
            "timestamp": current_time,
            "gate_opening_percent": data["gate_opening_percent"],
        })
        
        # Keep only last 1000 records
        for data_list in [self.water_level_data, self.rainfall_data, self.dam_gate_data]:
            if len(data_list) > 1000:
                data_list[:] = data_list[-1000:]
        
        return data
    
    def forecast_water_level(self, hours_ahead: int = 24) -> Dict[str, Any]:
        """
        Forecast water level for the next N hours.
        
        Args:
            hours_ahead: Number of hours to forecast (1-72)
        
        Returns:
            Dict with current level, predictions, and status.
        """
        if len(self.water_level_data) < 24:
            return {
                "status": "insufficient_data",
                "message": "Need at least 24 hours of data for forecasting",
            }
        
        # Get recent data for trend
        recent_data = [d["water_level_percent"] for d in self.water_level_data[-24:]]
        current_level = recent_data[-1]
        
        # Fit linear regression on recent data
        X = np.arange(len(recent_data)).reshape(-1, 1)
        y = np.array(recent_data)
        self.model.fit(X, y)
        
        # Generate predictions
        predictions = []
        for hour in range(1, hours_ahead + 1):
            predicted = self.model.predict([[24 + hour]])[0]
            # Dampen prediction and apply constraints
            predicted_level = current_level + (predicted - current_level) * 0.1
            predicted_level = max(0, min(100, predicted_level))
            
            predictions.append({
                "hour": hour,
                "predicted_water_level": round(predicted_level, 2),
                "timestamp": time.time() + (hour * 3600),
            })
        
        return {
            "status": "success",
            "current_level": current_level,
            "predictions": predictions,
            "forecast_generated_at": time.time(),
        }
    
    def analyze_flood_risk(self) -> Dict[str, Any]:
        """
        Analyze flood and drought risk based on current trends.
        
        Returns:
            Dict with risk assessments and alerts.
        """
        if len(self.water_level_data) < 10:
            return {"status": "insufficient_data"}
        
        current_level = self.water_level_data[-1]["water_level_percent"]
        recent_rainfall = sum([d["rainfall_mm"] for d in self.rainfall_data[-24:]])
        
        # Calculate trend
        recent_5 = np.mean([d["water_level_percent"] for d in self.water_level_data[-5:]])
        older_5 = np.mean([d["water_level_percent"] for d in self.water_level_data[-10:-5]])
        trend = recent_5 - older_5
        
        # Risk assessment
        flood_risk = "LOW"
        drought_risk = "LOW"
        alerts = []
        
        # Flood risk
        if current_level > 85 and trend > 2:
            flood_risk = "HIGH"
            alerts.append("FLOOD WARNING: Water level rising rapidly")
        elif current_level > 75 or (current_level > 60 and recent_rainfall > 50):
            flood_risk = "MEDIUM"
            alerts.append("Flood watch: Monitor water levels closely")
        
        # Drought risk
        if current_level < 20 and trend < -1:
            drought_risk = "HIGH"
            alerts.append("DROUGHT WARNING: Water level critically low")
        elif current_level < 35 and recent_rainfall < 5:
            drought_risk = "MEDIUM"
            alerts.append("Drought watch: Low water levels detected")
        
        return {
            "current_water_level": current_level,
            "flood_risk": flood_risk,
            "drought_risk": drought_risk,
            "recent_rainfall_24h": round(recent_rainfall, 2),
            "level_trend": round(trend, 2),
            "alerts": alerts,
            "assessment_time": time.time(),
        }
    
    @property
    def is_ready(self) -> bool:
        """Check if system is initialized and ready."""
        return self._is_initialized
    
    @property
    def data_summary(self) -> Dict[str, int]:
        """Get summary of available data."""
        return {
            "water_level": len(self.water_level_data),
            "rainfall": len(self.rainfall_data),
            "dam_gates": len(self.dam_gate_data),
        }


# Singleton instance
forecasting_system = TimeSeriesForecastingSystem()

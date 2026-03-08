"""
Time Series Forecasting System

Live-data-first forecasting service core. This module no longer seeds runtime
state with synthetic data; it relies on ingested observations persisted to disk.
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler

from app.core.config import settings

logger = logging.getLogger(__name__)


class TimeSeriesForecastingSystem:
    """Forecasting system for water level prediction and risk assessment."""

    def __init__(self):
        self.water_level_data: List[Dict[str, Any]] = []
        self.rainfall_data: List[Dict[str, Any]] = []
        self.dam_gate_data: List[Dict[str, Any]] = []
        self.scaler = MinMaxScaler()
        self.model = LinearRegression()
        self._is_initialized = False
        self._last_ingest_at: Optional[float] = None

    def _persist(self) -> None:
        payload = {
            "water_level_data": self.water_level_data,
            "rainfall_data": self.rainfall_data,
            "dam_gate_data": self.dam_gate_data,
            "last_ingest_at": self._last_ingest_at,
        }
        path = settings.time_series_store_path
        try:
            parent = os.path.dirname(path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(payload, fh)
        except Exception as exc:
            logger.warning("Failed to persist forecasting store: %s", exc)

    def _load(self) -> None:
        path = settings.time_series_store_path
        if not path or not os.path.exists(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as fh:
                payload = json.load(fh)
            self.water_level_data = list(payload.get("water_level_data") or [])
            self.rainfall_data = list(payload.get("rainfall_data") or [])
            self.dam_gate_data = list(payload.get("dam_gate_data") or [])
            self._last_ingest_at = payload.get("last_ingest_at")
        except Exception as exc:
            logger.warning("Failed to load forecasting store: %s", exc)

    def initialize_historical_data(self):
        """
        Initialize runtime state from persisted observations.

        In strict/live mode there is no synthetic fallback.
        """
        self._load()
        self._is_initialized = True
        logger.info(
            "Forecasting system initialized with persisted data: water=%s rainfall=%s gates=%s",
            len(self.water_level_data),
            len(self.rainfall_data),
            len(self.dam_gate_data),
        )

    def add_observation(
        self,
        *,
        water_level_percent: Optional[float] = None,
        rainfall_mm: Optional[float] = None,
        gate_opening_percent: Optional[float] = None,
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Add an observed data point and persist to local store."""
        ts = float(timestamp or time.time())

        if water_level_percent is not None:
            self.water_level_data.append(
                {
                    "timestamp": ts,
                    "water_level_percent": float(water_level_percent),
                }
            )
        if rainfall_mm is not None:
            self.rainfall_data.append(
                {
                    "timestamp": ts,
                    "rainfall_mm": float(rainfall_mm),
                }
            )
        if gate_opening_percent is not None:
            self.dam_gate_data.append(
                {
                    "timestamp": ts,
                    "gate_opening_percent": float(gate_opening_percent),
                }
            )

        # Keep only last 10k points in each series.
        self.water_level_data = self.water_level_data[-10000:]
        self.rainfall_data = self.rainfall_data[-10000:]
        self.dam_gate_data = self.dam_gate_data[-10000:]

        self._last_ingest_at = ts
        self._persist()

        return {
            "timestamp": ts,
            "water_level_percent": water_level_percent,
            "rainfall_mm": rainfall_mm,
            "gate_opening_percent": gate_opening_percent,
        }

    def get_latest_observation(self) -> Optional[Dict[str, Any]]:
        """Return latest observed combined point if available."""
        latest_ts = None
        for series in (self.water_level_data, self.rainfall_data, self.dam_gate_data):
            if series:
                ts = series[-1].get("timestamp")
                if latest_ts is None or (ts is not None and ts > latest_ts):
                    latest_ts = ts

        if latest_ts is None:
            return None

        def _latest_value(series: List[Dict[str, Any]], key: str) -> Optional[float]:
            for row in reversed(series):
                if row.get("timestamp") <= latest_ts and key in row:
                    return float(row[key])
            return None

        return {
            "timestamp": float(latest_ts),
            "water_level_percent": _latest_value(self.water_level_data, "water_level_percent"),
            "rainfall_mm": _latest_value(self.rainfall_data, "rainfall_mm"),
            "gate_opening_percent": _latest_value(self.dam_gate_data, "gate_opening_percent"),
        }

    def simulate_current_data(self) -> Dict[str, Any]:
        """
        Backward-compatible API method.

        Returns latest observed data. It does not generate synthetic points.
        """
        latest = self.get_latest_observation()
        if latest is None:
            return {}
        return latest

    def forecast_water_level(self, hours_ahead: int = 24) -> Dict[str, Any]:
        """Forecast water level for the next N hours based on observed series."""
        if len(self.water_level_data) < 24:
            return {
                "status": "data_unavailable",
                "message": "Need at least 24 observed points for forecasting",
            }

        recent_data = [d["water_level_percent"] for d in self.water_level_data[-24:]]
        current_level = float(recent_data[-1])

        X = np.arange(len(recent_data)).reshape(-1, 1)
        y = np.array(recent_data)
        self.model.fit(X, y)

        now = time.time()
        predictions = []
        for hour in range(1, hours_ahead + 1):
            predicted = float(self.model.predict([[24 + hour]])[0])
            predicted_level = current_level + (predicted - current_level) * 0.1
            predicted_level = max(0.0, min(100.0, predicted_level))
            predictions.append(
                {
                    "hour": hour,
                    "predicted_water_level": round(predicted_level, 2),
                    "timestamp": now + (hour * 3600),
                }
            )

        return {
            "status": "ok",
            "current_level": current_level,
            "predictions": predictions,
            "forecast_generated_at": now,
        }

    def analyze_flood_risk(self) -> Dict[str, Any]:
        """Analyze flood and drought risk based on observed trends."""
        if len(self.water_level_data) < 10:
            return {"status": "data_unavailable", "alerts": []}

        current_level = float(self.water_level_data[-1]["water_level_percent"])
        recent_rainfall = float(sum([d["rainfall_mm"] for d in self.rainfall_data[-24:]]))

        recent_5 = np.mean([d["water_level_percent"] for d in self.water_level_data[-5:]])
        older_5 = np.mean([d["water_level_percent"] for d in self.water_level_data[-10:-5]])
        trend = float(recent_5 - older_5)

        flood_risk = "LOW"
        drought_risk = "LOW"
        alerts: List[str] = []

        if current_level > 85 and trend > 2:
            flood_risk = "HIGH"
            alerts.append("FLOOD WARNING: Water level rising rapidly")
        elif current_level > 75 or (current_level > 60 and recent_rainfall > 50):
            flood_risk = "MEDIUM"
            alerts.append("Flood watch: Monitor water levels closely")

        if current_level < 20 and trend < -1:
            drought_risk = "HIGH"
            alerts.append("DROUGHT WARNING: Water level critically low")
        elif current_level < 35 and recent_rainfall < 5:
            drought_risk = "MEDIUM"
            alerts.append("Drought watch: Low water levels detected")

        return {
            "status": "ok",
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
        return self._is_initialized

    @property
    def last_ingest_at(self) -> Optional[float]:
        return self._last_ingest_at

    def samples_last_hours(self, hours: int = 24) -> int:
        cutoff = time.time() - (hours * 3600)
        return sum(1 for d in self.water_level_data if float(d.get("timestamp", 0)) >= cutoff)

    @property
    def data_summary(self) -> Dict[str, Any]:
        return {
            "water_level": len(self.water_level_data),
            "rainfall": len(self.rainfall_data),
            "dam_gates": len(self.dam_gate_data),
            "last_ingest_at": self._last_ingest_at,
            "samples_24h": self.samples_last_hours(24),
            "model_data_window": "last_24_points",
        }


# Singleton instance
forecasting_system = TimeSeriesForecastingSystem()

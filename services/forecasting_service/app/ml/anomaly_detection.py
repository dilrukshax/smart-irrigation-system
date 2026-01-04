"""
Anomaly Detection for Irrigation System

Provides multiple anomaly detection algorithms:
- Statistical methods (Z-score, IQR)
- Isolation Forest (ML-based)
- DBSCAN clustering
- Moving average deviation
- Seasonal anomaly detection

Designed for detecting:
- Unusual water levels
- Abnormal sensor readings
- Equipment malfunctions
- Irrigation system anomalies
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# Try to import sklearn for ML-based methods
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
    logger.info("scikit-learn available - ML anomaly detection enabled")
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not available - using statistical methods only")


class AnomalySeverity(Enum):
    """Severity levels for detected anomalies."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """Container for detected anomaly."""
    index: int
    timestamp: Optional[str]
    value: float
    expected_value: float
    deviation: float
    severity: AnomalySeverity
    detection_method: str
    description: str


class AnomalyDetector:
    """
    Multi-method anomaly detection system.
    
    Combines statistical and ML-based approaches for robust anomaly detection.
    """
    
    def __init__(self, sensitivity: float = 1.0):
        """
        Initialize anomaly detector.
        
        Args:
            sensitivity: Detection sensitivity (0.5 = less sensitive, 2.0 = more sensitive)
        """
        self.sensitivity = sensitivity
        self.isolation_forest = None
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.baseline_stats: Dict[str, Dict] = {}
    
    def detect_zscore_anomalies(
        self,
        data: np.ndarray,
        threshold: float = 3.0,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies using Z-score method.
        
        Values more than threshold standard deviations from mean are flagged.
        
        Args:
            data: Input data array
            threshold: Z-score threshold (default 3.0)
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        threshold = threshold / self.sensitivity
        
        mean = np.mean(data)
        std = np.std(data)
        
        if std == 0:
            return []
        
        z_scores = np.abs((data - mean) / std)
        
        anomalies = []
        for i, (value, z) in enumerate(zip(data, z_scores)):
            if z > threshold:
                severity = self._calculate_severity(z, threshold)
                anomalies.append(Anomaly(
                    index=i,
                    timestamp=timestamps[i] if timestamps else None,
                    value=float(value),
                    expected_value=float(mean),
                    deviation=float(z),
                    severity=severity,
                    detection_method="z_score",
                    description=f"Value {value:.2f} is {z:.1f} standard deviations from mean ({mean:.2f})"
                ))
        
        return anomalies
    
    def detect_iqr_anomalies(
        self,
        data: np.ndarray,
        multiplier: float = 1.5,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies using Interquartile Range (IQR) method.
        
        Robust to outliers in the data itself.
        
        Args:
            data: Input data array
            multiplier: IQR multiplier (1.5 = standard, 3.0 = extreme only)
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        multiplier = multiplier / self.sensitivity
        
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - multiplier * iqr
        upper_bound = q3 + multiplier * iqr
        median = np.median(data)
        
        anomalies = []
        for i, value in enumerate(data):
            if value < lower_bound or value > upper_bound:
                deviation = (value - median) / (iqr + 1e-6)
                severity = self._calculate_severity(abs(deviation), multiplier)
                
                anomalies.append(Anomaly(
                    index=i,
                    timestamp=timestamps[i] if timestamps else None,
                    value=float(value),
                    expected_value=float(median),
                    deviation=float(deviation),
                    severity=severity,
                    detection_method="iqr",
                    description=f"Value {value:.2f} outside IQR bounds [{lower_bound:.2f}, {upper_bound:.2f}]"
                ))
        
        return anomalies
    
    def detect_isolation_forest_anomalies(
        self,
        data: np.ndarray,
        contamination: float = 0.05,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies using Isolation Forest algorithm.
        
        ML-based method that isolates anomalies by random feature splitting.
        
        Args:
            data: Input data array (can be multivariate)
            contamination: Expected proportion of anomalies
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        if not SKLEARN_AVAILABLE:
            logger.warning("sklearn not available, falling back to Z-score")
            return self.detect_zscore_anomalies(data, timestamps=timestamps)
        
        # Reshape if 1D
        if len(data.shape) == 1:
            data_2d = data.reshape(-1, 1)
        else:
            data_2d = data
        
        # Scale data
        data_scaled = self.scaler.fit_transform(data_2d)
        
        # Fit Isolation Forest
        contamination = min(0.5, contamination * self.sensitivity)
        self.isolation_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        
        predictions = self.isolation_forest.fit_predict(data_scaled)
        scores = self.isolation_forest.score_samples(data_scaled)
        
        # -1 indicates anomaly
        anomaly_indices = np.where(predictions == -1)[0]
        
        mean_value = np.mean(data if len(data.shape) == 1 else data[:, 0])
        
        anomalies = []
        for i in anomaly_indices:
            value = data[i] if len(data.shape) == 1 else data[i, 0]
            score = abs(scores[i])
            severity = self._score_to_severity(score)
            
            anomalies.append(Anomaly(
                index=int(i),
                timestamp=timestamps[i] if timestamps else None,
                value=float(value),
                expected_value=float(mean_value),
                deviation=float(score),
                severity=severity,
                detection_method="isolation_forest",
                description=f"Isolation Forest detected anomaly with score {score:.3f}"
            ))
        
        return anomalies
    
    def detect_moving_average_anomalies(
        self,
        data: np.ndarray,
        window_size: int = 24,
        threshold: float = 2.0,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies based on deviation from moving average.
        
        Useful for detecting sudden changes in trending data.
        
        Args:
            data: Input data array
            window_size: Size of moving average window
            threshold: Number of standard deviations for anomaly
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        threshold = threshold / self.sensitivity
        
        if len(data) < window_size:
            window_size = max(3, len(data) // 3)
        
        # Calculate moving average and standard deviation
        moving_avg = np.convolve(data, np.ones(window_size)/window_size, mode='valid')
        
        # Pad to match original length
        pad_size = len(data) - len(moving_avg)
        moving_avg = np.concatenate([np.full(pad_size, moving_avg[0]), moving_avg])
        
        # Calculate rolling std
        moving_std = np.array([
            np.std(data[max(0, i-window_size):i+1]) 
            for i in range(len(data))
        ])
        moving_std[moving_std == 0] = 1e-6
        
        # Calculate deviations
        deviations = np.abs(data - moving_avg) / moving_std
        
        anomalies = []
        for i, (value, dev) in enumerate(zip(data, deviations)):
            if dev > threshold:
                severity = self._calculate_severity(dev, threshold)
                anomalies.append(Anomaly(
                    index=i,
                    timestamp=timestamps[i] if timestamps else None,
                    value=float(value),
                    expected_value=float(moving_avg[i]),
                    deviation=float(dev),
                    severity=severity,
                    detection_method="moving_average",
                    description=f"Value {value:.2f} deviates {dev:.1f}σ from moving average ({moving_avg[i]:.2f})"
                ))
        
        return anomalies
    
    def detect_seasonal_anomalies(
        self,
        data: np.ndarray,
        period: int = 24,
        threshold: float = 2.5,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies considering seasonal patterns.
        
        Compares each point to typical values for that time of day/week.
        
        Args:
            data: Input data array
            period: Seasonal period (24 for daily, 168 for weekly)
            threshold: Deviation threshold
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        threshold = threshold / self.sensitivity
        
        if len(data) < period * 2:
            return self.detect_zscore_anomalies(data, timestamps=timestamps)
        
        # Calculate seasonal statistics
        n_periods = len(data) // period
        reshaped = data[:n_periods * period].reshape(n_periods, period)
        
        seasonal_mean = np.mean(reshaped, axis=0)
        seasonal_std = np.std(reshaped, axis=0)
        seasonal_std[seasonal_std == 0] = 1e-6
        
        # Extend to cover all data points
        extended_mean = np.tile(seasonal_mean, len(data) // period + 1)[:len(data)]
        extended_std = np.tile(seasonal_std, len(data) // period + 1)[:len(data)]
        
        # Calculate seasonal deviations
        deviations = np.abs(data - extended_mean) / extended_std
        
        anomalies = []
        for i, (value, dev) in enumerate(zip(data, deviations)):
            if dev > threshold:
                severity = self._calculate_severity(dev, threshold)
                position = i % period
                anomalies.append(Anomaly(
                    index=i,
                    timestamp=timestamps[i] if timestamps else None,
                    value=float(value),
                    expected_value=float(extended_mean[i]),
                    deviation=float(dev),
                    severity=severity,
                    detection_method="seasonal",
                    description=f"Value {value:.2f} unusual for position {position} in cycle (expected ~{extended_mean[i]:.2f})"
                ))
        
        return anomalies
    
    def detect_rate_of_change_anomalies(
        self,
        data: np.ndarray,
        max_rate: Optional[float] = None,
        threshold: float = 3.0,
        timestamps: Optional[List[str]] = None
    ) -> List[Anomaly]:
        """
        Detect anomalies based on rate of change.
        
        Useful for detecting sudden spikes or drops.
        
        Args:
            data: Input data array
            max_rate: Maximum expected rate of change (auto-calculated if None)
            threshold: Z-score threshold for rate of change
            timestamps: Optional list of timestamps
            
        Returns:
            List of detected anomalies
        """
        threshold = threshold / self.sensitivity
        
        # Calculate differences
        diffs = np.diff(data)
        
        if max_rate is None:
            mean_diff = np.mean(np.abs(diffs))
            std_diff = np.std(diffs)
            max_rate = mean_diff + threshold * std_diff
        
        anomalies = []
        for i, diff in enumerate(diffs):
            if abs(diff) > max_rate:
                severity = self._calculate_severity(abs(diff) / max_rate, 1.0)
                direction = "increase" if diff > 0 else "decrease"
                anomalies.append(Anomaly(
                    index=i + 1,  # Index of the point after the change
                    timestamp=timestamps[i + 1] if timestamps else None,
                    value=float(data[i + 1]),
                    expected_value=float(data[i]),
                    deviation=float(abs(diff)),
                    severity=severity,
                    detection_method="rate_of_change",
                    description=f"Rapid {direction} of {abs(diff):.2f} (max expected: {max_rate:.2f})"
                ))
        
        return anomalies
    
    def detect_all(
        self,
        data: np.ndarray,
        timestamps: Optional[List[str]] = None,
        methods: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Run all or specified anomaly detection methods.
        
        Args:
            data: Input data array
            timestamps: Optional list of timestamps
            methods: List of methods to use (default: all)
            
        Returns:
            Dict with anomalies from all methods and consensus
        """
        available_methods = {
            "z_score": lambda: self.detect_zscore_anomalies(data, timestamps=timestamps),
            "iqr": lambda: self.detect_iqr_anomalies(data, timestamps=timestamps),
            "isolation_forest": lambda: self.detect_isolation_forest_anomalies(data, timestamps=timestamps),
            "moving_average": lambda: self.detect_moving_average_anomalies(data, timestamps=timestamps),
            "seasonal": lambda: self.detect_seasonal_anomalies(data, timestamps=timestamps),
            "rate_of_change": lambda: self.detect_rate_of_change_anomalies(data, timestamps=timestamps)
        }
        
        if methods is None:
            methods = list(available_methods.keys())
        
        results = {}
        all_anomaly_indices = {}
        
        for method in methods:
            if method in available_methods:
                try:
                    anomalies = available_methods[method]()
                    results[method] = [self._anomaly_to_dict(a) for a in anomalies]
                    
                    for a in anomalies:
                        if a.index not in all_anomaly_indices:
                            all_anomaly_indices[a.index] = []
                        all_anomaly_indices[a.index].append(method)
                except Exception as e:
                    logger.error(f"Error in {method}: {e}")
                    results[method] = {"error": str(e)}
        
        # Calculate consensus anomalies
        consensus = []
        for idx, methods_detected in all_anomaly_indices.items():
            if len(methods_detected) >= 2:  # At least 2 methods agree
                consensus.append({
                    "index": idx,
                    "timestamp": timestamps[idx] if timestamps else None,
                    "value": float(data[idx]),
                    "detection_methods": methods_detected,
                    "confidence": len(methods_detected) / len(methods),
                    "severity": "HIGH" if len(methods_detected) >= 3 else "MEDIUM"
                })
        
        return {
            "data_length": len(data),
            "methods_used": methods,
            "results_by_method": results,
            "total_anomalies_per_method": {m: len(r) if isinstance(r, list) else 0 for m, r in results.items()},
            "consensus_anomalies": sorted(consensus, key=lambda x: x["confidence"], reverse=True),
            "consensus_count": len(consensus),
            "summary": {
                "most_anomalous_indices": [c["index"] for c in consensus[:10]],
                "detection_rate": len(all_anomaly_indices) / len(data) if len(data) > 0 else 0
            }
        }
    
    def _calculate_severity(self, deviation: float, threshold: float) -> AnomalySeverity:
        """Calculate anomaly severity based on deviation."""
        ratio = deviation / threshold
        
        if ratio < 1.5:
            return AnomalySeverity.LOW
        elif ratio < 2.5:
            return AnomalySeverity.MEDIUM
        elif ratio < 4.0:
            return AnomalySeverity.HIGH
        else:
            return AnomalySeverity.CRITICAL
    
    def _score_to_severity(self, score: float) -> AnomalySeverity:
        """Convert isolation forest score to severity."""
        if score < 0.5:
            return AnomalySeverity.LOW
        elif score < 0.6:
            return AnomalySeverity.MEDIUM
        elif score < 0.7:
            return AnomalySeverity.HIGH
        else:
            return AnomalySeverity.CRITICAL
    
    def _anomaly_to_dict(self, anomaly: Anomaly) -> Dict[str, Any]:
        """Convert Anomaly dataclass to dict."""
        return {
            "index": anomaly.index,
            "timestamp": anomaly.timestamp,
            "value": anomaly.value,
            "expected_value": anomaly.expected_value,
            "deviation": anomaly.deviation,
            "severity": anomaly.severity.value,
            "detection_method": anomaly.detection_method,
            "description": anomaly.description
        }
    
    def set_baseline(
        self,
        data_type: str,
        data: np.ndarray
    ) -> Dict[str, Any]:
        """
        Set baseline statistics for a data type.
        
        Args:
            data_type: Type of data (e.g., 'water_level', 'rainfall')
            data: Historical baseline data
            
        Returns:
            Dict with baseline statistics
        """
        stats = {
            "mean": float(np.mean(data)),
            "std": float(np.std(data)),
            "median": float(np.median(data)),
            "q1": float(np.percentile(data, 25)),
            "q3": float(np.percentile(data, 75)),
            "min": float(np.min(data)),
            "max": float(np.max(data)),
            "n_samples": len(data)
        }
        
        self.baseline_stats[data_type] = stats
        
        return {
            "data_type": data_type,
            "baseline_set": True,
            "statistics": stats
        }
    
    def detect_against_baseline(
        self,
        data_type: str,
        value: float
    ) -> Dict[str, Any]:
        """
        Check if a single value is anomalous against baseline.
        
        Args:
            data_type: Type of data
            value: Value to check
            
        Returns:
            Dict with anomaly assessment
        """
        if data_type not in self.baseline_stats:
            return {"error": f"No baseline set for {data_type}"}
        
        baseline = self.baseline_stats[data_type]
        
        z_score = (value - baseline["mean"]) / (baseline["std"] + 1e-6)
        iqr = baseline["q3"] - baseline["q1"]
        is_iqr_outlier = value < (baseline["q1"] - 1.5 * iqr) or value > (baseline["q3"] + 1.5 * iqr)
        
        is_anomaly = abs(z_score) > 3 or is_iqr_outlier
        
        if abs(z_score) > 4 or (is_iqr_outlier and abs(z_score) > 3):
            severity = "CRITICAL"
        elif abs(z_score) > 3:
            severity = "HIGH"
        elif abs(z_score) > 2:
            severity = "MEDIUM"
        elif abs(z_score) > 1.5:
            severity = "LOW"
        else:
            severity = "NORMAL"
        
        return {
            "data_type": data_type,
            "value": value,
            "is_anomaly": is_anomaly,
            "severity": severity,
            "z_score": float(z_score),
            "is_iqr_outlier": is_iqr_outlier,
            "baseline": baseline,
            "assessment": f"{'Anomalous' if is_anomaly else 'Normal'} - {severity}"
        }


# Singleton instance
anomaly_detector = AnomalyDetector()

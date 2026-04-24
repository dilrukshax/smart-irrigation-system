"""
Bootstrap script for the F3 advanced forecasting models.

Trains all models expected by `AdvancedForecastingSystem.load_models()`:
    models/random_forest.pkl
    models/gradient_boosting.pkl
    models/quantile_10.pkl
    models/quantile_50.pkl
    models/quantile_90.pkl
    models/lstm_model.keras
    models/scaler_X.pkl
    models/scaler_y.pkl
    models/metrics.pkl

Generates a synthetic but realistic hourly reservoir/rainfall time-series
(Udawalawe characteristics) and delegates to the service's own
`AdvancedForecastingSystem.train_models()` so the saved artifacts are byte-
for-byte compatible with the runtime loader.

For production-grade accuracy, re-run the full Udawalawe notebook pipeline.

Usage:
    python scripts/bootstrap_advanced_forecasting.py

Requires: tensorflow, scikit-learn, numpy, pandas
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Make the service package importable when running this script directly.
SERVICE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_DIR))

from app.ml.advanced_forecasting import AdvancedForecastingSystem  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def generate_synthetic_timeseries(
    hours: int = 24 * 365,
    seed: int = 42,
) -> list[dict]:
    """Generate realistic hourly Udawalawe-like reservoir data."""
    rng = np.random.default_rng(seed)
    start = pd.Timestamp("2023-01-01", tz="UTC")
    ts = pd.date_range(start, periods=hours, freq="h", tz="UTC")

    # Base seasonal + daily oscillation for water level (%).
    day_of_year = ts.dayofyear.values
    seasonal = 60 + 15 * np.sin(2 * np.pi * day_of_year / 365)
    daily = 2 * np.sin(2 * np.pi * ts.hour.values / 24)

    # Rainfall: sparse, monsoon-heavy. Most hours zero, occasional peaks.
    rainfall = np.zeros(hours)
    # Monsoon Sep-Feb more rain, Jun-Aug drought
    month = ts.month.values
    monsoon_factor = np.where(np.isin(month, [9, 10, 11, 12, 1, 2]), 3.5, 0.8)
    rain_events = rng.random(hours) < (0.05 * monsoon_factor / 3.5)
    rainfall[rain_events] = rng.exponential(4.0, rain_events.sum())
    # Occasional large events
    big_events = rng.random(hours) < 0.003
    rainfall[big_events] += rng.exponential(15.0, big_events.sum())

    # Gate opening responds to water level (simple control).
    gate_opening = np.clip(100 - seasonal + rng.normal(0, 5, hours), 0, 100)

    # Water level responds to rainfall (+), gate opening (-), noise.
    water_level = seasonal + daily
    for i in range(1, hours):
        water_level[i] = 0.90 * water_level[i - 1] + 0.10 * water_level[i]
        water_level[i] += 0.08 * rainfall[i]
        water_level[i] -= 0.05 * (gate_opening[i] / 100) * 2
        water_level[i] += rng.normal(0, 0.4)
    water_level = np.clip(water_level, 10, 95)

    records = [
        {
            "timestamp": t.timestamp(),  # AdvancedForecastingSystem expects unix seconds
            "water_level_percent": float(water_level[i]),
            "rainfall_mm": float(rainfall[i]),
            "gate_opening_percent": float(gate_opening[i]),
        }
        for i, t in enumerate(ts)
    ]
    return records


def main() -> None:
    models_dir = SERVICE_DIR / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Generating synthetic hourly reservoir time-series...")
    data = generate_synthetic_timeseries(hours=24 * 365)  # 1 year hourly
    logger.info("Generated %d records", len(data))

    logger.info("Initializing AdvancedForecastingSystem with models_dir=%s", models_dir)
    system = AdvancedForecastingSystem(models_dir=str(models_dir))

    logger.info("Loading data into the system...")
    system.initialize_data(data)

    logger.info("Training models (RF, GB, Quantile, LSTM)...")
    metrics = system.train_models(test_size=0.2)

    logger.info("Training complete.")
    logger.info("Metrics:")
    for model_name, m in metrics.items():
        rmse = m.get("rmse", float("nan"))
        r2 = m.get("r2", float("nan"))
        logger.info("  %-20s RMSE=%.3f  R^2=%.3f", model_name, rmse, r2)

    # train_models() calls save_models() internally; verify artifacts on disk.
    expected = [
        "random_forest.pkl", "gradient_boosting.pkl",
        "quantile_10.pkl", "quantile_50.pkl", "quantile_90.pkl",
        "scaler_X.pkl", "scaler_y.pkl", "metrics.pkl", "lstm_model.keras",
    ]
    missing = [f for f in expected if not (models_dir / f).exists()]
    if missing:
        logger.warning("Missing expected artifacts: %s", missing)
    else:
        logger.info("All %d expected artifacts saved to %s", len(expected), models_dir)

    logger.info("")
    logger.info("NOTE: Bootstrap uses synthetic data. For production accuracy, re-train")
    logger.info("on real Udawalawe reservoir data via the forecasting notebook.")


if __name__ == "__main__":
    main()

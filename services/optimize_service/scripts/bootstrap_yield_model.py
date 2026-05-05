"""Bootstrap script: train GradientBoostingRegressor yield model.

Trains three artifacts:
  app/models/yield_regressor_gb.joblib   — point estimate (P50)
  app/models/yield_regressor_p10.joblib  — P10 quantile regressor
  app/models/yield_regressor_p90.joblib  — P90 quantile regressor

Usage:
  python scripts/bootstrap_yield_model.py
  python scripts/bootstrap_yield_model.py --use-real-data   # query DB first
  python scripts/bootstrap_yield_model.py --min-real-rows 200

When --use-real-data is set and the database contains >= min-real-rows of
non-synthetic historical yields, only real data is used. Otherwise synthetic
rows are appended to reach min-real-rows per crop.
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
SERVICE_ROOT = SCRIPT_DIR.parent
MODELS_DIR = SERVICE_ROOT / "app" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_ORDER = [
    "soil_ph",
    "soil_ec",
    "soil_suitability",
    "water_availability_mm",
    "season_encoded",
    "growth_duration_days",
    "water_used_mm",
    "latitude",
    "longitude",
]

# ---------------------------------------------------------------------------
# Synthetic data generation
# ---------------------------------------------------------------------------

CROP_PROFILES = [
    # (crop_id, typical_yield_t_ha, water_mm, duration_days)
    ("paddy",       4.5, 1100, 120),
    ("maize",       5.0,  500, 110),
    ("tomato",     25.0,  450, 100),
    ("onion",      15.0,  400, 110),
    ("green_gram",  1.5,  350,  75),
    ("black_gram",  1.2,  350,  80),
    ("chili",       3.0,  700, 160),
    ("cabbage",    30.0,  420,  95),
    ("groundnut",   2.5,  400, 100),
    ("potato",     20.0,  450, 100),
]


def _synthesize(n_per_crop: int = 200, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    X, y = [], []
    for _, base_yield, water_mm, duration in CROP_PROFILES:
        for _ in range(n_per_crop):
            soil_ph = rng.uniform(5.0, 8.0)
            soil_ec = rng.uniform(0.2, 4.0)
            soil_suit = rng.uniform(0.3, 1.0)
            water_avail = rng.uniform(200, 1500)
            season = rng.randint(0, 1)
            dur = duration + rng.randint(-15, 15)
            water_used = water_mm * rng.uniform(0.7, 1.1)
            lat = rng.uniform(6.0, 10.0)
            lon = rng.uniform(79.5, 82.0)

            ph_factor = max(0.5, 1.0 - abs(soil_ph - 6.5) / 3.0)
            ec_factor = 1.0 if soil_ec < 2.0 else max(0.4, 1.0 - (soil_ec - 2.0) / 4.0)
            water_factor = min(1.0, water_avail / (water_mm * 1.2))
            soil_factor = soil_suit * ph_factor * ec_factor

            true_yield = base_yield * soil_factor * water_factor
            true_yield += np_rng.normal(0, base_yield * 0.07)
            true_yield = max(0.3, min(base_yield * 1.4, true_yield))

            X.append([soil_ph, soil_ec, soil_suit, water_avail, season, dur, water_used, lat, lon])
            y.append(true_yield)
    return np.array(X, dtype=float), np.array(y, dtype=float)


# ---------------------------------------------------------------------------
# Real-data loader (optional DB fetch)
# ---------------------------------------------------------------------------


def _load_real_data() -> tuple[np.ndarray, np.ndarray] | None:
    try:
        sys.path.insert(0, str(SERVICE_ROOT))
        from app.data.db import SessionLocal
        from app.data.models_orm import HistoricalYield, Field, Crop
        from sqlalchemy.orm import Session

        db: Session = SessionLocal()
        try:
            rows = (
                db.query(HistoricalYield, Field, Crop)
                .join(Field, HistoricalYield.field_id == Field.id)
                .join(Crop, HistoricalYield.crop_id == Crop.id)
                .filter(HistoricalYield.is_synthetic == False)  # noqa: E712
                .all()
            )
        finally:
            db.close()

        if not rows:
            return None

        X, y = [], []
        for hy, field, crop in rows:
            season_enc = 0 if "Maha" in (hy.season or "") else 1
            X.append([
                field.soil_ph or 6.5,
                field.soil_ec or 1.0,
                field.soil_suitability or 0.7,
                field.water_availability_mm or 500.0,
                season_enc,
                crop.growth_duration_days or 120,
                hy.water_used_mm or 700.0,
                field.latitude or 8.0,
                field.longitude or 80.5,
            ])
            y.append(float(hy.yield_t_per_ha))

        logger.info("Loaded %d real yield rows from database", len(rows))
        return np.array(X, dtype=float), np.array(y, dtype=float)
    except Exception as exc:
        logger.warning("Could not load real data from DB: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------


def train(use_real_data: bool = False, min_real_rows: int = 200) -> None:
    X_syn, y_syn = _synthesize(n_per_crop=300)

    if use_real_data:
        real = _load_real_data()
        if real is not None and len(real[0]) >= min_real_rows:
            X_real, y_real = real
            X = np.vstack([X_real, X_syn[:max(0, min_real_rows - len(X_real))]])
            y = np.concatenate([y_real, y_syn[:max(0, min_real_rows - len(y_real))]])
            logger.info("Using %d real + %d synthetic rows", len(X_real), len(X) - len(X_real))
        else:
            X, y = X_syn, y_syn
            logger.info("Not enough real data; using %d synthetic rows", len(X))
    else:
        X, y = X_syn, y_syn
        logger.info("Training on %d synthetic rows", len(X))

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.15, random_state=42)

    # Point-estimate model
    gbr = GradientBoostingRegressor(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42)
    gbr.fit(X_train, y_train)
    gbr.version = "2.0.0-gbr"  # type: ignore[attr-defined]
    gbr.feature_names = FEATURE_ORDER  # type: ignore[attr-defined]
    train_mae = mean_absolute_error(y_train, gbr.predict(X_train))
    val_mae = mean_absolute_error(y_val, gbr.predict(X_val))
    logger.info("GBR — train MAE: %.3f  val MAE: %.3f", train_mae, val_mae)
    joblib.dump(gbr, str(MODELS_DIR / "yield_regressor_gb.joblib"))
    logger.info("Saved yield_regressor_gb.joblib")

    # P10 quantile model
    p10 = GradientBoostingRegressor(
        loss="quantile", alpha=0.10, n_estimators=150, max_depth=3, learning_rate=0.1, random_state=42
    )
    p10.fit(X_train, y_train)
    joblib.dump(p10, str(MODELS_DIR / "yield_regressor_p10.joblib"))
    logger.info("Saved yield_regressor_p10.joblib")

    # P90 quantile model
    p90 = GradientBoostingRegressor(
        loss="quantile", alpha=0.90, n_estimators=150, max_depth=3, learning_rate=0.1, random_state=42
    )
    p90.fit(X_train, y_train)
    joblib.dump(p90, str(MODELS_DIR / "yield_regressor_p90.joblib"))
    logger.info("Saved yield_regressor_p90.joblib")

    logger.info("Bootstrap complete — 3 artifacts written to %s", MODELS_DIR)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap F4 yield regressor")
    parser.add_argument("--use-real-data", action="store_true", help="Query DB for non-synthetic rows")
    parser.add_argument("--min-real-rows", type=int, default=200, help="Min real rows before DB is used exclusively")
    args = parser.parse_args()
    train(use_real_data=args.use_real_data, min_real_rows=args.min_real_rows)

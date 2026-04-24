"""
Bootstrap script for the F4 LightGBM price prediction model.

Produces all 5 artifacts expected by `app/ml/price_model.py`:
    app/models/price_prediction_lgb.joblib
    app/models/label_encoder_item.joblib
    app/models/label_encoder_location.joblib
    app/models/label_encoder_season.joblib
    app/models/label_encoder_monsoon.joblib

Trains LightGBM on synthetic but realistic Sri Lankan crop-price data so the
service uses a real model instead of its rule-based fallback.

For production-grade accuracy, re-run the full Hector + Kaggle pipeline via
`notebooks/Adaptive Crop & Area Optimization.ipynb`.

Usage:
    python scripts/bootstrap_price_model.py

Requires: lightgbm, scikit-learn, numpy, joblib
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
from sklearn.preprocessing import LabelEncoder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[1] / "app" / "models"

# Categorical vocabularies for Sri Lankan context.
ITEMS = [
    "Paddy", "Rice", "Tomato", "Onion", "Chili", "Green gram", "Black gram",
    "Groundnut", "Maize", "Cabbage", "Carrot", "Beans", "Brinjal",
    "Potato", "Pumpkin", "Banana", "Coconut", "Pepper", "Cardamom", "Tea",
]
LOCATIONS = [
    "Kandy", "Dambulla", "Anuradhapura", "Polonnaruwa", "Kurunegala",
    "Colombo", "Galle", "Matara", "Jaffna", "Batticaloa", "Ratnapura",
    "Nuwara Eliya", "Badulla", "Trincomalee", "Ampara",
]
SEASONS = ["Yala", "Maha"]
MONSOONS = ["Southwest", "Northeast", "Inter-monsoon"]

FEATURE_NAMES = [
    "location_encoded", "month", "quarter", "season_encoded", "monsoon_encoded",
    "temp_mean_weekly", "precip_weekly_sum", "radiation_weekly_sum", "et0_weekly_sum",
    "latitude", "longitude", "elevation", "gdd_weekly", "water_stress_index",
    "dist_to_coast_km", "temp_range_weekly", "item_encoded",
    "price_lag_1w", "price_lag_4w", "price_lag_12w",
    "price_ma_4w", "price_ma_12w", "price_std_12w", "price_change_pct_4w",
]

# Rough base prices (LKR/kg) per item — shape the synthetic target.
ITEM_BASE_PRICE = {
    "Paddy": 110, "Rice": 170, "Tomato": 240, "Onion": 220, "Chili": 640,
    "Green gram": 420, "Black gram": 450, "Groundnut": 380, "Maize": 88,
    "Cabbage": 140, "Carrot": 180, "Beans": 260, "Brinjal": 160,
    "Potato": 200, "Pumpkin": 120, "Banana": 100, "Coconut": 85,
    "Pepper": 1400, "Cardamom": 5200, "Tea": 1200,
}


def build_encoders() -> dict[str, LabelEncoder]:
    encoders: dict[str, LabelEncoder] = {}
    for name, classes in [
        ("item", ITEMS),
        ("location", LOCATIONS),
        ("season", SEASONS),
        ("monsoon", MONSOONS),
    ]:
        encoder = LabelEncoder()
        encoder.fit(classes)
        encoders[name] = encoder
    return encoders


def generate_training_data(
    encoders: dict[str, LabelEncoder],
    n_samples: int = 10_000,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X = np.zeros((n_samples, len(FEATURE_NAMES)))
    y = np.zeros(n_samples)

    for i in range(n_samples):
        item = rng.choice(ITEMS)
        location = rng.choice(LOCATIONS)
        month = int(rng.integers(1, 13))
        season = "Yala" if month in {5, 6, 7, 8, 9} else "Maha"
        if month in {5, 6, 7, 8, 9}:
            monsoon = "Southwest"
        elif month in {10, 11, 12, 1, 2}:
            monsoon = "Northeast"
        else:
            monsoon = "Inter-monsoon"

        temp_mean = float(rng.normal(28, 2.5))
        precip = max(0.0, float(rng.normal(50, 40)))
        radiation = float(rng.normal(150, 30))
        et0 = float(rng.normal(30, 6))
        lat = float(rng.uniform(5.9, 9.9))
        lon = float(rng.uniform(79.6, 81.9))
        elevation = max(0.0, float(rng.normal(200, 300)))
        gdd = float(rng.normal(150, 30))
        water_stress = float(np.clip(rng.normal(0.3, 0.15), 0, 1))
        coast = float(rng.uniform(5, 150))
        temp_range = float(rng.normal(8, 1.5))

        base = ITEM_BASE_PRICE[item]
        # Historic prices with seasonal drift + noise.
        trend = base * (1.0 + rng.normal(0, 0.05))
        history = base * (1.0 + np.cumsum(rng.normal(0, 0.01, 12)))
        history = np.clip(history, base * 0.7, base * 1.4)
        price_lag_1w = float(history[-1])
        price_lag_4w = float(history[-4])
        price_lag_12w = float(history[-12])
        price_ma_4w = float(history[-4:].mean())
        price_ma_12w = float(history.mean())
        price_std_12w = float(history.std())
        price_change_pct_4w = (price_lag_1w - price_lag_4w) / max(price_lag_4w, 1e-3) * 100

        # Target: next-week price.
        seasonal_bonus = 1.0 + (0.05 if season == "Maha" else -0.02)
        weather_factor = 1.0 + (precip - 50) / 500 - water_stress * 0.1
        target = trend * seasonal_bonus * weather_factor + rng.normal(0, base * 0.04)
        target = float(max(target, base * 0.5))

        X[i] = [
            encoders["location"].transform([location])[0],
            month,
            (month - 1) // 3 + 1,
            encoders["season"].transform([season])[0],
            encoders["monsoon"].transform([monsoon])[0],
            temp_mean, precip, radiation, et0,
            lat, lon, elevation, gdd, water_stress,
            coast, temp_range,
            encoders["item"].transform([item])[0],
            price_lag_1w, price_lag_4w, price_lag_12w,
            price_ma_4w, price_ma_12w, price_std_12w, price_change_pct_4w,
        ]
        y[i] = target

    return X, y


def train_model(X: np.ndarray, y: np.ndarray) -> lgb.LGBMRegressor:
    model = lgb.LGBMRegressor(
        n_estimators=400,
        learning_rate=0.05,
        max_depth=8,
        num_leaves=64,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_samples=10,
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    split = int(len(X) * 0.85)
    model.fit(
        X[:split], y[:split],
        eval_set=[(X[split:], y[split:])],
        callbacks=[lgb.early_stopping(20, verbose=False)],
    )
    logger.info("Train R^2: %.3f", model.score(X[:split], y[:split]))
    logger.info("Val   R^2: %.3f", model.score(X[split:], y[split:]))
    return model


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    encoders = build_encoders()
    for name, enc in encoders.items():
        path = MODELS_DIR / f"label_encoder_{name}.joblib"
        joblib.dump(enc, path)
        logger.info("Saved encoder %s (%d classes) → %s", name, len(enc.classes_), path.name)

    logger.info("Generating synthetic training data...")
    X, y = generate_training_data(encoders, n_samples=10_000)

    logger.info("Training LightGBM regressor on %d samples, %d features", X.shape[0], X.shape[1])
    model = train_model(X, y)

    model_path = MODELS_DIR / "price_prediction_lgb.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved LightGBM model → %s", model_path.name)
    logger.info("")
    logger.info("NOTE: Bootstrap uses synthetic data. For production accuracy, re-train")
    logger.info("using notebooks/Adaptive Crop & Area Optimization.ipynb with Hector + Kaggle data.")


if __name__ == "__main__":
    main()

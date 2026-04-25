"""
Bootstrap script for the F4 Random Forest crop recommendation model.

Produces `app/models/crop_recommendation_rf.joblib` — a sklearn
RandomForestClassifier matching the 16-feature, N-class contract
documented in `app/ml/crop_recommendation_model.py::get_feature_names`.

Trains on synthetic-but-realistic Sri Lankan crop/field combinations so the
service uses a real model instead of returning empty recommendations.

For production-grade accuracy, re-run the full Hector + Kaggle pipeline via
`notebooks/Adaptive Crop & Area Optimization.ipynb`.

Usage:
    python scripts/bootstrap_crop_recommendation.py

Requires: scikit-learn, numpy, joblib
"""

from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[1] / "app" / "models"
MODEL_PATH = MODELS_DIR / "crop_recommendation_rf.joblib"

# Matches get_feature_names() in app/ml/crop_recommendation_model.py
FEATURE_NAMES = [
    "soil_suitability", "water_coverage_ratio", "soil_ph", "soil_ec",
    "season_avg_temp", "season_rainfall_mm", "growth_duration_days",
    "climate_score", "price_zscore", "historical_yield_avg",
    "water_sensitivity_encoded", "terrain_type_encoded", "soil_type_encoded",
    "season_encoded", "location_latitude", "location_longitude",
]

# Class = crop. Profiles describe the sweet-spot of each crop.
# (preferred_ph, preferred_rainfall, preferred_temp, water_sensitivity,
#  preferred_soil_type_enc, growth_duration_days)
CROP_PROFILES = {
    "Paddy":      (6.0,  800, 28, 0.2, 1, 120),
    "Maize":      (6.5,  500, 26, 0.5, 2, 100),
    "Chili":      (6.2,  450, 27, 0.6, 2, 90),
    "Groundnut":  (6.4,  450, 28, 0.7, 3, 100),
    "Green gram": (6.5,  400, 28, 0.7, 3, 70),
    "Tomato":     (6.3,  600, 26, 0.4, 2, 85),
    "Onion":      (6.5,  500, 26, 0.5, 2, 110),
    "Soybean":    (6.5,  500, 27, 0.6, 2, 95),
    "Potato":     (5.5,  550, 20, 0.4, 3, 90),
    "Cabbage":    (6.5,  550, 22, 0.3, 3, 85),
}
CROP_NAMES = list(CROP_PROFILES.keys())


def synthesize_sample(
    class_idx: int, rng: np.random.Generator
) -> tuple[np.ndarray, int]:
    """Generate one (features, label) pair near the chosen crop's sweet spot."""
    crop = CROP_NAMES[class_idx]
    pref_ph, pref_rain, pref_temp, water_sens, soil_enc, duration = CROP_PROFILES[crop]

    # Features centered around the preference but noisy
    soil_suitability = float(np.clip(rng.normal(0.75, 0.12), 0.1, 1.0))
    water_coverage = float(np.clip(rng.normal(0.80, 0.15), 0.1, 1.0))
    soil_ph = float(np.clip(rng.normal(pref_ph, 0.4), 4.5, 8.5))
    soil_ec = float(np.clip(rng.normal(0.8, 0.3), 0.1, 3.0))
    season_avg_temp = float(np.clip(rng.normal(pref_temp, 2.0), 18, 34))
    season_rainfall = float(np.clip(rng.normal(pref_rain, 150), 100, 2000))
    growth_duration = float(np.clip(rng.normal(duration, 10), 60, 180))
    climate_score = float(np.clip(rng.normal(0.7, 0.15), 0.1, 1.0))
    price_zscore = float(rng.normal(0, 1))
    historical_yield = float(np.clip(rng.normal(3.0, 1.0), 0.5, 7.0))
    water_sensitivity_enc = float(np.clip(rng.normal(water_sens, 0.08), 0.1, 0.95))
    terrain_enc = int(rng.integers(0, 4))
    soil_type_enc = int(np.clip(rng.normal(soil_enc, 0.6), 0, 4))
    season_enc = int(rng.integers(0, 2))  # 0=Yala, 1=Maha
    latitude = float(rng.uniform(5.9, 9.9))
    longitude = float(rng.uniform(79.6, 81.9))

    features = np.array([
        soil_suitability, water_coverage, soil_ph, soil_ec,
        season_avg_temp, season_rainfall, growth_duration,
        climate_score, price_zscore, historical_yield,
        water_sensitivity_enc, terrain_enc, soil_type_enc,
        season_enc, latitude, longitude,
    ])
    return features, class_idx


def generate_training_data(
    n_per_class: int = 400,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    X = np.zeros((n_per_class * len(CROP_NAMES), len(FEATURE_NAMES)))
    y = np.zeros(n_per_class * len(CROP_NAMES), dtype=int)

    for class_idx in range(len(CROP_NAMES)):
        for j in range(n_per_class):
            features, label = synthesize_sample(class_idx, rng)
            idx = class_idx * n_per_class + j
            X[idx] = features
            y[idx] = label

    # Shuffle
    perm = rng.permutation(len(y))
    return X[perm], y[perm]


def train_model(X: np.ndarray, y: np.ndarray) -> RandomForestClassifier:
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    split = int(len(X) * 0.85)
    model.fit(X[:split], y[:split])
    train_acc = model.score(X[:split], y[:split])
    val_acc = model.score(X[split:], y[split:])
    logger.info("Train accuracy: %.3f", train_acc)
    logger.info("Val   accuracy: %.3f", val_acc)
    return model


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Crop classes (%d): %s", len(CROP_NAMES), ", ".join(CROP_NAMES))

    logger.info("Generating synthetic training data...")
    X, y = generate_training_data(n_per_class=400)
    logger.info("Training set shape: %s", X.shape)

    logger.info("Training RandomForestClassifier on %d samples, %d features, %d classes",
                X.shape[0], X.shape[1], len(CROP_NAMES))
    model = train_model(X, y)

    joblib.dump(model, MODEL_PATH)
    logger.info("Saved model → %s", MODEL_PATH)
    logger.info("  n_estimators: %d", model.n_estimators)
    logger.info("  n_features:   %d", model.n_features_in_)
    logger.info("  n_classes:    %d", model.n_classes_)
    logger.info("")
    logger.info("NOTE: Bootstrap uses synthetic data. For production accuracy, re-train")
    logger.info("using notebooks/Adaptive Crop & Area Optimization.ipynb with Hector + Kaggle data.")


if __name__ == "__main__":
    main()

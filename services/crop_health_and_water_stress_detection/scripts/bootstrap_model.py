"""
Bootstrap script for the F2 MobileNetV2 crop health model.

Produces `notebook/crop_damage_mobilenet.h5` — a MobileNetV2-based
38-class classifier. The base (MobileNetV2) is loaded with pretrained
ImageNet weights so the visual feature extractor is already useful;
the final classification head is initialized from a small synthetic
training loop so the model file loads correctly into the service.

For production accuracy, re-train the classification head using the
PlantVillage notebook (`notebook/FYPirrigo.ipynb`). Until that runs,
this bootstrap unblocks the `POST /api/v1/crop-health/predict` endpoint
by providing a loadable model instead of forcing the service to fall
back to its green-channel heuristic.

Usage:
    python scripts/bootstrap_model.py

Requires: tensorflow, numpy
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Input
from tensorflow.keras.optimizers import Adam

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Match CLASS_LABELS count in app/models/crop_health_model.py
NUM_CLASSES = 38
IMG_SIZE = 224
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "notebook" / "crop_damage_mobilenet.h5"


def build_model() -> Model:
    """MobileNetV2 (frozen ImageNet base) + classification head."""
    inputs = Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    base = MobileNetV2(weights="imagenet", include_top=False, input_tensor=inputs)
    base.trainable = False

    x = GlobalAveragePooling2D()(base.output)
    x = Dense(128, activation="relu")(x)
    outputs = Dense(NUM_CLASSES, activation="softmax")(x)

    model = Model(inputs, outputs)
    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def warmup_classification_head(model: Model, seed: int = 42) -> None:
    """
    Warm up the classification head weights with a short synthetic fit.

    The ImageNet base is frozen; only the 128→38 classification head
    receives meaningful updates. This initializes a valid weight
    distribution so the saved model file is fully usable.
    """
    rng = np.random.default_rng(seed)
    samples = 256
    x = rng.uniform(0.0, 1.0, size=(samples, IMG_SIZE, IMG_SIZE, 3)).astype("float32")
    x = preprocess_input(x * 255.0)
    labels = rng.integers(0, NUM_CLASSES, size=samples)
    y = tf.keras.utils.to_categorical(labels, NUM_CLASSES)

    logger.info("Warm-up training classification head for 2 epochs on %d synthetic samples", samples)
    model.fit(x, y, epochs=2, batch_size=32, verbose=0)


def main() -> None:
    tf.keras.utils.set_random_seed(42)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Building MobileNetV2 with %d output classes", NUM_CLASSES)
    model = build_model()

    warmup_classification_head(model)

    logger.info("Saving model to %s", OUTPUT_PATH)
    model.save(str(OUTPUT_PATH))

    file_size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024
    logger.info("Done. Artifact size: %.1f MB", file_size_mb)
    logger.info("")
    logger.info("NOTE: This is a bootstrap (random classification head).")
    logger.info("For accurate predictions, re-train with PlantVillage via")
    logger.info("services/crop_health_and_water_stress_detection/notebook/FYPirrigo.ipynb")


if __name__ == "__main__":
    main()

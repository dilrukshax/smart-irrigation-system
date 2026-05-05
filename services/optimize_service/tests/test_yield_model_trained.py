"""Tests for YieldModel with trained GBR artifacts and confidence intervals."""
from __future__ import annotations

import os
import sys
import tempfile
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.ml.yield_model import YieldModel, _GBR_FEATURE_ORDER


def _make_mock_regressor(return_value: float):
    m = MagicMock()
    m.predict.return_value = [return_value]
    return m


# ---------------------------------------------------------------------------
# Feature preparation
# ---------------------------------------------------------------------------

def test_feature_order_has_nine_elements():
    assert len(_GBR_FEATURE_ORDER) == 9


def test_prepare_features_returns_nine_element_list():
    model = YieldModel()
    vec = model._prepare_features({
        "soil_ph": 6.5,
        "soil_ec": 0.3,
        "soil_suitability": 0.7,
        "water_availability_mm": 500.0,
        "season_encoded": 1,
        "growth_duration_days": 120,
        "water_used_mm": 450.0,
        "latitude": 7.9,
        "longitude": 80.7,
    })
    assert len(vec) == 9


def test_prepare_features_uses_defaults_for_missing_keys():
    model = YieldModel()
    vec = model._prepare_features({})
    assert len(vec) == 9
    # All values should be the specified defaults, not None
    assert all(v is not None for v in vec)


# ---------------------------------------------------------------------------
# Heuristic fallback (no artifact present)
# ---------------------------------------------------------------------------

def test_heuristic_fallback_when_no_artifact():
    model = YieldModel()
    # Default init tries the artifact path; if absent, falls back to heuristic
    result = model.predict("F001", "paddy", {"soil_suitability": 0.7})
    assert isinstance(result, float)
    assert result > 0


def test_heuristic_yields_reasonable_range():
    model = YieldModel()
    if not model.use_heuristic:
        pytest.skip("GBR artifact found; heuristic path not exercised")
    result = model.predict("F001", "paddy", {
        "soil_suitability": 0.8,
        "water_coverage_ratio": 0.9,
        "growth_duration_days": 120,
    })
    assert 0.5 <= result <= 12.0


# ---------------------------------------------------------------------------
# GBR model prediction via mock
# ---------------------------------------------------------------------------

def test_predict_uses_gbr_when_loaded():
    model = YieldModel()
    model._model = _make_mock_regressor(5.25)
    model.use_heuristic = False

    result = model.predict("F001", "paddy", {"soil_suitability": 0.8})
    assert result == pytest.approx(5.25, abs=0.01)
    model._model.predict.assert_called_once()


# ---------------------------------------------------------------------------
# Confidence interval
# ---------------------------------------------------------------------------

def test_confidence_interval_p10_lt_p50_lt_p90_with_quantile_models():
    model = YieldModel()
    model._model = _make_mock_regressor(4.0)
    model._model_p10 = _make_mock_regressor(2.8)
    model._model_p90 = _make_mock_regressor(5.5)
    model.use_heuristic = False

    features = {
        "soil_ph": 6.5, "soil_ec": 0.3, "soil_suitability": 0.7,
        "water_availability_mm": 500.0, "season_encoded": 1,
        "growth_duration_days": 120, "water_used_mm": 450.0,
        "latitude": 7.9, "longitude": 80.7,
    }
    p10, p50, p90 = model.get_yield_confidence_interval(features)
    assert p10 < p50 < p90
    assert p10 == pytest.approx(2.8, abs=0.01)
    assert p50 == pytest.approx(4.0, abs=0.01)
    assert p90 == pytest.approx(5.5, abs=0.01)


def test_confidence_interval_symmetric_fallback_without_quantile_models():
    """When quantile models not loaded, falls back to ±15% of point estimate."""
    model = YieldModel()
    # Ensure no quantile models
    model._model_p10 = None
    model._model_p90 = None

    features = {
        "soil_ph": 6.5, "soil_ec": 0.3, "soil_suitability": 0.7,
        "water_availability_mm": 500.0, "season_encoded": 1,
        "growth_duration_days": 120, "water_used_mm": 450.0,
        "latitude": 7.9, "longitude": 80.7,
    }
    p10, p50, p90 = model.get_yield_confidence_interval(features)
    assert p10 < p50 < p90
    assert p10 > 0
    # Should be ±15%
    assert p10 == pytest.approx(p50 * 0.85, rel=0.05)
    assert p90 == pytest.approx(p50 * 1.15, rel=0.05)


def test_confidence_interval_p10_never_below_threshold():
    model = YieldModel()
    model._model = _make_mock_regressor(0.2)
    model._model_p10 = _make_mock_regressor(-5.0)  # unrealistically negative
    model._model_p90 = _make_mock_regressor(1.0)
    model.use_heuristic = False

    features = {"soil_suitability": 0.5}
    p10, p50, p90 = model.get_yield_confidence_interval(features)
    assert p10 >= 0.1


# ---------------------------------------------------------------------------
# Load model from joblib file
# ---------------------------------------------------------------------------

def test_load_model_from_joblib_file():
    pytest.importorskip("sklearn")
    pytest.importorskip("joblib")
    import joblib
    from sklearn.linear_model import LinearRegression
    import numpy as np

    lr = LinearRegression()
    X = np.random.rand(20, 9)
    y = np.random.rand(20) * 5
    lr.fit(X, y)

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
        joblib.dump(lr, f.name)
        path = f.name

    try:
        model = YieldModel(model_path=path)
        assert model.use_heuristic is False
        result = model.predict("F001", "paddy", {"soil_suitability": 0.7})
        assert isinstance(result, float)
    finally:
        os.unlink(path)

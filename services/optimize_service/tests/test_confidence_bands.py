"""Tests for yield and price confidence band computation and recommendation confidence."""
from __future__ import annotations

import os
import sys
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.ml.inference import (
    compute_price_confidence_bands,
    compute_recommendation_confidence,
    compute_yield_confidence_bands,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db_yield_stats(mean: float, std: float, count: int):
    """Return a mock DB session whose query returns (mean, std, count)."""
    mock_db = MagicMock()
    mock_result = (mean, std, count)
    (
        mock_db.query.return_value
        .filter.return_value
        .one_or_none.return_value
    ) = mock_result
    return mock_db


def _mock_db_price_stats(mean: float, std: float, count: int):
    mock_db = MagicMock()
    mock_result = (mean, std, count)
    # chain: .query().filter().filter().one_or_none() — two .filter() calls
    (
        mock_db.query.return_value
        .filter.return_value
        .filter.return_value
        .one_or_none.return_value
    ) = mock_result
    # also handle single-filter chain in case query uses a combined filter
    (
        mock_db.query.return_value
        .filter.return_value
        .one_or_none.return_value
    ) = mock_result
    return mock_db


# ---------------------------------------------------------------------------
# compute_yield_confidence_bands
# ---------------------------------------------------------------------------

def test_yield_bands_no_db_uses_model():
    """Without a DB session, returns model-based intervals."""
    bands = compute_yield_confidence_bands("F001", "paddy", {}, db_session=None)
    assert "yield_p10" in bands
    assert "yield_p50" in bands
    assert "yield_p90" in bands
    p10, p50, p90 = bands["yield_p10"], bands["yield_p50"], bands["yield_p90"]
    assert p10 is not None and p50 is not None and p90 is not None
    assert p10 < p50 < p90


def test_yield_bands_with_enough_history():
    """With ≥3 historical rows, uses mean±1.28σ from DB."""
    mock_db = _mock_db_yield_stats(mean=4.5, std=0.5, count=10)
    bands = compute_yield_confidence_bands("F001", "paddy", {}, db_session=mock_db)
    expected_p50 = 4.5
    expected_p10 = round(max(0.1, 4.5 - 1.28 * 0.5), 2)
    expected_p90 = round(4.5 + 1.28 * 0.5, 2)
    assert bands["yield_p50"] == pytest.approx(expected_p50, abs=0.01)
    assert bands["yield_p10"] == pytest.approx(expected_p10, abs=0.01)
    assert bands["yield_p90"] == pytest.approx(expected_p90, abs=0.01)


def test_yield_bands_with_insufficient_history_falls_back():
    """With < 3 historical rows, falls back to model interval (not DB)."""
    mock_db = _mock_db_yield_stats(mean=4.5, std=0.5, count=2)
    bands = compute_yield_confidence_bands("F001", "paddy", {}, db_session=mock_db)
    # p10 < p50 < p90 should still hold regardless of source
    assert bands["yield_p10"] < bands["yield_p50"] < bands["yield_p90"]


def test_yield_bands_p10_never_negative():
    """p10 must be ≥ 0.1 even with very large std."""
    mock_db = _mock_db_yield_stats(mean=0.5, std=10.0, count=15)
    bands = compute_yield_confidence_bands("F001", "paddy", {}, db_session=mock_db)
    assert bands["yield_p10"] >= 0.1


# ---------------------------------------------------------------------------
# compute_price_confidence_bands
# ---------------------------------------------------------------------------

def test_price_bands_no_db_returns_none():
    bands = compute_price_confidence_bands("paddy", db_session=None)
    assert bands["price_p10"] is None
    assert bands["price_p50"] is None
    assert bands["price_p90"] is None


def test_price_bands_with_enough_history():
    """With ≥5 price rows, uses mean±1.28σ."""
    mock_db = _mock_db_price_stats(mean=85.0, std=10.0, count=20)
    bands = compute_price_confidence_bands("paddy", db_session=mock_db)
    expected_p50 = 85.0
    expected_p10 = round(max(0.0, 85.0 - 1.28 * 10.0), 2)
    expected_p90 = round(85.0 + 1.28 * 10.0, 2)
    assert bands["price_p50"] == pytest.approx(expected_p50, abs=0.01)
    assert bands["price_p10"] == pytest.approx(expected_p10, abs=0.01)
    assert bands["price_p90"] == pytest.approx(expected_p90, abs=0.01)


def test_price_bands_with_insufficient_history_returns_none():
    mock_db = _mock_db_price_stats(mean=85.0, std=10.0, count=3)
    bands = compute_price_confidence_bands("paddy", db_session=mock_db)
    assert bands["price_p10"] is None


def test_price_bands_p10_never_negative():
    mock_db = _mock_db_price_stats(mean=5.0, std=100.0, count=20)
    bands = compute_price_confidence_bands("paddy", db_session=mock_db)
    if bands["price_p10"] is not None:
        assert bands["price_p10"] >= 0.0


# ---------------------------------------------------------------------------
# compute_recommendation_confidence
# ---------------------------------------------------------------------------

def test_confidence_minimum_synthetic_heuristic():
    """All-synthetic, heuristic model yields moderate base confidence."""
    score = compute_recommendation_confidence(
        suitability_score=0.5,
        data_quality={"is_yield_synthetic": True, "is_price_synthetic": True},
        model_type="heuristic",
    )
    assert 0.0 < score <= 1.0
    # base = 0.4 + 0.5 * 0.3 = 0.55
    assert score == pytest.approx(0.55, abs=0.01)


def test_confidence_real_data_trained_model():
    """Real data + trained model pushes confidence significantly higher."""
    score = compute_recommendation_confidence(
        suitability_score=0.8,
        data_quality={
            "is_yield_synthetic": False,
            "yield_row_count": 10,
            "is_price_synthetic": False,
            "price_row_count": 10,
        },
        model_type="gradient_boosting",
    )
    # base = 0.4 + 0.8*0.3 = 0.64, +0.1 +0.05 +0.1 +0.05 +0.1 = 1.04 → capped 1.0
    assert score == pytest.approx(1.0, abs=0.01)


def test_confidence_partial_real_data():
    score = compute_recommendation_confidence(
        suitability_score=0.7,
        data_quality={
            "is_yield_synthetic": False,
            "yield_row_count": 8,
            "is_price_synthetic": True,
        },
        model_type="heuristic",
    )
    assert 0.5 < score < 1.0


def test_confidence_capped_at_one():
    score = compute_recommendation_confidence(
        suitability_score=1.0,
        data_quality={
            "is_yield_synthetic": False,
            "yield_row_count": 100,
            "is_price_synthetic": False,
            "price_row_count": 100,
        },
        model_type="trained",
    )
    assert score <= 1.0

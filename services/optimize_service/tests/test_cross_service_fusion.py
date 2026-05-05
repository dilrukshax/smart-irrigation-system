"""Tests for cross-service fusion helpers (F2 stress, F3 drought risk, scenario variants)."""
from __future__ import annotations

import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.cross_service_fusion import (
    apply_drought_risk_to_water_coverage,
    apply_stress_penalty_to_suitability,
    build_scenario_variants,
    fetch_f2_stress_penalty,
    fetch_f3_drought_risk,
    fetch_f3_weather_bands,
)


# ---------------------------------------------------------------------------
# Pure functions (no I/O)
# ---------------------------------------------------------------------------

class TestApplyStressPenaltyToSuitability:
    def test_no_penalty_returns_original(self):
        assert apply_stress_penalty_to_suitability(0.8, None) == pytest.approx(0.8)

    def test_zero_penalty_returns_original(self):
        assert apply_stress_penalty_to_suitability(0.8, 0.0) == pytest.approx(0.8)

    def test_half_penalty_with_default_weight(self):
        # 0.8 * (1 - 0.5 * 0.3) = 0.8 * 0.85 = 0.68
        result = apply_stress_penalty_to_suitability(0.8, 0.5)
        assert result == pytest.approx(0.68, abs=0.001)

    def test_full_penalty_max_reduction_30_pct(self):
        # stress=1.0, weight=0.3 → suitability * 0.7
        result = apply_stress_penalty_to_suitability(1.0, 1.0, weight=0.3)
        assert result == pytest.approx(0.7, abs=0.001)

    def test_result_never_negative(self):
        result = apply_stress_penalty_to_suitability(0.0, 1.0)
        assert result >= 0.0

    def test_result_never_above_one(self):
        result = apply_stress_penalty_to_suitability(1.0, 0.0)
        assert result <= 1.0


class TestApplyDroughtRiskToWaterCoverage:
    def test_no_risk_returns_original(self):
        assert apply_drought_risk_to_water_coverage(0.9, None) == pytest.approx(0.9)

    def test_zero_risk_returns_original(self):
        assert apply_drought_risk_to_water_coverage(0.9, 0.0) == pytest.approx(0.9)

    def test_moderate_risk(self):
        # 0.8 * (1 - 0.4 * 0.5) = 0.8 * 0.8 = 0.64
        result = apply_drought_risk_to_water_coverage(0.8, 0.4)
        assert result == pytest.approx(0.64, abs=0.001)

    def test_result_bounded_zero_one(self):
        assert apply_drought_risk_to_water_coverage(0.0, 1.0) >= 0.0
        assert apply_drought_risk_to_water_coverage(1.0, 0.0) <= 1.0


class TestBuildScenarioVariants:
    @pytest.fixture()
    def base_rec(self):
        return {
            "crop_id": "paddy",
            "predicted_yield_t_ha": 4.0,
            "gross_revenue_per_ha": 200_000.0,
            "profit_per_ha": 80_000.0,
        }

    def test_returns_three_keys(self, base_rec):
        variants = build_scenario_variants(
            base_rec, water_p10=0.6, water_p50=0.8, water_p90=1.0
        )
        assert set(variants.keys()) == {"optimistic", "base", "pessimistic"}

    def test_base_scenario_unchanged_yield(self, base_rec):
        variants = build_scenario_variants(
            base_rec, water_p10=0.6, water_p50=0.8, water_p90=1.0
        )
        assert variants["base"]["predicted_yield_t_ha"] == pytest.approx(4.0, abs=0.01)

    def test_optimistic_gt_base_gt_pessimistic_yield(self, base_rec):
        variants = build_scenario_variants(
            base_rec, water_p10=0.6, water_p50=0.8, water_p90=1.0
        )
        opt = variants["optimistic"]["predicted_yield_t_ha"]
        base = variants["base"]["predicted_yield_t_ha"]
        pess = variants["pessimistic"]["predicted_yield_t_ha"]
        assert opt > base > pess

    def test_does_not_mutate_original(self, base_rec):
        original_yield = base_rec["predicted_yield_t_ha"]
        build_scenario_variants(base_rec, water_p10=0.5, water_p50=0.8, water_p90=1.1)
        assert base_rec["predicted_yield_t_ha"] == original_yield

    def test_water_scenario_ratio_in_variants(self, base_rec):
        variants = build_scenario_variants(
            base_rec, water_p10=0.6, water_p50=0.8, water_p90=1.0
        )
        for key, variant in variants.items():
            assert "water_scenario_ratio" in variant


# ---------------------------------------------------------------------------
# Async HTTP fetches (mocked)
# ---------------------------------------------------------------------------

def _make_mock_response(status_code: int, body: dict):
    resp = MagicMock()
    resp.status_code = status_code
    resp.content = b"1"
    resp.json.return_value = body
    return resp


class TestFetchF2StressPenalty:
    @pytest.mark.asyncio
    async def test_returns_stress_penalty_factor(self):
        mock_resp = _make_mock_response(200, {"stress_penalty_factor": 0.35})
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f2_stress_penalty("http://f2", "F001")
        assert result == pytest.approx(0.35)

    @pytest.mark.asyncio
    async def test_returns_none_on_404(self):
        mock_resp = _make_mock_response(404, {})
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f2_stress_penalty("http://f2", "F001")
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_on_network_error(self):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("connection refused"))
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f2_stress_penalty("http://f2", "F001")
        assert result is None


class TestFetchF3DroughtRisk:
    @pytest.mark.asyncio
    async def test_positive_adjustment_yields_zero_risk(self):
        body = {"weekly_outlook": {"average_irrigation_adjustment_percent": 20.0}}
        mock_resp = _make_mock_response(200, body)
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f3_drought_risk("http://f3")
        assert result == 0.0

    @pytest.mark.asyncio
    async def test_negative_adjustment_yields_positive_risk(self):
        body = {"weekly_outlook": {"average_irrigation_adjustment_percent": -50.0}}
        mock_resp = _make_mock_response(200, body)
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f3_drought_risk("http://f3")
        assert result == pytest.approx(0.5, abs=0.01)

    @pytest.mark.asyncio
    async def test_returns_none_on_failure(self):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("timeout"))
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f3_drought_risk("http://f3")
        assert result is None


class TestFetchF3WeatherBands:
    @pytest.mark.asyncio
    async def test_returns_water_band_dict(self):
        body = {"drought_risk": 0.2, "flood_risk": 0.1}
        mock_resp = _make_mock_response(200, body)
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f3_weather_bands("http://f3")
        assert result is not None
        assert "water_p10" in result
        assert "water_p50" in result
        assert "water_p90" in result
        assert result["water_p10"] < result["water_p50"] < result["water_p90"]

    @pytest.mark.asyncio
    async def test_returns_none_on_failure(self):
        with patch("httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = AsyncMock(side_effect=Exception("timeout"))
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            result = await fetch_f3_weather_bands("http://f3")
        assert result is None

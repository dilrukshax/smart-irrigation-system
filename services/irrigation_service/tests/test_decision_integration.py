"""Decision-loop integration tests for irrigation auto-control logic."""

from unittest.mock import patch

import pytest

from app.api.crop_fields import (
    IoTSensorData,
    _crop_fields,
    _make_auto_control_decision,
    resolve_device_to_field,
)


def _sample_sensor_data(water_level: float, soil_moisture: float) -> IoTSensorData:
    return IoTSensorData(
        device_id="esp32-rice-01",
        timestamp="2026-03-07T00:00:00Z",
        water_level_pct=water_level,
        soil_moisture_pct=soil_moisture,
        soil_ao=2200,
        water_ao=1500,
    )


@patch("app.api.crop_fields._fetch_forecast_adjustment")
@patch("app.api.crop_fields._fetch_stress_summary")
def test_auto_decision_uses_forecast_and_stress(mock_stress, mock_forecast):
    """High stress + higher forecast demand should increase irrigation urgency."""
    field = _crop_fields["field-rice-01"]

    mock_forecast.return_value = {
        "adjustment_pct": 135.0,
        "overall_recommendation": "INCREASE",
        "net_water_balance_mm": -22.0,
        "alert": "Increase irrigation demand expected",
    }
    mock_stress.return_value = {
        "stress_index": 0.82,
        "priority": "high",
        "stress_penalty_factor": 0.35,
    }

    decision = _make_auto_control_decision(
        field_id="field-rice-01",
        config=field,
        sensor_data=_sample_sensor_data(water_level=40.0, soil_moisture=58.0),
    )

    assert decision.action == "OPEN"
    assert decision.priority in {"high", "critical"}
    assert decision.ml_prediction is not None
    assert decision.ml_prediction["forecast_adjustment_pct"] == 135.0
    assert decision.ml_prediction["stress_priority"] == "high"


@patch("app.api.crop_fields._fetch_forecast_adjustment")
@patch("app.api.crop_fields._fetch_stress_summary")
def test_auto_decision_can_reduce_irrigation_with_wet_forecast(mock_stress, mock_forecast):
    """Rain-heavy forecast with high field water should close valves."""
    field = _crop_fields["field-rice-01"]

    mock_forecast.return_value = {
        "adjustment_pct": 70.0,
        "overall_recommendation": "REDUCE",
        "net_water_balance_mm": 18.0,
        "alert": "Rainfall surplus expected; reduce irrigation",
    }
    mock_stress.return_value = {
        "stress_index": 0.1,
        "priority": "low",
        "stress_penalty_factor": 0.03,
    }

    decision = _make_auto_control_decision(
        field_id="field-rice-01",
        config=field,
        sensor_data=_sample_sensor_data(water_level=88.0, soil_moisture=90.0),
    )

    assert decision.action == "CLOSE"


@pytest.mark.asyncio
async def test_device_to_field_resolution_endpoint():
    """IoT bridge mapping endpoint should resolve known device ids."""
    result = await resolve_device_to_field("esp32-rice-01")
    assert result["field_id"] == "field-rice-01"

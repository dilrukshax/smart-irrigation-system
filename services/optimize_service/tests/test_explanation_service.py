from __future__ import annotations

from app.services.explanation_service import ExplanationService


def test_generate_explanation_returns_english_copy():
    text = ExplanationService.generate_explanation(
        "why_this_crop",
        "en",
        {"crop_name": "Green Gram", "ph": 6.4, "water_mm": 520, "yield_t": 1.8, "price": 150},
    )
    assert "Green Gram" in text
    assert "water availability" in text


def test_generate_explanation_returns_sinhala_copy():
    text = ExplanationService.generate_explanation(
        "why_this_crop",
        "si",
        {"crop_name": "වගා A", "ph": 6.4, "water_mm": 520, "yield_t": 1.8, "price": 150},
    )
    assert any("\u0d80" <= char <= "\u0dff" for char in text)


def test_compute_change_reason_mentions_crop_switch():
    reason = ExplanationService.compute_change_reason(
        {"crop_name": "Paddy"},
        {"crop_name": "Maize"},
    )
    assert "Paddy" in reason
    assert "Maize" in reason

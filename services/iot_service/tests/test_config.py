"""Tests for IoT service runtime configuration."""

import os

os.environ.setdefault("CONFIG_ENABLED", "false")

from app.core.config import Settings


def test_device_field_map_parses_json() -> None:
    settings = Settings(device_field_map='{"esp32-001":"field-001"}')

    assert settings.get_device_field_map() == {"esp32-001": "field-001"}


def test_device_field_map_parses_comma_pairs() -> None:
    settings = Settings(device_field_map="esp32-001:field-001,esp32-002:field-002")

    assert settings.get_device_field_map() == {
        "esp32-001": "field-001",
        "esp32-002": "field-002",
    }

"""
Irrigation Service Configuration

Manages application settings using Pydantic's BaseSettings.
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    
    # Application settings
    app_name: str = "Irrigation Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8002
    
    # CORS Origins
    cors_origins: list = ["http://localhost:8005", "http://localhost:5173", "http://localhost:8000"]

    # Logging
    log_level: str = "INFO"

    # Runtime behavior
    # None => derive from environment (strict for non-dev)
    strict_live_data: Optional[bool] = None
    ml_only_mode: Optional[bool] = None

    # Cross-service URLs
    forecasting_service_url: str = "http://forecasting-service:8003"
    crop_health_service_url: str = "http://crop_health_and_water_stress_detection:8007"
    optimization_service_url: str = "http://optimization_service:8004"
    auth_service_url: str = "http://auth_service:8001"

    # Database
    database_url: str = "postgresql://aca_o_user:aca_o_password@postgres:5432/aca_o_db"

    # Event broker
    mqtt_broker: str = "mosquitto"
    mqtt_port: int = 1883

    # Local state persistence
    crop_fields_state_path: str = "/tmp/irrigation_crop_fields_state.json"
    water_management_state_path: str = "/tmp/irrigation_water_management_state.json"
    reservoir_snapshot_path: str = "/tmp/irrigation_reservoir_snapshot.json"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def is_strict_live_data(self) -> bool:
        """Resolve strict mode with environment-aware default."""
        if self.is_ml_only_mode:
            return True
        if self.strict_live_data is not None:
            return bool(self.strict_live_data)
        return self.environment.lower() not in {"development", "dev", "local", "test"}

    @property
    def is_ml_only_mode(self) -> bool:
        """Global ML-only flag that hard-disables all non-ML fallbacks."""
        return bool(self.ml_only_mode)


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


settings = get_settings()

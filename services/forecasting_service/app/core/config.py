"""
Forecasting Service Configuration

Manages application settings using Pydantic's BaseSettings.
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application settings
    app_name: str = "Forecasting Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8003
    
    # CORS Origins
    cors_origins: list = ["http://localhost:8005", "http://localhost:5173"]
    
    # Logging
    log_level: str = "INFO"

    # Runtime behavior
    strict_live_data: Optional[bool] = None
    ml_only_mode: Optional[bool] = None

    # Local persistence for ingested observations
    time_series_store_path: str = "/tmp/forecasting_timeseries_store.json"
    
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

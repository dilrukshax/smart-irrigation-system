"""
Configuration settings for the Crop Health & Water Stress Detection Service.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Crop Health & Water Stress Detection Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    STRICT_LIVE_DATA: Optional[bool] = None
    ML_ONLY_MODE: Optional[bool] = None
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8007

    # Event broker
    MQTT_BROKER: str = "mosquitto"
    MQTT_PORT: int = 1883

    # Cross-service integrations
    AUTH_SERVICE_URL: str = "http://auth_service:8001"
    
    # Model
    MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "notebook",
        "crop_damage_mobilenet.h5"
    )
    
    # Image processing
    IMG_SIZE: int = 224
    
    # Default location (Sri Lanka - Udawalawa region)
    DEFAULT_LAT: float = 6.4200
    DEFAULT_LON: float = 80.8900
    DEFAULT_AREA_KM2: float = 10.0
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:8005",
        "http://localhost:8006",
        "http://localhost:8007",
        "http://localhost:5173",
        "http://127.0.0.1:8005",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    # Local persistence for real analysis artifacts used by stress summaries.
    ANALYSIS_ARTIFACTS_PATH: str = "/tmp/crop_health_analysis_artifacts.json"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def is_strict_live_data(self) -> bool:
        if self.is_ml_only_mode:
            return True
        if self.STRICT_LIVE_DATA is not None:
            return bool(self.STRICT_LIVE_DATA)
        return self.ENVIRONMENT.lower() not in {"development", "dev", "local", "test"}

    @property
    def is_ml_only_mode(self) -> bool:
        """Global ML-only flag that hard-disables all non-ML fallbacks."""
        return bool(self.ML_ONLY_MODE)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

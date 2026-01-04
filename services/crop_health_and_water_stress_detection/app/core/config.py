"""
Configuration settings for the Crop Health & Water Stress Detection Service.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Crop Health & Water Stress Detection Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    
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
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()

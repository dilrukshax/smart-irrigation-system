"""
Application Configuration

This module manages all application settings using Pydantic's BaseSettings.
Settings are loaded from environment variables, with fallback to defaults.

Usage:
    from src.core.config import get_settings
    
    settings = get_settings()
    print(settings.app_name)
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Pydantic will automatically:
    - Read from environment variables (case-insensitive)
    - Load from .env file if present
    - Validate types
    - Use defaults when env vars are not set
    
    Attributes:
        app_name: Name of the service
        app_env: Environment (development, staging, production)
        app_port: Port to run the server on
        app_debug: Enable debug mode
        
        db_host: PostgreSQL host
        db_port: PostgreSQL port
        db_user: Database username
        db_password: Database password
        db_name: Database name
        
        irrigation_service_url: URL of the irrigation microservice
        forecasting_service_url: URL of the forecasting microservice
        sediment_service_url: URL of the sediment mapping microservice
        
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    
    # Application settings
    app_name: str = "aca-o-service"
    app_env: str = "development"
    app_port: int = 8004
    app_debug: bool = True
    
    # Database settings (PostgreSQL)
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "aca_o_user"
    db_password: str = "aca_o_password"
    db_name: str = "aca_o_db"
    
    # External service URLs (other microservices in the system)
    irrigation_service_url: str = "http://localhost:8002"
    forecasting_service_url: str = "http://localhost:8003"
    sediment_service_url: str = "http://localhost:8003"
    
    # Logging
    log_level: str = "INFO"
    
    # Model configuration - tells Pydantic where to load settings from
    model_config = SettingsConfigDict(
        env_file=".env",           # Load from .env file if present
        env_file_encoding="utf-8",
        case_sensitive=False,       # Environment variables are case-insensitive
        extra="ignore",             # Ignore extra fields in .env
    )
    
    @property
    def database_url(self) -> str:
        """
        Construct the database URL from individual settings.
        
        Returns:
            str: PostgreSQL connection URL in SQLAlchemy format
        
        Example:
            postgresql://user:password@localhost:5432/dbname
        """
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )
    
    @property
    def database_url_async(self) -> str:
        """
        Construct async database URL for use with asyncpg.
        
        Returns:
            str: Async PostgreSQL connection URL
        """
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings (cached singleton).
    
    Uses lru_cache to ensure settings are only loaded once from
    environment variables/.env file. Subsequent calls return
    the cached instance.
    
    Returns:
        Settings: Application settings instance
    
    Usage:
        settings = get_settings()
        print(settings.app_name)
    """
    return Settings()

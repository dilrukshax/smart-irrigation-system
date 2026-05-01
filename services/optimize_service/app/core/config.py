"""
Application Configuration

This module manages all application settings using Pydantic's BaseSettings.
Settings are loaded from environment variables, with fallback to defaults.

Usage:
    from app.core.config import get_settings

    settings = get_settings()
    print(settings.app_name)
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.config_bootstrap import apply_remote_config


apply_remote_config(default_service_name="optimize_service")

_CONFIG_FILE = Path(__file__).resolve()
_SERVICE_ENV_FILE = _CONFIG_FILE.parents[2] / ".env"
_REPO_ENV_FILE = next(
    (
        parent / ".env"
        for parent in _CONFIG_FILE.parents
        if (parent / "CLAUDE.md").exists()
    ),
    _SERVICE_ENV_FILE,
)


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
    db_sslmode: str = "disable"  # set to "require" for NeonDB/cloud Postgres
    database_url_override: Optional[str] = Field(default=None, validation_alias="DATABASE_URL")
    neon_database_url: Optional[str] = Field(default=None, validation_alias="NEON_DATABASE_URL")

    # External service URLs (other microservices in the system)
    irrigation_service_url: str = "http://localhost:8002"
    forecasting_service_url: str = "http://localhost:8003"
    crop_health_service_url: str = "http://localhost:8007"
    sediment_service_url: str = "http://localhost:8003"
    auth_service_url: str = "http://localhost:8001"

    # Logging
    log_level: str = "INFO"

    # Runtime behavior
    # None => derive from environment (strict for non-dev)
    strict_live_data: Optional[bool] = None
    ml_only_mode: Optional[bool] = None

    # Model configuration - tells Pydantic where to load settings from
    model_config = SettingsConfigDict(
        # Load service-local settings first, then the repo root for shared
        # local-dev values such as NEON_DATABASE_URL.
        env_file=(str(_SERVICE_ENV_FILE), str(_REPO_ENV_FILE)),
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
        if self.database_url_override:
            return self.database_url_override
        if (
            self.neon_database_url
            and self.app_env.lower() in {"development", "dev", "local"}
            and self.db_host.strip().lower() in {"localhost", "127.0.0.1"}
        ):
            return self.neon_database_url

        # URL encode the password to handle special characters like @, %, etc.
        encoded_password = quote_plus(self.db_password)
        ssl = f"?sslmode={self.db_sslmode}" if self.db_sslmode != "disable" else ""
        return (
            f"postgresql://{self.db_user}:{encoded_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}{ssl}"
        )

    @property
    def database_url_async(self) -> str:
        """
        Construct async database URL for use with asyncpg.

        Returns:
            str: Async PostgreSQL connection URL
        """
        if self.database_url_override:
            if self.database_url_override.startswith("postgresql+asyncpg://"):
                return self.database_url_override
            if self.database_url_override.startswith("postgresql://"):
                return self.database_url_override.replace(
                    "postgresql://",
                    "postgresql+asyncpg://",
                    1,
                )
            if self.database_url_override.startswith("postgres://"):
                return self.database_url_override.replace(
                    "postgres://",
                    "postgresql+asyncpg://",
                    1,
                )
            return self.database_url_override
        if (
            self.neon_database_url
            and self.app_env.lower() in {"development", "dev", "local"}
            and self.db_host.strip().lower() in {"localhost", "127.0.0.1"}
        ):
            if self.neon_database_url.startswith("postgresql+asyncpg://"):
                return self.neon_database_url
            if self.neon_database_url.startswith("postgresql://"):
                return self.neon_database_url.replace(
                    "postgresql://",
                    "postgresql+asyncpg://",
                    1,
                )
            if self.neon_database_url.startswith("postgres://"):
                return self.neon_database_url.replace(
                    "postgres://",
                    "postgresql+asyncpg://",
                    1,
                )
            return self.neon_database_url

        # URL encode the password to handle special characters
        encoded_password = quote_plus(self.db_password)
        ssl = f"?sslmode={self.db_sslmode}" if self.db_sslmode != "disable" else ""
        return (
            f"postgresql+asyncpg://{self.db_user}:{encoded_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}{ssl}"
        )

    @property
    def resolved_database_url(self) -> str:
        """Compatibility alias used by legacy modules."""
        return self.database_url

    @property
    def resolved_database_url_async(self) -> str:
        """Compatibility alias used by legacy modules."""
        return self.database_url_async

    @property
    def is_strict_live_data(self) -> bool:
        """Resolve strict mode with environment-aware default."""
        if self.is_ml_only_mode:
            return True
        if self.strict_live_data is not None:
            return bool(self.strict_live_data)
        return self.app_env.lower() not in {"development", "dev", "local", "test"}

    @property
    def is_ml_only_mode(self) -> bool:
        """Global ML-only flag that hard-disables non-ML fallbacks."""
        return bool(self.ml_only_mode)


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

"""Centralized runtime config registry.

All sensitive values are read from environment variables at call time,
so that the config_server process just needs to have the root .env loaded.
No credentials are hardcoded here.
"""

from __future__ import annotations

import os
from copy import deepcopy


def _e(key: str, default: str = "") -> str:
    """Read an environment variable with an optional default."""
    return os.getenv(key, default)


def _docker_db_url() -> str:
    user = _e("POSTGRES_USER", "aca_o_user")
    password = _e("POSTGRES_PASSWORD", "aca_o_password")
    db = _e("POSTGRES_DB", "aca_o_db")
    return f"postgresql://{user}:{password}@postgres:5432/{db}"


def _local_db_url() -> str:
    """NeonDB (or any external DB) used when running services outside Docker."""
    return _e("NEON_DATABASE_URL", "postgresql://localhost:5432/smart_irrigation")


def _postgres_parts(*, default_host: str, default_sslmode: str = "disable") -> dict[str, str]:
    return {
        "DB_HOST": _e("POSTGRES_HOST", default_host),
        "DB_PORT": _e("POSTGRES_PORT", "5432"),
        "DB_USER": _e("POSTGRES_USER", "aca_o_user"),
        "DB_PASSWORD": _e("POSTGRES_PASSWORD", "aca_o_password"),
        "DB_NAME": _e("POSTGRES_DB", "aca_o_db"),
        "DB_SSLMODE": _e("POSTGRES_SSLMODE", default_sslmode),
    }


def _postgres_url_from_parts(parts: dict[str, str]) -> str:
    sslmode = parts["DB_SSLMODE"]
    ssl = f"?sslmode={sslmode}" if sslmode and sslmode != "disable" else ""
    return (
        f"postgresql://{parts['DB_USER']}:{parts['DB_PASSWORD']}"
        f"@{parts['DB_HOST']}:{parts['DB_PORT']}/{parts['DB_NAME']}{ssl}"
    )


def _production_db_url(parts: dict[str, str]) -> str:
    """Prefer a complete managed DB URL, otherwise build one from Postgres parts."""
    return _e("DATABASE_URL") or _e("NEON_DATABASE_URL") or _postgres_url_from_parts(parts)


COMMON_RUNTIME_CONFIG: dict[str, str] = {
    "CONFIG_ENABLED": "true",
    "CONFIG_SERVER_URL": "http://config_server:8010",
    "CONFIG_PROFILE": "docker",
    "CONFIG_TIMEOUT_SEC": "3",
    "CONFIG_FAIL_FAST": "false",
}


def _build_docker_profile() -> dict[str, dict[str, str]]:
    db = _docker_db_url()
    jwt = _e("JWT_SECRET_KEY", "dev-secret-key-change-me")
    mqtt_port = _e("MQTT_PORT", "1883")
    env = _e("ENVIRONMENT", "development")
    debug = _e("DEBUG", "true")

    return {
        "gateway": {
            "HOST": "0.0.0.0",
            "PORT": "8000",
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "PLANNING_SERVICE_URL": "http://optimize_service:8004",
            "IOT_SERVICE_URL": "http://iot_service:8006",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
        },
        "auth_service": {
            "HOST": "0.0.0.0",
            "PORT": "8001",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "DATABASE_URL": db,
            "JWT_SECRET_KEY": jwt,
            "JWT_ALGORITHM": _e("JWT_ALGORITHM", "HS256"),
            "ACCESS_TOKEN_EXPIRE_MINUTES": _e("ACCESS_TOKEN_EXPIRE_MINUTES", "15"),
            "REFRESH_TOKEN_EXPIRE_DAYS": _e("REFRESH_TOKEN_EXPIRE_DAYS", "7"),
        },
        "irrigation_service": {
            "HOST": "0.0.0.0",
            "PORT": "8002",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "DATABASE_URL": db,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "OPTIMIZATION_SERVICE_URL": "http://optimize_service:8004",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
            "IOT_SERVICE_URL": "http://iot_service:8006",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
        },
        "forecasting_service": {
            "HOST": "0.0.0.0",
            "PORT": "8003",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "DATABASE_URL": db,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "STRICT_LIVE_DATA": _e("STRICT_LIVE_DATA", "false"),
            "ML_ONLY_MODE": _e("ML_ONLY_MODE", "false"),
        },
        "optimize_service": {
            "APP_ENV": env,
            "APP_DEBUG": debug,
            "APP_PORT": "8004",
            "DATABASE_URL": db,
            "DB_HOST": "postgres",
            "DB_PORT": "5432",
            "DB_USER": _e("POSTGRES_USER", "aca_o_user"),
            "DB_PASSWORD": _e("POSTGRES_PASSWORD", "aca_o_password"),
            "DB_NAME": _e("POSTGRES_DB", "aca_o_db"),
            "DB_SSLMODE": "disable",
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
        },
        "iot_service": {
            "HOST": "0.0.0.0",
            "PORT": "8006",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "DATABASE_URL": db,
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
            "MQTT_USERNAME": _e("MQTT_USERNAME", ""),
            "MQTT_PASSWORD": _e("MQTT_PASSWORD", ""),
            "INFLUXDB_URL": "http://influxdb:8086",
            "INFLUXDB_ORG": _e("INFLUXDB_ORG", "smart-irrigation"),
            "INFLUXDB_BUCKET": _e("INFLUXDB_BUCKET", "sensors"),
            "INFLUXDB_TOKEN": _e("INFLUXDB_TOKEN", "dev-token-smart-irrigation"),
            "DEVICE_API_KEYS": _e("DEVICE_API_KEYS", ""),
            "DEVICE_FIELD_MAP": _e("DEVICE_FIELD_MAP", ""),
        },
        "crop_health_and_water_stress_detection": {
            "HOST": "0.0.0.0",
            "PORT": "8007",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
            "IMG_SIZE": _e("IMG_SIZE", "224"),
            "DEFAULT_LAT": _e("DEFAULT_LAT", "6.4200"),
            "DEFAULT_LON": _e("DEFAULT_LON", "80.8900"),
            "DEFAULT_AREA_KM2": _e("DEFAULT_AREA_KM2", "10.0"),
        },
    }


def _build_local_profile() -> dict[str, dict[str, str]]:
    db = _local_db_url()
    jwt = _e("JWT_SECRET_KEY", "dev-secret-key-change-me")
    mqtt_port = _e("MQTT_PORT", "1883")
    env = _e("ENVIRONMENT", "development")
    debug = _e("DEBUG", "true")
    config_server = "http://localhost:8010"
    profile = "local"

    return {
        "gateway": {
            "HOST": "0.0.0.0",
            "PORT": "8000",
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "AUTH_SERVICE_URL": "http://localhost:8001",
            "IRRIGATION_SERVICE_URL": "http://localhost:8002",
            "FORECASTING_SERVICE_URL": "http://localhost:8003",
            "PLANNING_SERVICE_URL": "http://localhost:8004",
            "IOT_SERVICE_URL": "http://localhost:8006",
            "CROP_HEALTH_SERVICE_URL": "http://localhost:8007",
        },
        "auth_service": {
            "HOST": "0.0.0.0",
            "PORT": "8001",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "DATABASE_URL": db,
            "JWT_SECRET_KEY": jwt,
            "JWT_ALGORITHM": _e("JWT_ALGORITHM", "HS256"),
            "ACCESS_TOKEN_EXPIRE_MINUTES": _e("ACCESS_TOKEN_EXPIRE_MINUTES", "15"),
            "REFRESH_TOKEN_EXPIRE_DAYS": _e("REFRESH_TOKEN_EXPIRE_DAYS", "7"),
        },
        "irrigation_service": {
            "HOST": "0.0.0.0",
            "PORT": "8002",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "DATABASE_URL": db,
            "AUTH_SERVICE_URL": "http://localhost:8001",
            "FORECASTING_SERVICE_URL": "http://localhost:8003",
            "OPTIMIZATION_SERVICE_URL": "http://localhost:8004",
            "CROP_HEALTH_SERVICE_URL": "http://localhost:8007",
            "IOT_SERVICE_URL": "http://localhost:8006",
            "MQTT_BROKER": "localhost",
            "MQTT_PORT": mqtt_port,
        },
        "forecasting_service": {
            "HOST": "0.0.0.0",
            "PORT": "8003",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "DATABASE_URL": db,
            "AUTH_SERVICE_URL": "http://localhost:8001",
            "STRICT_LIVE_DATA": _e("STRICT_LIVE_DATA", "false"),
            "ML_ONLY_MODE": _e("ML_ONLY_MODE", "false"),
        },
        "optimize_service": {
            "APP_ENV": env,
            "APP_DEBUG": debug,
            "APP_PORT": "8004",
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "DATABASE_URL": db,
            "DB_HOST": "localhost",
            "DB_PORT": "5432",
            "DB_USER": _e("POSTGRES_USER", "aca_o_user"),
            "DB_PASSWORD": _e("POSTGRES_PASSWORD", "aca_o_password"),
            "DB_NAME": _e("POSTGRES_DB", "aca_o_db"),
            "DB_SSLMODE": "disable",
            "IRRIGATION_SERVICE_URL": "http://localhost:8002",
            "FORECASTING_SERVICE_URL": "http://localhost:8003",
            "CROP_HEALTH_SERVICE_URL": "http://localhost:8007",
            "AUTH_SERVICE_URL": "http://localhost:8001",
            "MQTT_BROKER": "localhost",
            "MQTT_PORT": mqtt_port,
        },
        "iot_service": {
            "HOST": "0.0.0.0",
            "PORT": "8006",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "DATABASE_URL": db,
            "IRRIGATION_SERVICE_URL": "http://localhost:8002",
            "MQTT_BROKER": "localhost",
            "MQTT_PORT": mqtt_port,
            "MQTT_USERNAME": _e("MQTT_USERNAME", ""),
            "MQTT_PASSWORD": _e("MQTT_PASSWORD", ""),
            "INFLUXDB_URL": "http://localhost:8086",
            "INFLUXDB_ORG": _e("INFLUXDB_ORG", "smart-irrigation"),
            "INFLUXDB_BUCKET": _e("INFLUXDB_BUCKET", "sensors"),
            "INFLUXDB_TOKEN": _e("INFLUXDB_TOKEN", "dev-token-smart-irrigation"),
            "DEVICE_API_KEYS": _e("DEVICE_API_KEYS", ""),
            "DEVICE_FIELD_MAP": _e("DEVICE_FIELD_MAP", ""),
        },
        "crop_health_and_water_stress_detection": {
            "HOST": "0.0.0.0",
            "PORT": "8007",
            "ENVIRONMENT": env,
            "DEBUG": debug,
            "CONFIG_SERVER_URL": config_server,
            "CONFIG_PROFILE": profile,
            "AUTH_SERVICE_URL": "http://localhost:8001",
            "MQTT_BROKER": "localhost",
            "MQTT_PORT": mqtt_port,
            "IMG_SIZE": _e("IMG_SIZE", "224"),
            "DEFAULT_LAT": _e("DEFAULT_LAT", "6.4200"),
            "DEFAULT_LON": _e("DEFAULT_LON", "80.8900"),
            "DEFAULT_AREA_KM2": _e("DEFAULT_AREA_KM2", "10.0"),
        },
    }


def _build_production_profile() -> dict[str, dict[str, str]]:
    db_parts = _postgres_parts(default_host="postgres")
    db = _production_db_url(db_parts)
    jwt = _e("JWT_SECRET_KEY", "")
    mqtt_port = _e("MQTT_PORT", "1883")
    cors_allowed = _e("CORS_ALLOWED_ORIGINS", "")
    cors_origins = _e("CORS_ORIGINS", "[]")
    strict_live_data = _e("STRICT_LIVE_DATA", "true")
    ml_only_mode = _e("ML_ONLY_MODE", "false")

    return {
        "gateway": {
            "HOST": "0.0.0.0",
            "PORT": "8000",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "CORS_ALLOWED_ORIGINS": cors_allowed,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "PLANNING_SERVICE_URL": "http://optimize_service:8004",
            "IOT_SERVICE_URL": "http://iot_service:8006",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
        },
        "auth_service": {
            "HOST": "0.0.0.0",
            "PORT": "8001",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            "AUTO_CREATE_SCHEMA": "false",
            "ENSURE_CORE_AUTH_SCHEMA": _e("ENSURE_CORE_AUTH_SCHEMA", "false"),
            "SEED_DEFAULT_USERS_ON_STARTUP": "false",
            "JWT_SECRET_KEY": jwt,
            "JWT_ALGORITHM": _e("JWT_ALGORITHM", "HS256"),
            "ACCESS_TOKEN_EXPIRE_MINUTES": _e("ACCESS_TOKEN_EXPIRE_MINUTES", "15"),
            "REFRESH_TOKEN_EXPIRE_DAYS": _e("REFRESH_TOKEN_EXPIRE_DAYS", "7"),
            "CORS_ORIGINS": cors_origins,
        },
        "irrigation_service": {
            "HOST": "0.0.0.0",
            "PORT": "8002",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            "AUTO_CREATE_SCHEMA": "false",
            "STRICT_LIVE_DATA": strict_live_data,
            "ML_ONLY_MODE": ml_only_mode,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "OPTIMIZATION_SERVICE_URL": "http://optimize_service:8004",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
            "IOT_SERVICE_URL": "http://iot_service:8006",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
            "CORS_ORIGINS": cors_origins,
        },
        "forecasting_service": {
            "HOST": "0.0.0.0",
            "PORT": "8003",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "STRICT_LIVE_DATA": strict_live_data,
            "ML_ONLY_MODE": ml_only_mode,
            "CORS_ORIGINS": cors_origins,
        },
        "optimize_service": {
            "APP_ENV": "production",
            "APP_DEBUG": "false",
            "APP_PORT": "8004",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            **db_parts,
            "STRICT_LIVE_DATA": strict_live_data,
            "ML_ONLY_MODE": ml_only_mode,
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
            "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
        },
        "iot_service": {
            "HOST": "0.0.0.0",
            "PORT": "8006",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
            "MQTT_USERNAME": _e("MQTT_USERNAME", ""),
            "MQTT_PASSWORD": _e("MQTT_PASSWORD", ""),
            "INFLUXDB_URL": "http://influxdb:8086",
            "INFLUXDB_ORG": _e("INFLUXDB_ORG", "smart-irrigation"),
            "INFLUXDB_BUCKET": _e("INFLUXDB_BUCKET", "sensors"),
            "INFLUXDB_TOKEN": _e("INFLUXDB_TOKEN", ""),
            "DEVICE_API_KEYS": _e("DEVICE_API_KEYS", ""),
            "DEVICE_FIELD_MAP": _e("DEVICE_FIELD_MAP", ""),
            "CORS_ORIGINS": cors_origins,
        },
        "crop_health_and_water_stress_detection": {
            "HOST": "0.0.0.0",
            "PORT": "8007",
            "ENVIRONMENT": "production",
            "DEBUG": "false",
            "CONFIG_SERVER_URL": "http://config_server:8010",
            "CONFIG_PROFILE": "production",
            "CONFIG_TIMEOUT_SEC": _e("CONFIG_TIMEOUT_SEC", "5"),
            "CONFIG_FAIL_FAST": "true",
            "DATABASE_URL": db,
            "STRICT_LIVE_DATA": strict_live_data,
            "ML_ONLY_MODE": ml_only_mode,
            "AUTH_SERVICE_URL": "http://auth_service:8001",
            "MQTT_BROKER": "mosquitto",
            "MQTT_PORT": mqtt_port,
            "MODEL_PATH": _e(
                "CROP_HEALTH_MODEL_PATH",
                _e("MODEL_PATH", "/app/notebook/crop_damage_mobilenet.h5"),
            ),
            "IMG_SIZE": _e("IMG_SIZE", "224"),
            "DEFAULT_LAT": _e("DEFAULT_LAT", "6.4200"),
            "DEFAULT_LON": _e("DEFAULT_LON", "80.8900"),
            "DEFAULT_AREA_KM2": _e("DEFAULT_AREA_KM2", "10.0"),
            "CORS_ORIGINS": cors_origins,
        },
    }


def list_profiles() -> list[str]:
    return ["docker", "local", "production"]


def get_profile_config(profile: str) -> dict[str, dict[str, str]]:
    if profile == "docker":
        return deepcopy(_build_docker_profile())
    if profile == "local":
        return deepcopy(_build_local_profile())
    if profile == "production":
        return deepcopy(_build_production_profile())
    raise KeyError(f"Unknown profile: {profile}")


def get_service_config(profile: str, service_name: str) -> dict[str, str]:
    profile_config = get_profile_config(profile)
    if service_name not in profile_config:
        raise KeyError(f"Unknown service '{service_name}' for profile '{profile}'")
    merged = {**COMMON_RUNTIME_CONFIG, **profile_config[service_name]}
    merged["CONFIG_PROFILE"] = profile
    merged["CONFIG_SERVICE_NAME"] = service_name
    return merged


def get_all_configs(profile: str) -> dict[str, dict[str, str]]:
    profile_config = get_profile_config(profile)
    return {
        service_name: get_service_config(profile, service_name)
        for service_name in sorted(profile_config.keys())
    }

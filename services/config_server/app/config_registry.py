"""Centralized runtime config registry for local Docker profile."""

from __future__ import annotations

from copy import deepcopy

COMMON_RUNTIME_CONFIG: dict[str, str] = {
    "CONFIG_ENABLED": "true",
    "CONFIG_SERVER_URL": "http://config_server:8010",
    "CONFIG_PROFILE": "docker",
    "CONFIG_TIMEOUT_SEC": "3",
    "CONFIG_FAIL_FAST": "false",
}

DOCKER_PROFILE_CONFIG: dict[str, dict[str, str]] = {
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
        "DEBUG": "true",
        "DATABASE_URL": "postgresql://aca_o_user:aca_o_password@postgres:5432/aca_o_db",
    },
    "irrigation_service": {
        "HOST": "0.0.0.0",
        "PORT": "8002",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "DATABASE_URL": "postgresql://aca_o_user:aca_o_password@postgres:5432/aca_o_db",
        "AUTH_SERVICE_URL": "http://auth_service:8001",
        "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
        "OPTIMIZATION_SERVICE_URL": "http://optimize_service:8004",
        "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
        "IOT_SERVICE_URL": "http://iot_service:8006",
        "MQTT_BROKER": "mosquitto",
        "MQTT_PORT": "1883",
    },
    "forecasting_service": {
        "HOST": "0.0.0.0",
        "PORT": "8003",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "DATABASE_URL": "postgresql://aca_o_user:aca_o_password@postgres:5432/aca_o_db",
        "AUTH_SERVICE_URL": "http://auth_service:8001",
        "STRICT_LIVE_DATA": "false",
        "ML_ONLY_MODE": "false",
    },
    "optimize_service": {
        "APP_ENV": "development",
        "APP_DEBUG": "true",
        "APP_PORT": "8004",
        "DB_HOST": "postgres",
        "DB_PORT": "5432",
        "DB_USER": "aca_o_user",
        "DB_PASSWORD": "aca_o_password",
        "DB_NAME": "aca_o_db",
        "DB_SSLMODE": "disable",
        "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
        "FORECASTING_SERVICE_URL": "http://forecasting_service:8003",
        "CROP_HEALTH_SERVICE_URL": "http://crop_health_and_water_stress_detection:8007",
        "AUTH_SERVICE_URL": "http://auth_service:8001",
        "MQTT_BROKER": "mosquitto",
        "MQTT_PORT": "1883",
    },
    "iot_service": {
        "HOST": "0.0.0.0",
        "PORT": "8006",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "DATABASE_URL": "postgresql://aca_o_user:aca_o_password@postgres:5432/aca_o_db",
        "IRRIGATION_SERVICE_URL": "http://irrigation_service:8002",
        "MQTT_BROKER": "mosquitto",
        "MQTT_PORT": "1883",
        "INFLUXDB_URL": "http://influxdb:8086",
        "INFLUXDB_ORG": "smart-irrigation",
        "INFLUXDB_BUCKET": "sensors",
        "INFLUXDB_TOKEN": "dev-token-smart-irrigation",
    },
    "crop_health_and_water_stress_detection": {
        "HOST": "0.0.0.0",
        "PORT": "8007",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "AUTH_SERVICE_URL": "http://auth_service:8001",
        "MQTT_BROKER": "mosquitto",
        "MQTT_PORT": "1883",
    },
}

LOCAL_PROFILE_CONFIG: dict[str, dict[str, str]] = {
    "gateway": {
        "HOST": "0.0.0.0",
        "PORT": "8000",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
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
        "DEBUG": "true",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "DATABASE_URL": "postgresql://neondb_owner:npg_uhAKbI2qsj3i@ep-still-moon-a1bw6q0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
    "irrigation_service": {
        "HOST": "0.0.0.0",
        "PORT": "8002",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "DATABASE_URL": "postgresql://neondb_owner:npg_uhAKbI2qsj3i@ep-still-moon-a1bw6q0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "AUTH_SERVICE_URL": "http://localhost:8001",
        "FORECASTING_SERVICE_URL": "http://localhost:8003",
        "OPTIMIZATION_SERVICE_URL": "http://localhost:8004",
        "CROP_HEALTH_SERVICE_URL": "http://localhost:8007",
        "IOT_SERVICE_URL": "http://localhost:8006",
        "MQTT_BROKER": "localhost",
        "MQTT_PORT": "1883",
    },
    "forecasting_service": {
        "HOST": "0.0.0.0",
        "PORT": "8003",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "DATABASE_URL": "postgresql://neondb_owner:npg_uhAKbI2qsj3i@ep-still-moon-a1bw6q0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "AUTH_SERVICE_URL": "http://localhost:8001",
        "STRICT_LIVE_DATA": "false",
        "ML_ONLY_MODE": "false",
    },
    "optimize_service": {
        "APP_ENV": "development",
        "APP_DEBUG": "true",
        "APP_PORT": "8004",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_USER": "aca_o_user",
        "DB_PASSWORD": "aca_o_password",
        "DB_NAME": "aca_o_db",
        "DB_SSLMODE": "disable",
        "IRRIGATION_SERVICE_URL": "http://localhost:8002",
        "FORECASTING_SERVICE_URL": "http://localhost:8003",
        "CROP_HEALTH_SERVICE_URL": "http://localhost:8007",
        "AUTH_SERVICE_URL": "http://localhost:8001",
        "MQTT_BROKER": "localhost",
        "MQTT_PORT": "1883",
    },
    "iot_service": {
        "HOST": "0.0.0.0",
        "PORT": "8006",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "DATABASE_URL": "postgresql://neondb_owner:npg_uhAKbI2qsj3i@ep-still-moon-a1bw6q0s-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "IRRIGATION_SERVICE_URL": "http://localhost:8002",
        "MQTT_BROKER": "localhost",
        "MQTT_PORT": "1883",
        "INFLUXDB_URL": "http://localhost:8086",
        "INFLUXDB_ORG": "smart-irrigation",
        "INFLUXDB_BUCKET": "sensors",
        "INFLUXDB_TOKEN": "dev-token-smart-irrigation",
    },
    "crop_health_and_water_stress_detection": {
        "HOST": "0.0.0.0",
        "PORT": "8007",
        "ENVIRONMENT": "development",
        "DEBUG": "true",
        "CONFIG_SERVER_URL": "http://localhost:8010",
        "CONFIG_PROFILE": "local",
        "AUTH_SERVICE_URL": "http://localhost:8001",
        "MQTT_BROKER": "localhost",
        "MQTT_PORT": "1883",
    },
}

PROFILES: dict[str, dict[str, dict[str, str]]] = {
    "docker": DOCKER_PROFILE_CONFIG,
    "local": LOCAL_PROFILE_CONFIG,
}


def list_profiles() -> list[str]:
    """Return supported profile names."""
    return sorted(PROFILES.keys())


def get_profile_config(profile: str) -> dict[str, dict[str, str]]:
    """Return all service configs for a profile."""
    if profile not in PROFILES:
        raise KeyError(f"Unknown profile: {profile}")
    return deepcopy(PROFILES[profile])


def get_service_config(profile: str, service_name: str) -> dict[str, str]:
    """Return merged config for a specific service and profile."""
    profile_config = get_profile_config(profile)
    if service_name not in profile_config:
        raise KeyError(f"Unknown service '{service_name}' for profile '{profile}'")

    merged = {**COMMON_RUNTIME_CONFIG, **profile_config[service_name]}
    merged.setdefault("CONFIG_PROFILE", profile)
    merged.setdefault("CONFIG_SERVICE_NAME", service_name)
    return merged


def get_all_configs(profile: str) -> dict[str, dict[str, str]]:
    """Return merged configs for all services in a profile."""
    profile_config = get_profile_config(profile)
    return {service_name: get_service_config(profile, service_name) for service_name in sorted(profile_config.keys())}

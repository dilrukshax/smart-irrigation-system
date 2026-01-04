"""
IoT Service Configuration

Manages application settings using Pydantic's BaseSettings.
Supports InfluxDB, MQTT, and device authentication configuration.
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    
    # Application settings
    app_name: str = "IoT Telemetry Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8006
    
    # CORS Origins
    cors_origins: list = ["http://localhost:8005", "http://localhost:5173", "http://localhost:8000"]
    
    # Logging
    log_level: str = "INFO"
    
    # InfluxDB Configuration
    influxdb_url: str = "http://influxdb:8086"
    influxdb_token: Optional[str] = None  # Required for writes
    influxdb_org: str = "smart-irrigation"
    influxdb_bucket: str = "sensors"
    
    # MQTT Configuration
    mqtt_broker: str = "mosquitto"
    mqtt_port: int = 1883
    mqtt_username: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_client_id: str = "iot-service"
    mqtt_keepalive: int = 60
    mqtt_reconnect_delay: int = 5
    mqtt_max_reconnect_delay: int = 120
    
    # Device Authentication (comma-separated or JSON map)
    # Format: "device1:apikey1,device2:apikey2" or '{"device1":"apikey1","device2":"apikey2"}'
    device_api_keys: Optional[str] = None
    
    # Sensor Calibration Defaults
    # ADC range for soil moisture sensor (dry to wet)
    soil_adc_dry: int = 4095  # Max ADC value when dry
    soil_adc_wet: int = 1000  # Min ADC value when wet
    
    # ADC range for water level sensor (empty to full)
    water_adc_empty: int = 4095  # Max ADC value when empty
    water_adc_full: int = 500   # Min ADC value when full
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    def get_device_api_keys_map(self) -> dict[str, str]:
        """Parse device API keys into a dictionary."""
        if not self.device_api_keys:
            return {}
        
        import json
        
        # Try JSON format first
        try:
            return json.loads(self.device_api_keys)
        except json.JSONDecodeError:
            pass
        
        # Try comma-separated format: "device1:key1,device2:key2"
        result = {}
        for pair in self.device_api_keys.split(","):
            pair = pair.strip()
            if ":" in pair:
                device_id, api_key = pair.split(":", 1)
                result[device_id.strip()] = api_key.strip()
        
        return result


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


settings = get_settings()

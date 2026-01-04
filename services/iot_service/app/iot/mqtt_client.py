"""
MQTT Client for IoT Telemetry Ingestion.

Provides a robust MQTT subscriber that:
- Connects to MQTT broker with auto-reconnect
- Subscribes to device telemetry topics
- Parses and validates incoming JSON payloads
- Writes validated data to InfluxDB
- Supports publishing commands to devices
"""

import json
import logging
import threading
import time
from typing import Callable, Optional

import paho.mqtt.client as mqtt
from pydantic import ValidationError

from app.core.config import settings
from app.iot.schemas import TelemetryPayload

logger = logging.getLogger(__name__)


class MQTTClient:
    """
    MQTT client for device telemetry ingestion with robust reconnection.
    
    Topics:
    - Subscribe: devices/+/telemetry (wildcard for all devices)
    - Publish commands: devices/{device_id}/cmd
    """
    
    TELEMETRY_TOPIC = "devices/+/telemetry"
    CMD_TOPIC_TEMPLATE = "devices/{device_id}/cmd"
    
    def __init__(self, on_telemetry: Optional[Callable[[TelemetryPayload], None]] = None):
        """
        Initialize MQTT client.
        
        Args:
            on_telemetry: Callback function called when valid telemetry is received.
        """
        self._client: Optional[mqtt.Client] = None
        self._connected = False
        self._should_run = False
        self._reconnect_delay = settings.mqtt_reconnect_delay
        self._on_telemetry = on_telemetry
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to MQTT broker."""
        return self._connected
    
    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """Callback when connected to MQTT broker."""
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {settings.mqtt_broker}:{settings.mqtt_port}")
            self._connected = True
            self._reconnect_delay = settings.mqtt_reconnect_delay
            
            # Subscribe to telemetry topic
            client.subscribe(self.TELEMETRY_TOPIC, qos=1)
            logger.info(f"Subscribed to topic: {self.TELEMETRY_TOPIC}")
        else:
            logger.error(f"Failed to connect to MQTT broker, return code: {rc}")
            self._connected = False
    
    def _on_disconnect(self, client, userdata, disconnect_flags=None, rc=None, properties=None):
        """Callback when disconnected from MQTT broker."""
        self._connected = False
        
        # Handle both paho-mqtt v1.x and v2.x callback signatures
        # v1.x: (client, userdata, rc)
        # v2.x: (client, userdata, disconnect_flags, rc, properties)
        actual_rc = rc if rc is not None else (disconnect_flags if isinstance(disconnect_flags, int) else 0)
        
        if actual_rc != 0:
            logger.warning(f"Unexpected MQTT disconnect (rc={actual_rc}), will attempt reconnect...")
        else:
            logger.info("MQTT client disconnected")
    
    def _on_message(self, client, userdata, msg):
        """Callback when message received."""
        try:
            topic = msg.topic
            payload_str = msg.payload.decode("utf-8")
            
            logger.debug(f"Received message on {topic}: {payload_str[:200]}...")
            
            # Extract device_id from topic: devices/{device_id}/telemetry
            topic_parts = topic.split("/")
            if len(topic_parts) >= 3 and topic_parts[0] == "devices" and topic_parts[2] == "telemetry":
                device_id_from_topic = topic_parts[1]
            else:
                logger.warning(f"Unexpected topic format: {topic}")
                return
            
            # Parse JSON payload
            try:
                payload_dict = json.loads(payload_str)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON payload from {device_id_from_topic}: {e}")
                return
            
            # Use device_id from topic if not in payload
            if "device_id" not in payload_dict:
                payload_dict["device_id"] = device_id_from_topic
            
            # Validate with Pydantic
            try:
                telemetry = TelemetryPayload(**payload_dict)
            except ValidationError as e:
                logger.error(f"Invalid telemetry payload from {device_id_from_topic}: {e}")
                return
            
            # Call the callback if registered
            if self._on_telemetry:
                try:
                    self._on_telemetry(telemetry)
                except Exception as e:
                    logger.error(f"Error in telemetry callback: {e}")
            
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def connect(self) -> bool:
        """
        Connect to MQTT broker.
        
        Returns:
            True if connection initiated successfully.
        """
        try:
            # Create MQTT client with MQTTv5
            self._client = mqtt.Client(
                client_id=settings.mqtt_client_id,
                protocol=mqtt.MQTTv5,
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            )
            
            # Set callbacks
            self._client.on_connect = self._on_connect
            self._client.on_disconnect = self._on_disconnect
            self._client.on_message = self._on_message
            
            # Set authentication if provided
            if settings.mqtt_username and settings.mqtt_password:
                self._client.username_pw_set(
                    settings.mqtt_username,
                    settings.mqtt_password,
                )
            
            # Enable auto-reconnect
            self._client.reconnect_delay_set(
                min_delay=settings.mqtt_reconnect_delay,
                max_delay=settings.mqtt_max_reconnect_delay,
            )
            
            # Connect to broker
            logger.info(f"Connecting to MQTT broker at {settings.mqtt_broker}:{settings.mqtt_port}")
            self._client.connect(
                host=settings.mqtt_broker,
                port=settings.mqtt_port,
                keepalive=settings.mqtt_keepalive,
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            return False
    
    def start(self) -> None:
        """Start the MQTT client loop in a background thread."""
        if self._client and not self._should_run:
            self._should_run = True
            self._client.loop_start()
            logger.info("MQTT client loop started")
    
    def start_blocking(self) -> None:
        """Start the MQTT client loop (blocking)."""
        if self._client:
            self._should_run = True
            logger.info("Starting MQTT client loop (blocking)")
            self._client.loop_forever()
    
    def stop(self) -> None:
        """Stop the MQTT client loop."""
        self._should_run = False
        
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            logger.info("MQTT client stopped")
    
    def publish_command(self, device_id: str, command: dict) -> bool:
        """
        Publish a command to a device.
        
        Args:
            device_id: Target device identifier.
            command: Command dictionary to send.
            
        Returns:
            True if publish successful.
        """
        if not self._client or not self._connected:
            logger.error("MQTT client not connected")
            return False
        
        try:
            topic = self.CMD_TOPIC_TEMPLATE.format(device_id=device_id)
            payload = json.dumps(command)
            
            result = self._client.publish(topic, payload, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Published command to {topic}: {payload}")
                return True
            else:
                logger.error(f"Failed to publish command, rc={result.rc}")
                return False
                
        except Exception as e:
            logger.error(f"Error publishing command: {e}")
            return False


# Global MQTT client instance (will be initialized with callback)
mqtt_client: Optional[MQTTClient] = None


def get_mqtt_client() -> Optional[MQTTClient]:
    """Get the global MQTT client instance."""
    return mqtt_client


def create_mqtt_client(on_telemetry: Callable[[TelemetryPayload], None]) -> MQTTClient:
    """
    Create and configure the global MQTT client.
    
    Args:
        on_telemetry: Callback for incoming telemetry.
        
    Returns:
        Configured MQTT client instance.
    """
    global mqtt_client
    mqtt_client = MQTTClient(on_telemetry=on_telemetry)
    return mqtt_client

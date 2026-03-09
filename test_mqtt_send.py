"""
Test MQTT publish - run from project root to test the full pipeline.
Usage: python test_mqtt_send.py
"""
import time
import json
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "devices/esp32-01/telemetry"

payload = {
    "device_id": "esp32-01",
    "ts_ms": int(time.time() * 1000),
    "soil_ao": 2100,
    "soil_do": 1,
    "water_ao": 800,
    "soil_moisture_pct": 68.5,
    "water_level_pct": 82.0,
    "rssi": -55,
    "sampling_ms": 5000,
}

client = mqtt.Client(protocol=mqtt.MQTTv311)
client.connect(BROKER, PORT)
result = client.publish(TOPIC, json.dumps(payload), qos=1)
result.wait_for_publish()
client.disconnect()
print(f"Published OK to {TOPIC}")
print(json.dumps(payload, indent=2))

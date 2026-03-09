/**
 * Smart Irrigation System - ESP32-S3 Telemetry Node
 *
 * Features:
 * - Reads soil moisture sensor + water level sensor
 * - Converts raw ADC values into calibrated percentages
 * - Converts water level % into cm using sensor height
 * - Publishes telemetry to MQTT
 * - Supports dynamic sampling interval via MQTT command
 * - Suitable for backend + frontend real-time dashboards
 */

#include <WiFi.h>
#include <PubSubClient.h>

// =====================================================
// WIFI + MQTT CONFIG
// =====================================================
const char *WIFI_SSID = "M14";
const char *WIFI_PASS = "12345678";

// IMPORTANT: Use your LAPTOP IPv4 address on the SAME WiFi
const char *MQTT_HOST = "192.168.205.112";
const int MQTT_PORT = 1883;

const char *DEVICE_ID = "esp32-01";

// =====================================================
// SENSOR PINS
// =====================================================
const int SOIL_AO = 1;    // GPIO1
const int WATER_AO = 2;   // GPIO2
const int SOIL_DO = 7;    // GPIO7 (optional comparator output)
const int LED_PIN = 21;   // onboard / external status LED

// =====================================================
// SENSOR META
// =====================================================
const float SOIL_PROBE_DEPTH_CM = 5.0;     // soil sensing depth zone
const float WATER_SENSOR_HEIGHT_CM = 4.0;  // actual active water strip height

// =====================================================
// CALIBRATION VALUES
// CHANGE THESE AFTER YOU TAKE REAL READINGS
// =====================================================

// Soil sensor calibration
// Example meaning:
// - DRY = sensor inserted in dry soil sample
// - WET = sensor inserted in fully watered soil sample
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

// Water level sensor calibration
// Example meaning:
// - EMPTY = dry sensor
// - FULL = fully wet sensor over full 4 cm active strip
const int WATER_EMPTY_RAW = 3800;
const int WATER_FULL_RAW = 600;

// =====================================================
// TIMING
// =====================================================
unsigned long intervalMs = 5000;
unsigned long lastSendMs = 0;
unsigned long lastWifiCheckMs = 0;
unsigned long lastMqttRetryMs = 0;

const unsigned long WIFI_CHECK_INTERVAL_MS = 30000;
const unsigned long MQTT_RETRY_INTERVAL_MS = 5000;

// =====================================================
// GLOBAL CLIENTS
// =====================================================
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// =====================================================
// UTILITY: AVERAGE ADC READING
// =====================================================
int readAvg(int pin, int samples = 20, int delayMs = 3)
{
  long sum = 0;
  for (int i = 0; i < samples; i++)
  {
    sum += analogRead(pin);
    delay(delayMs);
  }
  return (int)(sum / samples);
}

// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Convert soil raw ADC value to moisture percentage.
 * Higher raw often means drier soil for many analog sensors.
 */
int soilToPercent(int rawValue)
{
  if (SOIL_DRY_RAW == SOIL_WET_RAW)
    return 0;

  float pct = 100.0f * ((float)SOIL_DRY_RAW - (float)rawValue) /
              ((float)SOIL_DRY_RAW - (float)SOIL_WET_RAW);

  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return (int)(pct + 0.5f);
}

/**
 * Convert water raw ADC value to water level percentage.
 */
int waterToPercent(int rawValue)
{
  if (WATER_EMPTY_RAW == WATER_FULL_RAW)
    return 0;

  float pct = 100.0f * ((float)WATER_EMPTY_RAW - (float)rawValue) /
              ((float)WATER_EMPTY_RAW - (float)WATER_FULL_RAW);

  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return (int)(pct + 0.5f);
}

/**
 * Convert water level percentage to centimeters based on actual sensor height.
 */
float waterPercentToCm(int waterPercent)
{
  return ((float)waterPercent / 100.0f) * WATER_SENSOR_HEIGHT_CM;
}

/**
 * Convert soil moisture percent into a human-readable status.
 */
const char *soilConditionLabel(int soilPercent)
{
  if (soilPercent < 30) return "dry";
  if (soilPercent < 60) return "moderate";
  if (soilPercent <= 80) return "optimal";
  return "wet";
}

/**
 * Convert water level percent into a human-readable status.
 */
const char *waterConditionLabel(int waterPercent)
{
  if (waterPercent < 20) return "low";
  if (waterPercent < 70) return "medium";
  return "high";
}

// =====================================================
// WIFI FUNCTIONS
// =====================================================
void connectWifi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.println("==================================");
  Serial.println("Connecting to WiFi...");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.disconnect(true, true);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("WiFi connected successfully.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    digitalWrite(LED_PIN, HIGH);
  }
  else
  {
    Serial.println("WiFi connection failed.");
    digitalWrite(LED_PIN, LOW);
  }
}

// =====================================================
// MQTT COMMAND HANDLER
// =====================================================
void onMqttMessage(char *topic, byte *payload, unsigned int length)
{
  String msg;
  msg.reserve(length);

  for (unsigned int i = 0; i < length; i++)
  {
    msg += (char)payload[i];
  }

  Serial.print("MQTT message on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(msg);

  // Example command:
  // {"type":"set_interval_ms","value":10000}
  if (msg.indexOf("set_interval_ms") >= 0)
  {
    int vPos = msg.indexOf("\"value\":");
    if (vPos >= 0)
    {
      String valuePart = msg.substring(vPos + 8);
      unsigned long newInterval = valuePart.toInt();

      if (newInterval >= 500 && newInterval <= 3600000)
      {
        intervalMs = newInterval;
        Serial.print("Sampling interval updated to: ");
        Serial.print(intervalMs);
        Serial.println(" ms");
      }
      else
      {
        Serial.println("Rejected interval. Allowed range: 500 to 3600000 ms");
      }
    }
  }
}

// =====================================================
// MQTT FUNCTIONS
// =====================================================
void connectMqtt()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(768);

  Serial.print("Connecting to MQTT: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  String clientId = String("esp32-") + DEVICE_ID + "-" + String((uint32_t)esp_random());

  if (mqtt.connect(clientId.c_str()))
  {
    Serial.println("MQTT connected.");

    String cmdTopic = String("devices/") + DEVICE_ID + "/cmd";
    mqtt.subscribe(cmdTopic.c_str());

    Serial.print("Subscribed to: ");
    Serial.println(cmdTopic);

    String statusTopic = String("devices/") + DEVICE_ID + "/status";
    mqtt.publish(statusTopic.c_str(), "{\"status\":\"online\"}", true);

    digitalWrite(LED_PIN, HIGH);
  }
  else
  {
    Serial.print("MQTT connect failed, state = ");
    Serial.println(mqtt.state());
    Serial.println("Check broker IP, port 1883, Docker port mapping, and firewall.");
  }
}

// =====================================================
// SETUP
// =====================================================
void setup()
{
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  pinMode(SOIL_DO, INPUT_PULLUP);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  randomSeed(micros());

  Serial.println();
  Serial.println("==========================================");
  Serial.println("SMART IRRIGATION SYSTEM - ESP32 TELEMETRY");
  Serial.println("==========================================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Soil probe depth: ");
  Serial.print(SOIL_PROBE_DEPTH_CM);
  Serial.println(" cm");
  Serial.print("Water sensor height: ");
  Serial.print(WATER_SENSOR_HEIGHT_CM);
  Serial.println(" cm");
  Serial.println();

  connectWifi();
  if (WiFi.status() == WL_CONNECTED)
  {
    connectMqtt();
  }

  Serial.println("Setup complete.");
  Serial.println();
}

// =====================================================
// MAIN LOOP
// =====================================================
void loop()
{
  unsigned long now = millis();

  // Keep WiFi alive
  if (now - lastWifiCheckMs >= WIFI_CHECK_INTERVAL_MS)
  {
    lastWifiCheckMs = now;

    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("WiFi disconnected. Reconnecting...");
      connectWifi();
    }
  }

  // Retry MQTT if disconnected
  if (WiFi.status() == WL_CONNECTED && !mqtt.connected())
  {
    if (now - lastMqttRetryMs >= MQTT_RETRY_INTERVAL_MS)
    {
      lastMqttRetryMs = now;
      Serial.println("MQTT disconnected. Retrying...");
      connectMqtt();
    }
  }

  if (mqtt.connected())
  {
    mqtt.loop();
  }

  // Publish telemetry
  if (now - lastSendMs >= intervalMs)
  {
    lastSendMs = now;

    int soilAO = readAvg(SOIL_AO);
    int waterAO = readAvg(WATER_AO);
    int soilDO = digitalRead(SOIL_DO);

    int soilPercent = soilToPercent(soilAO);
    int waterPercent = waterToPercent(waterAO);
    float waterCm = waterPercentToCm(waterPercent);

    const char *soilStatus = soilConditionLabel(soilPercent);
    const char *waterStatus = waterConditionLabel(waterPercent);

    int rssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : -999;

    char payload[768];
    snprintf(payload, sizeof(payload),
             "{"
             "\"device_id\":\"%s\","
             "\"ts_ms\":%lu,"
             "\"soil_ao\":%d,"
             "\"soil_do\":%d,"
             "\"water_ao\":%d,"
             "\"soil_moisture_pct\":%d,"
             "\"water_level_pct\":%d,"
             "\"water_level_cm\":%.2f,"
             "\"soil_probe_depth_cm\":%.1f,"
             "\"water_sensor_height_cm\":%.1f,"
             "\"soil_status\":\"%s\","
             "\"water_status\":\"%s\","
             "\"rssi\":%d,"
             "\"sampling_ms\":%lu"
             "}",
             DEVICE_ID,
             now,
             soilAO,
             soilDO,
             waterAO,
             soilPercent,
             waterPercent,
             waterCm,
             SOIL_PROBE_DEPTH_CM,
             WATER_SENSOR_HEIGHT_CM,
             soilStatus,
             waterStatus,
             rssi,
             intervalMs);

    String topic = String("devices/") + DEVICE_ID + "/telemetry";

    if (mqtt.connected())
    {
      bool ok = mqtt.publish(topic.c_str(), payload);

      if (ok)
      {
        Serial.println("--------------------------------------------------");
        Serial.print("Published to: ");
        Serial.println(topic);

        Serial.print("Soil raw: ");
        Serial.print(soilAO);
        Serial.print(" | Soil %: ");
        Serial.print(soilPercent);
        Serial.print("% | Soil status: ");
        Serial.println(soilStatus);

        Serial.print("Water raw: ");
        Serial.print(waterAO);
        Serial.print(" | Water %: ");
        Serial.print(waterPercent);
        Serial.print("% | Water cm: ");
        Serial.print(waterCm, 2);
        Serial.print(" cm | Water status: ");
        Serial.println(waterStatus);

        Serial.print("Soil DO: ");
        Serial.print(soilDO);
        Serial.print(" | RSSI: ");
        Serial.print(rssi);
        Serial.println(" dBm");

        digitalWrite(LED_PIN, LOW);
        delay(50);
        digitalWrite(LED_PIN, HIGH);
      }
      else
      {
        Serial.println("Publish failed.");
      }
    }
    else
    {
      Serial.println("MQTT not connected. Telemetry skipped.");
    }
  }
}

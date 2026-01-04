/**
 * Smart Irrigation System - ESP32 Telemetry Sensor
 * 
 * Reads soil moisture and water level sensors, publishes to MQTT broker.
 * Supports dynamic interval configuration via MQTT commands.
 * 
 * Hardware:
 * - ESP32-S3 DevKit
 * - Capacitive Soil Moisture Sensor (Analog)
 * - Water Level Sensor (Analog)
 * - Optional: Digital soil moisture threshold output
 * 
 * Wiring:
 * - SOIL_AO (GPIO 1): Soil moisture analog output
 * - WATER_AO (GPIO 2): Water level analog output  
 * - SOIL_DO (GPIO 7): Soil moisture digital output (threshold alert)
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================

// WiFi credentials
const char* WIFI_SSID = "SLT-Fiber-.4G";
const char* WIFI_PASS = "SLTCharuka@0";

// MQTT Broker - Your laptop's IPv4 address (run 'ipconfig' to find it)
// IMPORTANT: No spaces before or after the IP address!
const char* MQTT_HOST = "192.168.1.5";  // <-- Your PC's local IP
const int   MQTT_PORT = 1883;

// Unique device identifier (change for each ESP32 device)
const char* DEVICE_ID = "esp32-01";

// ============================================
// SENSOR PIN CONFIGURATION
// ============================================
const int SOIL_AO  = 1;   // Soil moisture analog pin (ADC1_CH0)
const int WATER_AO = 2;   // Water level analog pin (ADC1_CH1)
const int SOIL_DO  = 7;   // Soil moisture digital pin (threshold)

// ============================================
// GLOBALS
// ============================================
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long intervalMs = 5000;   // Telemetry interval (default 5 seconds)
unsigned long lastSendMs = 0;
unsigned long lastWifiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000; // Check WiFi every 30s

// LED for status indication (built-in LED on most ESP32 boards)
const int LED_PIN = 2;  // Change if your board uses different pin

// ============================================
// SENSOR READING FUNCTIONS
// ============================================

/**
 * Read analog value with averaging for noise reduction
 * Takes 20 samples over ~60ms for stable reading
 */
int readAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += analogRead(pin);
    delay(3);
  }
  return (int)(sum / 20);
}

/**
 * Convert raw ADC to soil moisture percentage
 * Calibrate these values for your specific sensor
 */
int soilToPercent(int rawValue) {
  // Typical capacitive sensor: ~4095 when dry, ~1000-2000 when wet
  const int DRY_VALUE = 4095;
  const int WET_VALUE = 1500;
  
  int percent = map(rawValue, DRY_VALUE, WET_VALUE, 0, 100);
  return constrain(percent, 0, 100);
}

/**
 * Convert raw ADC to water level percentage
 */
int waterToPercent(int rawValue) {
  const int EMPTY_VALUE = 4095;
  const int FULL_VALUE = 500;
  
  int percent = map(rawValue, EMPTY_VALUE, FULL_VALUE, 0, 100);
  return constrain(percent, 0, 100);
}

// ============================================
// MQTT CALLBACK
// ============================================

/**
 * Handle incoming MQTT commands
 * Supported commands:
 * - set_interval_ms: Change telemetry interval
 *   Example: {"type":"set_interval_ms","value":60000}
 */
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT received on ");
  Serial.print(topic);
  Serial.print(": ");
  
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.println(msg);

  // Parse set_interval_ms command
  if (msg.indexOf("set_interval_ms") >= 0) {
    int vPos = msg.indexOf("\"value\":");
    if (vPos >= 0) {
      unsigned long v = msg.substring(vPos + 8).toInt();
      if (v >= 500 && v <= 3600000) {   // 0.5s to 1 hour guard
        intervalMs = v;
        Serial.print("Interval updated to: ");
        Serial.print(intervalMs);
        Serial.println(" ms");
      } else {
        Serial.println("Invalid interval value (must be 500-3600000 ms)");
      }
    }
  }
}

// ============================================
// WIFI FUNCTIONS
// ============================================

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  Serial.print("WiFi connecting to ");
  Serial.print(WIFI_SSID);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Blink LED during connection
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    digitalWrite(LED_PIN, HIGH);  // LED on when connected
  } else {
    Serial.println("\nWiFi connection FAILED!");
    Serial.println("Check SSID and password, then reset device.");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================
// MQTT FUNCTIONS  
// ============================================

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);  // Increase buffer for larger messages

  int attempts = 0;
  while (!mqtt.connected() && attempts < 5) {
    Serial.print("MQTT connecting to ");
    Serial.print(MQTT_HOST);
    Serial.print(":");
    Serial.print(MQTT_PORT);
    Serial.print("...");
    
    String clientId = String("esp32-") + DEVICE_ID + "-" + String(random(1000));
    
    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" Connected!");

      // Subscribe to command topic for this device
      String cmdTopic = String("devices/") + DEVICE_ID + "/cmd";
      mqtt.subscribe(cmdTopic.c_str());
      Serial.print("Subscribed to: ");
      Serial.println(cmdTopic);
      
      // Publish online status
      String statusTopic = String("devices/") + DEVICE_ID + "/status";
      mqtt.publish(statusTopic.c_str(), "{\"status\":\"online\"}", true);
      
    } else {
      Serial.print(" Failed! Error code: ");
      Serial.println(mqtt.state());
      Serial.println("Error codes: -4=timeout, -3=connection lost, -2=connect failed");
      Serial.println("             -1=disconnected, 0=connected, 1=bad protocol");
      Serial.println("             2=bad client ID, 3=unavailable, 4=bad credentials");
      Serial.println("             5=unauthorized");
      attempts++;
      delay(2000);
    }
  }
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial to stabilize
  
  Serial.println();
  Serial.println("=========================================");
  Serial.println("Smart Irrigation System - ESP32 Sensor");
  Serial.println("=========================================");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("MQTT Broker: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  Serial.println();

  // Configure LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Configure ADC
  analogReadResolution(12);        // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db);  // Full scale voltage

  // Configure digital input
  pinMode(SOIL_DO, INPUT_PULLUP);

  // Connect to WiFi and MQTT
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    connectMqtt();
  }
  
  Serial.println();
  Serial.println("Setup complete. Starting telemetry loop...");
  Serial.println();
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  unsigned long now = millis();
  
  // Periodic WiFi check
  if (now - lastWifiCheck >= WIFI_CHECK_INTERVAL) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi disconnected, reconnecting...");
      connectWifi();
    }
  }
  
  // Reconnect MQTT if needed
  if (WiFi.status() == WL_CONNECTED && !mqtt.connected()) {
    Serial.println("MQTT disconnected, reconnecting...");
    connectMqtt();
  }
  
  // Process MQTT messages
  mqtt.loop();

  // Send telemetry at configured interval
  if (now - lastSendMs >= intervalMs) {
    lastSendMs = now;

    // Read sensors
    int soilAO  = readAvg(SOIL_AO);
    int waterAO = readAvg(WATER_AO);
    int soilDO  = digitalRead(SOIL_DO);
    int rssi    = WiFi.RSSI();
    
    // Calculate percentages
    int soilPercent = soilToPercent(soilAO);
    int waterPercent = waterToPercent(waterAO);

    // Build JSON payload
    char payload[512];
    snprintf(payload, sizeof(payload),
      "{"
        "\"device_id\":\"%s\","
        "\"ts_ms\":%lu,"
        "\"soil_ao\":%d,"
        "\"soil_do\":%d,"
        "\"water_ao\":%d,"
        "\"soil_moisture_pct\":%d,"
        "\"water_level_pct\":%d,"
        "\"rssi\":%d,"
        "\"sampling_ms\":%lu"
      "}",
      DEVICE_ID,
      (unsigned long)millis(),
      soilAO,
      soilDO,
      waterAO,
      soilPercent,
      waterPercent,
      rssi,
      intervalMs
    );

    // Publish telemetry
    String topic = String("devices/") + DEVICE_ID + "/telemetry";
    
    if (mqtt.connected()) {
      bool success = mqtt.publish(topic.c_str(), payload);
      
      Serial.print(success ? "✓ Published: " : "✗ Publish failed: ");
      Serial.println(topic);
      Serial.print("  Soil: ");
      Serial.print(soilPercent);
      Serial.print("% (raw:");
      Serial.print(soilAO);
      Serial.print(") | Water: ");
      Serial.print(waterPercent);
      Serial.print("% (raw:");
      Serial.print(waterAO);
      Serial.print(") | RSSI: ");
      Serial.print(rssi);
      Serial.println(" dBm");
      
      // Blink LED on successful publish
      if (success) {
        digitalWrite(LED_PIN, LOW);
        delay(50);
        digitalWrite(LED_PIN, HIGH);
      }
    } else {
      Serial.println("✗ MQTT not connected, skipping publish");
    }
  }
}

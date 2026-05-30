#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// -------- LCD --------
LiquidCrystal_I2C lcd(0x27, 16, 2);

// -------- Pins --------
#define TDS_PIN A0
#define PH_PIN A1
#define ONE_WIRE_BUS 2
#define RELAY_PIN 7

// -------- Temperature Setup --------
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// -------- Calibration --------
float phCalibration = 0.00;

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Relay OFF on startup
  sensors.begin();
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Water Quality Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(2000);
}

void loop() {
  // -------- Temperature --------
  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);

  // -------- Relay Logic (Aerator Control) --------
  String relayState = "OFF";
  if (temperature > 29.7) {
    digitalWrite(RELAY_PIN, HIGH);  // Turn Aerator ON
    relayState = "ON";
  } else {
    digitalWrite(RELAY_PIN, LOW);   // Turn Aerator OFF
    relayState = "OFF";
  }

  // -------- TDS --------
  int tdsSum = 0;
  for (int i = 0; i < 10; i++) { tdsSum += analogRead(TDS_PIN); delay(10); }
  int tdsRaw = tdsSum / 10;
  float tdsVoltage = tdsRaw * (5.0 / 1023.0);
  float tds = (133.42 * tdsVoltage * tdsVoltage * tdsVoltage
               - 255.86 * tdsVoltage * tdsVoltage
               + 857.39 * tdsVoltage) * 0.5;

  // -------- Salinity --------
  float salinity = tds * 0.001;

  // -------- pH --------
  int phSum = 0;
  for (int i = 0; i < 10; i++) { phSum += analogRead(PH_PIN); delay(10); }
  int phRaw = phSum / 10;
  float phVoltage = phRaw * (5.0 / 1023.0);
  float phValue = 7 + ((2.5 - phVoltage) / 0.18) + phCalibration;

  // -------- Send JSON via Serial --------
  StaticJsonDocument<250> doc;
  doc["device_id"]   = "arduino_uno_01";
  doc["temperature"] = temperature;
  doc["tds_value"]   = tds;
  doc["salinity_ppt"]= salinity;
  doc["ph"]          = phValue;
  doc["conductivity"]= tds / 0.5;
  doc["relay_state"] = relayState;   // "ON" or "OFF"
  serializeJson(doc, Serial);
  Serial.println();

  // -------- LCD Page 1: Temp + Relay --------
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp:"); lcd.print(temperature, 1); lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Aerator: "); lcd.print(relayState);
  delay(3000);

  // -------- LCD Page 2: pH + TDS + Salinity --------
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("PH:"); lcd.print(phValue, 2);
  lcd.print(" TDS:"); lcd.print(tds, 0);
  lcd.setCursor(0, 1);
  lcd.print("Sal:"); lcd.print(salinity, 2); lcd.print("ppt");
  delay(3000);
}

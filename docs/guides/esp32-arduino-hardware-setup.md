# ESP32 Arduino IDE Hardware Setup Guide

This guide explains how to wire the ESP32-S3, soil moisture sensor, and bottle/water level sensor, then flash and test the firmware using Arduino IDE.

The active firmware file is:

```text
hardware/esp32/main/main.ino
```

## 1. Hardware Used

- ESP32-S3 development board
- Soil moisture sensor with analog output
- Bottle/water level sensor with analog output
- Jumper wires
- USB cable for ESP32 power and programming
- Arduino IDE

## 2. Important Power Rule

Use the ESP32 `3V3` pin to power the sensors.

Do not send a 5V sensor output into an ESP32 analog pin. ESP32 analog pins are 3.3V logic pins, and a 5V analog signal can damage the board.

For this setup:

```text
ESP32 USB cable powers the ESP32
ESP32 3V3 powers both sensors
ESP32 GND is shared by both sensors
```

## 3. ESP32-S3 Wiring

Use this wiring for the current ESP32-S3 firmware.

| Component | Sensor Pin | ESP32-S3 Pin |
| --- | --- | --- |
| Soil moisture sensor | VCC / + | 3V3 |
| Soil moisture sensor | GND / - | GND |
| Soil moisture sensor | AO / AOUT | GPIO1 |
| Soil moisture sensor | DO / DOUT | GPIO7 optional |
| Bottle/water level sensor | VCC / + | 3V3 |
| Bottle/water level sensor | GND / - | GND |
| Bottle/water level sensor | AO / S / AOUT | GPIO2 |

Simple layout:

```text
ESP32 3V3  -> Soil VCC
ESP32 GND  -> Soil GND
ESP32 GPIO1 -> Soil AO

ESP32 3V3  -> Water sensor VCC
ESP32 GND  -> Water sensor GND
ESP32 GPIO2 -> Water sensor AO/S
```

If using a breadboard:

```text
ESP32 3V3 -> breadboard + rail
ESP32 GND -> breadboard - rail

Soil VCC  -> + rail
Soil GND  -> - rail
Water VCC -> + rail
Water GND -> - rail
```

Then connect each sensor analog output directly to the ESP32 pin.

## 4. Normal ESP32 DevKit Wiring

The firmware also supports a normal ESP32 DevKit / ESP32-WROOM board. For that board, the code uses ADC1 pins because Wi-Fi can make ADC2 unreliable.

| Component | Sensor Pin | ESP32 DevKit Pin |
| --- | --- | --- |
| Soil moisture sensor | AO / AOUT | GPIO34 |
| Bottle/water level sensor | AO / S / AOUT | GPIO35 |
| Soil moisture sensor | DO / DOUT | GPIO27 optional |
| Both sensors | VCC / + | 3V3 |
| Both sensors | GND / - | GND |

## 5. Sensor Pin Labels

Most sensor modules use labels like these:

```text
VCC  -> power
GND  -> ground
AO   -> analog output
DO   -> digital output
```

For this project, use `AO` for sensor values.

`DO` is optional and only gives a high/low digital result from the sensor module comparator. It is not the main moisture or water level value.

## 6. Arduino IDE Setup

### Step 1: Install ESP32 Board Support

Open Arduino IDE and go to:

```text
Arduino IDE > Settings
```

or on Windows:

```text
File > Preferences
```

In `Additional Boards Manager URLs`, add:

```text
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

Then go to:

```text
Tools > Board > Boards Manager
```

Search for:

```text
esp32
```

Install:

```text
esp32 by Espressif Systems
```

If Arduino IDE already has `Arduino ESP32 Boards by Arduino` installed and the sketch compiles, it can work, but the Espressif board package is the recommended package for general ESP32 development.

### Step 2: Install MQTT Library

Go to:

```text
Sketch > Include Library > Manage Libraries
```

Search for:

```text
PubSubClient
```

Install:

```text
PubSubClient by Nick O'Leary
```

## 7. Open The Firmware

In Arduino IDE:

```text
File > Open
```

Open:

```text
/Users/dilandilaruksha/Project/smart-irrigation-system/hardware/esp32/main/main.ino
```

Update the Wi-Fi and MQTT values near the top:

```cpp
const char *WIFI_SSID = "your-wifi-name";
const char *WIFI_PASS = "your-wifi-password";
const char *MQTT_HOST = "your-laptop-ip-address";
const int MQTT_PORT = 1883;
const char *DEVICE_ID = "esp32-01";
```

Example used during testing:

```cpp
const char *WIFI_SSID = "Don t Break My Heart";
const char *MQTT_HOST = "192.168.8.101";
```

To find the laptop IP on macOS:

```bash
ipconfig getifaddr en0
```

The ESP32 and laptop must be on the same Wi-Fi network.

## 8. Arduino IDE Board And Port Settings

For the current ESP32-S3 board, use:

```text
Tools > Board > esp32 > ESP32S3 Dev Module
```

Set this option so Serial Monitor can show logs:

```text
Tools > USB CDC On Boot > Enabled
```

Select the ESP32 USB port:

```text
Tools > Port > /dev/cu.usbmodem...
```

Example port from testing:

```text
/dev/cu.usbmodem1401
```

For a normal ESP32 DevKit, use:

```text
Tools > Board > esp32 > ESP32 Dev Module
```

## 9. Upload The Firmware

In Arduino IDE:

1. Click `Verify`.
2. Wait for compilation to finish.
3. Click `Upload`.
4. If upload gets stuck at `Connecting...`, hold the ESP32 `BOOT` button while upload starts, then release it when writing begins.

Successful upload ends with:

```text
Hash of data verified.
Hard resetting via RTS pin...
```

## 10. Open Serial Monitor

After upload:

```text
Tools > Serial Monitor
```

Set baud rate:

```text
115200 baud
```

Expected startup log:

```text
SMART IRRIGATION SYSTEM - ESP32 TELEMETRY
Device ID: esp32-01
Connecting to WiFi...
WiFi connected successfully.
```

If Serial Monitor is blank on ESP32-S3:

1. Set `Tools > USB CDC On Boot > Enabled`.
2. Upload again.
3. Reopen Serial Monitor.
4. Press the ESP32 `RESET` or `EN` button once.

## 11. Test Sensors Without MQTT

The firmware prints sensor readings even when MQTT is not running.

If Docker/MQTT is stopped, this error is normal:

```text
MQTT connect failed, state = -2
MQTT not connected. Telemetry skipped.
```

Ignore that during sensor-only testing.

Look for these lines:

```text
Soil raw: 50 | Soil %: 100% | Soil status: wet
Water raw: 43 | Water %: 100% | Water cm: 4.00 cm | Water status: high
Soil DO: 1 | RSSI: -51 dBm
```

To test soil sensor response:

1. Keep the soil sensor in air or dry soil.
2. Write down `Soil raw`.
3. Put the sensor in wet soil.
4. Check whether `Soil raw` changes.

To test bottle/water sensor response:

1. Keep the water sensor dry.
2. Write down `Water raw`.
3. Touch the sensor strip with water or raise the water level.
4. Check whether `Water raw` changes.

The exact numbers depend on the sensor, wiring, and calibration. The important first test is that the raw values change when the sensor condition changes.

## 12. Current Test Result

During local testing, the ESP32-S3 successfully:

- Connected to Wi-Fi.
- Printed sensor values in Serial Monitor.
- Continued running even when MQTT was offline.

Example observed output:

```text
Soil raw: 45-53
Water raw: 37-45
Soil %: 100%
Water %: 100%
```

These low raw values mean the ESP32 is reading the pins, but calibration or wiring should be checked if the values do not change when the sensors are moved between dry and wet conditions.

## 13. Calibration

After the raw values are changing correctly, calibrate the constants in:

```text
hardware/esp32/main/main.ino
```

Calibration section:

```cpp
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

const int WATER_EMPTY_RAW = 3800;
const int WATER_FULL_RAW = 600;
```

Use real readings:

```text
SOIL_DRY_RAW     -> raw value from dry soil or air
SOIL_WET_RAW     -> raw value from wet soil
WATER_EMPTY_RAW  -> raw value when water sensor is dry
WATER_FULL_RAW   -> raw value when water sensor is wet/full
```

Upload again after changing calibration values.

## 14. Run With MQTT Later

When ready to send data to the backend, start Mosquitto and the IoT service:

```bash
cd /Users/dilandilaruksha/Project/smart-irrigation-system/infrastructure/docker
docker compose up -d mosquitto iot_service
```

The ESP32 publishes telemetry to:

```text
devices/esp32-01/telemetry
```

Check latest reading through the IoT service:

```bash
curl http://localhost:8006/api/v1/iot/devices/esp32-01/latest
```

If MQTT fails, check:

- Laptop IP in `MQTT_HOST`.
- ESP32 and laptop are on the same Wi-Fi.
- Docker containers are running.
- Port `1883` is exposed.
- Firewall is not blocking port `1883`.

## 15. Troubleshooting

### Missing FQBN

Error:

```text
Missing FQBN (Fully Qualified Board Name)
```

Fix:

```text
Tools > Board > esp32 > ESP32S3 Dev Module
```

### No Upload Port Provided

Error:

```text
Failed uploading: no upload port provided
```

Fix:

```text
Tools > Port > /dev/cu.usbmodem...
```

### Port Busy

Error:

```text
Resource busy: '/dev/cu.usbmodem...'
```

Fix:

1. Close Serial Monitor.
2. Close Serial Plotter.
3. Upload again.

If needed, find the process:

```bash
lsof /dev/cu.usbmodem1401
```

Then stop the process:

```bash
kill <PID>
```

### Blank Serial Monitor

Fix:

```text
Tools > USB CDC On Boot > Enabled
```

Then upload again and reopen Serial Monitor at `115200 baud`.

### Sensor Values Do Not Change

Check:

- Sensor `VCC` is connected to ESP32 `3V3`.
- Sensor `GND` is connected to ESP32 `GND`.
- Soil sensor `AO` is connected to `GPIO1` on ESP32-S3.
- Water sensor `AO/S` is connected to `GPIO2` on ESP32-S3.
- The wire is connected to `AO`, not `DO`.
- Sensor module is not damaged.
- Jumper wire is not loose.

### Do Not Power These From ESP32

Do not power these directly from ESP32 pins:

- Pump
- Solenoid valve
- Motor
- Relay coil

Those need a separate power supply and a driver circuit or relay module.

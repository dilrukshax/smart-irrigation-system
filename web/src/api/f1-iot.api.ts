/**
 * IoT Telemetry API - ESP32 Sensor Data
 *
 * API functions for IoT device telemetry ingestion and queries.
 * Calls the IoT service directly at VITE_IOT_SERVICE_URL (default: http://localhost:8006)
 */

import axios from 'axios';
import { AUTH_TOKEN_KEY } from '@config/constants';

const IOT_BASE_URL = import.meta.env.VITE_IOT_SERVICE_URL || 'http://localhost:8006';

// Dedicated IoT API client (direct to IoT service, bypasses gateway)
const iotClient = axios.create({
  baseURL: `${IOT_BASE_URL}/api/v1/iot`,
  headers: { 'Content-Type': 'application/json' },
});

iotClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// IoT API Endpoints
const IOT_ENDPOINTS = {
  DEVICES: '/devices',
  DEVICE_LATEST: (deviceId: string) => `/devices/${deviceId}/latest`,
  DEVICE_RANGE: (deviceId: string) => `/devices/${deviceId}/range`,
  DEVICE_CMD: (deviceId: string) => `/devices/${deviceId}/cmd`,
  TELEMETRY: '/telemetry',
};

// Type Definitions
export interface TelemetryReading {
  device_id: string;
  timestamp: string;
  soil_ao: number;
  soil_do?: number;
  water_ao: number;
  soil_moisture_pct: number;
  water_level_pct: number;
  // Physical measurements
  water_level_cm: number;
  soil_probe_depth_cm: number;
  water_sensor_height_cm: number;
  // Status labels
  soil_status: string;
  water_status: string;
  rssi?: number;
  battery_v?: number;
}

export interface DeviceInfo {
  device_id: string;
  last_seen?: string;
  latest_reading?: TelemetryReading;
  is_online: boolean;
}

export interface DeviceListResponse {
  count: number;
  devices: DeviceInfo[];
}

export interface TelemetryRangeResponse {
  device_id: string;
  count: number;
  start_time?: string;
  end_time?: string;
  readings: TelemetryReading[];
}

export interface DeviceCommand {
  type: 'set_interval_ms' | 'reboot' | 'calibrate' | 'update_firmware';
  value?: number | string;
}

export interface DeviceCommandResponse {
  device_id: string;
  command_type: string;
  status: 'sent' | 'queued' | 'failed';
  message: string;
  topic: string;
}

export interface TelemetryPayload {
  device_id: string;
  ts: string | number;
  soil_ao: number;
  water_ao: number;
  soil_do?: number;
  rssi?: number;
  battery_v?: number;
}

// IoT API functions
export const iotApi = {
  getDevices: () => iotClient.get<DeviceListResponse>(IOT_ENDPOINTS.DEVICES),

  getLatest: (deviceId: string) =>
    iotClient.get<TelemetryReading>(IOT_ENDPOINTS.DEVICE_LATEST(deviceId)),

  getRange: (deviceId: string, from?: string, to?: string, limit?: number) =>
    iotClient.get<TelemetryRangeResponse>(IOT_ENDPOINTS.DEVICE_RANGE(deviceId), {
      params: { from, to, limit },
    }),

  sendCommand: (deviceId: string, command: DeviceCommand) =>
    iotClient.post<DeviceCommandResponse>(IOT_ENDPOINTS.DEVICE_CMD(deviceId), command),

  ingestTelemetry: (payload: TelemetryPayload) =>
    iotClient.post<TelemetryReading>(IOT_ENDPOINTS.TELEMETRY, payload),
};

/**
 * IoT Telemetry API - ESP32 Sensor Data
 * 
 * API functions for IoT device telemetry ingestion and queries.
 * Endpoints accessed via gateway at /irrigation/iot/*
 */

import { apiClient } from './index';

// IoT API Endpoints - via Gateway
const IOT_ENDPOINTS = {
  DEVICES: '/irrigation/iot/devices',
  DEVICE_LATEST: (deviceId: string) => `/irrigation/iot/devices/${deviceId}/latest`,
  DEVICE_RANGE: (deviceId: string) => `/irrigation/iot/devices/${deviceId}/range`,
  DEVICE_CMD: (deviceId: string) => `/irrigation/iot/devices/${deviceId}/cmd`,
  TELEMETRY: '/irrigation/iot/telemetry',
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
  /**
   * Get list of all known IoT devices
   */
  getDevices: () => 
    apiClient.get<DeviceListResponse>(IOT_ENDPOINTS.DEVICES),

  /**
   * Get the latest telemetry reading for a device
   */
  getLatest: (deviceId: string) =>
    apiClient.get<TelemetryReading>(IOT_ENDPOINTS.DEVICE_LATEST(deviceId)),

  /**
   * Get telemetry readings within a time range
   * @param deviceId Device identifier
   * @param from Start time (ISO8601 or epoch ms)
   * @param to End time (ISO8601 or epoch ms)
   * @param limit Maximum number of readings (default 100)
   */
  getRange: (
    deviceId: string, 
    from?: string, 
    to?: string, 
    limit?: number
  ) =>
    apiClient.get<TelemetryRangeResponse>(IOT_ENDPOINTS.DEVICE_RANGE(deviceId), {
      params: { from, to, limit },
    }),

  /**
   * Send a command to a device via MQTT
   */
  sendCommand: (deviceId: string, command: DeviceCommand) =>
    apiClient.post<DeviceCommandResponse>(IOT_ENDPOINTS.DEVICE_CMD(deviceId), command),

  /**
   * Manually ingest telemetry (for testing)
   */
  ingestTelemetry: (payload: TelemetryPayload) =>
    apiClient.post<TelemetryReading>(IOT_ENDPOINTS.TELEMETRY, payload),
};

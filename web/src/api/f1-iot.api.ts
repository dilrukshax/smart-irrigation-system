/**
 * IoT Telemetry API (via grouped gateway routes).
 */

import { apiClient } from './index';

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
  field_id?: string;
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
  field_id?: string;
  device_id: string;
  ts: string | number;
  soil_ao: number;
  water_ao: number;
  soil_do?: number;
  rssi?: number;
  battery_v?: number;
  soil_moisture_pct?: number;
  water_level_pct?: number;
}

export const iotApi = {
  getDevices: async () => {
    const response = await apiClient.get<{ count: number; devices: Array<Record<string, unknown>> }>('/devices');
    const devices = Array.isArray(response.data.devices)
      ? response.data.devices.map((row) => ({
          device_id: String(row.device_id || ''),
          field_id: typeof row.field_id === 'string' ? row.field_id : undefined,
          last_seen:
            typeof row.last_handshake_at === 'string'
              ? row.last_handshake_at
              : typeof row.last_seen === 'string'
              ? row.last_seen
              : undefined,
          is_online: typeof row.pairing_status === 'string' ? row.pairing_status === 'CONFIRMED' : true,
        }))
      : [];

    return {
      ...response,
      data: {
        count: devices.length,
        devices,
      } as DeviceListResponse,
    };
  },

  getLatest: (deviceId: string) => apiClient.get<TelemetryReading>(`/devices/${deviceId}/latest`),

  getRange: (deviceId: string, from?: string, to?: string, limit?: number) =>
    apiClient.get<TelemetryRangeResponse>(`/devices/${deviceId}/range`, {
      params: { from, to, limit },
    }),

  sendCommand: (deviceId: string, command: DeviceCommand) =>
    apiClient.post<DeviceCommandResponse>(`/devices/${deviceId}/cmd`, command),

  ingestTelemetry: (payload: TelemetryPayload) =>
    apiClient.post('/telemetry/ingest', {
      field_id: payload.field_id,
      device_id: payload.device_id,
      timestamp: typeof payload.ts === 'number' ? new Date(payload.ts).toISOString() : payload.ts,
      soil_ao: payload.soil_ao,
      water_ao: payload.water_ao,
      soil_moisture_pct: payload.soil_moisture_pct,
      water_level_pct: payload.water_level_pct,
      rssi: payload.rssi,
      battery_v: payload.battery_v,
    }),
};

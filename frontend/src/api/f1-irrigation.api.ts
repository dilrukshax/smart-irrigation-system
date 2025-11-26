import apiClient from './index';
import { ENDPOINTS } from './endpoints';

export const irrigationApi = {
  // Get all sensors
  getSensors: () => apiClient.get(ENDPOINTS.IRRIGATION.SENSORS),

  // Get sensor data
  getSensorData: (sensorId: string, params?: { from?: string; to?: string }) =>
    apiClient.get(ENDPOINTS.IRRIGATION.SENSOR_DATA(sensorId), { params }),

  // Get irrigation schedules
  getSchedules: () => apiClient.get(ENDPOINTS.IRRIGATION.SCHEDULES),

  // Get irrigation events
  getEvents: (params?: { fieldId?: string; status?: string }) =>
    apiClient.get(ENDPOINTS.IRRIGATION.EVENTS, { params }),

  // Control irrigation (start/stop)
  control: (fieldId: string, action: 'start' | 'stop', duration?: number) =>
    apiClient.post(ENDPOINTS.IRRIGATION.CONTROL, { fieldId, action, duration }),
};

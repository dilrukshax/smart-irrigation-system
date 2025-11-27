import { apiClient } from './index';

// Irrigation API endpoints - via Gateway
const ENDPOINTS = {
  BASE: '/irrigation',
  SENSORS: '/irrigation/sensors',
  SENSOR_DATA: (id: string) => `/irrigation/sensors/${id}/data`,
  SCHEDULES: '/irrigation/sensors/schedules',
  EVENTS: '/irrigation/sensors/events',
  CONTROL: '/irrigation/sensors/control',
  PREDICT: '/irrigation/sensors/predict',
  HEALTH: '/irrigation/health',
};

export const irrigationApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all sensors
  getSensors: () => apiClient.get(ENDPOINTS.SENSORS),

  // Get sensor data
  getSensorData: (sensorId: string, params?: { from?: string; to?: string }) =>
    apiClient.get(ENDPOINTS.SENSOR_DATA(sensorId), { params }),

  // Get irrigation schedules
  getSchedules: () => apiClient.get(ENDPOINTS.SCHEDULES),

  // Get irrigation events
  getEvents: (params?: { fieldId?: string; status?: string }) =>
    apiClient.get(ENDPOINTS.EVENTS, { params }),

  // Control irrigation (start/stop)
  control: (fieldId: string, action: 'start' | 'stop', duration?: number) =>
    apiClient.post(ENDPOINTS.CONTROL, { fieldId, action, duration }),

  // Get prediction for sensor data
  predict: (sensorData: {
    soil_moisture: number;
    temperature: number;
    humidity: number;
    rainfall: number;
    crop_type: string;
  }) => apiClient.post(ENDPOINTS.PREDICT, sensorData),
};

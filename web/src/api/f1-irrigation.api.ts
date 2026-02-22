import { apiClient } from './index';
import type {
  ReservoirData,
  WaterReleasePrediction,
  ActuatorDecision,
  WaterManagementRecommendation,
  ThresholdConfig,
  ManualOverrideRequest,
  ManualOverrideResponse,
  ManualOverrideStatus,
  WaterManagementStatus,
  ModelInfo,
  CropDefaults,
  CropFieldConfig,
  CropFieldStatus,
  ValveControlRequest,
  ValveControlResponse,
  AutoControlDecision,
  IoTSensorData,
} from '../features/f1-irrigation/types';

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
  // Smart Water Management endpoints
  WATER_MGMT: {
    STATUS: '/irrigation/water-management/status',
    RESERVOIR_CURRENT: '/irrigation/water-management/reservoir/current',
    PREDICT: '/irrigation/water-management/predict',
    DECIDE: '/irrigation/water-management/decide',
    RECOMMEND: '/irrigation/water-management/recommend',
    RECOMMEND_AUTO: '/irrigation/water-management/recommend/auto',
    MANUAL_OVERRIDE: '/irrigation/water-management/manual-override',
    MANUAL_OVERRIDE_CANCEL: '/irrigation/water-management/manual-override/cancel',
    MANUAL_OVERRIDE_STATUS: '/irrigation/water-management/manual-override/status',
    THRESHOLDS: '/irrigation/water-management/thresholds/defaults',
    MODEL_INFO: '/irrigation/water-management/model/info',
  },
  // Crop Field Management endpoints
  CROP_FIELDS: {
    BASE: '/irrigation/crop-fields',
    CROPS_DEFAULTS: '/irrigation/crop-fields/crops/defaults',
    CROP_DEFAULT: (cropType: string) => `/irrigation/crop-fields/crops/defaults/${cropType}`,
    FIELDS: '/irrigation/crop-fields/fields',
    FIELD: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}`,
    FIELD_STATUS: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}/status`,
    FIELD_VALVE: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}/valve`,
    FIELD_AUTO_DECISION: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}/auto-decision`,
    FIELD_SENSOR_DATA: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}/sensor-data`,
    FIELD_SENSOR_HISTORY: (fieldId: string) => `/irrigation/crop-fields/fields/${fieldId}/sensor-history`,
  },
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

// Smart Water Management API
export const waterManagementApi = {
  // Get service status
  getStatus: () =>
    apiClient.get<WaterManagementStatus>(ENDPOINTS.WATER_MGMT.STATUS),

  // Get current reservoir data (simulated or from IoT)
  getCurrentReservoirData: () =>
    apiClient.get<ReservoirData>(ENDPOINTS.WATER_MGMT.RESERVOIR_CURRENT),

  // Get water release prediction
  predictRelease: (data: ReservoirData) =>
    apiClient.post<WaterReleasePrediction>(ENDPOINTS.WATER_MGMT.PREDICT, data),

  // Get actuator control decision
  getDecision: (data: ReservoirData, thresholds?: ThresholdConfig) =>
    apiClient.post<ActuatorDecision>(ENDPOINTS.WATER_MGMT.DECIDE, data, {
      params: thresholds,
    }),

  // Get full recommendation (prediction + decision + status)
  getRecommendation: (data: ReservoirData) =>
    apiClient.post<WaterManagementRecommendation>(
      ENDPOINTS.WATER_MGMT.RECOMMEND,
      data
    ),

  // Get automatic recommendation using current sensor data
  getAutoRecommendation: () =>
    apiClient.get<WaterManagementRecommendation>(
      ENDPOINTS.WATER_MGMT.RECOMMEND_AUTO
    ),

  // Set manual override
  setManualOverride: (request: ManualOverrideRequest) =>
    apiClient.post<ManualOverrideResponse>(
      ENDPOINTS.WATER_MGMT.MANUAL_OVERRIDE,
      request
    ),

  // Cancel manual override
  cancelManualOverride: () =>
    apiClient.post<ManualOverrideResponse>(
      ENDPOINTS.WATER_MGMT.MANUAL_OVERRIDE_CANCEL
    ),

  // Get manual override status
  getManualOverrideStatus: () =>
    apiClient.get<ManualOverrideStatus>(
      ENDPOINTS.WATER_MGMT.MANUAL_OVERRIDE_STATUS
    ),

  // Get default thresholds
  getDefaultThresholds: () =>
    apiClient.get<ThresholdConfig>(ENDPOINTS.WATER_MGMT.THRESHOLDS),

  // Get model information
  getModelInfo: () => apiClient.get<ModelInfo>(ENDPOINTS.WATER_MGMT.MODEL_INFO),
};

// Crop Field Management API
export const cropFieldsApi = {
  // Get all crop type defaults
  getCropDefaults: () =>
    apiClient.get<{ crops: Record<string, CropDefaults>; supported_crops: string[] }>(
      ENDPOINTS.CROP_FIELDS.CROPS_DEFAULTS
    ),

  // Get defaults for a specific crop type
  getCropDefault: (cropType: string) =>
    apiClient.get<CropDefaults>(ENDPOINTS.CROP_FIELDS.CROP_DEFAULT(cropType)),

  // List all configured fields
  getFields: () =>
    apiClient.get<CropFieldConfig[]>(ENDPOINTS.CROP_FIELDS.FIELDS),

  // Create a new field
  createField: (config: CropFieldConfig) =>
    apiClient.post<CropFieldConfig>(ENDPOINTS.CROP_FIELDS.FIELDS, config),

  // Get field configuration
  getField: (fieldId: string) =>
    apiClient.get<CropFieldConfig>(ENDPOINTS.CROP_FIELDS.FIELD(fieldId)),

  // Update field configuration
  updateField: (fieldId: string, config: CropFieldConfig) =>
    apiClient.put<CropFieldConfig>(ENDPOINTS.CROP_FIELDS.FIELD(fieldId), config),

  // Delete field
  deleteField: (fieldId: string) =>
    apiClient.delete<{ status: string; field_id: string }>(
      ENDPOINTS.CROP_FIELDS.FIELD(fieldId)
    ),

  // Get field status (current sensor data + valve state)
  getFieldStatus: (fieldId: string, useSimulated: boolean = true) =>
    apiClient.get<CropFieldStatus>(ENDPOINTS.CROP_FIELDS.FIELD_STATUS(fieldId), {
      params: { use_simulated: useSimulated },
    }),

  // Control valve manually
  controlValve: (fieldId: string, request: ValveControlRequest) =>
    apiClient.post<ValveControlResponse>(
      ENDPOINTS.CROP_FIELDS.FIELD_VALVE(fieldId),
      request
    ),

  // Get auto control decision
  getAutoDecision: (fieldId: string, useSimulated: boolean = true) =>
    apiClient.get<AutoControlDecision>(
      ENDPOINTS.CROP_FIELDS.FIELD_AUTO_DECISION(fieldId),
      { params: { use_simulated: useSimulated } }
    ),

  // Send sensor data (from IoT device)
  sendSensorData: (fieldId: string, data: IoTSensorData) =>
    apiClient.post<{ data_received: boolean; auto_control_triggered: boolean; decision?: AutoControlDecision }>(
      ENDPOINTS.CROP_FIELDS.FIELD_SENSOR_DATA(fieldId),
      data
    ),

  // Get sensor history
  getSensorHistory: (fieldId: string, limit: number = 50) =>
    apiClient.get<{ field_id: string; count: number; readings: IoTSensorData[] }>(
      ENDPOINTS.CROP_FIELDS.FIELD_SENSOR_HISTORY(fieldId),
      { params: { limit } }
    ),
};

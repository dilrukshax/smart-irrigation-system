import { apiClient } from './index';

// Crop Health API endpoints - via Gateway
// Note: Crop Health service (F2) not yet implemented
const ENDPOINTS = {
  BASE: '/crop-health',
  ZONES: '/crop-health/zones',
  ZONE_HEALTH: (id: string) => `/crop-health/zones/${id}/health`,
  INDICES: '/crop-health/indices',
  ALERTS: '/crop-health/alerts',
  VALIDATION: '/crop-health/validation',
  HEALTH: '/crop-health/health',
};

export const cropHealthApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all zones
  getZones: () => apiClient.get(ENDPOINTS.ZONES),

  // Get zone health data
  getZoneHealth: (zoneId: string) =>
    apiClient.get(ENDPOINTS.ZONE_HEALTH(zoneId)),

  // Get vegetation indices
  getIndices: (params?: { zoneId?: string; from?: string; to?: string }) =>
    apiClient.get(ENDPOINTS.INDICES, { params }),

  // Get health alerts
  getAlerts: (params?: { severity?: string; status?: string }) =>
    apiClient.get(ENDPOINTS.ALERTS, { params }),

  // Submit ground validation
  submitValidation: (data: { zoneId: string; image: File; label: string }) => {
    const formData = new FormData();
    formData.append('zoneId', data.zoneId);
    formData.append('image', data.image);
    formData.append('label', data.label);
    return apiClient.post(ENDPOINTS.VALIDATION, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

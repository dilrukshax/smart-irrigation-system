import apiClient from './index';
import { ENDPOINTS } from './endpoints';

export const cropHealthApi = {
  // Get all zones
  getZones: () => apiClient.get(ENDPOINTS.CROP_HEALTH.ZONES),

  // Get zone health data
  getZoneHealth: (zoneId: string) =>
    apiClient.get(ENDPOINTS.CROP_HEALTH.ZONE_HEALTH(zoneId)),

  // Get vegetation indices
  getIndices: (params?: { zoneId?: string; from?: string; to?: string }) =>
    apiClient.get(ENDPOINTS.CROP_HEALTH.INDICES, { params }),

  // Get health alerts
  getAlerts: (params?: { severity?: string; status?: string }) =>
    apiClient.get(ENDPOINTS.CROP_HEALTH.ALERTS, { params }),

  // Submit ground validation
  submitValidation: (data: { zoneId: string; image: File; label: string }) => {
    const formData = new FormData();
    formData.append('zoneId', data.zoneId);
    formData.append('image', data.image);
    formData.append('label', data.label);
    return apiClient.post(ENDPOINTS.CROP_HEALTH.VALIDATION, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

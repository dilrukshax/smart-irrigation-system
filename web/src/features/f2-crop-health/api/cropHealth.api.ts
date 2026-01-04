/**
 * Crop Health API Client
 * Handles all API calls to the Crop Health & Water Stress Detection service
 */

import apiClient from '../../../api';
import type {
  HealthMapResponse,
  HealthZoneCollection,
  ZoneSummary,
  ImagePredictionResponse,
  SatelliteAnalysisRequest,
  ModelStatus,
} from '../types';

// API endpoints
const CROP_HEALTH_ENDPOINTS = {
  ANALYZE: '/crop-health/analyze',
  ZONES: '/crop-health/zones',
  ZONES_GEOJSON: '/crop-health/zones/geojson',
  ZONES_SUMMARY: '/crop-health/zones/summary',
  PREDICT: '/crop-health/predict',
  PREDICT_URL: '/crop-health/predict/url',
  MODEL_STATUS: '/crop-health/model/status',
  MODEL_CLASSES: '/crop-health/model/classes',
};

/**
 * Crop Health API functions
 */
export const cropHealthApi = {
  /**
   * Analyze satellite data for crop health
   */
  analyzeSatelliteData: async (request: SatelliteAnalysisRequest): Promise<HealthMapResponse> => {
    const response = await apiClient.post<HealthMapResponse>(
      CROP_HEALTH_ENDPOINTS.ANALYZE,
      request
    );
    return response.data;
  },

  /**
   * Get health zones for a location
   */
  getHealthZones: async (
    lat?: number,
    lon?: number,
    areaKm2: number = 10,
    numZones: number = 6
  ): Promise<HealthMapResponse> => {
    const params: Record<string, any> = {
      area_km2: areaKm2,
      num_zones: numZones,
    };
    
    if (lat !== undefined) params.lat = lat;
    if (lon !== undefined) params.lon = lon;
    
    const response = await apiClient.get<HealthMapResponse>(
      CROP_HEALTH_ENDPOINTS.ZONES,
      { params }
    );
    return response.data;
  },

  /**
   * Get zones as pure GeoJSON
   */
  getZonesGeoJSON: async (
    lat?: number,
    lon?: number,
    areaKm2: number = 10,
    numZones: number = 6
  ): Promise<HealthZoneCollection> => {
    const params: Record<string, any> = {
      area_km2: areaKm2,
      num_zones: numZones,
    };
    
    if (lat !== undefined) params.lat = lat;
    if (lon !== undefined) params.lon = lon;
    
    const response = await apiClient.get<HealthZoneCollection>(
      CROP_HEALTH_ENDPOINTS.ZONES_GEOJSON,
      { params }
    );
    return response.data;
  },

  /**
   * Get zone summary statistics
   */
  getZoneSummary: async (
    lat?: number,
    lon?: number,
    areaKm2: number = 10,
    numZones: number = 6
  ): Promise<ZoneSummary> => {
    const params: Record<string, any> = {
      area_km2: areaKm2,
      num_zones: numZones,
    };
    
    if (lat !== undefined) params.lat = lat;
    if (lon !== undefined) params.lon = lon;
    
    const response = await apiClient.get<ZoneSummary>(
      CROP_HEALTH_ENDPOINTS.ZONES_SUMMARY,
      { params }
    );
    return response.data;
  },

  /**
   * Predict crop health from uploaded image
   */
  predictFromImage: async (file: File): Promise<ImagePredictionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ImagePredictionResponse>(
      CROP_HEALTH_ENDPOINTS.PREDICT,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Predict crop health from image URL
   */
  predictFromUrl: async (imageUrl: string): Promise<ImagePredictionResponse> => {
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    
    const response = await apiClient.post<ImagePredictionResponse>(
      CROP_HEALTH_ENDPOINTS.PREDICT_URL,
      formData
    );
    return response.data;
  },

  /**
   * Get model status
   */
  getModelStatus: async (): Promise<ModelStatus> => {
    const response = await apiClient.get<ModelStatus>(
      CROP_HEALTH_ENDPOINTS.MODEL_STATUS
    );
    return response.data;
  },

  /**
   * Get available model classes
   */
  getModelClasses: async (): Promise<{ num_classes: number; classes: string[] }> => {
    const response = await apiClient.get<{ num_classes: number; classes: string[] }>(
      CROP_HEALTH_ENDPOINTS.MODEL_CLASSES
    );
    return response.data;
  },
};

export default cropHealthApi;

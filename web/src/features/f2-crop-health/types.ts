/**
 * F2 - Crop Health & Water Stress Detection Types
 * Type definitions for crop health monitoring features
 */

// ==================== Zone Types ====================

export type HealthStatusType = 'Healthy' | 'Mild Stress' | 'Severe Stress' | 'Diseased';
export type RiskLevelType = 'low' | 'medium' | 'high' | 'critical';

export interface GeoCoordinate {
  lat: number;
  lon: number;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZoneProperties {
  zone_id: string;
  name: string;
  health_status: HealthStatusType;
  color: string;
  risk_level: RiskLevelType;
  ndvi: number;
  ndwi: number;
  area_hectares: number;
  confidence: number;
  recommendation?: string;
}

export interface HealthZone {
  type: 'Feature';
  geometry: GeoPolygon;
  properties: ZoneProperties;
}

export interface HealthZoneCollection {
  type: 'FeatureCollection';
  features: HealthZone[];
  metadata?: Record<string, any>;
}

export interface ZoneSummary {
  total_zones: number;
  healthy_count: number;
  mild_stress_count: number;
  severe_stress_count: number;
  total_area_hectares: number;
  average_ndvi: number;
  average_ndwi: number;
  last_updated: string;
}

export interface HealthMapResponse {
  zones: HealthZoneCollection;
  summary: ZoneSummary;
  center: GeoCoordinate;
  bounds?: number[][];
}

// ==================== Analysis Request Types ====================

export interface SatelliteAnalysisRequest {
  lat: number;
  lon: number;
  area_km2?: number;
  num_zones?: number;
  analysis_date?: string;
  include_ndvi?: boolean;
  include_ndwi?: boolean;
}

// ==================== Validation Error Types ====================

export type ValidationStatus = 
  | 'VALID'
  | 'INVALID_LOCATION'
  | 'INSUFFICIENT_VEGETATION'
  | 'WATER_BODY'
  | 'URBAN_AREA'
  | 'HIGH_CLOUD_COVER'
  | 'BARREN_LAND'
  | 'ERROR';

export interface ValidationResult {
  is_valid: boolean;
  status: ValidationStatus;
  message: string;
  vegetation_percentage?: number;
  land_cover_type?: string;
  ndvi_mean?: number;
  ndvi_min?: number;
  ndvi_max?: number;
  cloud_cover_percent?: number;
  satellite_source?: string;
  analysis_date?: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: 'INVALID_LOCATION';
  status: ValidationStatus;
  message: string;
  validation: ValidationResult;
  metadata?: {
    analysis_id: string;
    timestamp: string;
    source: string;
  };
  suggestions: string[];
}

// ==================== Prediction Types ====================

export interface ImagePredictionResponse {
  predicted_class: string;
  confidence: number;
  health_status: string;
  severity: string;
  color: string;
  risk_level: string;
  recommendation: string;
  model_used: boolean;
  timestamp: string;
}

export interface ModelStatus {
  model_loaded: boolean;
  model_path: string;
  image_size: number;
  num_classes: number;
  status: 'ready' | 'fallback_mode';
}

// ==================== Legacy Types (for compatibility) ====================

export interface ZoneHealth {
  id: string;
  name: string;
  ndvi: number;
  ndwi: number;
  savi: number;
  healthClass: 'healthy' | 'mild-stress' | 'severe-stress' | 'disease';
  confidence: number;
  lastUpdated: Date;
}

export interface VegetationIndex {
  date: Date;
  ndvi: number;
  ndwi: number;
  savi: number;
}

export interface StressAlert {
  id: string;
  zoneId: string;
  type: 'water-stress' | 'nutrient-deficiency' | 'disease' | 'pest';
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  description: string;
}

// ==================== Component Props Types ====================

export interface HealthMapProps {
  zones: HealthZone[];
  center: GeoCoordinate;
  selectedZoneId?: string;
  onZoneClick?: (zone: HealthZone) => void;
}

export interface ZoneListProps {
  zones: HealthZone[];
  selectedZoneId?: string;
  onZoneSelect?: (zoneId: string) => void;
}

export interface HealthSummaryProps {
  summary: ZoneSummary;
}

export interface ImageUploadProps {
  onPredictionComplete?: (result: ImagePredictionResponse) => void;
}

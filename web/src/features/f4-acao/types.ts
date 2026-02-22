// F4 - ACA-O Types

export interface CropRecommendation {
  rank: number;
  cropId: string;
  cropName: string;
  suitabilityScore: number;
  expectedYield: number;
  expectedProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  waterRequirement: number;
  rationale: string;
}

export interface FieldRecommendation {
  fieldId: string;
  fieldName: string;
  area: number;
  soilType: string;
  recommendations: CropRecommendation[];
}

export interface OptimizationResult {
  status: 'optimal' | 'feasible' | 'infeasible';
  objectiveValue: number;
  totalArea: number;
  totalWaterUsage: number;
  waterQuota: number;
  allocation: CropAllocation[];
}

export interface CropAllocation {
  cropId: string;
  cropName: string;
  allocatedArea: number;
  expectedProfit: number;
  waterUsage: number;
}

export interface Constraint {
  id: string;
  type: 'water' | 'area' | 'policy' | 'rotation';
  description: string;
  value: number;
  unit: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  constraints: Constraint[];
  result?: OptimizationResult;
}

export interface PlanB {
  trigger: string;
  originalPlan: OptimizationResult;
  alternativePlan: OptimizationResult;
  profitDifference: number;
  riskDifference: string;
}

// ============ Adaptive Recommendation Types ============

export interface FieldParams {
  field_id?: string;
  area_ha: number;
  soil_type: string;
  soil_ph: number;
  soil_ec: number;
  soil_suitability: number;
  location: string;
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface WeatherParams {
  season_avg_temp: number;
  season_rainfall_mm: number;
  temp_mean_weekly: number;
  temp_range_weekly: number;
  precip_weekly_sum: number;
  radiation_weekly_sum: number;
  et0_weekly_sum: number;
  humidity: number;
}

export interface WaterParams {
  water_availability_mm: number;
  water_quota_mm: number;
  water_coverage_ratio: number;
  irrigation_efficiency: number;
}

export interface MarketParams {
  price_factor: number;
  price_volatility: 'low' | 'medium' | 'high';
  demand_level: 'low' | 'normal' | 'high';
}

export interface CropFilters {
  crop_ids?: string[];
  water_sensitivity_filter?: 'low' | 'medium' | 'high' | null;
  max_growth_duration_days?: number | null;
  min_profit_per_ha?: number | null;
  max_risk_level?: 'low' | 'medium' | 'high' | null;
}

export interface AdaptiveParams {
  season: string;
  top_n: number;
  field_params: FieldParams;
  weather_params: WeatherParams;
  water_params: WaterParams;
  market_params: MarketParams;
  crop_filters: CropFilters;
  historical_yield_avg?: number;
  suitability_weight: number;
  profitability_weight: number;
}

export interface AdaptiveCropResult {
  rank: number;
  crop_id: string;
  crop_name: string;
  suitability_score: number;
  combined_score: number;
  predicted_yield_t_ha: number;
  predicted_price_per_kg: number;
  gross_revenue_per_ha: number;
  estimated_cost_per_ha: number;
  profit_per_ha: number;
  roi_percentage: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  water_requirement_mm: number;
  growth_duration_days: number;
  water_sensitivity: string;
  rationale: string;
  confidence: number;
}

export interface AdaptiveInputSummary {
  field_area_ha: number;
  soil_ph: number;
  soil_suitability: number;
  water_availability_mm: number;
  water_quota_mm: number;
  season_avg_temp: number;
  season_rainfall_mm: number;
  location: string;
  season: string;
  price_factor: number;
  crops_evaluated: number;
}

export interface AdaptiveResponse {
  success: boolean;
  message: string;
  input_summary: AdaptiveInputSummary;
  recommendations: AdaptiveCropResult[];
  total_crops_evaluated: number;
  average_suitability: number;
  best_profit_per_ha: number;
  models_used: string[];
  processing_time_ms: number;
}

export interface ParameterConfig {
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: (string | null)[];
}

export interface AllParameterDefaults {
  field_params: Record<string, ParameterConfig>;
  weather_params: Record<string, ParameterConfig>;
  water_params: Record<string, ParameterConfig>;
  market_params: Record<string, ParameterConfig>;
  crop_filters: Record<string, ParameterConfig>;
  model_weights: Record<string, ParameterConfig>;
  seasons: string[];
}

export interface CropInfo {
  crop_id: string;
  crop_name: string;
  water_sensitivity: string;
  growth_duration_days: number;
}

// Default parameter values
export const DEFAULT_FIELD_PARAMS: FieldParams = {
  area_ha: 5.0,
  soil_type: 'Loam',
  soil_ph: 6.5,
  soil_ec: 1.0,
  soil_suitability: 0.75,
  location: 'Kandy',
  latitude: 7.2906,
  longitude: 80.6337,
  elevation: 500.0,
};

export const DEFAULT_WEATHER_PARAMS: WeatherParams = {
  season_avg_temp: 28.0,
  season_rainfall_mm: 250.0,
  temp_mean_weekly: 28.0,
  temp_range_weekly: 8.0,
  precip_weekly_sum: 50.0,
  radiation_weekly_sum: 150.0,
  et0_weekly_sum: 30.0,
  humidity: 75.0,
};

export const DEFAULT_WATER_PARAMS: WaterParams = {
  water_availability_mm: 5000.0,
  water_quota_mm: 800.0,
  water_coverage_ratio: 0.8,
  irrigation_efficiency: 0.7,
};

export const DEFAULT_MARKET_PARAMS: MarketParams = {
  price_factor: 1.0,
  price_volatility: 'medium',
  demand_level: 'normal',
};

export const DEFAULT_CROP_FILTERS: CropFilters = {
  crop_ids: undefined,
  water_sensitivity_filter: null,
  max_growth_duration_days: null,
  min_profit_per_ha: null,
  max_risk_level: null,
};

export const DEFAULT_ADAPTIVE_PARAMS: AdaptiveParams = {
  season: 'Maha-2026',
  top_n: 10,
  field_params: DEFAULT_FIELD_PARAMS,
  weather_params: DEFAULT_WEATHER_PARAMS,
  water_params: DEFAULT_WATER_PARAMS,
  market_params: DEFAULT_MARKET_PARAMS,
  crop_filters: DEFAULT_CROP_FILTERS,
  suitability_weight: 0.4,
  profitability_weight: 0.6,
};

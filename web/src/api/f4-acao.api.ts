import { apiClient } from './index';

export interface OptimizationRequest {
  waterQuota: number;
  constraints: {
    minPaddyArea?: number;
    maxRiskLevel?: 'low' | 'medium' | 'high';
  };
  scenario?: string;
}

export interface DataContract {
  status: 'ok' | 'stale' | 'data_unavailable' | 'analysis_pending' | 'source_unavailable';
  source?: string;
  is_live?: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality?: string;
  data_available?: boolean;
  message?: string;
}

export interface ScenarioEvaluationRequest {
  season?: string;
  field_ids?: string[];
  scenario_name?: string;
  water_quota_mm?: number;
  price_factor?: number;
  min_paddy_area?: number;
  max_risk_level?: 'low' | 'medium' | 'high';
}

export interface ScenarioEvaluationResponse extends DataContract {
  data: {
    status: string;
    message?: string;
    scenario_name?: string;
    season?: string;
    water_quota_mm?: number;
    total_profit?: number;
    total_area?: number;
    water_usage?: number;
    allocation: Array<{
      crop_id: string;
      crop_name: string;
      area_ha: number;
      predicted_yield: number;
      predicted_price: number;
      profit: number;
      water_usage: number;
      suitability: number;
      risk: string;
    }>;
    fields_evaluated?: number;
    fields_with_data?: number;
    failures?: Array<{ field_id: string; status?: string; message?: string }>;
  };
}

// Adaptive Recommendation Types
export interface FieldParameters {
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

export interface WeatherParameters {
  season_avg_temp: number;
  season_rainfall_mm: number;
  temp_mean_weekly: number;
  temp_range_weekly: number;
  precip_weekly_sum: number;
  radiation_weekly_sum: number;
  et0_weekly_sum: number;
  humidity: number;
}

export interface WaterParameters {
  water_availability_mm: number;
  water_quota_mm: number;
  water_coverage_ratio: number;
  irrigation_efficiency: number;
}

export interface MarketParameters {
  price_factor: number;
  price_volatility: 'low' | 'medium' | 'high';
  demand_level: 'low' | 'normal' | 'high';
}

export interface CropFilterParameters {
  crop_ids?: string[];
  water_sensitivity_filter?: 'low' | 'medium' | 'high';
  max_growth_duration_days?: number;
  min_profit_per_ha?: number;
  max_risk_level?: 'low' | 'medium' | 'high';
}

export interface AdaptiveRecommendationRequest {
  season: string;
  top_n: number;
  field_params: FieldParameters;
  weather_params: WeatherParameters;
  water_params: WaterParameters;
  market_params: MarketParameters;
  crop_filters: CropFilterParameters;
  historical_yield_avg?: number;
  suitability_weight: number;
  profitability_weight: number;
}

export interface AdaptiveCropRecommendation {
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

export interface InputParameterSummary {
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

export interface AdaptiveRecommendationResponse {
  success: boolean;
  message: string;
  input_summary: InputParameterSummary;
  recommendations: AdaptiveCropRecommendation[];
  total_crops_evaluated: number;
  average_suitability: number;
  best_profit_per_ha: number;
  models_used: string[];
  processing_time_ms: number;
}

export interface ParameterDefaults {
  field_params: Record<string, any>;
  weather_params: Record<string, any>;
  water_params: Record<string, any>;
  market_params: Record<string, any>;
  crop_filters: Record<string, any>;
  model_weights: Record<string, any>;
  seasons: string[];
}

export interface CropInfo {
  crop_id: string;
  crop_name: string;
  water_sensitivity: string;
  growth_duration_days: number;
}

// ACA-O (Optimization) API endpoints
const ENDPOINTS = {
  RECOMMENDATIONS: '/optimization/recommendations',
  FIELD_RECOMMENDATIONS: (id: string) => `/optimization/recommendations?field_id=${id}`,
  OPTIMIZE: '/optimization/recommendations/optimize',
  SCENARIO_EVALUATE: '/optimization/recommendations/scenario-evaluate',
  PLANB: '/optimization/planb',
  WATER_BUDGET: '/optimization/supply/water-budget',
  SUPPLY: '/optimization/supply',
  HEALTH: '/optimization/health',
  // Adaptive endpoints
  ADAPTIVE_RECOMMENDATIONS: '/optimization/adaptive',
  ADAPTIVE_PARAMETERS: '/optimization/adaptive/parameters',
  ADAPTIVE_CROPS: '/optimization/adaptive/crops',
};

export const acaoApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all recommendations
  getRecommendations: () =>
    apiClient.get(ENDPOINTS.RECOMMENDATIONS).then((r) => r.data),

  // Get field-specific recommendations
  getFieldRecommendations: (fieldId: string) =>
    apiClient.get(ENDPOINTS.FIELD_RECOMMENDATIONS(fieldId)).then((r) => r.data),

  // Run optimization
  runOptimization: (params: OptimizationRequest) =>
    apiClient.post(ENDPOINTS.OPTIMIZE, params).then((r) => r.data),

  // Evaluate what-if scenario on backend using live context
  evaluateScenario: (params: ScenarioEvaluationRequest) =>
    apiClient.post<ScenarioEvaluationResponse>(ENDPOINTS.SCENARIO_EVALUATE, params).then((r) => r.data),

  // Scenario list is currently frontend-defined.
  getScenarios: () => apiClient.get(ENDPOINTS.RECOMMENDATIONS).then((r) => r.data),

  // Get Plan B recommendations
  getPlanB: (
    fieldId: string,
    season: string = 'Maha-2025',
    updatedQuotaMm?: number,
    updatedPrices?: Record<string, number>
  ) =>
    apiClient.post(ENDPOINTS.PLANB, {
      field_id: fieldId,
      season,
      updated_quota_mm: updatedQuotaMm,
      updated_prices: updatedPrices,
    }).then((r) => r.data),

  // Get water budget
  getWaterBudget: (params?: { season?: string }) =>
    apiClient.get(ENDPOINTS.WATER_BUDGET, { params }).then((r) => r.data),

  // Get supply data
  getSupplyData: () => apiClient.get(ENDPOINTS.SUPPLY).then((r) => r.data),

  // ============ Adaptive Recommendation APIs ============
  
  // Get adaptive recommendations with custom parameters
  getAdaptiveRecommendations: (params: AdaptiveRecommendationRequest) =>
    apiClient.post<AdaptiveRecommendationResponse>(ENDPOINTS.ADAPTIVE_RECOMMENDATIONS, params),

  // Get parameter defaults and valid ranges
  getParameterDefaults: () =>
    apiClient.get<ParameterDefaults>(ENDPOINTS.ADAPTIVE_PARAMETERS),

  // Get available crops for filtering
  getAvailableCrops: () =>
    apiClient.get<{ crops: CropInfo[]; total: number }>(ENDPOINTS.ADAPTIVE_CROPS),
};

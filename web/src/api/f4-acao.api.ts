import axios from 'axios';

export interface OptimizationRequest {
  waterQuota: number;
  constraints: {
    minPaddyArea?: number;
    maxRiskLevel?: 'low' | 'medium' | 'high';
  };
  scenario?: string;
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

// TEMPORARY: Direct connection to Optimize Service (bypassing gateway)
// Use this until API Gateway is configured at localhost:8000
const DIRECT_OPTIMIZE_SERVICE = 'http://localhost:8004';
const USE_DEMO = true;  // Set to false when database is configured

// Create direct client for optimize service
const optimizeClient = axios.create({
  baseURL: DIRECT_OPTIMIZE_SERVICE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ACA-O (Optimization) API endpoints
const ENDPOINTS = {
  BASE: '/f4',
  RECOMMENDATIONS: USE_DEMO ? '/f4/demo/recommendations' : '/f4/recommendations',
  FIELD_RECOMMENDATIONS: (id: string) => `/f4/recommendations/${id}`,
  OPTIMIZE: USE_DEMO ? '/f4/demo/optimize' : '/f4/recommendations/optimize',
  SCENARIOS: '/f4/recommendations/scenarios',
  PLANB: '/f4/planb',
  WATER_BUDGET: USE_DEMO ? '/f4/demo/water-budget' : '/f4/supply/water-budget',
  SUPPLY: USE_DEMO ? '/f4/demo/supply' : '/f4/supply',
  HEALTH: '/f4/health',
  // Adaptive endpoints
  ADAPTIVE_RECOMMENDATIONS: '/f4/adaptive',
  ADAPTIVE_PARAMETERS: '/f4/adaptive/parameters',
  ADAPTIVE_CROPS: '/f4/adaptive/crops',
};

export const acaoApi = {
  // Health check
  healthCheck: () => optimizeClient.get(ENDPOINTS.HEALTH),

  // Get all recommendations
  getRecommendations: () => optimizeClient.get(ENDPOINTS.RECOMMENDATIONS),

  // Get field-specific recommendations
  getFieldRecommendations: (fieldId: string) =>
    optimizeClient.get(ENDPOINTS.FIELD_RECOMMENDATIONS(fieldId)),

  // Run optimization
  runOptimization: (params: OptimizationRequest) =>
    optimizeClient.post(ENDPOINTS.OPTIMIZE, params),

  // Get scenarios
  getScenarios: () => optimizeClient.get(ENDPOINTS.SCENARIOS),

  // Get Plan B recommendations
  getPlanB: (scenarioId: string) =>
    optimizeClient.get(ENDPOINTS.PLANB, { params: { scenarioId } }),

  // Get water budget
  getWaterBudget: (params?: { season?: string }) =>
    optimizeClient.get(ENDPOINTS.WATER_BUDGET, { params }),

  // Get supply data
  getSupplyData: () => optimizeClient.get(ENDPOINTS.SUPPLY),

  // ============ Adaptive Recommendation APIs ============
  
  // Get adaptive recommendations with custom parameters
  getAdaptiveRecommendations: (params: AdaptiveRecommendationRequest) =>
    optimizeClient.post<AdaptiveRecommendationResponse>(ENDPOINTS.ADAPTIVE_RECOMMENDATIONS, params),

  // Get parameter defaults and valid ranges
  getParameterDefaults: () =>
    optimizeClient.get<ParameterDefaults>(ENDPOINTS.ADAPTIVE_PARAMETERS),

  // Get available crops for filtering
  getAvailableCrops: () =>
    optimizeClient.get<{ crops: CropInfo[]; total: number }>(ENDPOINTS.ADAPTIVE_CROPS),
};

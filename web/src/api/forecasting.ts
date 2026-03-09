import { apiClient } from './index';

export type ForecastContractStatus =
  | 'ok'
  | 'stale'
  | 'data_unavailable'
  | 'analysis_pending'
  | 'source_unavailable'
  | string;

export interface ForecastContract {
  status: ForecastContractStatus;
  source: string;
  is_live: boolean;
  observed_at?: string | number | null;
  staleness_sec?: number | null;
  quality: string;
  data_available: boolean;
  message?: string | null;
}

export interface ForecastStatusResponse extends ForecastContract {
  service?: string;
  models_trained?: boolean;
  available_models?: string[];
  data_points?: number | Record<string, number>;
  features_engineered?: number;
  strict_live_data?: boolean;
  ml_only_mode?: boolean;
  model_ready?: boolean;
  required_models?: string[];
  loaded_models?: string[];
  missing_models?: string[];
  timestamp?: number;
}

export interface ForecastPrediction {
  hour: number;
  predicted_water_level: number;
  timestamp: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface CurrentDataResponse extends ForecastContract {
  current_data?: {
    timestamp?: number;
    water_level_percent?: number;
    rainfall_mm?: number;
    gate_opening_percent?: number;
  } | null;
  data_points_total: number;
}

export interface ForecastResponse extends ForecastContract {
  model_used?: string;
  current_level: number;
  predictions: ForecastPrediction[];
  forecast_generated_at?: number;
  model_name?: string;
  model_version?: string;
  input_contract_version?: string;
  features_used_count?: number;
  metrics?: {
    rmse: number;
    mae: number;
    r2: number;
  };
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  r2: number;
}

export interface ModelInfo {
  name: string;
  metrics: ModelMetrics;
  rank: number;
}

export interface ModelComparisonResponse extends ForecastContract {
  models: ModelInfo[];
  best_model: string;
}

export interface RiskAssessment extends ForecastContract {
  current_water_level: number;
  flood_risk: string;
  drought_risk: string;
  confidence?: number;
  recent_rainfall_24h: number;
  level_trend: number;
  predicted_max_24h?: number;
  predicted_min_24h?: number;
  alerts: string[];
  assessment_time?: number;
  model_metrics?: any;
}

export interface TrainingStatus extends ForecastContract {
  message: string;
  data_points?: number;
  models_trained?: string[];
  best_model?: string;
  training_time?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

class ForecastingAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/forecast';
  }

  // Basic forecasting endpoints
  async getStatus(): Promise<ForecastStatusResponse> {
    const response = await apiClient.get(`${this.baseUrl}/status`);
    return response.data;
  }

  async getCurrentData(): Promise<CurrentDataResponse> {
    const response = await apiClient.get(`${this.baseUrl}/current-data`);
    return response.data;
  }

  async getBasicForecast(hours: number = 24): Promise<ForecastResponse> {
    const response = await apiClient.get(`${this.baseUrl}/forecast`, {
      params: { hours }
    });
    return response.data;
  }

  async getBasicRiskAssessment(): Promise<RiskAssessment> {
    const response = await apiClient.get(`${this.baseUrl}/risk-assessment`);
    return response.data;
  }

  // Advanced ML endpoints
  async getAdvancedStatus(): Promise<ForecastStatusResponse> {
    const response = await apiClient.get(`${this.baseUrl}/v2/status`);
    return response.data;
  }

  async trainModels(): Promise<TrainingStatus> {
    const response = await apiClient.post(`${this.baseUrl}/v2/train`);
    return response.data;
  }

  async getAdvancedForecast(
    hours: number = 24,
    model: string = 'best',
    uncertainty: boolean = true
  ): Promise<ForecastResponse> {
    const response = await apiClient.get(`${this.baseUrl}/v2/forecast`, {
      params: { hours, model, uncertainty }
    });
    return response.data;
  }

  async getModelComparison(): Promise<ModelComparisonResponse> {
    const response = await apiClient.get(`${this.baseUrl}/v2/model-comparison`);
    return response.data;
  }

  async getAdvancedRiskAssessment(): Promise<RiskAssessment> {
    const response = await apiClient.get(`${this.baseUrl}/v2/risk-assessment`);
    return response.data;
  }

  async getModelAnalysis(modelName: string): Promise<Record<string, any>> {
    const response = await apiClient.get(`${this.baseUrl}/v2/model-analysis/${modelName}`);
    return response.data;
  }

  async getFeatureImportance(model: string = 'rf'): Promise<Record<string, any>> {
    const response = await apiClient.get(`${this.baseUrl}/v2/feature-importance`, {
      params: { model }
    });
    return response.data;
  }

  async updateData(): Promise<TrainingStatus> {
    const response = await apiClient.post(`${this.baseUrl}/v2/update-data`);
    return response.data;
  }

  // Weather API endpoints
  async getCurrentWeather(): Promise<WeatherCurrent> {
    const response = await apiClient.get(`${this.baseUrl}/weather/current`);
    return response.data;
  }

  async getWeatherForecast(days: number = 7): Promise<WeatherForecast> {
    const response = await apiClient.get(`${this.baseUrl}/weather/forecast`, {
      params: { days }
    });
    return response.data;
  }

  async getHistoricalWeather(days: number = 30): Promise<Record<string, any>> {
    const response = await apiClient.get(`${this.baseUrl}/weather/historical`, {
      params: { days }
    });
    return response.data;
  }

  async getIrrigationRecommendation(): Promise<IrrigationRecommendation> {
    const response = await apiClient.get(`${this.baseUrl}/weather/irrigation-recommendation`);
    return response.data;
  }

  async getWeatherSummary(): Promise<Record<string, any>> {
    const response = await apiClient.get(`${this.baseUrl}/weather/summary`);
    return response.data;
  }

  // Analytics API endpoints
  async getAnalyticsStatus() {
    const response = await apiClient.get(`${this.baseUrl}/v2/analytics/status`);
    return response.data;
  }

  async trainArimaModel(data: number[], dataType: string = 'water_level', auto: boolean = true) {
    const response = await apiClient.post(`${this.baseUrl}/v2/analytics/arima/train`, {
      values: data,
      data_type: dataType,
      auto
    });
    return response.data;
  }

  async getArimaForecast(dataType: string = 'water_level', steps: number = 24) {
    const response = await apiClient.post(`${this.baseUrl}/v2/analytics/arima/forecast`, {
      data_type: dataType,
      steps
    });
    return response.data;
  }

  async analyzeTimeSeries(data: number[], dataType: string = 'water_level') {
    const response = await apiClient.post(`${this.baseUrl}/v2/analytics/arima/analyze`, {
      values: data,
      data_type: dataType
    });
    return response.data;
  }

  async detectAnomalies(
    data: number[], 
    timestamps?: string[], 
    methods?: string[],
    sensitivity: number = 1.0
  ) {
    const response = await apiClient.post(`${this.baseUrl}/v2/analytics/anomaly/detect`, {
      values: data,
      timestamps,
      methods,
      sensitivity
    });
    return response.data;
  }

  async getAnomalyDetectionMethods() {
    const response = await apiClient.get(`${this.baseUrl}/v2/analytics/anomaly/methods`);
    return response.data;
  }

  async getModelRankings() {
    const response = await apiClient.get(`${this.baseUrl}/v2/analytics/ensemble/rankings`);
    return response.data;
  }

  async analyzeSeasonalPatterns(data: number[], dataType: string = 'water_level') {
    const response = await apiClient.post(`${this.baseUrl}/v2/analytics/seasonal/analyze`, {
      values: data,
      data_type: dataType
    });
    return response.data;
  }
}

// Types for new API responses
export interface WeatherConditions {
  temperature_c: number;
  humidity_percent: number;
  precipitation_mm: number;
  rain_mm: number;
  weather_description: string;
  wind_speed_kmh: number;
  cloud_cover_percent: number;
}

export interface WeatherCurrent {
  status: ForecastContractStatus;
  source: string;
  is_live: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality: string;
  data_available: boolean;
  message?: string | null;
  timestamp: string;
  conditions: WeatherConditions;
  irrigation_impact: {
    irrigation_need_factor: number;
    recommendation: string;
    evaporation_risk: string;
  };
}

export interface WeatherForecastDay {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_mm: number;
  rain_mm: number;
  precipitation_probability: number;
  weather_description: string;
  evapotranspiration_mm: number;
}

export interface WeatherForecast extends ForecastContract {
  forecast_days: number;
  daily: WeatherForecastDay[];
  summary: {
    total_precipitation_7d_mm: number;
    average_temp_c: number;
    rainy_days_count: number;
    irrigation_recommendation: string;
  };
}

export interface IrrigationRecommendation extends ForecastContract {
  generated_at?: string;
  ml_only_mode?: boolean;
  current_conditions?: {
    temperature_c?: number;
    humidity_percent?: number;
    current_rain_mm?: number;
    immediate_impact?: string;
  };
  weekly_outlook?: {
    total_expected_rain_mm?: number;
    total_expected_evapotranspiration_mm?: number;
    net_water_balance_mm?: number;
    rainy_days_expected?: number;
    average_irrigation_adjustment_percent?: number;
  };
  overall_recommendation?: string;
  daily_schedule?: Array<{
    date?: string;
    expected_rain_mm?: number;
    expected_evapotranspiration_mm?: number;
    water_balance_mm?: number;
    recommendation?: string;
    irrigation_percent?: number;
  }>;
}

export interface AnomalyResult {
  index: number;
  timestamp?: string;
  value: number;
  expected_value: number;
  deviation: number;
  severity: string;
  detection_method: string;
  description: string;
}

export interface AnomalyDetectionResponse {
  data_length: number;
  methods_used: string[];
  results_by_method: Record<string, AnomalyResult[]>;
  total_anomalies_per_method: Record<string, number>;
  consensus_anomalies: {
    index: number;
    value: number;
    detection_methods: string[];
    confidence: number;
    severity: string;
  }[];
  consensus_count: number;
  summary: {
    most_anomalous_indices: number[];
    detection_rate: number;
  };
}

export interface DailyPattern {
  hourly_averages: number[];
  peak_hour: number;
  peak_value: number;
  trough_hour: number;
  trough_value: number;
  daily_range: number;
}

export function getForecastApiErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim().length > 0) {
    return detail;
  }
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim().length > 0) {
      return detail.message;
    }
  }
  if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim().length > 0) {
    return error.response.data.message;
  }
  if (typeof error?.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

export const forecastingAPI = new ForecastingAPI();
export default forecastingAPI;

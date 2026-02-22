import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_FORECASTING_SERVICE_URL || 'http://localhost:8003';

export interface ForecastPrediction {
  hour: number;
  predicted_water_level: number;
  timestamp: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface ForecastResponse {
  status: string;
  model_used: string;
  current_level: number;
  predictions: ForecastPrediction[];
  forecast_generated_at: number;
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

export interface ModelComparisonResponse {
  status: string;
  models: ModelInfo[];
  best_model: string;
}

export interface RiskAssessment {
  current_water_level: number;
  flood_risk: string;
  drought_risk: string;
  confidence: number;
  recent_rainfall_24h: number;
  level_trend: number;
  predicted_max_24h: number;
  predicted_min_24h: number;
  alerts: string[];
  assessment_time: number;
  model_metrics: any;
}

export interface TrainingStatus {
  status: string;
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
    this.baseUrl = API_BASE_URL;
  }

  // Basic forecasting endpoints
  async getStatus() {
    const response = await axios.get(`${this.baseUrl}/api/v1/status`);
    return response.data;
  }

  async getCurrentData() {
    const response = await axios.get(`${this.baseUrl}/api/v1/current-data`);
    return response.data;
  }

  async getBasicForecast(hours: number = 24) {
    const response = await axios.get(`${this.baseUrl}/api/v1/forecast`, {
      params: { hours }
    });
    return response.data;
  }

  async getBasicRiskAssessment() {
    const response = await axios.get(`${this.baseUrl}/api/v1/risk-assessment`);
    return response.data;
  }

  // Advanced ML endpoints
  async getAdvancedStatus() {
    const response = await axios.get(`${this.baseUrl}/api/v2/status`);
    return response.data;
  }

  async trainModels(): Promise<TrainingStatus> {
    const response = await axios.post(`${this.baseUrl}/api/v2/train`);
    return response.data;
  }

  async getAdvancedForecast(
    hours: number = 24,
    model: string = 'best',
    uncertainty: boolean = true
  ): Promise<ForecastResponse> {
    const response = await axios.get(`${this.baseUrl}/api/v2/forecast`, {
      params: { hours, model, uncertainty }
    });
    return response.data;
  }

  async getModelComparison(): Promise<ModelComparisonResponse> {
    const response = await axios.get(`${this.baseUrl}/api/v2/model-comparison`);
    return response.data;
  }

  async getAdvancedRiskAssessment(): Promise<RiskAssessment> {
    const response = await axios.get(`${this.baseUrl}/api/v2/risk-assessment`);
    return response.data;
  }

  async getModelAnalysis(modelName: string) {
    const response = await axios.get(`${this.baseUrl}/api/v2/model-analysis/${modelName}`);
    return response.data;
  }

  async getFeatureImportance(model: string = 'rf') {
    const response = await axios.get(`${this.baseUrl}/api/v2/feature-importance`, {
      params: { model }
    });
    return response.data;
  }

  async updateData() {
    const response = await axios.post(`${this.baseUrl}/api/v2/update-data`);
    return response.data;
  }

  // Weather API endpoints
  async getCurrentWeather() {
    const response = await axios.get(`${this.baseUrl}/api/weather/current`);
    return response.data;
  }

  async getWeatherForecast(days: number = 7) {
    const response = await axios.get(`${this.baseUrl}/api/weather/forecast`, {
      params: { days }
    });
    return response.data;
  }

  async getHistoricalWeather(days: number = 30) {
    const response = await axios.get(`${this.baseUrl}/api/weather/historical`, {
      params: { days }
    });
    return response.data;
  }

  async getIrrigationRecommendation() {
    const response = await axios.get(`${this.baseUrl}/api/weather/irrigation-recommendation`);
    return response.data;
  }

  async getWeatherSummary() {
    const response = await axios.get(`${this.baseUrl}/api/weather/summary`);
    return response.data;
  }

  // Analytics API endpoints
  async getAnalyticsStatus() {
    const response = await axios.get(`${this.baseUrl}/api/v2/analytics/status`);
    return response.data;
  }

  async trainArimaModel(data: number[], dataType: string = 'water_level', auto: boolean = true) {
    const response = await axios.post(`${this.baseUrl}/api/v2/analytics/arima/train`, {
      values: data,
      data_type: dataType,
      auto
    });
    return response.data;
  }

  async getArimaForecast(dataType: string = 'water_level', steps: number = 24) {
    const response = await axios.post(`${this.baseUrl}/api/v2/analytics/arima/forecast`, {
      data_type: dataType,
      steps
    });
    return response.data;
  }

  async analyzeTimeSeries(data: number[], dataType: string = 'water_level') {
    const response = await axios.post(`${this.baseUrl}/api/v2/analytics/arima/analyze`, {
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
    const response = await axios.post(`${this.baseUrl}/api/v2/analytics/anomaly/detect`, {
      values: data,
      timestamps,
      methods,
      sensitivity
    });
    return response.data;
  }

  async getAnomalyDetectionMethods() {
    const response = await axios.get(`${this.baseUrl}/api/v2/analytics/anomaly/methods`);
    return response.data;
  }

  async getModelRankings() {
    const response = await axios.get(`${this.baseUrl}/api/v2/analytics/ensemble/rankings`);
    return response.data;
  }

  async analyzeSeasonalPatterns(data: number[], dataType: string = 'water_level') {
    const response = await axios.post(`${this.baseUrl}/api/v2/analytics/seasonal/analyze`, {
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
  status: string;
  source: string;
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

export interface WeatherForecast {
  status: string;
  source: string;
  forecast_days: number;
  daily: WeatherForecastDay[];
  summary: {
    total_precipitation_7d_mm: number;
    average_temp_c: number;
    rainy_days_count: number;
    irrigation_recommendation: string;
  };
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

export const forecastingAPI = new ForecastingAPI();
export default forecastingAPI;

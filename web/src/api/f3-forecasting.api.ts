import { apiClient } from './index';

// Forecasting API endpoints - via Gateway
const ENDPOINTS = {
  BASE: '/forecast',
  STATUS: '/forecast/status',
  FORECASTS: '/forecast/forecast',
  FORECAST_BY_METRIC: (_metric: string) => '/forecast/forecast',
  ALERTS: '/forecast/v2/risk-assessment',
  SIMULATION: '/forecast/v2/forecast',
  RISK: '/forecast/risk-assessment',
  WEATHER_SUMMARY: '/forecast/weather/summary',
  HEALTH: '/forecast/health',
};

export const forecastingApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all forecasts
  getForecasts: () => apiClient.get(ENDPOINTS.FORECASTS, { params: { hours: 24 } }),

  // Get forecast by metric
  getForecastByMetric: (metric: string, horizon?: number) =>
    apiClient.get(ENDPOINTS.FORECAST_BY_METRIC(metric), {
      params: { hours: horizon || 24 },
    }),

  // Get alerts
  getAlerts: (params?: { type?: string; severity?: string }) =>
    apiClient.get(ENDPOINTS.ALERTS, { params }),

  // Run simulation
  runSimulation: (params: { scenario: string; horizon: number }) =>
    apiClient.get(ENDPOINTS.SIMULATION, { params: { hours: params.horizon, model: 'best', uncertainty: true } }),

  // Get risk indicators
  getRiskIndicators: () => apiClient.get(ENDPOINTS.RISK),

  // Get weather summary
  getWeatherSummary: () => apiClient.get(ENDPOINTS.WEATHER_SUMMARY),
};

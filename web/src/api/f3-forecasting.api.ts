import { apiClient } from './index';

// Forecasting API endpoints - via Gateway
const ENDPOINTS = {
  BASE: '/forecast',
  FORECASTS: '/forecast',
  FORECAST_BY_METRIC: (metric: string) => `/forecast/${metric}`,
  ALERTS: '/forecast/alerts',
  SIMULATION: '/forecast/simulation',
  RISK: '/forecast/risk',
  HEALTH: '/forecast/health',
};

export const forecastingApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all forecasts
  getForecasts: () => apiClient.get(ENDPOINTS.FORECASTS),

  // Get forecast by metric
  getForecastByMetric: (metric: string, horizon?: number) =>
    apiClient.get(ENDPOINTS.FORECAST_BY_METRIC(metric), {
      params: { horizon },
    }),

  // Get alerts
  getAlerts: (params?: { type?: string; severity?: string }) =>
    apiClient.get(ENDPOINTS.ALERTS, { params }),

  // Run simulation
  runSimulation: (params: { scenario: string; horizon: number }) =>
    apiClient.post(ENDPOINTS.SIMULATION, params),

  // Get risk indicators
  getRiskIndicators: () => apiClient.get(ENDPOINTS.RISK),
};

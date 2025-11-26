import apiClient from './index';
import { ENDPOINTS } from './endpoints';

export const forecastingApi = {
  // Get all forecasts
  getForecasts: () => apiClient.get(ENDPOINTS.FORECASTING.FORECASTS),

  // Get forecast by metric
  getForecastByMetric: (metric: string, horizon?: number) =>
    apiClient.get(ENDPOINTS.FORECASTING.FORECAST_BY_METRIC(metric), {
      params: { horizon },
    }),

  // Get alerts
  getAlerts: (params?: { type?: string; severity?: string }) =>
    apiClient.get(ENDPOINTS.FORECASTING.ALERTS, { params }),

  // Run simulation
  runSimulation: (params: { scenario: string; horizon: number }) =>
    apiClient.post(ENDPOINTS.FORECASTING.SIMULATION, params),

  // Get risk indicators
  getRiskIndicators: () => apiClient.get(ENDPOINTS.FORECASTING.RISK),
};

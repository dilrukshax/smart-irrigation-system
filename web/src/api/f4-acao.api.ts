import { apiClient } from './index';

export interface OptimizationRequest {
  waterQuota: number;
  constraints: {
    minPaddyArea?: number;
    maxRiskLevel?: 'low' | 'medium' | 'high';
  };
  scenario?: string;
}

// ACA-O (Optimization) API endpoints - via Gateway
const ENDPOINTS = {
  BASE: '/optimization',
  RECOMMENDATIONS: '/optimization/recommendations',
  FIELD_RECOMMENDATIONS: (id: string) => `/optimization/recommendations/${id}`,
  OPTIMIZE: '/optimization/recommendations/optimize',
  SCENARIOS: '/optimization/recommendations/scenarios',
  PLANB: '/optimization/planb',
  WATER_BUDGET: '/optimization/supply/water-budget',
  SUPPLY: '/optimization/supply',
  HEALTH: '/optimization/health',
};

export const acaoApi = {
  // Health check
  healthCheck: () => apiClient.get(ENDPOINTS.HEALTH),

  // Get all recommendations
  getRecommendations: () => apiClient.get(ENDPOINTS.RECOMMENDATIONS),

  // Get field-specific recommendations
  getFieldRecommendations: (fieldId: string) =>
    apiClient.get(ENDPOINTS.FIELD_RECOMMENDATIONS(fieldId)),

  // Run optimization
  runOptimization: (params: OptimizationRequest) =>
    apiClient.post(ENDPOINTS.OPTIMIZE, params),

  // Get scenarios
  getScenarios: () => apiClient.get(ENDPOINTS.SCENARIOS),

  // Get Plan B recommendations
  getPlanB: (scenarioId: string) =>
    apiClient.get(ENDPOINTS.PLANB, { params: { scenarioId } }),

  // Get water budget
  getWaterBudget: (params?: { season?: string }) =>
    apiClient.get(ENDPOINTS.WATER_BUDGET, { params }),

  // Get supply data
  getSupplyData: () => apiClient.get(ENDPOINTS.SUPPLY),
};

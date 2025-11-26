import apiClient from './index';
import { ENDPOINTS } from './endpoints';

export interface OptimizationRequest {
  waterQuota: number;
  constraints: {
    minPaddyArea?: number;
    maxRiskLevel?: 'low' | 'medium' | 'high';
  };
  scenario?: string;
}

export const acaoApi = {
  // Get all recommendations
  getRecommendations: () => apiClient.get(ENDPOINTS.ACAO.RECOMMENDATIONS),

  // Get field-specific recommendations
  getFieldRecommendations: (fieldId: string) =>
    apiClient.get(ENDPOINTS.ACAO.FIELD_RECOMMENDATIONS(fieldId)),

  // Run optimization
  runOptimization: (params: OptimizationRequest) =>
    apiClient.post(ENDPOINTS.ACAO.OPTIMIZE, params),

  // Get scenarios
  getScenarios: () => apiClient.get(ENDPOINTS.ACAO.SCENARIOS),

  // Get Plan B recommendations
  getPlanB: (scenarioId: string) =>
    apiClient.get(ENDPOINTS.ACAO.PLANB, { params: { scenarioId } }),

  // Get water budget
  getWaterBudget: (params?: { season?: string }) =>
    apiClient.get(ENDPOINTS.ACAO.WATER_BUDGET, { params }),

  // Get supply data
  getSupplyData: () => apiClient.get(ENDPOINTS.ACAO.SUPPLY),
};

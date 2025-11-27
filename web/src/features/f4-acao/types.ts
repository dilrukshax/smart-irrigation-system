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

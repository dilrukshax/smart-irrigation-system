// F3 - Forecasting Types

export interface Forecast {
  id: string;
  metric: string;
  horizon: number; // days
  values: ForecastValue[];
  generatedAt: Date;
}

export interface ForecastValue {
  date: Date;
  predicted: number;
  p10: number; // 10th percentile
  p50: number; // median
  p90: number; // 90th percentile
}

export interface Alert {
  id: string;
  type: 'drought' | 'flood' | 'spill' | 'high-demand' | 'low-storage';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
}

export interface RiskIndicator {
  type: 'drought' | 'flood' | 'spill';
  probability: number;
  daysToEvent?: number;
}

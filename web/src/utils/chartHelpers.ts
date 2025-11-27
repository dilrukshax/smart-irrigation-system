// Chart data transformation helpers

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Transform time-series data for Recharts
export const transformTimeSeriesData = (
  data: { date: string; value: number }[],
  valueKey = 'value'
): ChartDataPoint[] => {
  return data.map((item) => ({
    name: item.date,
    [valueKey]: item.value,
    value: item.value,
  }));
};

// Generate forecast bands data
export const generateForecastBands = (
  data: { date: string; p10: number; p50: number; p90: number }[]
) => {
  return data.map((item) => ({
    name: item.date,
    p10: item.p10,
    p50: item.p50,
    p90: item.p90,
    range: [item.p10, item.p90],
  }));
};

// Aggregate data by period
export const aggregateByPeriod = (
  data: ChartDataPoint[],
  period: 'day' | 'week' | 'month'
): ChartDataPoint[] => {
  // Simplified aggregation - in real app would use date-fns
  const grouped: Record<string, number[]> = {};
  
  data.forEach((item) => {
    const key = item.name.substring(0, period === 'day' ? 10 : period === 'week' ? 7 : 7);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item.value);
  });

  return Object.entries(grouped).map(([name, values]) => ({
    name,
    value: values.reduce((a, b) => a + b, 0) / values.length,
  }));
};

// Color scale for heat maps
export const getHeatmapColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.33) {
    return '#f44336'; // Red - critical
  } else if (normalized < 0.66) {
    return '#ff9800'; // Orange - warning
  }
  return '#4caf50'; // Green - good
};

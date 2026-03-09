import { useQuery } from '@tanstack/react-query';
import { cropFieldsApi, irrigationApi, waterManagementApi } from '@api/f1-irrigation.api';
import { iotApi } from '@api/f1-iot.api';
import cropHealthApi from '@features/f2-crop-health/api/cropHealth.api';
import forecastingAPI from '@api/forecasting';
import { forecastingApi } from '@api/f3-forecasting.api';
import {
  acaoApi,
  type AdaptiveCropRecommendation,
  type AdaptiveRecommendationRequest,
} from '@api/f4-acao.api';

type ModuleId = 'F1' | 'F2' | 'F3' | 'F4';

type ModuleProgress = {
  id: ModuleId;
  title: string;
  ready: boolean;
  detail: string;
};

type TelemetryChartPoint = {
  time: string;
  soilMoisture: number;
  waterLevel: number;
};

type ForecastChartPoint = {
  time: string;
  predicted: number;
  lower?: number;
  upper?: number;
};

type ProfitCostPoint = {
  crop: string;
  profitPerHa: number;
  costPerHa: number;
};

export type HomepageResearchData = {
  fieldsCount: number;
  deviceCount: number;
  forecastPoints: number;
  optimizationRows: number;
  zoneSummary: {
    healthy: number;
    mildStress: number;
    severeStress: number;
    totalZones: number;
    averageNdvi: number;
    averageNdwi: number;
  };
  budget: {
    quota: number | null;
    usage: number;
    remaining: number | null;
    utilization: number | null;
  };
  economics: {
    averageCostPerHa: number;
    averageProfitPerHa: number;
    averageRoi: number;
    bestCrop: string;
    processingTimeMs: number;
    implementationEffortDays: number;
  };
  charts: {
    telemetry: TelemetryChartPoint[];
    forecast: ForecastChartPoint[];
    profitCost: ProfitCostPoint[];
  };
  modules: ModuleProgress[];
  overallProgress: number;
  hasLiveData: boolean;
};

type ForecastPoint = {
  timestamp: number;
  predicted_water_level: number;
  lower_bound?: number;
  upper_bound?: number;
};

const DEFAULT_LOCATION = {
  lat: 6.42,
  lon: 80.89,
};

const DEFAULT_ADAPTIVE_REQUEST: AdaptiveRecommendationRequest = {
  season: 'Maha-2026',
  top_n: 5,
  field_params: {
    area_ha: 5.0,
    soil_type: 'Loam',
    soil_ph: 6.5,
    soil_ec: 1.0,
    soil_suitability: 0.75,
    location: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    elevation: 500,
  },
  weather_params: {
    season_avg_temp: 28,
    season_rainfall_mm: 250,
    temp_mean_weekly: 28,
    temp_range_weekly: 8,
    precip_weekly_sum: 50,
    radiation_weekly_sum: 150,
    et0_weekly_sum: 30,
    humidity: 75,
  },
  water_params: {
    water_availability_mm: 5000,
    water_quota_mm: 800,
    water_coverage_ratio: 0.8,
    irrigation_efficiency: 0.7,
  },
  market_params: {
    price_factor: 1,
    price_volatility: 'medium',
    demand_level: 'normal',
  },
  crop_filters: {},
  suitability_weight: 0.4,
  profitability_weight: 0.6,
};

function asNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toShortTime(timestampSeconds: number): string {
  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fulfilledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

function extractOptimizationRows(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) {
    return root.data;
  }

  if (root.data && typeof root.data === 'object') {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data;
    }
  }

  return [];
}

export function useHomepageResearchData() {
  return useQuery<HomepageResearchData>({
    queryKey: ['homepage-research-data'],
    queryFn: async () => {
      const [
        fieldsResult,
        irrigationHealthResult,
        waterStatusResult,
        devicesResult,
        zoneSummaryResult,
        cropModelResult,
        advancedForecastResult,
        basicForecastResult,
        recommendationsResult,
        waterBudgetResult,
        adaptiveResult,
        forecastingHealthResult,
        optimizationHealthResult,
      ] = await Promise.allSettled([
        cropFieldsApi.getFields(),
        irrigationApi.healthCheck(),
        waterManagementApi.getStatus(),
        iotApi.getDevices(),
        cropHealthApi.getZoneSummary(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, 10, 6),
        cropHealthApi.getModelStatus(),
        forecastingAPI.getAdvancedForecast(24, 'best', true),
        forecastingAPI.getBasicForecast(24),
        acaoApi.getRecommendations(),
        acaoApi.getWaterBudget(),
        acaoApi.getAdaptiveRecommendations(DEFAULT_ADAPTIVE_REQUEST),
        forecastingApi.healthCheck(),
        acaoApi.healthCheck(),
      ]);

      const fields = fulfilledValue(fieldsResult)?.data;
      const fieldsCount = Array.isArray(fields) ? fields.length : 0;

      const devicesPayload = fulfilledValue(devicesResult)?.data;
      const devices = Array.isArray(devicesPayload?.devices) ? devicesPayload.devices : [];
      const deviceCount = devices.length;
      const firstDeviceId = devices[0]?.device_id;

      let telemetryChart: TelemetryChartPoint[] = [];
      if (firstDeviceId) {
        try {
          const rangeResponse = await iotApi.getRange(firstDeviceId, undefined, undefined, 24);
          const readings = Array.isArray(rangeResponse.data?.readings) ? rangeResponse.data.readings : [];
          telemetryChart = readings
            .slice()
            .reverse()
            .map((reading) => ({
              time: new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              soilMoisture: asNumber(reading.soil_moisture_pct),
              waterLevel: asNumber(reading.water_level_pct),
            }));
        } catch (_error) {
          telemetryChart = [];
        }
      }

      const zoneSummary = fulfilledValue(zoneSummaryResult);
      const zoneData = {
        healthy: asNumber(zoneSummary?.healthy_count),
        mildStress: asNumber(zoneSummary?.mild_stress_count),
        severeStress: asNumber(zoneSummary?.severe_stress_count),
        totalZones: asNumber(zoneSummary?.total_zones),
        averageNdvi: asNumber(zoneSummary?.average_ndvi),
        averageNdwi: asNumber(zoneSummary?.average_ndwi),
      };

      const advancedForecast = fulfilledValue(advancedForecastResult);
      const basicForecast = fulfilledValue(basicForecastResult);
      const forecastPayload = advancedForecast || basicForecast;
      const forecastRecord =
        forecastPayload && typeof forecastPayload === 'object'
          ? (forecastPayload as unknown as Record<string, unknown>)
          : null;
      const predictionRows =
        forecastRecord && Array.isArray(forecastRecord.predictions)
          ? forecastRecord.predictions
          : [];
      const predictions: ForecastPoint[] = predictionRows
        .filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
        .map((row) => ({
          timestamp: asNumber(row.timestamp),
          predicted_water_level: asNumber(row.predicted_water_level),
          lower_bound:
            row.lower_bound === undefined ? undefined : asNumber(row.lower_bound),
          upper_bound:
            row.upper_bound === undefined ? undefined : asNumber(row.upper_bound),
        }));
      const forecastChart: ForecastChartPoint[] = predictions.map((point) => ({
        time: toShortTime(asNumber(point.timestamp)),
        predicted: asNumber(point.predicted_water_level),
        lower: point.lower_bound,
        upper: point.upper_bound,
      }));

      const recommendationsPayload = fulfilledValue(recommendationsResult);
      const recommendationRows = extractOptimizationRows(recommendationsPayload);

      const waterBudgetPayload = fulfilledValue(waterBudgetResult);
      const waterBudgetData = (waterBudgetPayload?.data || waterBudgetPayload || {}) as Record<string, unknown>;
      const quotaRaw = waterBudgetData.quota;
      const quota = quotaRaw === null || quotaRaw === undefined ? null : asNumber(quotaRaw, 0);
      const usage = asNumber(waterBudgetData.total_usage);
      const remaining = quota === null ? null : quota - usage;
      const utilization = quota && quota > 0 ? (usage / quota) * 100 : null;

      const adaptivePayload = fulfilledValue(adaptiveResult)?.data;
      const adaptiveRecommendations = Array.isArray(adaptivePayload?.recommendations)
        ? (adaptivePayload.recommendations as AdaptiveCropRecommendation[])
        : [];
      const topProfitCost = adaptiveRecommendations.slice(0, 5).map((item) => ({
        crop: String(item.crop_name || 'Unknown'),
        profitPerHa: asNumber(item.profit_per_ha),
        costPerHa: asNumber(item.estimated_cost_per_ha),
      }));

      const averageCostPerHa = topProfitCost.length
        ? topProfitCost.reduce((sum, item) => sum + item.costPerHa, 0) / topProfitCost.length
        : 0;
      const averageProfitPerHa = topProfitCost.length
        ? topProfitCost.reduce((sum, item) => sum + item.profitPerHa, 0) / topProfitCost.length
        : 0;
      const averageRoi = topProfitCost.length
        ? topProfitCost.reduce((sum, item) => {
            if (item.costPerHa <= 0) {
              return sum;
            }
            return sum + (item.profitPerHa / item.costPerHa) * 100;
          }, 0) / topProfitCost.length
        : 0;

      const f1Ready = Boolean(
        fulfilledValue(irrigationHealthResult) && fulfilledValue(waterStatusResult)?.data?.model_ready
      );
      const f2Ready = Boolean(fulfilledValue(cropModelResult)?.model_loaded);
      const f3Ready = Boolean(fulfilledValue(forecastingHealthResult) && predictions.length > 0);
      const f4Ready = Boolean(fulfilledValue(optimizationHealthResult) && recommendationRows.length > 0);

      const modules: ModuleProgress[] = [
        {
          id: 'F1',
          title: 'F1 IoT Water Management',
          ready: f1Ready,
          detail: f1Ready ? 'Live telemetry and ML control available' : 'Waiting for irrigation service data',
        },
        {
          id: 'F2',
          title: 'F2 Crop Health Monitoring',
          ready: f2Ready,
          detail: f2Ready ? 'Satellite model is loaded and ready' : 'Model unavailable or loading',
        },
        {
          id: 'F3',
          title: 'F3 Forecasting & Alerting',
          ready: f3Ready,
          detail: f3Ready ? 'Forecast predictions streaming' : 'Forecast service unavailable',
        },
        {
          id: 'F4',
          title: 'F4 ACA-O Optimization',
          ready: f4Ready,
          detail: f4Ready ? 'Optimization recommendations live' : 'No optimization context available',
        },
      ];

      const readyCount = modules.filter((module) => module.ready).length;
      const overallProgress = (readyCount / modules.length) * 100;

      return {
        fieldsCount,
        deviceCount,
        forecastPoints: predictions.length,
        optimizationRows: recommendationRows.length,
        zoneSummary: zoneData,
        budget: {
          quota,
          usage,
          remaining,
          utilization,
        },
        economics: {
          averageCostPerHa,
          averageProfitPerHa,
          averageRoi,
          bestCrop: topProfitCost[0]?.crop || 'Unavailable',
          processingTimeMs: asNumber(adaptivePayload?.processing_time_ms),
          implementationEffortDays: 9,
        },
        charts: {
          telemetry: telemetryChart,
          forecast: forecastChart,
          profitCost: topProfitCost,
        },
        modules,
        overallProgress,
        hasLiveData: readyCount > 0,
      };
    },
    refetchInterval: 30000,
  });
}

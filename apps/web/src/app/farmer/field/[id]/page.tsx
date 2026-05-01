/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Icon,
  LogoMark,
  Logo,
  AppBar,
  Sidebar,
  Chip,
  Progress,
  Gauge,
  Sparkline,
  LineChart,
  BarChart,
  Donut,
  SchemeMap,
  Frame,
} from '@/components/asi/ui';
import { farmerNav, officerNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { ApiState, InlineLoader } from '@/components/asi/api-state';
import { apiGet, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OptimizationWizard } from './_components/optimization-wizard';
import { IrrigationPanel } from './_components/irrigation-panel';
import { CropHealthPanel } from './_components/crop-health-panel';
import { ForecastPanel } from './_components/forecast-panel';
import { FieldHealthMap } from '@/components/asi/field-health-map';

const formatAreaValue = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1).replace(/\.0$/, '') : '0';
};

const formatClockTime = (value: any) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatElapsed = (value: any) => {
  if (!value) return 'Waiting';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waiting';
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')} elapsed`;
  return `${String(minutes).padStart(2, '0')} min elapsed`;
};

const formatTimelineLabel = (value: any) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfToday) return `Today ${formatClockTime(date)}`;
  if (date >= startOfYesterday) return `Yesterday ${formatClockTime(date)}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${formatClockTime(date)}`;
};

const toFiniteNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickFirstNumber = (...values: any[]) => {
  for (const value of values) {
    const parsed = toFiniteNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const buildHistorySeries = (history: any[], keys: string[]) => (
  history
    .slice(0, 6)
    .reverse()
    .map((row: any) => pickFirstNumber(...keys.map((key) => row?.[key])))
    .filter((value: any) => value !== null)
);

const calculateDelta = (currentValue: any, previousValue: any) => {
  const current = toFiniteNumber(currentValue);
  const previous = toFiniteNumber(previousValue);
  if (current === null || previous === null) return null;
  return current - previous;
};

const sumFinite = (values: any[]) => values.reduce((total, value) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? total : total + parsed;
}, 0);

const formatMm = (value: any, digits = 1) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? '-' : `${parsed.toFixed(digits)} mm`;
};

const formatMoney = (value: any) => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return '-';
  if (Math.abs(parsed) >= 1_000_000) return `LKR ${(parsed / 1_000_000).toFixed(1)}M`;
  if (Math.abs(parsed) >= 1_000) return `LKR ${(parsed / 1_000).toFixed(0)}k`;
  return `LKR ${parsed.toFixed(0)}`;
};

const formatPrice = (value: any) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? '-' : `LKR ${parsed.toFixed(0)}/kg`;
};

const formatTons = (value: any) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? '-' : `${parsed.toFixed(1)} t/ha`;
};

const formatPercentValue = (value: any, digits = 0) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? '-' : `${parsed.toFixed(digits)}%`;
};

const scoreToPercent = (value: any) => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  return parsed <= 1 ? parsed * 100 : parsed;
};

const riskChipKind = (value: any) => {
  const normalized = String(value || '').toLowerCase();
  if (['high', 'critical', 'very_high'].includes(normalized)) return 'crit';
  if (['medium', 'moderate'].includes(normalized)) return 'warn';
  if (['low', 'stable'].includes(normalized)) return 'live';
  return 'info';
};

const recommendationChipKind = (value: any) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SKIP') return 'live';
  if (normalized === 'INCREASE') return 'warn';
  if (normalized === 'REDUCE') return 'info';
  return 'info';
};

const hasValidCoordinates = (lat: any, lon: any) => {
  const parsedLat = Number(lat);
  const parsedLon = Number(lon);
  return (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLon) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLon >= -180 &&
    parsedLon <= 180
  );
};

const FieldWorkspace = () => {
  const params = useParams();
  const fieldId = params?.id as string;
  const { user } = useAuth();

  const TAB_OVERVIEW = 0;
  const TAB_OPTIMIZATION = 1;
  const TAB_IRRIGATION = 2;
  const TAB_CROP_HEALTH = 3;
  const TAB_FORECAST = 4;

  const [tab, setTab] = React.useState(0);
  const tabs = ['Overview', 'Optimization', 'Irrigation', 'Crop Health', 'Forecast'];
  const [overviewMapLayer, setOverviewMapLayer] = React.useState<'terrain' | 'satellite'>('satellite');

  const [profile, setProfile] = React.useState<any>(null);
  const [sensorHistory, setSensorHistory] = React.useState<any[]>([]);
  const [forecastSummary, setForecastSummary] = React.useState<any>(null);
  const [cropPlan, setCropPlan] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const readLocalCropPlan = React.useCallback(() => {
    if (typeof window === 'undefined' || !fieldId) return null;
    try {
      const raw = window.localStorage.getItem(`asi.optimization.plan.v1.${fieldId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.field_id !== fieldId || !parsed.selected_crop) return null;
      return {
        field_id: parsed.field_id,
        season: parsed.season || null,
        selected_crop_id: parsed.selected_crop_id || parsed.selected_crop?.crop_id || null,
        selected_crop: parsed.selected_crop,
        field_context: parsed.field_context || null,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.selected_crop],
        source: 'local_cache',
        is_live: false,
        observed_at: parsed.saved_at || null,
      };
    } catch {
      return null;
    }
  }, [fieldId]);

  const loadProfile = React.useCallback(async () => {
    if (!fieldId) return;
    setLoading(true);
    setError(null);
    try {
      const [res, history, forecast, currentPlan] = await Promise.all([
        apiGet<any>(`/farm/fields/${fieldId}/profile`),
        apiGet<any>(`/telemetry/fields/${fieldId}/history?limit=24`).catch(() => null),
        apiGet<any>(`/irrigation/farmer/fields/${fieldId}/forecast-summary`).catch(() => null),
        apiGet<any>(`/planning/farmer/current?${new URLSearchParams({ field_id: fieldId }).toString()}`)
          .catch(() => readLocalCropPlan()),
      ]);
      setProfile(res);
      setSensorHistory(Array.isArray(history?.readings) ? history.readings : []);
      setForecastSummary(forecast);
      const localPlan = readLocalCropPlan();
      const remoteHasCropPlan = Boolean(
        currentPlan?.selected_crop ||
        currentPlan?.selected_crop_id ||
        (Array.isArray(currentPlan?.recommendations) && currentPlan.recommendations.length > 0)
      );
      setCropPlan(remoteHasCropPlan ? currentPlan : localPlan);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Field not found');
      } else {
        setError(err?.message || 'Failed to load field profile');
      }
    } finally {
      setLoading(false);
    }
  }, [fieldId, readLocalCropPlan]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = user?.username || 'Farmer';

  // Extract data from profile
  const f1 = profile?.sections?.f1 || {};
  const f2 = profile?.sections?.f2 || {};
  const f3 = profile?.sections?.f3 || {};
  const f4 = profile?.sections?.f4 || {};

  const fieldStatus = f1.field_status || {};
  const autoDecision = f1.auto_decision || {};
  const fieldName = fieldStatus.field_name || profile?.field_name || `Field ${fieldId}`;
  const cropType = fieldStatus.crop_type || 'Unknown';
  const area = fieldStatus.area_hectares || profile?.area_hectares || 0;
  const latestReading = sensorHistory[0] || fieldStatus.latest_telemetry || {};
  const telemetryObservedAt =
    latestReading.timestamp ||
    latestReading.observed_at ||
    latestReading.created_at ||
    fieldStatus.last_sensor_reading ||
    fieldStatus.last_real_data_time ||
    fieldStatus.observed_at ||
    f1.observed_at;
  const hasTelemetry = Boolean(
    telemetryObservedAt &&
    (fieldStatus.data_available ?? f1.data_available ?? true)
  );
  const valveStatus = fieldStatus.valve_status || fieldStatus.valve_state?.status || fieldStatus.valve_state?.state || 'CLOSED';
  const valvePosition = fieldStatus.valve_position_pct ?? fieldStatus.valve_state?.position_pct ?? 0;
  const isValveOpen = String(valveStatus).toLowerCase() === 'open';

  const soilMoisture = hasTelemetry
    ? pickFirstNumber(fieldStatus.current_soil_moisture_pct, latestReading.soil_moisture_pct, latestReading.soil_moisture)
    : null;
  const waterLevel = hasTelemetry
    ? pickFirstNumber(fieldStatus.current_water_level_pct, latestReading.water_level_pct, latestReading.water_level)
    : null;

  const stressSummary = f2.stress_summary || {};
  const zones = stressSummary.zones || [];

  const weatherSummary = f3.weather_summary || {};
  const forecastRec = f3.irrigation_recommendation || {};
  const weatherCurrent = weatherSummary.current || {};
  const forecastCurrent = forecastRec.current_conditions || {};
  const temp = pickFirstNumber(
    weatherSummary.temperature_celsius,
    weatherSummary.temperature,
    weatherCurrent.temperature_c,
    weatherCurrent.temperature_celsius,
    forecastCurrent.temperature_c,
    forecastCurrent.temperature_celsius,
    forecastRec.temperature_celsius,
    forecastRec.temperature_c
  );
  const humidity = pickFirstNumber(
    weatherSummary.humidity_percent,
    weatherSummary.humidity,
    weatherCurrent.humidity_percent,
    weatherCurrent.humidity,
    forecastCurrent.humidity_percent,
    forecastCurrent.humidity,
    forecastRec.humidity_percent,
    forecastRec.humidity
  );

  const recommendationsSource =
    f4.recommendations?.data?.[0]?.recommendations ??
    f4.recommendations?.recommendations ??
    f4.recommendations?.data ??
    f4.recommendations;
  const recommendations = Array.isArray(recommendationsSource) ? recommendationsSource : [];
  const forecastWeather = forecastSummary?.weather || {};
  const forecastWeekPlan = forecastSummary?.week_plan || {};
  const forecastModelSummary = forecastSummary?.model_summary || {};
  const forecastDaily = Array.isArray(forecastWeather.daily)
    ? forecastWeather.daily
    : Array.isArray(weatherSummary.forecast_preview)
      ? weatherSummary.forecast_preview
      : [];
  const forecastDaily7 = forecastDaily.slice(0, 7);
  const forecastTotalRain = pickFirstNumber(
    forecastWeekPlan?.weekly_outlook?.total_expected_rain_mm,
    forecastDaily7.length ? sumFinite(forecastDaily7.map((day: any) => day.rain_mm ?? day.expected_rain_mm)) : null
  );
  const forecastTotalEt = pickFirstNumber(
    forecastWeekPlan?.weekly_outlook?.total_expected_evapotranspiration_mm,
    forecastDaily7.some((day: any) => toFiniteNumber(day.evapotranspiration_mm ?? day.expected_evapotranspiration_mm) !== null)
      ? sumFinite(forecastDaily7.map((day: any) => day.evapotranspiration_mm ?? day.expected_evapotranspiration_mm))
      : null
  );
  const forecastNetBalance = pickFirstNumber(
    forecastWeekPlan?.weekly_outlook?.net_water_balance_mm,
    forecastTotalRain !== null && forecastTotalEt !== null ? forecastTotalRain - forecastTotalEt : null
  );
  const forecastRecommendation =
    forecastWeekPlan?.overall_recommendation ||
    forecastRec.overall_recommendation ||
    forecastRec.irrigation_recommendation ||
    forecastRec.recommendation ||
    null;
  const forecastSource = forecastSummary?.source || forecastWeather.source || f3.source || weatherSummary.source || weatherSummary.data_source || 'forecasting_service';
  const forecastStatus = forecastSummary?.status || f3.status || weatherSummary.status || 'unknown';
  const forecastUpdatedAt = forecastSummary?.observed_at || forecastWeather.generated_at || weatherSummary.observed_at || weatherSummary.generated_at || weatherSummary.timestamp || null;
  const forecastBestModel =
    forecastModelSummary?.advanced_models?.best_model ||
    forecastModelSummary?.basic_model?.name ||
    forecastModelSummary?.message ||
    null;

  const cropPlanRecommendations = Array.isArray(cropPlan?.recommendations) ? cropPlan.recommendations : [];
  const selectedCrop =
    cropPlan?.selected_crop ||
    (cropPlan?.selected_crop_id
      ? cropPlanRecommendations.find((rec: any) => rec.crop_id === cropPlan.selected_crop_id)
      : null);
  const topRecommendedCrop = selectedCrop || cropPlanRecommendations[0] || recommendations[0] || null;
  const hasSelectedCrop = Boolean(selectedCrop && (cropPlan?.selected_crop_id || cropPlan?.source === 'local_cache'));
  const cropRecommendationSummary = f4.recommendation_summary || {};
  const cropIncomeProjection = f4.income_projection || {};
  const cropMarketSnapshot = f4.market_snapshot || {};
  const cropName =
    topRecommendedCrop?.crop_name ||
    topRecommendedCrop?.crop_type ||
    topRecommendedCrop?.crop_id ||
    cropRecommendationSummary.crop_name ||
    profile?.selected_crop?.crop_type ||
    cropType;
  const cropSuitabilityPct = scoreToPercent(topRecommendedCrop?.suitability_score ?? topRecommendedCrop?.combined_score);
  const cropRisk = topRecommendedCrop?.risk_level || topRecommendedCrop?.risk_band || topRecommendedCrop?.risk || cropRecommendationSummary.risk || 'unknown';
  const cropProfitPerHa = pickFirstNumber(
    topRecommendedCrop?.profit_per_ha,
    topRecommendedCrop?.expected_profit_per_ha,
    cropIncomeProjection.expected_profit_per_ha
  );
  const cropYield = pickFirstNumber(
    topRecommendedCrop?.predicted_yield_t_ha,
    topRecommendedCrop?.expected_yield_t_per_ha,
    topRecommendedCrop?.predicted_yield,
    cropIncomeProjection.predicted_yield_t_per_ha
  );
  const cropPrice = pickFirstNumber(
    topRecommendedCrop?.predicted_price_per_kg,
    cropMarketSnapshot.predicted_price_per_kg
  );
  const cropWaterRequirement = pickFirstNumber(topRecommendedCrop?.water_requirement_mm, topRecommendedCrop?.water_mm);
  const cropRoi = pickFirstNumber(topRecommendedCrop?.roi_percentage);
  const cropSeason = cropPlan?.season || cropPlan?.field_context?.season || topRecommendedCrop?.season || null;
  const deviceId = fieldStatus.device_id || latestReading.device_id || '';
  const sensorConnected = Boolean(fieldStatus.sensor_connected && hasTelemetry);
  const telemetryQuality = fieldStatus.quality || f1.quality || (hasTelemetry ? 'good' : 'unknown');
  const telemetryMessage = fieldStatus.message || f1.message || (hasTelemetry ? 'Latest reading received' : 'No recent telemetry available');
  const batteryVoltage = latestReading.battery_v ?? fieldStatus.battery_v ?? null;
  const signalStrength = latestReading.rssi ?? fieldStatus.rssi ?? null;
  const soilRaw = latestReading.soil_ao ?? null;
  const waterRaw = latestReading.water_ao ?? null;
  const fieldLifecycle = fieldStatus.lifecycle_state || (deviceId ? 'LIVE' : 'CONFIGURED');
  const pairingStatus = fieldStatus.pairing_status || (deviceId ? 'CONFIRMED' : 'UNPAIRED');
  const lastValveAction = fieldStatus.last_valve_action || fieldStatus.valve_state?.last_action_time;
  const rawProfileErrors = Array.isArray(profile?.errors)
    ? profile.errors.filter(Boolean)
    : Object.values(profile?.errors || {}).filter(Boolean);
  const profileErrors = rawProfileErrors.filter((entry: any) => {
    const message = String(entry || '').toLowerCase();
    const expectedTelemetryGap = message.includes('no telemetry available')
      && (message.includes('f1.decision') || message.includes('auto decision'));
    return !expectedTelemetryGap;
  });
  const partialFailure = Boolean(profileErrors.length > 0 || (profile?.partial_failure && rawProfileErrors.length === 0));

  const formatPct = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(0)}%` : '—';
  const formatDateTime = (value: any) => {
    if (!value) return 'Not received yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not received yet';
    return date.toLocaleString();
  };
  const formatSignal = (value: any) => Number.isFinite(Number(value)) ? `${Number(value)} dBm` : '—';
  const formatBattery = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} V` : '—';
  const sensorStatusKind = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (['CRITICAL', 'EXCESS', 'SATURATED'].includes(normalized)) return 'crit';
    if (['LOW', 'HIGH', 'DRY', 'WET', 'WARNING'].includes(normalized)) return 'warn';
    if (['OPTIMAL', 'OK', 'GOOD'].includes(normalized)) return 'live';
    return hasTelemetry ? 'info' : 'off';
  };
  const sensorChannels = [
    {
      name: 'Soil moisture sensor',
      type: 'Root-zone probe',
      icon: 'humidity',
      value: soilMoisture !== null ? formatPct(soilMoisture) : 'Waiting',
      raw: soilRaw !== null ? `ADC ${soilRaw}` : 'Raw ADC not received',
      status: fieldStatus.soil_status || (hasTelemetry ? 'OK' : 'No data'),
      kind: sensorStatusKind(fieldStatus.soil_status),
    },
    {
      name: 'Water level sensor',
      type: 'Field water probe',
      icon: 'droplet',
      value: waterLevel !== null ? formatPct(waterLevel) : 'Waiting',
      raw: waterRaw !== null ? `ADC ${waterRaw}` : 'Raw ADC not received',
      status: fieldStatus.water_status || (hasTelemetry ? 'OK' : 'No data'),
      kind: sensorStatusKind(fieldStatus.water_status),
    },
    {
      name: 'Gateway signal',
      type: deviceId || 'No device paired',
      icon: 'wifi',
      value: formatSignal(signalStrength),
      raw: sensorConnected ? 'Online' : 'Offline or waiting',
      status: sensorConnected ? 'CONNECTED' : pairingStatus,
      kind: sensorConnected ? 'live' : 'off',
    },
    {
      name: 'Battery',
      type: 'Sensor kit power',
      icon: 'flash',
      value: formatBattery(batteryVoltage),
      raw: batteryVoltage !== null ? 'Reported by gateway' : 'Not reported',
      status: batteryVoltage !== null ? 'OK' : 'UNKNOWN',
      kind: batteryVoltage !== null ? 'live' : 'off',
    },
  ];
  const growthStage = fieldStatus.growth_stage || fieldStatus.crop_stage || profile?.selected_crop?.stage || 'Tillering stage';
  const latitude = Number(fieldStatus.latitude ?? profile?.latitude);
  const longitude = Number(fieldStatus.longitude ?? profile?.longitude);
  const hasCoordinates = hasValidCoordinates(latitude, longitude);
  const coordinateLabel = hasCoordinates
    ? `Coord ${Math.abs(latitude).toFixed(3)}°${latitude >= 0 ? ' N' : ' S'}, ${Math.abs(longitude).toFixed(3)}°${longitude >= 0 ? ' E' : ' W'}`
    : 'Coordinates pending';
  const overviewMapCenter = hasCoordinates
    ? { lat: latitude, lon: longitude }
    : { lat: 7.8731, lon: 80.7718 };
  const overviewZonesGeoJson =
    f2.zones_geojson ||
    f2.zone_geojson ||
    stressSummary.zones_geojson ||
    stressSummary.zone_geojson ||
    stressSummary.geojson ||
    (stressSummary.type === 'FeatureCollection' ? stressSummary : null);
  const deviceLatitude = pickFirstNumber(
    fieldStatus.device_latitude,
    fieldStatus.sensor_latitude,
    latestReading.latitude,
    latestReading.lat
  );
  const deviceLongitude = pickFirstNumber(
    fieldStatus.device_longitude,
    fieldStatus.sensor_longitude,
    latestReading.longitude,
    latestReading.lon,
    latestReading.lng
  );
  const overviewDeviceMarkers = deviceId && hasValidCoordinates(deviceLatitude, deviceLongitude)
    ? [{ id: deviceId, lat: deviceLatitude, lon: deviceLongitude, online: sensorConnected }]
    : [];
  const areaLabel = `${formatAreaValue(area)} ha`;
  const autoModeEnabled = fieldStatus.auto_control_enabled ?? (String(autoDecision.decision || '').toUpperCase() !== 'MANUAL');
  const valveCode = fieldStatus.valve_code || fieldStatus.valve_id || fieldStatus.valve_name || deviceId || '';
  const valveLabel = valveCode ? `Valve ${valveCode}` : 'Field valve';
  const flowRate = pickFirstNumber(
    fieldStatus.flow_rate_lps,
    fieldStatus.discharge_lps,
    latestReading.flow_rate_lps,
    latestReading.discharge_lps
  );
  const etaMinutes = pickFirstNumber(
    autoDecision.eta_minutes,
    autoDecision.remaining_minutes,
    fieldStatus.remaining_minutes
  );
  const valveDetailLine = [
    flowRate !== null ? `${flowRate.toFixed(1)} L/s` : null,
    lastValveAction ? `started ${formatClockTime(lastValveAction)}` : null,
    etaMinutes !== null ? `ETA ${Math.round(etaMinutes)} min` : null,
  ].filter(Boolean).join(' · ');
  const previousReading = sensorHistory[1] || {};
  const soilDeltaRaw = calculateDelta(soilMoisture, previousReading.soil_moisture_pct ?? previousReading.soil_moisture);
  const waterDeltaRaw = calculateDelta(waterLevel, previousReading.water_level_pct ?? previousReading.water_level);
  const soilDelta = soilDeltaRaw !== null ? Math.round(soilDeltaRaw) : null;
  const waterDelta = waterDeltaRaw !== null ? Math.round(waterDeltaRaw) : null;
  const weatherTemperatureDelta = pickFirstNumber(
    weatherSummary.temperature_delta_celsius,
    weatherSummary.delta_temperature_celsius,
    forecastRec.temperature_delta_celsius,
    forecastRec.delta_temperature_celsius
  );
  const weatherHumidityDelta = pickFirstNumber(
    weatherSummary.humidity_delta_percent,
    weatherSummary.delta_humidity_percent,
    forecastRec.humidity_delta_percent,
    forecastRec.delta_humidity_percent
  );
  const soilSeries = buildHistorySeries(sensorHistory, ['soil_moisture_pct', 'soil_moisture']);
  const waterSeries = buildHistorySeries(sensorHistory, ['water_level_pct', 'water_level']);
  const overviewMetricCards = [
    {
      label: 'Soil moisture',
      value: soilMoisture !== null ? formatPct(soilMoisture) : '—',
      icon: 'humidity',
      delta: soilDelta,
      precision: 0,
      positiveGood: true,
      series: soilSeries,
      emptyLabel: hasTelemetry ? 'Need more readings' : 'Waiting for telemetry',
      color: 'var(--primary)',
    },
    {
      label: 'Temperature',
      value: temp !== null ? `${Number(temp).toFixed(1)}°C` : '—',
      icon: 'thermo',
      delta: weatherTemperatureDelta,
      precision: 1,
      positiveGood: true,
      series: [],
      emptyLabel: temp !== null ? 'No trend yet' : 'Weather unavailable',
      color: 'var(--primary)',
    },
    {
      label: 'Humidity',
      value: humidity !== null ? `${Number(humidity).toFixed(0)}%` : '—',
      icon: 'cloud',
      delta: weatherHumidityDelta,
      precision: 0,
      positiveGood: false,
      series: [],
      emptyLabel: humidity !== null ? 'No trend yet' : 'Weather unavailable',
      color: 'var(--primary)',
    },
    {
      label: 'Water level',
      value: waterLevel !== null ? formatPct(waterLevel) : '—',
      icon: 'droplet',
      delta: waterDelta,
      precision: 0,
      positiveGood: false,
      series: waterSeries,
      emptyLabel: hasTelemetry ? 'Need more readings' : 'Waiting for telemetry',
      color: 'var(--primary)',
    },
  ];
  const hasOverviewZones = Boolean(overviewZonesGeoJson?.features?.length);
  const irrigationTimeline = (() => {
    const explicitLog = fieldStatus.irrigation_log || fieldStatus.recent_irrigations || f1.irrigation_log || f1.recent_irrigations;
    if (Array.isArray(explicitLog) && explicitLog.length > 0) {
      return explicitLog.slice(0, 6).map((entry: any, index: number) => ({
        label: formatTimelineLabel(entry.started_at || entry.observed_at || entry.timestamp),
        amount: `${Math.round(Number(entry.applied_mm ?? entry.irrigation_mm ?? entry.amount_mm ?? 18))} mm`,
        source: entry.mode || entry.reason || (index === 0 && soilMoisture !== null && soilMoisture < 50 ? 'Auto · Low moisture' : autoModeEnabled ? 'Auto' : 'Manual'),
      }));
    }
    if (sensorHistory.length > 0) {
      return sensorHistory.slice(0, 6).map((entry: any, index: number) => ({
        label: formatTimelineLabel(entry.timestamp),
        amount: `${Math.max(12, Math.round(Number(entry.applied_mm ?? entry.irrigation_mm ?? entry.water_level_pct ?? 18)))} mm`,
        source: index === 0 && soilMoisture !== null && soilMoisture < 50
          ? 'Auto · Low moisture'
          : autoModeEnabled
            ? 'Auto'
            : 'Manual · Officer',
      }));
    }
    return [];
  })();

  const handleExportLog = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      exported_at: new Date().toISOString(),
      field_id: fieldId,
      field_name: fieldName,
      crop_type: cropType,
      profile,
      sensor_history: sensorHistory,
      irrigation_log: irrigationTimeline,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(fieldName).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'field'}-log.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Frame
      sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))}
      breadcrumb={['Farmer', 'My Fields', fieldName]}
      user={displayName}
      role="Farmer"
    >
      <ApiState loading={loading && !profile} error={error} onRetry={loadProfile}>
        <div className="field-workspace">
          <div className="field-workspace-head">
            <div>
              <div className="field-workspace-title-row">
                <div className="page-title">{fieldName}</div>
                <div className={`field-workspace-valve-pill ${isValveOpen ? 'live' : 'off'}`}>
                  <span className="field-workspace-valve-dot" />
                  {isValveOpen ? 'Valve open' : 'Valve closed'} · {formatElapsed(lastValveAction)}
                </div>
              </div>
              <div className="field-workspace-subtitle">
                {cropType} · {areaLabel} · {growthStage} · {coordinateLabel}
              </div>
            </div>
            <div className="field-workspace-actions">
              <button className="btn btn-ghost" onClick={handleExportLog}>
                <Icon name="download" size={14}/> Export log
              </button>
              <button className="btn btn-primary" onClick={() => setTab(TAB_IRRIGATION)}>
                <Icon name="droplet" size={14}/> Request irrigation
              </button>
            </div>
          </div>

          <div className="field-workspace-tabs">
            {tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`field-workspace-tab ${tab === i ? 'active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === TAB_OVERVIEW && (
            <div className="field-workspace-overview">
              <div className="field-workspace-overview-main">
                <div className="card field-workspace-map-card">
                  <div className="card-head">
                    <div className="card-title">
                      <Icon name="map" size={14} color="var(--primary-600)" /> Field map
                    </div>
                    <Chip kind={hasCoordinates ? 'live' : 'off'} dot={false}>
                      {hasCoordinates ? 'Coordinates set' : 'Coordinates pending'}
                    </Chip>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <FieldHealthMap
                      center={overviewMapCenter}
                      zonesGeoJson={overviewZonesGeoJson || null}
                      deviceMarkers={overviewDeviceMarkers}
                      observations={[]}
                      mapLayer={overviewMapLayer}
                      onMapLayerChange={setOverviewMapLayer}
                      height={292}
                      showLegend={false}
                      showCenterMarker={hasCoordinates}
                      hint={hasCoordinates ? coordinateLabel : 'Showing Sri Lanka until field coordinates are saved'}
                    />
                  </div>

                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    {hasOverviewZones
                      ? 'Health-zone overlay is shown from crop analysis data.'
                      : 'Base map centered on the field. Health-zone overlay appears when crop analysis data is available.'}
                  </div>
                </div>

                <div className="field-workspace-metric-grid">
                  {overviewMetricCards.map((metric) => {
                    const hasDelta = metric.delta !== null && Number.isFinite(Number(metric.delta));
                    const isPositive = hasDelta ? Number(metric.delta) >= 0 : false;
                    const toneGood = hasDelta && (metric.positiveGood ? isPositive : !isPositive);
                    const hasSeries = Array.isArray(metric.series) && metric.series.length >= 2;
                    return (
                      <div key={metric.label} className="card field-workspace-metric-card">
                        <div className="field-workspace-metric-top">
                          <div className="metric-label">{metric.label}</div>
                          <Icon name={metric.icon} size={13} color="var(--muted)"/>
                        </div>
                        <div className="field-workspace-metric-value">{metric.value}</div>
                        {hasDelta ? (
                          <div className={`field-workspace-metric-delta ${toneGood ? 'good' : 'bad'}`}>
                            <Icon name={isPositive ? 'up' : 'down'} size={12} color="currentColor" />
                            {Math.abs(Number(metric.delta)).toFixed(metric.precision)}
                          </div>
                        ) : (
                          <div className="field-workspace-metric-delta neutral">{metric.emptyLabel}</div>
                        )}
                        <div className="field-workspace-metric-spark">
                          {hasSeries ? (
                            <Sparkline data={metric.series} width={92} height={28} color={metric.color} fill={false} />
                          ) : (
                            <div className="field-workspace-metric-spark-empty">No chart yet</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="field-workspace-insight-grid">
                  <div className="card field-workspace-insight-card">
                    <div className="card-head">
                      <div className="card-title">
                        <Icon name="cloud" size={14} color="var(--primary-600)" /> Forecasting details
                      </div>
                      <Chip
                        kind={forecastStatus === 'ok' ? 'live' : forecastStatus === 'stale' ? 'warn' : 'off'}
                        dot={false}
                      >
                        {forecastStatus}
                      </Chip>
                    </div>

                    <div className="field-workspace-insight-kpis">
                      <div>
                        <div className="tiny muted">7-day rain</div>
                        <div className="field-workspace-insight-value">{formatMm(forecastTotalRain)}</div>
                      </div>
                      <div>
                        <div className="tiny muted">7-day ET</div>
                        <div className="field-workspace-insight-value">{formatMm(forecastTotalEt)}</div>
                      </div>
                      <div>
                        <div className="tiny muted">Net balance</div>
                        <div className="field-workspace-insight-value">{formatMm(forecastNetBalance)}</div>
                      </div>
                    </div>

                    <div className="field-workspace-detail-row">
                      <span>Irrigation outlook</span>
                      <Chip kind={recommendationChipKind(forecastRecommendation)} dot={false}>
                        {forecastRecommendation || 'No plan'}
                      </Chip>
                    </div>
                    <div className="field-workspace-detail-row">
                      <span>Model</span>
                      <strong>{forecastBestModel || 'Forecasting service'}</strong>
                    </div>
                    <div className="field-workspace-detail-row">
                      <span>Source</span>
                      <strong>{forecastSource}</strong>
                    </div>

                    {forecastDaily.length > 0 ? (
                      <div className="field-workspace-forecast-days">
                        {forecastDaily.slice(0, 4).map((day: any, index: number) => (
                          <div key={day.date || index} className="field-workspace-forecast-day">
                            <div className="tiny muted">
                              {day.date
                                ? new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })
                                : `D${index + 1}`}
                            </div>
                            <strong>{formatMm(day.rain_mm ?? day.expected_rain_mm)}</strong>
                            <span>
                              {toFiniteNumber(day.temp_max_c) !== null
                                ? `${Number(day.temp_max_c).toFixed(0)}C`
                                : day.weather_description || 'Forecast'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="field-workspace-empty-note" style={{ marginTop: 10 }}>
                        Forecast details are not available for this field yet.
                      </div>
                    )}

                    {forecastUpdatedAt && (
                      <div className="tiny muted" style={{ marginTop: 10 }}>
                        Updated {formatDateTime(forecastUpdatedAt)}
                      </div>
                    )}
                  </div>

                  <div className="card field-workspace-insight-card">
                    <div className="card-head">
                      <div className="card-title">
                        <Icon name="leaf" size={14} color="var(--primary-600)" /> Recommended crop
                      </div>
                      <Chip kind={hasSelectedCrop ? 'live' : topRecommendedCrop ? 'info' : 'off'} dot={false}>
                        {hasSelectedCrop ? 'Selected' : topRecommendedCrop ? 'Top match' : 'No plan'}
                      </Chip>
                    </div>

                    {topRecommendedCrop ? (
                      <>
                        <div className="field-workspace-crop-hero">
                          <div>
                            <div className="tiny muted">{hasSelectedCrop ? 'Planned for this field' : 'Best available recommendation'}</div>
                            <div className="field-workspace-crop-title">{cropName}</div>
                            {cropSeason && <div className="tiny muted">Season: {cropSeason}</div>}
                          </div>
                          <Chip kind={riskChipKind(cropRisk)} dot={false}>
                            {String(cropRisk || 'unknown').toUpperCase()}
                          </Chip>
                        </div>

                        <div className="field-workspace-crop-metrics">
                          <div>
                            <span>Suitability</span>
                            <strong>{formatPercentValue(cropSuitabilityPct)}</strong>
                          </div>
                          <div>
                            <span>Yield</span>
                            <strong>{formatTons(cropYield)}</strong>
                          </div>
                          <div>
                            <span>Profit/ha</span>
                            <strong>{formatMoney(cropProfitPerHa)}</strong>
                          </div>
                          <div>
                            <span>Price</span>
                            <strong>{formatPrice(cropPrice)}</strong>
                          </div>
                          <div>
                            <span>Water need</span>
                            <strong>{formatMm(cropWaterRequirement, 0)}</strong>
                          </div>
                          <div>
                            <span>ROI</span>
                            <strong>{formatPercentValue(cropRoi)}</strong>
                          </div>
                        </div>

                        {(topRecommendedCrop.rationale || topRecommendedCrop.reason) && (
                          <div className="field-workspace-empty-note" style={{ marginTop: 10 }}>
                            {topRecommendedCrop.rationale || topRecommendedCrop.reason}
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ marginTop: 12 }}
                          onClick={() => setTab(TAB_OPTIMIZATION)}
                        >
                          View crop analysis
                        </button>
                      </>
                    ) : (
                      <div className="field-workspace-empty-note" style={{ marginTop: 10 }}>
                        No selected crop plan yet. Open Optimization to generate and choose a recommended crop.
                        <div style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setTab(TAB_OPTIMIZATION)}
                          >
                            Open optimization
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card field-workspace-valve-card">
                <div className="card-head">
                  <div className="card-title">Valve & last irrigation</div>
                  <Chip kind={autoModeEnabled ? 'live' : 'off'} dot={false}>
                    {autoModeEnabled ? 'Auto · on' : 'Manual'}
                  </Chip>
                </div>
                <div className="field-workspace-valve-hero">
                  <div className="field-workspace-valve-icon">
                    <Icon name="sun" size={22} color="white" />
                  </div>
                  <div className="field-workspace-valve-copy">
                    <div className="field-workspace-valve-title">{valveLabel} {isValveOpen ? 'open' : 'closed'}</div>
                    <div className="tiny muted">{valveDetailLine || 'No recent valve event'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab(TAB_IRRIGATION)}>Override</button>
                </div>

                <div className="field-workspace-valve-section-title">Last 6 irrigations</div>
                {irrigationTimeline.length === 0 ? (
                  <div className="field-workspace-empty-note">No irrigation events yet. They’ll appear here after the first automated or manual cycle.</div>
                ) : (
                  <div className="field-workspace-irrigation-list">
                    {irrigationTimeline.map((entry, index) => (
                      <div key={`${entry.label}-${index}`} className="field-workspace-irrigation-row">
                        <div>{entry.label}</div>
                        <div className="tabular">{entry.amount}</div>
                        <div>{entry.source}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="divider" style={{ margin: '14px 0 10px' }} />
                <div className="field-workspace-sensor-grid">
                  <div className="field-workspace-sensor-summary">
                    <div className="tiny muted">Sensor kit</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{deviceId || 'No kit paired'}</div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>{sensorConnected ? 'Connected' : telemetryMessage}</div>
                  </div>
                  <div className="field-workspace-sensor-summary">
                    <div className="tiny muted">Last reading</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{formatDateTime(telemetryObservedAt)}</div>
                    <div className="tiny muted" style={{ marginTop: 3, textTransform: 'capitalize' }}>{telemetryQuality}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {tab === TAB_OPTIMIZATION && (
            <OptimizationWizard
              fieldId={fieldId}
              fieldStatus={fieldStatus}
              area={Number(area) || 0}
            />
          )}

          {/* Irrigation Tab */}
          {tab === TAB_IRRIGATION && (
            <IrrigationPanel
              fieldId={fieldId}
              fieldStatus={fieldStatus}
              onRefresh={loadProfile}
            />
          )}

          {/* Crop Health Tab */}
          {tab === TAB_CROP_HEALTH && (
            <CropHealthPanel
              fieldId={fieldId}
              fieldStatus={fieldStatus}
              onRefresh={loadProfile}
            />
          )}

          {/* Forecast Tab */}
          {tab === TAB_FORECAST && (
            <ForecastPanel
              fieldId={fieldId}
              fieldStatus={fieldStatus}
              onRefresh={loadProfile}
            />
          )}

          {partialFailure && (
            <div className="field-workspace-alert">
              <div className="field-workspace-alert-title">Partial data</div>
              <div className="tiny muted">
                {profileErrors.length > 0
                  ? `Some services had errors: ${profileErrors.slice(0, 3).join(' | ')}`
                  : 'Some connected services did not return a complete response.'}
              </div>
            </div>
          )}
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldWorkspace />
    </div>
  );
}

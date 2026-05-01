/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import {
  DailyForecastTable,
  FORECAST_HORIZON_DAYS,
  ForecastingFrame,
  IrrigationRecommendationCard,
  MetricCard,
  ModelReadinessCard,
  RainEvapChart,
  ReservoirGauge,
  forecastDays,
  formatMm,
  formatNumber,
  formatPercent,
  gridAuto,
  optionalNum,
  statusKind,
  totalEvap,
  totalRain,
} from '../_components/forecasting-shared';

const Reservoir = () => {
  const [currentData, setCurrentData] = React.useState<any>(null);
  const [forecast, setForecast] = React.useState<any>(null);
  const [recommendation, setRecommendation] = React.useState<any>(null);
  const [modelSummary, setModelSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>('/forecast/current-data'),
        apiGet<any>(`/forecast/weather/forecast?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>('/forecast/weather/irrigation-recommendation'),
        apiGet<any>('/forecast/model-summary'),
      ]);
      const [currentRes, forecastRes, recommendationRes, modelRes] = results;
      if (currentRes.status === 'fulfilled') setCurrentData(currentRes.value);
      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
      if (recommendationRes.status === 'fulfilled') setRecommendation(recommendationRes.value);
      if (modelRes.status === 'fulfilled') setModelSummary(modelRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load reservoir forecasting data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservoir data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const days = forecastDays(forecast);
  const sevenDay = days.slice(0, 7);
  const rainTotal = forecast?.summary?.total_precipitation_7d_mm ?? totalRain(sevenDay);
  const evapTotal = totalEvap(sevenDay);
  const current = currentData?.current_data || {};
  const waterLevel = optionalNum(current.water_level_percent);
  const gates = optionalNum(current.gate_opening_percent);
  const recentRain = optionalNum(current.rainfall_mm);
  const weekly = recommendation?.weekly_outlook || {};
  const balance = optionalNum(weekly.net_water_balance_mm) ?? (rainTotal - evapTotal);

  return (
    <ForecastingFrame
      active="Reservoir"
      title="Reservoir forecasting"
      subtitle="Reservoir observations, rainfall pressure, and weather-driven release planning"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !currentData && !forecast} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.75fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
          <ReservoirGauge currentData={currentData} recommendation={recommendation}/>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={gridAuto(210)}>
              <MetricCard
                title="Current level"
                value={waterLevel === null ? '-' : formatPercent(waterLevel)}
                sub="Latest water-level observation held by F3"
                icon="wave"
                chip={currentData?.status || 'observation'}
                kind={statusKind(currentData?.status)}
                color="var(--secondary)"
              />
              <MetricCard
                title="Gate opening"
                value={gates === null ? '-' : formatPercent(gates)}
                sub="Latest gate telemetry from forecasting observations"
                icon="valve"
                chip={currentData?.quality || 'quality'}
                kind={statusKind(currentData?.quality)}
                color="var(--primary)"
              />
              <MetricCard
                title="Latest rainfall"
                value={recentRain === null ? '-' : formatMm(recentRain)}
                sub="Most recent reservoir-side rainfall reading"
                icon="cloud"
                chip={recentRain !== null && recentRain >= 10 ? 'wet' : 'normal'}
                kind={recentRain !== null && recentRain >= 10 ? 'warn' : 'live'}
                color="var(--accent)"
              />
            </div>
            <IrrigationRecommendationCard recommendation={recommendation}/>
          </div>
        </div>

        <div style={{ ...gridAuto(280), marginBottom: 14 }}>
          <MetricCard
            title="7-day expected rain"
            value={formatMm(rainTotal)}
            sub={`${formatNumber(forecast?.summary?.rainy_days_count, 0)} rainy forecast days`}
            icon="cloud"
            chip={forecast?.source || 'weather'}
            kind={statusKind(forecast?.status)}
            color="var(--secondary)"
          />
          <MetricCard
            title="7-day ET0"
            value={formatMm(evapTotal)}
            sub="Forecast evapotranspiration pressure"
            icon="sun"
            chip="demand"
            kind={evapTotal > rainTotal ? 'warn' : 'live'}
            color="var(--accent)"
          />
          <MetricCard
            title="Net water balance"
            value={formatMm(balance)}
            sub={balance >= 0 ? 'Rainfall offsets irrigation demand' : 'Irrigation demand exceeds forecast rainfall'}
            icon="droplet"
            chip={balance >= 0 ? 'surplus' : 'deficit'}
            kind={balance >= 0 ? 'live' : 'warn'}
            color={balance >= 0 ? 'var(--primary)' : 'var(--danger)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.65fr)', gap: 14 }}>
          <RainEvapChart days={days} title="Reservoir rainfall pressure"/>
          <ModelReadinessCard modelSummary={modelSummary}/>
        </div>

        <div style={{ marginTop: 14 }}>
          <DailyForecastTable days={days} limit={10}/>
        </div>
      </ApiState>
    </ForecastingFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Reservoir />
    </div>
  );
}

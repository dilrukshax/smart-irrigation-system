/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { LineChart } from '@/components/asi/ui';
import { apiGet } from '@/lib/api';
import {
  DailyForecastTable,
  FORECAST_HORIZON_DAYS,
  ForecastingFrame,
  HistoricalRainPanel,
  MetricCard,
  WeatherNowCard,
  buildSeries,
  chartLabels,
  dailyRain,
  forecastDays,
  formatMm,
  formatNumber,
  gridAuto,
  historicalDays,
  statusKind,
  totalRain,
} from '../_components/forecasting-shared';

const Rainfall = () => {
  const [summary, setSummary] = React.useState<any>(null);
  const [forecast, setForecast] = React.useState<any>(null);
  const [historical, setHistorical] = React.useState<any>(null);
  const [alerts, setAlerts] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>('/forecast/weather/summary'),
        apiGet<any>(`/forecast/weather/forecast?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>('/forecast/weather/historical?days=30'),
        apiGet<any>(`/forecast/weather/alerts?days=${FORECAST_HORIZON_DAYS}`),
      ]);
      const [summaryRes, forecastRes, historicalRes, alertsRes] = results;
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
      if (historicalRes.status === 'fulfilled') setHistorical(historicalRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load rainfall data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rainfall data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const days = forecastDays(forecast);
  const history = historicalDays(historical);
  const rainSeries = buildSeries(days, dailyRain);
  const historySeries = buildSeries(history.slice(-14), dailyRain);
  const forecastTotal = forecast?.summary?.total_precipitation_7d_mm ?? totalRain(days.slice(0, 7));
  const historyStats = historical?.statistics || {};
  const alertSummary = alerts?.summary || {};
  const rainWatchDays = Number(alertSummary.rain_watch_days || 0);
  const dryDays = Number(alertSummary.dry_days || 0);

  return (
    <ForecastingFrame
      active="Rainfall"
      title="Rainfall forecasting"
      subtitle="Forecast rainfall, recent weather history, and irrigation-impact rainfall patterns"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !forecast && !historical} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="7-day forecast rain"
            value={formatMm(forecastTotal)}
            sub={`${formatNumber(forecast?.summary?.rainy_days_count, 0)} rainy days in the first week`}
            icon="cloud"
            chip={forecast?.source || 'forecast'}
            kind={statusKind(forecast?.status)}
            color="var(--secondary)"
          />
          <MetricCard
            title="Rain watch days"
            value={formatNumber(rainWatchDays, 0)}
            sub={`Backend rain-watch count across ${days.length || FORECAST_HORIZON_DAYS} days`}
            icon="bell"
            chip={rainWatchDays ? 'watch' : 'clear'}
            kind={rainWatchDays ? 'warn' : 'live'}
            color={rainWatchDays ? 'var(--accent)' : 'var(--primary)'}
          />
          <MetricCard
            title="Dry forecast days"
            value={formatNumber(dryDays, 0)}
            sub="Backend dry-day count for the forecast horizon"
            icon="sun"
            chip={dryDays >= 3 ? 'dry spell' : 'normal'}
            kind={dryDays >= 3 ? 'warn' : 'live'}
            color={dryDays >= 3 ? 'var(--danger)' : 'var(--primary)'}
          />
          <MetricCard
            title="30-day observed rain"
            value={formatMm(historyStats.total_rainfall_mm)}
            sub={`${formatNumber(historyStats.rainy_days, 0)} observed rainy days`}
            icon="chart"
            chip={historical?.source || 'history'}
            kind={statusKind(historical?.status)}
            color="var(--primary)"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.55fr)', gap: 14, marginBottom: 14 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{FORECAST_HORIZON_DAYS}-day rainfall curve</div>
                <div className="tiny muted">{days.length || 0} daily forecast points</div>
              </div>
              <span className="chip live"><span className="chip-dot"/>Open-Meteo</span>
            </div>
            {rainSeries.length > 1 ? (
              <LineChart
                width={1100}
                height={250}
                legend
                series={[
                  { name: 'Rainfall mm', color: 'var(--secondary)', data: rainSeries },
                ]}
                xLabels={chartLabels(days)}
              />
            ) : (
              <div className="tiny muted">Forecast rainfall points are not available yet.</div>
            )}
          </div>
          <WeatherNowCard summary={summary}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.95fr) minmax(320px, 1fr)', gap: 14, marginBottom: 14 }}>
          <HistoricalRainPanel historical={historical}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Recent vs forecast rainfall</div>
                <div className="tiny muted">Last 14 historical days beside next forecast days</div>
              </div>
              <span className="chip sim"><span className="chip-dot"/>Comparison</span>
            </div>
            {historySeries.length > 1 && rainSeries.length > 1 ? (
              <LineChart
                width={760}
                height={230}
                legend
                series={[
                  { name: 'Recent rain mm', color: 'var(--primary)', data: historySeries },
                  { name: 'Forecast rain mm', color: 'var(--secondary)', data: rainSeries.slice(0, historySeries.length) },
                ]}
                xLabels={chartLabels(days.slice(0, historySeries.length))}
              />
            ) : (
              <div className="tiny muted">Rainfall comparison will appear when historical and forecast points are both available.</div>
            )}
          </div>
        </div>

        <DailyForecastTable days={days} mode="rain" limit={FORECAST_HORIZON_DAYS}/>
      </ApiState>
    </ForecastingFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Rainfall />
    </div>
  );
}

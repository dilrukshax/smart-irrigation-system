/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import {
  AlertsList,
  FORECAST_HORIZON_DAYS,
  ForecastingFrame,
  IrrigationRecommendationCard,
  MetricCard,
  RainEvapChart,
  WeatherNowCard,
  asArray,
  forecastDays,
  formatMm,
  formatNumber,
  formatPercent,
  gridAuto,
  optionalNum,
  recommendationPercent,
  statusKind,
  topAlerts,
  totalEvap,
  totalRain,
} from './_components/forecasting-shared';

const Overview = () => {
  const [summary, setSummary] = React.useState<any>(null);
  const [forecast, setForecast] = React.useState<any>(null);
  const [recommendation, setRecommendation] = React.useState<any>(null);
  const [alerts, setAlerts] = React.useState<any>(null);
  const [modelSummary, setModelSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>('/forecast/weather/summary'),
        apiGet<any>(`/forecast/weather/forecast?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>('/forecast/weather/irrigation-recommendation'),
        apiGet<any>(`/forecast/weather/alerts?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>('/forecast/model-summary'),
      ]);
      const [summaryRes, forecastRes, recommendationRes, alertsRes, modelRes] = results;
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
      if (recommendationRes.status === 'fulfilled') setRecommendation(recommendationRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (modelRes.status === 'fulfilled') setModelSummary(modelRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load forecasting data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load forecasting data');
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
  const waterBalance = rainTotal - evapTotal;
  const alertSummary = alerts?.summary || {};
  const pct = recommendationPercent(recommendation);
  const advanced = modelSummary?.advanced_models || {};

  return (
    <ForecastingFrame
      active="Overview"
      title="Forecasting overview"
      subtitle="Operator view for live weather, rainfall balance, model readiness, and F3 risk alerts"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !summary && !forecast} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="7-day rainfall"
            value={formatMm(rainTotal)}
            sub={`${formatNumber(forecast?.summary?.rainy_days_count, 0)} rainy days expected`}
            icon="cloud"
            chip={forecast?.source || forecast?.status || 'forecast'}
            kind={statusKind(forecast?.status)}
            color="var(--secondary)"
          />
          <MetricCard
            title="Water balance"
            value={formatMm(waterBalance)}
            sub={`Rain minus ET0 across the first ${sevenDay.length || 7} forecast days`}
            icon="wave"
            chip={waterBalance >= 0 ? 'surplus' : 'deficit'}
            kind={waterBalance >= 0 ? 'live' : 'warn'}
            color={waterBalance >= 0 ? 'var(--primary)' : 'var(--accent)'}
          />
          <MetricCard
            title="Irrigation schedule"
            value={pct === null ? '-' : formatPercent(pct)}
            sub={recommendation?.overall_recommendation || 'Recommendation pending'}
            icon="droplet"
            chip={recommendation?.status || 'weather'}
            kind={statusKind(recommendation?.status)}
            color="var(--primary)"
          />
          <MetricCard
            title="Alert severity"
            value={alertSummary.highest_severity || 'LOW'}
            sub={`${formatNumber(alertSummary.total_alerts, 0)} weather alerts in the horizon`}
            icon="bell"
            chip={alerts?.status || 'alerts'}
            kind={statusKind(alertSummary.highest_severity)}
            color={alertSummary.highest_severity === 'LOW' ? 'var(--primary)' : 'var(--danger)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.55fr)', gap: 14, marginBottom: 14 }}>
          <RainEvapChart days={days} title={`${FORECAST_HORIZON_DAYS}-day rainfall and evapotranspiration`}/>
          <WeatherNowCard summary={summary}/>
        </div>

        <div style={{ ...gridAuto(320), marginBottom: 14 }}>
          <IrrigationRecommendationCard recommendation={recommendation}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Forecast source</div>
                <div className="tiny muted">F3 model and weather provider status</div>
              </div>
              <span className="chip sim"><span className="chip-dot"/>{modelSummary?.source || 'F3'}</span>
            </div>
            <div style={gridAuto(150)}>
              <div>
                <div className="tiny muted">Basic model</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{modelSummary?.basic_model?.name || 'Baseline'}</div>
              </div>
              <div>
                <div className="tiny muted">Advanced ML</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{advanced.available ? (advanced.trained ? 'Trained' : 'Available') : 'Unavailable'}</div>
              </div>
              <div>
                <div className="tiny muted">Weather scope</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{modelSummary?.scope?.weather || 'coordinates'}</div>
              </div>
            </div>
            <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {modelSummary?.scope?.message || 'Weather forecasts are fetched from the forecasting service and passed through the gateway.'}
            </div>
          </div>
        </div>

        <div style={gridAuto(360)}>
          <AlertsList alerts={topAlerts(alerts, 5)} compact/>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Three-day preview</div>
              <span className="chip sim"><span className="chip-dot"/>Short term</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {asArray(summary?.forecast_preview).map((day: any) => (
                <div key={day.date} className="between" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 650 }}>{day.date}</div>
                    <div className="tiny muted">{day.weather_description || 'Forecast'}</div>
                  </div>
                  <div className="tabular" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMm(day.rain_mm)}</div>
                </div>
              ))}
              {!asArray(summary?.forecast_preview).length && <div className="tiny muted">Short-term preview unavailable.</div>}
            </div>
          </div>
        </div>
      </ApiState>
    </ForecastingFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Overview />
    </div>
  );
}

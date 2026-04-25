/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
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
  ForecastChart,
  Donut,
  SchemeMap,
  Frame,
} from '@/components/asi/ui';
import { farmerNav, officerNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const Forecasting = () => {
  const { user } = useAuth();
  const [weather, setWeather] = React.useState<any>(null);
  const [predictions, setPredictions] = React.useState<any>(null);
  const [risk, setRisk] = React.useState<any>(null);
  const [recommendation, setRecommendation] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [weatherRes, predRes, riskRes, recRes] = await Promise.allSettled([
        apiGet<any>('/forecast/weather'),
        apiGet<any>('/forecast/predictions'),
        apiGet<any>('/forecast/risk'),
        apiGet<any>('/forecast/weather/irrigation-recommendation'),
      ]);
      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value);
      if (predRes.status === 'fulfilled') setPredictions(predRes.value);
      if (riskRes.status === 'fulfilled') setRisk(riskRes.value);
      if (recRes.status === 'fulfilled') setRecommendation(recRes.value);

      if ([weatherRes, predRes, riskRes, recRes].every(r => r.status === 'rejected')) {
        setError('Unable to load forecasting data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract values
  const waterLevelPct = weather?.reservoir_level_percent ?? weather?.water_level_percent ?? 0;
  const riskLevel = risk?.risk_level || risk?.overall_risk || 'UNKNOWN';
  const recText = recommendation?.recommendation || recommendation?.narrative || 'No recommendation available';
  const adjustmentPct = recommendation?.adjustment_percent ?? 0;

  // Extract forecast series
  const forecastDays = predictions?.forecasts || predictions?.predictions || [];
  const waterLevelSeries = forecastDays.map((d: any) => d.water_level_p50 ?? d.water_level ?? 0);
  const rainfallSeries = forecastDays.map((d: any) => d.rainfall_p50 ?? d.rainfall ?? 0);

  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={[
        { label: 'F3 · Forecasting', items: [
          { name: 'Overview', icon: 'home', active: true },
          { name: 'Reservoir', icon: 'wave' },
          { name: 'Rainfall', icon: 'cloud' },
          { name: 'Alerts', icon: 'bell' },
        ]},
        { label: 'Modules', items: [
          { name: 'Irrigation', icon: 'droplet' },
          { name: 'Crop Health', icon: 'shield_check' },
          { name: 'Optimization', icon: 'target' },
        ]},
      ]}
      breadcrumb={['Modules', 'F3 · Forecasting']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Forecasting · reservoir + rainfall</div>
          <div className="page-sub">
            {predictions?.model_name || 'LinearRegression baseline'}
            {predictions?.horizon_days ? ` · ${predictions.horizon_days}-day horizon` : ' · 14-day horizon'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>
      </div>

      <ApiState loading={loading && !weather} error={error} onRetry={loadData}>
        {/* Hero row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 14, marginBottom: 14 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-head" style={{ width: '100%' }}>
              <div className="card-title">Reservoir · Current</div>
              <Chip kind={weather?.is_live ? 'live' : 'sim'}>{weather?.is_live ? 'Live' : 'Cached'}</Chip>
            </div>
            <Gauge
              value={Math.round(waterLevelPct)}
              size={180}
              stroke={20}
              color="var(--secondary)"
              label={`${Math.round(waterLevelPct)}%`}
              sub={`${weather?.temperature_celsius?.toFixed(1) ?? '—'}°C`}
            />
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">14-day risk level</div>
              <Chip kind={riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? 'crit' : riskLevel === 'MEDIUM' ? 'warn' : 'live'}>
                {riskLevel}
              </Chip>
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: riskLevel === 'HIGH' ? 'var(--danger)' : riskLevel === 'MEDIUM' ? 'var(--accent)' : 'var(--primary)' }}>
              {riskLevel}
            </div>
            <div className="tiny muted">
              {risk?.narrative || risk?.summary || 'Risk assessment pending'}
            </div>
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg, #F1F8E9, #E1F5FE)', border: '1px solid var(--primary)' }}>
            <div className="card-head">
              <div className="card-title" style={{ color: 'var(--primary-600)' }}>Irrigation recommendation</div>
              <Chip kind="live">ACA-O</Chip>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
              {adjustmentPct !== 0 && (
                <>
                  {adjustmentPct > 0 ? 'Increase' : 'Reduce'} irrigation by <span style={{ color: 'var(--primary)', fontSize: 22 }}>{Math.abs(adjustmentPct)}%</span>
                </>
              )}
              {adjustmentPct === 0 && 'Continue normal irrigation schedule'}
            </div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              {recText}
            </div>
          </div>
        </div>

        {/* Forecast chart */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <div>
              <div className="card-title">14-day forecast</div>
              <div className="tiny muted">
                {waterLevelSeries.length > 0 ? `${waterLevelSeries.length} forecasted points` : 'Generated from model'}
              </div>
            </div>
            <Chip kind={predictions?.is_live ? 'live' : 'sim'}>
              Source: {predictions?.source || 'model'}
            </Chip>
          </div>
          {waterLevelSeries.length > 0 ? (
            <LineChart
              width={1100}
              height={240}
              legend
              series={[
                { name: 'Water level %', color: 'var(--primary)', data: waterLevelSeries },
                { name: 'Rainfall mm', color: 'var(--secondary)', data: rainfallSeries },
              ]}
              xLabels={waterLevelSeries.map((_: any, i: number) => i % 2 === 0 ? `d${i+1}` : '')}
            />
          ) : (
            <ForecastChart width={1100} height={240} days={14}/>
          )}
        </div>

        {/* Risk timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Current weather</div>
              {weather?.is_live && <Chip kind="live">Live</Chip>}
            </div>
            {weather ? (
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>Temperature: <b>{weather.temperature_celsius?.toFixed(1) ?? '—'}°C</b></div>
                <div>Humidity: <b>{weather.humidity_percent?.toFixed(0) ?? '—'}%</b></div>
                <div>Condition: <b>{weather.condition || weather.description || '—'}</b></div>
                {weather.rainfall_mm !== undefined && <div>Rainfall: <b>{weather.rainfall_mm} mm</b></div>}
                {weather.wind_speed_ms !== undefined && <div>Wind: <b>{weather.wind_speed_ms} m/s</b></div>}
                {weather.source && <div className="tiny muted" style={{ marginTop: 8 }}>Source: {weather.source}</div>}
              </div>
            ) : (
              <div className="tiny muted">No weather data</div>
            )}
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Risk assessment</div>
            </div>
            {risk ? (
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>Overall risk: <b>{riskLevel}</b></div>
                {risk.drought_risk_14d !== undefined && <div>Drought risk (14d): <b>{(risk.drought_risk_14d * 100).toFixed(0)}%</b></div>}
                {risk.flood_risk_14d !== undefined && <div>Flood risk (14d): <b>{(risk.flood_risk_14d * 100).toFixed(0)}%</b></div>}
                {risk.source && <div className="tiny muted" style={{ marginTop: 8 }}>Source: {risk.source}</div>}
              </div>
            ) : (
              <div className="tiny muted">No risk data</div>
            )}
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Forecasting />
    </div>
  );
}

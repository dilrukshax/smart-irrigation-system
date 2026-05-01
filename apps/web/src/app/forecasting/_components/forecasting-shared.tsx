/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { BarChart, Chip, Frame, Gauge, Icon, LineChart, Progress } from '@/components/asi/ui';
import { officerModuleNav } from '@/components/asi/nav';
import { useAuth } from '@/lib/auth';

export const FORECAST_HORIZON_DAYS = 14;

export const gridAuto = (min = 260) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 14,
});

export const asArray = (value: any) => Array.isArray(value) ? value : [];

export const num = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const optionalNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumber = (value: any, digits = 1) => {
  const parsed = optionalNum(value);
  return parsed === null ? '-' : parsed.toFixed(digits);
};

export const formatMm = (value: any) => optionalNum(value) === null ? '-' : `${formatNumber(value, 1)} mm`;
export const formatTemp = (value: any) => optionalNum(value) === null ? '-' : `${formatNumber(value, 1)} C`;
export const formatPercent = (value: any, digits = 0) => optionalNum(value) === null ? '-' : `${formatNumber(value, digits)}%`;

export const formatDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const statusKind = (status: any, severity?: any) => {
  const key = String(severity || status || '').toUpperCase();
  if (['CRITICAL', 'HIGH', 'SOURCE_UNAVAILABLE', 'DATA_UNAVAILABLE'].includes(key)) return 'crit';
  if (['MEDIUM', 'STALE', 'ANALYSIS_PENDING'].includes(key)) return 'warn';
  if (['LOW', 'OK', 'SUCCESS'].includes(key)) return 'live';
  return 'sim';
};

export const severityColor = (severity: any) => {
  const key = String(severity || '').toUpperCase();
  if (key === 'CRITICAL') return 'var(--danger)';
  if (key === 'HIGH') return '#D84315';
  if (key === 'MEDIUM') return 'var(--accent)';
  return 'var(--primary)';
};

export const forecastDays = (forecast: any) => asArray(forecast?.daily);
export const historicalDays = (historical: any) => asArray(historical?.daily_data);

export const dailyRain = (day: any) => num(day?.rain_mm ?? day?.precipitation_mm);
export const dailyEvap = (day: any) => num(day?.evapotranspiration_mm);
export const dailyTempMax = (day: any) => optionalNum(day?.temp_max_c ?? day?.temperature_max_c);

export const totalRain = (days: any[]) => days.reduce((sum, day) => sum + dailyRain(day), 0);
export const totalEvap = (days: any[]) => days.reduce((sum, day) => sum + dailyEvap(day), 0);

export const chartLabels = (days: any[]) =>
  days.map((day: any, index: number) => (index % 2 === 0 ? formatDate(day?.date) : ''));

export const buildSeries = (days: any[], reader: (day: any) => number) =>
  days.map((day: any) => Number(reader(day).toFixed(1)));

export const recommendationPercent = (recommendation: any) => {
  const weekly = recommendation?.weekly_outlook || {};
  const value = optionalNum(
    recommendation?.adjustment_percent
      ?? recommendation?.irrigation_percent
      ?? weekly.average_irrigation_adjustment_percent
  );
  return value;
};

export const topAlerts = (alertsPayload: any, limit = 4) => asArray(alertsPayload?.alerts).slice(0, limit);

export function ForecastingFrame({ active, children, subtitle, title, onRefresh, actions }: any) {
  const { user } = useAuth();
  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={officerModuleNav('Forecasting', active)}
      breadcrumb={['Modules', 'F3 · Forecasting']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {actions}
          {onRefresh && (
            <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
              <Icon name="download" size={13}/> Refresh
            </button>
          )}
        </div>
      </div>
      {children}
    </Frame>
  );
}

export function MetricCard({ title, value, sub, icon = 'cloud', chip, kind = 'live', color = 'var(--primary)' }: any) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {chip && <Chip kind={kind}>{chip}</Chip>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            color,
            background: 'rgba(46, 125, 50, 0.08)',
            flex: '0 0 auto',
          }}
        >
          <Icon name={icon} size={18}/>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 750, color, lineHeight: 1.05 }}>{value}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function WeatherNowCard({ summary }: any) {
  const current = summary?.current || {};
  const impact = summary?.irrigation_impact || {};
  const temp = optionalNum(current.temperature_c);
  const humidity = optionalNum(current.humidity_percent);
  const rain = optionalNum(current.rain_mm);
  const liveKind = summary?.is_live ? 'live' : statusKind(summary?.status);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Current weather</div>
          <div className="tiny muted">{current.weather_description || 'Weather source pending'}</div>
        </div>
        <Chip kind={liveKind}>{summary?.source || summary?.status || 'source'}</Chip>
      </div>
      <div style={gridAuto(130)}>
        <div>
          <div className="tiny muted">Temperature</div>
          <div className="tabular" style={{ fontSize: 24, fontWeight: 700 }}>{temp === null ? '-' : formatTemp(temp)}</div>
        </div>
        <div>
          <div className="tiny muted">Humidity</div>
          <div className="tabular" style={{ fontSize: 24, fontWeight: 700 }}>{humidity === null ? '-' : formatPercent(humidity)}</div>
        </div>
        <div>
          <div className="tiny muted">Rain now</div>
          <div className="tabular" style={{ fontSize: 24, fontWeight: 700 }}>{rain === null ? '-' : formatMm(rain)}</div>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.55 }}>
        {impact.recommendation || 'Irrigation impact will appear when live weather is available.'}
      </div>
    </div>
  );
}

export function RainEvapChart({ days, title = 'Forecast water balance', height = 240 }: any) {
  const rows = asArray(days);
  if (rows.length < 2) {
    return <EmptyPanel title={title} message="Forecast points are not available yet." icon="chart"/>;
  }
  const rain = buildSeries(rows, dailyRain);
  const evap = buildSeries(rows, dailyEvap);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="tiny muted">{rows.length} forecast days from the weather service</div>
        </div>
        <Chip kind="live">Weather</Chip>
      </div>
      <LineChart
        width={1100}
        height={height}
        legend
        series={[
          { name: 'Rainfall mm', color: 'var(--secondary)', data: rain },
          { name: 'Evapotranspiration mm', color: 'var(--accent)', data: evap },
        ]}
        xLabels={chartLabels(rows)}
      />
    </div>
  );
}

export function DailyForecastTable({ days, mode = 'balance', limit = 14 }: any) {
  const rows = asArray(days).slice(0, limit);
  if (!rows.length) {
    return <EmptyPanel title="Daily forecast" message="Daily forecast data is not available." icon="calendar"/>;
  }
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Daily forecast</div>
        <Chip kind="sim">{rows.length} days</Chip>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((day: any) => {
          const rain = dailyRain(day);
          const evap = dailyEvap(day);
          const balance = rain - evap;
          const probability = optionalNum(day.precipitation_probability);
          return (
            <div
              key={day.date}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px minmax(0, 1fr) 80px 80px 90px',
                gap: 10,
                alignItems: 'center',
                padding: '9px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 650 }}>{formatDate(day.date)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {day.weather_description || 'Forecast'}
                </div>
                <div className="tiny muted">
                  {formatTemp(day.temp_min_c)} to {formatTemp(day.temp_max_c)}
                </div>
              </div>
              <div className="tabular">{formatMm(rain)}</div>
              <div className="tabular">{mode === 'rain' ? (probability === null ? '-' : formatPercent(probability)) : formatMm(evap)}</div>
              <Chip kind={balance >= 0 ? 'live' : balance <= -5 ? 'crit' : 'warn'}>
                {mode === 'rain' ? (rain >= 10 ? 'Wet' : rain > 1 ? 'Light' : 'Dry') : `${balance >= 0 ? '+' : ''}${balance.toFixed(1)} mm`}
              </Chip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AlertsList({ alerts, compact = false }: any) {
  const rows = asArray(alerts);
  if (!rows.length) {
    return <EmptyPanel title="Weather alerts" message="No alerts were generated for the selected horizon." icon="bell"/>;
  }
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Weather alerts</div>
        <Chip kind={statusKind(rows[0]?.severity, rows[0]?.severity)}>{rows.length} active</Chip>
      </div>
      <div style={{ display: 'grid', gap: compact ? 8 : 10 }}>
        {rows.map((alert: any) => (
          <div
            key={alert.id || `${alert.type}-${alert.starts_at}`}
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr auto' : '110px minmax(0, 1fr) 110px',
              gap: 12,
              alignItems: compact ? 'start' : 'center',
              borderBottom: '1px solid var(--border)',
              padding: compact ? '8px 0' : '11px 0',
            }}
          >
            {!compact && (
              <div>
                <Chip kind={statusKind(alert.severity, alert.severity)}>{alert.severity || 'INFO'}</Chip>
                <div className="tiny muted" style={{ marginTop: 5 }}>{formatDate(alert.starts_at || alert.date)}</div>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: severityColor(alert.severity) }}>{alert.title || alert.type}</div>
              <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{alert.message}</div>
              {!compact && alert.recommendation && (
                <div style={{ fontSize: 12, marginTop: 7, lineHeight: 1.45 }}>{alert.recommendation}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {compact && <Chip kind={statusKind(alert.severity, alert.severity)}>{alert.severity || 'INFO'}</Chip>}
              {alert.metric && (
                <div className="tiny muted tabular" style={{ marginTop: compact ? 6 : 0 }}>
                  {alert.metric}: {formatNumber(alert.value, 1)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReservoirGauge({ currentData, recommendation }: any) {
  const current = currentData?.current_data || {};
  const waterLevel = optionalNum(current.water_level_percent);
  const rainfall = optionalNum(current.rainfall_mm);
  const gates = optionalNum(current.gate_opening_percent);
  const weekly = recommendation?.weekly_outlook || {};
  const netBalance = optionalNum(weekly.net_water_balance_mm);
  const gaugeValue = waterLevel === null ? 0 : waterLevel;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-head" style={{ width: '100%' }}>
        <div>
          <div className="card-title">Reservoir observation</div>
          <div className="tiny muted">{currentData?.data_available ? 'Latest F3 water-level observation' : 'Observation unavailable'}</div>
        </div>
        <Chip kind={statusKind(currentData?.status)}>{currentData?.status || 'pending'}</Chip>
      </div>
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <Gauge
          value={gaugeValue}
          size={190}
          stroke={20}
          color={waterLevel === null ? 'var(--muted)' : 'var(--secondary)'}
          label={waterLevel === null ? '-' : formatPercent(waterLevel)}
          sub="water level"
        />
      </div>
      <div style={gridAuto(120)}>
        <div>
          <div className="tiny muted">Latest rainfall</div>
          <div className="tabular" style={{ fontWeight: 700 }}>{rainfall === null ? '-' : formatMm(rainfall)}</div>
        </div>
        <div>
          <div className="tiny muted">Gate opening</div>
          <div className="tabular" style={{ fontWeight: 700 }}>{gates === null ? '-' : formatPercent(gates)}</div>
        </div>
        <div>
          <div className="tiny muted">7-day balance</div>
          <div className="tabular" style={{ fontWeight: 700 }}>{netBalance === null ? '-' : formatMm(netBalance)}</div>
        </div>
      </div>
    </div>
  );
}

export function HistoricalRainPanel({ historical }: any) {
  const rows = historicalDays(historical);
  const stats = historical?.statistics || {};
  const recentRows = rows.slice(-14);
  const rainSeries = buildSeries(recentRows, dailyRain);
  const hasRainBars = rainSeries.length > 1 && rainSeries.some((value: number) => value > 0);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Recent rainfall history</div>
          <div className="tiny muted">{historical?.period?.days || rows.length || 0} days from weather history</div>
        </div>
        <Chip kind={statusKind(historical?.status)}>{historical?.source || historical?.status || 'history'}</Chip>
      </div>
      {hasRainBars ? (
        <BarChart
          width={760}
          height={210}
          data={rainSeries}
          labels={chartLabels(recentRows)}
          color="var(--secondary)"
        />
      ) : (
        <div className="tiny muted">No measurable rainfall bars are available for the recent history window.</div>
      )}
      <div style={{ ...gridAuto(150), marginTop: 10 }}>
        <div>
          <div className="tiny muted">Total rainfall</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatMm(stats.total_rainfall_mm)}</div>
        </div>
        <div>
          <div className="tiny muted">Rainy days</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatNumber(stats.rainy_days, 0)}</div>
        </div>
        <div>
          <div className="tiny muted">Max daily rain</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatMm(stats.max_daily_rainfall_mm)}</div>
        </div>
      </div>
    </div>
  );
}

export function IrrigationRecommendationCard({ recommendation }: any) {
  const weekly = recommendation?.weekly_outlook || {};
  const pct = recommendationPercent(recommendation);
  const net = optionalNum(weekly.net_water_balance_mm);
  const status = recommendation?.overall_recommendation || 'PENDING';

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #F1F8E9, #E1F5FE)', border: '1px solid var(--primary)' }}>
      <div className="card-head">
        <div>
          <div className="card-title" style={{ color: 'var(--primary-600)' }}>Irrigation outlook</div>
          <div className="tiny muted">Weather-driven 7-day operating guidance</div>
        </div>
        <Chip kind={statusKind(recommendation?.status)}>{status}</Chip>
      </div>
      <div style={gridAuto(150)}>
        <div>
          <div className="tiny muted">Average schedule</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 750 }}>{pct === null ? '-' : formatPercent(pct)}</div>
        </div>
        <div>
          <div className="tiny muted">Net balance</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 750 }}>{net === null ? '-' : formatMm(net)}</div>
        </div>
        <div>
          <div className="tiny muted">Rainy days</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 750 }}>{formatNumber(weekly.rainy_days_expected, 0)}</div>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        {asArray(recommendation?.notes)[0] || 'Recommendation will update as forecast data changes.'}
      </div>
    </div>
  );
}

export function ModelReadinessCard({ modelSummary }: any) {
  const basic = modelSummary?.basic_model || {};
  const dataPoints = basic?.data_points || {};
  const ready = Boolean(basic.ready);
  const total = optionalNum(dataPoints.total_observations ?? dataPoints.count ?? basic.data_points);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Forecast model readiness</div>
          <div className="tiny muted">{basic.name || 'F3 baseline model'} {basic.version ? `v${basic.version}` : ''}</div>
        </div>
        <Chip kind={ready ? 'live' : 'warn'}>{ready ? 'Ready' : 'Training'}</Chip>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <Progress value={ready ? 100 : 45} color={ready ? 'var(--primary)' : 'var(--accent)'} label="Model readiness"/>
        <div style={gridAuto(150)}>
          <div>
            <div className="tiny muted">Features</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatNumber(basic.features_used_count, 0)}</div>
          </div>
          <div>
            <div className="tiny muted">Observations</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{total === null ? '-' : formatNumber(total, 0)}</div>
          </div>
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>
          {modelSummary?.scope?.message || 'Weather forecasts use field coordinates. Reservoir model output uses F3 observations.'}
        </div>
      </div>
    </div>
  );
}

export function EmptyPanel({ title, message, icon = 'cloud' }: any) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'var(--muted)' }}><Icon name={icon} size={18}/></div>
        <div>
          <div className="card-title">{title}</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>{message}</div>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import {
  AlertsList,
  DailyForecastTable,
  FORECAST_HORIZON_DAYS,
  ForecastingFrame,
  MetricCard,
  RainEvapChart,
  asArray,
  dailyRain,
  forecastDays,
  formatMm,
  formatNumber,
  gridAuto,
  severityColor,
  statusKind,
} from '../_components/forecasting-shared';

const Alerts = () => {
  const [alerts, setAlerts] = React.useState<any>(null);
  const [forecast, setForecast] = React.useState<any>(null);
  const [recommendation, setRecommendation] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>(`/forecast/weather/alerts?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>(`/forecast/weather/forecast?days=${FORECAST_HORIZON_DAYS}`),
        apiGet<any>('/forecast/weather/irrigation-recommendation'),
      ]);
      const [alertsRes, forecastRes, recommendationRes] = results;
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value);
      if (recommendationRes.status === 'fulfilled') setRecommendation(recommendationRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load forecasting alerts');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const days = forecastDays(forecast);
  const alertRows = asArray(alerts?.alerts);
  const summary = alerts?.summary || {};
  const heavyRain = formatNumber(summary.heavy_rain_days, 0);
  const rainWatch = formatNumber(summary.rain_watch_days, 0);
  const heatDays = formatNumber(summary.heat_stress_days, 0);
  const firstAlert = alertRows[0];
  const upcomingWetDays = days.filter((day: any) => dailyRain(day) >= 10).slice(0, 5);
  const weekly = recommendation?.weekly_outlook || {};

  return (
    <ForecastingFrame
      active="Alerts"
      title="Forecasting alerts"
      subtitle="Backend-generated risk alerts from live weather, rainfall forecast, heat, and water-balance rules"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !alerts && !forecast} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="Highest severity"
            value={summary.highest_severity || 'LOW'}
            sub={summary.status_text || 'No generated weather alerts'}
            icon="bell"
            chip={alerts?.status || 'alerts'}
            kind={statusKind(summary.highest_severity)}
            color={severityColor(summary.highest_severity)}
          />
          <MetricCard
            title="Active alerts"
            value={formatNumber(summary.total_alerts, 0)}
            sub={`${FORECAST_HORIZON_DAYS}-day generated alert horizon`}
            icon="list"
            chip={alertRows.length ? 'review' : 'clear'}
            kind={alertRows.length ? 'warn' : 'live'}
            color={alertRows.length ? 'var(--accent)' : 'var(--primary)'}
          />
          <MetricCard
            title="Rain watches"
            value={rainWatch}
            sub={`${heavyRain} heavy-rain days detected`}
            icon="cloud"
            chip={Number(rainWatch) ? 'rain risk' : 'normal'}
            kind={Number(rainWatch) ? 'warn' : 'live'}
            color="var(--secondary)"
          />
          <MetricCard
            title="Heat stress days"
            value={heatDays}
            sub="Days at the backend heat-stress threshold"
            icon="thermo"
            chip={Number(heatDays) ? 'heat' : 'normal'}
            kind={Number(heatDays) ? 'crit' : 'live'}
            color={Number(heatDays) ? 'var(--danger)' : 'var(--primary)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.55fr)', gap: 14, marginBottom: 14 }}>
          <AlertsList alerts={alertRows}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Immediate action</div>
                <div className="tiny muted">Highest-priority recommendation</div>
              </div>
              <span className={`chip ${statusKind(firstAlert?.severity)}`}><span className="chip-dot"/>{firstAlert?.severity || 'LOW'}</span>
            </div>
            {firstAlert ? (
              <div>
                <div style={{ fontSize: 21, fontWeight: 750, color: severityColor(firstAlert.severity), lineHeight: 1.25 }}>{firstAlert.title}</div>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.55 }}>{firstAlert.message}</div>
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>{firstAlert.recommendation}</div>
              </div>
            ) : (
              <div className="tiny muted" style={{ lineHeight: 1.55 }}>No operator action is required from the current weather horizon.</div>
            )}
            <div style={{ ...gridAuto(130), marginTop: 14 }}>
              <div>
                <div className="tiny muted">3-day rain</div>
                <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatMm(summary.next_3_day_rain_mm)}</div>
              </div>
              <div>
                <div className="tiny muted">7-day net balance</div>
                <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatMm(weekly.net_water_balance_mm)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.95fr) minmax(320px, 1fr)', gap: 14, marginBottom: 14 }}>
          <RainEvapChart days={days} title="Alert context: rain and ET0"/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Upcoming rain-watch days</div>
                <div className="tiny muted">Days at or above 10 mm forecast rainfall</div>
              </div>
              <span className="chip warn"><span className="chip-dot"/>{upcomingWetDays.length} days</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {upcomingWetDays.map((day: any) => (
                <div key={day.date} className="between" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 650 }}>{day.date}</div>
                    <div className="tiny muted">{day.weather_description || 'Rain forecast'}</div>
                  </div>
                  <div className="tabular" style={{ fontWeight: 750 }}>{formatMm(dailyRain(day))}</div>
                </div>
              ))}
              {!upcomingWetDays.length && <div className="tiny muted">No moderate or heavy rain-watch days in the selected horizon.</div>}
            </div>
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
      <Alerts />
    </div>
  );
}

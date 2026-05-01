/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { Icon, Chip, Progress } from '@/components/asi/ui';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, ApiError } from '@/lib/api';

interface ForecastField {
  field_id: string;
  field_name: string;
  crop_type: string;
  area_hectares: number;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
}

interface ForecastReadings {
  soil_moisture_pct: number | null;
  water_level_pct: number | null;
  soil_status: string;
  water_status: string;
  sensor_connected: boolean;
  observed_at: string | null;
  quality: string;
}

interface WeatherDay {
  date: string;
  temp_max_c?: number | null;
  temp_min_c?: number | null;
  rain_mm?: number | null;
  precipitation_probability?: number | null;
  evapotranspiration_mm?: number | null;
  weather_description?: string | null;
}

interface WeatherForecast {
  available: boolean;
  daily: WeatherDay[];
  summary: Record<string, any>;
  location: Record<string, any>;
  source?: string | null;
  generated_at?: string | null;
  message?: string | null;
}

interface WeekPlanDay {
  date: string;
  expected_rain_mm: number;
  expected_evapotranspiration_mm: number;
  water_balance_mm: number;
  recommendation: string;
  irrigation_percent: number;
}

interface WeekPlan {
  available: boolean;
  overall_recommendation: string | null;
  weekly_outlook: {
    total_expected_rain_mm: number | null;
    total_expected_evapotranspiration_mm: number | null;
    net_water_balance_mm: number | null;
    rainy_days_expected: number | null;
    average_irrigation_adjustment_percent: number | null;
  } | null;
  daily: WeekPlanDay[];
  generated_at: string | null;
  source: string | null;
  message: string | null;
}

interface ModelSummary {
  available: boolean;
  basic_model: Record<string, any>;
  advanced_models: Record<string, any>;
  scope: Record<string, any>;
  message: string | null;
}

interface ForecastSummary {
  field: ForecastField;
  readings: ForecastReadings;
  weather: WeatherForecast;
  week_plan: WeekPlan | null;
  model_summary: ModelSummary;
  status: string;
  source: string;
  is_live: boolean;
  observed_at: string | null;
  staleness_sec: number | null;
  quality: string;
  data_available: boolean;
  message: string | null;
}

type ChartDay = {
  date: string;
  rain: number;
  et: number;
  balance: number;
  tempMax?: number | null;
  tempMin?: number | null;
  recommendation?: string | null;
};

const CACHE_TTL_MS = 30_000;

function readCache(fieldId: string): ForecastSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`forecast-summary-${fieldId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache(fieldId: string, payload: ForecastSummary) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      `forecast-summary-${fieldId}`,
      JSON.stringify({ fetchedAt: Date.now(), payload }),
    );
  } catch {
    // Ignore disabled or full sessionStorage.
  }
}

const asNumber = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sum = (values: any[]) =>
  values.reduce((total, value) => total + (Number(value) || 0), 0);

const formatMm = (value: any, digits = 1) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)} mm`;
};

const formatPct = (value: any, digits = 0) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)}%`;
};

const formatTemp = (value: any) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(1)} deg`;
};

const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '-';
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString();
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
};

const recommendationKind = (value: string | null | undefined): 'live' | 'warn' | 'crit' | 'info' => {
  const norm = String(value || '').toUpperCase();
  if (norm === 'SKIP') return 'live';
  if (norm === 'REDUCE') return 'info';
  if (norm === 'INCREASE') return 'warn';
  return 'info';
};

const balanceKind = (value: any): 'live' | 'warn' | 'crit' | 'info' => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'info';
  if (n >= 0) return 'live';
  if (n <= -25) return 'crit';
  if (n <= -10) return 'warn';
  return 'info';
};

function buildChartDays(weather?: WeatherForecast | null, weekPlan?: WeekPlan | null): ChartDay[] {
  const weekByDate = new Map<string, WeekPlanDay>();
  (weekPlan?.daily || []).forEach((day) => {
    if (day?.date) weekByDate.set(day.date, day);
  });

  const weatherDays = Array.isArray(weather?.daily) ? weather!.daily : [];
  if (weatherDays.length > 0) {
    return weatherDays.map((day) => {
      const week = weekByDate.get(day.date);
      const rain = Number(day.rain_mm ?? week?.expected_rain_mm ?? 0);
      const et = Number(day.evapotranspiration_mm ?? week?.expected_evapotranspiration_mm ?? 0);
      return {
        date: day.date,
        rain,
        et,
        balance: rain - et,
        tempMax: day.temp_max_c,
        tempMin: day.temp_min_c,
        recommendation: week?.recommendation,
      };
    });
  }

  return (weekPlan?.daily || []).map((day) => ({
    date: day.date,
    rain: Number(day.expected_rain_mm || 0),
    et: Number(day.expected_evapotranspiration_mm || 0),
    balance: Number(day.water_balance_mm || 0),
    recommendation: day.recommendation,
  }));
}

interface ForecastPanelProps {
  fieldId: string;
  fieldStatus?: any;
  onRefresh?: () => void;
}

export function ForecastPanel({ fieldId, onRefresh }: ForecastPanelProps) {
  const [summary, setSummary] = React.useState<ForecastSummary | null>(() => readCache(fieldId));
  const [loading, setLoading] = React.useState(!readCache(fieldId));
  const [error, setError] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(async (silent = false) => {
    if (!fieldId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await apiGet<ForecastSummary>(`/irrigation/farmer/fields/${fieldId}/forecast-summary`);
      setSummary(res);
      writeCache(fieldId, res);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Field not found');
      } else {
        setError(err?.message || 'Failed to load forecast data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fieldId]);

  React.useEffect(() => {
    loadSummary(false);
  }, [loadSummary]);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') loadSummary(true);
    };
    const handle = window.setInterval(tick, 60_000);
    return () => window.clearInterval(handle);
  }, [loadSummary]);

  const weather = summary?.weather;
  const weekPlan = summary?.week_plan;
  const model = summary?.model_summary;
  const readings = summary?.readings;
  const chartDays = React.useMemo(() => buildChartDays(weather, weekPlan), [weather, weekPlan]);

  const first7 = chartDays.slice(0, 7);
  const totalRain = weekPlan?.weekly_outlook?.total_expected_rain_mm ?? sum(first7.map((d) => d.rain));
  const totalEt = weekPlan?.weekly_outlook?.total_expected_evapotranspiration_mm ?? sum(first7.map((d) => d.et));
  const netBalance = weekPlan?.weekly_outlook?.net_water_balance_mm ?? (Number(totalRain) - Number(totalEt));
  const irrigationAdjustment = weekPlan?.weekly_outlook?.average_irrigation_adjustment_percent;
  const rainyDays = weekPlan?.weekly_outlook?.rainy_days_expected ?? first7.filter((d) => d.rain > 1).length;
  const basicModel = model?.basic_model || {};
  const advanced = model?.advanced_models || {};
  const metrics = advanced?.metrics || {};
  const bestMetrics = advanced?.best_model ? metrics[advanced.best_model] : null;

  return (
    <ApiState loading={loading && !summary} error={error} onRetry={() => loadSummary(false)}>
      {summary && (
        <div className="forecast-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            <KpiCard
              label="7-day rain"
              icon="cloud"
              value={formatMm(totalRain)}
              caption={`${rainyDays} rainy day${Number(rainyDays) === 1 ? '' : 's'} expected`}
              chip={{ kind: weather?.available ? (weather.source === 'simulated' ? 'warn' : 'live') : 'off', text: weather?.source || 'Unavailable' }}
            />
            <KpiCard
              label="7-day ET"
              icon="sun"
              value={formatMm(totalEt)}
              caption="Evapotranspiration demand"
            />
            <KpiCard
              label="Net balance"
              icon="droplet"
              value={formatMm(netBalance)}
              caption={Number(netBalance) < 0 ? 'Water deficit forecast' : 'Rain covers ET demand'}
              chip={{ kind: balanceKind(netBalance), text: Number(netBalance) < 0 ? 'Deficit' : 'Surplus' }}
            />
            <KpiCard
              label="Irrigation adjustment"
              icon="target"
              value={irrigationAdjustment !== null && irrigationAdjustment !== undefined ? formatPct(irrigationAdjustment) : '-'}
              caption={weekPlan?.overall_recommendation || 'Awaiting recommendation'}
              chip={{ kind: recommendationKind(weekPlan?.overall_recommendation), text: weekPlan?.overall_recommendation || 'No plan' }}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="chart" size={14} color="var(--primary-600)" /> 14-day field forecast
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip kind={summary.is_live ? 'live' : summary.status === 'stale' ? 'warn' : 'off'} dot={false}>
                  {summary.status}
                </Chip>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadSummary(false)}>
                  <Icon name="refresh" size={12} /> Refresh
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {chartDays.length > 0 ? (
                <ForecastBalanceChart days={chartDays.slice(0, 14)} />
              ) : (
                <div className="tiny muted">Forecast data unavailable.</div>
              )}
            </div>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              {weather?.location?.latitude && weather?.location?.longitude
                ? `Coordinates ${Number(weather.location.latitude).toFixed(3)}, ${Number(weather.location.longitude).toFixed(3)}`
                : 'Field coordinates pending'}
              {' · '}
              Source: {weather?.source || 'forecasting_service'}
              {weather?.generated_at ? ` · updated ${formatRelative(weather.generated_at)}` : ''}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 14,
            }}
          >
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="calendar" size={14} color="var(--primary-600)" /> Daily irrigation plan
                </div>
                <Chip kind={recommendationKind(weekPlan?.overall_recommendation)} dot={false}>
                  {weekPlan?.overall_recommendation || 'Unavailable'}
                </Chip>
              </div>

              {weekPlan?.daily?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, overflowX: 'auto' }}>
                  {weekPlan.daily.map((day) => (
                    <div
                      key={day.date}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(78px, 0.8fr) repeat(3, minmax(74px, 1fr)) minmax(90px, 0.8fr)',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 540,
                        padding: '9px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{shortDate(day.date)}</div>
                      <div className="tabular">{formatMm(day.expected_rain_mm)}</div>
                      <div className="tabular">{formatMm(day.expected_evapotranspiration_mm)}</div>
                      <div className="tabular" style={{ color: Number(day.water_balance_mm) < 0 ? '#B45309' : 'var(--primary-600)' }}>
                        {formatMm(day.water_balance_mm)}
                      </div>
                      <div style={{ justifySelf: 'end' }}>
                        <Chip kind={recommendationKind(day.recommendation)} dot={false}>
                          {day.recommendation} {day.irrigation_percent}%
                        </Chip>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tiny muted" style={{ marginTop: 10 }}>
                  No daily irrigation plan returned.
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="humidity" size={14} color="var(--primary-600)" /> Field context
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                <MetricRow label="Soil moisture" value={formatPct(readings?.soil_moisture_pct)} note={readings?.soil_status || 'UNKNOWN'} />
                <MetricRow label="Water level" value={formatPct(readings?.water_level_pct)} note={readings?.water_status || 'UNKNOWN'} />
                <MetricRow label="Sensor freshness" value={readings?.observed_at ? formatRelative(readings.observed_at) : '-'} note={readings?.quality || 'unknown'} />
                <MetricRow label="Temperature" value={formatTemp(weather?.daily?.[0]?.temp_max_c)} note={weather?.daily?.[0]?.weather_description || 'Forecast'} />
              </div>
              {Number.isFinite(Number(irrigationAdjustment)) && (
                <div style={{ marginTop: 14 }}>
                  <Progress
                    value={Math.max(0, Math.min(150, Number(irrigationAdjustment)))}
                    max={150}
                    label="Forecast-adjusted irrigation need"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="gear" size={14} color="var(--primary-600)" /> Forecast model details
              </div>
              <Chip kind={model?.available ? 'live' : 'off'} dot={false}>
                {model?.available ? 'Model metadata' : 'Unavailable'}
              </Chip>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
                marginTop: 12,
              }}
            >
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="tiny muted">Basic water-level model</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  {basicModel.name || 'LinearRegression'}
                  {basicModel.version ? ` v${basicModel.version}` : ''}
                </div>
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  Data window: {basicModel.data_window || 'last_24_points'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Chip kind={basicModel.ready ? 'live' : 'off'} dot={false}>
                    {basicModel.ready ? 'Ready' : 'Not ready'}
                  </Chip>
                  <Chip kind="info" dot={false}>
                    {basicModel.features_used_count || 24} features
                  </Chip>
                </div>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  Water samples: {basicModel.data_points?.water_level ?? 0} · rainfall: {basicModel.data_points?.rainfall ?? 0}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="tiny muted">Advanced ML models</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  {advanced.best_model || 'Awaiting training'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <Chip kind={advanced.available ? 'live' : 'off'} dot={false}>
                    {advanced.available ? 'Available' : 'Unavailable'}
                  </Chip>
                  <Chip kind={advanced.trained ? 'live' : 'warn'} dot={false}>
                    {advanced.trained ? 'Trained' : 'Pending'}
                  </Chip>
                  {advanced.uncertainty_supported && (
                    <Chip kind="info" dot={false}>Quantile bounds</Chip>
                  )}
                </div>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  Models: {Array.isArray(advanced.models) && advanced.models.length ? advanced.models.join(', ') : 'No trained model list'}
                </div>
                {bestMetrics && (
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    RMSE {Number(bestMetrics.rmse).toFixed(2)} · MAE {Number(bestMetrics.mae).toFixed(2)} · R2 {Number(bestMetrics.r2).toFixed(2)}
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="tiny muted">Scope</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>
                  Weather: {model?.scope?.weather === 'field_coordinates' ? 'Field coordinates' : 'Default region'}
                </div>
                <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                  Water-level ML: {model?.scope?.water_level_model || 'service_observations'}.
                  {model?.scope?.field_specific_ml ? ' Field-specific ML is enabled.' : ' Field-specific ML will require F3 observations keyed by field_id.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ApiState>
  );
}

function KpiCard({
  label,
  icon,
  value,
  caption,
  chip,
}: {
  label: string;
  icon: string;
  value: string;
  caption?: string;
  chip?: { kind: 'live' | 'warn' | 'crit' | 'info' | 'off'; text: string };
}) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="tiny muted">{label}</div>
        <Icon name={icon} size={13} color="var(--muted)" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {chip && (
        <div style={{ marginTop: 6 }}>
          <Chip kind={chip.kind} dot={false}>{chip.text}</Chip>
        </div>
      )}
      {caption && <div className="tiny muted" style={{ marginTop: 6 }}>{caption}</div>}
    </div>
  );
}

function MetricRow({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="between" style={{ gap: 12 }}>
      <div>
        <div className="tiny muted">{label}</div>
        {note && <div className="tiny" style={{ marginTop: 2 }}>{note}</div>}
      </div>
      <div className="tabular" style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ForecastBalanceChart({ days }: { days: ChartDay[] }) {
  const width = 760;
  const height = 270;
  const pad = { l: 44, r: 26, t: 16, b: 34 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const maxWater = Math.max(10, ...days.flatMap((day) => [day.rain, day.et]).map((v) => Math.abs(Number(v) || 0)));
  const maxBalance = Math.max(10, ...days.map((day) => Math.abs(Number(day.balance) || 0)));
  const x = (i: number) => pad.l + (days.length <= 1 ? 0 : i * (w / (days.length - 1)));
  const yWater = (v: number) => pad.t + h - (Math.max(0, v) / maxWater) * h;
  const yBalance = (v: number) => pad.t + h / 2 - (v / maxBalance) * (h / 2);
  const etPath = days.map((day, i) => `${i ? 'L' : 'M'}${x(i)} ${yWater(day.et)}`).join(' ');
  const balancePath = days.map((day, i) => `${i ? 'L' : 'M'}${x(i)} ${yBalance(day.balance)}`).join(' ');
  const barWidth = Math.max(8, Math.min(18, w / Math.max(days.length, 1) * 0.35));

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Forecast rain evapotranspiration and water balance">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = pad.t + h - g * h;
          return (
            <g key={g}>
              <line x1={pad.l} x2={pad.l + w} y1={y} y2={y} stroke="#E5EDE2" />
              <text x={pad.l - 8} y={y + 3} fontSize="10" fill="#7D897D" textAnchor="end">
                {Math.round(g * maxWater)}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={pad.l + w} y1={pad.t + h / 2} y2={pad.t + h / 2} stroke="#D6E0D3" strokeDasharray="4 4" />
        {days.map((day, i) => {
          const barHeight = (Math.max(0, day.rain) / maxWater) * h;
          return (
            <rect
              key={day.date}
              x={x(i) - barWidth / 2}
              y={pad.t + h - barHeight}
              width={barWidth}
              height={barHeight}
              fill="#60A5FA"
              opacity="0.38"
              rx="3"
            />
          );
        })}
        <path d={etPath} fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
        <path d={balancePath} fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
        {days.map((day, i) => (
          <g key={`${day.date}-points`}>
            <circle cx={x(i)} cy={yWater(day.et)} r="2.7" fill="#F59E0B" />
            <circle cx={x(i)} cy={yBalance(day.balance)} r="2.7" fill={day.balance < 0 ? '#B45309' : 'var(--primary)'} />
            <text x={x(i)} y={height - 10} fontSize="10" fill="#7D897D" textAnchor="middle">
              {shortDate(day.date).replace(' ', '\n')}
            </text>
          </g>
        ))}
        <g transform={`translate(${pad.l}, 6)`} fontSize="11" fill="#516151">
          <circle cx="0" cy="0" r="4" fill="#60A5FA" opacity="0.5" />
          <text x="10" y="4">Rain</text>
          <circle cx="62" cy="0" r="4" fill="#F59E0B" />
          <text x="72" y="4">ET</text>
          <circle cx="118" cy="0" r="4" fill="var(--primary)" />
          <text x="128" y="4">Balance</text>
        </g>
      </svg>
    </div>
  );
}

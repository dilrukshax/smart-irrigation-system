/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import {
  Icon,
  Chip,
  Gauge,
  Frame,
} from '@/components/asi/ui';
import { farmerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const MIX_COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampPct = (value: any) => Math.max(0, Math.min(100, Number(value) || 0));

const pickFirstNumber = (...values: any[]) => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const formatArea = (value: any) => {
  const parsed = toNumber(value);
  return parsed === null ? '0' : parsed.toFixed(1).replace(/\.0$/, '');
};

const formatPercent = (value: any, digits = 0) => {
  const parsed = toNumber(value);
  return parsed === null ? '—' : `${parsed.toFixed(digits)}%`;
};

const formatMm = (value: any, digits = 0) => {
  const parsed = toNumber(value);
  return parsed === null ? '—' : `${parsed.toFixed(digits)} mm`;
};

const formatMoney = (value: any) => {
  const parsed = toNumber(value);
  if (parsed === null) return '—';
  if (Math.abs(parsed) >= 1_000_000) return `LKR ${(parsed / 1_000_000).toFixed(1)}M`;
  if (Math.abs(parsed) >= 1_000) return `LKR ${(parsed / 1_000).toFixed(0)}k`;
  return `LKR ${parsed.toFixed(0)}`;
};

const formatClock = (value: any) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatRelativeTime = (value: any) => {
  if (!value) return 'Waiting for update';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return 'Just now';
  if (absMs < hour) return `${Math.max(1, Math.round(absMs / minute))}m ago`;
  if (absMs < day) return `${Math.max(1, Math.round(absMs / hour))}h ago`;
  return `${Math.max(1, Math.round(absMs / day))}d ago`;
};

const formatDayLabel = (value: any) => {
  if (!value) return 'Day';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 2);
  return date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2);
};

const buildGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getFieldId = (field: any, index = 0) => field?.field_id || field?.id || field?.slug || `field-${index}`;

const getFieldName = (field: any, index = 0) => field?.field_name || field?.name || getFieldId(field, index);

const getFieldCrop = (field: any, summary: any) =>
  summary?.field?.crop_type ||
  field?.crop_type ||
  field?.crop ||
  field?.variety ||
  'Unassigned';

const getFieldMoisture = (field: any, summary: any) => pickFirstNumber(
  summary?.readings?.soil_moisture_pct,
  field?.latest_telemetry?.soil_moisture_pct,
  field?.telemetry?.soil_moisture_pct,
  field?.soil_moisture_pct,
);

const getFieldWaterLevel = (field: any, summary: any) => pickFirstNumber(
  summary?.readings?.water_level_pct,
  field?.latest_telemetry?.water_level_pct,
  field?.water_level_pct,
);

const getFieldObservedAt = (field: any, summary: any) =>
  summary?.readings?.observed_at ||
  field?.latest_telemetry?.timestamp ||
  field?.updated_at ||
  field?.created_at ||
  null;

const getValveMeta = (summary: any) => {
  const raw = String(summary?.readings?.valve_status || summary?.field?.valve_status || '').toUpperCase();
  if (raw === 'OPEN') return { label: 'Open', kind: 'live' };
  if (raw === 'CLOSED') return { label: 'Closed', kind: 'off' };
  return { label: 'Unknown', kind: 'info' };
};

const getHealthMeta = (field: any, summary: any) => {
  const explicit = String(
    summary?.readings?.overall_status ||
    summary?.readings?.soil_status ||
    field?.health_status ||
    ''
  ).toUpperCase();
  const moisture = getFieldMoisture(field, summary);

  if (explicit.includes('CRITICAL')) return { label: 'Critical', kind: 'crit', color: 'var(--danger)' };
  if (explicit.includes('WARNING') || explicit.includes('DRY') || explicit.includes('LOW') || explicit.includes('WET')) {
    return { label: 'Stressed', kind: 'warn', color: 'var(--accent)' };
  }
  if (explicit.includes('OK') || explicit.includes('IRRIGATING') || explicit.includes('OPTIMAL')) {
    return { label: 'Healthy', kind: 'live', color: 'var(--primary)' };
  }
  if (moisture === null) return { label: 'Waiting', kind: 'off', color: 'var(--muted)' };
  if (moisture < 35) return { label: 'Critical', kind: 'crit', color: 'var(--danger)' };
  if (moisture < 50) return { label: 'Stressed', kind: 'warn', color: 'var(--accent)' };
  return { label: 'Healthy', kind: 'live', color: 'var(--primary)' };
};

const getRecommendationKind = (value: any) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SKIP') return 'live';
  if (normalized === 'REDUCE') return 'warn';
  if (normalized === 'INCREASE') return 'crit';
  return 'info';
};

const getRecommendationColor = (value: any) => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SKIP') return 'var(--secondary)';
  if (normalized === 'REDUCE') return 'var(--accent)';
  if (normalized === 'INCREASE') return 'var(--danger)';
  return 'var(--primary)';
};

function StaticProgress({ value, color = 'var(--primary)' }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#EFF3EC', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${clampPct(value)}%`, borderRadius: 99, background: color }} />
    </div>
  );
}

function StaticSlider({ value, color = 'var(--primary)' }) {
  return (
    <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 6, borderRadius: 99, background: '#E8ECE5', border: '1px solid #D7DED3' }} />
      <div style={{ position: 'absolute', left: 0, width: `${clampPct(value)}%`, height: 6, borderRadius: 99, background: color }} />
      <div
        style={{
          position: 'absolute',
          left: `calc(${clampPct(value)}% - 7px)`,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: color,
          boxShadow: '0 0 0 3px rgba(46,125,50,0.12)',
        }}
      />
    </div>
  );
}

function ForecastBars({ daily }) {
  if (!daily.length) {
    return <div className="tiny muted" style={{ marginTop: 12 }}>No rainfall forecast available yet.</div>;
  }

  const max = Math.max(...daily.map((day: any) => Math.max(0, Number(day?.rain_mm) || 0)), 1);
  return (
    <div style={{ marginTop: 12 }}>
      <div className="tiny muted" style={{ marginBottom: 8 }}>7-day rain forecast</div>
      <div style={{ height: 82, display: 'grid', gridTemplateColumns: `repeat(${daily.length}, 1fr)`, gap: 8, alignItems: 'end', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        {daily.map((day: any) => {
          const rain = Math.max(0, Number(day?.rain_mm) || 0);
          return (
            <div key={String(day?.date || day?.label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div
                title={`${rain.toFixed(1)} mm`}
                style={{
                  width: 22,
                  height: Math.max(4, (rain / max) * 52),
                  background: 'var(--secondary)',
                  borderRadius: '4px 4px 2px 2px',
                }}
              />
              <span className="tiny muted">{formatDayLabel(day?.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationMix({ recommendations }) {
  if (!recommendations.length) {
    return <div className="tiny muted" style={{ marginTop: 16 }}>Run optimization for a live crop mix recommendation.</div>;
  }

  const top = recommendations.slice(0, 3);
  const scores = top.map((row: any) => pickFirstNumber(row?.suitability_score, row?.combined_score, row?.confidence, 0) || 0);
  const total = scores.reduce((sum: number, value: number) => sum + value, 0) || top.length;
  const rows = top.map((row: any, index: number) => ({
    name: row?.crop_name || row?.crop_id || `Crop ${index + 1}`,
    value: Math.max(1, Math.round(((scores[index] || 1) / total) * 100)),
    color: MIX_COLORS[index % MIX_COLORS.length],
  }));

  return (
    <div style={{ marginTop: 16 }}>
      <div className="tiny muted" style={{ marginBottom: 8 }}>Top recommendations</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span>{row.name}</span>
              <span className="tabular">{row.value}%</span>
            </div>
            <StaticProgress value={row.value} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldRows({ fields, summariesById }) {
  if (!fields.length) {
    return (
      <div className="tiny muted" style={{ padding: '18px 0' }}>
        No fields found yet. Add your first field to start receiving irrigation and crop guidance.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {fields.map((field: any, index: number) => {
        const fieldId = getFieldId(field, index);
        const summary = summariesById[fieldId];
        const moisture = getFieldMoisture(field, summary);
        const health = getHealthMeta(field, summary);
        const valve = getValveMeta(summary);

        return (
          <Link
            key={fieldId}
            href={`/farmer/field/${fieldId}`}
            className="farmer-dashboard-field-row"
            style={{
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: index < fields.length - 1 ? '1px solid var(--line)' : 'none',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{getFieldName(field, index)}</div>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {getFieldCrop(field, summary)} · {formatArea(field?.area_hectares ?? field?.area)} ha
              </div>
            </div>
            <div>
              <div className="tiny muted" style={{ marginBottom: 5 }}>Soil moisture</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', alignItems: 'center', gap: 8 }}>
                <StaticProgress value={moisture || 0} color={health.color} />
                <span className="tabular small" style={{ fontWeight: 700 }}>
                  {moisture === null ? '—' : `${Math.round(moisture)}%`}
                </span>
              </div>
            </div>
            <Chip kind={valve.kind}>{valve.label}</Chip>
            <Chip kind={health.kind}>{health.label}</Chip>
            <Icon name="arrow" size={14} color="var(--muted)" />
          </Link>
        );
      })}
    </div>
  );
}

function PlanRows({ daily }) {
  if (!daily.length) {
    return <div className="tiny muted" style={{ marginTop: 14 }}>Forecast-driven irrigation guidance is not available yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
      {daily.slice(0, 5).map((day: any) => {
        const irrigationPercent = clampPct(day?.irrigation_percent);
        return (
          <div key={String(day?.date)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>{formatDayLabel(day?.date)}</div>
                <div className="tiny muted">
                  Rain {formatMm(day?.expected_rain_mm)} · ET {formatMm(day?.expected_evapotranspiration_mm)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip kind={getRecommendationKind(day?.recommendation)}>{day?.recommendation || 'NORMAL'}</Chip>
                <span className="small tabular" style={{ fontWeight: 700 }}>{irrigationPercent}%</span>
              </div>
            </div>
            <StaticSlider value={irrigationPercent} color={getRecommendationColor(day?.recommendation)} />
          </div>
        );
      })}
    </div>
  );
}

function IrrigationAdjustmentChart({ daily }) {
  if (!daily.length) {
    return <div className="tiny muted" style={{ marginTop: 16 }}>No 7-day irrigation adjustment forecast yet.</div>;
  }

  return (
    <div className="farmer-dashboard-chart" style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(10px, 1fr))` }}>
      {daily.map((day: any) => {
        const irrigationPercent = clampPct(day?.irrigation_percent);
        return (
          <div key={String(day?.date)} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
            <div
              title={`${irrigationPercent}%`}
              style={{
                width: 18,
                height: `${Math.max(16, (irrigationPercent / 100) * 112)}px`,
                borderRadius: 3,
                background: getRecommendationColor(day?.recommendation),
              }}
            />
            <span className="tiny muted">{formatDayLabel(day?.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FarmerDashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dashboard, setDashboard] = React.useState<any>({
    user: null,
    fields: [],
    summariesById: {},
    primaryField: null,
    primarySummary: null,
    primaryForecast: null,
    primaryPlan: null,
  });

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mePromise = apiGet<any>('/auth/me').catch(() => user || null);
      const fieldsResponse = await apiGet<any>('/farm/fields');
      const fields = Array.isArray(fieldsResponse)
        ? fieldsResponse
        : fieldsResponse?.fields || fieldsResponse?.data || [];

      const summaryEntries = await Promise.all(
        fields.map(async (field: any, index: number) => {
          const fieldId = getFieldId(field, index);
          const summary = await apiGet<any>(`/irrigation/farmer/fields/${encodeURIComponent(fieldId)}/summary`).catch(() => null);
          return [fieldId, summary] as const;
        })
      );

      const summariesById = Object.fromEntries(summaryEntries);
      const primaryField =
        fields.find((field: any, index: number) => summariesById[getFieldId(field, index)]) ||
        fields[0] ||
        null;

      const primaryFieldId = primaryField ? getFieldId(primaryField) : null;
      const [freshUser, primaryForecast, primaryPlan] = await Promise.all([
        mePromise,
        primaryFieldId
          ? apiGet<any>(`/irrigation/farmer/fields/${encodeURIComponent(primaryFieldId)}/forecast-summary`).catch(() => null)
          : Promise.resolve(null),
        primaryFieldId
          ? apiGet<any>(`/planning/farmer/current?${new URLSearchParams({ field_id: primaryFieldId }).toString()}`).catch(() => null)
          : Promise.resolve(null),
      ]);

      setDashboard({
        user: freshUser,
        fields,
        summariesById,
        primaryField,
        primarySummary: primaryFieldId ? summariesById[primaryFieldId] || null : null,
        primaryForecast,
        primaryPlan,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load farmer dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const now = new Date();
  const displayUser = dashboard.user || user;
  const displayName = displayUser?.full_name || displayUser?.username || 'Farmer';
  const fields = Array.isArray(dashboard.fields) ? dashboard.fields : [];
  const summariesById = dashboard.summariesById || {};
  const primaryField = dashboard.primaryField;
  const primarySummary = dashboard.primarySummary;
  const primaryForecast = dashboard.primaryForecast;
  const primaryPlan = dashboard.primaryPlan;
  const primaryWeekPlan = primarySummary?.week_plan || primaryForecast?.week_plan || null;
  const primaryDailyPlan = Array.isArray(primaryWeekPlan?.daily) ? primaryWeekPlan.daily.slice(0, 7) : [];
  const forecastDaily = Array.isArray(primaryForecast?.weather?.daily) ? primaryForecast.weather.daily.slice(0, 7) : [];
  const selectedCrop = primaryPlan?.selected_crop || primaryPlan?.recommendations?.[0] || null;
  const schemeId =
    displayUser?.scheme_ids?.[0] ||
    primaryField?.scheme_id ||
    fields.find((field: any) => field?.scheme_id)?.scheme_id ||
    '';
  const schemeLabel = schemeId
    ? String(schemeId).toLowerCase().startsWith('mahaweli')
      ? String(schemeId)
      : `Mahaweli ${schemeId}`
    : 'Assigned scheme';
  const subtitleSeason =
    primaryPlan?.season ||
    primaryPlan?.field_context?.season ||
    primaryField?.season ||
    'Season pending';
  const primaryFieldName = primaryField ? getFieldName(primaryField) : 'No field selected';
  const primaryCropName = selectedCrop?.crop_name || getFieldCrop(primaryField, primarySummary);
  const primaryMoisture = primaryField ? getFieldMoisture(primaryField, primarySummary) : null;
  const primaryWaterLevel = primaryField ? getFieldWaterLevel(primaryField, primarySummary) : null;
  const primaryValve = getValveMeta(primarySummary);
  const primaryHealth = getHealthMeta(primaryField, primarySummary);
  const primaryObservedAt = primaryField ? getFieldObservedAt(primaryField, primarySummary) : null;
  const totalArea = fields.reduce((sum: number, field: any) => sum + (Number(field?.area_hectares ?? field?.area) || 0), 0);
  const activeValves = fields.filter((field: any, index: number) => {
    const fieldId = getFieldId(field, index);
    return String(summariesById[fieldId]?.readings?.valve_status || '').toUpperCase() === 'OPEN';
  }).length;
  const onlineSensors = fields.filter((field: any, index: number) => {
    const fieldId = getFieldId(field, index);
    return Boolean(summariesById[fieldId]?.readings?.sensor_connected);
  }).length;
  const optimizationRows = Array.isArray(primaryPlan?.recommendations) ? primaryPlan.recommendations : [];
  const weatherSummary = primaryForecast?.weather?.summary || {};
  const weatherLocation = primaryForecast?.weather?.location || {};
  const firstForecastDay = forecastDaily[0] || {};
  const weatherTemp = pickFirstNumber(
    weatherSummary?.temperature_c,
    weatherSummary?.temperature_celsius,
    firstForecastDay?.temp_max_c !== undefined && firstForecastDay?.temp_min_c !== undefined
      ? (Number(firstForecastDay.temp_max_c) + Number(firstForecastDay.temp_min_c)) / 2
      : null,
  );
  const weatherHumidity = pickFirstNumber(
    weatherSummary?.humidity_percent,
    weatherSummary?.humidity,
  );
  const weatherDescription = firstForecastDay?.weather_description || weatherSummary?.condition || 'Forecast unavailable';
  const weatherLocationName = weatherLocation?.name || primaryField?.location_name || schemeLabel;
  const totalRain = pickFirstNumber(
    primaryWeekPlan?.weekly_outlook?.total_expected_rain_mm,
    forecastDaily.reduce((sum: number, day: any) => sum + (Number(day?.rain_mm) || 0), 0)
  );
  const avgAdjustment = pickFirstNumber(
    primaryWeekPlan?.weekly_outlook?.average_irrigation_adjustment_percent,
    primaryDailyPlan.length
      ? primaryDailyPlan.reduce((sum: number, day: any) => sum + clampPct(day?.irrigation_percent), 0) / primaryDailyPlan.length
      : null
  );
  const netWaterBalance = pickFirstNumber(primaryWeekPlan?.weekly_outlook?.net_water_balance_mm);

  let alertTitle = 'Dashboard synced with live backend data';
  let alertDetail = 'Field, weather, and optimization cards are now reading from the latest available services.';
  let alertKind: 'warn' | 'live' | 'info' | 'crit' = 'info';

  if (primarySummary?.manual_requests?.latest_pending) {
    const pending = primarySummary.manual_requests.latest_pending;
    alertTitle = 'Manual irrigation request pending';
    alertDetail = `${pending?.requested_action || 'Action'} · ${pending?.requested_position_pct || 0}% · ${pending?.reason || 'Waiting for review'}`;
    alertKind = 'warn';
  } else if (primarySummary?.auto_decision?.blocked) {
    alertTitle = 'Auto-control decision blocked';
    alertDetail = primarySummary?.auto_decision?.blocked_reason || primarySummary?.auto_decision?.message || 'Check scheme policy and water availability.';
    alertKind = 'crit';
  } else if (primaryWeekPlan?.overall_recommendation) {
    alertTitle = '7-day irrigation guidance ready';
    alertDetail = primaryWeekPlan.overall_recommendation;
    alertKind = 'live';
  } else if (primaryObservedAt) {
    alertTitle = 'Primary field status updated';
    alertDetail = `${primaryFieldName} last reported ${formatRelativeTime(primaryObservedAt)}.`;
    alertKind = 'info';
  }

  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      exported_at: new Date().toISOString(),
      dashboard,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'farmer-dashboard.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Frame
      sidebar={farmerNav}
      breadcrumb={['Farmer', 'Dashboard']}
      user={displayName}
      role={`Farmer${schemeId ? ` · ${schemeId}` : ''}`}
    >
      <ApiState loading={loading} error={error} onRetry={loadDashboard}>
        <div className="farmer-dashboard">
          <div className="page-head farmer-dashboard-head">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {buildGreeting(now)}, {displayName.split(' ')[0]} · {formatClock(now)}
              </div>
              <div className="page-title" style={{ fontSize: 22 }}>
                {primaryField ? `Today's plan for ${schemeLabel}` : `Welcome to ${schemeLabel}`}
              </div>
              <div className="page-sub">
                {fields.length} fields · {formatArea(totalArea)} ha · {onlineSensors} sensors live · {subtitleSeason} · Main crop: {primaryCropName || 'Pending'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleExport}>
                <Icon name="download" size={13}/> Export
              </button>
              <Link href="/farmer/onboarding" className="btn btn-primary btn-sm">
                <Icon name="plus" size={13}/> New field
              </Link>
            </div>
          </div>

          <div
            className="farmer-dashboard-alert"
            style={{
              background: alertKind === 'crit' ? '#FEF2F2' : alertKind === 'warn' ? '#FFF8E6' : '#ECFDF3',
              borderColor: alertKind === 'crit' ? '#FECACA' : alertKind === 'warn' ? '#F3D18B' : '#B7E4C7',
            }}
          >
            <Icon name="bell" size={15} color={alertKind === 'crit' ? '#B42318' : alertKind === 'warn' ? '#B27500' : '#127A42'} />
            <div>
              <div style={{ fontWeight: 700, color: alertKind === 'crit' ? '#912018' : alertKind === 'warn' ? '#8A5A00' : '#166534' }}>{alertTitle}</div>
              <div className="tiny" style={{ color: alertKind === 'crit' ? '#912018' : alertKind === 'warn' ? '#8A5A00' : '#166534' }}>{alertDetail}</div>
            </div>
            <div className="farmer-dashboard-alert-actions">
              {primaryField ? (
                <Link href={`/farmer/field/${getFieldId(primaryField)}`} className="btn btn-ghost btn-sm" style={{ background: 'rgba(255,255,255,0.55)' }}>
                  Details
                </Link>
              ) : (
                <span className="tiny muted">Add a field to start.</span>
              )}
            </div>
          </div>

          <div className="farmer-dashboard-kpi-grid">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Primary field</div>
                  <div className="tiny muted">{primaryFieldName} · {getFieldCrop(primaryField, primarySummary)}</div>
                </div>
                <Chip kind={primaryHealth.kind}>{primaryHealth.label}</Chip>
              </div>
              <div className="farmer-dashboard-water-body">
                <Gauge
                  value={primaryMoisture || 0}
                  size={128}
                  stroke={12}
                  color={primaryHealth.color}
                  label={primaryMoisture === null ? '—' : `${Math.round(primaryMoisture)}%`}
                  sub="soil moisture"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><div className="tiny muted">Water level</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800 }}>{formatPercent(primaryWaterLevel)}</div></div>
                  <div><div className="tiny muted">Valve</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800, color: primaryValve.kind === 'live' ? 'var(--primary)' : 'var(--text)' }}>{primaryValve.label}</div></div>
                  <div><div className="tiny muted">Last update</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800 }}>{formatRelativeTime(primaryObservedAt)}</div></div>
                </div>
              </div>
              <div className="divider" style={{ margin: '14px 0 10px' }} />
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Auto action: <b style={{ color: 'var(--text)' }}>
                  {primarySummary?.auto_decision?.action || primarySummary?.auto_decision?.message || 'Waiting for telemetry'}
                </b>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Weather · {weatherLocationName}</div>
                <Chip kind={forecastDaily.length ? 'live' : 'off'}>
                  {forecastDaily.length ? `Updated ${formatRelativeTime(primaryForecast?.observed_at || primaryForecast?.generated_at || primaryForecast?.weather?.generated_at)}` : 'Unavailable'}
                </Chip>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Icon name="cloud" size={42} color="var(--secondary)" />
                <div>
                  <div className="tabular" style={{ fontSize: 30, fontWeight: 800 }}>
                    {weatherTemp === null ? '—' : `${weatherTemp.toFixed(1)}°C`}
                  </div>
                  <div className="tiny muted">
                    {weatherDescription} · Humidity {weatherHumidity === null ? '—' : `${Math.round(weatherHumidity)}%`}
                  </div>
                </div>
              </div>
              <ForecastBars daily={forecastDaily} />
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Optimization snapshot</div>
                <Chip kind={selectedCrop ? 'live' : 'off'} dot={false}>{selectedCrop ? 'Live plan' : 'No plan yet'}</Chip>
              </div>
              <div className="tiny muted">{selectedCrop ? `Selected crop for ${primaryFieldName}` : 'Run the optimization workspace to generate recommendations.'}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                <div className="tabular" style={{ fontSize: 24, fontWeight: 800 }}>{selectedCrop?.crop_name || '—'}</div>
                <div className="tiny muted">· {selectedCrop?.risk_level || 'No risk score'}</div>
              </div>
              <div className="divider" style={{ margin: '14px 0 10px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="metric-label">Projected yield</div>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    {selectedCrop ? `${Number(selectedCrop.predicted_yield_t_ha).toFixed(1)} t/ha` : '—'}
                  </div>
                  <div className="metric-delta up" style={{ marginTop: 5 }}>
                    Water {selectedCrop ? formatMm(selectedCrop.water_requirement_mm) : '—'}
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="metric-label">Projected profit</div>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    {selectedCrop ? formatMoney(selectedCrop.profit_per_ha) : '—'}
                  </div>
                  <div className="metric-delta up" style={{ marginTop: 5 }}>
                    Price {selectedCrop ? formatMoney(selectedCrop.predicted_price_per_kg).replace('LKR ', 'LKR ') + '/kg' : '—'}
                  </div>
                </div>
              </div>
              <RecommendationMix recommendations={optimizationRows} />
            </div>
          </div>

          <div className="farmer-dashboard-main-grid">
            <div className="card" style={{ minHeight: 304 }}>
              <div className="card-head">
                <div className="card-title">Fields</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm">All ({fields.length})</button>
                  <button className="btn btn-ghost btn-sm">Active valves ({activeValves})</button>
                </div>
              </div>
              <FieldRows fields={fields} summariesById={summariesById} />
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">7-day irrigation plan</div>
                <Chip kind={primaryDailyPlan.length ? 'info' : 'off'} dot={false}>
                  {primaryDailyPlan.length ? `${primaryDailyPlan.length} days ready` : 'No outlook'}
                </Chip>
              </div>
              <div className="tiny muted">
                {primaryField ? `Forecast-backed schedule for ${primaryFieldName}` : 'Add a field to unlock weekly irrigation guidance.'}
              </div>
              <PlanRows daily={primaryDailyPlan} />
              <div className="divider" style={{ margin: '14px 0 10px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="metric-label">Expected rain</div>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatMm(totalRain)}</div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="metric-label">Avg adjustment</div>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatPercent(avgAdjustment)}</div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div className="metric-label">Net balance</div>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatMm(netWaterBalance)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14, paddingBottom: 10 }}>
            <div className="card-head">
              <div className="card-title">Irrigation adjustment · next 7 days</div>
              <div style={{ display: 'flex', gap: 9, fontSize: 11.5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--primary)' }} />Normal</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />Reduce</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--danger)' }} />Increase</span>
              </div>
            </div>
            <IrrigationAdjustmentChart daily={primaryDailyPlan} />
          </div>
        </div>
      </ApiState>
    </Frame>
  );
}

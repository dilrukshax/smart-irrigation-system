/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { Icon, Chip, Sparkline, BarChart, Progress } from '@/components/asi/ui';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost, ApiError } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types matching the backend response shape (services/irrigation_service/
// app/api/farmer_irrigation.py :: FarmerIrrigationSummary)
// ---------------------------------------------------------------------------

interface SummaryField {
  field_id: string;
  field_name: string;
  crop_type: string;
  soil_type?: string | null;
  area_hectares: number;
  scheme_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  device_id?: string | null;
  lifecycle_state: string;
  pairing_status: string;
  auto_control_enabled: boolean;
  soil_moisture_min_pct: number;
  soil_moisture_optimal_pct: number;
  soil_moisture_max_pct: number;
  soil_moisture_critical_pct: number;
  water_level_min_pct: number;
  water_level_optimal_pct: number;
  water_level_max_pct: number;
  water_level_critical_pct: number;
}

interface SummaryReadings {
  soil_moisture_pct: number | null;
  water_level_pct: number | null;
  soil_status: string;
  water_status: string;
  overall_status: string;
  sensor_connected: boolean;
  observed_at: string | null;
  rssi: number | null;
  battery_v: number | null;
  device_id: string | null;
  valve_status: string | null;
  valve_position_pct: number | null;
  last_valve_action: string | null;
  status: string;
  source: string;
  is_live: boolean;
  staleness_sec: number | null;
  quality: string;
  data_available: boolean;
  message: string | null;
}

interface SummaryAutoDecision {
  available: boolean;
  action: string | null;
  valve_position_pct: number | null;
  reason: string | null;
  priority: string | null;
  timestamp: string | null;
  forecast_adjustment_pct: number | null;
  stress_penalty_factor: number | null;
  effective_water_level_min_pct: number | null;
  effective_soil_moisture_min_pct: number | null;
  blocked: boolean;
  blocked_reason: string | null;
  policy_id: string | null;
  policy_version: number | null;
  quota_remaining_mcm: number | null;
  message: string | null;
}

interface SummaryWeekDay {
  date: string;
  expected_rain_mm: number;
  expected_evapotranspiration_mm: number;
  water_balance_mm: number;
  recommendation: string;
  irrigation_percent: number;
}

interface SummaryWeekPlan {
  available: boolean;
  overall_recommendation: string | null;
  weekly_outlook: {
    total_expected_rain_mm: number | null;
    total_expected_evapotranspiration_mm: number | null;
    net_water_balance_mm: number | null;
    rainy_days_expected: number | null;
    average_irrigation_adjustment_percent: number | null;
  } | null;
  daily: SummaryWeekDay[];
  generated_at: string | null;
  source: string | null;
  message: string | null;
}

interface SummaryDevice {
  device_id: string;
  pairing_status: string;
  is_online: boolean | null;
  last_seen: string | null;
  soil_moisture_pct: number | null;
  water_level_pct: number | null;
  rssi: number | null;
  battery_v: number | null;
  is_primary: boolean;
  confirmed_at: string | null;
}

interface SummaryDeviceList {
  count: number;
  online_count: number;
  items: SummaryDevice[];
  iot_service_available: boolean;
  message: string | null;
}

interface SummaryPendingRequest {
  request_id: string;
  requested_action: string;
  requested_position_pct: number;
  status: string;
  reason: string | null;
  created_at: string | null;
}

interface FarmerIrrigationSummary {
  field: SummaryField;
  readings: SummaryReadings;
  auto_decision: SummaryAutoDecision;
  week_plan: SummaryWeekPlan | null;
  devices: SummaryDeviceList;
  manual_requests: { latest_pending: SummaryPendingRequest | null };
  status: string;
  source: string;
  is_live: boolean;
  observed_at: string | null;
  staleness_sec: number | null;
  quality: string;
  data_available: boolean;
  message: string | null;
}

interface PairingResponse {
  pairing_id: string;
  field_id: string;
  device_id: string;
  status: string;
  challenge_code: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const formatPct = (v: any, digits = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
};

const formatMm = (v: any, digits = 1) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(digits)} mm` : '—';
};

const formatVolts = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(2)} V` : '—';
};

const formatRssi = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n} dBm` : '—';
};

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString();
};

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

const recommendationKind = (recommendation: string): 'live' | 'warn' | 'crit' | 'info' => {
  const norm = String(recommendation || '').toUpperCase();
  if (norm === 'SKIP') return 'live';
  if (norm === 'REDUCE') return 'info';
  if (norm === 'NORMAL') return 'info';
  if (norm === 'INCREASE') return 'warn';
  return 'info';
};

const sensorStatusKind = (status: string, sensorConnected: boolean): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  if (!sensorConnected) return 'off';
  const norm = String(status || '').toUpperCase();
  if (['CRITICAL', 'EXCESS', 'SATURATED'].includes(norm)) return 'crit';
  if (['LOW', 'HIGH', 'DRY', 'WET', 'WARNING'].includes(norm)) return 'warn';
  if (['OPTIMAL', 'OK'].includes(norm)) return 'live';
  return 'info';
};

const actionKind = (action: string | null, blocked: boolean): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  if (blocked) return 'crit';
  const norm = String(action || '').toUpperCase();
  if (norm === 'OPEN') return 'live';
  if (norm === 'CLOSE') return 'info';
  if (norm === 'HOLD') return 'warn';
  return 'off';
};

const priorityKind = (priority: string | null): 'live' | 'warn' | 'crit' | 'info' => {
  const norm = String(priority || '').toLowerCase();
  if (norm === 'critical') return 'crit';
  if (norm === 'high') return 'warn';
  if (norm === 'low') return 'live';
  return 'info';
};

// ---------------------------------------------------------------------------
// sessionStorage cache (30 s TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000;

interface CachedSummary {
  fetchedAt: number;
  payload: FarmerIrrigationSummary;
}

function readCache(fieldId: string): FarmerIrrigationSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`irrigation-summary-${fieldId}`);
    if (!raw) return null;
    const parsed: CachedSummary = JSON.parse(raw);
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache(fieldId: string, payload: FarmerIrrigationSummary) {
  if (typeof window === 'undefined') return;
  try {
    const value: CachedSummary = { fetchedAt: Date.now(), payload };
    window.sessionStorage.setItem(`irrigation-summary-${fieldId}`, JSON.stringify(value));
  } catch {
    // sessionStorage may be full or disabled — ignore.
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface IrrigationPanelProps {
  fieldId: string;
  fieldStatus?: any;
  onRefresh?: () => void;
}

export function IrrigationPanel({ fieldId, fieldStatus, onRefresh }: IrrigationPanelProps) {
  const [summary, setSummary] = React.useState<FarmerIrrigationSummary | null>(() => readCache(fieldId));
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(!readCache(fieldId));
  const [error, setError] = React.useState<string | null>(null);

  // Manual request form
  const [requestVolume, setRequestVolume] = React.useState('25');
  const [requestReason, setRequestReason] = React.useState('');
  const [requestSubmitting, setRequestSubmitting] = React.useState(false);
  const [requestMsg, setRequestMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pairing modal
  const [pairingOpen, setPairingOpen] = React.useState(false);
  const [pairingDeviceId, setPairingDeviceId] = React.useState('');
  const [pairingSession, setPairingSession] = React.useState<PairingResponse | null>(null);
  const [pairingError, setPairingError] = React.useState<string | null>(null);
  const [pairingTtlSec, setPairingTtlSec] = React.useState<number | null>(null);
  const [pairingInitiating, setPairingInitiating] = React.useState(false);

  const loadSummary = React.useCallback(async (silent = false) => {
    if (!fieldId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        apiGet<FarmerIrrigationSummary>(`/irrigation/farmer/fields/${fieldId}/summary`),
        apiGet<any>(`/irrigation/farmer/fields/${fieldId}/history?limit=24`).catch(() => ({ readings: [] })),
      ]);
      setSummary(summaryRes);
      writeCache(fieldId, summaryRes);
      setHistory(Array.isArray(historyRes?.readings) ? historyRes.readings : []);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Field not found');
      } else {
        setError(err?.message || 'Failed to load irrigation data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fieldId]);

  // Initial load + 60s background refresh while tab is visible
  React.useEffect(() => {
    loadSummary(false);
  }, [loadSummary]);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') {
        loadSummary(true);
      }
    };
    const handle = window.setInterval(tick, 60_000);
    return () => window.clearInterval(handle);
  }, [loadSummary]);

  // Manual request submit
  const handleManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setRequestMsg({ type: 'error', text: 'Please provide a reason for the request.' });
      return;
    }
    setRequestSubmitting(true);
    setRequestMsg(null);
    try {
      const positionPct = Math.max(0, Math.min(100, Number.parseInt(requestVolume, 10) || 100));
      await apiPost(`/irrigation/fields/${fieldId}/manual-requests`, {
        requested_action: 'OPEN',
        requested_position_pct: positionPct,
        reason: requestReason,
      });
      setRequestMsg({ type: 'success', text: 'Request submitted to officer for review.' });
      setRequestReason('');
      await loadSummary(true);
      onRefresh?.();
    } catch (err: any) {
      setRequestMsg({ type: 'error', text: err?.message || 'Failed to submit request' });
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Pairing modal lifecycle
  const openPairingModal = () => {
    setPairingOpen(true);
    setPairingDeviceId('');
    setPairingSession(null);
    setPairingError(null);
    setPairingTtlSec(null);
  };

  const closePairingModal = () => {
    setPairingOpen(false);
    setPairingSession(null);
    setPairingError(null);
    setPairingTtlSec(null);
  };

  const initiatePairing = async () => {
    const deviceId = pairingDeviceId.trim();
    if (!deviceId) {
      setPairingError('Enter a device ID first.');
      return;
    }
    setPairingInitiating(true);
    setPairingError(null);
    try {
      const res = await apiPost<PairingResponse>(`/devices/pairing/initiate`, {
        field_id: fieldId,
        device_id: deviceId,
      });
      setPairingSession(res);
      const expiresAt = new Date(res.expires_at).getTime();
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setPairingTtlSec(remaining || 1200);
    } catch (err: any) {
      setPairingError(err?.message || 'Failed to initiate pairing');
    } finally {
      setPairingInitiating(false);
    }
  };

  // Poll pairing status while modal is open and a session exists
  React.useEffect(() => {
    if (!pairingOpen || !pairingSession) return;
    if (pairingSession.status === 'CONFIRMED') return;

    let cancelled = false;
    const handle = window.setInterval(async () => {
      if (cancelled) return;
      // Decrement TTL
      setPairingTtlSec((prev) => (prev !== null && prev > 0 ? prev - 3 : 0));
      try {
        const res = await apiGet<PairingResponse>(`/devices/pairing/${pairingSession.pairing_id}`);
        if (cancelled) return;
        setPairingSession(res);
        if (res.status === 'CONFIRMED') {
          window.clearInterval(handle);
          await loadSummary(true);
          onRefresh?.();
        }
      } catch {
        // transient error — keep polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [pairingOpen, pairingSession, loadSummary, onRefresh]);

  // ----- Derived view-model -----
  const field = summary?.field;
  const readings = summary?.readings;
  const decision = summary?.auto_decision;
  const weekPlan = summary?.week_plan;
  const devices = summary?.devices;
  const pending = summary?.manual_requests?.latest_pending;

  const soilSeries = React.useMemo(() => {
    if (!history.length) return [0, 0, 0, 0, 0, 0];
    return history.slice(0, 6).reverse().map((r: any) => Number(r?.soil_moisture_pct ?? 0));
  }, [history]);

  const waterSeries = React.useMemo(() => {
    if (!history.length) return [0, 0, 0, 0, 0, 0];
    return history.slice(0, 6).reverse().map((r: any) => Number(r?.water_level_pct ?? 0));
  }, [history]);

  const weekChartRain = (weekPlan?.daily || []).map((d) => Number(d.expected_rain_mm) || 0);
  const weekChartEt = (weekPlan?.daily || []).map((d) => Number(d.expected_evapotranspiration_mm) || 0);
  const weekChartLabels = (weekPlan?.daily || []).map((d) => {
    const date = new Date(d.date);
    return Number.isNaN(date.getTime()) ? d.date : date.toLocaleDateString(undefined, { weekday: 'short' });
  });

  return (
    <ApiState loading={loading && !summary} error={error} onRetry={() => loadSummary(false)}>
      {summary && (
        <div className="irrigation-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ----- KPI strip (4 cards) ----- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            <KpiCard
              label="Soil moisture"
              icon="humidity"
              value={readings?.soil_moisture_pct !== null && readings?.soil_moisture_pct !== undefined ? formatPct(readings.soil_moisture_pct) : '—'}
              chip={{
                kind: sensorStatusKind(readings?.soil_status, readings?.sensor_connected),
                text: readings?.soil_status || 'UNKNOWN',
              }}
              caption={`Optimal ${formatPct(field?.soil_moisture_optimal_pct)}`}
              series={soilSeries}
            />
            <KpiCard
              label="Water level"
              icon="droplet"
              value={readings?.water_level_pct !== null && readings?.water_level_pct !== undefined ? formatPct(readings.water_level_pct) : '—'}
              chip={{
                kind: sensorStatusKind(readings?.water_status, readings?.sensor_connected),
                text: readings?.water_status || 'UNKNOWN',
              }}
              caption={`Optimal ${formatPct(field?.water_level_optimal_pct)}`}
              series={waterSeries}
            />
            <KpiCard
              label="Auto decision"
              icon="valve"
              value={decision?.available ? (decision.action || '—') : 'No data'}
              chip={
                decision?.available
                  ? {
                      kind: actionKind(decision.action, decision.blocked),
                      text: decision.blocked ? 'Blocked' : decision.priority || 'OK',
                    }
                  : { kind: 'off', text: 'Unavailable' }
              }
              caption={
                decision?.available && decision.valve_position_pct !== null
                  ? `Valve target ${decision.valve_position_pct}%`
                  : decision?.message || 'Awaiting telemetry'
              }
            />
            <KpiCard
              label="Sensor freshness"
              icon="wifi"
              value={readings?.observed_at ? formatRelative(readings.observed_at) : 'No data'}
              chip={{
                kind: readings?.is_live ? 'live' : 'off',
                text: readings?.quality || 'unknown',
              }}
              caption={readings?.device_id ? `Device ${readings.device_id}` : 'No device paired'}
            />
          </div>

          {/* ----- Auto decision card ----- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="valve" size={14} color="var(--primary-600)" /> Auto irrigation decision
              </div>
              {decision?.available && (
                <Chip kind={actionKind(decision.action, decision.blocked)} dot={false}>
                  {decision.blocked ? 'POLICY BLOCKED' : decision.action || '—'}
                </Chip>
              )}
            </div>

            {decision?.available ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                <div
                  style={{
                    padding: 14,
                    background: decision.blocked ? 'var(--danger-50, #FEE2E2)' : 'var(--primary-50)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: decision.blocked ? '#B91C1C' : 'var(--primary-600)' }}>
                    DECISION · {decision.priority?.toUpperCase() || '—'}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                    {decision.action} {decision.valve_position_pct !== null ? `· valve ${decision.valve_position_pct}%` : ''}
                  </div>
                  {decision.reason && (
                    <div className="tiny muted" style={{ marginTop: 4 }}>{decision.reason}</div>
                  )}
                </div>

                {decision.valve_position_pct !== null && (
                  <Progress value={decision.valve_position_pct ?? 0} max={100} label="Recommended valve opening" />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {decision.forecast_adjustment_pct !== null && (
                    <Chip kind="info" dot={false}>
                      Forecast adj: {Math.round(decision.forecast_adjustment_pct)}%
                    </Chip>
                  )}
                  {decision.stress_penalty_factor !== null && (
                    <Chip
                      kind={Number(decision.stress_penalty_factor) > 0 ? 'warn' : 'info'}
                      dot={false}
                    >
                      Stress penalty: {(Number(decision.stress_penalty_factor) * 100).toFixed(0)}%
                    </Chip>
                  )}
                  <Chip kind={priorityKind(decision.priority)} dot={false}>
                    Priority: {decision.priority || '—'}
                  </Chip>
                </div>

                {decision.blocked && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: '#FEE2E2',
                      border: '1px solid #FECACA',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#B91C1C' }}>
                      Blocked by authority policy
                    </div>
                    <div className="tiny" style={{ marginTop: 4, color: '#7F1D1D' }}>
                      {decision.blocked_reason || 'Submit a manual request below for officer review.'}
                    </div>
                    {(decision.policy_id || decision.quota_remaining_mcm !== null) && (
                      <div className="tiny muted" style={{ marginTop: 4 }}>
                        {decision.policy_id ? `Policy ${decision.policy_id}` : ''}
                        {decision.policy_version ? ` (v${decision.policy_version})` : ''}
                        {decision.quota_remaining_mcm !== null ? ` · quota left ${decision.quota_remaining_mcm.toFixed(2)} MCM` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="tiny muted" style={{ marginTop: 10 }}>
                {decision?.message || 'No recent auto decision available — telemetry required.'}
              </div>
            )}
          </div>

          {/* ----- 7-day water plan card ----- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="cloud" size={14} color="var(--primary-600)" /> 7-day water plan
              </div>
              {weekPlan?.available && weekPlan.overall_recommendation && (
                <Chip kind={recommendationKind(weekPlan.overall_recommendation)} dot={false}>
                  {weekPlan.overall_recommendation}
                </Chip>
              )}
            </div>

            {weekPlan?.available ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                {weekPlan.weekly_outlook && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 8,
                      padding: 10,
                      background: 'var(--bg)',
                      borderRadius: 8,
                    }}
                  >
                    <OutlookStat label="Total rain" value={formatMm(weekPlan.weekly_outlook.total_expected_rain_mm)} />
                    <OutlookStat
                      label="Total ET"
                      value={formatMm(weekPlan.weekly_outlook.total_expected_evapotranspiration_mm)}
                    />
                    <OutlookStat
                      label="Net balance"
                      value={formatMm(weekPlan.weekly_outlook.net_water_balance_mm)}
                    />
                    <OutlookStat
                      label="Rainy days"
                      value={
                        weekPlan.weekly_outlook.rainy_days_expected !== null
                          ? `${weekPlan.weekly_outlook.rainy_days_expected}`
                          : '—'
                      }
                    />
                  </div>
                )}

                {weekPlan.daily.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <div className="tiny muted" style={{ marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--primary)', borderRadius: 2, marginRight: 6, verticalAlign: 'middle' }} />
                      Rain (mm)
                      <span style={{ display: 'inline-block', width: 10, height: 10, background: '#F59E0B', borderRadius: 2, margin: '0 6px 0 14px', verticalAlign: 'middle' }} />
                      Evapotranspiration (mm)
                    </div>
                    <BarChart
                      data={[weekChartRain, weekChartEt]}
                      labels={weekChartLabels}
                      width={Math.max(420, weekPlan.daily.length * 70)}
                      height={160}
                      stacked
                      color={['var(--primary)', '#F59E0B']}
                    />
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table className="week-plan-table" style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                        <th style={{ padding: '6px 8px' }}>Date</th>
                        <th style={{ padding: '6px 8px' }}>Rain</th>
                        <th style={{ padding: '6px 8px' }}>ET</th>
                        <th style={{ padding: '6px 8px' }}>Balance</th>
                        <th style={{ padding: '6px 8px' }}>Recommendation</th>
                        <th style={{ padding: '6px 8px' }}>Irrigation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekPlan.daily.map((day) => {
                        const balance = Number(day.water_balance_mm);
                        const balanceColor = balance >= 0 ? 'var(--primary-600)' : '#B45309';
                        return (
                          <tr key={day.date} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px' }}>{formatShortDate(day.date)}</td>
                            <td style={{ padding: '8px' }}>{formatMm(day.expected_rain_mm)}</td>
                            <td style={{ padding: '8px' }}>{formatMm(day.expected_evapotranspiration_mm)}</td>
                            <td style={{ padding: '8px', color: balanceColor, fontWeight: 600 }}>
                              {balance >= 0 ? '+' : ''}{formatMm(day.water_balance_mm)}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <Chip kind={recommendationKind(day.recommendation)} dot={false}>{day.recommendation}</Chip>
                            </td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{day.irrigation_percent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="tiny muted">
                  Estimate: balance is rain − ET. Final irrigation volume depends on crop Kc and field conditions.
                  {weekPlan.source && ` · Source: ${weekPlan.source}`}
                </div>
              </div>
            ) : (
              <div className="tiny muted" style={{ marginTop: 10 }}>
                {weekPlan?.message || 'Forecast unavailable. Try again in a few minutes.'}
              </div>
            )}
          </div>

          {/* ----- Connected devices card ----- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="wifi" size={14} color="var(--primary-600)" /> Connected devices · {devices?.count ?? 0}
              </div>
              <button className="btn btn-primary btn-sm" type="button" onClick={openPairingModal}>
                <Icon name="flash" size={12} color="white" /> Add device
              </button>
            </div>

            {!devices?.iot_service_available && (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 6,
                  fontSize: 11.5,
                  color: '#92400E',
                }}
              >
                Live device telemetry unavailable. Pairing data is shown without online status.
              </div>
            )}

            {devices && devices.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {devices.items.map((device) => {
                  const onlineKind: 'live' | 'off' | 'info' =
                    device.is_online === true ? 'live' : device.is_online === false ? 'off' : 'info';
                  return (
                    <div
                      key={device.device_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background:
                            device.is_online === true
                              ? 'var(--primary)'
                              : device.is_online === false
                              ? '#9CA3AF'
                              : '#D1D5DB',
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {device.device_id}
                          {device.is_primary && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--primary-600)',
                                background: 'var(--primary-50)',
                                padding: '2px 6px',
                                borderRadius: 99,
                              }}
                            >
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          {device.is_online === true
                            ? 'Online'
                            : device.is_online === false
                            ? `Offline · last seen ${formatRelative(device.last_seen)}`
                            : 'Live status unknown'}
                          {' · '}Pairing: {device.pairing_status}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                        {device.soil_moisture_pct !== null && (
                          <Chip kind="info" dot={false}>Soil {formatPct(device.soil_moisture_pct)}</Chip>
                        )}
                        {device.water_level_pct !== null && (
                          <Chip kind="info" dot={false}>Water {formatPct(device.water_level_pct)}</Chip>
                        )}
                        {device.rssi !== null && (
                          <Chip kind="info" dot={false}>{formatRssi(device.rssi)}</Chip>
                        )}
                        {device.battery_v !== null && (
                          <Chip kind={Number(device.battery_v) < 3.3 ? 'warn' : 'info'} dot={false}>
                            {formatVolts(device.battery_v)}
                          </Chip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tiny muted" style={{ marginTop: 10 }}>
                No devices paired yet. Click <b>Add device</b> to start.
              </div>
            )}
          </div>

          {/* ----- Manual irrigation request card ----- */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="droplet" size={14} color="var(--primary-600)" /> Manual irrigation request
              </div>
            </div>

            {pending && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  fontSize: 12.5,
                }}
              >
                <div style={{ fontWeight: 600, color: '#92400E' }}>
                  Pending request · valve {pending.requested_position_pct}%
                </div>
                <div className="tiny" style={{ marginTop: 4, color: '#78350F' }}>
                  {pending.reason || 'Awaiting officer review.'}{' '}
                  · Submitted {formatRelative(pending.created_at)}
                </div>
              </div>
            )}

            <form onSubmit={handleManualRequest} style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 10,
                }}
              >
                <div className="field">
                  <label>Requested valve opening (%)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="100"
                    value={requestVolume}
                    onChange={(e) => setRequestVolume(e.target.value)}
                    disabled={requestSubmitting}
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Reason</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Describe why you need extra irrigation…"
                    disabled={requestSubmitting}
                  />
                </div>
              </div>
              {requestMsg && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: requestMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    border: `1px solid ${requestMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                    borderRadius: 6,
                    color: requestMsg.type === 'success' ? '#166534' : '#DC2626',
                    fontSize: 12,
                  }}
                >
                  {requestMsg.text}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 10, width: '100%' }}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? 'Submitting…' : 'Submit to officer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----- Pairing modal ----- */}
      {pairingOpen && (
        <PairingModal
          deviceId={pairingDeviceId}
          onDeviceIdChange={setPairingDeviceId}
          session={pairingSession}
          ttlSec={pairingTtlSec}
          error={pairingError}
          initiating={pairingInitiating}
          onInitiate={initiatePairing}
          onClose={closePairingModal}
        />
      )}
    </ApiState>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  icon: string;
  value: string;
  caption?: string;
  series?: number[];
  chip?: { kind: 'live' | 'warn' | 'crit' | 'info' | 'off'; text: string };
}

function KpiCard({ label, icon, value, caption, series, chip }: KpiCardProps) {
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
      {series && series.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={series} width={120} height={28} color="var(--primary)" fill={false} />
        </div>
      )}
    </div>
  );
}

function OutlookStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tiny muted">{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}

interface PairingModalProps {
  deviceId: string;
  onDeviceIdChange: (value: string) => void;
  session: PairingResponse | null;
  ttlSec: number | null;
  error: string | null;
  initiating: boolean;
  onInitiate: () => void;
  onClose: () => void;
}

function PairingModal({
  deviceId,
  onDeviceIdChange,
  session,
  ttlSec,
  error,
  initiating,
  onInitiate,
  onClose,
}: PairingModalProps) {
  const isConfirmed = session?.status === 'CONFIRMED';
  const ttlMin = ttlSec !== null ? Math.floor(ttlSec / 60) : null;
  const ttlSecRem = ttlSec !== null ? ttlSec % 60 : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 460, width: '100%', padding: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-head">
          <div className="card-title">Pair a new device</div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!session ? (
          <div style={{ marginTop: 12 }}>
            <div className="tiny muted" style={{ marginBottom: 10 }}>
              Enter the ESP32 device ID printed on the unit. After initiation, the
              device must complete the handshake within ~20 minutes.
            </div>
            <div className="field">
              <label>Device ID</label>
              <input
                className="input"
                type="text"
                value={deviceId}
                onChange={(e) => onDeviceIdChange(e.target.value)}
                placeholder="e.g. esp-01"
                disabled={initiating}
              />
            </div>
            {error && (
              <div
                style={{
                  marginTop: 10,
                  padding: 8,
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: 6,
                  color: '#DC2626',
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, width: '100%' }}
              onClick={onInitiate}
              disabled={initiating}
            >
              {initiating ? 'Initiating…' : 'Generate pairing code'}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <div className="tiny muted" style={{ marginBottom: 6 }}>
              Enter this code on device <b>{session.device_id}</b>
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: 6,
                color: 'var(--primary-600)',
                background: 'var(--primary-50)',
                padding: '14px 0',
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              {session.challenge_code}
            </div>

            {isConfirmed ? (
              <div
                style={{
                  padding: 10,
                  background: '#DCFCE7',
                  border: '1px solid #86EFAC',
                  borderRadius: 6,
                  color: '#166534',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Device paired successfully.
              </div>
            ) : (
              <div className="tiny muted">
                Waiting for device handshake…
                {ttlSec !== null && (
                  <> · expires in {ttlMin}:{String(ttlSecRem).padStart(2, '0')}</>
                )}
              </div>
            )}

            <button
              type="button"
              className={isConfirmed ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ marginTop: 14, width: '100%' }}
              onClick={onClose}
            >
              {isConfirmed ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

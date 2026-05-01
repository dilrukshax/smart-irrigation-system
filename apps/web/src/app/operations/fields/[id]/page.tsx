/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon, Chip, Frame, Progress } from '@/components/asi/ui';
import { buildOfficerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const asNumber = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatArea = (value: any) => {
  const n = asNumber(value);
  return n === null ? '0 ha' : `${n.toFixed(2).replace(/\.00$/, '')} ha`;
};

const formatPct = (value: any, digits = 0) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)}%`;
};

const formatMm = (value: any, digits = 1) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)} mm`;
};

const statusKind = (value: any): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const text = String(value || '').toLowerCase();
  if (['critical', 'high', 'source_unavailable'].includes(text)) return 'crit';
  if (['warning', 'stale', 'medium', 'degraded'].includes(text)) return 'warn';
  if (['ok', 'healthy', 'low', 'live'].includes(text)) return 'live';
  if (['data_unavailable', 'unknown', 'no_sensor'].includes(text)) return 'off';
  return 'info';
};

function SectionShell({ title, icon, status, children, href }: any) {
  return (
    <div className="card">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={16}/>
          <div className="card-title">{title}</div>
        </div>
        <Chip kind={statusKind(status)}>{status || 'unknown'}</Chip>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
      {href && (
        <Link href={href} className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12 }}>
          Open module
        </Link>
      )}
    </div>
  );
}

export default function Page() {
  const params = useParams();
  const fieldId = decodeURIComponent(String(params?.id || ''));
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!fieldId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>(`/farm/fields/${encodeURIComponent(fieldId)}/profile`);
      setProfile(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field workspace');
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const f1 = profile?.sections?.f1 || {};
  const f2 = profile?.sections?.f2 || {};
  const f3 = profile?.sections?.f3 || {};
  const f4 = profile?.sections?.f4 || {};
  const field = f1.field_status || {};
  const decision = f1.auto_decision || {};
  const stress = f2.stress_summary || {};
  const weather = f3.weather_summary || {};
  const irrigationRecommendation = f3.irrigation_recommendation || {};
  const recommendationSummary = f4.recommendation_summary || {};
  const income = f4.income_projection || {};
  const market = f4.market_snapshot || {};
  const recommendations = f4.recommendations?.data?.[0]?.recommendations || f4.recommendations?.recommendations || [];
  const topCrop = recommendations[0] || {};
  const fieldName = field.field_name || `Field ${fieldId}`;
  const valveOpen = String(field.valve_status || '').toUpperCase() === 'OPEN';
  const displayName = user?.username || 'Officer';
  const nav = buildOfficerNav('Farmers');

  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Frame sidebar={nav} breadcrumb={['Operations', 'Field Detail', fieldName]} user={displayName} role="Officer">
        <div className="page-head">
          <div>
            <div className="page-title">{fieldName}</div>
            <div className="page-sub">{field.crop_type || 'Unassigned crop'} · {formatArea(field.area_hectares)} · {field.scheme_id || 'No scheme'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {field.owner_id && <Link href={`/operations/farmers/${encodeURIComponent(field.owner_id)}`} className="btn btn-ghost btn-sm">Farmer</Link>}
            <button className="btn btn-ghost btn-sm" onClick={loadProfile}><Icon name="download" size={13}/> Refresh</button>
          </div>
        </div>

        <ApiState loading={loading && !profile} error={error} onRetry={loadProfile}>
          {profile?.partial_failure && (
            <div style={{ background: 'white', border: '1px solid #F2D6A5', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12.5 }}>
              Some service sections are degraded: {(profile.errors || []).slice(0, 2).join(' · ')}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="metric"><div className="metric-label">Soil moisture</div><div className="metric-value">{formatPct(field.current_soil_moisture_pct)}</div></div>
            <div className="metric"><div className="metric-label">Water level</div><div className="metric-value">{formatPct(field.current_water_level_pct)}</div></div>
            <div className="metric"><div className="metric-label">Valve</div><div className="metric-value">{valveOpen ? 'Open' : 'Closed'}</div></div>
            <div className="metric"><div className="metric-label">Health</div><div className="metric-value">{stress.priority || stress.risk_level || 'Unknown'}</div></div>
            <div className="metric"><div className="metric-label">Recommended crop</div><div className="metric-value">{recommendationSummary.crop_name || topCrop.crop_name || '-'}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <SectionShell title="Irrigation" icon="droplet" status={f1.status || field.overall_status} href="/irrigation">
              <div className="between small"><span className="muted">Auto decision</span><b>{decision.action || decision.decision || 'Unavailable'}</b></div>
              <div className="between small"><span className="muted">Valve position</span><b>{formatPct(field.valve_position_pct)}</b></div>
              <div style={{ marginTop: 10 }}>
                <Progress value={asNumber(field.current_soil_moisture_pct) || 0} label="Soil moisture" color="var(--primary)"/>
              </div>
              <div className="tiny muted" style={{ marginTop: 10 }}>{decision.reason || field.message || 'Decision details unavailable'}</div>
            </SectionShell>

            <SectionShell title="Forecasting" icon="cloud" status={f3.status} href="/forecasting">
              <div className="between small"><span className="muted">Recommendation</span><b>{irrigationRecommendation.overall_recommendation || irrigationRecommendation.recommendation || '-'}</b></div>
              <div className="between small"><span className="muted">Rainfall</span><b>{formatMm(weather.rainfall_mm ?? irrigationRecommendation.weekly_outlook?.total_expected_rain_mm)}</b></div>
              <div className="between small"><span className="muted">Adjustment</span><b>{formatPct(irrigationRecommendation.weekly_outlook?.average_irrigation_adjustment_percent)}</b></div>
              <div className="tiny muted" style={{ marginTop: 10 }}>{f3.message || weather.source || 'Forecasting service summary'}</div>
            </SectionShell>

            <SectionShell title="Crop Health" icon="shield_check" status={f2.status || stress.priority} href="/crop-health">
              <div className="between small"><span className="muted">Stress index</span><b>{formatPct((stress.stress_index ?? stress.stress_score) * 100)}</b></div>
              <div className="between small"><span className="muted">Penalty factor</span><b>{formatPct((stress.stress_penalty_factor || 0) * 100)}</b></div>
              <div className="between small"><span className="muted">Recommended action</span><b>{stress.recommended_action || '-'}</b></div>
              <div className="tiny muted" style={{ marginTop: 10 }}>{stress.message || f2.message || 'Field stress summary'}</div>
            </SectionShell>

            <SectionShell title="Optimization" icon="target" status={f4.status} href="/optimization">
              <div className="between small"><span className="muted">Top crop</span><b>{recommendationSummary.crop_name || topCrop.crop_name || '-'}</b></div>
              <div className="between small"><span className="muted">Profit / ha</span><b>{income.expected_profit_per_ha ? `LKR ${Math.round(income.expected_profit_per_ha).toLocaleString()}` : '-'}</b></div>
              <div className="between small"><span className="muted">Predicted price</span><b>{market.predicted_price_per_kg ? `LKR ${Math.round(market.predicted_price_per_kg)}/kg` : '-'}</b></div>
              <div className="tiny muted" style={{ marginTop: 10 }}>{f4.message || 'Crop, income, market, and water-budget view'}</div>
            </SectionShell>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <div className="card-title">Field registration detail</div>
              <Chip kind={statusKind(field.lifecycle_state)}>{field.lifecycle_state || 'CONFIGURED'}</Chip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 12.5, marginTop: 10 }}>
              <div><div className="tiny muted">Owner</div><b>{field.owner_id || '-'}</b></div>
              <div><div className="tiny muted">Device</div><b>{field.device_id || '-'}</b></div>
              <div><div className="tiny muted">Location</div><b>{field.location_name || '-'}</b></div>
              <div><div className="tiny muted">Coordinates</div><b>{field.latitude && field.longitude ? `${Number(field.latitude).toFixed(3)}, ${Number(field.longitude).toFixed(3)}` : '-'}</b></div>
              <div><div className="tiny muted">Soil type</div><b>{field.soil_type || '-'}</b></div>
              <div><div className="tiny muted">Auto control</div><b>{field.auto_control_enabled ? 'Enabled' : 'Disabled'}</b></div>
            </div>
          </div>
        </ApiState>
      </Frame>
    </div>
  );
}

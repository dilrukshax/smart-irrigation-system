/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon, Chip, Frame } from '@/components/asi/ui';
import { officerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const asNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatArea = (value: any) => `${asNumber(value).toFixed(2).replace(/\.00$/, '')} ha`;
const formatPct = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(0)}%` : '-';
const statusKind = (value: any) => {
  const text = String(value || '').toUpperCase();
  if (text === 'CRITICAL') return 'crit';
  if (['WARNING', 'IRRIGATING', 'LOW', 'DRY'].includes(text)) return 'warn';
  if (['OK', 'OPTIMAL'].includes(text)) return 'live';
  return 'off';
};

const nav = officerNav.map((group: any) => ({
  ...group,
  items: group.items.map((item: any) => ({ ...item, active: item.name === 'Farmers' })),
}));

export default function Page() {
  const params = useParams();
  const farmerId = decodeURIComponent(String(params?.id || ''));
  const { user } = useAuth();
  const [detail, setDetail] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadDetail = React.useCallback(async () => {
    if (!farmerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>(`/farm/farmers/${encodeURIComponent(farmerId)}`);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load farmer detail');
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  React.useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const farmer = detail?.farmer || {};
  const fields = Array.isArray(detail?.fields) ? detail.fields : [];
  const displayName = user?.username || 'Officer';
  const openValves = asNumber(farmer.irrigation?.open_valves);
  const pendingRequests = asNumber(farmer.irrigation?.pending_manual_requests);
  const criticalFields = asNumber(farmer.telemetry?.critical_fields);
  const noTelemetry = asNumber(farmer.telemetry?.no_telemetry_fields);

  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Frame sidebar={nav} breadcrumb={['Operations', 'Farmers', farmer.display_name || farmerId]} user={displayName} role="Officer">
        <div className="page-head">
          <div>
            <div className="page-title">{farmer.display_name || 'Farmer detail'}</div>
            <div className="page-sub">{farmer.owner_id || 'Unassigned'} · {(farmer.scheme_ids || []).join(', ') || 'No scheme'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/operations/farmers" className="btn btn-ghost btn-sm">Back</Link>
            <button className="btn btn-ghost btn-sm" onClick={loadDetail}><Icon name="download" size={13}/> Refresh</button>
          </div>
        </div>

        <ApiState loading={loading && !detail} error={error} onRetry={loadDetail}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="metric"><div className="metric-label">Fields</div><div className="metric-value">{farmer.field_count || fields.length}</div></div>
            <div className="metric"><div className="metric-label">Total area</div><div className="metric-value">{formatArea(farmer.total_area_hectares)}</div></div>
            <div className="metric"><div className="metric-label">Open valves</div><div className="metric-value">{openValves}</div></div>
            <div className="metric"><div className="metric-label">Pending requests</div><div className="metric-value">{pendingRequests}</div></div>
            <div className="metric"><div className="metric-label">Needs attention</div><div className="metric-value">{criticalFields + noTelemetry}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              ['Irrigation', 'droplet', '/irrigation', `${openValves} valves open · ${pendingRequests} pending`],
              ['Forecasting', 'cloud', '/forecasting', 'Weather and reservoir forecast module'],
              ['Crop Health', 'shield_check', '/crop-health', `${criticalFields} critical field signals`],
              ['Optimization', 'target', '/optimization', `${(farmer.crop_types || []).join(', ') || 'Crop planning'}`],
            ].map(([title, icon, href, copy]: any) => (
              <Link key={title} href={href} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="card-head">
                  <div className="card-title">{title}</div>
                  <Icon name={icon} size={17}/>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.5 }}>{copy}</div>
              </Link>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Fields owned by this farmer</div>
            </div>
            {fields.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No fields registered for this farmer
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Crop</th>
                      <th>Area</th>
                      <th>Soil</th>
                      <th>Water</th>
                      <th>Valve</th>
                      <th>Status</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field: any) => {
                      const fieldId = field.field_id || field.id;
                      const latest = field.latest_telemetry || {};
                      const valve = field.valve_state || {};
                      const valveOpen = String(valve.status || '').toUpperCase() === 'OPEN';
                      return (
                        <tr key={fieldId}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{field.field_name || fieldId}</div>
                            <div className="tiny muted">{field.location_name || field.scheme_id || '-'}</div>
                          </td>
                          <td>{field.crop_type || '-'}</td>
                          <td className="tabular">{formatArea(field.area_hectares)}</td>
                          <td className="tabular">{formatPct(latest.soil_moisture_pct)}</td>
                          <td className="tabular">{formatPct(latest.water_level_pct)}</td>
                          <td><Chip kind={valveOpen ? 'live' : 'off'}>{valveOpen ? `Open ${valve.position_pct || 0}%` : 'Closed'}</Chip></td>
                          <td><Chip kind={statusKind(field.overall_status)}>{field.overall_status || 'NO_SENSOR'}</Chip></td>
                          <td>
                            <Link href={`/operations/fields/${encodeURIComponent(fieldId)}`} className="btn btn-primary btn-sm">
                              Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ApiState>
      </Frame>
    </div>
  );
}

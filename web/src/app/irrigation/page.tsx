/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
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

const IrrigationDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = React.useState<any>(null);
  const [networkState, setNetworkState] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, netRes] = await Promise.allSettled([
        apiGet<any>('/irrigation/officer-overview'),
        apiGet<any>('/irrigation/network/state'),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (netRes.status === 'fulfilled') setNetworkState(netRes.value);
      if (ovRes.status === 'rejected' && netRes.status === 'rejected') {
        setError((ovRes.reason as any)?.message || 'Failed to load irrigation data');
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

  const fields = overview?.fields || [];
  const totalFields = overview?.total_fields ?? fields.length;
  const onlineFields = overview?.online_fields ?? 0;
  const offlineFields = overview?.offline_fields ?? 0;
  const anomalies = overview?.anomalies || [];
  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={irrigationNav('over')}
      breadcrumb={['Modules', 'F1 · Irrigation', 'Overview']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Irrigation overview</div>
          <div className="page-sub">
            {totalFields} field{totalFields !== 1 ? 's' : ''} · {onlineFields} online · {offlineFields} offline
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
          <Link href="/irrigation/water" className="btn btn-primary btn-sm"><Icon name="valve" size={13}/> Water management</Link>
        </div>
      </div>

      <ApiState loading={loading && !overview} error={error} onRetry={loadData}>
        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #F2D6A5', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Icon name="bell" size={16} color="var(--accent)"/>
            <div style={{ fontSize: 12.5 }}>
              <b>{anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}:</b> {anomalies.slice(0, 3).map((a: any) => a.description || a.message).join(' · ')}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          {/* Field status table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Field status</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip kind="live">{onlineFields} online</Chip>
                {offlineFields > 0 && <Chip kind="off">{offlineFields} offline</Chip>}
              </div>
            </div>
            {fields.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No fields in your scheme
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Field</th><th>Device</th><th>Auto decision</th><th>Valve</th><th>Updated</th></tr></thead>
                <tbody>
                  {fields.map((f: any) => {
                    const fieldId = f.field_id || f.id;
                    const fieldName = f.field_name || fieldId;
                    const deviceId = f.device_id || '—';
                    const decision = f.auto_decision?.decision || f.decision || 'Unknown';
                    const valveOpen = String(f.valve_state?.state || '').toLowerCase() === 'open';
                    const updatedAt = f.latest_telemetry?.timestamp || f.updated_at;
                    const isStressed = (f.latest_telemetry?.soil_moisture_pct ?? 50) < 35;

                    return (
                      <tr key={fieldId}>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/farmer/field/${fieldId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {fieldName}
                          </Link>
                        </td>
                        <td className="muted">{deviceId}</td>
                        <td><Chip kind={isStressed ? 'crit' : 'live'}>{decision}</Chip></td>
                        <td><Chip kind={valveOpen ? 'live' : 'off'}>{valveOpen ? 'Open' : 'Closed'}</Chip></td>
                        <td className="muted small tabular">
                          {updatedAt ? new Date(updatedAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Network state */}
            <div className="card">
              <div className="card-head">
                <div className="card-title">Network state</div>
              </div>
              {networkState ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                  {networkState.total_nodes !== undefined && (
                    <div>Total nodes: <b>{networkState.total_nodes}</b></div>
                  )}
                  {networkState.active_canals !== undefined && (
                    <div>Active canals: <b>{networkState.active_canals}</b></div>
                  )}
                  {networkState.open_turnouts !== undefined && (
                    <div>Open turnouts: <b>{networkState.open_turnouts}</b></div>
                  )}
                  {networkState.source && (
                    <div>Source: <b>{networkState.source}</b></div>
                  )}
                </div>
              ) : (
                <div className="tiny muted">Network data unavailable</div>
              )}
              <div style={{ marginTop: 12 }}>
                <Link href="/operations/hydraulics" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                  View hydraulics →
                </Link>
              </div>
            </div>

            {/* Quick links */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Quick links</div>
              <Link href="/irrigation/water" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="droplet" size={13}/> Water management
              </Link>
              <Link href="/irrigation/telemetry" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="wave" size={13}/> Sensor telemetry
              </Link>
              <Link href="/operations/requests" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="bell" size={13}/> Manual requests
              </Link>
            </div>
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <IrrigationDashboard />
    </div>
  );
}

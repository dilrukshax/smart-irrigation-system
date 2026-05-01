/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import {
  Icon,
  Chip,
  Frame,
} from '@/components/asi/ui';
import { buildOfficerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const Operations = () => {
  const { user } = useAuth();
  const [overview, setOverview] = React.useState<any>(null);
  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, reqRes] = await Promise.allSettled([
        apiGet<any>('/irrigation/officer/overview'),
        apiGet<any>('/irrigation/manual-requests'),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (reqRes.status === 'fulfilled') {
        const list = Array.isArray(reqRes.value) ? reqRes.value : reqRes.value?.items || reqRes.value?.requests || reqRes.value?.data || [];
        setPendingRequests(list.filter((r: any) => r.status === 'PENDING' || r.status === 'pending'));
      }

      if (ovRes.status === 'rejected' && reqRes.status === 'rejected') {
        setError('Unable to load operations data');
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

  const displayName = user?.username || 'Officer';
  const schemeItems = Array.isArray(overview?.items) ? overview.items : [];
  const fieldsCount = overview?.total_fields ?? schemeItems.reduce((sum: number, item: any) => sum + Number(item.telemetry?.total_fields || 0), 0);
  const onlineCount = overview?.online_fields ?? schemeItems.reduce((sum: number, item: any) => sum + Number(item.telemetry?.fresh_fields || item.telemetry?.live_fields || 0), 0);
  const offlineCount = overview?.offline_fields ?? schemeItems.reduce((sum: number, item: any) => sum + Number(item.telemetry?.stale_fields || 0) + Number(item.telemetry?.no_telemetry_fields || 0), 0);
  const activeValves = overview?.active_valves ?? 0;
  const anomalies = overview?.anomalies || schemeItems
    .filter((item: any) => item.message || item.queue?.pending_requests > 0 || item.telemetry?.stale_fields > 0)
    .map((item: any) => ({
      type: item.queue?.pending_requests > 0 ? 'Requests' : 'Telemetry',
      severity: item.queue?.pending_requests > 0 ? 'warning' : 'info',
      field_name: item.scheme_id,
      description: item.message || item.queue?.message || item.telemetry?.message,
    }));
  const sidebar = buildOfficerNav('Overview', {
    'Manual Requests': pendingRequests.length || undefined,
    'Alert Queue': anomalies.length || undefined,
  });

  return (
    <Frame sidebar={sidebar} breadcrumb={['Operations', 'Overview']} user={displayName} role={`Officer · ${user?.scheme_ids?.[0] || 'H-04'}`}>
      <div className="page-head">
        <div>
          <div className="page-title">Operations overview</div>
          <div className="page-sub">Scheme-wide · {fieldsCount} active fields</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
        </div>
      </div>

      <ApiState loading={loading && !overview} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
          <div className="metric">
            <div className="metric-label">Active fields</div>
            <div className="metric-value">{fieldsCount}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Pending requests</div>
            <div className="metric-value">{pendingRequests.length}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Open alerts</div>
            <div className="metric-value">{anomalies.length}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Valves open</div>
            <div className="metric-value">{activeValves}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Online / Offline</div>
            <div className="metric-value" style={{ fontSize: 18 }}>{onlineCount} / {offlineCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Alerts</div>
              <Chip kind={anomalies.length > 0 ? 'crit' : 'live'}>{anomalies.length} open</Chip>
            </div>
            {anomalies.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No alerts at this time
              </div>
            ) : (
              anomalies.map((a: any, i: number) => (
                <div key={i} style={{ padding: '11px 0', borderBottom: i < anomalies.length - 1 ? '1px solid var(--line)' : 'none', display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, alignItems: 'center' }}>
                  <Chip kind={a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info'}>
                    {a.type || 'Alert'}
                  </Chip>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.field_name || a.title || '—'}</div>
                    <div className="tiny muted">{a.description || a.message || '—'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Pending manual requests</div>
                <Chip kind={pendingRequests.length > 0 ? 'warn' : 'live'}>{pendingRequests.length}</Chip>
              </div>
              {pendingRequests.slice(0, 5).map((r: any, i: number) => (
                <div key={r.request_id || i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: '8px 0', fontSize: 12, borderBottom: i < Math.min(pendingRequests.length - 1, 4) ? '1px dashed var(--line)' : 'none', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.field_name || r.field_id || '—'}</div>
                    <div className="tiny muted">{r.requested_action} · {r.reason?.slice(0, 40) || '—'}</div>
                  </div>
                  <div className="tiny muted">
                    {r.created_at ? new Date(r.created_at).toLocaleTimeString() : '—'}
                  </div>
                </div>
              ))}
              <Link href="/operations/requests" className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%' }}>
                Review all {pendingRequests.length} →
              </Link>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Quick links</div>
              <Link href="/operations/requests" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="bell" size={13}/> Manual requests
              </Link>
              <Link href="/operations/farmers" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="users" size={13}/> Farmers
              </Link>
              <Link href="/operations/hydraulics" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="valve" size={13}/> Hydraulics
              </Link>
              <Link href="/operations/alerts" className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6, justifyContent: 'flex-start' }}>
                <Icon name="bell" size={13}/> Alert queue
              </Link>
              <Link href="/irrigation" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="droplet" size={13}/> Irrigation module
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
      <Operations />
    </div>
  );
}

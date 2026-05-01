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

type AlertTab = 'ALL' | 'REQUESTS' | 'TELEMETRY' | 'HYDRAULICS';

const asNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRelative = (value: any) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
};

const severityKind = (value: any): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const text = String(value || '').toLowerCase();
  if (text === 'critical') return 'crit';
  if (text === 'warning') return 'warn';
  if (text === 'ok') return 'live';
  return 'info';
};

export default function Page() {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<AlertTab>('ALL');
  const [overview, setOverview] = React.useState<any>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [farmers, setFarmers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, requestRes, farmerRes] = await Promise.allSettled([
        apiGet<any>('/irrigation/officer/overview'),
        apiGet<any>('/irrigation/manual-requests'),
        apiGet<any>('/farm/farmers'),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value);
      } else {
        setOverview(null);
      }

      if (requestRes.status === 'fulfilled') {
        const list = Array.isArray(requestRes.value)
          ? requestRes.value
          : requestRes.value?.items || requestRes.value?.requests || requestRes.value?.data || [];
        setRequests(list);
      } else {
        setRequests([]);
      }

      if (farmerRes.status === 'fulfilled') {
        setFarmers(Array.isArray(farmerRes.value?.items) ? farmerRes.value.items : []);
      } else {
        setFarmers([]);
      }

      if (overviewRes.status === 'rejected' && requestRes.status === 'rejected') {
        setError('Unable to load alert queue');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load alert queue');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const farmerIndex = React.useMemo(() => {
    const index = new Map<string, any>();
    farmers.forEach((farmer: any) => {
      const farmerId = farmer.farmer_id || farmer.owner_id;
      if (farmerId) index.set(String(farmerId), farmer);
    });
    return index;
  }, [farmers]);

  const requestAlerts = React.useMemo(() => (
    requests
      .filter((request: any) => String(request.status || '').toUpperCase() === 'PENDING')
      .map((request: any) => {
        const farmerId = String(request.requested_by || request.farmer_id || '').trim();
        const farmer = farmerId ? farmerIndex.get(farmerId) : null;
        const blockedReason = request.policy_context?.blocked_reason || request.source_decision?.blocked_reason;
        return {
          id: request.request_id || request.id,
          group: 'REQUESTS',
          severity: blockedReason ? 'critical' : 'warning',
          title: request.field_name || request.field_id || 'Manual request',
          summary: blockedReason || request.reason || 'Awaiting officer review.',
          meta: `${farmer?.display_name || farmerId || 'Unknown farmer'} · ${request.scheme_id || 'No scheme'}`,
          timestamp: request.created_at || request.submitted_at,
          fieldId: request.field_id,
          farmerId,
        };
      })
  ), [farmerIndex, requests]);

  const schemeItems = Array.isArray(overview?.items) ? overview.items : [];
  const telemetryAlerts = React.useMemo(() => (
    schemeItems.flatMap((item: any) => {
      const alerts: any[] = [];
      const stale = asNumber(item.telemetry?.stale_fields);
      const missing = asNumber(item.telemetry?.no_telemetry_fields);
      if (stale > 0 || missing > 0) {
        alerts.push({
          id: `telemetry-${item.scheme_id}`,
          group: 'TELEMETRY',
          severity: missing > 0 ? 'critical' : 'warning',
          title: item.scheme_id || 'Scheme telemetry',
          summary: [
            stale > 0 ? `${stale} stale field${stale > 1 ? 's' : ''}` : null,
            missing > 0 ? `${missing} without telemetry` : null,
          ].filter(Boolean).join(' · '),
          meta: item.telemetry?.message || `${item.telemetry?.fresh_fields || 0} fields still reporting live`,
          timestamp: item.telemetry?.observed_at,
        });
      }
      return alerts;
    })
  ), [schemeItems]);

  const hydraulicAlerts = React.useMemo(() => (
    schemeItems.flatMap((item: any) => {
      const alerts: any[] = [];
      const rejected = asNumber(item.hydraulic?.rejected_schedules);
      const cancelled = asNumber(item.hydraulic?.cancelled_schedules);
      if (rejected > 0 || cancelled > 0) {
        alerts.push({
          id: `hydraulics-${item.scheme_id}`,
          group: 'HYDRAULICS',
          severity: rejected > 0 ? 'critical' : 'warning',
          title: item.scheme_id || 'Hydraulics',
          summary: [
            rejected > 0 ? `${rejected} rejected schedule${rejected > 1 ? 's' : ''}` : null,
            cancelled > 0 ? `${cancelled} cancelled` : null,
          ].filter(Boolean).join(' · '),
          meta: item.hydraulic?.message || 'Review hydraulic release plan',
          timestamp: item.hydraulic?.observed_at,
        });
      }
      return alerts;
    })
  ), [schemeItems]);

  const alerts = React.useMemo(
    () => [...requestAlerts, ...telemetryAlerts, ...hydraulicAlerts].sort((a: any, b: any) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return bTime - aTime;
    }),
    [hydraulicAlerts, requestAlerts, telemetryAlerts],
  );

  const filteredAlerts = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return alerts.filter((alert: any) => {
      if (tab !== 'ALL' && alert.group !== tab) return false;
      if (!search) return true;
      const text = [
        alert.title,
        alert.summary,
        alert.meta,
        alert.fieldId,
        alert.farmerId,
      ].join(' ').toLowerCase();
      return text.includes(search);
    });
  }, [alerts, query, tab]);

  const sidebar = buildOfficerNav('Alert Queue', {
    'Manual Requests': requestAlerts.length || undefined,
    'Alert Queue': alerts.length || undefined,
  });
  const displayName = user?.username || 'Officer';

  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Frame sidebar={sidebar} breadcrumb={['Operations', 'Alert Queue']} user={displayName} role="Officer">
        <div className="page-head">
          <div>
            <div className="page-title">Alert queue</div>
            <div className="page-sub">Manual requests, telemetry gaps, and hydraulic conflicts in one review list</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>

        <ApiState loading={loading && !overview && requests.length === 0} error={error} onRetry={loadData}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="metric"><div className="metric-label">Open alerts</div><div className="metric-value">{alerts.length}</div></div>
            <div className="metric"><div className="metric-label">Manual requests</div><div className="metric-value">{requestAlerts.length}</div></div>
            <div className="metric"><div className="metric-label">Telemetry alerts</div><div className="metric-value">{telemetryAlerts.length}</div></div>
            <div className="metric"><div className="metric-label">Hydraulic alerts</div><div className="metric-value">{hydraulicAlerts.length}</div></div>
          </div>

          <div className="card" style={{ padding: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="search" size={15} color="var(--muted)"/>
                <input
                  className="input"
                  style={{ height: 36 }}
                  placeholder="Search field, farmer, scheme, alert..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <Chip kind="info" dot={false}>{filteredAlerts.length} shown</Chip>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              ['ALL', `All (${alerts.length})`],
              ['REQUESTS', `Requests (${requestAlerts.length})`],
              ['TELEMETRY', `Telemetry (${telemetryAlerts.length})`],
              ['HYDRAULICS', `Hydraulics (${hydraulicAlerts.length})`],
            ].map(([value, label]: any) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className="btn btn-sm"
                style={{
                  borderRadius: 0,
                  background: 'transparent',
                  height: 34,
                  padding: '0 14px',
                  color: tab === value ? 'var(--primary-600)' : 'var(--muted)',
                  fontWeight: 600,
                  borderBottom: tab === value ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <Icon name="bell" size={40} color="var(--muted)"/>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No alerts in this view</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
              {filteredAlerts.map((alert: any) => (
                <div key={alert.id} className="card" style={{ padding: 16 }}>
                  <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{alert.title}</div>
                      <div className="tiny muted" style={{ marginTop: 4 }}>{alert.meta}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip kind="info" dot={false}>{alert.group}</Chip>
                      <Chip kind={severityKind(alert.severity)}>{String(alert.severity || '').toUpperCase()}</Chip>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.6 }}>{alert.summary}</div>
                  <div className="tiny muted" style={{ marginTop: 8 }}>
                    {formatRelative(alert.timestamp)}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                    {alert.group === 'REQUESTS' && (
                      <Link href={`/operations/requests?request=${encodeURIComponent(alert.id)}`} className="btn btn-primary btn-sm">
                        Review request
                      </Link>
                    )}
                    {alert.group === 'TELEMETRY' && (
                      <Link href="/operations/farmers" className="btn btn-primary btn-sm">
                        Open farmers
                      </Link>
                    )}
                    {alert.group === 'HYDRAULICS' && (
                      <Link href="/operations/hydraulics" className="btn btn-primary btn-sm">
                        Open hydraulics
                      </Link>
                    )}
                    {alert.fieldId && (
                      <Link href={`/operations/fields/${encodeURIComponent(alert.fieldId)}`} className="btn btn-ghost btn-sm">
                        Field
                      </Link>
                    )}
                    {alert.farmerId && (
                      <Link href={`/operations/farmers/${encodeURIComponent(alert.farmerId)}`} className="btn btn-ghost btn-sm">
                        Farmer
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ApiState>
      </Frame>
    </div>
  );
}

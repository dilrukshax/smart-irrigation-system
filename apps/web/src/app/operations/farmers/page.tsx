/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
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

const formatRelative = (value: any) => {
  if (!value) return 'No telemetry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No telemetry';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
};

const nav = officerNav.map((group: any) => ({
  ...group,
  items: group.items.map((item: any) => ({ ...item, active: item.name === 'Farmers' })),
}));

export default function Page() {
  const { user } = useAuth();
  const [farmers, setFarmers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  const loadFarmers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/farm/farmers');
      setFarmers(Array.isArray(res?.items) ? res.items : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load farmers');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  const filtered = farmers.filter((farmer: any) => {
    const text = [
      farmer.display_name,
      farmer.farmer_id,
      farmer.owner_id,
      ...(farmer.scheme_ids || []),
      ...(farmer.crop_types || []),
    ].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const totalFields = farmers.reduce((sum, farmer) => sum + asNumber(farmer.field_count), 0);
  const totalArea = farmers.reduce((sum, farmer) => sum + asNumber(farmer.total_area_hectares), 0);
  const pendingRequests = farmers.reduce((sum, farmer) => sum + asNumber(farmer.irrigation?.pending_manual_requests), 0);
  const criticalFields = farmers.reduce((sum, farmer) => sum + asNumber(farmer.telemetry?.critical_fields), 0);
  const displayName = user?.username || 'Officer';

  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Frame sidebar={nav} breadcrumb={['Operations', 'Farmers']} user={displayName} role={`Officer · ${user?.scheme_ids?.[0] || 'Assigned schemes'}`}>
        <div className="page-head">
          <div>
            <div className="page-title">Farmers</div>
            <div className="page-sub">Scheme-scoped farmer directory with field and telemetry coverage</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadFarmers}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>

        <ApiState loading={loading && farmers.length === 0} error={error} onRetry={loadFarmers}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="metric"><div className="metric-label">Farmers</div><div className="metric-value">{farmers.length}</div></div>
            <div className="metric"><div className="metric-label">Fields</div><div className="metric-value">{totalFields}</div></div>
            <div className="metric"><div className="metric-label">Total area</div><div className="metric-value">{formatArea(totalArea)}</div></div>
            <div className="metric"><div className="metric-label">Pending requests</div><div className="metric-value">{pendingRequests}</div></div>
            <div className="metric"><div className="metric-label">Critical fields</div><div className="metric-value">{criticalFields}</div></div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 220 }}>
                <Icon name="search" size={15} color="var(--muted)"/>
                <input
                  className="input"
                  style={{ height: 34 }}
                  placeholder="Search farmers, schemes, crops..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <Chip kind="info" dot={false}>{filtered.length} shown</Chip>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No farmers match this view
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Farmer</th>
                      <th>Schemes</th>
                      <th>Fields</th>
                      <th>Area</th>
                      <th>Telemetry</th>
                      <th>Requests</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((farmer: any) => {
                      const farmerId = farmer.farmer_id || farmer.owner_id || 'unassigned';
                      const pending = asNumber(farmer.irrigation?.pending_manual_requests);
                      const stale = asNumber(farmer.telemetry?.stale_fields);
                      const missing = asNumber(farmer.telemetry?.no_telemetry_fields);
                      const critical = asNumber(farmer.telemetry?.critical_fields);
                      const healthKind = critical > 0 ? 'crit' : stale + missing > 0 ? 'warn' : 'live';

                      return (
                        <tr key={farmerId}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{farmer.display_name || farmerId}</div>
                            <div className="tiny muted">{farmer.owner_id || 'No owner id assigned'}</div>
                          </td>
                          <td>{(farmer.scheme_ids || []).join(', ') || '-'}</td>
                          <td className="tabular">{farmer.field_count || 0}</td>
                          <td className="tabular">{formatArea(farmer.total_area_hectares)}</td>
                          <td>
                            <Chip kind={healthKind}>
                              {asNumber(farmer.telemetry?.live_fields)} live · {missing} missing
                            </Chip>
                            <div className="tiny muted" style={{ marginTop: 4 }}>{formatRelative(farmer.latest_telemetry_at)}</div>
                          </td>
                          <td><Chip kind={pending > 0 ? 'warn' : 'live'}>{pending} pending</Chip></td>
                          <td>
                            <Link href={`/operations/farmers/${encodeURIComponent(farmerId)}`} className="btn btn-primary btn-sm">
                              Open
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

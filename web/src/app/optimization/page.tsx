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
  Donut,
  Frame,
  LineChart,
  BarChart,
} from '@/components/asi/ui';
import { optNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OptOverview = () => {
  const { user } = useAuth();
  const [supply, setSupply] = React.useState<any>(null);
  const [waterBudget, setWaterBudget] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [supplyRes, budgetRes] = await Promise.allSettled([
        apiGet<any>('/planning/supply'),
        apiGet<any>('/planning/supply/water-budget'),
      ]);
      if (supplyRes.status === 'fulfilled') setSupply(supplyRes.value);
      if (budgetRes.status === 'fulfilled') setWaterBudget(budgetRes.value);

      if (supplyRes.status === 'rejected' && budgetRes.status === 'rejected') {
        setError('Unable to load optimization data');
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

  const totalFields = supply?.total_fields ?? supply?.field_count ?? 0;
  const totalArea = supply?.total_area_ha ?? supply?.total_area ?? 0;
  const totalWaterMm = supply?.total_water_allocated_mm ?? supply?.water_quota_mm ?? 0;
  const totalProfit = supply?.total_projected_profit ?? 0;

  const cropBreakdown = waterBudget?.breakdown || waterBudget?.crops || [];

  const displayName = user?.username || 'Authority';

  return (
    <Frame sidebar={optNav('over')} breadcrumb={['Modules', 'F4 · ACA-O', 'Overview']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">Adaptive Crop & Area Optimization</div>
          <div className="page-sub">Scheme-wide optimization · national supply aggregation</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
          <Link href="/optimization/planner" className="btn btn-primary btn-sm"><Icon name="target" size={13}/> Run planner</Link>
        </div>
      </div>

      <ApiState loading={loading && !supply} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="metric">
            <div className="metric-label">Total fields</div>
            <div className="metric-value">{totalFields}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Total area</div>
            <div className="metric-value">{Number(totalArea).toFixed(1)} <span style={{ fontSize: 12, color: 'var(--muted)' }}>ha</span></div>
          </div>
          <div className="metric">
            <div className="metric-label">Water allocated</div>
            <div className="metric-value">{totalWaterMm} <span style={{ fontSize: 12, color: 'var(--muted)' }}>mm</span></div>
          </div>
          <div className="metric">
            <div className="metric-label">Projected profit</div>
            <div className="metric-value">LKR {Math.round(Number(totalProfit) / 1000)}k</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Water budget by crop</div>
            </div>
            {cropBreakdown.length === 0 ? (
              <div className="tiny muted" style={{ padding: 20 }}>No breakdown data available</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Crop</th><th>Area</th><th>Water</th><th>Share</th></tr>
                </thead>
                <tbody>
                  {cropBreakdown.slice(0, 8).map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.crop_name || c.name || '—'}</td>
                      <td className="tabular">{c.area_ha?.toFixed(1) ?? '—'} ha</td>
                      <td className="tabular">{c.water_mm ?? c.water_allocated_mm ?? '—'} mm</td>
                      <td className="tabular">{c.share_pct?.toFixed(0) ?? '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Quick actions</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <Link href="/optimization/recommendations" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="chart" size={14}/> View crop recommendations
              </Link>
              <Link href="/optimization/planner" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="target" size={14}/> Run new optimization
              </Link>
              <Link href="/optimization/scenarios" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="play" size={14}/> Evaluate scenarios
              </Link>
              <Link href="/optimization/adaptive" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icon name="gear" size={14}/> Adaptive tuning
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
      <OptOverview />
    </div>
  );
}

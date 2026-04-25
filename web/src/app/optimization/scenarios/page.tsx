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
  BarChart,
} from '@/components/asi/ui';
import { optNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OptScenarios = () => {
  const { user } = useAuth();
  const [scenarios, setScenarios] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/planning/recommendations');
      const list = Array.isArray(res) ? res : res?.recommendations || res?.data || [];
      setScenarios(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const displayName = user?.username || 'Authority';

  return (
    <Frame sidebar={optNav('sce')} breadcrumb={['F4 · ACA-O', 'Scenarios']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">Scenarios</div>
          <div className="page-sub">Past optimization runs · {scenarios.length} saved</div>
        </div>
        <Link href="/optimization/planner" className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> New scenario</Link>
      </div>

      <ApiState loading={loading && scenarios.length === 0} error={error} onRetry={loadData}>
        {scenarios.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Icon name="play" size={40} color="var(--muted)"/>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No scenarios yet</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              Run an optimization from the <Link href="/optimization/planner" style={{ color: 'var(--primary-600)' }}>Planner</Link> to save scenarios
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Saved scenarios</div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Field/Scheme</th>
                  <th>Season</th>
                  <th>Generated</th>
                  <th>Source</th>
                  <th>Crops</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s: any, i: number) => {
                  const cropCount = (s.recommendations || s.response_data?.recommendations || []).length;
                  return (
                    <tr key={s.id || i}>
                      <td style={{ fontWeight: 600 }}>
                        {s.field_name || s.scheme_id || s.field_id || '—'}
                      </td>
                      <td className="muted">{s.season || '—'}</td>
                      <td className="muted">
                        {s.generated_at || s.created_at ? new Date(s.generated_at || s.created_at).toLocaleString() : '—'}
                      </td>
                      <td><Chip kind={s.source === 'model' ? 'live' : 'sim'}>{s.source || 'model'}</Chip></td>
                      <td className="tabular">{cropCount}</td>
                      <td>
                        <Link href={`/farmer/field/${s.field_id}`} className="btn btn-ghost btn-sm">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptScenarios />
    </div>
  );
}

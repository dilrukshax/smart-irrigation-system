/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState, EmptyState } from '@/components/asi/api-state';
import { buildAuthorityNav } from '@/components/asi/nav';
import { Chip, Frame, Icon } from '@/components/asi/ui';
import { useAuth } from '@/lib/auth';
import {
  buildSchemeSnapshots,
  fetchAuthorityPolicies,
  formatDateTime,
  getStatusChipKind,
} from '../_lib/authority-dashboard';

const StatCard = ({ label, value, detail }) => (
  <div className="card" style={{ padding: 16 }}>
    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    <div className="tiny muted" style={{ marginTop: 4 }}>{detail}</div>
  </div>
);

function SchemeZonesScreen() {
  const { user } = useAuth();
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPolicies(await fetchAuthorityPolicies(100));
    } catch (err: any) {
      setError(err?.message || 'Failed to load scheme policies');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const schemes = React.useMemo(() => buildSchemeSnapshots(policies), [policies]);
  const publishedCount = policies.filter((policy) => policy.status?.toUpperCase() === 'PUBLISHED').length;
  const draftCount = policies.filter((policy) => policy.status?.toUpperCase() === 'DRAFT').length;
  const emergencyCount = schemes.filter((scheme) => scheme.latestPolicy?.emergency_mode).length;
  const displayName = user?.username || 'Authority';

  return (
    <Frame
      sidebar={buildAuthorityNav('Scheme Zones')}
      breadcrumb={['Authority', 'Scheme Zones']}
      user={displayName}
      role="Authority"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Scheme zones</div>
          <div className="page-sub">Current governance view for scheme-level policy coverage</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <StatCard label="Schemes" value={schemes.length} detail="Distinct policy zones with authority records" />
          <StatCard label="Published" value={publishedCount} detail="Active policy versions now in force" />
          <StatCard label="Drafts" value={draftCount} detail="Pending updates waiting for publish" />
          <StatCard label="Emergency" value={emergencyCount} detail="Schemes currently in emergency mode" />
        </div>

        {schemes.length === 0 ? (
          <EmptyState
            title="No scheme zones yet"
            description="Create a policy draft to establish the first scheme-level zone record."
            icon={<Icon name="map" size={24} color="var(--muted)" />}
          />
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '16px 16px 10px' }}>
              <div className="card-title">Zone coverage</div>
              <Chip kind="info" dot={false}>{schemes.length} scheme records</Chip>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Scheme</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Latest policy</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Quota</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Open cap</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Season quota</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>State</th>
                    <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.map((scheme) => {
                    const policy = scheme.latestPolicy;
                    const seasonQuota = policy?.constraints?.season_quota_mm;
                    return (
                      <tr key={scheme.schemeId}>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          <div style={{ fontWeight: 600 }}>{scheme.schemeId}</div>
                          <div className="tiny muted">{scheme.publishedCount} published · {scheme.draftCount} drafts</div>
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          <div style={{ fontWeight: 600 }}>v{policy?.version || 1}</div>
                          <div className="tiny muted">{policy?.emergency_mode ? 'Emergency routing enabled' : 'Standard operating mode'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {policy?.quota_mcm ?? '—'} MCM
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {policy?.max_field_open_pct ?? '—'}%
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {seasonQuota ?? '—'} mm
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          <Chip kind={getStatusChipKind(policy?.status)}>
                            {policy?.status || 'UNKNOWN'}
                          </Chip>
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {formatDateTime(policy?.updated_at || policy?.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ApiState>
    </Frame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <SchemeZonesScreen />
    </div>
  );
}

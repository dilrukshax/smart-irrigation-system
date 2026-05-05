/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState, EmptyState } from '@/components/asi/api-state';
import { buildAuthorityNav } from '@/components/asi/nav';
import { Chip, Frame, Icon } from '@/components/asi/ui';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  buildSchemeSnapshots,
  collectSchemeIds,
  fetchAuthorityPolicies,
  fetchAuthorityUsers,
  formatDateTime,
  getRoleLabel,
  getStatusChipKind,
} from '../_lib/authority-dashboard';

const StatCard = ({ label, value, detail }) => (
  <div className="card" style={{ padding: 16 }}>
    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    <div className="tiny muted" style={{ marginTop: 4 }}>{detail}</div>
  </div>
);

function SeasonalSummaryScreen() {
  const { user } = useAuth();
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [dashboard, setDashboard] = React.useState<any>(null);
  const [monitoring, setMonitoring] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const season = 'Maha-2026';
  const schemeId = user?.scheme_ids?.[0] || '';

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRows, userRows, dashboardPayload, monitoringPayload] = await Promise.all([
        fetchAuthorityPolicies(100),
        fetchAuthorityUsers(100),
        schemeId ? apiGet<any>(`/planning/authority/scheme-dashboard?scheme_id=${schemeId}&season=${season}`).catch(() => null) : Promise.resolve(null),
        apiGet<any>(`/planning/monitoring/dashboard?season=${season}`).catch(() => null),
      ]);
      setPolicies(policyRows);
      setUsers(userRows);
      setDashboard(dashboardPayload);
      setMonitoring(monitoringPayload);
    } catch (err: any) {
      setError(err?.message || 'Failed to load seasonal summary');
    } finally {
      setLoading(false);
    }
  }, [schemeId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const activeUsers = users.filter((record) => record.is_active);
  const roleCounts = activeUsers.reduce((acc, record) => {
    const role = getRoleLabel(record);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const schemeSnapshots = buildSchemeSnapshots(policies);
  const schemeIds = collectSchemeIds(users, policies);
  const publishedPolicies = policies.filter((policy) => policy.status?.toUpperCase() === 'PUBLISHED');
  const draftPolicies = policies.filter((policy) => policy.status?.toUpperCase() === 'DRAFT');
  const displayName = user?.username || 'Authority';
  const dashboardData = dashboard?.data || dashboard || {};
  const monitoringData = monitoring?.data || monitoring || {};

  const schemeRollup = schemeIds.map((schemeId) => {
    const assignedUsers = activeUsers.filter((record) => (record.scheme_ids || []).includes(schemeId));
    const latestPolicy = schemeSnapshots.find((item) => item.schemeId === schemeId)?.latestPolicy;
    return {
      schemeId,
      assignedUsers: assignedUsers.length,
      officers: assignedUsers.filter((record) => getRoleLabel(record) === 'officer').length,
      farmers: assignedUsers.filter((record) => getRoleLabel(record) === 'farmer').length,
      latestPolicy,
    };
  });

  return (
    <Frame
      sidebar={buildAuthorityNav('Seasonal Summary')}
      breadcrumb={['Authority', 'Seasonal Summary']}
      user={displayName}
      role="Authority"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Seasonal summary</div>
          <div className="page-sub">Authority season overview using current account and policy records</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
          <StatCard label="Active farmers" value={roleCounts.farmer || 0} detail="Farmer accounts active this season" />
          <StatCard label="Active officers" value={roleCounts.officer || 0} detail="Operations staff currently enabled" />
          <StatCard label="Schemes covered" value={schemeIds.length} detail="Distinct schemes referenced by users or policies" />
          <StatCard label="Published policies" value={publishedPolicies.length} detail={`${draftPolicies.length} additional drafts in preparation`} />
          <StatCard label="Water fairness" value={dashboardData.water_fairness_index ?? '—'} detail={schemeId ? `Scheme ${schemeId}` : 'Assign a scheme to load'} />
          <StatCard label="Scheme compliance" value={dashboardData.scheme_compliance_pct ? `${dashboardData.scheme_compliance_pct}%` : '—'} detail={`Paddy ${dashboardData.paddy_compliance_pct ?? '—'}%`} />
          <StatCard label="Recent backtests" value={(monitoringData.recent_runs || []).length} detail={`${monitoringData.drift_run_count || 0} drift flags`} />
        </div>

        {schemeRollup.length === 0 ? (
          <EmptyState
            title="No seasonal data yet"
            description="Create users or policy drafts to build the first authority-level seasonal summary."
            icon={<Icon name="chart" size={24} color="var(--muted)" />}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-head" style={{ padding: '16px 16px 10px' }}>
                <div className="card-title">Scheme coverage</div>
                <Chip kind="info" dot={false}>{schemeRollup.length} schemes</Chip>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Scheme</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Assigned users</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Officer / farmer mix</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Latest policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schemeRollup.map((scheme) => (
                      <tr key={scheme.schemeId}>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', fontWeight: 600 }}>
                          {scheme.schemeId}
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {scheme.assignedUsers}
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {scheme.officers} officers · {scheme.farmers} farmers
                        </td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          {scheme.latestPolicy ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <Chip kind={getStatusChipKind(scheme.latestPolicy.status)}>
                                {scheme.latestPolicy.status}
                              </Chip>
                              <span className="tiny muted">
                                v{scheme.latestPolicy.version} · updated {formatDateTime(scheme.latestPolicy.updated_at || scheme.latestPolicy.created_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="tiny muted">No policy published yet</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Authority posture</div>
                <Chip kind="info" dot={false}>{activeUsers.length} active accounts</Chip>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
                  <div className="tiny muted">Authorities online</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }}>{roleCounts.authority || 0}</div>
                </div>
                <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
                  <div className="tiny muted">Emergency schemes</div>
                  <div style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }}>
                    {schemeSnapshots.filter((scheme) => scheme.latestPolicy?.emergency_mode).length}
                  </div>
                </div>
                <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}>
                  <div className="tiny muted">Latest policy publish</div>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>
                    {publishedPolicies[0] ? formatDateTime(publishedPolicies[0].published_at || publishedPolicies[0].updated_at) : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-head" style={{ padding: '16px 16px 10px' }}>
                <div className="card-title">Monitoring dashboard</div>
                <Chip kind="info" dot={false}>{(monitoringData.recent_runs || []).length} runs</Chip>
              </div>
              {!monitoringData.recent_runs?.length ? (
                <div className="tiny muted" style={{ padding: 16 }}>No recent monitoring runs are available for this season.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Model</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>MAE</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>RMSE</th>
                      <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monitoringData.recent_runs || []).slice(0, 6).map((run: any) => (
                      <tr key={`${run.model_name}-${run.id}`}>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>{run.model_name}</td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>{run.mae ?? '—'}</td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>{run.rmse ?? '—'}</td>
                        <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                          <Chip kind={run.drift_detected ? 'crit' : 'live'}>{run.drift_detected ? 'Detected' : 'Stable'}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
      <SeasonalSummaryScreen />
    </div>
  );
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { ApiState } from '@/components/asi/api-state';
import { Icon, Chip } from '@/components/asi/ui';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  BackendStatus,
  CropBudgetTable,
  DEFAULT_SEASON,
  MetricCard,
  OptimizationFrame,
  buildQuery,
  formatCompact,
  formatDate,
  formatNumber,
  formatPct,
  gridAuto,
  overviewRecommendations,
  topCrops,
  unwrapData,
  waterBudget,
} from './_components/optimization-shared';

function OptimizationOverview() {
  const { user } = useAuth();
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [overview, setOverview] = React.useState<any>(null);
  const [schemeDashboard, setSchemeDashboard] = React.useState<any>(null);
  const [oversupplyAlerts, setOversupplyAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const schemeId = user?.scheme_ids?.[0] || '';

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, dashboard, alerts] = await Promise.all([
        apiGet<any>(`/planning/operator/overview${buildQuery({ season })}`),
        schemeId ? apiGet<any>(`/planning/authority/scheme-dashboard${buildQuery({ scheme_id: schemeId, season })}`).catch(() => null) : Promise.resolve(null),
        schemeId ? apiGet<any>(`/planning/authority/oversupply-alerts${buildQuery({ scheme_id: schemeId, season })}`).catch(() => null) : Promise.resolve(null),
      ]);
      setOverview(response);
      setSchemeDashboard(dashboard);
      setOversupplyAlerts((alerts?.data?.items || alerts?.items || []) as any[]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load optimization overview');
    } finally {
      setLoading(false);
    }
  }, [schemeId, season]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const data = unwrapData(overview);
  const budget = waterBudget(overview);
  const crops = topCrops(overview);
  const recs = overviewRecommendations(overview);
  const latestPlan = data.latest_plan;
  const dashboardData = unwrapData(schemeDashboard);

  return (
    <OptimizationFrame
      active="Overview"
      title="Optimization overview"
      subtitle="Backend recommendations, water budget, and saved operator plans"
      onRefresh={loadData}
      actions={
        <>
          <select className="select" value={season} onChange={(event) => setSeason(event.target.value)} style={{ minWidth: 150 }}>
            <option value="Maha-2025">Maha 2025</option>
            <option value="Yala-2026">Yala 2026</option>
            <option value="Maha-2026">Maha 2026</option>
            <option value="Yala-2027">Yala 2027</option>
          </select>
          <Link href="/optimization/planner" className="btn btn-primary btn-sm">
            <Icon name="target" size={13}/> Run planner
          </Link>
        </>
      }
    >
      <ApiState loading={loading && !overview} error={error} onRetry={loadData}>
        {!!oversupplyAlerts.length && (
          <div className="card" style={{ marginBottom: 14, borderColor: '#F59E0B', background: '#FFF7ED' }}>
            <div className="card-head">
              <div>
                <div className="card-title">Oversupply warnings</div>
                <div className="tiny muted">High concentration of one crop can pressure market prices</div>
              </div>
              <Chip kind="warn">{oversupplyAlerts.length} alerts</Chip>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {oversupplyAlerts.slice(0, 4).map((alert: any) => (
                <Chip key={`${alert.scheme_id}-${alert.crop_id}-${alert.id}`} kind={alert.severity === 'critical' ? 'crit' : 'warn'} dot={false}>
                  {alert.crop_name || alert.crop_id}: {formatPct(alert.pct_of_scheme, 0)}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div style={{ ...gridAuto(220), marginBottom: 14 }}>
          <MetricCard
            title="Fields in scope"
            value={formatNumber(data.field_count, 0)}
            sub={`${formatNumber(data.total_area_ha, 1)} ha total area`}
            icon="map"
            chip={overview?.status || 'scope'}
            kind="live"
          />
          <MetricCard
            title="Recommendation rows"
            value={formatNumber(data.recommendation_count, 0)}
            sub={`${formatNumber(data.fields_with_recommendations, 0)} fields with crop context`}
            icon="leaf"
            chip={`${formatNumber(data.crop_count, 0)} crops`}
            kind="sim"
            color="#6D9F2B"
          />
          <MetricCard
            title="Water use"
            value={formatNumber(budget.total_usage, 0)}
            sub={budget.quota ? `${formatPct(budget.quota_use_pct, 1)} of ${formatNumber(budget.quota, 0)} quota` : 'Quota comes from field water availability'}
            icon="wave"
            chip="budget"
            kind={budget.quota_use_pct > 100 ? 'crit' : budget.quota_use_pct > 80 ? 'warn' : 'live'}
            color="var(--secondary)"
          />
          <MetricCard
            title="Latest plan"
            value={latestPlan ? formatCompact(latestPlan.total_profit, 'LKR ') : '-'}
            sub={latestPlan ? `${latestPlan.allocation_count} allocations · ${formatDate(latestPlan.created_at)}` : 'No saved operator run yet'}
            icon="target"
            chip={latestPlan?.status || 'plan'}
            kind={latestPlan ? 'live' : 'sim'}
            color="var(--primary)"
          />
          <MetricCard
            title="Water fairness"
            value={formatNumber(dashboardData.water_fairness_index, 2)}
            sub={schemeId ? `Scheme ${schemeId}` : 'No assigned scheme'}
            icon="wave"
            chip="gini"
            kind="sim"
            color="#6D9F2B"
          />
          <MetricCard
            title="Scheme compliance"
            value={formatPct(dashboardData.scheme_compliance_pct, 1)}
            sub={`Paddy compliance ${formatPct(dashboardData.paddy_compliance_pct, 1)}`}
            icon="check"
            chip="authority"
            kind="live"
            color="var(--secondary)"
          />
        </div>

        <div style={{ ...gridAuto(340), alignItems: 'start', marginBottom: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Water budget by crop</div>
                <div className="tiny muted">Derived from latest backend recommendations</div>
              </div>
              <BackendStatus payload={overview}/>
            </div>
            <CropBudgetTable crops={crops}/>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Operator actions</div>
                <div className="tiny muted">F4 endpoints available through the gateway</div>
              </div>
              <Chip kind="live">/planning/operator</Chip>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <Link href="/optimization/recommendations" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Icon name="leaf" size={14}/> Review recommendations
              </Link>
              <Link href="/optimization/planner" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Icon name="target" size={14}/> Run constrained plan
              </Link>
              <Link href="/optimization/scenarios" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Icon name="chart" size={14}/> Compare scenarios
              </Link>
              <Link href="/optimization/adaptive" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Icon name="flash" size={14}/> Tune adaptive inputs
              </Link>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="card-title">Top recommendation preview</div>
              <div className="tiny muted">First rows returned by the operator overview endpoint</div>
            </div>
          </div>
          {!recs.length ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <Icon name="leaf" size={34} color="var(--muted)"/>
              <div style={{ fontWeight: 700, marginTop: 10 }}>No recommendations available</div>
              <div className="tiny muted" style={{ marginTop: 5 }}>Generate or sync recommendations first, then the operator overview will show them here.</div>
              <Link href="/optimization/adaptive" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                <Icon name="arrow" size={13}/> Open adaptive tuning
              </Link>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Crop</th>
                  <th>Rank</th>
                  <th>Suitability</th>
                  <th>Risk</th>
                  <th>Profit / ha</th>
                </tr>
              </thead>
              <tbody>
                {recs.slice(0, 8).map((row: any, index: number) => (
                  <tr key={`${row.field_id || 'field'}-${row.crop_id || index}`}>
                    <td style={{ fontWeight: 650 }}>{row.field_name || row.field_id || '-'}</td>
                    <td>{row.crop_name || row.crop_id || '-'}</td>
                    <td className="tabular">#{row.rank || index + 1}</td>
                    <td className="tabular">{formatNumber(row.suitability_score, 2)}</td>
                    <td><Chip kind={row.risk_band === 'high' ? 'crit' : row.risk_band === 'medium' ? 'warn' : 'live'}>{row.risk_band || 'risk'}</Chip></td>
                    <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{formatCompact(row.expected_profit_per_ha, 'LKR ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ApiState>
    </OptimizationFrame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptimizationOverview />
    </div>
  );
}

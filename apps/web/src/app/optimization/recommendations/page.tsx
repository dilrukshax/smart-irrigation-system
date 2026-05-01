/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { Icon } from '@/components/asi/ui';
import { apiGet } from '@/lib/api';
import {
  DEFAULT_SEASON,
  EmptyState,
  MetricCard,
  OptimizationFrame,
  RecommendationCard,
  buildQuery,
  formatCompact,
  formatNumber,
  gridAuto,
  num,
  overviewRecommendations,
  statusKind,
  unwrapData,
} from '../_components/optimization-shared';

function RecommendationsPage() {
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [overview, setOverview] = React.useState<any>(null);
  const [cropFilter, setCropFilter] = React.useState('');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [threshold, setThreshold] = React.useState(0.65);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<any>(`/planning/operator/overview${buildQuery({ season })}`);
      setOverview(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crop recommendations');
    } finally {
      setLoading(false);
    }
  }, [season]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = overviewRecommendations(overview);
  const filtered = rows.filter((row: any) => {
    const score = num(row.suitability_score ?? row.combined_score, 0);
    const risk = String(row.risk_band || row.risk_level || row.risk || '').toLowerCase();
    const name = String(row.crop_name || row.crop_id || '').toLowerCase();
    if (score < threshold) return false;
    if (cropFilter && !name.includes(cropFilter.toLowerCase())) return false;
    if (riskFilter !== 'all' && risk !== riskFilter) return false;
    return true;
  });
  const data = unwrapData(overview);
  const topProfit = filtered.reduce((best: number, row: any) => Math.max(best, num(row.expected_profit_per_ha ?? row.profit_per_ha, 0)), 0);

  return (
    <OptimizationFrame
      active="Recommendations"
      title="Crop recommendations"
      subtitle="Officer view of latest backend-ranked crop options"
      onRefresh={loadData}
      actions={
        <select className="select" value={season} onChange={(event) => setSeason(event.target.value)} style={{ minWidth: 150 }}>
          <option value="Maha-2025">Maha 2025</option>
          <option value="Yala-2026">Yala 2026</option>
          <option value="Maha-2026">Maha 2026</option>
          <option value="Yala-2027">Yala 2027</option>
        </select>
      }
    >
      <ApiState loading={loading && !overview} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(220), marginBottom: 14 }}>
          <MetricCard
            title="Recommendation rows"
            value={formatNumber(rows.length, 0)}
            sub={`${formatNumber(data.fields_with_recommendations, 0)} fields with current F4 context`}
            icon="leaf"
            chip={overview?.status || 'backend'}
            kind={statusKind(overview?.status)}
          />
          <MetricCard
            title="Filtered rows"
            value={formatNumber(filtered.length, 0)}
            sub={`Threshold ${threshold.toFixed(2)} suitability`}
            icon="filter"
            chip="view"
            kind="sim"
            color="#6D9F2B"
          />
          <MetricCard
            title="Top profit / ha"
            value={formatCompact(topProfit, 'LKR ')}
            sub="Among currently visible options"
            icon="chart"
            chip="profit"
            kind="live"
            color="var(--primary)"
          />
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ ...gridAuto(190), alignItems: 'end' }}>
            <div className="field">
              <label>Crop</label>
              <input
                className="input"
                value={cropFilter}
                onChange={(event) => setCropFilter(event.target.value)}
                placeholder="Name or crop id"
              />
            </div>
            <div className="field">
              <label>Risk</label>
              <select className="select" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
                <option value="all">All risk bands</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field">
              <label>Minimum suitability {threshold.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
            <button className="btn btn-ghost" onClick={() => { setCropFilter(''); setRiskFilter('all'); setThreshold(0); }}>
              <Icon name="x" size={13}/> Clear
            </button>
          </div>
        </div>

        {!rows.length ? (
          <EmptyState
            icon="leaf"
            title="No backend recommendations yet"
            actionHref="/optimization/adaptive"
            actionLabel="Run adaptive tuning"
          >
            The operator endpoint returned no recommendation rows for this season.
          </EmptyState>
        ) : !filtered.length ? (
          <EmptyState icon="filter" title="No rows match the filters">
            Lower the suitability threshold or clear the crop/risk filters.
          </EmptyState>
        ) : (
          <div style={gridAuto(280)}>
            {filtered.slice(0, 30).map((row: any, index: number) => (
              <RecommendationCard key={`${row.field_id || 'field'}-${row.crop_id || index}-${row.rank || index}`} row={row}/>
            ))}
          </div>
        )}
      </ApiState>
    </OptimizationFrame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <RecommendationsPage />
    </div>
  );
}

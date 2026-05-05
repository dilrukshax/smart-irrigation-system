/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { Icon } from '@/components/asi/ui';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
  const { user } = useAuth();
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [overview, setOverview] = React.useState<any>(null);
  const [accuracyReport, setAccuracyReport] = React.useState<any>(null);
  const [cropFilter, setCropFilter] = React.useState('');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [threshold, setThreshold] = React.useState(0.65);
  const [feedbackRow, setFeedbackRow] = React.useState<any>(null);
  const [feedbackYield, setFeedbackYield] = React.useState('');
  const [feedbackPrice, setFeedbackPrice] = React.useState('');
  const [feedbackWater, setFeedbackWater] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, report] = await Promise.all([
        apiGet<any>(`/planning/operator/overview${buildQuery({ season })}`),
        (user?.roles || []).some((role) => ['authority', 'admin'].includes(String(role).toLowerCase()))
          ? apiGet<any>(`/planning/feedback/accuracy-report${buildQuery({ season })}`).catch(() => null)
          : Promise.resolve(null),
      ]);
      setOverview(response);
      setAccuracyReport(report);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crop recommendations');
    } finally {
      setLoading(false);
    }
  }, [season, user?.roles]);

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
  const canViewAccuracy = (user?.roles || []).some((role) => ['authority', 'admin'].includes(String(role).toLowerCase()));

  const submitFeedback = async () => {
    if (!feedbackRow) return;
    await apiPost('/planning/feedback/outcomes', {
      field_id: feedbackRow.field_id,
      crop_id: feedbackRow.crop_id,
      actual_crop_id: feedbackRow.crop_id,
      season,
      year: Number(season.split('-')[1]) || new Date().getFullYear(),
      feedback_date: new Date().toISOString().slice(0, 10),
      actual_yield_t_ha: feedbackYield ? Number(feedbackYield) : undefined,
      actual_sale_price_kg: feedbackPrice ? Number(feedbackPrice) : undefined,
      actual_water_used_mm: feedbackWater ? Number(feedbackWater) : undefined,
    });
    setFeedbackRow(null);
    setFeedbackYield('');
    setFeedbackPrice('');
    setFeedbackWater('');
    loadData();
  };

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
              <div key={`${row.field_id || 'field'}-${row.crop_id || index}-${row.rank || index}`} style={{ display: 'grid', gap: 8 }}>
                <RecommendationCard row={row}/>
                {row.field_id && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setFeedbackRow(row)}>
                    <Icon name="download" size={13}/> Submit outcome
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canViewAccuracy && accuracyReport?.data?.items?.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
            <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Accuracy report</div>
                <div className="tiny muted">Feedback-derived MAE and bias by crop</div>
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Samples</th>
                  <th>Predicted avg</th>
                  <th>Actual avg</th>
                  <th>MAE</th>
                  <th>Bias</th>
                </tr>
              </thead>
              <tbody>
                {accuracyReport.data.items.map((item: any) => (
                  <tr key={item.crop_id}>
                    <td>{item.crop_id}</td>
                    <td>{formatNumber(item.n, 0)}</td>
                    <td>{formatNumber(item.predicted_avg, 2)}</td>
                    <td>{formatNumber(item.actual_avg, 2)}</td>
                    <td>{formatNumber(item.mae, 2)}</td>
                    <td>{formatNumber(item.bias, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {feedbackRow && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Submit field outcome</div>
                <div className="tiny muted">{feedbackRow.field_id} · {feedbackRow.crop_name || feedbackRow.crop_id}</div>
              </div>
            </div>
            <div style={{ ...gridAuto(180), marginTop: 10 }}>
              <div className="field">
                <label>Actual yield t/ha</label>
                <input className="input" type="number" value={feedbackYield} onChange={(event) => setFeedbackYield(event.target.value)} />
              </div>
              <div className="field">
                <label>Sale price / kg</label>
                <input className="input" type="number" value={feedbackPrice} onChange={(event) => setFeedbackPrice(event.target.value)} />
              </div>
              <div className="field">
                <label>Water used mm</label>
                <input className="input" type="number" value={feedbackWater} onChange={(event) => setFeedbackWater(event.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={submitFeedback}>
                <Icon name="arrow" size={13}/> Save outcome
              </button>
              <button className="btn btn-ghost" onClick={() => setFeedbackRow(null)}>Close</button>
            </div>
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

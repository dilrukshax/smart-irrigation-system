/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { ApiState } from '@/components/asi/api-state';
import { Chip, Icon } from '@/components/asi/ui';
import { apiGet, apiPost } from '@/lib/api';
import {
  AllocationTable,
  DEFAULT_SEASON,
  EmptyState,
  MetricCard,
  OptimizationFrame,
  buildQuery,
  formatCompact,
  formatDate,
  formatNumber,
  gridAuto,
  statusKind,
  unwrapData,
} from '../_components/optimization-shared';

function ScenariosPage() {
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [payload, setPayload] = React.useState<any>(null);
  const [scenarioName, setScenarioName] = React.useState('');
  const [waterQuota, setWaterQuota] = React.useState('');
  const [priceFactor, setPriceFactor] = React.useState('');
  const [maxRiskLevel, setMaxRiskLevel] = React.useState('high');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldId, setFieldId] = React.useState('');
  const [fieldScenarioPayload, setFieldScenarioPayload] = React.useState<any>(null);
  const [scenarioTab, setScenarioTab] = React.useState<'optimistic' | 'base' | 'pessimistic'>('base');

  const loadScenarios = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<any>(`/planning/operator/scenarios${buildQuery({ season, limit: 20 })}`);
      setPayload(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load saved scenarios');
    } finally {
      setLoading(false);
    }
  }, [season]);

  React.useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const loadFieldScenarioVariants = async () => {
    if (!fieldId) return;
    try {
      const response = await apiGet<any>(`/planning/farmer/current?${buildQuery({ field_id: fieldId })}`);
      setFieldScenarioPayload(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field scenario variants');
      setFieldScenarioPayload(null);
    }
  };

  const runScenario = async () => {
    setRunning(true);
    setError(null);
    try {
      const body: any = {
        scenario_name: scenarioName || 'custom',
        season,
        max_risk_level: maxRiskLevel,
      };
      if (waterQuota) body.water_quota_mm = Number(waterQuota);
      if (priceFactor) body.price_factor = Number(priceFactor);
      const response = await apiPost<any>('/planning/operator/scenario-evaluate', body);
      setResult(response);
      await loadScenarios();
    } catch (err: any) {
      setError(err?.message || 'Scenario evaluation failed');
    } finally {
      setRunning(false);
    }
  };

  const scenarios = unwrapData(payload).scenarios || [];
  const resultData = unwrapData(result);
  const fieldScenarioData = unwrapData(fieldScenarioPayload);
  const scenarioVariants = fieldScenarioData.scenario_variants || {};
  const activeVariant = scenarioVariants[scenarioTab];
  const totalProfit = scenarios.reduce((sum: number, row: any) => sum + (Number(row.total_profit) || 0), 0);

  return (
    <OptimizationFrame
      active="Scenarios"
      title="Scenarios"
      subtitle="Saved plan artifacts and operator what-if evaluation"
      onRefresh={loadScenarios}
      actions={
        <Link href="/optimization/planner" className="btn btn-ghost btn-sm">
          <Icon name="target" size={13}/> Planner
        </Link>
      }
    >
      <ApiState loading={loading && !payload} error={error && !result ? error : null} onRetry={loadScenarios}>
        <div style={{ ...gridAuto(220), marginBottom: 14 }}>
          <MetricCard title="Saved scenarios" value={formatNumber(scenarios.length, 0)} sub="Operator and authority optimization artifacts" icon="chart" chip={payload?.status || 'runs'} kind={statusKind(payload?.status)}/>
          <MetricCard title="Combined profit" value={formatCompact(totalProfit, 'LKR ')} sub="Sum across loaded artifacts" icon="target" chip="total" kind="sim" color="#6D9F2B"/>
          <MetricCard title="Latest evaluation" value={result ? formatCompact(resultData.total_profit, 'LKR ') : '-'} sub={result ? resultData.message || result.message : 'Run a what-if scenario'} icon="flash" chip={result?.status || 'scenario'} kind={result ? statusKind(result.status) : 'sim'} color="var(--primary)"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, alignItems: 'start', marginBottom: 14 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Evaluate scenario</div>
                <div className="tiny muted">POST /planning/operator/scenario-evaluate</div>
              </div>
              <Chip kind="live">backend</Chip>
            </div>
            <div style={{ ...gridAuto(160), marginTop: 12 }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Season</label>
                <select className="select" value={season} onChange={(event) => setSeason(event.target.value)} disabled={running}>
                  <option value="Maha-2025">Maha 2025</option>
                  <option value="Yala-2026">Yala 2026</option>
                  <option value="Maha-2026">Maha 2026</option>
                  <option value="Yala-2027">Yala 2027</option>
                </select>
              </div>
              <div className="field">
                <label>Water quota</label>
                <input className="input" type="number" min="1" step="10" value={waterQuota} onChange={(event) => setWaterQuota(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Price factor</label>
                <input className="input" type="number" min="0.5" max="2" step="0.05" value={priceFactor} onChange={(event) => setPriceFactor(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Maximum risk</label>
                <select className="select" value={maxRiskLevel} onChange={(event) => setMaxRiskLevel(event.target.value)} disabled={running}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            {error && result && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12 }}>
                {error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', height: 40, marginTop: 14 }} onClick={runScenario} disabled={running}>
              <Icon name="flash" size={14}/> {running ? 'Evaluating...' : 'Evaluate scenario'}
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Latest scenario result</div>
                <div className="tiny muted">{resultData.scenario_name || 'No scenario run in this session'}</div>
              </div>
              {result && <Chip kind={statusKind(result.status)}>{result.status}</Chip>}
            </div>
            {result ? <AllocationTable allocation={resultData.allocation}/> : <div className="tiny muted" style={{ padding: 18 }}>Scenario allocations will appear after evaluation.</div>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <div>
              <div className="card-title">Farmer scenario variants</div>
              <div className="tiny muted">Optimistic, base, and pessimistic variants from the latest farmer recommendation</div>
            </div>
            <Chip kind="info">/planning/farmer/current</Chip>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <input className="input" style={{ minWidth: 220 }} value={fieldId} onChange={(event) => setFieldId(event.target.value)} placeholder="Field id" />
            <button className="btn btn-ghost" onClick={loadFieldScenarioVariants}>
              <Icon name="download" size={13}/> Load variants
            </button>
          </div>
          {!Object.keys(scenarioVariants).length ? (
            <div className="tiny muted" style={{ marginTop: 10 }}>Load a field that already has a saved farmer recommendation to inspect its scenario bands.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {(['optimistic', 'base', 'pessimistic'] as const).map((tab) => (
                  <button key={tab} className="btn btn-ghost btn-sm" onClick={() => setScenarioTab(tab)} style={{ borderColor: scenarioTab === tab ? 'var(--primary)' : undefined }}>
                    {tab}
                  </button>
                ))}
              </div>
              {activeVariant && (
                <div style={{ ...gridAuto(160), marginTop: 12 }}>
                  <MetricCard title="Crop" value={activeVariant.crop_name || '-'} sub={activeVariant.crop_id || ''} icon="leaf" chip={scenarioTab} kind="sim" />
                  <MetricCard title="Yield" value={formatNumber(activeVariant.predicted_yield_t_ha, 2)} sub="t/ha" icon="chart" chip="yield" kind="live" />
                  <MetricCard title="Revenue" value={formatCompact(activeVariant.gross_revenue_per_ha, 'LKR ')} sub="per ha" icon="target" chip="revenue" kind="live" />
                  <MetricCard title="Profit" value={formatCompact(activeVariant.profit_per_ha, 'LKR ')} sub={`Water ratio ${formatNumber(activeVariant.water_scenario_ratio, 2)}`} icon="flash" chip="profit" kind="live" />
                </div>
              )}
            </>
          )}
        </div>

        {!scenarios.length ? (
          <EmptyState
            icon="chart"
            title="No saved scenarios yet"
            actionHref="/optimization/planner"
            actionLabel="Run planner"
          >
            New planner and scenario runs are saved by the optimization service.
          </EmptyState>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Saved artifacts</div>
                <div className="tiny muted">Recent operator and authority F4 runs</div>
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Area</th>
                  <th>Profit</th>
                  <th>Generated</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((row: any) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 650 }}>{row.scenario_name || row.run_type || '-'}</td>
                    <td>{row.run_type || '-'}</td>
                    <td>{row.season || '-'}</td>
                    <td><Chip kind={statusKind(row.status)}>{row.status || 'status'}</Chip></td>
                    <td className="tabular">{formatNumber(row.total_area, 2)} ha</td>
                    <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{formatCompact(row.total_profit, 'LKR ')}</td>
                    <td className="muted">{formatDate(row.created_at || row.observed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ApiState>
    </OptimizationFrame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <ScenariosPage />
    </div>
  );
}

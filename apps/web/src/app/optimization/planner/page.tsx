/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
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
  formatNumber,
  formatPct,
  getParamDefault,
  gridAuto,
  statusKind,
  unwrapData,
  waterBudget,
} from '../_components/optimization-shared';

function OptimizationPlanner() {
  const [season, setSeason] = React.useState(DEFAULT_SEASON);
  const [overview, setOverview] = React.useState<any>(null);
  const [parameters, setParameters] = React.useState<any>(null);
  const [waterQuota, setWaterQuota] = React.useState('');
  const [minPaddyArea, setMinPaddyArea] = React.useState('0');
  const [priority, setPriority] = React.useState('profit');
  const [maxRiskLevel, setMaxRiskLevel] = React.useState('high');
  const [allowPlanB, setAllowPlanB] = React.useState(true);
  const [cropContinuity, setCropContinuity] = React.useState(false);
  const [rainfallAssumption, setRainfallAssumption] = React.useState('P50');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const defaultsAppliedRef = React.useRef(false);

  const loadContext = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, paramsRes] = await Promise.allSettled([
        apiGet<any>(`/planning/operator/overview${buildQuery({ season })}`),
        apiGet<any>('/planning/adaptive/parameters'),
      ]);
      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (paramsRes.status === 'fulfilled') setParameters(paramsRes.value);
      if (overviewRes.status === 'rejected' && paramsRes.status === 'rejected') {
        setError('Unable to load planner context');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load planner context');
    } finally {
      setLoading(false);
    }
  }, [season]);

  React.useEffect(() => {
    defaultsAppliedRef.current = false;
    loadContext();
  }, [loadContext]);

  React.useEffect(() => {
    if (defaultsAppliedRef.current) return;
    const quotaFromOverview = waterBudget(overview).quota;
    const quotaDefault = getParamDefault(parameters, 'water_params', 'water_quota_mm', '');
    const resolvedQuota = quotaFromOverview || quotaDefault;
    if (resolvedQuota) {
      setWaterQuota(String(Math.round(Number(resolvedQuota))));
      defaultsAppliedRef.current = true;
    }
  }, [overview, parameters]);

  const runPlan = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await apiPost<any>('/planning/operator/plan', {
        season,
        water_quota_mm: Number(waterQuota),
        min_paddy_area_ha: Number(minPaddyArea) || 0,
        max_risk_level: maxRiskLevel,
        priority,
        rainfall_assumption: rainfallAssumption,
        allow_plan_b: allowPlanB,
        enforce_crop_continuity: cropContinuity,
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Optimization failed');
    } finally {
      setRunning(false);
    }
  };

  const data = unwrapData(result);
  const summary = data.summary || data;
  const allocation = data.allocation || [];
  const context = unwrapData(overview);
  const quotaUsePct = summary.quota_use_pct ?? data.quota_use_pct;

  return (
    <OptimizationFrame
      active="Planner"
      title="Optimization planner"
      subtitle="Officer-safe crop allocation using the F4 operator endpoint"
      onRefresh={loadContext}
    >
      <ApiState loading={loading && !overview && !parameters} error={error && !result ? error : null} onRetry={loadContext}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Input constraints</div>
                <div className="tiny muted">{formatNumber(context.field_count, 0)} fields in current backend scope</div>
              </div>
              <Chip kind={overview?.status === 'ok' ? 'live' : 'sim'}>{overview?.status || 'context'}</Chip>
            </div>

            <div style={{ ...gridAuto(160), marginTop: 12 }}>
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
                <label>Minimum paddy area</label>
                <input className="input" type="number" min="0" step="0.1" value={minPaddyArea} onChange={(event) => setMinPaddyArea(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Maximum risk</label>
                <select className="select" value={maxRiskLevel} onChange={(event) => setMaxRiskLevel(event.target.value)} disabled={running}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select className="select" value={priority} onChange={(event) => setPriority(event.target.value)} disabled={running}>
                  <option value="profit">Profit</option>
                  <option value="balance">Balanced</option>
                  <option value="risk">Risk reduction</option>
                </select>
              </div>
              <div className="field">
                <label>Rainfall assumption</label>
                <select className="select" value={rainfallAssumption} onChange={(event) => setRainfallAssumption(event.target.value)} disabled={running}>
                  <option value="P10">P10 drought</option>
                  <option value="P50">P50 normal</option>
                  <option value="P90">P90 wet</option>
                </select>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0' }}/>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={allowPlanB} onChange={(event) => setAllowPlanB(event.target.checked)} disabled={running}/>
                Allow Plan B fallback
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={cropContinuity} onChange={(event) => setCropContinuity(event.target.checked)} disabled={running}/>
                Enforce crop continuity
              </label>
            </div>

            {error && result && (
              <div style={{ padding: 10, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', height: 40 }} onClick={runPlan} disabled={running || !waterQuota}>
              <Icon name="flash" size={14}/> {running ? 'Running...' : 'Run operator plan'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result ? (
              <>
                <div style={gridAuto(200)}>
                  <MetricCard title="Total profit" value={formatCompact(summary.total_profit, 'LKR ')} sub="Projected from selected crops" icon="chart" chip={result.status || data.status} kind={statusKind(result.status || data.status)}/>
                  <MetricCard title="Allocated area" value={`${formatNumber(summary.total_area, 2)} ha`} sub={`${formatNumber(summary.field_count ?? data.field_count, 0)} fields evaluated`} icon="map" chip="area" kind="sim" color="#6D9F2B"/>
                  <MetricCard title="Water usage" value={formatNumber(summary.water_usage, 1)} sub={`${formatPct(quotaUsePct, 1)} of quota`} icon="wave" chip="quota" kind={quotaUsePct > 100 ? 'crit' : quotaUsePct > 80 ? 'warn' : 'live'} color="var(--secondary)"/>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="card-head" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="card-title">Allocation result</div>
                      <div className="tiny muted">{data.message || result.message || 'Optimizer response'}</div>
                    </div>
                    <Chip kind={statusKind(summary.optimization_status || data.status)}>{summary.optimization_status || data.status || 'done'}</Chip>
                  </div>
                  <AllocationTable allocation={allocation}/>
                </div>
              </>
            ) : running ? (
              <div className="card" style={{ padding: 42, textAlign: 'center' }}>
                <Icon name="flash" size={38} color="var(--primary)"/>
                <div style={{ fontWeight: 700, marginTop: 12 }}>Running optimization</div>
                <div className="tiny muted" style={{ marginTop: 5 }}>The F4 operator endpoint is evaluating the current backend recommendation set.</div>
              </div>
            ) : (
              <EmptyState icon="target" title="No operator plan run yet">
                Configure the constraints and run the planner to create a saved backend artifact.
              </EmptyState>
            )}
          </div>
        </div>
      </ApiState>
    </OptimizationFrame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptimizationPlanner />
    </div>
  );
}

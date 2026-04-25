/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import {
  Icon,
  Chip,
  Frame,
} from '@/components/asi/ui';
import { optNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OptPlanner = () => {
  const { user } = useAuth();

  // Form state
  const [waterQuota, setWaterQuota] = React.useState(980);
  const [totalArea, setTotalArea] = React.useState('9.1');
  const [minPaddyArea, setMinPaddyArea] = React.useState('5.0');
  const [priority, setPriority] = React.useState<'profit' | 'balance' | 'risk'>('profit');
  const [rainfallAssumption, setRainfallAssumption] = React.useState('P50');
  const [allowPlanB, setAllowPlanB] = React.useState(true);
  const [cropContinuity, setCropContinuity] = React.useState(false);
  const [season, setSeason] = React.useState('Maha-2025');

  // Result state
  const [result, setResult] = React.useState<any>(null);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRunOptimization = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await apiPost<any>('/planning/recommendations/optimize', {
        waterQuota: waterQuota,
        constraints: {
          total_area_ha: parseFloat(totalArea) || 0,
          min_paddy_area_ha: parseFloat(minPaddyArea) || 0,
          allow_planb: allowPlanB,
          enforce_crop_continuity: cropContinuity,
          priority: priority,
          rainfall_assumption: rainfallAssumption,
        },
        season,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Optimization failed');
    } finally {
      setRunning(false);
    }
  };

  const allocations = result?.allocations || result?.optimal_allocation || result?.data || [];
  const summary = result?.summary || result || {};
  const solveTime = summary.solve_time_sec ?? summary.solve_time ?? null;
  const gap = summary.gap ?? summary.optimality_gap ?? null;
  const totalProfit = summary.total_profit_lkr ?? summary.total_profit ?? 0;

  const displayName = user?.username || 'Authority';

  return (
    <Frame sidebar={optNav('plan')} breadcrumb={['F4 · ACA-O', 'Planner']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">Optimization planner</div>
          <div className="page-sub">Set constraints → solver returns optimal allocation</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Input constraints</div>
          <div style={{ marginBottom: 16 }}>
            <div className="between small" style={{ marginBottom: 4 }}>
              <span className="muted">Water quota (mm)</span>
              <span className="tabular" style={{ fontWeight: 700 }}>{waterQuota}</span>
            </div>
            <input
              type="range"
              min="200"
              max="1500"
              value={waterQuota}
              onChange={(e) => setWaterQuota(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
              disabled={running}
            />
            <div className="between" style={{ fontSize: 10, color: 'var(--muted)' }}><span>200</span><span>1500</span></div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Total area (ha)</label>
            <input className="input" type="number" step="0.1" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} disabled={running}/>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Minimum paddy area (ha)</label>
            <input className="input" type="number" step="0.1" value={minPaddyArea} onChange={(e) => setMinPaddyArea(e.target.value)} disabled={running}/>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="tiny muted" style={{ marginBottom: 6 }}>Priority</div>
            <div style={{ display: 'flex', background: '#F0F2ED', borderRadius: 8, padding: 3 }}>
              {[['profit', 'Max profit'], ['balance', 'Balance'], ['risk', 'Min risk']].map(([val, label]: any) => (
                <button
                  key={val}
                  onClick={() => setPriority(val)}
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    height: 30,
                    background: priority === val ? 'white' : 'transparent',
                    color: priority === val ? 'var(--text)' : 'var(--muted)',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  disabled={running}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Rainfall assumption</label>
            <select className="select" value={rainfallAssumption} onChange={(e) => setRainfallAssumption(e.target.value)} disabled={running}>
              <option value="P50">P50 · Normal</option>
              <option value="P10">P10 · Drought</option>
              <option value="P90">P90 · Wet</option>
            </select>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Season</label>
            <select className="select" value={season} onChange={(e) => setSeason(e.target.value)} disabled={running}>
              <option value="Maha-2025">Maha 2025-26</option>
              <option value="Yala-2026">Yala 2026</option>
            </select>
          </div>

          <div className="divider" style={{ margin: '10px 0 14px' }}/>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
            <input type="checkbox" checked={allowPlanB} onChange={(e) => setAllowPlanB(e.target.checked)} disabled={running}/> Allow Plan B fallback
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 14 }}>
            <input type="checkbox" checked={cropContinuity} onChange={(e) => setCropContinuity(e.target.checked)} disabled={running}/> Enforce per-field crop continuity
          </label>

          {error && (
            <div style={{ padding: 10, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', height: 40 }}
            onClick={handleRunOptimization}
            disabled={running}
          >
            <Icon name="flash" size={14}/> {running ? 'Running...' : 'Run optimization'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {running && !result ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div className="tiny muted">Optimization in progress...</div>
            </div>
          ) : result ? (
            <>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-title">Optimization result</div>
                  <Chip kind={summary.status === 'OPTIMAL' || summary.converged ? 'live' : 'warn'}>
                    {summary.status || (summary.converged ? 'Converged' : 'Completed')}
                    {gap !== null && ` · ${(gap * 100).toFixed(1)}% gap`}
                    {solveTime !== null && ` · ${solveTime.toFixed(2)}s`}
                  </Chip>
                </div>
                {allocations.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    No allocations returned
                  </div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr><th>Crop</th><th>Area (ha)</th><th>Water (mm)</th><th>Yield</th><th>Profit (LKR)</th></tr>
                    </thead>
                    <tbody>
                      {allocations.map((a: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{a.crop_name || a.name || a.crop || '—'}</td>
                          <td className="tabular">{a.area_ha?.toFixed(1) ?? a.area?.toFixed(1) ?? '—'}</td>
                          <td className="tabular">{a.water_mm ?? a.water_allocated_mm ?? '—'}</td>
                          <td className="tabular">{a.expected_yield_t ? `${a.expected_yield_t.toFixed(1)} t` : '—'}</td>
                          <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>
                            {a.projected_profit_lkr ? `${Math.round(a.projected_profit_lkr / 1000)}k` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Summary metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  <div className="metric" style={{ padding: 10 }}>
                    <div className="metric-label">Total profit</div>
                    <div className="metric-value" style={{ fontSize: 16 }}>
                      LKR {Math.round(totalProfit / 1000)}k
                    </div>
                  </div>
                  <div className="metric" style={{ padding: 10 }}>
                    <div className="metric-label">Water use</div>
                    <div className="metric-value" style={{ fontSize: 16 }}>
                      {summary.total_water_mm ?? '—'} mm
                    </div>
                  </div>
                  <div className="metric" style={{ padding: 10 }}>
                    <div className="metric-label">Risk score</div>
                    <div className="metric-value" style={{ fontSize: 16 }}>
                      {summary.risk_score?.toFixed(2) ?? '—'}
                    </div>
                  </div>
                  <div className="metric" style={{ padding: 10 }}>
                    <div className="metric-label">Quota use</div>
                    <div className="metric-value" style={{ fontSize: 16 }}>
                      {summary.quota_use_pct?.toFixed(1) ?? '—'}%
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <Icon name="target" size={40} color="var(--muted)"/>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No optimization run yet</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                Configure constraints on the left and click "Run optimization" to get optimal crop allocation
              </div>
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptPlanner />
    </div>
  );
}

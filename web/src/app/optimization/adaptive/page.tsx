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
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OptAdaptive = () => {
  const { user } = useAuth();
  const [parameters, setParameters] = React.useState<any>(null);
  const [crops, setCrops] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Slider values
  const [riskTolerance, setRiskTolerance] = React.useState(35);
  const [waterSensitivity, setWaterSensitivity] = React.useState(58);
  const [priceWeight, setPriceWeight] = React.useState(62);
  const [yieldWeight, setYieldWeight] = React.useState(70);

  // Result state
  const [previewResult, setPreviewResult] = React.useState<any>(null);
  const [applying, setApplying] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paramsRes, cropsRes] = await Promise.allSettled([
        apiGet<any>('/planning/adaptive/parameters'),
        apiGet<any>('/planning/adaptive/crops'),
      ]);
      if (paramsRes.status === 'fulfilled') {
        setParameters(paramsRes.value);
        // Initialize sliders from defaults if available
        const p = paramsRes.value;
        if (p.defaults) {
          if (typeof p.defaults.risk_tolerance === 'number') setRiskTolerance(Math.round(p.defaults.risk_tolerance * 100));
          if (typeof p.defaults.water_sensitivity === 'number') setWaterSensitivity(Math.round(p.defaults.water_sensitivity * 100));
          if (typeof p.defaults.price_weight === 'number') setPriceWeight(Math.round(p.defaults.price_weight * 100));
          if (typeof p.defaults.yield_weight === 'number') setYieldWeight(Math.round(p.defaults.yield_weight * 100));
        }
      }
      if (cropsRes.status === 'fulfilled') {
        setCrops(Array.isArray(cropsRes.value) ? cropsRes.value : cropsRes.value?.crops || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await apiPost<any>('/planning/adaptive', {
        risk_tolerance: riskTolerance / 100,
        water_sensitivity: waterSensitivity / 100,
        price_weight: priceWeight / 100,
        yield_weight: yieldWeight / 100,
      });
      setPreviewResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to apply parameters');
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    if (parameters?.defaults) {
      const p = parameters.defaults;
      setRiskTolerance(Math.round((p.risk_tolerance || 0.35) * 100));
      setWaterSensitivity(Math.round((p.water_sensitivity || 0.58) * 100));
      setPriceWeight(Math.round((p.price_weight || 0.62) * 100));
      setYieldWeight(Math.round((p.yield_weight || 0.70) * 100));
    } else {
      setRiskTolerance(35);
      setWaterSensitivity(58);
      setPriceWeight(62);
      setYieldWeight(70);
    }
    setPreviewResult(null);
  };

  const displayName = user?.username || 'Authority';

  const sliders = [
    ['Risk tolerance', riskTolerance, setRiskTolerance, 'Higher = accept more variance', 'var(--danger)'],
    ['Water sensitivity', waterSensitivity, setWaterSensitivity, 'Penalty on exceeding quota', 'var(--secondary)'],
    ['Price weight', priceWeight, setPriceWeight, 'Lean into market price signals', 'var(--accent)'],
    ['Yield weight', yieldWeight, setYieldWeight, 'Favor high-yield varieties', 'var(--primary)'],
  ];

  const previewRecs = previewResult?.recommendations || previewResult?.data || [];

  return (
    <Frame sidebar={optNav('ada')} breadcrumb={['F4 · ACA-O', 'Adaptive Tuning']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">Adaptive recommendations</div>
          <div className="page-sub">Tune solver weights → see recommendation change</div>
        </div>
      </div>

      <ApiState loading={loading && !parameters} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Parameter tuning</div>
            {sliders.map(([label, val, setter, hint, color]: any) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div className="between small" style={{ marginBottom: 3 }}>
                  <span className="muted">{label}</span>
                  <span className="tabular" style={{ fontWeight: 700, color }}>{val}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={val}
                  onChange={(e) => setter(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: color }}
                  disabled={applying}
                />
                <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>
              </div>
            ))}
            <div className="divider" style={{ margin: '8px 0 14px' }}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleReset} disabled={applying}>Reset</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApply} disabled={applying}>
                {applying ? 'Running...' : 'Apply parameters'}
              </button>
            </div>
            {crops.length > 0 && (
              <>
                <div className="divider" style={{ margin: '14px 0' }}/>
                <div className="tiny muted" style={{ marginBottom: 4 }}>Available crops: {crops.length}</div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {previewResult ? (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Adaptive preview · top {Math.min(previewRecs.length, 6)} crops</div>
                  <Chip kind="sim" dot={false}>Live preview</Chip>
                </div>
                {previewRecs.length === 0 ? (
                  <div className="tiny muted">No recommendations returned for these parameters</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {previewRecs.slice(0, 6).map((c: any, i: number) => {
                      const name = c.crop_name || c.name || 'Unknown';
                      const score = c.suitability_score ?? c.score ?? 0;
                      const color = score >= 0.8 ? 'var(--primary)' : score >= 0.65 ? '#8BC34A' : 'var(--accent)';
                      return (
                        <div key={i} style={{ padding: 14, border: `1.5px solid ${color}`, borderRadius: 10, background: color + '08' }}>
                          <div className="between">
                            <div style={{ fontWeight: 700, fontSize: 13 }}>#{i+1} {name}</div>
                            <div className="tabular" style={{ fontWeight: 700, color }}>{score.toFixed(2)}</div>
                          </div>
                          <div className="prog" style={{ marginTop: 8 }}>
                            <div className="prog-fill" style={{ width: (score * 100) + '%', background: color }}/>
                          </div>
                          {c.explanation && (
                            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{c.explanation}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <Icon name="gear" size={40} color="var(--muted)"/>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Tune and apply parameters</div>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  Adjust the sliders on the left and click "Apply parameters" to see real-time crop recommendations
                </div>
              </div>
            )}
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptAdaptive />
    </div>
  );
}

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
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OptRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [cropFilter, setCropFilter] = React.useState('');
  const [suitabilityThreshold, setSuitabilityThreshold] = React.useState(0.65);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/planning/recommendations');
      const recList = Array.isArray(res) ? res : res?.recommendations || res?.data || [];
      setRecommendations(recList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Flatten all crop recommendations from all recommendation records
  const allCropRecs: any[] = [];
  recommendations.forEach((r: any) => {
    const recs = r.recommendations || r.crop_recommendations || (r.response_data?.recommendations) || [];
    recs.forEach((cr: any) => {
      allCropRecs.push({
        ...cr,
        field_id: r.field_id,
        field_name: r.field_name,
        season: r.season,
      });
    });
  });

  const filteredRecs = allCropRecs.filter((c: any) => {
    const suitability = c.suitability_score ?? c.suitability ?? 0;
    if (suitability < suitabilityThreshold) return false;
    if (cropFilter && !(c.crop_name || c.name || '').toLowerCase().includes(cropFilter.toLowerCase())) return false;
    return true;
  });

  const displayName = user?.username || 'Authority';

  return (
    <Frame sidebar={optNav('rec')} breadcrumb={['F4 · ACA-O', 'Recommendations']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">Crop recommendations</div>
          <div className="page-sub">{filteredRecs.length} of {allCropRecs.length} crop recommendations</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 120px', gap: 12, alignItems: 'end' }}>
          <div className="field">
            <label>Crop filter</label>
            <input
              className="input"
              placeholder="Filter by crop name..."
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Suitability threshold <span className="tabular" style={{ color: 'var(--text)', fontWeight: 700 }}>≥ {suitabilityThreshold.toFixed(2)}</span></label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={suitabilityThreshold}
              onChange={(e) => setSuitabilityThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>
          <button className="btn btn-ghost" onClick={() => { setCropFilter(''); setSuitabilityThreshold(0); }}>
            <Icon name="x" size={13}/> Clear
          </button>
        </div>
      </div>

      <ApiState loading={loading && recommendations.length === 0} error={error} onRetry={loadData}>
        {allCropRecs.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Icon name="target" size={40} color="var(--muted)"/>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No recommendations yet</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              Generate recommendations from the <a href="/optimization/planner" style={{ color: 'var(--primary-600)' }}>Planner page</a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {filteredRecs.slice(0, 24).map((c: any, i: number) => {
              const name = c.crop_name || c.name || 'Unknown';
              const suitability = c.suitability_score ?? c.suitability ?? 0;
              const yieldTha = c.expected_yield_t_ha ?? c.yield_t_ha ?? null;
              const priceLkr = c.price_per_kg ?? c.price ?? null;
              const profit = c.projected_profit_lkr ?? c.profit_lkr ?? null;
              const waterMm = c.water_requirement_mm ?? c.water_mm ?? null;
              const color = suitability >= 0.8 ? 'var(--primary)' : suitability >= 0.65 ? '#8BC34A' : 'var(--accent)';

              return (
                <div key={i} className="card" style={{ padding: 14 }}>
                  <div className="between">
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name}</div>
                    {suitability >= 0.8 && <Chip kind="live">Top pick</Chip>}
                    {suitability < 0.5 && <Chip kind="crit">Low fit</Chip>}
                  </div>
                  {c.field_name && <div className="tiny muted" style={{ marginTop: 4 }}>{c.field_name}</div>}
                  <div style={{ marginTop: 10 }}>
                    <div className="between small muted">
                      <span>Suitability</span>
                      <span className="tabular" style={{ color: 'var(--text)', fontWeight: 700 }}>{suitability.toFixed(2)}</span>
                    </div>
                    <div className="prog">
                      <div className="prog-fill" style={{ width: (suitability * 100) + '%', background: color }}/>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10, fontSize: 11.5 }}>
                    <div>
                      <div className="muted tiny">Yield</div>
                      <div className="tabular" style={{ fontWeight: 600 }}>{yieldTha ? `${yieldTha.toFixed(1)} t/ha` : '—'}</div>
                    </div>
                    <div>
                      <div className="muted tiny">Price</div>
                      <div className="tabular" style={{ fontWeight: 600 }}>{priceLkr ? `LKR ${priceLkr}/kg` : '—'}</div>
                    </div>
                    <div>
                      <div className="muted tiny">Profit</div>
                      <div className="tabular" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>
                        {profit ? `LKR ${Math.round(profit / 1000)}k` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="muted tiny">Water</div>
                      <div className="tabular" style={{ fontWeight: 600 }}>{waterMm ? `${waterMm} mm` : '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptRecommendations />
    </div>
  );
}

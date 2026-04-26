/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import {
  Icon,
  LogoMark,
  Logo,
  AppBar,
  Sidebar,
  Chip,
  Progress,
  Gauge,
  Sparkline,
  LineChart,
  BarChart,
  ForecastChart,
  Donut,
  SchemeMap,
  Frame,
} from '@/components/asi/ui';
import { farmerNav, officerNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const WaterManagement = () => {
  const { user } = useAuth();
  const [reservoir, setReservoir] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Manual override form
  const [overrideVolumeMm, setOverrideVolumeMm] = React.useState('24');
  const [overrideReason, setOverrideReason] = React.useState('');
  const [overrideSubmitting, setOverrideSubmitting] = React.useState(false);
  const [overrideMsg, setOverrideMsg] = React.useState<{type: string, text: string} | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/water-management/reservoir/current');
      setReservoir(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reservoir data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideMsg({ type: 'error', text: 'Reason is required' });
      return;
    }
    setOverrideSubmitting(true);
    setOverrideMsg(null);
    try {
      await apiPost('/water-management/manual-override', {
        action: 'OPEN',
        target_release_mm: parseFloat(overrideVolumeMm) || 0,
        reason: overrideReason,
      });
      setOverrideMsg({ type: 'success', text: 'Manual override queued successfully' });
      setOverrideReason('');
      loadData();
    } catch (err: any) {
      setOverrideMsg({ type: 'error', text: err?.message || 'Failed to queue override' });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const capacity = reservoir?.capacity_mcm || reservoir?.total_storage_mcm || 145;
  const currentVolume = reservoir?.active_storage_mcm || reservoir?.volume_mcm || 0;
  const percentFull = capacity > 0 ? Math.round((currentVolume / capacity) * 100) : 0;
  const inflow = reservoir?.inflow_m3s || reservoir?.inflow_mcm || 0;
  const outflow = reservoir?.outflow_m3s || reservoir?.main_canals_mcm || 0;
  const evap = reservoir?.evap_mm_d || reservoir?.evap_mm || 0;

  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={irrigationNav('water')}
      breadcrumb={['Modules', 'F1 · Irrigation', 'Water Management']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Water management</div>
          <div className="page-sub">Ulhitiya reservoir · Capacity {capacity} MCM</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>
      </div>

      <ApiState loading={loading && !reservoir} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.3fr', gap: 14 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="card-head" style={{ width: '100%' }}>
              <div>
                <div className="card-title">Reservoir level</div>
                <div className="tiny muted">
                  {reservoir?.observed_at ? `Updated ${new Date(reservoir.observed_at).toLocaleString()}` : 'Live data'}
                </div>
              </div>
              <Chip kind={percentFull > 70 ? 'live' : percentFull > 40 ? 'warn' : 'crit'}>
                {percentFull > 70 ? 'On track' : percentFull > 40 ? 'Caution' : 'Low'}
              </Chip>
            </div>
            <Gauge
              value={percentFull}
              max={100}
              size={220}
              stroke={22}
              color="var(--secondary)"
              label={`${percentFull}%`}
              sub={`${currentVolume.toFixed(1)} / ${capacity} MCM`}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginTop: 16 }}>
              <div className="metric" style={{ padding: 10 }}>
                <div className="metric-label">Inflow</div>
                <div className="metric-value" style={{ fontSize: 16 }}>
                  {typeof inflow === 'number' ? inflow.toFixed(1) : '—'} <span style={{ fontSize: 11, color: 'var(--muted)' }}>MCM</span>
                </div>
              </div>
              <div className="metric" style={{ padding: 10 }}>
                <div className="metric-label">Outflow</div>
                <div className="metric-value" style={{ fontSize: 16 }}>
                  {typeof outflow === 'number' ? outflow.toFixed(1) : '—'} <span style={{ fontSize: 11, color: 'var(--muted)' }}>MCM</span>
                </div>
              </div>
              <div className="metric" style={{ padding: 10 }}>
                <div className="metric-label">Evap</div>
                <div className="metric-value" style={{ fontSize: 16 }}>
                  {typeof evap === 'number' ? evap.toFixed(1) : '—'} <span style={{ fontSize: 11, color: 'var(--muted)' }}>mm</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Reservoir details</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
              {reservoir?.water_level_mmsl && <div>Water level: <b>{reservoir.water_level_mmsl} mMSL</b></div>}
              {reservoir?.rain_mm !== undefined && <div>Recent rainfall: <b>{reservoir.rain_mm} mm</b></div>}
              {reservoir?.spillway_mcm !== undefined && <div>Spillway: <b>{reservoir.spillway_mcm} MCM</b></div>}
              {reservoir?.wind_speed_ms !== undefined && <div>Wind speed: <b>{reservoir.wind_speed_ms} m/s</b></div>}
              {reservoir?.source && <div>Source: <b>{reservoir.source}</b></div>}
              {reservoir?.status && <div>Status: <b>{reservoir.status}</b></div>}
            </div>
            {reservoir?.prediction && (
              <>
                <div className="divider" style={{ margin: '14px 0' }}/>
                <div className="tiny muted">ML prediction</div>
                <div style={{ padding: 10, background: 'var(--primary-50)', borderRadius: 8, marginTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Predicted release: {reservoir.prediction.predicted_release_mcm?.toFixed(2)} MCM
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    Model: {reservoir.prediction.model_name || 'HistGBM'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginTop: 14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Manual override</div>
            <form onSubmit={handleManualOverride}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                <div className="field">
                  <label>Target release (mm)</label>
                  <input className="input" type="number" step="0.1" value={overrideVolumeMm} onChange={(e) => setOverrideVolumeMm(e.target.value)} disabled={overrideSubmitting}/>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Reason</label>
                  <textarea className="textarea" rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Explain the reason for this manual override..." disabled={overrideSubmitting}/>
                </div>
              </div>
              {overrideMsg && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: overrideMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  border: `1px solid ${overrideMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                  borderRadius: 6,
                  color: overrideMsg.type === 'success' ? '#166534' : '#DC2626',
                  fontSize: 12,
                }}>
                  {overrideMsg.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOverrideReason('')} disabled={overrideSubmitting}>Clear</button>
                <button type="submit" className="btn btn-primary" disabled={overrideSubmitting}>
                  {overrideSubmitting ? 'Queuing...' : 'Queue release'}
                </button>
              </div>
            </form>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Observations snapshot</div>
              <Chip kind="info" dot={false}>Current state</Chip>
            </div>
            <div style={{ fontSize: 12.5, padding: 12, background: '#F6F8F4', borderRadius: 8 }}>
              {reservoir ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Raw reservoir data</div>
                  <pre style={{ fontSize: 10, overflow: 'auto', maxHeight: 160 }}>
                    {JSON.stringify(reservoir, null, 2).slice(0, 800)}
                  </pre>
                </>
              ) : (
                <div className="tiny muted">No data available</div>
              )}
            </div>
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <WaterManagement />
    </div>
  );
}

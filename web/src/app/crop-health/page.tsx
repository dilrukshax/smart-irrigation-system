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
import { apiGet, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CropHealth = () => {
  const { user } = useAuth();
  const [zones, setZones] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Image upload state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [predictionResult, setPredictionResult] = React.useState<any>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [zonesRes, summaryRes] = await Promise.allSettled([
        apiGet<any>('/crop-health/zones'),
        apiGet<any>('/crop-health/zones/summary'),
      ]);
      if (zonesRes.status === 'fulfilled') {
        const zoneList = Array.isArray(zonesRes.value) ? zonesRes.value : zonesRes.value?.zones || zonesRes.value?.data || [];
        setZones(zoneList);
      }
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);

      if (zonesRes.status === 'rejected' && summaryRes.status === 'rejected') {
        setError('Failed to load crop health data. Service may be initializing.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    setPredictionResult(null);
    try {
      const res = await uploadFile<any>('/crop-health/predict', uploadedFile);
      setPredictionResult(res);
    } catch (err: any) {
      setPredictionResult({ error: err?.message || 'Prediction failed' });
    } finally {
      setUploading(false);
    }
  };

  const displayName = user?.username || 'Officer';
  const totalZones = summary?.total_zones ?? zones.length;
  const healthyZones = summary?.healthy_count ?? zones.filter((z: any) => (z.ndvi || z.score || 0) > 0.7).length;
  const stressedZones = summary?.stressed_count ?? zones.filter((z: any) => {
    const v = z.ndvi || z.score || 0;
    return v >= 0.4 && v <= 0.7;
  }).length;
  const criticalZones = summary?.critical_count ?? zones.filter((z: any) => (z.ndvi || z.score || 0) < 0.4).length;
  const healthyPct = totalZones > 0 ? Math.round((healthyZones / totalZones) * 100) : 0;

  return (
    <Frame
      sidebar={[
        { label: 'F2 · Crop Health', items: [
          { name: 'Overview', icon: 'home', active: true },
          { name: 'Zone Map', icon: 'map' },
          { name: 'Disease Scans', icon: 'shield_check' },
          { name: 'Stress Alerts', icon: 'bell' },
        ]},
        { label: 'Modules', items: [
          { name: 'Irrigation', icon: 'droplet' },
          { name: 'Forecasting', icon: 'cloud' },
          { name: 'Optimization', icon: 'target' },
        ]},
      ]}
      breadcrumb={['Modules', 'F2 · Crop Health']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Crop health · scheme-wide</div>
          <div className="page-sub">{totalZones} zones tracked · NDVI-based analysis</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>
      </div>

      <ApiState loading={loading && zones.length === 0} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Zones ({zones.length})</div>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {zones.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No zones available
                </div>
              ) : (
                zones.map((z: any, i: number) => {
                  const ndvi = z.ndvi || z.score || 0;
                  const status = ndvi > 0.7 ? 'live' : ndvi > 0.4 ? 'warn' : 'crit';
                  const label = ndvi > 0.7 ? 'Healthy' : ndvi > 0.4 ? 'Stressed' : 'Critical';
                  return (
                    <div key={z.id || i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px 90px', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{z.zone_id || z.id || `Z-${i+1}`}</span>
                      <span className="muted">{z.field_name || z.field || z.label || '—'}</span>
                      <span className="tabular" style={{ fontWeight: 600 }}>{typeof ndvi === 'number' ? ndvi.toFixed(2) : '—'}</span>
                      <Chip kind={status}>{label}</Chip>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Health distribution</div>
              <Chip kind="info" dot={false}>{totalZones} zones</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Donut
                size={130}
                segments={[
                  { value: healthyZones, color: 'var(--primary)' },
                  { value: stressedZones, color: 'var(--accent)' },
                  { value: criticalZones, color: 'var(--danger)' },
                ]}
                center={<><div style={{ fontSize: 20, fontWeight: 700 }} className="tabular">{healthyPct}%</div><div className="tiny muted">healthy</div></>}
              />
              <div style={{ flex: 1 }}>
                {[
                  ['Healthy', healthyZones, 'var(--primary)'],
                  ['Stressed', stressedZones, 'var(--accent)'],
                  ['Critical', criticalZones, 'var(--danger)'],
                ].map((r: any) => (
                  <div key={r[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: r[2] }}/>
                    <span style={{ flex: 1 }}>{r[0]}</span>
                    <span className="tabular" style={{ fontWeight: 700 }}>{r[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-head">
            <div className="card-title">Image diagnosis (MobileNetV2)</div>
            <Chip kind="sim" dot={false}>AI model</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="field">
                <label>Upload leaf image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  className="input"
                  disabled={uploading}
                />
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>JPG/PNG, max 12 MB. 38 crop disease classes supported.</div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12, width: '100%' }}
                onClick={handleImageUpload}
                disabled={!uploadedFile || uploading}
              >
                {uploading ? 'Analyzing...' : 'Run detection'}
              </button>
            </div>
            <div>
              {predictionResult ? (
                predictionResult.error ? (
                  <div style={{ padding: 12, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>
                    {predictionResult.error}
                  </div>
                ) : (
                  <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 8 }}>
                    <div className="tiny muted" style={{ marginBottom: 6 }}>Prediction</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {predictionResult.predicted_class || predictionResult.class_label || 'Unknown'}
                    </div>
                    {predictionResult.confidence !== undefined && (
                      <>
                        <div className="tiny muted" style={{ marginTop: 8 }}>Confidence</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <div className="prog" style={{ flex: 1 }}>
                            <div className="prog-fill" style={{ width: (predictionResult.confidence * 100) + '%', background: 'var(--primary)' }}/>
                          </div>
                          <div className="tabular" style={{ fontWeight: 700 }}>{(predictionResult.confidence * 100).toFixed(1)}%</div>
                        </div>
                      </>
                    )}
                    {predictionResult.source && (
                      <div className="tiny muted" style={{ marginTop: 8 }}>Source: {predictionResult.source}</div>
                    )}
                  </div>
                )
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12, border: '2px dashed var(--border)', borderRadius: 8, height: '100%' }}>
                  Upload an image to see prediction results
                </div>
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
      <CropHealth />
    </div>
  );
}

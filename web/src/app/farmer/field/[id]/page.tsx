/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { useParams } from 'next/navigation';
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
import { ApiState, InlineLoader } from '@/components/asi/api-state';
import { apiGet, apiPost, uploadFile, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const FieldWorkspace = () => {
  const params = useParams();
  const fieldId = params?.id as string;
  const { user } = useAuth();

  const [tab, setTab] = React.useState(0);
  const tabs = ['Overview', 'Irrigation', 'Crop Health', 'Forecast', 'Optimization'];

  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Manual request form state
  const [requestVolume, setRequestVolume] = React.useState('25');
  const [requestReason, setRequestReason] = React.useState('');
  const [requestSubmitting, setRequestSubmitting] = React.useState(false);
  const [requestMsg, setRequestMsg] = React.useState<{type: string, text: string} | null>(null);

  // Image upload state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [predictionResult, setPredictionResult] = React.useState<any>(null);

  // Valve control state
  const [valveActing, setValveActing] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!fieldId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>(`/farm/fields/${fieldId}/profile`);
      setProfile(res);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Field not found');
      } else {
        setError(err?.message || 'Failed to load field profile');
      }
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setRequestMsg({ type: 'error', text: 'Please provide a reason for the request.' });
      return;
    }
    setRequestSubmitting(true);
    setRequestMsg(null);
    try {
      await apiPost(`/irrigation/fields/${fieldId}/manual-requests`, {
        requested_action: 'OPEN',
        requested_position_pct: 100,
        reason: requestReason,
      });
      setRequestMsg({ type: 'success', text: 'Request submitted to officer for review.' });
      setRequestReason('');
      loadProfile();
    } catch (err: any) {
      setRequestMsg({ type: 'error', text: err?.message || 'Failed to submit request' });
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleValveCommand = async (action: string) => {
    setValveActing(true);
    try {
      await apiPost(`/irrigation/fields/${fieldId}/commands`, {
        action,
        position_pct: action === 'OPEN' ? 100 : 0,
        reason: 'Manual override from farmer workspace',
      });
      loadProfile();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setValveActing(false);
    }
  };

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

  const displayName = user?.username || 'Farmer';

  // Extract data from profile
  const f1 = profile?.sections?.f1 || {};
  const f2 = profile?.sections?.f2 || {};
  const f3 = profile?.sections?.f3 || {};
  const f4 = profile?.sections?.f4 || {};

  const fieldStatus = f1.field_status || {};
  const autoDecision = f1.auto_decision || {};
  const fieldName = fieldStatus.field_name || profile?.field_name || `Field ${fieldId}`;
  const cropType = fieldStatus.crop_type || 'Unknown';
  const area = fieldStatus.area_hectares || 0;
  const telemetry = fieldStatus.latest_telemetry || {};
  const valveState = fieldStatus.valve_state || {};
  const isValveOpen = String(valveState.state || '').toLowerCase() === 'open';

  const soilMoisture = telemetry.soil_moisture_pct ?? null;
  const temp = telemetry.temperature_celsius ?? telemetry.temp ?? null;
  const humidity = telemetry.humidity_percent ?? telemetry.humidity ?? null;
  const waterLevel = telemetry.water_level_pct ?? telemetry.water_level ?? null;

  const stressSummary = f2.stress_summary || {};
  const healthScore = stressSummary.health_score ?? stressSummary.ndvi_score ?? null;
  const stressLevel = stressSummary.stress_level || 'unknown';
  const zones = stressSummary.zones || [];
  const stressAlerts = stressSummary.alerts || [];

  const weatherSummary = f3.weather_summary || {};
  const forecastRec = f3.irrigation_recommendation || {};

  const recommendations = (f4.recommendations?.data?.[0]?.recommendations) || f4.recommendations || [];

  return (
    <Frame
      sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))}
      breadcrumb={['Farmer', 'My Fields', fieldName]}
      user={displayName}
      role="Farmer"
    >
      <ApiState loading={loading && !profile} error={error} onRetry={loadProfile}>
        <div className="page-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="page-title">{fieldName}</div>
              <Chip kind={isValveOpen ? 'live' : 'off'}>
                Valve {isValveOpen ? 'open' : 'closed'}
              </Chip>
            </div>
            <div className="page-sub">
              {cropType} · {area} ha
              {fieldStatus.latitude && ` · Coord ${fieldStatus.latitude.toFixed(4)}°, ${fieldStatus.longitude?.toFixed(4)}°`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadProfile}>
              <Icon name="download" size={13}/> Refresh
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setTab(1)}
            >
              <Icon name="droplet" size={13}/> Request irrigation
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="btn btn-sm"
              style={{
                borderRadius: 0,
                background: 'transparent',
                height: 36,
                padding: '0 14px',
                color: tab === i ? 'var(--primary-600)' : 'var(--muted)',
                fontWeight: 600,
                borderBottom: tab === i ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Soil moisture', value: soilMoisture !== null ? `${soilMoisture.toFixed(0)}%` : '—', icon: 'humidity' },
                  { label: 'Temperature', value: temp !== null ? `${temp.toFixed(1)}°C` : '—', icon: 'thermo' },
                  { label: 'Humidity', value: humidity !== null ? `${humidity.toFixed(0)}%` : '—', icon: 'cloud' },
                  { label: 'Water level', value: waterLevel !== null ? `${waterLevel.toFixed(0)}%` : '—', icon: 'droplet' },
                ].map((m, i) => (
                  <div key={i} className="metric">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="metric-label">{m.label}</div>
                      <Icon name={m.icon} size={14} color="var(--muted)"/>
                    </div>
                    <div className="metric-value">{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Telemetry status</div>
                {telemetry.timestamp ? (
                  <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                    <div>Last reading: <b>{new Date(telemetry.timestamp).toLocaleString()}</b></div>
                    <div>Source: <b>{telemetry.source || 'IoT sensor'}</b></div>
                    {telemetry.battery_v && <div>Battery: <b>{telemetry.battery_v}V</b></div>}
                    {telemetry.rssi && <div>Signal: <b>{telemetry.rssi} dBm</b></div>}
                  </div>
                ) : (
                  <div className="tiny muted">No recent telemetry available</div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Valve control</div>
                <Chip kind={isValveOpen ? 'live' : 'off'}>
                  {isValveOpen ? 'Open' : 'Closed'}
                </Chip>
              </div>
              <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: isValveOpen ? 'var(--primary)' : 'var(--muted)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="valve" size={22}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    Valve {isValveOpen ? 'Open' : 'Closed'}
                  </div>
                  <div className="tiny muted">
                    {valveState.last_action_time ? `Since ${new Date(valveState.last_action_time).toLocaleString()}` : 'No recent action'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleValveCommand('OPEN')}
                  disabled={valveActing || isValveOpen}
                >
                  Open
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleValveCommand('CLOSE')}
                  disabled={valveActing || !isValveOpen}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleValveCommand('AUTO')}
                  disabled={valveActing}
                >
                  Auto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Irrigation Tab */}
        {tab === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Auto decision</div>
              {autoDecision.decision ? (
                <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-600)' }}>DECISION</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                    {autoDecision.decision}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    Model: {autoDecision.model_name || 'ACA-I'} · confidence {autoDecision.confidence?.toFixed(2) || 'N/A'}
                    {autoDecision.reason && ` · ${autoDecision.reason}`}
                  </div>
                </div>
              ) : (
                <div className="tiny muted">No recent auto-decision available</div>
              )}
              <div style={{ marginTop: 20 }}>
                <div className="card-title" style={{ marginBottom: 10 }}>Manual request</div>
                <form onSubmit={handleManualRequest}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
                    <div className="field">
                      <label>Volume (mm)</label>
                      <input
                        className="input"
                        value={requestVolume}
                        onChange={(e) => setRequestVolume(e.target.value)}
                        disabled={requestSubmitting}
                      />
                    </div>
                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                      <label>Reason</label>
                      <textarea
                        className="textarea"
                        rows={2}
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        placeholder="Describe why you need extra irrigation..."
                        disabled={requestSubmitting}
                      />
                    </div>
                  </div>
                  {requestMsg && (
                    <div style={{
                      marginTop: 10,
                      padding: 10,
                      background: requestMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                      border: `1px solid ${requestMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                      borderRadius: 6,
                      color: requestMsg.type === 'success' ? '#166534' : '#DC2626',
                      fontSize: 12,
                    }}>
                      {requestMsg.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ marginTop: 10, width: '100%' }}
                    disabled={requestSubmitting}
                  >
                    {requestSubmitting ? 'Submitting...' : 'Submit to officer'}
                  </button>
                </form>
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Field status</div>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                <div>Auto-control: <b>{fieldStatus.auto_control_enabled ? 'Enabled' : 'Disabled'}</b></div>
                <div>Lifecycle: <b>{fieldStatus.lifecycle_state || 'ACTIVE'}</b></div>
                <div>Pairing: <b>{fieldStatus.pairing_status || 'UNPAIRED'}</b></div>
                {fieldStatus.device_id && <div>Device: <b>{fieldStatus.device_id}</b></div>}
                {fieldStatus.soil_moisture_optimal && <div>Optimal soil moisture: <b>{fieldStatus.soil_moisture_optimal}%</b></div>}
              </div>
            </div>
          </div>
        )}

        {/* Crop Health Tab */}
        {tab === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Health score</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Gauge
                  value={healthScore !== null ? Math.round(healthScore * 100) : 0}
                  size={160}
                  color={healthScore > 0.7 ? 'var(--primary)' : healthScore > 0.4 ? 'var(--accent)' : 'var(--danger)'}
                  sub={healthScore !== null ? `Score ${healthScore.toFixed(2)}` : 'No data'}
                />
              </div>
              <div className="divider" style={{ margin: '14px 0' }}/>
              <div className="tiny muted">Stress level: <b>{stressLevel}</b></div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Image diagnosis</div>
              <div className="field">
                <label>Upload leaf image for disease detection</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  className="input"
                  disabled={uploading}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8, width: '100%' }}
                onClick={handleImageUpload}
                disabled={!uploadedFile || uploading}
              >
                {uploading ? 'Analyzing...' : 'Run detection'}
              </button>
              {predictionResult && (
                <div style={{ marginTop: 12, padding: 10, background: predictionResult.error ? '#FEE2E2' : '#DCFCE7', borderRadius: 6, fontSize: 12 }}>
                  {predictionResult.error ? (
                    <div style={{ color: '#DC2626' }}>{predictionResult.error}</div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600 }}>{predictionResult.predicted_class || predictionResult.class_label || 'Unknown'}</div>
                      {predictionResult.confidence && (
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          Confidence: {(predictionResult.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Stress alerts</div>
              {stressAlerts.length === 0 ? (
                <div className="tiny muted">No alerts</div>
              ) : (
                stressAlerts.map((a: any, i: number) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < stressAlerts.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div className="between">
                      <Chip kind={a.severity === 'high' ? 'crit' : a.severity === 'medium' ? 'warn' : 'info'}>
                        {a.type || 'Alert'}
                      </Chip>
                      <span className="tiny muted">{a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''}</span>
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>{a.message || a.description || '—'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Forecast Tab */}
        {tab === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">14-day forecast</div>
                <Chip kind={weatherSummary.is_live ? 'live' : 'sim'}>
                  {weatherSummary.is_live ? 'Live' : 'Simulated'}
                </Chip>
              </div>
              <ForecastChart width={700} height={260} days={14}/>
              <div className="tiny muted" style={{ marginTop: 8 }}>
                Source: {weatherSummary.source || 'Open-Meteo'}
              </div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Irrigation recommendation</div>
              {forecastRec.recommendation ? (
                <div style={{ padding: 12, background: 'var(--primary-50)', borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{forecastRec.recommendation}</div>
                  {forecastRec.adjustment_percent !== undefined && (
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Adjustment: {forecastRec.adjustment_percent > 0 ? '+' : ''}{forecastRec.adjustment_percent}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="tiny muted" style={{ marginBottom: 12 }}>No recommendation available</div>
              )}
              {forecastRec.narrative && (
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  {forecastRec.narrative}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Optimization Tab */}
        {tab === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Recommended crops</div>
              {recommendations.length === 0 ? (
                <div className="tiny muted">No recommendations yet. Visit the <a href="/optimization/planner" style={{ color: 'var(--primary-600)' }}>planner</a> to generate one.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Crop</th><th>Suitability</th><th>Yield</th><th>Profit</th><th>Water</th></tr>
                  </thead>
                  <tbody>
                    {recommendations.slice(0, 5).map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.crop_name || r.name || '—'}</td>
                        <td style={{ width: 180 }}>
                          {r.suitability_score !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="prog" style={{ flex: 1 }}>
                                <div className="prog-fill" style={{ width: (r.suitability_score * 100) + '%', background: r.suitability_score > 0.85 ? 'var(--primary)' : r.suitability_score > 0.7 ? '#8BC34A' : 'var(--accent)' }}/>
                              </div>
                              <span className="tabular small" style={{ fontWeight: 600 }}>{r.suitability_score.toFixed(2)}</span>
                            </div>
                          )}
                        </td>
                        <td className="tabular">{r.expected_yield_t_ha ? `${r.expected_yield_t_ha.toFixed(1)} t/ha` : '—'}</td>
                        <td className="tabular">{r.projected_profit_lkr ? `LKR ${Math.round(r.projected_profit_lkr / 1000)}k` : '—'}</td>
                        <td className="tabular muted">{r.water_requirement_mm ? `${r.water_requirement_mm} mm` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Field context</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                <div>Soil type: <b>{fieldStatus.soil_type || 'Unknown'}</b></div>
                <div>Area: <b>{area} ha</b></div>
                <div>Current crop: <b>{cropType}</b></div>
                <div>Scheme: <b>{fieldStatus.scheme_id || '—'}</b></div>
              </div>
              {f4.optimization_context && (
                <>
                  <div className="divider" style={{ margin: '14px 0' }}/>
                  <div className="tiny muted" style={{ marginBottom: 4 }}>Optimization context</div>
                  <div style={{ fontSize: 12 }}>
                    Source: {f4.optimization_context.source || 'model'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {profile?.errors && Object.keys(profile.errors).length > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Partial data</div>
            <div className="tiny muted">
              Some services had errors: {Object.keys(profile.errors).join(', ')}
            </div>
          </div>
        )}
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldWorkspace />
    </div>
  );
}

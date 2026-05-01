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
import { farmerNav, officerNav, officerModuleNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const SensorTelemetry = () => {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<any[]>([]);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string>('');
  const [latest, setLatest] = React.useState<any>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const displayName = user?.username || 'Officer';

  // Load list of fields first
  const loadFields = React.useCallback(async () => {
    try {
      const res = await apiGet<any>('/farm/fields');
      const fieldList = Array.isArray(res) ? res : res?.fields || res?.data || [];
      setFields(fieldList);
      if (fieldList.length > 0 && !selectedFieldId) {
        setSelectedFieldId(fieldList[0].field_id || fieldList[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load fields');
    }
  }, [selectedFieldId]);

  // Load telemetry for selected field
  const loadTelemetry = React.useCallback(async () => {
    if (!selectedFieldId) return;
    setLoading(true);
    setError(null);
    try {
      const [latestRes, historyRes] = await Promise.allSettled([
        apiGet<any>(`/telemetry/fields/${selectedFieldId}/latest`),
        apiGet<any>(`/telemetry/fields/${selectedFieldId}/history?limit=100`),
      ]);
      if (latestRes.status === 'fulfilled') setLatest(latestRes.value);
      if (historyRes.status === 'fulfilled') {
        const hist = historyRes.value?.readings || historyRes.value?.data || historyRes.value || [];
        setHistory(Array.isArray(hist) ? hist : []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, [selectedFieldId]);

  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

  React.useEffect(() => {
    if (selectedFieldId) loadTelemetry();
  }, [selectedFieldId, loadTelemetry]);

  // Extract chart data from history
  const soilMoistureSeries = history.map((r: any) => r.soil_moisture_pct ?? 0).reverse();
  const waterLevelSeries = history.map((r: any) => r.water_level_pct ?? 0).reverse();

  return (
    <Frame
      sidebar={officerModuleNav('Irrigation', 'Sensor Telemetry')}
      breadcrumb={['Modules', 'F1 · Irrigation', 'Sensor Telemetry']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Sensor telemetry</div>
          <div className="page-sub">
            Field-level readings · {history.length} data points
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="select"
            style={{ width: 240, height: 34 }}
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
          >
            <option value="">Select a field...</option>
            {fields.map((f: any) => (
              <option key={f.field_id || f.id} value={f.field_id || f.id}>
                {f.field_name || f.name || f.field_id}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={loadTelemetry}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>
      </div>

      {!selectedFieldId ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="wave" size={40} color="var(--muted)"/>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Select a field to view telemetry</div>
        </div>
      ) : (
        <ApiState loading={loading && !latest} error={error} onRetry={loadTelemetry}>
          {/* Latest reading */}
          <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wifi" size={28} color="var(--primary-600)"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                Latest reading for {fields.find(f => (f.field_id || f.id) === selectedFieldId)?.field_name || 'field'}
              </div>
              <div className="tiny muted">
                {latest?.timestamp ? `Received ${new Date(latest.timestamp).toLocaleString()}` : 'No recent reading'}
                {latest?.device_id && ` · Device ${latest.device_id}`}
                {latest?.rssi !== undefined && ` · RSSI ${latest.rssi} dBm`}
                {latest?.battery_v !== undefined && ` · Battery ${latest.battery_v}V`}
              </div>
            </div>
            {latest && (
              <Chip kind="live">Connected</Chip>
            )}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {[
              { t: 'Soil moisture · %', c: 'var(--primary)', d: soilMoistureSeries },
              { t: 'Water level · %', c: '#7B1FA2', d: waterLevelSeries },
            ].map((p, i) => (
              <div key={i} className="card">
                <div className="card-head">
                  <div className="card-title">{p.t}</div>
                  <Chip kind={p.d.length > 0 ? 'live' : 'off'}>
                    {p.d.length > 0 ? `${p.d.length} points` : 'No data'}
                  </Chip>
                </div>
                {p.d.length > 0 ? (
                  <LineChart
                    width={510}
                    height={160}
                    series={[{ name: '', color: p.c, data: p.d }]}
                  />
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                    No historical data available
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Raw readings */}
          <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Raw readings</div>
              <div className="tiny muted">Showing {Math.min(history.length, 20)} of {history.length} records</div>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No readings yet
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Moisture %</th>
                    <th>Water %</th>
                    <th>Device</th>
                    <th>RSSI</th>
                    <th>Battery</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="muted tabular">
                        {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                      </td>
                      <td className="tabular">{r.soil_moisture_pct?.toFixed(1) ?? '—'}</td>
                      <td className="tabular">{r.water_level_pct?.toFixed(1) ?? '—'}</td>
                      <td className="tabular">{r.device_id ?? '—'}</td>
                      <td className="tabular">{r.rssi ?? '—'}</td>
                      <td className="tabular">{r.battery_v ? `${r.battery_v}V` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ApiState>
      )}
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <SensorTelemetry />
    </div>
  );
}

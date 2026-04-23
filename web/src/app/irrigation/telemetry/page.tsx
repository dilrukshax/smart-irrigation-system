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

const SensorTelemetry = () => {
  const data = (base, amp, len = 48) => Array.from({length: len}, (_, i) => base + Math.sin(i * 0.3 + base) * amp + Math.cos(i * 0.6) * (amp * 0.4));
  return (
    <Frame sidebar={irrigationNav('tele')} breadcrumb={['Modules', 'F1 · Irrigation', 'Sensor Telemetry']} user="R. Silva" role="Officer">
      <div className="page-head">
        <div><div className="page-title">Sensor telemetry</div><div className="page-sub">Device-level readings · 48 hours · 1-minute cadence</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" style={{ width: 200, height: 34 }}>
            <option>TSR-01 · H-04 Home paddy</option>
            <option>TSR-02 · H-04 East plot</option>
          </select>
          <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={13}/> 48h</button>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Export</button>
        </div>
      </div>

      {/* Device health */}
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="wifi" size={28} color="var(--primary-600)"/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>TSR-01 · LoRa 868 MHz</div>
          <div className="tiny muted">Firmware v2.3.1 · last packet 42s ago · RSSI −68 dBm · battery 92%</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <div><div className="tiny muted">Uptime 7d</div><div style={{ fontWeight: 700 }} className="tabular">99.94%</div></div>
          <div><div className="tiny muted">Packet loss</div><div style={{ fontWeight: 700 }} className="tabular">0.2%</div></div>
          <div><div className="tiny muted">Calibration</div><div style={{ fontWeight: 700, color: 'var(--primary-600)' }}>OK · 18d ago</div></div>
        </div>
        <Chip kind="live">Healthy</Chip>
      </div>

      {/* 4 panel charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {[
          { t: 'Soil moisture · %', c: 'var(--primary)', d: data(55, 8) },
          { t: 'Temperature · °C', c: 'var(--accent)', d: data(27, 3) },
          { t: 'Humidity · %', c: 'var(--secondary)', d: data(72, 6) },
          { t: 'Water level · mm', c: '#7B1FA2', d: data(42, 4) },
        ].map((p, i) => (
          <div key={i} className="card">
            <div className="card-head"><div className="card-title">{p.t}</div><Chip kind="live">Live</Chip></div>
            <LineChart width={510} height={160} series={[{ name: '', color: p.c, data: p.d }]}/>
          </div>
        ))}
      </div>

      {/* Raw readings */}
      <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Raw readings</div>
          <div className="tiny muted">Showing most recent 8 of 2,880 records</div>
        </div>
        <table className="tbl">
          <thead><tr><th>Timestamp</th><th>Moisture %</th><th>Temp °C</th><th>Humidity %</th><th>Water mm</th><th>Voltage</th><th>RSSI</th></tr></thead>
          <tbody>
            {[
              ['2026-05-24 08:42:14', 58.2, 28.4, 74.0, 41.2, 3.74, -68],
              ['2026-05-24 08:41:14', 58.1, 28.5, 74.1, 41.1, 3.74, -69],
              ['2026-05-24 08:40:14', 58.0, 28.5, 74.2, 41.1, 3.74, -68],
              ['2026-05-24 08:39:14', 57.9, 28.6, 74.3, 41.0, 3.74, -70],
              ['2026-05-24 08:38:14', 57.8, 28.6, 74.2, 41.0, 3.74, -68],
              ['2026-05-24 08:37:14', 57.8, 28.7, 74.1, 40.9, 3.73, -71],
              ['2026-05-24 08:36:14', 57.7, 28.7, 74.0, 40.9, 3.73, -68],
              ['2026-05-24 08:35:14', 57.6, 28.8, 73.9, 40.8, 3.73, -69],
            ].map((r, i) => (
              <tr key={i}>
                <td className="muted tabular">{r[0]}</td>
                <td className="tabular">{r[1].toFixed(1)}</td>
                <td className="tabular">{r[2].toFixed(1)}</td>
                <td className="tabular">{r[3].toFixed(1)}</td>
                <td className="tabular">{r[4].toFixed(1)}</td>
                <td className="tabular">{r[5].toFixed(2)}V</td>
                <td className="tabular">{r[6]} dBm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
};


/* F2 Crop Health, F3 Forecasting */

// [12] CROP HEALTH DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <SensorTelemetry />
    </div>
  );
}

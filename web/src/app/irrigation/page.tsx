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

const IrrigationDashboard = () => (
  <Frame sidebar={irrigationNav('over')} breadcrumb={['Modules', 'F1 · Irrigation', 'Overview']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div>
        <div className="page-title">Irrigation overview</div>
        <div className="page-sub">Mahaweli H · 24 fields · 18 sensors live · last sync 42 seconds ago</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={13}/> Last 24h</button>
        <button className="btn btn-primary btn-sm"><Icon name="valve" size={13}/> Open valve control</button>
      </div>
    </div>

    {/* Alert strip */}
    <div style={{ background: 'white', border: '1px solid #F2D6A5', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <Icon name="bell" size={16} color="var(--accent)"/>
      <div style={{ fontSize: 12.5 }}><b>2 anomalies:</b> H-07 Upper chili moisture 31% (below floor 35%) · Sensor TSR-08 offline 14m</div>
      <div style={{ flex: 1 }}/>
      <button className="btn btn-ghost btn-sm">Acknowledge</button>
    </div>

    {/* Real-time sensors */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
      {[
        { label: 'Soil moisture', value: '58.2%', delta: '↑ 1.4%', icon: 'humidity', spark: [52,54,55,57,56,58,58], color: 'var(--primary)' },
        { label: 'Temperature', value: '28.4°C', delta: '↑ 0.6°', icon: 'thermo', spark: [27,27,28,28,29,28,28], color: 'var(--accent)' },
        { label: 'Humidity', value: '74%', delta: '↓ 2%', icon: 'cloud', spark: [78,76,74,73,74,75,74], color: 'var(--secondary)' },
        { label: 'Water level', value: '41 mm', delta: '↓ 3', icon: 'droplet', spark: [48,46,44,43,42,41,41], color: 'var(--secondary)' },
      ].map((m, i) => (
        <div key={i} className="metric">
          <div className="between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: m.color + '22', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={13}/>
              </div>
              <div className="metric-label">{m.label}</div>
            </div>
            <Chip kind="live" dot={true}>Live</Chip>
          </div>
          <div className="metric-value">{m.value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`metric-delta ${m.delta.includes('↑') ? 'up' : 'down'}`}>{m.delta} vs 1h</div>
            <div style={{ flex: 1 }}/>
            <Sparkline data={m.spark} width={80} height={26} color={m.color}/>
          </div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
      {/* Field status table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div className="card-title">Field status</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip kind="live">18 online</Chip>
            <Chip kind="off">1 offline</Chip>
            <Chip kind="warn">3 attention</Chip>
          </div>
        </div>
        <table className="tbl">
          <thead><tr><th>Field</th><th>Sensor</th><th>Auto decision</th><th>Valve</th><th>Updated</th></tr></thead>
          <tbody>
            {[
              ['H-04 Home paddy', 'TSR-01', 'live', 'Hold · 62%', 'live', 'Open · 4.2 L/s', '42s'],
              ['H-04 East plot', 'TSR-02', 'live', 'Open @ 05:30', 'off', 'Closed', '1m'],
              ['H-04 South paddy', 'TSR-03', 'live', 'Hold · 71%', 'off', 'Closed', '38s'],
              ['H-05 Maize A', 'TSR-04', 'live', 'Open @ 06:10', 'off', 'Closed', '47s'],
              ['H-05 Maize B', 'TSR-05', 'live', 'Hold · 55%', 'off', 'Closed', '1m'],
              ['H-07 Upper chili', 'TSR-06', 'crit', 'Open now · 31%', 'off', 'Closed', '2m'],
              ['H-07 Lower chili', 'TSR-07', 'warn', 'Open @ 05:15', 'off', 'Closed', '44s'],
              ['H-07 Reserve', 'TSR-08', 'off', '— offline —', 'off', '—', '14m'],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r[0]}</td>
                <td className="muted">{r[1]}</td>
                <td><Chip kind={r[2]}>{r[3]}</Chip></td>
                <td><Chip kind={r[4]}>{r[5]}</Chip></td>
                <td className="muted small tabular">{r[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Valve control */}
        <div className="card">
          <div className="card-head"><div className="card-title">Valve control</div><Chip kind="live">Manual override</Chip></div>
          {[
            ['H-04 Home paddy', true, 'A-041'],
            ['H-04 East plot', false, 'A-042'],
            ['H-04 South paddy', false, 'A-043'],
            ['H-07 Upper chili', false, 'A-071'],
          ].map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: v[1] ? 'var(--primary-50)' : '#F0F2ED', color: v[1] ? 'var(--primary)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="valve" size={14}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{v[0]}</div>
                <div className="tiny muted">Valve {v[2]}</div>
              </div>
              <div style={{
                width: 36, height: 20, background: v[1] ? 'var(--primary)' : '#D9E0D4', borderRadius: 20, position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 2, left: v[1] ? 18 : 2, width: 16, height: 16, borderRadius: 50, background: 'white', transition: 'left 0.2s' }}/>
              </div>
            </div>
          ))}
        </div>

        {/* 24h trend */}
        <div className="card">
          <div className="card-head"><div className="card-title">24h soil moisture trend</div><span className="tiny muted">Avg across active fields</span></div>
          <LineChart
            width={420} height={160}
            series={[{ name: 'Avg moisture %', color: 'var(--primary)', data: [52,54,56,58,59,60,62,64,63,61,58,56,55,54,56,58,60,62,63,62,60,58,56,54] }]}
            xLabels={['00','','06','','12','','18','','24'].map((l,i)=>i%3===0?l:'').filter(Boolean)}
          />
        </div>
      </div>
    </div>
  </Frame>
);

// [10] WATER MANAGEMENT DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <IrrigationDashboard />
    </div>
  );
}

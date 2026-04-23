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

const Operations = () => (
  <Frame sidebar={officerNav} breadcrumb={['Operations', 'Overview']} user="R. Silva" role="Officer · Mahaweli H">
    <div className="page-head">
      <div><div className="page-title">Operations overview</div><div className="page-sub">Monday · 26 May · 42 active fields · scheme-wide</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm">Shift handover</button>
        <button className="btn btn-primary btn-sm">Generate daily brief</button>
      </div>
    </div>

    {/* Stats strip */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
      {[
        ['Active fields', '42', 'up', '2 new today'],
        ['Pending requests', '12', 'down', '3 resolved'],
        ['Open alerts', '7', 'up', '2 critical'],
        ['Valves open', '9', 'neutral', '4.2 m³/s flow'],
        ['Reservoir', '68%', 'down', '−0.4 pts/d'],
      ].map((m, i) => (
        <div key={i} className="metric">
          <div className="metric-label">{m[0]}</div>
          <div className="metric-value">{m[1]}</div>
          <div className={`metric-delta ${m[2] === 'up' ? 'up' : m[2] === 'down' ? 'down' : ''}`} style={{ color: m[2] === 'neutral' ? 'var(--muted)' : undefined }}>{m[3]}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
      {/* Alert queue */}
      <div className="card">
        <div className="card-head"><div className="card-title">Alert queue</div><Chip kind="crit">7 open</Chip></div>
        {[
          { s: 'crit', t: 'H-07 Upper chili', msg: 'Soil moisture 31% — below critical floor', t2: '2h ago', type: 'Moisture' },
          { s: 'crit', t: 'TSR-08 offline', msg: 'No packets received for 14 minutes', t2: '14m ago', type: 'Sensor' },
          { s: 'warn', t: 'H-04 East plot', msg: 'Manual request pending >48h', t2: '2d ago', type: 'Request' },
          { s: 'warn', t: 'Z-07 NDVI drop', msg: 'NDVI dropped 0.16 in 72h', t2: '3h ago', type: 'Health' },
          { s: 'warn', t: 'Release overlap', msg: 'H-05 canal + H-07 lower scheduled together', t2: '4h ago', type: 'Hydraulics' },
        ].map((a, i) => (
          <div key={i} style={{ padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 12, alignItems: 'center' }}>
            <Chip kind={a.s}>{a.type}</Chip>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.t}</div>
              <div className="tiny muted">{a.msg} · {a.t2}</div>
            </div>
            <button className="btn btn-ghost btn-sm">Ack</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Pending manual requests</div><Chip kind="warn">12</Chip></div>
          {[
            ['Nimal P.', 'H-04 Home', '25 mm', '1h ago'],
            ['Asela J.', 'H-04 East', '20 mm', '3h ago'],
            ['K. Tilak', 'H-05 Maize A', '18 mm', '4h ago'],
            ['T. Rathnayake', 'H-07 Low', '30 mm', '6h ago'],
          ].map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px auto', gap: 8, padding: '8px 0', fontSize: 12, borderBottom: i < 3 ? '1px dashed var(--line)' : 'none', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{r[0]}</div>
              <div className="muted">{r[1]}</div>
              <div className="tabular" style={{ fontWeight: 600 }}>{r[2]}</div>
              <div className="tiny muted">{r[3]}</div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%' }}>Review all 12 →</button>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Recent activity</div><span className="tiny muted">Live feed</span></div>
          {[
            ['04:42', 'Valve A-041 opened', 'auto · moisture 58%'],
            ['04:30', 'Approved Nimal P. request', '25 mm H-04 Home'],
            ['04:12', 'TSR-08 went offline', 'H-07 reserve'],
            ['03:58', 'Release scheduled', 'Tue 05:00 H-04 Main'],
            ['03:40', 'Policy update applied', 'Paddy quota → 980 mm'],
          ].map((a, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 10, padding: '7px 0', fontSize: 12, borderBottom: i < 4 ? '1px dashed var(--line)' : 'none' }}>
              <span className="tiny muted tabular">{a[0]}</span>
              <div><div style={{ fontWeight: 600 }}>{a[1]}</div><div className="tiny muted">{a[2]}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head"><div className="card-title">Scheme overview</div><span className="tiny muted">Color = health status</span></div>
      <SchemeMap height={260} zones={[
        { x: 8, y: 10, w: 22, h: 20, color: '#66BB6A', stroke: '#2E7D32', label: 'H-04' },
        { x: 34, y: 10, w: 24, h: 22, color: '#81C784', stroke: '#2E7D32', label: 'H-05' },
        { x: 62, y: 10, w: 28, h: 26, color: '#FFB74D', stroke: '#B27500', label: 'H-06' },
        { x: 10, y: 40, w: 40, h: 30, color: '#66BB6A', stroke: '#2E7D32', label: 'H-07 Low' },
        { x: 54, y: 44, w: 32, h: 28, color: '#EF5350', stroke: '#C62828', label: 'H-07 Up' },
        { x: 14, y: 76, w: 36, h: 18, color: '#81C784', stroke: '#2E7D32', label: 'H-08' },
      ]} markers={[
        { x: 20, y: 18 }, { x: 44, y: 20 }, { x: 72, y: 22, color: '#F9A825' }, { x: 30, y: 52 }, { x: 64, y: 56, color: '#C62828' }, { x: 28, y: 84 }
      ]}/>
    </div>
  </Frame>
);

// [20] MANUAL REQUEST REVIEW

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Operations />
    </div>
  );
}

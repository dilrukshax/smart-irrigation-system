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

const OptAdaptive = () => (
  <Frame sidebar={optNav('ada')} breadcrumb={['F4 · ACA-O', 'Adaptive Tuning']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Adaptive recommendations</div><div className="page-sub">Tune solver weights → see recommendation change in real time</div></div>
      <button className="btn btn-primary btn-sm">Apply parameters</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Parameter tuning</div>
        {[
          ['Risk tolerance', 35, 'Higher = accept more variance', 'var(--danger)'],
          ['Water sensitivity', 58, 'Penalty on exceeding quota', 'var(--secondary)'],
          ['Price weight', 62, 'Lean into market price signals', 'var(--accent)'],
          ['Yield weight', 70, 'Favor high-yield varieties', 'var(--primary)'],
        ].map(([label, val, hint, color]) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div className="between small" style={{ marginBottom: 3 }}>
              <span className="muted">{label}</span>
              <span className="tabular" style={{ fontWeight: 700, color }}>{val}%</span>
            </div>
            <input type="range" defaultValue={val} style={{ width: '100%', accentColor: color }}/>
            <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>
          </div>
        ))}
        <div className="divider" style={{ margin: '8px 0 14px' }}/>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }}>Reset</button>
          <button className="btn btn-primary" style={{ flex: 1 }}>Preview</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Real-time preview · top 3 crops</div><Chip kind="sim" dot={false}>Live preview</Chip></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {[
              { n: 'Paddy Bg 352', s: 0.93, d: 'High yield weight tips this above Bg 360.', color: 'var(--primary)' },
              { n: 'Groundnut', s: 0.87, d: 'Price weight lifts groundnut into #2.', color: 'var(--accent)' },
              { n: 'Green gram', s: 0.79, d: 'Low water sensitivity keeps it viable.', color: '#7B1FA2' },
            ].map((c, i) => (
              <div key={i} style={{ padding: 14, border: `1.5px solid ${c.color}`, borderRadius: 10, background: c.color + '08' }}>
                <div className="between">
                  <div style={{ fontWeight: 700, fontSize: 13 }}>#{i+1} {c.n}</div>
                  <div className="tabular" style={{ fontWeight: 700, color: c.color }}>{c.s.toFixed(2)}</div>
                </div>
                <div className="prog" style={{ marginTop: 8 }}><div className="prog-fill" style={{ width: (c.s*100)+'%', background: c.color }}/></div>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Projected outcome</div><span className="tiny muted">Current weights vs baseline</span></div>
          <LineChart
            width={760} height={200} legend
            series={[
              { name: 'Yield (t, cum)', color: 'var(--primary)', data: [2,5,9,14,20,26,32,38,42] },
              { name: 'Profit (M LKR)', color: 'var(--accent)', data: [0.2,0.5,0.8,1.2,1.5,1.7,1.9,2.05,2.18] },
              { name: 'Risk', color: 'var(--danger)', data: [5,9,14,18,22,25,27,28,28] },
            ]}
            xLabels={['d0','d15','d30','d45','d60','d75','d90','d105','d120']}
          />
        </div>
      </div>
    </div>
  </Frame>
);

// [19] OPERATIONS DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptAdaptive />
    </div>
  );
}

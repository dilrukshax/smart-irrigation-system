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

const OptOverview = () => (
  <Frame sidebar={optNav('over')} breadcrumb={['Modules', 'F4 · ACA-O', 'Overview']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">ACA-O · Adaptive Crop Allocation & Optimization</div><div className="page-sub">Maha 2025–26 · Mahaweli H · 9.1 ha · solver v1.4</div></div>
      <button className="btn btn-primary btn-sm"><Icon name="flash" size={13}/> Re-run optimizer</button>
    </div>

    {/* Summary metrics */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
      <div className="metric">
        <div className="metric-label">Water quota utilization</div>
        <div className="metric-value">62%</div>
        <div className="prog slim" style={{ marginTop: 6 }}><div className="prog-fill" style={{ width: '62%', background: 'var(--accent)' }}/></div>
        <div className="tiny muted" style={{ marginTop: 4 }}>607 / 980 mm used</div>
      </div>
      <div className="metric">
        <div className="metric-label">Top recommended crop</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div className="metric-value" style={{ fontSize: 18 }}>Paddy Bg 352</div>
        </div>
        <div className="tiny" style={{ color: 'var(--primary-600)', fontWeight: 600, marginTop: 4 }}>Suitability 0.94</div>
        <Chip kind="live" dot={false}>5 of 5 fields</Chip>
      </div>
      <div className="metric">
        <div className="metric-label">Optimization status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Chip kind="live">Converged</Chip>
          <span className="tiny muted">gap 0.3%</span>
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Solved in 0.42s · 312 iterations</div>
        <div className="tiny muted">Last run 12 min ago</div>
      </div>
      <div className="metric">
        <div className="metric-label">Projected profit</div>
        <div className="metric-value">LKR 1.86M</div>
        <div className="metric-delta up">↑ 18% vs baseline plan</div>
      </div>
    </div>

    {/* Quick nav cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {[
        { t: 'Field recommendations', d: 'See suitable crops by field with scores and profit.', icon: 'leaf', color: 'var(--primary)' },
        { t: 'Optimization planner', d: 'Set constraints → get optimal crop allocation.', icon: 'target', color: 'var(--secondary)' },
        { t: 'Scenarios', d: 'Save, compare, and share what-if scenarios.', icon: 'chart', color: 'var(--accent)' },
        { t: 'Adaptive tuning', d: 'Weight risk, yield, price → live preview.', icon: 'flash', color: '#7B1FA2' },
      ].map((c, i) => (
        <div key={i} className="card" style={{ padding: 18, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: c.color + '22', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={c.icon} size={17}/>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>{c.t}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{c.d}</div>
          <div style={{ fontSize: 11, color: c.color, fontWeight: 600, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>Open <Icon name="arrow" size={12}/></div>
        </div>
      ))}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginTop: 14 }}>
      <div className="card">
        <div className="card-head"><div className="card-title">Allocation plan · current season</div><Chip kind="info" dot={false}>Converged</Chip></div>
        <BarChart
          data={[
            [2.4, 1.8, 3.1, 0, 0],
            [0, 0, 0, 1.2, 0],
            [0, 0, 0, 0, 0.6],
          ]}
          stacked width={560} height={160}
          color={['var(--primary)', 'var(--secondary)', 'var(--accent)']}
          labels={['H-04 Home','H-04 East','H-04 S','H-05 A','H-07 Up']}
        />
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">Constraint satisfaction</div><Chip kind="live">All met</Chip></div>
        {[
          ['Water quota ≤ 980 mm', true, '607 mm allocated'],
          ['Paddy area ≥ 50%', true, '58% paddy (5.5 of 9.1 ha)'],
          ['At least 2 rainfed crops', true, '2 (green gram, groundnut)'],
          ['Risk tolerance ≤ 0.35', true, 'Scenario risk 0.28'],
          ['Profit target LKR 1.5M', true, 'Projected 1.86M'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: 50, background: 'var(--primary-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={13}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r[0]}</div>
              <div className="tiny muted">{r[2]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

// [15] FIELD RECOMMENDATIONS

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptOverview />
    </div>
  );
}

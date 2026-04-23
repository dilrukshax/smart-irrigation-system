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

const PolicySettings = () => (
  <Frame sidebar={authorityNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'Policies & Quotas' })) }))} breadcrumb={['Authority', 'Policies & Quotas']} user="Dr. Wijeratne" role="Authority">
    <div className="page-head">
      <div><div className="page-title">Policy & quota settings</div><div className="page-sub">Season-wide rules · changes require double-authorization</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm">Discard</button>
        <button className="btn btn-primary btn-sm">Save & publish</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Quota settings · Maha 2025–26</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          <div className="field"><label>Season water quota (mm)</label><input className="input" defaultValue="980"/></div>
          <div className="field"><label>Minimum paddy area (%)</label><input className="input" defaultValue="50"/></div>
          <div className="field"><label>Max per-field quota (mm)</label><input className="input" defaultValue="1100"/></div>
          <div className="field"><label>Emergency reserve (%)</label><input className="input" defaultValue="8"/></div>
        </div>

        <div className="divider" style={{ margin: '18px 0' }}/>
        <div className="tiny muted" style={{ marginBottom: 8 }}>Priority crop list</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Paddy Bg 352','Paddy Bg 360','Groundnut','Green gram','Maize','Chili'].map((c, i) => (
            <span key={c} className="chip" style={{ background: i < 4 ? 'var(--primary-50)' : '#F0F2ED', color: i < 4 ? 'var(--primary-600)' : 'var(--muted)', padding: '6px 10px', fontSize: 11 }}>
              {c} <Icon name="x" size={10}/>
            </span>
          ))}
          <button className="chip btn-ghost" style={{ padding: '6px 10px', fontSize: 11, border: '1px dashed var(--border)' }}>+ Add crop</button>
        </div>

        <div className="divider" style={{ margin: '18px 0' }}/>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 8 }}>
          <input type="checkbox" defaultChecked/> Auto-reduce quota on reservoir &lt; 40%
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 8 }}>
          <input type="checkbox" defaultChecked/> Require officer approval for requests &gt; 30 mm
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <input type="checkbox"/> Publish forecast brief daily at 06:00
        </label>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Scheme zone boundaries</div><Chip kind="info" dot={false}>4 zones</Chip></div>
        <SchemeMap height={220} zones={[
          { x: 6, y: 8, w: 40, h: 34, color: '#66BB6A', stroke: '#2E7D32', label: 'H-04 · 980 mm' },
          { x: 50, y: 10, w: 42, h: 32, color: '#81C784', stroke: '#2E7D32', label: 'H-05 · 620 mm' },
          { x: 8, y: 48, w: 38, h: 40, color: '#FFB74D', stroke: '#B27500', label: 'H-07 · 520 mm' },
          { x: 52, y: 50, w: 38, h: 38, color: '#A5D6A7', stroke: '#2E7D32', label: 'H-08 · 860 mm' },
        ]}/>
        <div style={{ marginTop: 12 }}>
          <table className="tbl" style={{ fontSize: 11.5 }}>
            <thead><tr><th>Zone</th><th>Quota</th><th>Fields</th><th>Priority</th></tr></thead>
            <tbody>
              {[['H-04', '980 mm', 12, 'Paddy'],['H-05', '620 mm', 8, 'Maize'],['H-07', '520 mm', 10, 'Chili'],['H-08', '860 mm', 12, 'Mixed']].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="tabular">{r[1]}</td>
                  <td className="tabular">{r[2]}</td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head"><div className="card-title">Policy history log</div><span className="tiny muted">Immutable · signed</span></div>
      <table className="tbl">
        <thead><tr><th>When</th><th>Actor</th><th>Change</th><th>Reason</th></tr></thead>
        <tbody>
          {[
            ['2026-05-20 14:22', 'Dr. Wijeratne', 'Max per-field quota 1000 → 1100 mm', 'Extended paddy window'],
            ['2026-05-12 09:11', 'Dr. Wijeratne', 'Added green gram to priority list', 'Seasonal diversification'],
            ['2026-05-04 10:40', 'R. Silva (delegated)', 'Emergency reserve 10% → 8%', 'Reservoir on track'],
            ['2026-04-28 16:02', 'Dr. Wijeratne', 'Season quota 940 → 980 mm', 'Maha opening'],
          ].map((l, i) => (
            <tr key={i}>
              <td className="muted tabular">{l[0]}</td>
              <td style={{ fontWeight: 600 }}>{l[1]}</td>
              <td>{l[2]}</td>
              <td className="muted">{l[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Frame>
);

// MOBILE VIEW · Farmer Portal (375 wide)

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <PolicySettings />
    </div>
  );
}

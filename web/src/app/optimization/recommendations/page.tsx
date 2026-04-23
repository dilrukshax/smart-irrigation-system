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

const OptRecommendations = () => (
  <Frame sidebar={optNav('rec')} breadcrumb={['F4 · ACA-O', 'Recommendations']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Field recommendations</div><div className="page-sub">Per-crop suitability, yield, price, and profit projections</div></div>
      <button className="btn btn-primary btn-sm">Apply top picks</button>
    </div>

    {/* Filter bar */}
    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 120px', gap: 12, alignItems: 'end' }}>
        <div className="field"><label>Scheme zone</label><select className="select"><option>Mahaweli H (all)</option></select></div>
        <div className="field"><label>Crop type</label><select className="select"><option>All crops</option></select></div>
        <div className="field">
          <label>Suitability threshold <span className="tabular" style={{ color: 'var(--text)', fontWeight: 700 }}>≥ 0.65</span></label>
          <input type="range" defaultValue="65" style={{ accentColor: 'var(--primary)' }}/>
        </div>
        <button className="btn btn-ghost"><Icon name="filter" size={13}/> Apply</button>
      </div>
    </div>

    {/* Recommendation cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
      {[
        { n: 'Paddy Bg 352', s: 0.94, y: '4.8 t/ha', p: 'LKR 112/kg', pr: '286k', w: '720', c: 'var(--primary)', icon: 'leaf' },
        { n: 'Paddy Bg 360', s: 0.88, y: '4.4 t/ha', p: 'LKR 110/kg', pr: '258k', w: '700', c: 'var(--primary)', icon: 'leaf' },
        { n: 'Groundnut', s: 0.81, y: '2.1 t/ha', p: 'LKR 380/kg', pr: '312k', w: '480', c: 'var(--accent)', icon: 'sun' },
        { n: 'Green gram', s: 0.76, y: '1.4 t/ha', p: 'LKR 420/kg', pr: '202k', w: '380', c: '#7B1FA2', icon: 'leaf' },
        { n: 'Maize', s: 0.62, y: '5.6 t/ha', p: 'LKR 88/kg', pr: '224k', w: '620', c: 'var(--secondary)', icon: 'sun' },
        { n: 'Chili', s: 0.48, y: '3.2 t/ha', p: 'LKR 640/kg', pr: '184k', w: '520', c: 'var(--danger)', icon: 'flash' },
      ].map((c, i) => (
        <div key={i} className="card" style={{ padding: 14 }}>
          <div className="between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: c.c + '22', color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={15}/>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.n}</div>
            </div>
            {c.s >= 0.8 && <Chip kind="live">Top pick</Chip>}
            {c.s < 0.6 && <Chip kind="crit">Low fit</Chip>}
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="between small muted"><span>Suitability</span><span className="tabular" style={{ color: 'var(--text)', fontWeight: 700 }}>{c.s.toFixed(2)}</span></div>
            <div className="prog"><div className="prog-fill" style={{ width: (c.s*100)+'%', background: c.s>=0.8?'var(--primary)':c.s>=0.65?'#8BC34A':c.s>=0.5?'var(--accent)':'var(--danger)' }}/></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8, marginTop: 10, fontSize: 11.5 }}>
            <div><div className="muted tiny">Yield</div><div className="tabular" style={{ fontWeight: 600 }}>{c.y}</div></div>
            <div><div className="muted tiny">Price</div><div className="tabular" style={{ fontWeight: 600 }}>{c.p}</div></div>
            <div><div className="muted tiny">Projected profit</div><div className="tabular" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>LKR {c.pr}</div></div>
            <div><div className="muted tiny">Water need</div><div className="tabular" style={{ fontWeight: 600 }}>{c.w} mm</div></div>
          </div>
        </div>
      ))}
    </div>

    {/* Suitability matrix */}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="card-title">Suitability matrix · crops × fields</div>
        <div className="tiny muted">Heatmap of score 0.00–1.00</div>
      </div>
      <table className="tbl" style={{ fontSize: 11 }}>
        <thead><tr>
          <th>Crop</th>
          <th>H-04 Home</th><th>H-04 East</th><th>H-04 South</th><th>H-05 A</th><th>H-05 B</th><th>H-07 Up</th><th>H-07 Low</th>
        </tr></thead>
        <tbody>
          {[
            ['Paddy Bg 352', [0.94,0.92,0.90,0.62,0.64,0.48,0.52]],
            ['Paddy Bg 360', [0.88,0.86,0.85,0.58,0.60,0.42,0.48]],
            ['Groundnut',    [0.74,0.78,0.81,0.72,0.70,0.64,0.66]],
            ['Green gram',   [0.70,0.72,0.76,0.68,0.66,0.60,0.62]],
            ['Maize',        [0.60,0.62,0.58,0.88,0.86,0.54,0.56]],
            ['Chili',        [0.42,0.44,0.40,0.56,0.58,0.78,0.72]],
            ['Tomato',       [0.38,0.40,0.36,0.52,0.54,0.72,0.70]],
          ].map((row, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{row[0]}</td>
              {row[1].map((v, c) => {
                const bg = v >= 0.85 ? '#2E7D32' : v >= 0.7 ? '#81C784' : v >= 0.55 ? '#FFE082' : v >= 0.4 ? '#FFB74D' : '#EF9A9A';
                const fg = v >= 0.7 ? 'white' : 'var(--text)';
                return <td key={c} style={{ background: bg, color: fg, textAlign: 'center', fontWeight: 600 }} className="tabular">{v.toFixed(2)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Frame>
);

// [16] OPTIMIZATION PLANNER

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptRecommendations />
    </div>
  );
}

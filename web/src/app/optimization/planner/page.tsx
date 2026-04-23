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

const OptPlanner = () => (
  <Frame sidebar={optNav('plan')} breadcrumb={['F4 · ACA-O', 'Planner']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Optimization planner</div><div className="page-sub">Set constraints → the solver returns optimal allocation</div></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Input constraints</div>
        <div style={{ marginBottom: 16 }}>
          <div className="between small" style={{ marginBottom: 4 }}><span className="muted">Water quota (mm)</span><span className="tabular" style={{ fontWeight: 700 }}>980</span></div>
          <input type="range" min="200" max="1500" defaultValue="980" style={{ width: '100%', accentColor: 'var(--primary)' }}/>
          <div className="between" style={{ fontSize: 10, color: 'var(--muted)' }}><span>200</span><span>1500</span></div>
        </div>

        <div className="field" style={{ marginBottom: 12 }}><label>Total area (ha)</label><input className="input" defaultValue="9.1"/></div>
        <div className="field" style={{ marginBottom: 14 }}><label>Minimum paddy area (ha)</label><input className="input" defaultValue="5.0"/></div>

        <div style={{ marginBottom: 14 }}>
          <div className="tiny muted" style={{ marginBottom: 6 }}>Priority</div>
          <div style={{ display: 'flex', background: '#F0F2ED', borderRadius: 8, padding: 3 }}>
            {['Maximize profit', 'Balance', 'Minimize risk'].map((p, i) => (
              <button key={i} className="btn btn-sm" style={{ flex: 1, height: 30, background: i === 0 ? 'white' : 'transparent', color: i === 0 ? 'var(--text)' : 'var(--muted)', border: 'none', fontWeight: 600 }}>{p}</button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Rainfall assumption</label>
          <select className="select"><option>P50 · 78 mm (normal)</option><option>P10 · 22 mm (drought)</option></select>
        </div>

        <div className="divider" style={{ margin: '10px 0 14px' }}/>
        <div className="tiny muted" style={{ marginBottom: 8 }}>Advanced</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 6 }}>
          <input type="checkbox" defaultChecked/> Allow Plan B fallback
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 14 }}>
          <input type="checkbox"/> Enforce per-field crop continuity
        </label>

        <button className="btn btn-primary" style={{ width: '100%', height: 40 }}><Icon name="flash" size={14}/> Run optimization</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Optimal allocation</div>
            <Chip kind="live">Converged · 0.3% gap · 0.42s</Chip>
          </div>
          <table className="tbl">
            <thead><tr><th>Crop</th><th>Area (ha)</th><th>Water (mm)</th><th>Yield</th><th>Profit (LKR)</th><th>Share</th></tr></thead>
            <tbody>
              {[
                ['Paddy Bg 352', 4.2, 720, '20.2 t', '1,136k', 46, 'var(--primary)'],
                ['Paddy Bg 360', 1.1, 700, '4.8 t', '278k', 12, 'var(--primary)'],
                ['Groundnut', 2.0, 480, '4.2 t', '312k', 22, 'var(--accent)'],
                ['Green gram', 1.2, 380, '1.7 t', '148k', 13, '#7B1FA2'],
                ['Maize', 0.6, 620, '3.4 t', '112k', 7, 'var(--secondary)'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="tabular">{r[1]}</td>
                  <td className="tabular">{r[2]}</td>
                  <td className="tabular">{r[3]}</td>
                  <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{r[4]}</td>
                  <td style={{ width: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: r[5]+'%', background: r[6] }}/></div>
                      <span className="tabular small" style={{ fontWeight: 600 }}>{r[5]}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Area allocation · stacked</div><span className="tiny muted">9.1 ha total</span></div>
          <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden' }}>
            {[[46,'var(--primary)','Paddy 352'],[12,'#4CAF50','Paddy 360'],[22,'var(--accent)','Groundnut'],[13,'#7B1FA2','Green gram'],[7,'var(--secondary)','Maize']].map((s,i) => (
              <div key={i} style={{ flex: s[0], background: s[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, color: 'white', fontWeight: 700 }}>{s[0]}%</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, flexWrap: 'wrap' }}>
            {[['Paddy 352','var(--primary)'],['Paddy 360','#4CAF50'],['Groundnut','var(--accent)'],['Green gram','#7B1FA2'],['Maize','var(--secondary)']].map(l => (
              <span key={l[0]} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: l[1], borderRadius: 2 }}/>{l[0]}</span>
            ))}
          </div>
          <div className="divider" style={{ margin: '14px 0' }}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
            {[['Total profit','LKR 1.99M','up'],['Water use','2,900 mm','neutral'],['Risk score','0.28','up'],['Quota use','99.1%','up']].map((m, i) => (
              <div key={i} className="metric" style={{ padding: 10 }}>
                <div className="metric-label">{m[0]}</div>
                <div className="metric-value" style={{ fontSize: 16 }}>{m[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Frame>
);

// [17] SCENARIOS

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptPlanner />
    </div>
  );
}

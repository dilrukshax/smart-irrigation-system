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

const Forecasting = () => (
  <Frame sidebar={[
    { label: 'F3 · Forecasting', items: [
      { name: 'Overview', icon: 'home', active: true },
      { name: 'Reservoir', icon: 'wave' },
      { name: 'Rainfall', icon: 'cloud' },
      { name: 'Alerts', icon: 'bell' },
    ]},
    { label: 'Modules', items: [
      { name: 'Irrigation', icon: 'droplet' },
      { name: 'Crop Health', icon: 'shield_check' },
      { name: 'Optimization', icon: 'target' },
    ]},
  ]} breadcrumb={['Modules', 'F3 · Forecasting']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Forecasting · reservoir + rainfall</div><div className="page-sub">Ensemble model v2.4 · 14-day horizon · updated 06:00 UTC</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm">Model cards</button>
        <button className="btn btn-primary btn-sm">Publish brief</button>
      </div>
    </div>

    {/* Hero row */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 14, marginBottom: 14 }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-head"><div className="card-title">Reservoir · Ulhitiya</div><Chip kind="live">Live</Chip></div>
        <Gauge value={68} size={180} stroke={20} color="var(--secondary)" label="68%" sub="98.6 / 145 MCM"/>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">14-day risk level</div><Chip kind="warn">Medium</Chip></div>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--accent)' }}>MEDIUM</div>
        <div className="tiny muted">Drought risk peaks day 7 · P(flood) &lt; 0.05</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6, marginTop: 16 }}>
          {['Low','Medium','High','Crit'].map((l, i) => (
            <div key={i} style={{ padding: '8px 0', textAlign: 'center', borderRadius: 6, background: i === 1 ? 'var(--accent-50)' : '#F6F8F4', border: i === 1 ? '1px solid #F2D6A5' : '1px solid transparent', fontSize: 11, fontWeight: 600, color: i === 1 ? '#7A5200' : 'var(--muted)' }}>
              {l}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ background: 'linear-gradient(135deg, #F1F8E9, #E1F5FE)', border: '1px solid var(--primary)' }}>
        <div className="card-head"><div className="card-title" style={{ color: 'var(--primary-600)' }}>Irrigation recommendation</div><Chip kind="live">ACA-O</Chip></div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
          Reduce irrigation by <span style={{ color: 'var(--primary)', fontSize: 22 }}>15%</span> for the next <span style={{ fontWeight: 700 }}>3 days</span>.
        </div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Rainfall expected days 4–5 (P50 = 38 mm). Preserving quota now avoids critical risk on day 7.
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button className="btn btn-primary btn-sm">Apply to all fields</button>
          <button className="btn btn-ghost btn-sm">Ignore</button>
        </div>
      </div>
    </div>

    {/* Forecast chart */}
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-head">
        <div>
          <div className="card-title">14-day forecast</div>
          <div className="tiny muted">Water level (%, left) · Rainfall (mm, right) · P10/P50/P90 bands</div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: 'var(--primary)' }}/>Water level P50</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--primary)', opacity: 0.14 }}/>P10–P90 band</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 6, background: 'var(--secondary)', opacity: 0.3 }}/>Rain</span>
        </div>
      </div>
      <ForecastChart width={1100} height={240} days={14}/>
    </div>

    {/* Risk timeline + Alerts + What-if */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Risk timeline · next 14 days</div><span className="tiny muted">Per day</span></div>
          <div style={{ display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden', marginTop: 6 }}>
            {['#66BB6A','#66BB6A','#81C784','#F9A825','#F9A825','#EF5350','#C62828','#EF5350','#F9A825','#81C784','#66BB6A','#66BB6A','#66BB6A','#81C784'].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c, position: 'relative', borderRight: i < 13 ? '1px solid rgba(255,255,255,0.3)' : 'none' }}>
                <div style={{ position: 'absolute', top: 2, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>{i+1}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11 }}>
            {[['Low','#66BB6A'],['Med','#F9A825'],['High','#EF5350'],['Crit','#C62828']].map(l => (
              <span key={l[0]} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: l[1], borderRadius: 2 }}/>{l[0]}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Active alerts</div><Chip kind="crit">2</Chip></div>
          {[
            { s: 'crit', t: 'Drought peak · day 7', d: 'Rainfall deficit 22 mm, reservoir forecast 54%', dismiss: true },
            { s: 'warn', t: 'High evaporation · days 4–6', d: 'ET forecast 6.8 mm/d above seasonal mean' },
          ].map((a, i) => (
            <div key={i} style={{ padding: 12, borderRadius: 8, background: a.s === 'crit' ? 'var(--danger-50)' : 'var(--accent-50)', marginTop: i ? 8 : 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="bell" size={18} color={a.s === 'crit' ? 'var(--danger)' : 'var(--accent)'}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.t}</div>
                <div className="tiny muted">{a.d}</div>
              </div>
              <button className="btn btn-ghost btn-sm">Dismiss</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">What-if simulator</div><Chip kind="sim" dot={false}>Simulated</Chip></div>
        <div className="tiny muted" style={{ marginBottom: 10 }}>Adjust rainfall scenario to see projected reservoir level</div>

        <div style={{ marginBottom: 14 }}>
          <div className="between small" style={{ marginBottom: 2 }}><span className="muted">Assumed total rainfall (14d)</span><span className="tabular" style={{ fontWeight: 700 }}>52 mm</span></div>
          <input type="range" defaultValue="52" min="0" max="200" style={{ width: '100%', accentColor: 'var(--primary)' }}/>
          <div className="between" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}><span>Drought (0)</span><span>Normal (80)</span><span>Flood (200)</span></div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="between small" style={{ marginBottom: 2 }}><span className="muted">Outflow multiplier</span><span className="tabular" style={{ fontWeight: 700 }}>1.0×</span></div>
          <input type="range" defaultValue="10" min="5" max="20" style={{ width: '100%', accentColor: 'var(--secondary)' }}/>
        </div>

        <div style={{ padding: 12, background: '#F6F8F4', borderRadius: 8 }}>
          <div className="tiny muted">Projected reservoir at day 14</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }} className="tabular">54.2%</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>↓ 13.8 pts vs today</div>
          </div>
          <LineChart width={440} height={110} series={[{ name: '', color: 'var(--secondary)', data: [68,67,66,65,64,63,61,59,58,57,56,55,55,54] }]}/>
        </div>
      </div>
    </div>
  </Frame>
);


/* F4 Optimization (5 pages) + Officer (3) + Authority (2) + Mobile */

// [14] ACA-O DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Forecasting />
    </div>
  );
}

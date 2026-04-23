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

const FarmerPortal = () => (
  <Frame
    sidebar={farmerNav}
    breadcrumb={['Farmer', 'Dashboard']}
    user="Nimal Perera"
    role="Farmer · H-04"
  >
    <div className="page-head">
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Good morning, Nimal · 5:48 AM</div>
        <div className="page-title">Today's plan for Mahaweli H-04</div>
        <div className="page-sub">3 fields · Maha season · Day 42 of 120 · Paddy growth stage: Tillering</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Export</button>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> New field</button>
      </div>
    </div>

    {/* Announcement */}
    <div style={{ background: 'var(--accent-50)', border: '1px solid #F7E5B0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Icon name="bell" size={18} color="#B27500"/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#7A5200' }}>Reservoir release scheduled: Tuesday 5:00 AM – 11:00 AM</div>
        <div style={{ fontSize: 11.5, color: '#8A6A20' }}>Ulhitiya will release 42 mm across H-04. Adjust your manual requests by Monday 6 PM.</div>
      </div>
      <button className="btn btn-ghost btn-sm">Details</button>
      <Icon name="x" size={14} color="#B27500"/>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
      {/* Water Budget */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Water budget</div>
            <div className="tiny muted">Maha 2025 · 120-day quota</div>
          </div>
          <Chip kind="warn">Caution</Chip>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Gauge value={62} size={130} color="var(--accent)" label="62%" sub="of quota used"/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><div className="tiny muted">Quota</div><div style={{ fontSize: 17, fontWeight: 700 }} className="tabular">980 mm</div></div>
            <div><div className="tiny muted">Used · day 42</div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }} className="tabular">607 mm</div></div>
            <div><div className="tiny muted">Remaining</div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary)' }} className="tabular">373 mm</div></div>
          </div>
        </div>
        <div className="divider" style={{ margin: '14px 0 10px' }}/>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Projected run-out: <b style={{ color: 'var(--text)' }}>day 108</b> — 12 days short of harvest. Switch H-07 to Plan B.</div>
      </div>

      {/* Weather */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Weather · Thalawa</div>
          <Chip kind="live">Live · 6m ago</Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="cloud" size={46} color="var(--secondary)"/>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }} className="tabular">28.4°C</div>
            <div className="tiny muted">Partly cloudy · Humidity 74%</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="tiny muted" style={{ marginBottom: 4 }}>7-day rain (mm)</div>
          <BarChart data={[2,5,0,1,8,12,4]} width={280} height={70} color="var(--secondary)" labels={['Mo','Tu','We','Th','Fr','Sa','Su']}/>
        </div>
      </div>

      {/* Scenario simulator */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Quick scenario</div>
          <Chip kind="sim" dot={false}>Simulated</Chip>
        </div>
        <div className="tiny muted">If your available water were…</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }} className="tabular">420 mm</div>
          <div className="tiny muted">· 43% of quota</div>
        </div>
        <input type="range" min="0" max="1000" defaultValue="420" style={{ width: '100%', marginTop: 6, accentColor: 'var(--primary)' }}/>
        <div className="divider" style={{ margin: '12px 0' }}/>
        <div className="tiny muted" style={{ marginBottom: 6 }}>Recommended mix</div>
        {[['Paddy Bg 352', 58, 'var(--primary)'], ['Groundnut', 28, 'var(--secondary)'], ['Green gram', 14, 'var(--accent)']].map(r => (
          <div key={r[0]} style={{ marginBottom: 6 }}>
            <div className="between small"><span>{r[0]}</span><span className="tabular" style={{ fontWeight: 600 }}>{r[1]}%</span></div>
            <div className="prog slim"><div className="prog-fill" style={{ width: r[1] + '%', background: r[2] }}/></div>
          </div>
        ))}
      </div>
    </div>

    {/* Field overview + simulations */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginTop: 14 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Fields</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm">All (3)</button>
            <button className="btn btn-ghost btn-sm">Active valves (1)</button>
          </div>
        </div>
        {[
          { name: 'H-04 · Home paddy', crop: 'Paddy Bg 352', area: '2.4 ha', moist: 62, valve: 'Open', health: 'live' },
          { name: 'H-04 · East plot', crop: 'Paddy Bg 352', area: '1.8 ha', moist: 48, valve: 'Closed', health: 'warn' },
          { name: 'H-07 · Upper chili', crop: 'Chili (Capsicum)', area: '0.6 ha', moist: 31, valve: 'Closed', health: 'crit' },
        ].map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 0.6fr', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
              <div className="tiny muted">{f.crop} · {f.area}</div>
            </div>
            <div>
              <div className="tiny muted">Soil moisture</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: f.moist + '%', background: f.moist < 35 ? 'var(--danger)' : f.moist < 50 ? 'var(--accent)' : 'var(--primary)' }}/></div>
                <div className="tabular small" style={{ fontWeight: 600 }}>{f.moist}%</div>
              </div>
            </div>
            <Chip kind={f.valve === 'Open' ? 'live' : 'off'}>{f.valve === 'Open' ? <Icon name="valve" size={10}/> : null} {f.valve}</Chip>
            <Chip kind={f.health}>{f.health === 'live' ? 'Healthy' : f.health === 'warn' ? 'Stressed' : 'Critical'}</Chip>
            <Icon name="arrow" size={14} color="var(--muted)"/>
          </div>
        ))}
      </div>

      {/* Adaptive simulator */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Adaptive simulation</div>
          <Chip kind="info" dot={false}>ACA-O</Chip>
        </div>
        <div className="tiny muted" style={{ marginBottom: 10 }}>Tune your priority → see projected outcome</div>
        {[['Risk tolerance', 40], ['Yield weight', 65], ['Price weight', 50]].map(r => (
          <div key={r[0]} style={{ marginBottom: 10 }}>
            <div className="between small" style={{ marginBottom: 2 }}><span className="muted">{r[0]}</span><span className="tabular" style={{ fontWeight: 600 }}>{r[1]}%</span></div>
            <input type="range" defaultValue={r[1]} style={{ width: '100%', accentColor: 'var(--primary)' }}/>
          </div>
        ))}
        <div className="divider" style={{ margin: '10px 0' }}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8 }}>
          <div className="metric" style={{ padding: 10 }}>
            <div className="metric-label">Projected yield</div>
            <div className="metric-value" style={{ fontSize: 18 }}>4.6 <span style={{ fontSize: 12, color: 'var(--muted)' }}>t/ha</span></div>
            <div className="metric-delta up">↑ 12% vs baseline</div>
          </div>
          <div className="metric" style={{ padding: 10 }}>
            <div className="metric-label">Projected profit</div>
            <div className="metric-value" style={{ fontSize: 18 }}>LKR 284k</div>
            <div className="metric-delta up">↑ 18%</div>
          </div>
        </div>
      </div>
    </div>

    {/* Crop water contribution */}
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head">
        <div className="card-title">Water contribution by crop · last 30 days</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: 2 }}/>Paddy</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--secondary)', borderRadius: 2 }}/>Chili</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }}/>Groundnut</span>
        </div>
      </div>
      <BarChart
        data={[
          [18,22,16,24,28,20,18,22,24,26,20,24,28,22,20,24,26,28,22,18,22,26,28,24,20,22,26,28,20,24],
          [4,6,5,8,6,4,5,6,8,7,5,6,8,7,6,5,6,8,7,6,5,6,8,7,5,6,7,8,6,5],
          [2,3,2,3,4,3,2,3,4,3,2,3,4,3,2,3,4,3,2,3,4,3,4,3,2,3,4,3,2,3]
        ]}
        stacked
        width={1040}
        height={140}
        color={['var(--primary)', 'var(--secondary)', 'var(--accent)']}
        labels={Array.from({length:30}, (_,i) => i%5===0 ? 'd'+(i+1) : '')}
      />
    </div>
  </Frame>
);

// [6] FIELD LIST

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerPortal />
    </div>
  );
}

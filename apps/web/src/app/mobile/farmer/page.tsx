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

const FarmerMobile = () => (
  <div className="asi-root" style={{ width: 375, height: 720, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
    {/* Status bar */}
    <div style={{ height: 28, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', fontSize: 11, fontWeight: 600 }}>
      <span>5:48</span>
      <span>◢ ◨ 87%</span>
    </div>
    {/* Top */}
    <div style={{ padding: '14px 16px 12px', background: 'var(--primary)', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="avatar" style={{ background: 'rgba(255,255,255,0.2)', width: 38, height: 38 }}>NP</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, opacity: 0.9 }}>Good morning</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Nimal · H-04</div>
        </div>
        <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={16} color="white"/>
          <span style={{ position: 'absolute', top: 3, right: 4, width: 8, height: 8, borderRadius: 50, background: 'var(--accent)' }}/>
        </div>
      </div>
    </div>
    {/* Body */}
    <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100% - 28px - 72px - 64px)' }}>
      {/* Announcement */}
      <div style={{ background: 'var(--accent-50)', border: '1px solid #F2D6A5', borderRadius: 10, padding: 10, fontSize: 11.5, marginBottom: 10, display: 'flex', gap: 8 }}>
        <Icon name="bell" size={14} color="#B27500"/>
        <div><b style={{ color: '#7A5200' }}>Release Tue 5AM</b> · Ulhitiya will release 42 mm across H-04.</div>
      </div>

      {/* Water budget */}
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div className="between">
          <div className="card-title">Water budget</div>
          <Chip kind="warn">Caution</Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Gauge value={62} size={88} color="var(--accent)" label="62%" sub="used"/>
          <div style={{ flex: 1, fontSize: 11.5 }}>
            <div className="between"><span className="muted">Quota</span><span className="tabular" style={{ fontWeight: 700 }}>980 mm</span></div>
            <div className="between" style={{ marginTop: 4 }}><span className="muted">Used</span><span className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>607</span></div>
            <div className="between" style={{ marginTop: 4 }}><span className="muted">Remaining</span><span className="tabular" style={{ fontWeight: 700, color: 'var(--primary)' }}>373</span></div>
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div className="between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="cloud" size={28} color="var(--secondary)"/>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }} className="tabular">28.4°C</div>
              <div className="tiny muted">Partly cloudy · 74%</div>
            </div>
          </div>
          <Chip kind="live">Live</Chip>
        </div>
        <div style={{ marginTop: 8 }}>
          <BarChart data={[2,5,0,1,8,12,4]} width={340} height={48} color="var(--secondary)" labels={['Mo','Tu','We','Th','Fr','Sa','Su']}/>
        </div>
      </div>

      {/* Fields */}
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div className="between" style={{ marginBottom: 8 }}>
          <div className="card-title">My fields</div>
          <span className="tiny muted">3 · tap to open</span>
        </div>
        {[
          ['H-04 Home', 'Paddy', 62, 'Open', 'live'],
          ['H-04 East', 'Paddy', 48, 'Closed', 'warn'],
          ['H-07 Chili', 'Chili', 31, 'Closed', 'crit'],
        ].map((f, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <div className="between">
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f[0]}</div>
                <div className="tiny muted">{f[1]}</div>
              </div>
              <Chip kind={f[4]}>{f[4] === 'live' ? 'Healthy' : f[4] === 'warn' ? 'Stressed' : 'Critical'}</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: f[2]+'%', background: f[2]<35?'var(--danger)':f[2]<50?'var(--accent)':'var(--primary)' }}/></div>
              <span className="tabular tiny" style={{ fontWeight: 700 }}>{f[2]}%</span>
              <Chip kind={f[3] === 'Open' ? 'live' : 'off'}>{f[3]}</Chip>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button className="btn btn-primary" style={{ width: '100%', height: 44, marginBottom: 10 }}>
        <Icon name="droplet" size={14}/> Request irrigation
      </button>
    </div>

    {/* Bottom nav */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, background: 'white', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {[
        ['home', 'Home', true],
        ['leaf', 'Fields', false],
        ['droplet', 'Water', false],
        ['cloud', 'Forecast', false],
        ['user', 'Me', false],
      ].map((n, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: n[2] ? 'var(--primary-600)' : 'var(--muted)' }}>
          <Icon name={n[0]} size={18}/>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{n[1]}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerMobile />
    </div>
  );
}

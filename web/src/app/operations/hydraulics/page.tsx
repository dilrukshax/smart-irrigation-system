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

const Hydraulics = () => (
  <Frame sidebar={officerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'Hydraulics' })) }))} breadcrumb={['Operations', 'Hydraulics']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Hydraulics schedule</div><div className="page-sub">Week 22 · 26 May – 01 Jun · 14 releases planned</div></div>
      <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> Add release</button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Weekly release Gantt</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip kind="warn">2 conflicts</Chip>
            <button className="btn btn-ghost btn-sm">Week ▾</button>
          </div>
        </div>
        {/* Gantt */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 10, columnGap: 10 }}>
          <div/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>
            {['MON 26','TUE 27','WED 28','THU 29','FRI 30','SAT 31','SUN 01'].map((d, i) => <div key={i} style={{ padding: '4px 0' }}>{d}</div>)}
          </div>
          {[
            { f: 'H-04 Main canal', bars: [[1,2,'var(--primary)','05:00 · 28mm'], [5,5,'var(--primary)','05:00 · 22mm']] },
            { f: 'H-05 Canal A', bars: [[0,1,'var(--primary)','05:30 · 18mm'], [4,4,'var(--secondary)','06:00 · 14mm']] },
            { f: 'H-05 Canal B', bars: [[3,3,'var(--secondary)','06:00 · 14mm']] },
            { f: 'H-07 Upper', bars: [[2,2,'var(--accent)','05:00 · 18mm CONFLICT']] },
            { f: 'H-07 Lower', bars: [[2,3,'var(--primary)','06:00 · 24mm']] },
            { f: 'H-08 Main', bars: [[5,6,'var(--primary)','05:00 · 26mm']] },
            { f: 'H-08 North', bars: [[6,6,'var(--accent)','05:30 · 16mm OVERLAP']] },
          ].map((row, i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 12, fontWeight: 600, alignSelf: 'center' }}>{row.f}</div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: 30 }}>
                {Array.from({length: 7}, (_, c) => <div key={c} style={{ borderRight: c < 6 ? '1px dashed #E4EAE1' : 'none', background: c % 2 ? 'transparent' : '#FBFCF9' }}/>)}
                {row.bars.map((b, bi) => (
                  <div key={bi} style={{
                    position: 'absolute', left: `${(b[0]/7)*100}%`, width: `${((b[1]-b[0]+1)/7)*100 - 1}%`,
                    top: 4, bottom: 4, background: b[2], borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 6px',
                    fontSize: 10, color: 'white', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden'
                  }}>{b[3]}</div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="divider" style={{ margin: '14px 0' }}/>
        <div style={{ padding: 10, background: 'var(--accent-50)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bell" size={16} color="var(--accent)"/>
          <div style={{ flex: 1, fontSize: 12 }}>
            <b style={{ color: '#7A5200' }}>2 conflicts detected.</b> <span className="muted">H-07 Upper overlaps H-04 Main on Wed. H-08 North overlaps H-08 Main on Sun.</span>
          </div>
          <button className="btn btn-ghost btn-sm">Auto-resolve</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-head" style={{ justifyContent: 'center' }}>
            <div className="card-title">Reservoir</div>
          </div>
          <Gauge value={68} size={170} stroke={18} color="var(--secondary)" sub="98.6 MCM"/>
          <div style={{ marginTop: 12, padding: 10, background: '#F6F8F4', borderRadius: 8, fontSize: 12 }}>
            <div className="between"><span className="muted">Scheduled out (week)</span><span className="tabular" style={{ fontWeight: 700 }}>12.4 MCM</span></div>
            <div className="between" style={{ marginTop: 4 }}><span className="muted">Expected inflow</span><span className="tabular" style={{ fontWeight: 700 }}>8.2 MCM</span></div>
            <div className="between" style={{ marginTop: 4 }}><span className="muted">End-of-week level</span><span className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>65.1%</span></div>
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>Add release</div>
          <div className="field" style={{ marginBottom: 8 }}><label>Field / canal</label><select className="select"><option>H-04 Main canal</option></select></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 8, marginBottom: 8 }}>
            <div className="field"><label>Date</label><input className="input" defaultValue="28 May"/></div>
            <div className="field"><label>Time</label><input className="input" defaultValue="05:00"/></div>
          </div>
          <div className="field" style={{ marginBottom: 8 }}><label>Duration (h)</label><input className="input" defaultValue="3.0"/></div>
          <div className="field" style={{ marginBottom: 12 }}><label>Volume (mm)</label><input className="input" defaultValue="24"/></div>
          <button className="btn btn-primary" style={{ width: '100%' }}>Queue release</button>
        </div>
      </div>
    </div>
  </Frame>
);

// [22] USER MANAGEMENT

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Hydraulics />
    </div>
  );
}

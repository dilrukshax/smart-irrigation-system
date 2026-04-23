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

const WaterManagement = () => (
  <Frame sidebar={irrigationNav('water')} breadcrumb={['Modules', 'F1 · Irrigation', 'Water Management']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Water management · Ulhitiya reservoir</div><div className="page-sub">Capacity 145 MCM · feeds 3 schemes · 42 fields active</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm">Release log</button>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> Schedule release</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.3fr', gap: 14 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="card-head" style={{ width: '100%' }}>
          <div><div className="card-title">Reservoir level</div><div className="tiny muted">Live · updated 3m ago</div></div>
          <Chip kind="live">On track</Chip>
        </div>
        <Gauge value={68} max={100} size={220} stroke={22} color="var(--secondary)" label="68%" sub="98.6 / 145 MCM"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginTop: 16 }}>
          <div className="metric" style={{ padding: 10 }}><div className="metric-label">Inflow</div><div className="metric-value" style={{ fontSize: 16 }}>3.2 <span style={{ fontSize: 11, color: 'var(--muted)' }}>m³/s</span></div></div>
          <div className="metric" style={{ padding: 10 }}><div className="metric-label">Outflow</div><div className="metric-value" style={{ fontSize: 16 }}>5.8 <span style={{ fontSize: 11, color: 'var(--muted)' }}>m³/s</span></div></div>
          <div className="metric" style={{ padding: 10 }}><div className="metric-label">Evap</div><div className="metric-value" style={{ fontSize: 16 }}>0.4 <span style={{ fontSize: 11, color: 'var(--muted)' }}>mm/d</span></div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Scheduled releases · this week</div><Chip kind="info" dot={false}>Gantt</Chip></div>
        {/* Gantt */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 10, marginTop: 8 }}>
          {/* header */}
          <div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d, i) => <div key={i} style={{ padding: '4px 0' }}>{d}</div>)}
          </div>
          {[
            { f: 'H-04 Main', bars: [[1,2,'var(--primary)']] },
            { f: 'H-05 Canal', bars: [[0,1,'var(--primary)'], [4,5,'var(--secondary)']] },
            { f: 'H-07 Upper', bars: [[2,2,'var(--accent)']] },
            { f: 'H-07 Lower', bars: [[2,3,'var(--primary)']] },
            { f: 'H-08 Main', bars: [[5,6,'var(--primary)']] },
          ].map((row, i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 12, fontWeight: 600, alignSelf: 'center' }}>{row.f}</div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: 28, background: 'linear-gradient(to right, #F4F7F1 1px, transparent 1px) 0 0/calc(100%/7) 100%' }}>
                {Array.from({length: 7}, (_, c) => <div key={c} style={{ borderRight: c < 6 ? '1px dashed #E4EAE1' : 'none' }}/>)}
                {row.bars.map((b, bi) => (
                  <div key={bi} style={{
                    position: 'absolute', left: `${(b[0]/7)*100}%`, width: `${((b[1]-b[0]+1)/7)*100-1}%`,
                    top: 4, bottom: 4, background: b[2], borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 6px',
                    fontSize: 10, color: 'white', fontWeight: 600
                  }}>
                    {['05:00 · 28mm','09:00 · 18mm','Partial · 12mm'][bi % 3]}
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>

    {/* Manual override + trend */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginTop: 14 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Manual override</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          <div className="field"><label>Date</label><input className="input" defaultValue="26 May 2026"/></div>
          <div className="field"><label>Time</label><input className="input" defaultValue="05:00"/></div>
          <div className="field"><label>Target</label><select className="select"><option>H-04 Main canal</option></select></div>
          <div className="field"><label>Volume (mm)</label><input className="input" defaultValue="24"/></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Reason</label><textarea className="textarea" rows="2" defaultValue="Compensate for rainfall deficit forecast days 5–8."/></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost">Cancel</button>
          <button className="btn btn-primary">Queue release</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title">30-day reservoir trend</div><Chip kind="info" dot={false}>Level vs. target</Chip></div>
        <LineChart
          width={620} height={200} legend
          series={[
            { name: 'Actual', color: 'var(--secondary)', data: [76,75,74,74,73,72,71,71,70,70,69,68,68,68,67,67,67,68,68,68,69,68,68,68,68,68,68,68,68,68] },
            { name: 'Target', color: 'var(--primary)', data: [78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60,59,58,57,56,55,54,53,52,51,50,49] },
          ]}
          xLabels={Array.from({length:30}, (_,i) => i%5===0 ? 'd'+(i+1) : '')}
        />
      </div>
    </div>

    {/* Allocation table */}
    <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title">Per-field allocation vs quota · current season</div>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> CSV</button>
      </div>
      <table className="tbl">
        <thead><tr><th>Field</th><th>Crop</th><th>Quota (mm)</th><th>Used</th><th>Remaining</th><th>Status</th></tr></thead>
        <tbody>
          {[
            ['H-04 Home paddy', 'Paddy', 980, 607, 373, 'warn', 62],
            ['H-04 East plot', 'Paddy', 980, 520, 460, 'live', 53],
            ['H-04 South paddy', 'Paddy', 980, 441, 539, 'live', 45],
            ['H-05 Maize A', 'Maize', 620, 348, 272, 'live', 56],
            ['H-07 Upper chili', 'Chili', 520, 402, 118, 'crit', 77],
            ['H-07 Lower chili', 'Chili', 520, 286, 234, 'live', 55],
          ].map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{r[0]}</td>
              <td>{r[1]}</td>
              <td className="tabular">{r[2]}</td>
              <td className="tabular">{r[3]}</td>
              <td className="tabular">{r[4]}</td>
              <td style={{ width: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: r[6] + '%', background: r[6]>70?'var(--danger)':r[6]>55?'var(--accent)':'var(--primary)' }}/></div>
                  <Chip kind={r[5]}>{r[6]}%</Chip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Frame>
);

// [11] SENSOR TELEMETRY

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <WaterManagement />
    </div>
  );
}

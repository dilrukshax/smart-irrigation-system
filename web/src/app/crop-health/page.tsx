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

const CropHealth = () => (
  <Frame sidebar={[
    { label: 'F2 · Crop Health', items: [
      { name: 'Overview', icon: 'home', active: true },
      { name: 'Zone Map', icon: 'map' },
      { name: 'Disease Scans', icon: 'shield_check' },
      { name: 'Stress Alerts', icon: 'bell' },
    ]},
    { label: 'Modules', items: [
      { name: 'Irrigation', icon: 'droplet' },
      { name: 'Forecasting', icon: 'cloud' },
      { name: 'Optimization', icon: 'target' },
    ]},
  ]} breadcrumb={['Modules', 'F2 · Crop Health']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Crop health · scheme-wide</div><div className="page-sub">42 fields · 126 zones · NDVI updated daily from Sentinel-2 L2A</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm"><Icon name="upload" size={13}/> Scan image</button>
        <button className="btn btn-primary btn-sm"><Icon name="leaf" size={13}/> Run NDVI refresh</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <SchemeMap height={400} zones={[
          { x: 6, y: 8, w: 22, h: 18, color: '#66BB6A', stroke: '#2E7D32', label: 'Z-01 · 0.88' },
          { x: 30, y: 10, w: 24, h: 20, color: '#81C784', stroke: '#2E7D32', label: 'Z-02 · 0.79' },
          { x: 56, y: 8, w: 20, h: 18, color: '#66BB6A', stroke: '#2E7D32', label: 'Z-03 · 0.86' },
          { x: 78, y: 12, w: 18, h: 18, color: '#FFB74D', stroke: '#B27500', label: 'Z-04 · 0.58' },
          { x: 8, y: 32, w: 26, h: 22, color: '#66BB6A', stroke: '#2E7D32', label: 'Z-05 · 0.82' },
          { x: 36, y: 36, w: 22, h: 20, color: '#81C784', stroke: '#2E7D32', label: 'Z-06 · 0.77' },
          { x: 60, y: 34, w: 24, h: 22, color: '#EF5350', stroke: '#C62828', label: 'Z-07 · 0.42' },
          { x: 10, y: 60, w: 24, h: 22, color: '#FFB74D', stroke: '#B27500', label: 'Z-08 · 0.61' },
          { x: 38, y: 62, w: 24, h: 22, color: '#66BB6A', stroke: '#2E7D32', label: 'Z-09 · 0.84' },
          { x: 66, y: 62, w: 22, h: 22, color: '#81C784', stroke: '#2E7D32', label: 'Z-10 · 0.75' },
        ]}/>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Zone list</div>
          <select className="select" style={{ height: 28, fontSize: 11 }}><option>All 10 zones</option></select>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {[
            ['Z-01', 'H-04 Home', 0.88, 'live', 'Healthy'],
            ['Z-02', 'H-04 East', 0.79, 'live', 'Healthy'],
            ['Z-03', 'H-04 South', 0.86, 'live', 'Healthy'],
            ['Z-04', 'H-05 Row A', 0.58, 'warn', 'Stressed'],
            ['Z-05', 'H-05 Row B', 0.82, 'live', 'Healthy'],
            ['Z-06', 'H-07 Low', 0.77, 'live', 'Healthy'],
            ['Z-07', 'H-07 Up', 0.42, 'crit', 'Critical'],
            ['Z-08', 'H-07 Res', 0.61, 'warn', 'Stressed'],
            ['Z-09', 'H-08 Main', 0.84, 'live', 'Healthy'],
            ['Z-10', 'H-08 Cnl', 0.75, 'live', 'Healthy'],
          ].map((z, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 80px', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{z[0]}</span>
              <span className="muted">{z[1]}</span>
              <span className="tabular" style={{ fontWeight: 600 }}>{z[2]}</span>
              <Chip kind={z[3]}>{z[4]}</Chip>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginTop: 14 }}>
      <div className="card">
        <div className="card-head"><div className="card-title">NDVI trend · 7 days (top zones)</div><Chip kind="info" dot={false}>Daily</Chip></div>
        <LineChart
          width={560} height={200} legend
          series={[
            { name: 'Z-01 Home', color: 'var(--primary)', data: [0.82,0.83,0.85,0.86,0.87,0.88,0.88].map(x=>x*100) },
            { name: 'Z-04 Row A', color: 'var(--accent)', data: [0.72,0.68,0.65,0.62,0.60,0.59,0.58].map(x=>x*100) },
            { name: 'Z-07 Up', color: 'var(--danger)', data: [0.58,0.54,0.51,0.48,0.46,0.44,0.42].map(x=>x*100) },
          ]}
          xLabels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']}
        />
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Scan new image</div><Chip kind="sim" dot={false}>AI model</Chip></div>
        <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', background: '#FBFCF9' }}>
          <Icon name="upload" size={28} color="var(--muted)"/>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>Drop leaf image or paste URL</div>
          <div className="tiny muted">JPG, PNG · max 12 MB</div>
        </div>
        <div className="divider" style={{ margin: '14px 0' }}/>
        <div className="tiny muted" style={{ marginBottom: 6 }}>Latest prediction</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(135deg, #A5D6A7, #66BB6A)' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Rice · Bacterial leaf blight</div>
            <div className="tiny muted">Severity: moderate</div>
            <div className="prog slim" style={{ marginTop: 4 }}><div className="prog-fill" style={{ width: '86%', background: 'var(--accent)' }}/></div>
          </div>
          <div className="tabular" style={{ fontWeight: 700 }}>86%</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Health distribution</div><Chip kind="info" dot={false}>126 zones</Chip></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Donut size={130} segments={[
            { value: 78, color: 'var(--primary)' },
            { value: 16, color: 'var(--accent)' },
            { value: 6, color: 'var(--danger)' },
          ]} center={<><div style={{ fontSize: 20, fontWeight: 700 }} className="tabular">78%</div><div className="tiny muted">healthy</div></>}/>
          <div>
            {[['Healthy', 78, 'var(--primary)'], ['Stressed', 16, 'var(--accent)'], ['Critical', 6, 'var(--danger)']].map(r => (
              <div key={r[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: r[2] }}/>
                <span style={{ flex: 1 }}>{r[0]}</span>
                <span className="tabular" style={{ fontWeight: 700 }}>{r[1]}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="divider" style={{ margin: '12px 0' }}/>
        <div className="tiny muted">Δ vs last week</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Critical zones ↑ 2 (Z-07, Z-08)</div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-head"><div className="card-title">Stress alert feed</div><span className="tiny muted">Sorted by severity</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {[
          { z: 'Z-07 · H-07 Up', s: 'crit', msg: 'NDVI dropped 0.16 in 72h. Probable water stress + N-deficiency.', t: '2h ago' },
          { z: 'Z-04 · H-05 Row A', s: 'warn', msg: 'Yellowing pattern detected on 18% of area. Consider foliar scan.', t: '5h ago' },
          { z: 'Z-08 · H-07 Res', s: 'warn', msg: 'Canopy heat stress during 12–14:00. Shift next irrigation earlier.', t: '1d ago' },
        ].map((a, i) => (
          <div key={i} style={{ padding: 12, border: '1px solid var(--border)', borderLeft: `3px solid ${a.s === 'crit' ? 'var(--danger)' : 'var(--accent)'}`, borderRadius: 8 }}>
            <div className="between"><Chip kind={a.s}>{a.z}</Chip><span className="tiny muted">{a.t}</span></div>
            <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>{a.msg}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm">Dismiss</button>
              <button className="btn btn-primary btn-sm">View zone →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

// [13] FORECASTING DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <CropHealth />
    </div>
  );
}

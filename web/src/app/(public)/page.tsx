/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
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

const Landing = () => (
  <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
    <PublicTop active="home"/>
    <div style={{ padding: '48px 56px 36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', color: 'var(--primary-600)' }}>
          <span className="chip-dot" style={{ background: 'var(--primary)' }}/>
          RESEARCH · MAHAWELI DEV. AUTHORITY · 2025–26
        </div>
        <h1 style={{ fontSize: 48, lineHeight: 1.02, letterSpacing: '-0.03em', marginTop: 16 }}>
          Smart irrigation.<br/>
          <span style={{ color: 'var(--primary)' }}>Smarter</span> harvests.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 14, maxWidth: 500, lineHeight: 1.55 }}>
          HarvestPulse is an adaptive decision platform for Sri Lankan paddy schemes. Four coupled modules — sensing, crop health, forecasting, and optimization — guide every mm of water from reservoir to root.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <Link href="/login" className="btn btn-primary" style={{ height: 42, padding: '0 18px', fontSize: 13.5 }}>
            Farmer login <Icon name="arrow" size={14}/>
          </Link>
          <Link href="/operations" className="btn btn-ghost" style={{ height: 42, padding: '0 18px', fontSize: 13.5 }}>Officer login</Link>
          <Link href="/farmer" className="btn btn-ghost" style={{ height: 42, padding: '0 18px', fontSize: 13.5, border: 'none', color: 'var(--primary-600)' }}>
            Explore the dashboard →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 36, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
          {[
            ['1,284', 'Fields monitored'],
            ['32%', 'Water saved vs. baseline'],
            ['0.86', 'Mean crop health (NDVI)'],
            ['91%', 'Forecast accuracy (14-d)'],
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }} className="tabular">{s[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s[1]}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Hero illustration */}
      <div style={{ position: 'relative', height: 440 }}>
        <div className="tile leaf" style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <SchemeMap height={260} zones={[
            { x: 8, y: 12, w: 34, h: 30, color: '#66BB6A', stroke: '#2E7D32', label: 'H-04 Paddy' },
            { x: 46, y: 22, w: 28, h: 24, color: '#F9A825', stroke: '#B27500', label: 'H-05 Maize' },
            { x: 14, y: 50, w: 40, h: 28, color: '#81C784', stroke: '#2E7D32', label: 'H-06 Paddy' },
            { x: 58, y: 54, w: 30, h: 26, color: '#EF5350', stroke: '#C62828', label: 'H-07 Chili' },
          ]} markers={[
            { x: 24, y: 24 }, { x: 58, y: 30, color: '#F9A825' }, { x: 34, y: 64 }, { x: 70, y: 66, color: '#C62828' },
          ]}/>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="tiny muted">Reservoir · Ulhitiya</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }} className="tabular">68%</div>
                <span className="chip live">On track</span>
              </div>
              <Sparkline data={[62,64,63,66,65,68,68]} width={160} height={26}/>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="tiny muted">Active alerts</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }} className="tabular">3</div>
                <span className="chip warn">2 drought risk</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>H-07 moisture below threshold · 02:14</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Modules */}
    <div style={{ padding: '8px 56px 56px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Four coupled modules</div>
      <h2 style={{ fontSize: 24, marginTop: 6, letterSpacing: '-0.02em' }}>An end-to-end decision loop, from sensor to scheme.</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 20 }}>
        {[
          { tag: 'F1', title: 'Irrigation', icon: 'droplet', color: 'var(--secondary)', desc: 'Soil moisture telemetry, valve automation, per-field water budgets.' },
          { tag: 'F2', title: 'Crop Health', icon: 'shield_check', color: 'var(--primary)', desc: 'NDVI zones, disease scans, stress alerts with severity scoring.' },
          { tag: 'F3', title: 'Forecasting', icon: 'cloud', color: '#7B1FA2', desc: '14-day reservoir & rainfall with P10/P50/P90 risk bands.' },
          { tag: 'F4', title: 'Optimization', icon: 'target', color: 'var(--accent)', desc: 'ACA-O recommends crop mix that maximizes profit under quota.' },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: m.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={18}/>
              </div>
              <span className="badge badge-new" style={{ background: '#F6F8F4', color: 'var(--muted)' }}>{m.tag}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>{m.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{m.desc}</div>
            <Link
              href={
                m.title === 'Irrigation'
                  ? '/irrigation'
                  : m.title === 'Crop Health'
                    ? '/crop-health'
                    : m.title === 'Forecasting'
                      ? '/forecasting'
                      : '/optimization'
              }
              style={{ marginTop: 12, fontSize: 11, color: m.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Explore <Icon name="arrow" size={12}/>
            </Link>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// [2] FARMER PUBLIC LANDING

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Landing />
    </div>
  );
}

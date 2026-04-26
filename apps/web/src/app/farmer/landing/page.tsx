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

const FarmerLanding = () => (
  <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
    <PublicTop active="farmer"/>
    <div style={{ padding: '40px 56px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40, alignItems: 'center' }}>
        <div>
          <span className="badge badge-new">FOR FARMERS · නිදහස් ලියාපදිංචිය</span>
          <h1 style={{ fontSize: 42, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 12 }}>
            තීරණ නොව, <span style={{ color: 'var(--primary)' }}>විසඳුම්</span>.<br/>
            Decisions guided, not guessed.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6, maxWidth: 460 }}>
            Get daily irrigation advice, early disease alerts, and crop recommendations tailored to your field and your scheme's water budget. Free to register. Works on any phone.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <Link href="/register" className="btn btn-primary" style={{ height: 42, fontSize: 13 }}>Register my farm</Link>
            <Link href="/farmer" className="btn btn-ghost" style={{ height: 42, fontSize: 13 }}>Open farmer portal</Link>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 24, flexWrap: 'wrap' }}>
            {['EN · English', 'සිංහල · Sinhala', 'தமிழ் · Tamil'].map((l, i) => (
              <span key={i} className="chip info">{l}</span>
            ))}
          </div>
        </div>
        <div className="tile leaf" style={{ height: 380, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>How it works</div>
          {[
            { n: 1, title: 'Pair your field', d: 'Add your field, crop, and pair the sensor kit.', icon: 'qr' },
            { n: 2, title: 'Get daily plan', d: "We decide when to open the valve and how much.", icon: 'droplet' },
            { n: 3, title: 'Harvest more', d: 'Adaptive recommendations increase yield & profit.', icon: 'leaf' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'white', padding: 14, borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {s.n}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.d}</div>
              </div>
              <Icon name={s.icon} size={20} color="var(--primary)"/>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 38 }}>
        {[
          ['Save water', 'Cut wasteful irrigation by up to 35% while keeping moisture in the optimal band.', 'droplet'],
          ['Catch disease early', 'Phone-camera scans flag bacterial leaf blight, blast, and brown spot.', 'shield_check'],
          ['Earn more per season', 'Crop recommendations factor price forecasts and rainfall risk.', 'target'],
          ['Your language', 'Every screen, alert, and SMS available in Sinhala, Tamil, and English.', 'globe'],
        ].map((b, i) => (
          <div key={i} className="card">
            <Icon name={b[2]} size={20} color="var(--primary)"/>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{b[0]}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{b[1]}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// [3] LOGIN

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerLanding />
    </div>
  );
}

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

const Register = () => (
  <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
    <div style={{ padding: 56, background: 'linear-gradient(160deg, #F1F8E9 0%, #E1F5FE 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Logo/>
      <div>
        <h1 style={{ fontSize: 34, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Register your farm in three steps.</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 13.5 }}>
          We'll match your field to the nearest sensor cluster and enroll you in your scheme's quota program.
        </p>
        {/* Step ladder */}
        <div style={{ marginTop: 30 }}>
          {[
            { n: '01', t: 'Personal Info', s: 'Name, NIC, contact' },
            { n: '02', t: 'Farm Details', s: 'Area, GPS, soil, crops' },
            { n: '03', t: 'Review & Submit', s: 'Confirm and enroll' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: i === 1 ? 'var(--primary)' : i === 0 ? 'var(--primary-50)' : 'white', color: i === 1 ? 'white' : i === 0 ? 'var(--primary-600)' : 'var(--muted)', border: i === 2 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                {i === 0 ? <Icon name="check" size={14}/> : s.n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.t}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{s.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Data is stored on Mahaweli Authority servers · ISO 27001</div>
    </div>
    <div style={{ padding: '56px 64px', overflow: 'auto' }}>
      <div className="between">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em' }}>STEP 2 OF 3</div>
          <h2 style={{ fontSize: 24, letterSpacing: '-0.02em', marginTop: 4 }}>Farm details</h2>
        </div>
        <Chip kind="info" dot={false}>Draft saved · 2 min ago</Chip>
      </div>
      <div className="prog" style={{ marginTop: 14, marginBottom: 24 }}>
        <div className="prog-fill" style={{ width: '66%' }}/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <div className="field"><label>Full name</label><input className="input" defaultValue="Nimal Perera"/></div>
        <div className="field"><label>NIC</label><input className="input" defaultValue="199112345678"/></div>
        <div className="field"><label>Email</label><input className="input" defaultValue="nimal.p@example.lk"/></div>
        <div className="field"><label>Phone</label><input className="input" defaultValue="+94 71 555 0142"/></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Scheme zone</label>
          <select className="select">
            <option>Mahaweli H-04 (Thalawa) · Major</option>
            <option>Mahaweli H-05 (Galnewa)</option>
            <option>Mahaweli H-07 (Nochchiyagama)</option>
          </select>
        </div>
        <div className="field"><label>Field area (hectares)</label><input className="input" defaultValue="2.4"/></div>
        <div className="field"><label>Primary crop</label>
          <select className="select"><option>Paddy — Bg 352</option><option>Maize</option><option>Chili</option></select>
        </div>
        <div className="field"><label>Soil type</label>
          <select className="select"><option>Reddish-Brown Earth</option><option>Low-Humic Gley</option></select>
        </div>
        <div className="field"><label>GPS coordinates</label><input className="input" defaultValue="8.3421° N, 80.4891° E"/></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Farmer','Officer (requires invite)','Authority (requires invite)'].map((r, i) => (
              <label key={i} style={{ flex: 1, border: `1px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`, padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: i === 0 ? 'var(--primary-50)' : 'white' }}>
                <input type="radio" name="role" defaultChecked={i === 0}/> {r}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
        <Link href="/login" className="btn btn-ghost">← Back</Link>
        <Link href="/farmer/onboarding" className="btn btn-primary">Continue to Review →</Link>
      </div>
    </div>
  </div>
);


/* Farmer portal: Portal dashboard, Field list, Field Workspace, Onboarding */

// [5] FARMER PORTAL

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Register />
    </div>
  );
}

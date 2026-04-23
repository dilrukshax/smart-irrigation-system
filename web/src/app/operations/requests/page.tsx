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

const ManualRequests = () => {
  const [tab, setTab] = React.useState(0);
  return (
    <Frame sidebar={officerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'Manual Requests' })) }))} breadcrumb={['Operations', 'Manual Requests']} user="R. Silva" role="Officer">
      <div className="page-head">
        <div><div className="page-title">Manual request review</div><div className="page-sub">Approve, partial, or reject with reason · 12 pending</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="filter" size={13}/> Filter</button>
          <button className="btn btn-primary btn-sm">Bulk approve (3)</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        {['Pending (12)', 'Approved (48)', 'Rejected (6)'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className="btn btn-sm" style={{
            borderRadius: 0, background: 'transparent', height: 34, padding: '0 14px',
            color: tab === i ? 'var(--primary-600)' : 'var(--muted)', fontWeight: 600,
            borderBottom: tab === i ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { n: 'Nimal Perera', nic: '199112345678', f: 'H-04 · Home paddy', v: '25 mm', t: '1h ago', r: 'Soil crusting on east section, requesting extra 7 mm beyond auto plan.', m: 62, rec: 'Approve · within quota' },
          { n: 'Asela Jayasuriya', nic: '198856782134', f: 'H-04 · East plot', v: '20 mm', t: '3h ago', r: 'Tillering stage, moisture dropped after yesterday\'s heat.', m: 48, rec: 'Approve · moisture below target' },
          { n: 'K. Tilak', nic: '197634512765', f: 'H-05 · Maize A', v: '18 mm', t: '4h ago', r: 'Requesting post-weeding irrigation.', m: 55, rec: 'Partial · 12 mm recommended' },
          { n: 'T. Rathnayake', nic: '199245671234', f: 'H-07 · Lower chili', v: '30 mm', t: '6h ago', r: 'Flowering stage, need heavier irrigation before heat window.', m: 41, rec: 'Hold · scheduled release Tue' },
        ].map((r, i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }} className="between">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ width: 32, height: 32 }}>{r.n.split(' ').map(w => w[0]).join('')}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.n}</div>
                  <div className="tiny muted">NIC {r.nic} · {r.t}</div>
                </div>
              </div>
              <div className="tabular" style={{ fontSize: 18, fontWeight: 700, color: 'var(--secondary)' }}>{r.v}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="between small muted"><span>Field</span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{r.f}</span></div>
              <div style={{ fontSize: 12.5, marginTop: 8, padding: 10, background: '#FBFCF9', borderRadius: 6, borderLeft: '2px solid var(--border)', fontStyle: 'italic' }}>"{r.r}"</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, marginTop: 12 }}>
                <div>
                  <div className="tiny muted">Current moisture</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: r.m+'%', background: r.m<45?'var(--accent)':'var(--primary)' }}/></div>
                    <span className="tabular small" style={{ fontWeight: 600 }}>{r.m}%</span>
                  </div>
                </div>
                <div>
                  <div className="tiny muted">ACA-O recommendation</div>
                  <div className="small" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{r.rec}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-50)' }}>Reject</button>
                <button className="btn btn-ghost btn-sm">Partial…</button>
                <div style={{ flex: 1 }}/>
                <button className="btn btn-primary btn-sm">Approve {r.v}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

// [21] HYDRAULICS SCHEDULE

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <ManualRequests />
    </div>
  );
}

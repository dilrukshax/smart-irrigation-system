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

const FieldList = () => {
  const fields = [
    { name: 'H-04 · Home paddy', crop: 'Paddy Bg 352', area: 2.4, moist: 62, health: 'live', last: '2h ago' },
    { name: 'H-04 · East plot', crop: 'Paddy Bg 352', area: 1.8, moist: 48, health: 'warn', last: '5h ago' },
    { name: 'H-07 · Upper chili', crop: 'Chili', area: 0.6, moist: 31, health: 'crit', last: '9h ago' },
    { name: 'H-04 · South paddy', crop: 'Paddy Bg 360', area: 3.1, moist: 71, health: 'live', last: '1h ago' },
    { name: 'H-05 · Maize row A', crop: 'Maize', area: 1.2, moist: 55, health: 'live', last: '3h ago' },
  ];
  return (
    <Frame sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))} breadcrumb={['Farmer', 'My Fields']} user="Nimal Perera" role="Farmer">
      <div className="page-head">
        <div><div className="page-title">My fields</div><div className="page-sub">5 fields · 9.1 ha total · Mahaweli H</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 240, padding: '0 10px' }}>
            <Icon name="search" size={14} color="var(--muted)"/>
            <input placeholder="Search fields, crops, zones…" style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 12, fontFamily: 'inherit' }}/>
          </div>
          <div style={{ display: 'flex', background: '#F0F2ED', borderRadius: 8, padding: 3 }}>
            <button className="btn btn-sm" style={{ background: 'white', border: 'none' }}><Icon name="list" size={13}/></button>
            <button className="btn btn-sm" style={{ background: 'transparent', border: 'none', color: 'var(--muted)' }}><Icon name="grid" size={13}/></button>
          </div>
          <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> Add field</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr>
            <th style={{ width: 30 }}><input type="checkbox"/></th>
            <th>Field</th><th>Crop</th><th>Area</th><th>Soil moisture</th><th>Health</th><th>Last update</th><th></th>
          </tr></thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={i}>
                <td><input type="checkbox"/></td>
                <td><div style={{ fontWeight: 600 }}>{f.name}</div><div className="tiny muted">GPS 8.34, 80.49</div></td>
                <td>{f.crop}</td>
                <td className="tabular">{f.area} ha</td>
                <td style={{ width: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: f.moist + '%', background: f.moist < 35 ? 'var(--danger)' : f.moist < 50 ? 'var(--accent)' : 'var(--primary)' }}/></div>
                    <span className="tabular small" style={{ fontWeight: 600 }}>{f.moist}%</span>
                  </div>
                </td>
                <td><Chip kind={f.health}>{f.health === 'live' ? 'Healthy' : f.health === 'warn' ? 'Stressed' : 'Critical'}</Chip></td>
                <td className="muted small">{f.last}</td>
                <td><div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm">Workspace</button>
                  <button className="btn btn-primary btn-sm">Request</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
};

// [7] FIELD WORKSPACE

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldList />
    </div>
  );
}

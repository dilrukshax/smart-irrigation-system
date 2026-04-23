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

const UserManagement = () => (
  <Frame sidebar={authorityNav} breadcrumb={['Authority', 'User Management']} user="Dr. Wijeratne" role="Authority">
    <div className="page-head">
      <div><div className="page-title">User management</div><div className="page-sub">186 users · 3 roles · 4 scheme zones</div></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Export</button>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> Invite user</button>
      </div>
    </div>

    <div className="card" style={{ padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 10 }}>
        <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="search" size={14} color="var(--muted)"/>
          <input placeholder="Search users, emails, NICs…" style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 12, fontFamily: 'inherit' }}/>
        </div>
        <select className="select"><option>All roles</option></select>
        <select className="select"><option>All statuses</option></select>
        <select className="select"><option>All zones</option></select>
      </div>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="tbl">
        <thead><tr><th><input type="checkbox"/></th><th>Name</th><th>Email</th><th>Role</th><th>Scheme zone</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>
          {[
            ['Nimal Perera', 'nimal.p@example.lk', 'Farmer', 'Mahaweli H-04', 'live', 'Active', '2024-11-02'],
            ['Asela Jayasuriya', 'asela.j@example.lk', 'Farmer', 'Mahaweli H-04', 'live', 'Active', '2024-11-18'],
            ['K. Tilak', 'ktilak@mda.lk', 'Farmer', 'Mahaweli H-05', 'live', 'Active', '2025-01-14'],
            ['R. Silva', 'r.silva@mda.lk', 'Officer', 'Mahaweli H (all)', 'live', 'Active', '2023-05-20'],
            ['D. Kumar', 'd.kumar@mda.lk', 'Officer', 'Mahaweli H-07', 'warn', 'On leave', '2022-08-11'],
            ['Dr. Wijeratne', 'wijeratne@mda.lk', 'Authority', 'Mahaweli Board', 'live', 'Active', '2021-03-06'],
            ['P. Fernando', 'p.fern@example.lk', 'Farmer', 'Mahaweli H-08', 'off', 'Invited', '—'],
            ['S. Dias', 's.dias@mda.lk', 'Officer', 'Mahaweli H-08', 'crit', 'Suspended', '2023-09-22'],
          ].map((u, i) => (
            <tr key={i}>
              <td><input type="checkbox"/></td>
              <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{u[0].split(' ').map(w => w[0]).join('')}</div>
                <span style={{ fontWeight: 600 }}>{u[0]}</span>
              </td>
              <td className="muted">{u[1]}</td>
              <td>
                <Chip kind={u[2] === 'Farmer' ? 'info' : u[2] === 'Officer' ? 'sim' : 'warn'} dot={false}>{u[2]}</Chip>
              </td>
              <td>{u[3]}</td>
              <td><Chip kind={u[4]}>{u[5]}</Chip></td>
              <td className="muted small tabular">{u[6]}</td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm">Edit role</button>
                  <button className="btn btn-ghost btn-sm" style={{ padding: '0 6px' }}><Icon name="more" size={14}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Frame>
);

// [23] POLICY & QUOTA

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <UserManagement />
    </div>
  );
}

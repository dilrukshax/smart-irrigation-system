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

const OptScenarios = () => (
  <Frame sidebar={optNav('sce')} breadcrumb={['F4 · ACA-O', 'Scenarios']} user="R. Silva" role="Officer">
    <div className="page-head">
      <div><div className="page-title">Scenarios</div><div className="page-sub">Save what-if plans and compare side-by-side</div></div>
      <button className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> New scenario</button>
    </div>

    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }} className="between">
        <div className="card-title">Saved scenarios</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip kind="info" dot={false}>5 scenarios</Chip>
          <Chip kind="live">3 selected for compare</Chip>
        </div>
      </div>
      <table className="tbl">
        <thead><tr><th><input type="checkbox"/></th><th>Name</th><th>Saved</th><th>Status</th><th>Rainfall</th><th>Profit</th><th>Risk</th><th></th></tr></thead>
        <tbody>
          {[
            [true, 'Normal season (P50)', 'Yesterday', 'live', '78 mm', 'LKR 1.99M', 0.28],
            [true, 'Drought scenario (P10)', '2d ago', 'warn', '22 mm', 'LKR 1.42M', 0.46],
            [true, 'Groundnut-heavy pivot', '4d ago', 'sim', '78 mm', 'LKR 2.14M', 0.31],
            [false, 'Paddy continuity', '5d ago', 'sim', '78 mm', 'LKR 1.76M', 0.24],
            [false, 'Low risk (profit floor)', '7d ago', 'sim', 'P50', 'LKR 1.58M', 0.19],
          ].map((r, i) => (
            <tr key={i}>
              <td><input type="checkbox" defaultChecked={r[0]}/></td>
              <td style={{ fontWeight: 600 }}>{r[1]}</td>
              <td className="muted">{r[2]}</td>
              <td><Chip kind={r[3]}>{r[3] === 'live' ? 'Baseline' : r[3] === 'warn' ? 'Risky' : 'Draft'}</Chip></td>
              <td className="tabular">{r[4]}</td>
              <td className="tabular" style={{ fontWeight: 700 }}>{r[5]}</td>
              <td className="tabular">{r[6]}</td>
              <td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-ghost btn-sm">Open</button><Icon name="more" size={14}/></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Comparison */}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }} className="between">
        <div className="card-title">Comparison · 3 scenarios</div>
        <button className="btn btn-ghost btn-sm">Export</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(3, 1fr)', fontSize: 12 }}>
        <div style={{ padding: 14, borderRight: '1px solid var(--border)', background: '#FBFBF8', fontWeight: 600, color: 'var(--muted)' }}>Metric</div>
        {['Normal season (P50)', 'Drought (P10)', 'Groundnut pivot'].map((n, i) => (
          <div key={i} style={{ padding: 14, borderRight: i < 2 ? '1px solid var(--border)' : 'none', background: '#FBFBF8', fontWeight: 600 }}>{n}</div>
        ))}
        {[
          ['Total area', '9.1 ha', '9.1 ha', '9.1 ha'],
          ['Total water', '2,900 mm', '2,400 mm', '2,780 mm'],
          ['Projected yield', '34.3 t', '28.1 t', '36.2 t'],
          ['Projected profit', 'LKR 1.99M', 'LKR 1.42M', 'LKR 2.14M'],
          ['Risk score', '0.28', '0.46', '0.31'],
          ['Paddy share', '58%', '42%', '35%'],
        ].map((row, i) => (
          <React.Fragment key={i}>
            <div style={{ padding: 14, borderRight: '1px solid var(--border)', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>{row[0]}</div>
            {row.slice(1).map((v, c) => (
              <div key={c} style={{ padding: 14, borderRight: c < 2 ? '1px solid var(--border)' : 'none', borderTop: '1px solid var(--line)', fontWeight: 600 }} className="tabular">{v}</div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Diff chart · profit / yield / water</div>
        <BarChart
          data={[
            [1.99, 1.42, 2.14],
            [3.43, 2.81, 3.62],
            [2.90, 2.40, 2.78],
          ]}
          stacked
          width={900} height={140}
          color={['var(--primary)', 'var(--accent)', 'var(--secondary)']}
          labels={['Normal', 'Drought', 'Groundnut']}
        />
      </div>
    </div>
  </Frame>
);

// [18] ADAPTIVE RECOMMENDATIONS

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <OptScenarios />
    </div>
  );
}

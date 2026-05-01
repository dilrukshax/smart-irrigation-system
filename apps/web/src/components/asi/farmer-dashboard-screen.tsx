/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import Link from 'next/link';
import {
  Icon,
  Chip,
  Gauge,
  Frame,
} from '@/components/asi/ui';
import { farmerNav } from '@/components/asi/nav';

const waterBars = [
  [26, 7, 4],
  [36, 11, 5],
  [30, 8, 4],
  [45, 13, 5],
  [52, 14, 6],
  [35, 9, 4],
  [31, 8, 4],
  [39, 11, 5],
  [46, 13, 6],
  [49, 12, 5],
  [34, 8, 4],
  [47, 11, 5],
  [54, 15, 6],
  [38, 10, 5],
  [34, 8, 4],
  [40, 10, 5],
  [45, 12, 6],
  [50, 13, 6],
  [55, 14, 5],
  [38, 10, 5],
  [31, 8, 4],
  [39, 10, 5],
  [47, 11, 5],
  [54, 13, 6],
  [46, 11, 5],
  [34, 8, 4],
  [41, 9, 5],
  [50, 12, 6],
  [56, 15, 7],
  [61, 16, 7],
];

const weekRain = [
  { day: 'Mo', value: 8 },
  { day: 'Tu', value: 18 },
  { day: 'We', value: 0 },
  { day: 'Th', value: 4 },
  { day: 'Fr', value: 28 },
  { day: 'Sa', value: 42 },
  { day: 'Su', value: 15 },
];

const fields = [
  {
    name: 'H-04 · Home paddy',
    crop: 'Paddy Bg 352 · 2.4 ha',
    moisture: 62,
    valve: 'Open',
    valveKind: 'live',
    health: 'Healthy',
    healthKind: 'live',
    bar: 'var(--primary)',
  },
  {
    name: 'H-04 · East plot',
    crop: 'Paddy Bg 352 · 1.8 ha',
    moisture: 48,
    valve: 'Closed',
    valveKind: 'off',
    health: 'Stressed',
    healthKind: 'warn',
    bar: 'var(--accent)',
  },
  {
    name: 'H-07 · Upper chili',
    crop: 'Chili (Capsicum) · 0.6 ha',
    moisture: 31,
    valve: 'Closed',
    valveKind: 'off',
    health: 'Critical',
    healthKind: 'crit',
    bar: 'var(--danger)',
  },
];

function StaticProgress({ value, color = 'var(--primary)' }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#EFF3EC', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${value}%`, borderRadius: 99, background: color }} />
    </div>
  );
}

function StaticSlider({ value }) {
  return (
    <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 6, borderRadius: 99, background: '#E8ECE5', border: '1px solid #D7DED3' }} />
      <div style={{ position: 'absolute', left: 0, width: `${value}%`, height: 6, borderRadius: 99, background: 'var(--primary)' }} />
      <div style={{
        position: 'absolute',
        left: `calc(${value}% - 7px)`,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--primary)',
        boxShadow: '0 0 0 3px rgba(46,125,50,0.12)',
      }} />
    </div>
  );
}

function ForecastBars() {
  const max = Math.max(...weekRain.map((d) => d.value));
  return (
    <div style={{ marginTop: 12 }}>
      <div className="tiny muted" style={{ marginBottom: 8 }}>7-day rain (mm)</div>
      <div style={{ height: 82, display: 'grid', gridTemplateColumns: `repeat(${weekRain.length}, 1fr)`, gap: 8, alignItems: 'end', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        {weekRain.map((day) => (
          <div key={day.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 22,
              height: Math.max(4, (day.value / max) * 52),
              background: 'var(--secondary)',
              borderRadius: '4px 4px 2px 2px',
            }} />
            <span className="tiny muted">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CropMix() {
  const rows = [
    { name: 'Paddy Bg 352', value: 58, color: 'var(--primary)' },
    { name: 'Groundnut', value: 28, color: 'var(--secondary)' },
    { name: 'Green gram', value: 14, color: 'var(--accent)' },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <div className="tiny muted" style={{ marginBottom: 8 }}>Recommended mix</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span>{row.name}</span>
              <span className="tabular">{row.value}%</span>
            </div>
            <StaticProgress value={row.value} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {fields.map((field, index) => (
        <Link
          key={field.name}
          href="/farmer/field/field-demo"
          className="farmer-dashboard-field-row"
          style={{
            alignItems: 'center',
            padding: '14px 0',
            borderBottom: index < fields.length - 1 ? '1px solid var(--line)' : 'none',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{field.name}</div>
            <div className="tiny muted" style={{ marginTop: 2 }}>{field.crop}</div>
          </div>
          <div>
            <div className="tiny muted" style={{ marginBottom: 5 }}>Soil moisture</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px', alignItems: 'center', gap: 8 }}>
              <StaticProgress value={field.moisture} color={field.bar} />
              <span className="tabular small" style={{ fontWeight: 700 }}>{field.moisture}%</span>
            </div>
          </div>
          <Chip kind={field.valveKind}>{field.valve}</Chip>
          <Chip kind={field.healthKind}>{field.health}</Chip>
          <Icon name="arrow" size={14} color="var(--muted)" />
        </Link>
      ))}
    </div>
  );
}

function WaterContributionChart() {
  const max = Math.max(...waterBars.map((bars) => bars.reduce((sum, value) => sum + value, 0)));
  return (
    <div className="farmer-dashboard-chart" style={{ gridTemplateColumns: `repeat(${waterBars.length}, minmax(10px, 1fr))` }}>
      {waterBars.map((bars, index) => {
        const total = bars.reduce((sum, value) => sum + value, 0);
        return (
          <div key={index} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: `${Math.max(16, (total / max) * 112)}px`, display: 'flex', flexDirection: 'column-reverse', borderRadius: 3, overflow: 'hidden' }}>
              <span style={{ height: `${(bars[0] / total) * 100}%`, background: 'var(--primary)' }} />
              <span style={{ height: `${(bars[1] / total) * 100}%`, background: 'var(--secondary)' }} />
              <span style={{ height: `${(bars[2] / total) * 100}%`, background: 'var(--accent)' }} />
            </div>
            {[0, 5, 10, 15, 20, 25].includes(index) ? <span className="tiny muted">d{index + 1}</span> : <span style={{ height: 14 }} />}
          </div>
        );
      })}
    </div>
  );
}

export function FarmerDashboardScreen() {
  return (
    <Frame
      sidebar={farmerNav}
      breadcrumb={['Farmer', 'Dashboard']}
      user="Nimal Perera"
      role="Farmer · H-04"
    >
      <div className="farmer-dashboard">
        <div className="page-head farmer-dashboard-head">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Good morning, Nimal · 5:48 AM
            </div>
            <div className="page-title" style={{ fontSize: 22 }}>Today's plan for Mahaweli H-04</div>
            <div className="page-sub">3 fields · Maha season · Day 42 of 120 · Paddy growth stage: Tillering</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Export</button>
            <Link href="/farmer/onboarding" className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> New field</Link>
          </div>
        </div>

        <div className="farmer-dashboard-alert">
          <Icon name="bell" size={15} color="#B27500" />
          <div>
            <div style={{ fontWeight: 700, color: '#8A5A00' }}>Reservoir release scheduled: Tuesday 5:00 AM – 11:00 AM</div>
            <div className="tiny" style={{ color: '#8A5A00' }}>Ulhitiya will release 42 mm across H-04. Adjust your manual requests by Monday 6 PM.</div>
          </div>
          <div className="farmer-dashboard-alert-actions">
            <button className="btn btn-ghost btn-sm" style={{ background: 'rgba(255,255,255,0.55)' }}>Details</button>
            <button className="btn btn-ghost btn-sm" style={{ width: 28, padding: 0, borderColor: 'transparent', color: '#B27500' }}><Icon name="x" size={13}/></button>
          </div>
        </div>

        <div className="farmer-dashboard-kpi-grid">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Water budget</div>
                <div className="tiny muted">Maha 2025 · 120-day quota</div>
              </div>
              <Chip kind="warn">Caution</Chip>
            </div>
            <div className="farmer-dashboard-water-body">
              <Gauge value={62} size={128} stroke={12} color="var(--accent)" label="62%" sub="of quota used" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><div className="tiny muted">Quota</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800 }}>980 mm</div></div>
                <div><div className="tiny muted">Used · day 42</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>607 mm</div></div>
                <div><div className="tiny muted">Remaining</div><div className="tabular" style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>373 mm</div></div>
              </div>
            </div>
            <div className="divider" style={{ margin: '14px 0 10px' }} />
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Projected run-out: <b style={{ color: 'var(--text)' }}>day 108</b> — 12 days short of harvest. Switch H-07 to Plan B.</div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Weather · Thalawa</div>
              <Chip kind="live">Live · 6m ago</Chip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Icon name="cloud" size={42} color="var(--secondary)" />
              <div>
                <div className="tabular" style={{ fontSize: 30, fontWeight: 800 }}>28.4°C</div>
                <div className="tiny muted">Partly cloudy · Humidity 74%</div>
              </div>
            </div>
            <ForecastBars />
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Quick scenario</div>
              <Chip kind="sim" dot={false}>Simulated</Chip>
            </div>
            <div className="tiny muted">If your available water were...</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
              <div className="tabular" style={{ fontSize: 24, fontWeight: 800 }}>420 mm</div>
              <div className="tiny muted">· 43% of quota</div>
            </div>
            <div style={{ marginTop: 10 }}><StaticSlider value={43} /></div>
            <div className="divider" style={{ margin: '14px 0 10px' }} />
            <CropMix />
          </div>
        </div>

        <div className="farmer-dashboard-main-grid">
          <div className="card" style={{ minHeight: 304 }}>
            <div className="card-head">
              <div className="card-title">Fields</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm">All (3)</button>
                <button className="btn btn-ghost btn-sm">Active valves (1)</button>
              </div>
            </div>
            <FieldRows />
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Adaptive simulation</div>
              <Chip kind="info" dot={false}>ACA-O</Chip>
            </div>
            <div className="tiny muted">Tune your priority → see projected outcome</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
              {[
                ['Risk tolerance', 40],
                ['Yield weight', 65],
                ['Price weight', 50],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span className="small muted">{label}</span>
                    <span className="small tabular" style={{ fontWeight: 700 }}>{value}%</span>
                  </div>
                  <StaticSlider value={value} />
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: '14px 0 10px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="metric-label">Projected yield</div>
                <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>4.6 <span style={{ fontSize: 11 }}>t/ha</span></div>
                <div className="metric-delta up" style={{ marginTop: 5 }}>↑ 12% vs baseline</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div className="metric-label">Projected profit</div>
                <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>LKR 284k</div>
                <div className="metric-delta up" style={{ marginTop: 5 }}>↑ 18%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14, paddingBottom: 10 }}>
          <div className="card-head">
            <div className="card-title">Water contribution by crop · last 30 days</div>
            <div style={{ display: 'flex', gap: 9, fontSize: 11.5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--primary)' }} />Paddy</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--secondary)' }} />Chili</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />Groundnut</span>
            </div>
          </div>
          <WaterContributionChart />
        </div>
      </div>
    </Frame>
  );
}

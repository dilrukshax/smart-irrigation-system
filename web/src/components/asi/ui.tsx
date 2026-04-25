/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { logout } from '@/lib/auth';

/* Shared components for Adaptive Smart Irrigation UI */

// ——— Icons (inline SVG, 16x16 default) ———
const Icon: any = ({ name, size = 16, stroke = 1.8, color = 'currentColor', style = undefined }: any) => {
  const paths = {
    home: <><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V10z"/></>,
    droplet: <><path d="M12 3s6 7 6 12a6 6 0 11-12 0c0-5 6-12 6-12z"/></>,
    leaf: <><path d="M21 3s-2 9-9 13-9 4-9 4 1-9 7-14 11-3 11-3z"/><path d="M3 20s4-4 9-8"/></>,
    cloud: <><path d="M6 18a4 4 0 110-8 6 6 0 0112-1 4 4 0 01.5 8H6z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
    map: <><path d="M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3V6z"/><path d="M8 3v15M16 6v15"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
    users: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><path d="M16 4a4 4 0 010 8M22 21a7 7 0 00-5-6.7"/></>,
    bell: <><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21a2 2 0 004 0"/></>,
    chart: <><path d="M3 20V4M3 20h18M7 16v-4M12 16V8M17 16v-6"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3 1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <><path d="M5 12l5 5L20 7"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    up: <><path d="M6 15l6-6 6 6"/></>,
    down: <><path d="M6 9l6 6 6-6"/></>,
    more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    valve: <><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    flash: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    shield: <><path d="M12 2l9 3v7c0 5-4 9-9 10-5-1-9-5-9-10V5l9-3z"/></>,
    upload: <><path d="M12 3v13M6 9l6-6 6 6M4 21h16"/></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>,
    play: <><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none"/></>,
    pause: <><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></>,
    filter: <><path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/></>,
    download: <><path d="M12 3v13M6 11l6 6 6-6M4 21h16"/></>,
    edit: <><path d="M3 21h4l11-11-4-4L3 17v4z"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
    eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    wifi: <><path d="M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01"/></>,
    mountain: <><path d="M3 20l6-11 4 6 3-4 5 9H3z"/></>,
    handshake: <><path d="M12 14l-3 3-3-3 3-3 3 3zM12 14l5-5 4 4-5 5M9 11L5 7 2 10l4 4"/></>,
    thermo: <><path d="M10 14V5a2 2 0 114 0v9a4 4 0 11-4 0z"/></>,
    humidity: <><path d="M12 4s5 6 5 10a5 5 0 11-10 0c0-4 5-10 5-10z"/></>,
    wave: <><path d="M3 12c3-3 6-3 9 0s6 3 9 0M3 18c3-3 6-3 9 0s6 3 9 0"/></>,
    qr: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M20 14v3M14 20h7"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 010 18A13 13 0 0112 3z"/></>,
    shield_check: <><path d="M12 2l9 3v7c0 5-4 9-9 10-5-1-9-5-9-10V5l9-3z"/><path d="M8 12l3 3 5-6"/></>,
    logout: <><path d="M15 12H3M8 7l-5 5 5 5M21 3v18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || null}
    </svg>
  );
};

const LogoMark: any = ({ size = 28 }) => (
  <div className="logo-mark" style={{ width: size, height: size }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
      <path d="M12 3s6 6 6 12a6 6 0 11-12 0c0-6 6-12 6-12z" fill="white" opacity="0.95"/>
      <path d="M9 14a3 3 0 006 0" stroke="#2E7D32" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  </div>
);

const Logo: any = ({ mark = true }) => (
  <div className="logo">
    {mark && <LogoMark />}
    <span>HarvestPulse</span>
  </div>
);

// ——— AppBar ———
const AppBar: any = ({ breadcrumb = [], user = 'Nimal P.', role = 'Farmer', notifCount = 3 }) => (
  <div className="appbar">
    <Logo />
    <div className="breadcrumb">
      {breadcrumb.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
          <span style={i === breadcrumb.length - 1 ? { color: 'var(--text)', fontWeight: 500 } : null}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="appbar-right">
      <div className="chip sim" style={{ fontSize: 10.5 }}>
        <span className="chip-dot"/> Maha 2025 · Mahaweli H
      </div>
      <div className="bell">
        <Icon name="bell" size={16}/>
        {notifCount > 0 && <span className="bell-dot">{notifCount}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="avatar">{user.split(' ').map(w => w[0]).join('')}</div>
        <div style={{ fontSize: 12, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600 }}>{user}</div>
          <div style={{ color: 'var(--muted)', fontSize: 10.5 }}>{role}</div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
      >
        <Icon name="logout" size={13}/>
        Logout
      </button>
    </div>
  </div>
);

// ——— Sidebar ———
const NAV_ROUTE_MAP: Record<string, string> = {
  Dashboard: '/farmer',
  'My Fields': '/farmer/fields',
  Irrigation: '/irrigation',
  'Crop Health': '/crop-health',
  Forecast: '/forecasting',
  Forecasting: '/forecasting',
  Optimization: '/optimization',
  Scenarios: '/optimization/scenarios',
  Onboarding: '/farmer/onboarding',
  Overview: '/operations',
  'Manual Requests': '/operations/requests',
  Hydraulics: '/operations/hydraulics',
  'Water Management': '/irrigation/water',
  'Sensor Telemetry': '/irrigation/telemetry',
  Recommendations: '/optimization/recommendations',
  Planner: '/optimization/planner',
  'Adaptive Tuning': '/optimization/adaptive',
  'User Management': '/authority/users',
  'Policies & Quotas': '/authority/policies',
};

const Sidebar: any = ({ items, footer }) => (
  <div className="sidebar">
    {items.map((g, gi) => (
      <React.Fragment key={gi}>
        {g.label && <div className="nav-section">{g.label}</div>}
        {g.items.map((it, i) => (
          <Link
            key={i}
            href={it.href || NAV_ROUTE_MAP[it.name] || '#'}
            className={'nav-item' + (it.active ? ' active' : '')}
          >
            <span className="ico"><Icon name={it.icon} size={16}/></span>
            {it.name}
            {it.badge && <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--accent)', color: '#3A2900', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>{it.badge}</span>}
          </Link>
        ))}
      </React.Fragment>
    ))}
    {footer && <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>{footer}</div>}
  </div>
);

// ——— Status chip shortcut ———
const Chip: any = ({ kind = 'live', children, dot = true }) => (
  <span className={`chip ${kind}`}>
    {dot && <span className="chip-dot"/>}
    {children}
  </span>
);

// ——— Progress bar with label ———
const Progress: any = ({ value, max = 100, color, label, size = 'md' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {label && (
      <div className="between" style={{ fontSize: 11, color: 'var(--muted)' }}>
        <span>{label}</span>
        <span className="tabular" style={{ color: 'var(--text)', fontWeight: 600 }}>{Math.round((value/max)*100)}%</span>
      </div>
    )}
    <div className={'prog' + (size === 'sm' ? ' slim' : '')}>
      <div className="prog-fill" style={{ width: `${Math.min(100, (value/max)*100)}%`, background: color || 'var(--primary)' }}/>
    </div>
  </div>
);

// ——— Circular gauge (SVG) ———
const Gauge: any = ({ value, max = 100, size = 140, stroke = 12, color = 'var(--primary)', label, sub, track = '#EFF3EC' }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, letterSpacing: '-0.02em' }} className="tabular">{label ?? `${Math.round(pct*100)}%`}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

// ——— Sparkline ———
const Sparkline: any = ({ data, width = 80, height = 28, color = 'var(--primary)', fill = true }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [i * (width / (data.length - 1)), height - ((v - min) / range) * height * 0.9 - height * 0.05]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.1"/>}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
};

// ——— Line chart ———
const LineChart: any = ({ series, width = 560, height = 200, yLabel, xLabels, legend, showBand }) => {
  const all = series.flatMap(s => s.data);
  const min = Math.min(...all, 0), max = Math.max(...all) * 1.1;
  const range = max - min || 1;
  const pad = { l: 32, r: 12, t: 8, b: 22 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  const px = i => pad.l + i * (w / (series[0].data.length - 1));
  const py = v => pad.t + h - ((v - min) / range) * h;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div>
      {legend && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 6, fontSize: 11 }}>
          {series.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: s.color, borderRadius: 2 }}/>
              <span style={{ color: 'var(--muted)' }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <svg width={width} height={height} style={{ display: 'block' }}>
        {grid.map((g, i) => {
          const y = pad.t + h - g * h;
          const v = (min + range * g).toFixed(0);
          return (
            <g key={i}>
              <line x1={pad.l} x2={pad.l + w} y1={y} y2={y} stroke="#EFF3EC"/>
              <text x={pad.l - 6} y={y + 3} fontSize="10" fill="#8A958A" textAnchor="end" className="tabular">{v}</text>
            </g>
          );
        })}
        {showBand && series[0].band && (() => {
          const up = series[0].band.map((v, i) => `${px(i)},${py(v[1])}`).join(' ');
          const lo = series[0].band.map((v, i) => `${px(i)},${py(v[0])}`).reverse().join(' ');
          return <polygon points={up + ' ' + lo} fill={series[0].color} opacity="0.12"/>;
        })()}
        {series.map((s, i) => {
          const path = s.data.map((v, i2) => (i2 ? 'L' : 'M') + px(i2) + ' ' + py(v)).join(' ');
          return <g key={i}>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round"/>
            {s.data.map((v, i2) => (
              <circle key={i2} cx={px(i2)} cy={py(v)} r={2.5} fill={s.color}/>
            ))}
          </g>;
        })}
        {xLabels && xLabels.map((l, i) => (
          <text key={i} x={px(i)} y={height - 6} fontSize="10" fill="#8A958A" textAnchor="middle">{l}</text>
        ))}
      </svg>
    </div>
  );
};

// ——— Bar chart ———
const BarChart: any = ({ data, width = 560, height = 180, color = 'var(--primary)', labels, stacked }) => {
  const pad = { l: 32, r: 10, t: 8, b: 22 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  if (stacked) {
    const totals = data[0].map((_, i) => data.reduce((a, d) => a + d[i], 0));
    const max = Math.max(...totals) * 1.1;
    const bw = w / data[0].length * 0.65;
    const gap = w / data[0].length;
    return (
      <svg width={width} height={height}>
        {data[0].map((_, i) => {
          let y = pad.t + h;
          return (
            <g key={i} transform={`translate(${pad.l + i * gap + gap/2 - bw/2}, 0)`}>
              {data.map((d, di) => {
                const val = d[i];
                const bh = (val / max) * h;
                y -= bh;
                return <rect key={di} x="0" y={y} width={bw} height={bh} fill={color[di] || color} rx="2"/>;
              })}
            </g>
          );
        })}
        {labels && labels.map((l, i) => (
          <text key={i} x={pad.l + i * gap + gap/2} y={height - 6} fontSize="10" fill="#8A958A" textAnchor="middle">{l}</text>
        ))}
      </svg>
    );
  }
  const max = Math.max(...data) * 1.1;
  const bw = w / data.length * 0.7;
  const gap = w / data.length;
  return (
    <svg width={width} height={height}>
      {[0, 0.5, 1].map((g, i) => {
        const y = pad.t + h - g * h;
        return <line key={i} x1={pad.l} x2={pad.l + w} y1={y} y2={y} stroke="#EFF3EC"/>;
      })}
      {data.map((v, i) => {
        const bh = (v / max) * h;
        return <rect key={i} x={pad.l + i * gap + gap/2 - bw/2} y={pad.t + h - bh} width={bw} height={bh} fill={color} rx="3"/>;
      })}
      {labels && labels.map((l, i) => (
        <text key={i} x={pad.l + i * gap + gap/2} y={height - 6} fontSize="10" fill="#8A958A" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
};

// ——— Area / dual-axis forecast chart ———
const ForecastChart: any = ({ width = 640, height = 220, days = 14 }) => {
  const pad = { l: 36, r: 42, t: 10, b: 24 };
  const w = width - pad.l - pad.r, h = height - pad.t - pad.b;
  // Fake data
  const baseline = Array.from({length: days}, (_, i) => 70 - i * 1.6 + Math.sin(i*0.8)*3);
  const upper = baseline.map(v => v + 6 + Math.random()*2);
  const lower = baseline.map(v => v - 6 - Math.random()*2);
  const rain = [2,5,0,1,8,12,4,0,0,2,6,9,3,1].slice(0, days);
  const maxR = 15;
  const px = i => pad.l + i * (w / (days - 1));
  const py = v => pad.t + h - (v / 100) * h;
  const pyR = v => pad.t + h - (v / maxR) * h * 0.6;

  const linePath = baseline.map((v, i) => (i ? 'L' : 'M') + px(i) + ' ' + py(v)).join(' ');
  const bandU = upper.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const bandL = lower.map((v, i) => `${px(i)},${py(v)}`).reverse().join(' ');

  return (
    <svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const y = pad.t + h - g * h;
        return <g key={i}>
          <line x1={pad.l} x2={pad.l + w} y1={y} y2={y} stroke="#EFF3EC"/>
          <text x={pad.l - 6} y={y + 3} fontSize="10" fill="#8A958A" textAnchor="end">{Math.round(g*100)}%</text>
        </g>;
      })}
      {rain.map((v, i) => {
        const bh = (v / maxR) * h * 0.6;
        return <rect key={i} x={px(i) - 6} y={pad.t + h - bh} width="12" height={bh} fill="var(--secondary)" opacity="0.25" rx="2"/>;
      })}
      <polygon points={bandU + ' ' + bandL} fill="var(--primary)" opacity="0.14"/>
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round"/>
      {baseline.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="2.5" fill="var(--primary)"/>)}
      {Array.from({length: days}, (_, i) => (
        <text key={i} x={px(i)} y={height - 6} fontSize="9.5" fill="#8A958A" textAnchor="middle">D{i+1}</text>
      ))}
      <text x={width - pad.r + 6} y={pad.t + 8} fontSize="10" fill="var(--secondary)" fontWeight="600">mm</text>
      <text x={pad.l - 26} y={pad.t + 8} fontSize="10" fill="var(--primary-600)" fontWeight="600">%</text>
    </svg>
  );
};

// ——— Donut ———
const Donut: any = ({ segments, size = 130, stroke = 20, center }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r} stroke={s.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc * c}/>
          );
          acc += frac;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {center}
      </div>
    </div>
  );
};

// ——— Leaflet-style map with zones/markers ———
const SchemeMap: any = ({ height = 260, zones = [], markers = [], hasControls = true }) => (
  <div className="map" style={{ height, width: '100%' }}>
    {/* simulated terrain */}
    <svg viewBox="0 0 400 260" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <path d="M0,180 Q80,150 160,170 T320,160 T400,150 L400,260 L0,260 Z" fill="#C8E6C9" opacity="0.4"/>
      <path d="M0,100 Q60,90 140,110 T280,95 T400,105 L400,180 L0,180 Z" fill="#A5D6A7" opacity="0.3"/>
      <path d="M20,220 Q100,200 200,215 T380,210" stroke="#0288D1" strokeWidth="2.5" fill="none" opacity="0.5"/>
      <path d="M80,40 Q160,60 240,40 T380,70" stroke="#0288D1" strokeWidth="1.5" fill="none" opacity="0.3"/>
    </svg>
    {zones.map((z, i) => (
      <div key={i} style={{
        position: 'absolute', left: z.x + '%', top: z.y + '%',
        width: z.w + '%', height: z.h + '%',
        background: z.color, opacity: 0.45, borderRadius: z.r || 12,
        border: `1.5px solid ${z.stroke || z.color}`,
      }}>
        <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, fontWeight: 700, color: '#1B1B1B' }}>{z.label}</div>
      </div>
    ))}
    {markers.map((m, i) => (
      <div key={i} style={{
        position: 'absolute', left: m.x + '%', top: m.y + '%',
        width: 18, height: 18, marginLeft: -9, marginTop: -18,
      }}>
        <svg viewBox="0 0 24 32" width="18" height="24">
          <path d="M12 0 C5 0 0 5 0 12 C0 20 12 32 12 32 S24 20 24 12 C24 5 19 0 12 0 Z" fill={m.color || 'var(--primary)'}/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
    ))}
    {hasControls && (
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="btn btn-ghost btn-sm" style={{ background: 'white', width: 28, height: 28, padding: 0 }}>+</button>
        <button className="btn btn-ghost btn-sm" style={{ background: 'white', width: 28, height: 28, padding: 0 }}>−</button>
      </div>
    )}
    {hasControls && (
      <div style={{ position: 'absolute', top: 8, left: 8, background: 'white', borderRadius: 6, padding: '4px 6px', fontSize: 10, fontWeight: 600, display: 'flex', gap: 4, border: '1px solid var(--border)' }}>
        <span style={{ padding: '2px 6px', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: 4 }}>Satellite</span>
        <span style={{ padding: '2px 6px', color: 'var(--muted)' }}>Terrain</span>
      </div>
    )}
    <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'white', borderRadius: 6, padding: '6px 8px', fontSize: 10, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#66BB6A', borderRadius: 2 }}/>Healthy</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#F9A825', borderRadius: 2 }}/>Stressed</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#C62828', borderRadius: 2 }}/>Critical</span>
      </div>
    </div>
  </div>
);

// ——— Full screen frame ———
const Frame: any = ({ sidebar, appbar = true, breadcrumb, user, role, children, noPad, width = '100%' }) => (
  <div className="asi-root" style={{ width, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
    {appbar && <AppBar breadcrumb={breadcrumb} user={user} role={role}/>}
    <div className="shell" style={{ gridTemplateColumns: sidebar ? '220px 1fr' : '1fr', flex: 1, minHeight: 0 }}>
      {sidebar && <Sidebar items={sidebar}/>}
      <div className="main" style={noPad ? { padding: 0, overflow: 'auto' } : { overflow: 'auto' }}>
        {children}
      </div>
    </div>
  </div>
);

/* Shared sidebar navs for different roles/modules */

export {
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
};

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import Link from 'next/link';
import { PublicTop } from '@/components/asi/public-top';

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const IconDroplet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3s6 6 6 12a6 6 0 11-12 0c0-6 6-12 6-12z"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 3v7c0 5-4 9-9 10-5-1-9-5-9-10V5l9-3z"/>
    <path d="M8 12l3 3 5-6"/>
  </svg>
);
const IconCloud = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 18a4 4 0 000-8 6 6 0 00-11.7 1.7A4 4 0 006 18z"/>
  </svg>
);
const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  </svg>
);

/* ─── Hero ───────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="pt-16 pb-9">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid items-center gap-14" style={{ gridTemplateColumns: '1.05fr 1fr' }}>

          {/* LEFT */}
          <div>
            <span className="inline-flex items-center gap-2 bg-white border border-[var(--border)] rounded-full py-[5px] px-3 text-[11px] font-semibold tracking-[0.04em] text-[var(--primary-600)]">
              <span className="w-[7px] h-[7px] rounded-full bg-[var(--primary)]" style={{ boxShadow: '0 0 0 4px rgba(46,125,50,0.15)' }} />
              RESEARCH BUILD
              <span className="text-[#C2CABF]">·</span>
              MAHAWELI DEV. AUTHORITY
              <span className="text-[#C2CABF]">·</span>
              2025–26
            </span>

            <h1 className="font-serif font-medium mt-[22px] leading-none tracking-[-0.035em]" style={{ fontSize: 64 }}>
              Smart irrigation.<br />
              <em className="not-italic text-[var(--primary)]">Smarter</em> harvests.
            </h1>

            <p className="text-[16px] leading-[1.55] text-[var(--ink-soft)] mt-5 max-w-[520px]">
              HarvestPulse is an adaptive decision platform for Sri Lankan paddy schemes. Four coupled modules — sensing, crop health, forecasting, and optimization — guide every millimetre of water from reservoir to root.
            </p>

            <div className="flex gap-2.5 mt-7 items-center flex-wrap">
              <Link href="/login" className="btn btn-primary" style={{ height: 46, padding: '0 20px', fontSize: 14 }}>
                Farmer login →
              </Link>
              <Link href="/operations" className="btn btn-ghost" style={{ height: 46, padding: '0 20px', fontSize: 14 }}>
                Officer login
              </Link>
              <Link href="/farmer" className="ml-1 text-[13.5px] font-semibold text-[var(--primary-600)]">
                Explore the dashboard →
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-[18px] mt-10 pt-[26px] border-t border-[var(--border)]">
              {[
                ['1,284', 'Fields monitored'],
                ['32%', 'Water saved vs. baseline'],
                ['0.86', 'Mean crop health (NDVI)'],
                ['91%', '14-day forecast accuracy'],
              ].map(([num, label]) => (
                <div key={label}>
                  <div className="font-serif font-medium leading-none tracking-[-0.02em] tabular-nums" style={{ fontSize: 28 }}>{num}</div>
                  <div className="text-[11.5px] text-[var(--muted)] mt-1.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — hero preview card */}
          <div
            className="relative rounded-2xl border border-[var(--border)] p-[22px]"
            style={{
              background: 'radial-gradient(circle at 25% 18%, rgba(46,125,50,0.16) 0%, transparent 45%), radial-gradient(circle at 78% 82%, rgba(2,136,209,0.16) 0%, transparent 45%), linear-gradient(135deg, #EEF7E5 0%, #E1F2FA 100%)',
              boxShadow: '0 30px 60px -28px rgba(28,52,32,0.22), 0 12px 24px -12px rgba(28,52,32,0.12)',
            }}
          >
            <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-[var(--muted)]" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span className="flex items-center gap-1.5" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                <span className="inline-block w-[7px] h-[7px] rounded-full bg-[var(--primary)]" style={{ animation: 'pulse-dot 2.4s infinite' }} />
                Mahaweli H-04 · live
              </span>
              <span className="font-mono" style={{ textTransform: 'none', letterSpacing: 'normal' }}>04:18 · ↻ 2 min ago</span>
            </div>

            {/* Scheme map */}
            <div
              className="relative rounded-[10px] overflow-hidden"
              style={{
                height: 260,
                border: '1px solid rgba(255,255,255,0.6)',
                background: 'radial-gradient(ellipse at 30% 40%, rgba(46,125,50,0.18) 0%, transparent 40%), radial-gradient(ellipse at 70% 60%, rgba(2,136,209,0.18) 0%, transparent 42%), linear-gradient(135deg, #E8F5E9 0%, #DCEDC8 40%, #E3F2FD 100%)',
              }}
            >
              {/* Grid overlay */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }} />
              {/* Zones */}
              <div className="absolute rounded-[6px] flex items-end p-2 text-[10px] font-semibold text-white" style={{ left:'8%', top:'12%', width:'32%', height:'30%', background:'linear-gradient(135deg,#66BB6A,#388E3C)', border:'1.5px solid #2E7D32', textShadow:'0 1px 2px rgba(0,0,0,0.25)' }}>H-04 · Paddy</div>
              <div className="absolute rounded-[6px] flex items-end p-2 text-[10px] font-semibold text-white" style={{ left:'44%', top:'20%', width:'26%', height:'24%', background:'linear-gradient(135deg,#FFB74D,#F9A825)', border:'1.5px solid #B27500', textShadow:'0 1px 2px rgba(0,0,0,0.25)' }}>H-05 · Maize</div>
              <div className="absolute rounded-[6px] flex items-end p-2 text-[10px] font-semibold text-white" style={{ left:'14%', top:'50%', width:'38%', height:'28%', background:'linear-gradient(135deg,#81C784,#4CAF50)', border:'1.5px solid #2E7D32', textShadow:'0 1px 2px rgba(0,0,0,0.25)' }}>H-06 · Paddy</div>
              <div className="absolute rounded-[6px] flex items-end p-2 text-[10px] font-semibold text-white" style={{ left:'58%', top:'54%', width:'30%', height:'26%', background:'linear-gradient(135deg,#EF9A9A,#E57373)', border:'1.5px solid #C62828', textShadow:'0 1px 2px rgba(0,0,0,0.25)' }}>H-07 · Chili</div>
              {/* Canal */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 8 Q 30 8 35 30 T 60 50 Q 80 60 100 60" stroke="rgba(2,136,209,0.55)" strokeWidth="1" fill="none" strokeDasharray="2 2"/>
              </svg>
              {/* Markers */}
              <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ left:'24%', top:'24%', background:'var(--primary)', transform:'translate(-50%,-50%)' }} />
              <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ left:'58%', top:'30%', background:'var(--accent)', transform:'translate(-50%,-50%)' }} />
              <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ left:'34%', top:'64%', background:'var(--primary)', transform:'translate(-50%,-50%)' }} />
              <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ left:'70%', top:'66%', background:'var(--danger)', transform:'translate(-50%,-50%)' }} />
            </div>

            {/* Preview mini-cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-3.5">
              <div className="bg-white rounded-[10px] p-3 shadow-[0_1px_0_rgba(28,52,32,0.04)]" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
                <div className="text-[10.5px] text-[var(--muted)] uppercase tracking-[0.03em] font-semibold">Reservoir · Ulhitiya</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <div className="font-serif font-medium leading-none tracking-[-0.02em] tabular-nums" style={{ fontSize: 24 }}>68%</div>
                  <span className="chip live">On track</span>
                </div>
                <svg width="100%" height="22" viewBox="0 0 100 22" className="mt-1">
                  <path d="M 0 14 L 14 12 L 28 13 L 42 9 L 56 10 L 70 6 L 84 7 L 100 4" fill="none" stroke="#2E7D32" strokeWidth="1.5"/>
                  <path d="M 0 14 L 14 12 L 28 13 L 42 9 L 56 10 L 70 6 L 84 7 L 100 4 L 100 22 L 0 22 Z" fill="#2E7D32" opacity="0.12"/>
                </svg>
              </div>
              <div className="bg-white rounded-[10px] p-3 shadow-[0_1px_0_rgba(28,52,32,0.04)]" style={{ border: '1px solid rgba(255,255,255,0.6)' }}>
                <div className="text-[10.5px] text-[var(--muted)] uppercase tracking-[0.03em] font-semibold">Active alerts</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <div className="font-serif font-medium leading-none tracking-[-0.02em] tabular-nums" style={{ fontSize: 24 }}>3</div>
                  <span className="chip warn">2 drought risk</span>
                </div>
                <div className="font-mono text-[10.5px] text-[var(--muted)] mt-1.5">H-07 moisture &lt; threshold · 02:14</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Logo Strip ─────────────────────────────────────────────────────────── */

function LogoStrip() {
  const orgs = [
    '⌬ Mahaweli Authority',
    '◐ Dept. of Agriculture',
    '⌥ Univ. of Peradeniya',
    '◇ ICRISAT',
    '⊕ Met Department',
    '★ NSF Sri Lanka',
  ];
  return (
    <div className="border-t border-b border-[var(--border)] py-7 mt-[60px]" style={{ background: '#F8FAF5' }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="flex items-center gap-8 justify-between flex-wrap">
          <div className="text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] font-semibold shrink-0 border-r border-[var(--border)] pr-8">
            Built with &amp;<br />deployed at
          </div>
          <div className="flex gap-8 items-center flex-1 justify-between flex-wrap font-serif font-medium text-[#6E7B6C] tracking-[-0.01em]" style={{ fontSize: 16 }}>
            {orgs.map(o => <span key={o} className="opacity-85">{o}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modules ────────────────────────────────────────────────────────────── */

const MODULES = [
  {
    tag: 'F1 · Irrigation',
    icon: <IconDroplet />,
    color: '#0288D1',
    title: 'Soil to valve, in one closed loop.',
    desc: 'Capacitive moisture probes report every 5 minutes; valve actuation is automated against per-field water budgets and quota limits.',
    bullets: [
      'Per-field water budgets with seasonal carry-over',
      'Manual override with reason codes for audit',
      'SCADA-style valve scheduler & canal balancing',
    ],
  },
  {
    tag: 'F2 · Crop Health',
    icon: <IconShield />,
    color: '#2E7D32',
    title: 'NDVI zones, disease scans, stress alerts.',
    desc: "Sentinel-2 zonal NDVI is fused with farmer-uploaded leaf scans. Severity scoring escalates incidents through the scheme's officer queue.",
    bullets: [
      'Phone-camera detection: blast, leaf blight, brown spot',
      'Stress index reconciled with moisture telemetry',
      'Treatment playbooks in EN / සිංහල / தமிழ்',
    ],
  },
  {
    tag: 'F3 · Forecasting',
    icon: <IconCloud />,
    color: '#7B1FA2',
    title: '14-day ensemble. P10 / P50 / P90 risk bands.',
    desc: 'A bias-corrected ensemble blends Met Dept. WRF runs with ECMWF and local rain-gauge data. Reservoir inflow nowcasts inform release decisions.',
    bullets: [
      'Calibrated drought / flood probabilities at scheme level',
      'Reservoir storage projections, 7 / 14 / 30 day',
      'Skill score reported every cycle, openly logged',
    ],
  },
  {
    tag: 'F4 · ACA-O',
    icon: <IconTarget />,
    color: '#F9A825',
    iconTextColor: '#3A2900',
    title: 'Adaptive crop allocation & optimization.',
    desc: 'A constrained optimizer recommends a crop mix that maximizes expected profit subject to water quota, soil suitability, and price-forecast risk.',
    bullets: [
      'Counter-factual scenarios: drought, flood, price shock',
      'Per-farmer recommendations & scheme-level rollups',
      'Adaptive tuning from realized yield each season',
    ],
  },
];

function ModulesSection() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="max-w-[760px] mb-9">
          <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">Four coupled modules</div>
          <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.028em]" style={{ fontSize: 40 }}>An end-to-end decision loop, from sensor to scheme.</h2>
          <p className="text-[16px] text-[var(--ink-soft)] mt-3.5 max-w-[620px] leading-relaxed">
            Each module is independently useful, but the value compounds when they share state. A moisture reading in the field changes the optimizer's recommendation; a forecast revision changes the irrigation schedule.
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-[14px] overflow-hidden bg-white border border-[var(--border)]">
          {MODULES.map((m, i) => (
            <article
              key={m.tag}
              className="p-7"
              style={{
                borderRight: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                  style={{ background: m.color, color: m.iconTextColor || 'white' }}
                >
                  {m.icon}
                </div>
                <span className="font-mono text-[11px] text-[var(--muted)] bg-[#F2F5EE] px-2 py-[3px] rounded">{m.tag}</span>
              </div>
              <h3 className="font-serif font-medium mt-4 tracking-[-0.02em]" style={{ fontSize: 24 }}>{m.title}</h3>
              <p className="text-[14px] text-[var(--ink-soft)] mt-2 max-w-[440px]">{m.desc}</p>
              <ul className="mt-[18px] flex flex-col gap-[7px]">
                {m.bullets.map(b => (
                  <li key={b} className="flex gap-2 items-baseline text-[13px] text-[var(--ink-soft)]">
                    <span className="w-[5px] h-[5px] rounded-full bg-[var(--primary)] shrink-0" style={{ marginTop: 5 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Decision Loop ──────────────────────────────────────────────────────── */

const LOOP_STEPS = [
  {
    num: '01 — SENSE',
    title: 'Soil, sky, satellite.',
    desc: 'Capacitive probes, rain gauges, Sentinel-2 NDVI tiles, and farmer leaf scans flow into the time-series store at 5-minute granularity.',
    meta: '~14M readings / month',
  },
  {
    num: '02 — FORECAST',
    title: 'Ensemble & bias-correct.',
    desc: '14-day rain & reservoir-inflow ensembles are bias-corrected against scheme-local stations, producing P10/P50/P90 bands for each block.',
    meta: 'CRPS 1.8 mm/day · 14d',
  },
  {
    num: '03 — DECIDE',
    title: 'ACA-O resolves the plan.',
    desc: 'A constrained optimizer balances yield, profit, and water quota, then dispatches valve schedules & advisory SMS to farmers.',
    meta: 'Pareto front, refresh 6h',
  },
  {
    num: '04 — LEARN',
    title: 'Posterior update each cycle.',
    desc: 'Realized moisture, harvest weights and weather are reconciled against predictions; coefficients are re-fit per scheme each season.',
    meta: '98% reproducible runs',
  },
];

function DecisionLoopSection() {
  return (
    <section className="py-20 border-t border-b border-[var(--border)]" style={{ background: 'var(--bg-warm)' }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="max-w-[760px] mb-9">
          <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">The decision loop</div>
          <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.028em]" style={{ fontSize: 40 }}>Sense → forecast → decide → learn.</h2>
          <p className="text-[16px] text-[var(--ink-soft)] mt-3.5 max-w-[620px] leading-relaxed">
            Every irrigation decision is logged with the model state and weather assumptions that produced it. When the season closes, the optimizer's posterior is updated against realized yield.
          </p>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-[14px] p-9">
          <div className="grid grid-cols-4">
            {LOOP_STEPS.map((s, i) => (
              <div key={s.num} className="px-[18px]" style={{ borderLeft: i > 0 ? '1px dashed var(--border)' : 'none' }}>
                <div className="font-mono text-[11px] text-[var(--muted)] tracking-[0.05em]">{s.num}</div>
                <div className="font-serif font-medium mt-1.5 tracking-[-0.02em]" style={{ fontSize: 19 }}>{s.title}</div>
                <p className="text-[13px] text-[var(--ink-soft)] mt-2 leading-relaxed">{s.desc}</p>
                <div className="font-mono text-[10.5px] text-[var(--muted)] mt-3.5 pt-3 border-t border-dashed border-[var(--border)]">{s.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Dashboard Preview ──────────────────────────────────────────────────── */

function DashboardPreviewSection() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid gap-12 items-center" style={{ gridTemplateColumns: '1fr 1.1fr' }}>

          {/* Left copy */}
          <div className="pr-6">
            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">Inside the platform</div>
            <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.025em]" style={{ fontSize: 36 }}>A research-grade dashboard, daily-driver simple.</h2>
            <p className="text-[16px] text-[var(--ink-soft)] mt-3.5 leading-relaxed max-w-[620px]">
              Every screen — from the farmer's field workspace to the authority's policy console — shares one data model. Numbers don't disagree because there is one place they live.
            </p>
            <blockquote
              className="mt-6 pl-4 font-serif font-medium leading-[1.4] tracking-[-0.018em] text-[var(--text)]"
              style={{ fontSize: 22, borderLeft: '3px solid var(--primary)' }}
            >
              "We used to argue about which spreadsheet was right. Now the spreadsheet is the platform, and the spreadsheet is the field."
            </blockquote>
            <div className="mt-3.5 flex gap-2.5 items-center text-[12.5px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">D. Wijesinghe</span>
              <span>Block Manager · Mahaweli H-04 · 2025</span>
            </div>
            <div className="flex gap-2.5 mt-7">
              <Link href="/farmer" className="btn btn-dark" style={{ height: 46, padding: '0 20px', fontSize: 14 }}>Tour 23 screens →</Link>
              <button className="btn btn-ghost" style={{ height: 46, padding: '0 20px', fontSize: 14 }}>Read the spec</button>
            </div>
          </div>

          {/* Right — dashboard mock */}
          <div className="bg-white border border-[var(--border)] rounded-[14px] overflow-hidden shadow-[0_24px_60px_-28px_rgba(20,32,26,0.18)]">
            <div className="h-9 flex items-center gap-1.5 px-3 font-mono text-[11px] text-[var(--muted)] border-b border-[var(--border)]" style={{ background: '#FAFBF7' }}>
              <div className="flex gap-1.5 mr-3">
                <span className="w-[9px] h-[9px] rounded-full bg-[#E0E5DD]" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#E0E5DD]" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#E0E5DD]" />
              </div>
              harvestpulse.lk / irrigation / water-management
              <span className="ml-auto">↻</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {/* Soil moisture */}
              <div className="bg-[#FBFCF8] border border-[var(--border)] rounded-[10px] p-3">
                <div className="text-[10.5px] text-[var(--muted)] uppercase tracking-[0.04em] font-semibold">Soil moisture · H-04</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="w-14 h-14 rounded-full relative flex items-center justify-center shrink-0"
                    style={{ background: 'conic-gradient(var(--primary) 0 78%, #E8EEE4 78% 100%)' }}>
                    <div className="absolute inset-[6px] bg-white rounded-full" />
                    <span className="relative font-serif font-medium text-[14px]">78%</span>
                  </div>
                  <div>
                    <div className="font-serif font-medium leading-none tracking-[-0.02em]" style={{ fontSize: 22 }}>Optimal</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">Band 65–85% VWC</div>
                  </div>
                </div>
              </div>
              {/* Water release */}
              <div className="bg-[#FBFCF8] border border-[var(--border)] rounded-[10px] p-3">
                <div className="text-[10.5px] text-[var(--muted)] uppercase tracking-[0.04em] font-semibold">Today's water release</div>
                <div className="font-serif font-medium leading-none tracking-[-0.02em] mt-1" style={{ fontSize: 24 }}>
                  12.4<span className="text-[14px] opacity-60"> mm</span>
                </div>
                <div className="h-14 flex items-end gap-1 mt-2">
                  {[35, 55, 42, 78, 65, 88, 60, 72, 48, 30].map((h, i) => (
                    <div key={i} className="flex-1 relative rounded-t-[3px]" style={{ height: '100%', background: 'var(--primary-50)' }}>
                      <div className="absolute bottom-0 left-0 right-0 rounded-t-[3px]" style={{ height: `${h}%`, background: 'var(--primary)' }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Forecast — full width */}
              <div className="col-span-2 bg-[#FBFCF8] border border-[var(--border)] rounded-[10px] p-3">
                <div className="flex justify-between items-baseline">
                  <div className="text-[10.5px] text-[var(--muted)] uppercase tracking-[0.04em] font-semibold">14-day rainfall · P10 / P50 / P90</div>
                  <div className="font-mono text-[11px] text-[var(--muted)]">CRPS 1.8 · skill ≥ persistence ✓</div>
                </div>
                <svg className="w-full mt-2" height="90" viewBox="0 0 320 90" preserveAspectRatio="none">
                  <path d="M 0 60 L 30 55 L 60 50 L 90 30 L 120 25 L 150 35 L 180 40 L 210 28 L 240 32 L 270 22 L 300 18 L 320 24 L 320 70 L 300 64 L 270 70 L 240 72 L 210 66 L 180 76 L 150 80 L 120 74 L 90 76 L 60 80 L 30 78 L 0 82 Z" fill="#2E7D32" opacity="0.13"/>
                  <path d="M 0 70 L 30 66 L 60 64 L 90 50 L 120 48 L 150 56 L 180 58 L 210 46 L 240 50 L 270 44 L 300 40 L 320 44" fill="none" stroke="#2E7D32" strokeWidth="1.5"/>
                  <g fill="#0288D1">
                    <circle cx="0" cy="72" r="2"/><circle cx="30" cy="64" r="2"/><circle cx="60" cy="62" r="2"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Outcomes ───────────────────────────────────────────────────────────── */

const OUTCOMES = [
  { num: '−32', unit: '%', lab: 'Water released per hectare, vs. paired baseline.', meta: 'n = 412 fields · p < 0.01' },
  { num: '+11', unit: '%', lab: 'Mean yield uplift across paddy varieties.', meta: 'Bg 352 / At 362 / Bg 366' },
  { num: '−47', unit: '%', lab: 'Disease-loss incidents flagged within 48h.', meta: 'Blast, BLB, brown-spot' },
  { num: '2.4', unit: '×', lab: 'Median time-to-decision for officer water requests.', meta: 'From 14h → 5.7h' },
];

function OutcomesSection() {
  return (
    <section className="py-20 relative overflow-hidden text-white" style={{
      background: 'linear-gradient(180deg, #1B5E20 0%, #14401A 100%)',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 20% 0%, rgba(102,187,106,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(2,136,209,0.15) 0%, transparent 50%)',
      }} />
      <div className="max-w-[1200px] mx-auto px-8 relative">
        <div className="max-w-[760px] mb-9">
          <div className="text-[11px] tracking-[0.12em] uppercase font-bold" style={{ color: '#A5D6A7' }}>Outcomes (2024–25 pilot, H-04 / H-07)</div>
          <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.028em] text-white" style={{ fontSize: 40 }}>Less water. Better paddy. Audited numbers.</h2>
          <p className="text-[16px] mt-3.5 max-w-[620px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            Results from a 412-field, two-scheme pilot evaluated against a paired-baseline design. Full methodology in the technical appendix.
          </p>
        </div>
        <div className="grid grid-cols-4 mt-9 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {OUTCOMES.map((o, i) => (
            <div key={o.meta} className="py-7" style={{
              paddingRight: i < 3 ? 24 : 0,
              paddingLeft: i > 0 ? 24 : 0,
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.12)' : 'none',
            }}>
              <div className="font-serif font-medium leading-none tracking-[-0.035em] text-white tabular-nums" style={{ fontSize: 56 }}>
                {o.num}<span className="opacity-70 ml-0.5" style={{ fontSize: 26 }}>{o.unit}</span>
              </div>
              <div className="text-[13px] mt-3 leading-[1.4]" style={{ color: 'rgba(255,255,255,0.78)' }}>{o.lab}</div>
              <div className="font-mono text-[10.5px] mt-3.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{o.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Audience ───────────────────────────────────────────────────────────── */

const AUDIENCES = [
  {
    tag: 'FOR FARMERS',
    title: 'From soil moisture to harvest plan.',
    desc: 'Daily irrigation guidance, disease alerts, and crop recommendations — in your language, on any phone.',
    items: [
      ['Pair sensor kit', 'QR · 30s'],
      ['Daily plan via SMS / app', 'Free'],
      ['Phone-camera disease scan', '3 species'],
      ['Crop & variety advisor', 'ACA-O'],
    ],
    cta: 'Register my farm →',
    ctaClass: 'btn-primary',
    href: '/register',
  },
  {
    tag: 'FOR OFFICERS',
    title: 'Schedule releases. Approve requests.',
    desc: 'A SCADA-grade view of your block: hydraulics schedule, manual request queue, scheme-level performance.',
    items: [
      ['Hydraulics schedule', 'D+14'],
      ['Manual request triage', 'SLA 6h'],
      ['Operations dashboard', 'Live'],
      ['Audit log & reason codes', 'ISO 27001'],
    ],
    cta: 'Officer sign-in →',
    ctaClass: 'btn-ghost',
    href: '/login',
  },
  {
    tag: 'FOR AUTHORITY',
    title: 'Set quotas. Govern policy.',
    desc: 'Configure seasonal water quotas, manage user roles, and audit decisions across all schemes from one console.',
    items: [
      ['Policies & quotas', 'Per scheme'],
      ['User & role management', 'RBAC'],
      ['Cross-scheme reporting', 'Quarterly'],
      ['Reproducible runs', '98%'],
    ],
    cta: 'Request access →',
    ctaClass: 'btn-ghost',
    href: '/authority/policies',
  },
];

function AudienceSection() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="max-w-[760px] mb-9">
          <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">Built for three audiences</div>
          <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.028em]" style={{ fontSize: 40 }}>One platform. One data model. Three perspectives.</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {AUDIENCES.map(a => (
            <div key={a.tag} className="bg-white border border-[var(--border)] rounded-[14px] p-6 flex flex-col">
              <div className="font-mono text-[11px] text-[var(--muted)]">{a.tag}</div>
              <div className="font-serif font-medium mt-1.5 tracking-[-0.02em]" style={{ fontSize: 22 }}>{a.title}</div>
              <p className="text-[13.5px] text-[var(--ink-soft)] mt-2">{a.desc}</p>
              <ul className="mt-4 flex-1">
                {a.items.map(([k, v]) => (
                  <li key={k} className="flex justify-between items-baseline py-2.5 border-t border-[var(--line)] text-[13px]">
                    <span className="text-[var(--ink-soft)]">{k}</span>
                    <span className="font-mono text-[11px] text-[var(--muted)]">{v}</span>
                  </li>
                ))}
                <li className="border-t border-[var(--line)]" />
              </ul>
              <div className="mt-[18px]">
                <Link href={a.href} className={`btn ${a.ctaClass}`} style={{ width: '100%', justifyContent: 'center' }}>
                  {a.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Research ───────────────────────────────────────────────────────────── */

const PUBS = [
  {
    year: '2025',
    title: 'Adaptive water-quota allocation under monsoon uncertainty: a case study of Mahaweli H-04',
    venue: 'J. Hydrology · Vol 638 · Open Access',
  },
  {
    year: '2025',
    title: 'Phone-camera detection of bacterial leaf blight: a low-data fine-tune approach',
    venue: 'Comput. Electron. Agric · Vol 224',
  },
  {
    year: '2024',
    title: 'Bias correction of WRF rainfall ensembles for Sri Lankan paddy schemes',
    venue: 'Mon. Weather Rev · Vol 152(11)',
  },
  {
    year: '2024',
    title: 'ACA-O: a constrained optimizer for adaptive crop allocation under quota',
    venue: 'Agric. Water Manag · Vol 296',
  },
];

function ResearchSection() {
  return (
    <section className="py-20 border-t border-b border-[var(--border)]" style={{ background: 'var(--bg-warm)' }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid gap-14" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
          <div>
            <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">Research-grade by design</div>
            <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.025em]" style={{ fontSize: 36 }}>A platform you can cite, audit, and reproduce.</h2>
            <p className="text-[16px] text-[var(--ink-soft)] mt-3.5 max-w-[620px] leading-relaxed">
              Every model, every dataset, every decision is versioned. We publish skill scores against persistence baselines each cycle — and the ACA-O optimizer's posterior is recomputable from a season-long event log.
            </p>
            <div className="flex gap-6 mt-7 flex-wrap">
              <div>
                <div className="font-mono text-[11px] text-[var(--muted)]">DATASET</div>
                <div className="font-serif font-medium mt-1" style={{ fontSize: 22 }}>14M+ readings</div>
                <div className="text-[12px] text-[var(--muted)]">Open under CC-BY 4.0 (de-identified)</div>
              </div>
              <div>
                <div className="font-mono text-[11px] text-[var(--muted)]">CODE</div>
                <div className="font-serif font-medium mt-1" style={{ fontSize: 22 }}>Apache-2.0</div>
                <div className="text-[12px] text-[var(--muted)]">Hosted on the Mahaweli Authority registry</div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] text-[var(--muted)] tracking-[0.08em]">SELECTED PUBLICATIONS</div>
            <div className="border-t border-[var(--border)] mt-3.5">
              {PUBS.map(p => (
                <div key={p.title} className="py-[18px] border-b border-[var(--border)] grid gap-[18px] items-baseline" style={{ gridTemplateColumns: '80px 1fr auto' }}>
                  <div className="font-mono text-[12px] text-[var(--muted)]">{p.year}</div>
                  <div>
                    <div className="text-[14px] leading-[1.4] text-[var(--text)]">{p.title}</div>
                    <div className="text-[12px] text-[var(--muted)] mt-1">{p.venue}</div>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--primary-600)]">↗ DOI</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: 'Does it work without internet at the field?',
    a: 'Sensor gateways buffer 7 days of readings locally and sync over LoRaWAN to the nearest tower. Daily plans are also delivered by SMS, so a basic phone is enough.',
  },
  {
    q: 'What does it cost a farmer?',
    a: 'Registration and the daily plan are free during the research phase. The sensor kit is loaned via the Mahaweli Authority and remains scheme-owned hardware.',
  },
  {
    q: 'Who decides when valves open?',
    a: 'In automated mode the F1 module dispatches schedules; officers retain a manual override with required reason codes. Every action is logged and reversible.',
  },
  {
    q: 'How is privacy handled?',
    a: 'Personally-identifying data (NIC, contact) lives in a separate encrypted store from the field telemetry. Open datasets are released only after de-identification review.',
  },
  {
    q: 'Which crops are supported?',
    a: 'Paddy (Bg 352, At 362, Bg 366) is the primary supported crop. Maize, chili, big-onion and green-gram are supported for ACA-O recommendations and disease alerts.',
  },
  {
    q: 'Can our scheme integrate?',
    a: 'Yes. The platform deploys per-scheme via the Mahaweli Authority registry. We are onboarding two schemes per season — see the Schemes page or contact us directly.',
  },
];

function FAQSection() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="max-w-[760px] mb-4">
          <div className="text-[11px] tracking-[0.12em] uppercase font-bold text-[var(--primary-600)]">Frequently asked</div>
          <h2 className="font-serif font-medium mt-2.5 leading-[1.05] tracking-[-0.028em]" style={{ fontSize: 40 }}>Practical questions, plainly answered.</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-8 mt-4">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <div className="font-serif font-medium tracking-[-0.018em]" style={{ fontSize: 18 }}>{q}</div>
              <p className="text-[13.5px] text-[var(--ink-soft)] mt-2 leading-[1.6]">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-8">
        <div
          className="relative rounded-[18px] overflow-hidden p-14 grid gap-12 items-center text-white"
          style={{
            gridTemplateColumns: '1.4fr 1fr',
            background: 'radial-gradient(ellipse at 80% 20%, rgba(102,187,106,0.25) 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(2,136,209,0.18) 0%, transparent 60%), linear-gradient(135deg, #1B5E20 0%, #0D3A15 100%)',
          }}
        >
          <div>
            <h2 className="font-serif font-medium leading-[1.05] tracking-[-0.03em]" style={{ fontSize: 44 }}>Bring HarvestPulse to your scheme.</h2>
            <p className="mt-3.5 text-[15px] max-w-[460px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Register a farm in 4 minutes — or talk to us about onboarding your scheme for the next Yala season. Every screen, every dataset, every mm of water.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href="/register" className="btn" style={{ width: '100%', height: 50, fontSize: 14.5, background: 'white', color: '#1B5E20', justifyContent: 'center', fontWeight: 600 }}>
              Register my farm →
            </Link>
            <button className="btn" style={{ width: '100%', height: 50, fontSize: 14.5, color: 'white', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', justifyContent: 'center' }}>
              Onboard a scheme
            </button>
            <div className="text-center font-mono text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              University research build · v0.9.3-rc2
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────── */

function FooterSection() {
  const cols = [
    { title: 'Platform', items: ['F1 · Irrigation', 'F2 · Crop Health', 'F3 · Forecasting', 'F4 · ACA-O'] },
    { title: 'People', items: ['For Farmers', 'For Officers', 'For Authority', 'Researchers'] },
    { title: 'Resources', items: ['Documentation', 'API & datasets', 'Publications', 'Status page'] },
    { title: 'About', items: ['The team', 'Schemes & pilots', 'Privacy', 'Contact'] },
  ];
  return (
    <footer className="pt-14 pb-10 bg-white border-t border-[var(--border)]">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid gap-8" style={{ gridTemplateColumns: '1.4fr repeat(4, 1fr)' }}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold tracking-[-0.022em]" style={{ fontSize: 15 }}>
              <span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #4CAF50 100%)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3s6 6 6 12a6 6 0 11-12 0c0-6 6-12 6-12z" fill="white" opacity="0.96"/>
                  <path d="M12 8s3.5 4 3.5 7.5a3.5 3.5 0 11-7 0c0-3.5 3.5-7.5 3.5-7.5z" fill="#2E7D32"/>
                </svg>
              </span>
              HarvestPulse
            </div>
            <p className="mt-3.5 text-[13px] text-[var(--muted)]" style={{ maxWidth: 280 }}>
              Adaptive smart irrigation & crop optimization. A Mahaweli Development Authority research build.
            </p>
            <div className="flex gap-2 items-center mt-[18px]">
              <span className="chip live">v0.9.3-rc2</span>
              <span className="chip info">ISO 27001</span>
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] font-bold">{col.title}</h4>
              <ul className="mt-3.5 space-y-1">
                {col.items.map(item => (
                  <li key={item} className="text-[13px] text-[var(--ink-soft)] py-1 cursor-pointer hover:text-[var(--text)]">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-12 pt-5 border-t border-[var(--border)] text-[11.5px] text-[var(--muted)]">
          <div>© 2026 Mahaweli Development Authority · HarvestPulse research build · Original design.</div>
          <div className="font-mono">colombo · කොළඹ · கொழும்பு</div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Page() {
  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <PublicTop active="home" />
      <HeroSection />
      <LogoStrip />
      <ModulesSection />
      <DecisionLoopSection />
      <DashboardPreviewSection />
      <OutcomesSection />
      <AudienceSection />
      <ResearchSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}

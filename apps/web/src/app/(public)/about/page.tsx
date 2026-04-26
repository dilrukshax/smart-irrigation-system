/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const TEAM = [
  {
    initial: 'D',
    name: 'Dilruksha A.G.C.D.',
    id: 'IT22561770',
    email: 'IT22561770@my.sliit.lk',
    role: 'F4 · Crop Area Optimization (ACA-O)',
    color: 'linear-gradient(135deg, #2E7D32, #66BB6A)',
  },
  {
    initial: 'H',
    name: 'Hesara P.K.A.N.',
    id: 'IT22561398',
    email: 'IT22561398@my.sliit.lk',
    role: 'F1 · Smart Irrigation & IoT',
    color: 'linear-gradient(135deg, #0288D1, #4FC3F7)',
  },
  {
    initial: 'T',
    name: 'Trishni W.R.M.',
    id: 'IT22076366',
    email: 'IT22076366@my.sliit.lk',
    role: 'F3 · Forecasting & Weather Intelligence',
    color: 'linear-gradient(135deg, #F9A825, #FFD54F)',
  },
  {
    initial: 'A',
    name: 'Abishek W.R.M.',
    id: 'IT22076547',
    email: 'IT22076547@my.sliit.lk',
    role: 'F2 · Crop Health & Stress Detection',
    color: 'linear-gradient(135deg, #6A1B9A, #BA68C8)',
  },
];

const TeamCard = ({ m }: any) => (
  <div
    style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '28px 22px',
      textAlign: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 14px 28px -16px rgba(28,52,32,0.18)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      style={{
        width: 92,
        height: 92,
        margin: '0 auto 16px',
        borderRadius: '50%',
        background: m.color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        fontWeight: 700,
        fontFamily: 'var(--font-serif)',
      }}
    >
      {m.initial}
    </div>
    <div className="font-serif" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
      {m.name}
    </div>
    <div style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 600, marginBottom: 4 }}>{m.role}</div>
    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>{m.id}</div>
    <a
      href={`mailto:${m.email}`}
      style={{
        display: 'inline-block',
        fontSize: 12,
        padding: '6px 12px',
        background: 'var(--primary-50)',
        color: 'var(--primary-600)',
        borderRadius: 6,
        textDecoration: 'none',
        fontWeight: 600,
        wordBreak: 'break-all',
      }}
    >
      {m.email}
    </a>
  </div>
);

const InfoCard = ({ label, value }: any) => (
  <div
    style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
  </div>
);

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="about" />
      <PageHeader
        eyebrow="About Us"
        title="Meet the Team"
        lead="Four 4th-year Software Engineering undergraduates collaborating on an integrated smart irrigation research project at SLIIT."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
          Project Group 25-26J-520
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24 }}>
          Each team member leads one research function and contributes to system integration.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 40 }}>
          {TEAM.map((m) => (
            <TeamCard key={m.id} m={m} />
          ))}
        </div>

        {/* Supervisors */}
        <section
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '28px 32px',
            marginBottom: 22,
          }}
        >
          <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 500, color: 'var(--primary-700)', marginBottom: 14 }}>
            Supervisors
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 18 }}>
            This research project is conducted under the academic supervision of the Faculty of
            Computing, Sri Lanka Institute of Information Technology (SLIIT). Supervisor and
            co-supervisor details will be added here as confirmed.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '18px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--primary-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Supervisor
              </div>
              <div className="font-serif" style={{ fontSize: 17, color: 'var(--text)' }}>To be added</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Primary academic supervisor for the project.</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '18px 20px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--primary-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Co-Supervisor
              </div>
              <div className="font-serif" style={{ fontSize: 17, color: 'var(--text)' }}>To be added</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Co-supervisor for the project.</div>
            </div>
          </div>
        </section>

        {/* Project at a Glance */}
        <section
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '28px 32px',
          }}
        >
          <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 500, color: 'var(--primary-700)', marginBottom: 18 }}>
            Project at a Glance
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <InfoCard label="Type" value="Final Year Research Project · Software Engineering" />
            <InfoCard label="Institution" value="Sri Lanka Institute of Information Technology" />
            <InfoCard label="Group ID" value="25-26J-520" />
            <InfoCard label="Domain" value="IoT · AI/ML · Optimization · Agriculture" />
            <InfoCard label="Target Domain" value="Quota-based irrigation schemes (Sri Lanka)" />
            <InfoCard label="Duration" value="2025–2026 academic year" />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

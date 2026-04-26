/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const SlideItem = ({ tag, title, desc, status, href = '#' }: any) => {
  const isAvailable = status === 'available';
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--secondary-50)',
          color: 'var(--secondary)',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 12.5,
        }}
      >
        {tag}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 99,
          background: isAvailable ? '#D1F4E0' : '#FFF3CD',
          color: isAvailable ? '#1B5E20' : '#8A6100',
        }}
      >
        {isAvailable ? 'View Slides' : 'Upcoming'}
      </span>
    </a>
  );
};

const Section = ({ title, intro, children }: any) => (
  <section
    style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '28px 32px',
      marginBottom: 22,
    }}
  >
    <h2
      className="font-serif"
      style={{ fontSize: 24, fontWeight: 500, color: 'var(--primary-700)', marginBottom: intro ? 10 : 18 }}
    >
      {title}
    </h2>
    {intro && (
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 18, lineHeight: 1.6 }}>{intro}</p>
    )}
    <div style={{ display: 'grid', gap: 12 }}>{children}</div>
  </section>
);

export default function PresentationsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="presentations" />
      <PageHeader
        eyebrow="Presentations"
        title="Presentation Slides"
        lead="Past and upcoming presentation decks for proposal, progress, and final assessments — including individual stream deep-dives."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        <Section title="Past Presentations">
          <SlideItem tag="PP" title="Proposal Presentation" desc="Initial presentation covering background, research gap, problem statement, objectives, and proposed approach." status="available" />
          <SlideItem tag="P1" title="Progress Presentation 1" desc="50% system demonstration with initial ML models, microservices, and IoT data flow." status="available" />
        </Section>

        <Section title="Upcoming Presentations">
          <SlideItem tag="P2" title="Progress Presentation 2" desc="90% system demonstration with full integration across F1–F4 functions and end-to-end workflows." status="upcoming" />
          <SlideItem tag="FP" title="Final Presentation" desc="Complete production-ready system with deployment, evaluation results, and research contribution validation." status="upcoming" />
        </Section>

        <Section
          title="Individual Stream Decks"
          intro="Per-member technical deep-dive decks used during individual research presentations."
        >
          <SlideItem tag="F1" title="F1 — Smart Irrigation (Hesara)" desc="RandomForest model design, IoT sensor pipeline, and valve control workflow." status="available" />
          <SlideItem tag="F2" title="F2 — Crop Health Detection (Abishek)" desc="MobileNetV2 architecture, PlantVillage dataset, NDVI/NDWI zone analysis." status="available" />
          <SlideItem tag="F3" title="F3 — Forecasting (Trishni)" desc="ARIMA, Linear Regression baseline, ensemble approach, and risk band generation." status="available" />
          <SlideItem tag="F4" title="F4 — Crop Optimization (Dilruksha)" desc="Fuzzy-TOPSIS suitability scoring, FAO-56 water budget, and PuLP optimization model." status="available" />
        </Section>
      </main>

      <PublicFooter />
    </div>
  );
}

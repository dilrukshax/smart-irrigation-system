/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const DocItem = ({ icon, title, desc, status, href = '#' }: any) => {
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
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
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
          background: 'var(--primary-50)',
          color: 'var(--primary-600)',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 12.5,
        }}
      >
        {icon}
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
        {isAvailable ? 'View' : 'Pending'}
      </span>
    </a>
  );
};

const DocSection = ({ title, intro, children }: any) => (
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

export default function DocumentsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="documents" />
      <PageHeader
        eyebrow="Documents"
        title="Project Documents"
        lead="All produced and pending project documents. Click any item to view or download."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        <DocSection title="Project-Wide Documents">
          <DocItem icon="PC" title="Project Charter" desc="Formal initiation document outlining project scope, stakeholders, and authority." status="available" />
          <DocItem icon="PD" title="Proposal Document (Group)" desc="Combined group proposal with project background, objectives, and methodology." status="available" />
          <DocItem icon="SR" title="Software Requirements Specification (SRS)" desc="Functional and non-functional requirements across all four streams." status="pending" />
          <DocItem icon="CL" title="Check List Documents" desc="Pre-presentation and pre-submission checklists." status="available" />
          <DocItem icon="SD" title="System Design Document" desc="Architecture diagrams, microservice contracts, database schemas, and gateway routing." status="available" />
          <DocItem icon="TP" title="Test Plan & Results" desc="Per-service test coverage, gateway contract tests, and integration validation results." status="pending" />
          <DocItem icon="RP" title="Research Paper" desc="Publication-ready paper documenting the integrated platform and findings." status="pending" />
        </DocSection>

        <DocSection
          title="Final Documents"
          intro="The Final Document set comprises one main group document plus four individual chapter documents — one per team member."
        >
          <DocItem icon="FD" title="Final Document — Main (Group)" desc="Combined final report with introduction, integrated methodology, results, and conclusions." status="pending" />
          <DocItem icon="F1" title="Final Document — F1 (Hesara)" desc="Smart Irrigation Control with Random Forest model and IoT integration." status="pending" />
          <DocItem icon="F2" title="Final Document — F2 (Abishek)" desc="Crop Health and Water Stress Detection with MobileNetV2 disease classifier." status="pending" />
          <DocItem icon="F3" title="Final Document — F3 (Trishni)" desc="Time-series Forecasting and Weather Intelligence with ARIMA and ensemble models." status="pending" />
          <DocItem icon="F4" title="Final Document — F4 (Dilruksha)" desc="Adaptive Crop & Area Optimization (ACA-O) with Fuzzy-TOPSIS and PuLP." status="pending" />
        </DocSection>

        <DocSection
          title="Status Documents (Individual)"
          intro="Weekly status documents and logbooks per member capturing progress, blockers, and supervisor feedback."
        >
          <DocItem icon="D" title="Status Document — Dilruksha (F4)" desc="Weekly progress for ACA-O optimization stream." status="available" />
          <DocItem icon="H" title="Status Document — Hesara (F1)" desc="Weekly progress for Smart Irrigation IoT stream." status="available" />
          <DocItem icon="T" title="Status Document — Trishni (F3)" desc="Weekly progress for Forecasting stream." status="available" />
          <DocItem icon="A" title="Status Document — Abishek (F2)" desc="Weekly progress for Crop Health Detection stream." status="available" />
        </DocSection>
      </main>

      <PublicFooter />
    </div>
  );
}

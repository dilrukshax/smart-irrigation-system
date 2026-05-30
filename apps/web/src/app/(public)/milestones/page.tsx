/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import { PublicTop } from '@/components/asi/public-top';
import { PublicFooter } from '@/components/asi/public-footer';
import { PageHeader } from '@/components/asi/page-header';

const MILESTONES = [
  {
    id: 'proposal',
    name: 'Project Proposal',
    date: 'Week 6 (Semester 1)',
    type: 'Individual Document',
    detail:
      'Each team member submits an individual project proposal document covering background, literature review, research gap, problem statement, individual research contribution, methodology, and timeline.',
  },
  {
    id: 'pp1',
    name: 'Progress Presentation 1',
    date: 'Week 11 (Semester 1)',
    type: 'Group Presentation',
    detail:
      'Demonstration of approximately 50% of the system. Each team member presents their function and shows working core components — initial ML models, microservices, basic frontend integration, and IoT data flow.',
  },
  {
    id: 'pp2',
    name: 'Progress Presentation 2',
    date: 'Week 6–8 (Semester 2)',
    type: 'Group Presentation',
    detail:
      'Demonstration of approximately 90% of the system, including full integration across F1–F4 functions, end-to-end farmer/officer/authority workflows, deployed services, and validated ML models.',
  },
  {
    id: 'final',
    name: 'Final Assessment',
    date: 'Week 12–13 (Semester 2)',
    type: 'Group Presentation & Demonstration',
    detail:
      'Final demonstration of the complete, production-ready system with full documentation, deployed cloud infrastructure, evaluation results, and research contribution validation. Includes Q&A from the panel.',
  },
  {
    id: 'viva',
    name: 'Viva',
    date: 'After Final Assessment',
    type: 'Individual Oral Examination',
    detail:
      'Each team member individually defends their research contribution, implementation choices, and answers panel questions on their function and the integrated system.',
  },
  {
    id: 'research',
    name: 'Research Paper',
    date: 'End of Semester 2',
    type: 'Group Submission',
    detail:
      'A publication-ready research paper documenting the integrated platform, methodology, evaluation, and comparison with existing approaches. Submitted to a relevant conference or journal.',
  },
  {
    id: 'logbook',
    name: 'Logbook & Status Documents',
    date: 'Continuous',
    type: 'Continuous Submission',
    detail:
      'Weekly logbook entries from each member capturing progress, blockers, and supervisor feedback. Includes status documents submitted at each checkpoint throughout the year.',
  },
];

export default function MilestonesPage() {
  const [selected, setSelected] = React.useState(MILESTONES[0].id);
  const current = MILESTONES.find((m) => m.id === selected) || MILESTONES[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PublicTop active="milestones" />
      <PageHeader
        eyebrow="Milestones"
        title="Project Milestones"
        lead="All assessments and key deliverables across the academic year. Pick a milestone below to see dates and details."
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px' }}>

        {/* Selector */}
        <section
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 28,
          }}
        >
          <label
            htmlFor="milestone-select"
            style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}
          >
            Select a Milestone
          </label>
          <select
            id="milestone-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 14,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'white',
              color: 'var(--text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {MILESTONES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Detail panel */}
          <div
            style={{
              marginTop: 18,
              padding: '18px 20px',
              background: 'var(--primary-50)',
              borderRadius: 10,
              borderLeft: '4px solid var(--primary)',
            }}
          >
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 500, color: 'var(--primary-700)', marginBottom: 10 }}>
              {current.name}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 28,
                flexWrap: 'wrap',
                margin: '8px 0 14px',
                padding: '10px 14px',
                background: 'white',
                borderRadius: 8,
                fontSize: 12.5,
              }}
            >
              <span style={{ color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Date:</strong> {current.date}
              </span>
              <span style={{ color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Type:</strong> {current.type}
              </span>
            </div>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{current.detail}</p>
          </div>
        </section>

        {/* Timeline cards */}
        <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 500, color: 'var(--text)', marginBottom: 18 }}>
          Timeline at a Glance
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {MILESTONES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelected(m.id);
                if (typeof window !== 'undefined') window.scrollTo({ top: 220, behavior: 'smooth' });
              }}
              style={{
                textAlign: 'left',
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 18px -8px rgba(28,52,32,0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--primary-600)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {m.date}
              </div>
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {m.type}
              </div>
            </button>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

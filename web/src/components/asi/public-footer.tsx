/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import Link from 'next/link';

const PublicFooter = () => (
  <footer
    style={{
      borderTop: '1px solid var(--border)',
      background: 'white',
      marginTop: 80,
    }}
  >
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
          25-26J-520 · HarvestPulse
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, maxWidth: 360 }}>
          Integrated Smart Water-Focused Irrigation System Using IoT and AI/ML.
          A 4th year Software Engineering research project at the
          Sri Lanka Institute of Information Technology (SLIIT).
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Project</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
          <Link href="/domain" style={{ color: 'var(--muted)' }}>Domain</Link>
          <Link href="/milestones" style={{ color: 'var(--muted)' }}>Milestones</Link>
          <Link href="/documents" style={{ color: 'var(--muted)' }}>Documents</Link>
          <Link href="/presentations" style={{ color: 'var(--muted)' }}>Presentations</Link>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Team</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
          <Link href="/about" style={{ color: 'var(--muted)' }}>About Us</Link>
          <Link href="/contact" style={{ color: 'var(--muted)' }}>Contact</Link>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Platform</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
          <Link href="/farmer" style={{ color: 'var(--muted)' }}>Farmer Portal</Link>
          <Link href="/operations" style={{ color: 'var(--muted)' }}>Operations</Link>
          <Link href="/login" style={{ color: 'var(--muted)' }}>Sign in</Link>
        </div>
      </div>
    </div>

    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 40px', textAlign: 'center', fontSize: 11.5, color: 'var(--muted)' }}>
      © 2025–2026 Project Group 25-26J-520 · SLIIT · All rights reserved.
    </div>
  </footer>
);

export { PublicFooter };

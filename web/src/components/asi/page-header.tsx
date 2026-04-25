/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import Link from 'next/link';

const PageHeader = ({ eyebrow, title, lead }: any) => (
  <section
    style={{
      background:
        'radial-gradient(circle at 12% 18%, rgba(46,125,50,0.18) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(2,136,209,0.16) 0%, transparent 45%), linear-gradient(135deg, #EEF7E5 0%, #E1F2FA 100%)',
      borderBottom: '1px solid var(--border)',
      padding: '52px 0 44px',
    }}
  >
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link>
        <span style={{ margin: '0 8px', color: '#C2CABF' }}>/</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{eyebrow || title}</span>
      </div>
      <h1
        className="font-serif"
        style={{
          fontSize: 48,
          fontWeight: 500,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          color: 'var(--text)',
          margin: 0,
        }}
      >
        {title}
      </h1>
      {lead && (
        <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', marginTop: 14, maxWidth: 760, lineHeight: 1.55 }}>
          {lead}
        </p>
      )}
    </div>
  </section>
);

export { PageHeader };

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/asi/ui';

const PublicTop = ({ active = 'home' }) => (
  <div style={{ height: 64, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 32 }}>
    <Link href="/" style={{ display: 'inline-flex' }}>
      <Logo/>
    </Link>
    <div style={{ display: 'flex', gap: 22, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
      <Link href="/" style={{ color: active === 'home' ? 'var(--text)' : undefined, fontWeight: active === 'home' ? 600 : 500 }}>Platform</Link>
      <Link href="/farmer/landing">For Farmers</Link>
      <Link href="/operations">For Officers</Link>
      <Link href="/forecasting">Research</Link>
      <Link href="/authority/policies">Schemes</Link>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>EN · සිංහල · தமிழ்</span>
      <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
      <Link href="/register" className="btn btn-primary btn-sm">Register farm</Link>
    </div>
  </div>
);

// [1] LANDING

export { PublicTop };

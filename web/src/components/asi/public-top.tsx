/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/asi/ui';

const linkStyle = (isActive: boolean) => ({
  color: isActive ? 'var(--text)' : undefined,
  fontWeight: isActive ? 600 : 500,
});

const PublicTop = ({ active = 'home' }) => (
  <div style={{ height: 64, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 40px', gap: 28 }}>
    <Link href="/" style={{ display: 'inline-flex' }}>
      <Logo/>
    </Link>
    <div style={{ display: 'flex', gap: 18, fontSize: 13, color: 'var(--muted)', fontWeight: 500, flexWrap: 'wrap' }}>
      <Link href="/" style={linkStyle(active === 'home')}>Home</Link>
      <Link href="/domain" style={linkStyle(active === 'domain')}>Domain</Link>
      <Link href="/milestones" style={linkStyle(active === 'milestones')}>Milestones</Link>
      <Link href="/documents" style={linkStyle(active === 'documents')}>Documents</Link>
      <Link href="/presentations" style={linkStyle(active === 'presentations')}>Presentations</Link>
      <Link href="/about" style={linkStyle(active === 'about')}>About Us</Link>
      <Link href="/contact" style={linkStyle(active === 'contact')}>Contact</Link>
    </div>
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>EN · සිංහල · தமிழ්</span>
      <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
      <Link href="/register" className="btn btn-primary btn-sm">Register farm</Link>
    </div>
  </div>
);

// [1] LANDING

export { PublicTop };

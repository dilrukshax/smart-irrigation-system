/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import {
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
} from '@/components/asi/ui';
import { farmerNav, officerNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { apiPost } from '@/lib/api';
import { ApiError } from '@/lib/api';

const Register = () => {
  const [fullName, setFullName] = React.useState('Nimal Perera');
  const [nic, setNic] = React.useState('199112345678');
  const [email, setEmail] = React.useState('nimal.p@example.lk');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiPost('/auth/register', {
        username: fullName,
        password,
        email,
        role: 'farmer',
      });
      setSuccess(true);
      // Redirect to onboarding after 1.5 seconds
      setTimeout(() => {
        window.location.replace('/farmer/onboarding');
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <div style={{ padding: 56, background: 'linear-gradient(160deg, #F1F8E9 0%, #E1F5FE 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Logo/>
        <div>
          <h1 style={{ fontSize: 34, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Register your farm in three steps.</h1>
          <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 13.5 }}>
            We'll match your field to the nearest sensor cluster and enroll you in your scheme's quota program.
          </p>
          {/* Step ladder */}
          <div style={{ marginTop: 30 }}>
            {[
              { n: '01', t: 'Account Setup', s: 'Email, password' },
              { n: '02', t: 'Farm Details', s: 'Area, GPS, soil, crops' },
              { n: '03', t: 'Device Pairing', s: 'Connect your sensor' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: i === 0 ? 'var(--primary)' : 'white', color: i === 0 ? 'white' : 'var(--muted)', border: i !== 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                  {i === 0 ? <Icon name="check" size={14}/> : s.n}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.t}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>{s.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Data is stored on Mahaweli Authority servers · ISO 27001</div>
      </div>
      <div style={{ padding: '56px 64px', overflow: 'auto' }}>
        <div className="between">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em' }}>STEP 1 OF 3</div>
            <h2 style={{ fontSize: 24, letterSpacing: '-0.02em', marginTop: 4 }}>Create your account</h2>
          </div>
          <Chip kind="info" dot={false}>Account setup</Chip>
        </div>
        <div className="prog" style={{ marginTop: 14, marginBottom: 24 }}>
          <div className="prog-fill" style={{ width: '33%' }}/>
        </div>
        
        {success && (
          <div style={{ padding: 12, background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#166534', fontSize: 13, marginBottom: 20 }}>
            ✓ Registration successful! Redirecting to device setup...
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div className="field"><label>Full name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading || success}/></div>
          <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || success}/></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password" disabled={loading || success}/></div>
          
          {error && (
            <div style={{ gridColumn: '1 / -1', padding: 10, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Link href="/login" className="btn btn-ghost">← Back to login</Link>
            <button type="submit" className="btn btn-primary" disabled={loading || success} style={{ opacity: loading || success ? 0.6 : 1, cursor: loading || success ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : success ? 'Success!' : 'Create account →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Register />
    </div>
  );
}

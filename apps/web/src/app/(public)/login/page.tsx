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
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';

const Login = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      // Redirect based on role
      const redirectUrl =
        user.roles[0]?.toLowerCase() === 'farmer'
          ? '/farmer'
          : user.roles[0]?.toLowerCase() === 'officer'
            ? '/operations'
            : '/authority/users';
      window.location.replace(redirectUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {/* Illustration */}
      <div style={{ background: 'linear-gradient(160deg, #2E7D32 0%, #1B5E20 60%, #0D3A15 100%)', padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'white' }}>
        <Logo/>
        <div>
          <h1 style={{ fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1.05 }}>One platform, three perspectives.</h1>
          <p style={{ fontSize: 14, opacity: 0.85, marginTop: 16, lineHeight: 1.55 }}>
            From a farmer reading soil moisture in Thalawa, to an officer scheduling a reservoir release, to the authority setting the season's quota — HarvestPulse keeps the loop closed.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 32 }}>
            {['Farmer', 'Officer', 'Authority'].map((r, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Icon name={['leaf','handshake','shield'][i]} size={18}/>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{r}</div>
                <div style={{ fontSize: 10.5, opacity: 0.75, marginTop: 2 }}>
                  {['Plan & monitor','Approve & operate','Govern & audit'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>University research build · v0.9.3-rc2</div>
      </div>
      {/* Form */}
      <div style={{ padding: '72px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sign in</div>
          <h2 style={{ fontSize: 28, marginTop: 6, letterSpacing: '-0.02em' }}>Welcome back.</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Farmers can use their ID number. Officers and authorities can use their username or email.</p>

          <form onSubmit={handleLogin}>
            <div className="field" style={{ marginTop: 22 }}>
              <label>ID number, username, or email</label>
              <input
                className="input"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. 199112345678"
                disabled={loading}
              />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: 40 }}
                  disabled={loading}
                />
                <Icon name="eye" size={15} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--muted)' }}/>
              </div>
            </div>
            <div className="between" style={{ marginTop: 14, fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" defaultChecked/> Remember me
              </label>
              <Link href="/contact" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Need help?</Link>
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: 10, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: 42, marginTop: 18, fontSize: 13.5, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'} {!loading && <Icon name="arrow" size={14}/>}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--muted)' }}>
            New farmer? <Link href="/register" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Register here →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Login />
    </div>
  );
}

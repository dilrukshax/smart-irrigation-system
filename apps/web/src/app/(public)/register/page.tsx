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
import { login } from '@/lib/auth';

const Register = () => {
  const [fullName, setFullName] = React.useState('');
  const [idNumber, setIdNumber] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Farmer name is required');
      return;
    }
    if (!idNumber.trim()) {
      setError('ID number is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must have at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiPost('/auth/register', {
        full_name: fullName,
        national_id: idNumber,
        username: idNumber,
        password,
        email: email.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined,
        role: 'farmer',
      });
      setSuccess(true);
      await login(idNumber, password);
      window.location.replace('/farmer');
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
          <h1 style={{ fontSize: 34, letterSpacing: '-0.025em', lineHeight: 1.05 }}>Create a farmer account in one step.</h1>
          <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 13.5 }}>
            Farmers can sign in with their ID number. Email is optional.
          </p>
          <div style={{ marginTop: 30 }}>
            {[
              { n: '01', t: 'Farmer name', s: 'Use the name on the farmer record' },
              { n: '02', t: 'ID number', s: 'Used for simple login later' },
              { n: '03', t: 'Password', s: 'Keeps the farmer account private' },
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
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Farm and device setup can be completed later from the farmer dashboard.</div>
      </div>
      <div style={{ padding: '56px 64px', overflow: 'auto' }}>
        <div className="between">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em' }}>FARMER REGISTRATION</div>
            <h2 style={{ fontSize: 24, letterSpacing: '-0.02em', marginTop: 4 }}>Create your account</h2>
          </div>
          <Chip kind="info" dot={false}>One step</Chip>
        </div>
        <div className="prog" style={{ marginTop: 14, marginBottom: 24 }}>
          <div className="prog-fill" style={{ width: '100%' }}/>
        </div>
        
        {success && (
          <div style={{ padding: 12, background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#166534', fontSize: 13, marginBottom: 20 }}>
            Registration successful. Opening the farmer dashboard...
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div className="field"><label>Farmer name</label><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Nimal Perera" disabled={loading || success} required/></div>
          <div className="field"><label>ID / NIC number</label><input className="input" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 199112345678" disabled={loading || success} required/></div>
          <div className="field"><label>Mobile number <span className="muted">(optional)</span></label><input className="input" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="e.g. 0712345678" disabled={loading || success}/></div>
          <div className="field"><label>Email <span className="muted">(optional)</span></label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" disabled={loading || success}/></div>
          <div className="field"><label>Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" disabled={loading || success} required minLength={6}/></div>
          <div className="field"><label>Confirm password</label><input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" disabled={loading || success} required minLength={6}/></div>
          
          {error && (
            <div style={{ gridColumn: '1 / -1', padding: 10, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <Link href="/login" className="btn btn-ghost">Back to login</Link>
            <button type="submit" className="btn btn-primary" disabled={loading || success} style={{ opacity: loading || success ? 0.6 : 1, cursor: loading || success ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : success ? 'Success!' : 'Create farmer account'}
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

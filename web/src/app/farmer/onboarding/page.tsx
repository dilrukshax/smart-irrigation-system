/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
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
import { apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const FarmerOnboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = React.useState(0);
  const steps = ['Field Details', 'Crop Selection', 'Device Pairing', 'Done'];

  // Field details state
  const [fieldName, setFieldName] = React.useState('');
  const [areaHa, setAreaHa] = React.useState('2.4');
  const [soilType, setSoilType] = React.useState('Reddish-Brown Earth');
  const [schemeId, setSchemeId] = React.useState('H-04');
  const [latitude, setLatitude] = React.useState('8.3421');
  const [longitude, setLongitude] = React.useState('80.4891');

  // Crop state
  const [cropType, setCropType] = React.useState('Paddy Bg 352');

  // Device pairing state
  const [deviceId, setDeviceId] = React.useState('HP-3A1F-9K22');
  const [pairingSessionId, setPairingSessionId] = React.useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = React.useState<string>('');

  // Shared state
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: string; text: string } | null>(null);
  const [createdFieldId, setCreatedFieldId] = React.useState<string | null>(null);

  const handleFieldCreate = async () => {
    if (!fieldName.trim()) {
      setMessage({ type: 'error', text: 'Field name is required' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiPost<any>('/farm/fields', {
        field_name: fieldName,
        crop_type: cropType,
        soil_type: soilType,
        area_hectares: parseFloat(areaHa) || 0,
        scheme_id: schemeId,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
      });
      setCreatedFieldId(res.field_id || res.id);
      setMessage({ type: 'success', text: 'Field created successfully!' });
      setStep(2); // Jump to device pairing
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create field' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePairingInitiate = async () => {
    if (!createdFieldId) {
      setMessage({ type: 'error', text: 'Please create a field first' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiPost<any>('/devices/pairing/initiate', {
        field_id: createdFieldId,
        device_id: deviceId,
      });
      setPairingSessionId(res.pairing_id || res.session_id);
      setPairingStatus(res.status || 'PENDING');
      setMessage({ type: 'success', text: 'Pairing initiated. Verify connection and confirm below.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to initiate pairing' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePairingConfirm = async () => {
    if (!pairingSessionId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await apiPost(`/devices/pairing/${pairingSessionId}/confirm`, { confirm: true });
      setPairingStatus('CONFIRMED');
      setMessage({ type: 'success', text: 'Device paired successfully!' });
      setStep(3);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to confirm pairing' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = user?.username || 'Farmer';

  return (
    <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppBar breadcrumb={['Onboarding']} user={displayName} role="Setup"/>
      <div style={{ padding: '28px 56px', flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: i === step ? 'white' : 'transparent', border: `1px solid ${i === step ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, opacity: i > step ? 0.55 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 50, background: i < step ? 'var(--primary)' : i === step ? 'var(--primary)' : 'white', color: i <= step ? 'white' : 'var(--muted)', border: i > step ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                  {i < step ? <Icon name="check" size={13}/> : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.05em' }}>STEP {i+1}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s}</div>
                </div>
              </div>
            ))}
          </div>

          {message && (
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: message.type === 'success' ? '#DCFCE7' : '#FEE2E2',
              border: `1px solid ${message.type === 'success' ? '#86EFAC' : '#FECACA'}`,
              borderRadius: 8,
              color: message.type === 'success' ? '#166534' : '#DC2626',
              fontSize: 13,
            }}>
              {message.text}
            </div>
          )}

          {/* Step 1 & 2: Field Details + Crop */}
          {(step === 0 || step === 1) && (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>STEP {step + 1}</div>
              <h2 style={{ fontSize: 22, marginTop: 4 }}>
                {step === 0 ? 'Enter your field details' : 'Select your crop'}
              </h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {step === 0 ? 'Tell us about your farmland' : 'Choose the crop you want to grow this season'}
              </p>

              {step === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 22 }}>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Field name</label>
                    <input className="input" value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="e.g. Home paddy" disabled={submitting}/>
                  </div>
                  <div className="field">
                    <label>Scheme zone</label>
                    <select className="select" value={schemeId} onChange={(e) => setSchemeId(e.target.value)} disabled={submitting}>
                      <option value="H-04">Mahaweli H-04 (Thalawa)</option>
                      <option value="H-05">Mahaweli H-05 (Galnewa)</option>
                      <option value="H-07">Mahaweli H-07 (Nochchiyagama)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Area (hectares)</label>
                    <input className="input" type="number" step="0.1" value={areaHa} onChange={(e) => setAreaHa(e.target.value)} disabled={submitting}/>
                  </div>
                  <div className="field">
                    <label>Soil type</label>
                    <select className="select" value={soilType} onChange={(e) => setSoilType(e.target.value)} disabled={submitting}>
                      <option>Reddish-Brown Earth</option>
                      <option>Low-Humic Gley</option>
                      <option>Alluvial</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Latitude</label>
                    <input className="input" value={latitude} onChange={(e) => setLatitude(e.target.value)} disabled={submitting}/>
                  </div>
                  <div className="field">
                    <label>Longitude</label>
                    <input className="input" value={longitude} onChange={(e) => setLongitude(e.target.value)} disabled={submitting}/>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div style={{ marginTop: 22 }}>
                  <div className="field">
                    <label>Primary crop</label>
                    <select className="select" value={cropType} onChange={(e) => setCropType(e.target.value)} disabled={submitting}>
                      <option>Paddy Bg 352</option>
                      <option>Paddy Bg 360</option>
                      <option>Maize</option>
                      <option>Chili</option>
                      <option>Groundnut</option>
                      <option>Green gram</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || submitting}>
                  ← Back
                </button>
                {step === 0 ? (
                  <button className="btn btn-primary" onClick={() => setStep(1)} disabled={!fieldName.trim() || submitting}>
                    Continue →
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleFieldCreate} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create field →'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Device Pairing */}
          {step === 2 && (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>STEP 3</div>
              <h2 style={{ fontSize: 22, marginTop: 4 }}>Pair your sensor kit</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Enter the device ID printed on your kit's gateway.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22, marginTop: 22 }}>
                <div style={{ padding: 22, border: '2px dashed var(--primary)', background: 'var(--primary-50)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ width: 110, height: 110, margin: '0 auto', background: 'white', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="qr" size={80} color="var(--primary)"/>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13 }}>Device ID on gateway</div>
                  <div className="tiny muted">Look at the back of your ESP32 kit</div>
                </div>
                <div>
                  <div className="field">
                    <label>Device ID</label>
                    <input className="input" placeholder="HP-3A1F-9K22" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={submitting || pairingStatus === 'CONFIRMED'}/>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handlePairingInitiate} disabled={submitting || !!pairingSessionId}>
                    {submitting && !pairingSessionId ? 'Initiating...' : pairingSessionId ? 'Pairing initiated' : 'Initiate pairing'}
                  </button>

                  {pairingSessionId && pairingStatus !== 'CONFIRMED' && (
                    <div style={{ marginTop: 16, padding: 12, background: '#F6F8F4', borderRadius: 8 }}>
                      <div className="between">
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Pairing session</div>
                        <Chip kind="warn">{pairingStatus}</Chip>
                      </div>
                      <div className="tiny muted" style={{ marginTop: 6 }}>Session: {pairingSessionId}</div>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={handlePairingConfirm} disabled={submitting}>
                        {submitting ? 'Confirming...' : 'Confirm pairing'}
                      </button>
                    </div>
                  )}

                  {pairingStatus === 'CONFIRMED' && (
                    <div style={{ marginTop: 16, padding: 12, background: '#DCFCE7', borderRadius: 8 }}>
                      <div className="between">
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>Device paired</div>
                        <Chip kind="live">Connected</Chip>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={submitting}>← Back to crops</button>
                {pairingStatus === 'CONFIRMED' && (
                  <button className="btn btn-primary" onClick={() => setStep(3)}>Finish →</button>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 3 && (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <Icon name="check" size={60} color="var(--primary)"/>
              <h2 style={{ fontSize: 24, marginTop: 16 }}>All set, {displayName}!</h2>
              <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
                Your field is registered and the sensor is paired. You can start viewing telemetry and receiving auto-decisions.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
                <a href="/farmer" className="btn btn-primary">Go to dashboard →</a>
                <a href={createdFieldId ? `/farmer/field/${createdFieldId}` : '/farmer/fields'} className="btn btn-ghost">View field</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerOnboarding />
    </div>
  );
}

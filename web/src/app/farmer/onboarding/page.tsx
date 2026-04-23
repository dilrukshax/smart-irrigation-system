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

const FarmerOnboarding = () => {
  const step = 2; // show step 2
  const steps = ['Field Details', 'Crop Selection', 'Device Pairing', 'Review & Confirm'];
  return (
    <div className="asi-root" style={{ width: '100%', minHeight: 820, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppBar breadcrumb={['Onboarding']} user="Nimal Perera" role="Setup"/>
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

          <div className="card" style={{ padding: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>STEP 3</div>
            <h2 style={{ fontSize: 22, marginTop: 4 }}>Pair your sensor kit</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Scan the QR on the kit's gateway, or enter the 12-character device ID printed on the base.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22, marginTop: 22 }}>
              <div style={{ padding: 22, border: '2px dashed var(--primary)', background: 'var(--primary-50)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ width: 110, height: 110, margin: '0 auto', background: 'white', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="qr" size={80} color="var(--primary)"/>
                </div>
                <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13 }}>Scan QR with phone</div>
                <div className="tiny muted">Point camera at QR on gateway back</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Launch scanner</button>
              </div>
              <div>
                <div className="field"><label>Device ID</label><input className="input" placeholder="e.g. HP-3A1F-9K22" defaultValue="HP-3A1F-9K22"/></div>
                <div className="field" style={{ marginTop: 12 }}><label>Gateway network</label>
                  <select className="select"><option>LoRa 868 MHz · Thalawa cluster</option><option>Cellular LTE-M</option></select>
                </div>
                <div style={{ marginTop: 16, padding: 12, background: '#F6F8F4', borderRadius: 8 }}>
                  <div className="between">
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Connection test</div>
                    <Chip kind="live">Connected</Chip>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 6 }}>Last packet: 12s ago · RSSI −71 dBm · Battery 94%</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6, marginTop: 10 }}>
                    {['Moisture','Temp','Humidity','Valve'].map((s, i) => (
                      <div key={i} style={{ padding: 6, background: 'white', borderRadius: 6, textAlign: 'center' }}>
                        <Icon name={['humidity','thermo','cloud','valve'][i]} size={14} color="var(--primary)"/>
                        <div className="tiny" style={{ marginTop: 2 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
              <button className="btn btn-ghost">← Back to crops</button>
              <button className="btn btn-primary">Continue to review →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/* F1 Irrigation Module: Dashboard, Water Management, Sensor Telemetry */

// [9] IRRIGATION DASHBOARD

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerOnboarding />
    </div>
  );
}

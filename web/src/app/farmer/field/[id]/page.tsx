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

const FieldWorkspace = () => {
  const [tab, setTab] = React.useState(0);
  const tabs = ['Overview', 'Irrigation', 'Crop Health', 'Forecast', 'Optimization'];
  return (
    <Frame sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))} breadcrumb={['Farmer', 'My Fields', 'H-04 · Home paddy']} user="Nimal Perera" role="Farmer">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="page-title">H-04 · Home paddy</div>
            <Chip kind="live">Valve open · 00:42 elapsed</Chip>
          </div>
          <div className="page-sub">Paddy Bg 352 · 2.4 ha · Tillering stage · Coord 8.3421° N, 80.4891° E</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Export log</button>
          <button className="btn btn-primary btn-sm"><Icon name="droplet" size={13}/> Request irrigation</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className="btn btn-sm" style={{
            borderRadius: 0, background: 'transparent', height: 36, padding: '0 14px',
            color: tab === i ? 'var(--primary-600)' : 'var(--muted)', fontWeight: 600,
            borderBottom: tab === i ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <SchemeMap height={260} zones={[
                { x: 12, y: 18, w: 42, h: 30, color: '#66BB6A', stroke: '#2E7D32', label: 'A · 0.9 ha' },
                { x: 56, y: 22, w: 30, h: 26, color: '#81C784', stroke: '#2E7D32', label: 'B · 0.8 ha' },
                { x: 22, y: 52, w: 38, h: 30, color: '#FFB74D', stroke: '#B27500', label: 'C · 0.7 ha' },
              ]} markers={[{ x: 30, y: 32 }, { x: 68, y: 34 }, { x: 38, y: 64, color: '#F9A825' }]}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {[
                { label: 'Soil moisture', value: '62%', delta: '↑ 4%', icon: 'humidity', spark: [50,52,55,58,60,62,62] },
                { label: 'Temperature', value: '28.4°', delta: '↑ 0.6°', icon: 'thermo', spark: [27,27,28,28,29,28,28] },
                { label: 'Humidity', value: '74%', delta: '↓ 2%', icon: 'cloud', spark: [78,76,74,73,74,75,74] },
                { label: 'Water level', value: '41 mm', delta: '↓ 3', icon: 'droplet', spark: [48,46,44,43,42,41,41] },
              ].map((m, i) => (
                <div key={i} className="metric">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="metric-label">{m.label}</div>
                    <Icon name={m.icon} size={14} color="var(--muted)"/>
                  </div>
                  <div className="metric-value">{m.value}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className={`metric-delta ${m.delta.includes('↑') ? 'up' : 'down'}`}>{m.delta}</div>
                    <div style={{ flex: 1 }}/>
                    <Sparkline data={m.spark} width={60} height={22}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Valve & last irrigation</div>
              <Chip kind="live">Auto · on</Chip>
            </div>
            <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="valve" size={22}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Valve #A-041 open</div>
                <div className="tiny muted">4.2 L/s · started 06:18 · ETA 07:02</div>
              </div>
              <button className="btn btn-ghost btn-sm">Override</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Last 6 irrigations</div>
              {[
                ['Today 06:18', '18 mm', 'Auto · Low moisture'],
                ['Yesterday 05:42', '22 mm', 'Auto'],
                ['May 18 06:00', '32 mm', 'Release event'],
                ['May 17 05:58', '18 mm', 'Auto'],
                ['May 15 06:04', '24 mm', 'Manual · Officer'],
                ['May 13 05:52', '20 mm', 'Auto'],
              ].map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', padding: '7px 0', fontSize: 11.5, borderBottom: i < 5 ? '1px dashed var(--line)' : 'none' }}>
                  <span>{r[0]}</span>
                  <span className="tabular" style={{ fontWeight: 600 }}>{r[1]}</span>
                  <span className="muted">{r[2]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Auto decision status</div>
            <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-600)' }}>DECISION</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Open valve until 62% moisture</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>Model: ACA-I v0.7 · confidence 0.91 · soil below optimal band</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Manual request</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
                <div className="field"><label>Volume (mm)</label><input className="input" defaultValue="25"/></div>
                <div className="field"><label>When</label><input className="input" defaultValue="Tomorrow 05:30"/></div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><label>Reason</label><textarea className="textarea" rows="2" defaultValue="Soil crusting on east section. Requesting extra 7 mm beyond auto plan."/></div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 10, width: '100%' }}>Submit to officer</button>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Request history</div><Chip kind="info" dot={false}>7 records</Chip></div>
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead><tr><th>Date</th><th>Vol</th><th>Status</th><th>Officer</th></tr></thead>
              <tbody>
                {[['May 20', '25 mm', 'live', 'Approved', 'R. Silva'],
                  ['May 15', '30 mm', 'warn', 'Partial', 'R. Silva'],
                  ['May 11', '20 mm', 'live', 'Approved', 'D. Kumar'],
                  ['May 05', '18 mm', 'crit', 'Rejected', 'R. Silva'],
                  ['Apr 28', '22 mm', 'live', 'Approved', 'D. Kumar'],
                ].map((r, i) => (
                  <tr key={i}><td>{r[0]}</td><td className="tabular">{r[1]}</td><td><Chip kind={r[2]}>{r[3]}</Chip></td><td className="muted">{r[4]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Health score</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Gauge value={78} size={160} color="var(--primary)" sub="NDVI 0.76"/>
            </div>
            <div className="divider" style={{ margin: '14px 0' }}/>
            <div className="tiny muted">Last disease scan</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: 'linear-gradient(135deg, #A5D6A7, #66BB6A)' }}/>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Healthy · no disease</div>
                <div className="tiny muted">Yesterday 14:32 · conf 0.94</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Zone health</div>
            <SchemeMap height={180} zones={[
              { x: 10, y: 15, w: 40, h: 30, color: '#66BB6A', stroke: '#2E7D32', label: 'A · 0.86' },
              { x: 55, y: 20, w: 32, h: 26, color: '#81C784', stroke: '#2E7D32', label: 'B · 0.79' },
              { x: 20, y: 55, w: 40, h: 30, color: '#FFB74D', stroke: '#B27500', label: 'C · 0.54' },
            ]}/>
            <div className="divider" style={{ margin: '12px 0' }}/>
            <div className="tiny muted">3 zones · 1 stressed</div>
            <div className="tiny" style={{ color: 'var(--accent)', marginTop: 4 }}>Zone C showing nitrogen deficiency pattern</div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Stress alerts</div>
            {[
              { z: 'Zone C', s: 'warn', t: 'N-deficiency pattern', a: '3h ago' },
              { z: 'Zone C', s: 'warn', t: 'NDVI drop 0.08 in 48h', a: '1d ago' },
              { z: 'Zone A', s: 'info', t: 'Routine vigor scan', a: '2d ago' },
            ].map((a, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
                <div className="between"><Chip kind={a.s}>{a.z}</Chip><span className="tiny muted">{a.a}</span></div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>{a.t}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-head"><div className="card-title">14-day reservoir level & rainfall</div><Chip kind="live">P10/P50/P90</Chip></div>
            <ForecastChart width={700} height={260} days={14}/>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Risk band</div>
            <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              {['#66BB6A','#66BB6A','#81C784','#F9A825','#F9A825','#EF5350','#C62828','#EF5350','#F9A825','#81C784','#66BB6A','#66BB6A','#66BB6A','#81C784'].map((c, i) => (
                <div key={i} style={{ flex: 1, background: c, borderRight: i < 13 ? '1px solid rgba(255,255,255,0.3)' : 'none' }}/>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
              <span>Today</span><span>+7d</span><span>+14d</span>
            </div>
            <div className="divider" style={{ margin: '14px 0' }}/>
            <div className="tiny muted" style={{ marginBottom: 8 }}>Narrative</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Rainfall deficit forecast <b>days 5–8</b>. Combined with reservoir drawdown, risk peaks at <span style={{ color: 'var(--danger)' }}>critical on day 7</span>. Consider reducing irrigation by <b>15%</b> for days 1–4 to reserve quota.
            </div>
          </div>
        </div>
      )}

      {tab === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Recommended crops · next season</div>
            <table className="tbl">
              <thead><tr><th>Crop</th><th>Suitability</th><th>Yield</th><th>Profit</th><th>Water</th></tr></thead>
              <tbody>
                {[['Paddy Bg 352', 0.94, '4.8 t/ha', '286k', '720 mm'],
                  ['Paddy Bg 360', 0.88, '4.4 t/ha', '258k', '700 mm'],
                  ['Groundnut', 0.81, '2.1 t/ha', '312k', '480 mm'],
                  ['Green gram', 0.76, '1.4 t/ha', '202k', '380 mm'],
                  ['Maize', 0.62, '5.6 t/ha', '224k', '620 mm'],
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r[0]}</td>
                    <td style={{ width: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: (r[1]*100) + '%', background: r[1]>0.85?'var(--primary)':r[1]>0.7?'#8BC34A':'var(--accent)' }}/></div>
                        <span className="tabular small" style={{ fontWeight: 600 }}>{r[1].toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="tabular">{r[2]}</td>
                    <td className="tabular">LKR {r[3]}</td>
                    <td className="tabular muted">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>Water budget breakdown</div>
            <Donut
              size={140}
              segments={[
                { value: 48, color: 'var(--primary)' },
                { value: 32, color: 'var(--secondary)' },
                { value: 12, color: 'var(--accent)' },
                { value: 8, color: '#D9E5D4' },
              ]}
              center={<><div style={{ fontSize: 22, fontWeight: 700 }} className="tabular">980</div><div className="tiny muted">mm quota</div></>}
            />
            <div className="divider" style={{ margin: '14px 0' }}/>
            <div style={{ padding: 12, background: 'var(--accent-50)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7A5200', letterSpacing: '0.05em' }}>PLAN B · IF RAINFALL &lt; 60mm</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Switch 0.6 ha chili → green gram. Saves 110 mm. Keeps profit within 8% of Plan A.</div>
              <button className="btn btn-amber btn-sm" style={{ marginTop: 8 }}>Activate Plan B</button>
            </div>
          </div>
        </div>
      )}
    </Frame>
  );
};

// [8] FARMER ONBOARDING

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldWorkspace />
    </div>
  );
}

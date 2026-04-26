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
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const FieldList = () => {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const loadFields = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/farm/fields');
      const fieldList = Array.isArray(res) ? res : res?.fields || res?.data || [];
      setFields(fieldList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

  const filteredFields = fields.filter((f: any) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (f.field_name || '').toLowerCase().includes(q) ||
      (f.crop_type || '').toLowerCase().includes(q) ||
      (f.scheme_id || '').toLowerCase().includes(q)
    );
  });

  const totalArea = fields.reduce((sum: number, f: any) => sum + (Number(f.area_hectares) || 0), 0);
  const displayName = user?.username || 'Farmer';

  return (
    <Frame
      sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))}
      breadcrumb={['Farmer', 'My Fields']}
      user={displayName}
      role="Farmer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">My fields</div>
          <div className="page-sub">{fields.length} fields · {totalArea.toFixed(1)} ha total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 240, padding: '0 10px' }}>
            <Icon name="search" size={14} color="var(--muted)"/>
            <input
              placeholder="Search fields, crops, zones…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 12, fontFamily: 'inherit' }}
            />
          </div>
          <Link href="/farmer/onboarding" className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> Add field</Link>
        </div>
      </div>

      <ApiState loading={loading && fields.length === 0} error={error} onRetry={loadFields}>
        {fields.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <Icon name="leaf" size={40} color="var(--muted)"/>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>No fields yet</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 16 }}>
              Get started by registering your first field.
            </div>
            <Link href="/farmer/onboarding" className="btn btn-primary">
              <Icon name="plus" size={13}/> Create first field
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Crop</th>
                  <th>Area</th>
                  <th>Soil moisture</th>
                  <th>Valve</th>
                  <th>Last update</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFields.map((f: any) => {
                  const fieldId = f.field_id || f.id;
                  const fieldName = f.field_name || f.name || fieldId;
                  const cropType = f.crop_type || f.crop || 'Unknown';
                  const area = f.area_hectares || f.area || 0;
                  const telemetry = f.latest_telemetry || f.telemetry || {};
                  const moisture = telemetry.soil_moisture_pct ?? telemetry.soil_moisture ?? null;
                  const valveState = f.valve_state?.state || f.valve_state || 'Closed';
                  const isOpen = String(valveState).toLowerCase() === 'open';
                  const lastUpdate = telemetry.timestamp || f.updated_at || 'Never';
                  const healthState = moisture === null ? 'off' : moisture < 35 ? 'crit' : moisture < 50 ? 'warn' : 'live';
                  const latStr = f.latitude ? `${f.latitude.toFixed(2)}` : '';
                  const lonStr = f.longitude ? `${f.longitude.toFixed(2)}` : '';
                  const gpsStr = latStr && lonStr ? `GPS ${latStr}, ${lonStr}` : '';

                  return (
                    <tr key={fieldId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fieldName}</div>
                        {gpsStr && <div className="tiny muted">{gpsStr}</div>}
                      </td>
                      <td>{cropType}</td>
                      <td className="tabular">{area} ha</td>
                      <td style={{ width: 180 }}>
                        {moisture !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="prog" style={{ flex: 1 }}>
                              <div className="prog-fill" style={{ width: moisture + '%', background: moisture < 35 ? 'var(--danger)' : moisture < 50 ? 'var(--accent)' : 'var(--primary)' }}/>
                            </div>
                            <span className="tabular small" style={{ fontWeight: 600 }}>{Math.round(moisture)}%</span>
                          </div>
                        ) : (
                          <span className="tiny muted">No telemetry</span>
                        )}
                      </td>
                      <td>
                        <Chip kind={isOpen ? 'live' : 'off'}>{isOpen ? 'Open' : 'Closed'}</Chip>
                      </td>
                      <td className="muted small">
                        {lastUpdate === 'Never' ? 'Never' : new Date(lastUpdate).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/farmer/field/${fieldId}`} className="btn btn-ghost btn-sm">Workspace</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldList />
    </div>
  );
}

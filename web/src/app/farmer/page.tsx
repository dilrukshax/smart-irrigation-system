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
import { ApiState, InlineLoader } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const FarmerPortal = () => {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<any[]>([]);
  const [reservoir, setReservoir] = React.useState<any>(null);
  const [weather, setWeather] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fieldsRes, reservoirRes, weatherRes] = await Promise.allSettled([
        apiGet<any>('/farm/fields'),
        apiGet<any>('/water-management/reservoir/current'),
        apiGet<any>('/forecast/weather'),
      ]);

      if (fieldsRes.status === 'fulfilled') {
        const fieldList = Array.isArray(fieldsRes.value)
          ? fieldsRes.value
          : fieldsRes.value?.fields || fieldsRes.value?.data || [];
        setFields(fieldList);
      }
      if (reservoirRes.status === 'fulfilled') setReservoir(reservoirRes.value);
      if (weatherRes.status === 'fulfilled') setWeather(weatherRes.value);

      // If all failed, surface error
      if (fieldsRes.status === 'rejected' && reservoirRes.status === 'rejected' && weatherRes.status === 'rejected') {
        setError('Unable to load dashboard data. Please check your connection and try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute derived values
  const quota_mm = reservoir?.quota_mm || reservoir?.season_quota_mm || 980;
  const used_mm = reservoir?.used_mm || reservoir?.used_season_mm || 0;
  const remaining_mm = Math.max(0, quota_mm - used_mm);
  const percentUsed = quota_mm > 0 ? Math.round((used_mm / quota_mm) * 100) : 0;
  const weatherTemp = weather?.temperature_celsius ?? weather?.temperature ?? null;
  const weatherHumidity = weather?.humidity_percent ?? weather?.humidity ?? null;
  const weatherCondition = weather?.condition || weather?.description || 'Loading...';

  const displayName = user?.username || 'Farmer';
  const schemeLabel = user?.scheme_ids?.[0] || 'H-04';

  return (
    <Frame
      sidebar={farmerNav}
      breadcrumb={['Farmer', 'Dashboard']}
      user={displayName}
      role={`Farmer · ${schemeLabel}`}
    >
      <div className="page-head">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Good morning, {displayName}</div>
          <div className="page-title">Today's plan for Mahaweli {schemeLabel}</div>
          <div className="page-sub">{fields.length} field{fields.length !== 1 ? 's' : ''} · Maha season · Paddy growth stage: Tillering</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
          <Link href="/farmer/onboarding" className="btn btn-primary btn-sm"><Icon name="plus" size={13}/> New field</Link>
        </div>
      </div>

      <ApiState loading={loading && fields.length === 0} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {/* Water Budget */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Water budget</div>
                <div className="tiny muted">Maha 2025 · 120-day quota</div>
              </div>
              <Chip kind={percentUsed > 80 ? 'crit' : percentUsed > 60 ? 'warn' : 'live'}>
                {percentUsed > 80 ? 'Critical' : percentUsed > 60 ? 'Caution' : 'On track'}
              </Chip>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Gauge value={percentUsed} size={130} color="var(--accent)" label={`${percentUsed}%`} sub="of quota used"/>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><div className="tiny muted">Quota</div><div style={{ fontSize: 17, fontWeight: 700 }} className="tabular">{quota_mm} mm</div></div>
                <div><div className="tiny muted">Used</div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)' }} className="tabular">{Math.round(used_mm)} mm</div></div>
                <div><div className="tiny muted">Remaining</div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary)' }} className="tabular">{Math.round(remaining_mm)} mm</div></div>
              </div>
            </div>
            <div className="divider" style={{ margin: '14px 0 10px' }}/>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {reservoir?.status_message || `Source: ${reservoir?.source || 'live'}`}
            </div>
          </div>

          {/* Weather */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Weather</div>
              {weather ? (
                <Chip kind={weather.is_live ? 'live' : 'sim'}>{weather.is_live ? 'Live' : 'Cached'}</Chip>
              ) : (
                <InlineLoader/>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Icon name="cloud" size={46} color="var(--secondary)"/>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }} className="tabular">
                  {weatherTemp !== null ? `${weatherTemp.toFixed(1)}°C` : '—'}
                </div>
                <div className="tiny muted">
                  {weatherCondition}{weatherHumidity !== null ? ` · Humidity ${weatherHumidity}%` : ''}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="tiny muted" style={{ marginBottom: 4 }}>Source</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{weather?.source || weather?.data_source || 'Open-Meteo'}</div>
            </div>
          </div>

          {/* Quick scenario - static until planner is used */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Quick scenario</div>
              <Chip kind="sim" dot={false}>Simulator</Chip>
            </div>
            <div className="tiny muted">Run adaptive optimization for your fields</div>
            <div style={{ fontSize: 12, marginTop: 12, color: 'var(--muted)' }}>
              Configure your constraints on the <Link href="/optimization/planner" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Planner page</Link> to generate an optimal crop allocation.
            </div>
            <div style={{ marginTop: 16 }}>
              <Link href="/optimization/adaptive" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                <Icon name="target" size={13}/> Open adaptive tuning
              </Link>
            </div>
          </div>
        </div>

        {/* Field overview */}
        <div style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Fields</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link href="/farmer/fields" className="btn btn-ghost btn-sm">View all ({fields.length})</Link>
              </div>
            </div>
            {fields.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No fields yet. <Link href="/farmer/onboarding" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Create your first field →</Link>
              </div>
            ) : (
              fields.slice(0, 5).map((f: any, i: number) => {
                const fieldId = f.field_id || f.id;
                const fieldName = f.field_name || f.name || fieldId;
                const cropType = f.crop_type || f.crop || 'Unknown';
                const area = f.area_hectares || f.area || 0;
                const telemetry = f.latest_telemetry || f.telemetry || {};
                const moisture = telemetry.soil_moisture_pct ?? telemetry.soil_moisture ?? null;
                const valveState = f.valve_state?.state || f.valve_state || f.valve || 'Closed';
                const isOpen = String(valveState).toLowerCase() === 'open';
                const healthState = moisture === null ? 'off' : moisture < 35 ? 'crit' : moisture < 50 ? 'warn' : 'live';

                return (
                  <Link
                    key={fieldId || i}
                    href={`/farmer/field/${fieldId}`}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 0.6fr', gap: 12, padding: '12px 0', borderBottom: i < Math.min(fields.length - 1, 4) ? '1px solid var(--line)' : 'none', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{fieldName}</div>
                      <div className="tiny muted">{cropType} · {area} ha</div>
                    </div>
                    <div>
                      <div className="tiny muted">Soil moisture</div>
                      {moisture !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="prog" style={{ flex: 1 }}>
                            <div className="prog-fill" style={{ width: moisture + '%', background: moisture < 35 ? 'var(--danger)' : moisture < 50 ? 'var(--accent)' : 'var(--primary)' }}/>
                          </div>
                          <div className="tabular small" style={{ fontWeight: 600 }}>{Math.round(moisture)}%</div>
                        </div>
                      ) : (
                        <div className="tiny muted">No data</div>
                      )}
                    </div>
                    <Chip kind={isOpen ? 'live' : 'off'}>{isOpen ? <Icon name="valve" size={10}/> : null} {isOpen ? 'Open' : 'Closed'}</Chip>
                    <Chip kind={healthState}>{healthState === 'live' ? 'Healthy' : healthState === 'warn' ? 'Stressed' : healthState === 'crit' ? 'Critical' : 'Unknown'}</Chip>
                    <Icon name="arrow" size={14} color="var(--muted)"/>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerPortal />
    </div>
  );
}

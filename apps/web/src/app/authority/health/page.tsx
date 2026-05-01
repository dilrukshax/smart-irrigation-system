/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { buildAuthorityNav } from '@/components/asi/nav';
import { Chip, Frame, Icon } from '@/components/asi/ui';
import { useAuth } from '@/lib/auth';
import {
  getGatewayBaseUrl,
  getStatusChipKind,
} from '../_lib/authority-dashboard';

const StatCard = ({ label, value, detail }) => (
  <div className="card" style={{ padding: 16 }}>
    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    <div className="tiny muted" style={{ marginTop: 4 }}>{detail}</div>
  </div>
);

async function loadGatewayHealth() {
  const baseUrl = getGatewayBaseUrl();
  const [gatewayResponse, servicesResponse] = await Promise.all([
    fetch(`${baseUrl}/health`),
    fetch(`${baseUrl}/services/health`),
  ]);

  if (!gatewayResponse.ok) {
    throw new Error(`Gateway health check failed with ${gatewayResponse.status}`);
  }

  if (!servicesResponse.ok) {
    throw new Error(`Service health check failed with ${servicesResponse.status}`);
  }

  return {
    gateway: await gatewayResponse.json(),
    services: await servicesResponse.json(),
  };
}

function SystemHealthScreen() {
  const { user } = useAuth();
  const [gateway, setGateway] = React.useState<any>(null);
  const [services, setServices] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadGatewayHealth();
      setGateway(data.gateway);
      setServices(data.services || {});
    } catch (err: any) {
      setError(err?.message || 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const serviceEntries = Object.entries(services).sort(([left], [right]) => left.localeCompare(right));
  const healthyCount = serviceEntries.filter(([, value]) => value.status === 'healthy').length;
  const degradedCount = serviceEntries.filter(([, value]) => value.status !== 'healthy').length;
  const displayName = user?.username || 'Authority';

  return (
    <Frame
      sidebar={buildAuthorityNav('System Health')}
      breadcrumb={['Authority', 'System Health']}
      user={displayName}
      role="Authority"
    >
      <div className="page-head">
        <div>
          <div className="page-title">System health</div>
          <div className="page-sub">Live gateway and upstream service availability</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <StatCard label="Gateway" value={gateway?.status || '—'} detail={gateway?.service ? `${gateway.service} ${gateway.version || ''}`.trim() : 'Gateway status'} />
          <StatCard label="Healthy services" value={healthyCount} detail="Upstream services responding normally" />
          <StatCard label="Attention needed" value={degradedCount} detail="Services that are unavailable or unhealthy" />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ padding: '16px 16px 10px' }}>
            <div className="card-title">Service status</div>
            <Chip kind={getStatusChipKind(gateway?.status)} dot={false}>
              {gateway?.status || 'unknown'}
            </Chip>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Service</th>
                  <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Status</th>
                  <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Endpoint</th>
                  <th style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {serviceEntries.map(([serviceName, state]) => (
                  <tr key={serviceName}>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', fontWeight: 600 }}>
                      {serviceName}
                    </td>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                      <Chip kind={getStatusChipKind(state.status)}>
                        {state.status || 'unknown'}
                      </Chip>
                    </td>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                      {state.url || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', color: state.error ? 'var(--danger)' : 'var(--muted)' }}>
                      {state.error || 'Healthy response'}
                    </td>
                  </tr>
                ))}
                {serviceEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px 16px', borderTop: '1px solid var(--line)', textAlign: 'center', color: 'var(--muted)' }}>
                      No service status payload returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ApiState>
    </Frame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <SystemHealthScreen />
    </div>
  );
}

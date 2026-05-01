/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { Icon, Chip, Frame, Progress } from '@/components/asi/ui';
import { officerModuleNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const asNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPct = (value: any, digits = 0) => {
  const parsed = asNumber(value);
  return parsed === null ? '-' : `${parsed.toFixed(digits)}%`;
};

const formatRelative = (value: any) => {
  if (!value) return 'No telemetry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No telemetry';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
};

const statusKind = (value: any) => {
  const text = String(value || '').toUpperCase();
  if (['CRITICAL', 'SOURCE_UNAVAILABLE'].includes(text)) return 'crit';
  if (['WARNING', 'IRRIGATING', 'LOW', 'DRY', 'STALE'].includes(text)) return 'warn';
  if (['OK', 'OPTIMAL', 'OPEN', 'LIVE'].includes(text)) return 'live';
  return 'off';
};

export default function Page() {
  const { user } = useAuth();
  const [payload, setPayload] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [positions, setPositions] = React.useState<Record<string, string>>({});
  const [actingOn, setActingOn] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ type: string; text: string } | null>(null);

  const loadValves = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path = statusFilter === 'ALL'
        ? '/irrigation/officer/valves'
        : `/irrigation/officer/valves?status=${encodeURIComponent(statusFilter)}`;
      const res = await apiGet<any>(path);
      setPayload(res);
      const nextPositions: Record<string, string> = {};
      (res?.items || []).forEach((field: any) => {
        const fieldId = field.field_id || field.id;
        const current = field.valve_state?.position_pct ?? field.valve_position_pct ?? 100;
        nextPositions[fieldId] = String(Math.max(1, Math.min(100, Number(current) || 100)));
      });
      setPositions(nextPositions);
    } catch (err: any) {
      setError(err?.message || 'Failed to load valve state');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadValves();
  }, [loadValves]);

  const sendCommand = async (field: any, action: 'OPEN' | 'CLOSE' | 'AUTO') => {
    const fieldId = field.field_id || field.id;
    if (!fieldId) return;

    const requestedPosition = Math.max(0, Math.min(100, Number(positions[fieldId]) || 100));
    const positionPct = action === 'CLOSE' ? 0 : requestedPosition;
    setActingOn(`${fieldId}:${action}`);
    setMessage(null);
    try {
      await apiPost(`/irrigation/fields/${encodeURIComponent(fieldId)}/commands`, {
        action,
        position_pct: action === 'AUTO' ? 100 : positionPct,
        reason: action === 'AUTO'
          ? 'Operator restored automatic valve control'
          : `Operator ${action.toLowerCase()} command from valve control`,
      });
      setMessage({ type: 'success', text: `${field.field_name || fieldId} updated` });
      await loadValves();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Valve command failed' });
    } finally {
      setActingOn(null);
    }
  };

  const fields = Array.isArray(payload?.items) ? payload.items : [];
  const filteredFields = fields.filter((field: any) => {
    const haystack = [
      field.field_name,
      field.field_id,
      field.owner_id,
      field.scheme_id,
      field.device_id,
      field.crop_type,
    ].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const displayName = user?.username || 'Officer';
  const openValves = Number(payload?.open_valves || 0);
  const closedValves = Number(payload?.closed_valves || 0);
  const autoEnabled = Number(payload?.auto_control_enabled_fields || 0);
  const pendingRequests = Number(payload?.pending_manual_requests || 0);

  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Frame
        sidebar={officerModuleNav('Irrigation', 'Valve Control')}
        breadcrumb={['Modules', 'F1 · Irrigation', 'Valve Control']}
        user={displayName}
        role="Officer"
      >
        <div className="page-head">
          <div>
            <div className="page-title">Valve control</div>
            <div className="page-sub">{payload?.total_fields || 0} controlled fields · {openValves} open · {pendingRequests} pending requests</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadValves}>
            <Icon name="download" size={13}/> Refresh
          </button>
        </div>

        {message && (
          <div style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${message.type === 'success' ? '#86EFAC' : '#FECACA'}`,
            background: message.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: message.type === 'success' ? '#166534' : '#B91C1C',
            fontSize: 12.5,
          }}>
            {message.text}
          </div>
        )}

        <ApiState loading={loading && !payload} error={error} onRetry={loadValves}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div className="metric"><div className="metric-label">Fields</div><div className="metric-value">{payload?.total_fields || 0}</div></div>
            <div className="metric"><div className="metric-label">Open valves</div><div className="metric-value">{openValves}</div></div>
            <div className="metric"><div className="metric-label">Closed valves</div><div className="metric-value">{closedValves}</div></div>
            <div className="metric"><div className="metric-label">Auto control</div><div className="metric-value">{autoEnabled}</div></div>
            <div className="metric"><div className="metric-label">Pending requests</div><div className="metric-value">{pendingRequests}</div></div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 240 }}>
                <Icon name="search" size={15} color="var(--muted)"/>
                <input
                  className="input"
                  style={{ height: 34 }}
                  placeholder="Search fields, farmers, schemes, devices..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                className="select"
                style={{ height: 34, width: 150 }}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">All valves</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
              <Chip kind="info" dot={false}>{filteredFields.length} shown</Chip>
            </div>

            {filteredFields.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No valve-controlled fields match this view
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Telemetry</th>
                      <th>Valve</th>
                      <th>Auto</th>
                      <th>Position</th>
                      <th>Requests</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.map((field: any) => {
                      const fieldId = field.field_id || field.id;
                      const latest = field.latest_telemetry || {};
                      const valve = field.valve_state || {};
                      const valveStatus = String(valve.status || 'CLOSED').toUpperCase();
                      const valveOpen = valveStatus === 'OPEN';
                      const pending = Number(field.pending_manual_request_count || 0);
                      const actionBase = `${fieldId}:`;

                      return (
                        <tr key={fieldId}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{field.field_name || fieldId}</div>
                            <div className="tiny muted">{field.crop_type || 'unassigned'} · {field.scheme_id || 'no scheme'} · {field.device_id || 'no device'}</div>
                          </td>
                          <td style={{ minWidth: 190 }}>
                            <div className="between tiny">
                              <span className="muted">Soil</span>
                              <b>{formatPct(latest.soil_moisture_pct)}</b>
                            </div>
                            <Progress value={asNumber(latest.soil_moisture_pct) || 0} size="sm" color="var(--primary)"/>
                            <div className="tiny muted" style={{ marginTop: 5 }}>{formatRelative(latest.timestamp)}</div>
                          </td>
                          <td>
                            <Chip kind={valveOpen ? 'live' : 'off'}>{valveOpen ? `Open ${valve.position_pct || 0}%` : 'Closed'}</Chip>
                            <div className="tiny muted" style={{ marginTop: 5 }}>{field.overall_status || field.status || 'unknown'}</div>
                          </td>
                          <td><Chip kind={field.auto_control_enabled ? 'live' : 'warn'}>{field.auto_control_enabled ? 'Enabled' : 'Manual'}</Chip></td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="1"
                              max="100"
                              style={{ width: 82, height: 32 }}
                              value={positions[fieldId] || '100'}
                              onChange={(event) => setPositions((current) => ({ ...current, [fieldId]: event.target.value }))}
                            />
                          </td>
                          <td><Chip kind={pending > 0 ? 'warn' : 'live'}>{pending} pending</Chip></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={actingOn?.startsWith(actionBase)}
                                onClick={() => sendCommand(field, 'OPEN')}
                              >
                                Open
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={actingOn?.startsWith(actionBase)}
                                onClick={() => sendCommand(field, 'CLOSE')}
                              >
                                Close
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={actingOn?.startsWith(actionBase)}
                                onClick={() => sendCommand(field, 'AUTO')}
                              >
                                Auto
                              </button>
                              <Link href={`/operations/fields/${encodeURIComponent(fieldId)}`} className="btn btn-ghost btn-sm">
                                Details
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ApiState>
      </Frame>
    </div>
  );
}

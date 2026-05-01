/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import {
  Icon,
  Chip,
  Frame,
  Gauge,
} from '@/components/asi/ui';
import { officerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const Hydraulics = () => {
  const { user } = useAuth();
  const [networkState, setNetworkState] = React.useState<any>(null);
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [reservoir, setReservoir] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Add release form
  const [nodeId, setNodeId] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [flowRate, setFlowRate] = React.useState('2.0');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitMsg, setSubmitMsg] = React.useState<{ type: string; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [netRes, schedRes, resRes] = await Promise.allSettled([
        apiGet<any>('/irrigation/network/state'),
        apiGet<any>('/irrigation/network/schedules'),
        apiGet<any>('/water-management/reservoir/current'),
      ]);
      if (netRes.status === 'fulfilled') {
        setNetworkState(netRes.value);
        if (netRes.value?.reservoir) setReservoir(netRes.value.reservoir);
      }
      if (schedRes.status === 'fulfilled') {
        const list = Array.isArray(schedRes.value) ? schedRes.value : schedRes.value?.items || schedRes.value?.schedules || schedRes.value?.data || [];
        setSchedules(list);
      }
      if (resRes.status === 'fulfilled') setReservoir(resRes.value);

      if (netRes.status === 'rejected' && schedRes.status === 'rejected') {
        setError('Unable to load hydraulics data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId || !startTime || !endTime) {
      setSubmitMsg({ type: 'error', text: 'Node, start, and end time are required' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const selectedNode = nodes.find((node: any) => node.node_id === nodeId);
      const nodeType = String(selectedNode?.node_type || '').toLowerCase();
      const schemeId = networkState?.scheme_id || user?.scheme_ids?.[0];
      if (!schemeId) {
        throw new Error('No assigned scheme available for scheduling');
      }
      const nodePayload: Record<string, string> = {};
      if (['canal', 'tunnel', 'channel', 'turnout'].includes(nodeType)) {
        nodePayload[`${nodeType}_id`] = nodeId;
      }

      await apiPost('/irrigation/network/schedules', {
        scheme_id: schemeId,
        ...nodePayload,
        action: 'OPEN',
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        expected_flow_m3s: parseFloat(flowRate) || undefined,
        reason: selectedNode?.display_name ? `Operator scheduled release for ${selectedNode.display_name}` : 'Operator scheduled release',
      });
      setSubmitMsg({ type: 'success', text: 'Release queued successfully' });
      loadData();
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err?.message || 'Failed to queue release' });
    } finally {
      setSubmitting(false);
    }
  };

  const capacity = Number(reservoir?.capacity_mcm ?? reservoir?.total_storage_mcm ?? 0);
  const currentVolume = Number(reservoir?.active_storage_mcm ?? 0);
  const percentFull = capacity > 0 ? Math.round((currentVolume / capacity) * 100) : 0;

  const nodes = networkState?.topology || networkState?.nodes || [];
  const scheduleNodes = nodes.filter((node: any) => ['canal', 'tunnel', 'channel', 'turnout'].includes(String(node.node_type || '').toLowerCase()));
  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={officerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'Hydraulics' })) }))}
      breadcrumb={['Operations', 'Hydraulics']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Hydraulics schedule</div>
          <div className="page-sub">{schedules.length} scheduled releases · {nodes.length} network nodes</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading && !networkState} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Scheduled releases</div>
              <Chip kind="info" dot={false}>{schedules.length} total</Chip>
            </div>
            {schedules.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No scheduled releases
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Node</th>
                    <th>Action</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Flow</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.slice(0, 20).map((s: any, i: number) => (
                    <tr key={s.schedule_id || i}>
                      <td style={{ fontWeight: 600 }}>{s.turnout_id || s.channel_id || s.tunnel_id || s.canal_id || '—'}</td>
                      <td>{s.action || '—'}</td>
                      <td className="muted small">
                        {s.start_time ? new Date(s.start_time).toLocaleString() : '—'}
                      </td>
                      <td className="muted small">
                        {s.end_time ? new Date(s.end_time).toLocaleString() : '—'}
                      </td>
                      <td className="tabular">{s.expected_flow_m3s?.toFixed(1) ?? '—'} m³/s</td>
                      <td>
                        <Chip kind={s.status === 'ACCEPTED' ? 'live' : s.status === 'REJECTED' || s.status === 'CANCELLED' ? 'crit' : 'warn'}>
                          {s.status || 'PENDING'}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-head" style={{ justifyContent: 'center' }}>
                <div className="card-title">Reservoir</div>
              </div>
              <Gauge value={percentFull} size={170} stroke={18} color="var(--secondary)" sub={`${currentVolume.toFixed(1)} MCM`}/>
              <div style={{ marginTop: 12, padding: 10, background: '#F6F8F4', borderRadius: 8, fontSize: 12 }}>
                <div className="between">
                  <span className="muted">Capacity</span>
                    <span className="tabular" style={{ fontWeight: 700 }}>{capacity > 0 ? `${capacity} MCM` : 'Unavailable'}</span>
                </div>
                {reservoir?.inflow_mcm !== undefined && (
                  <div className="between" style={{ marginTop: 4 }}>
                    <span className="muted">Inflow</span>
                    <span className="tabular" style={{ fontWeight: 700 }}>{reservoir.inflow_mcm?.toFixed(1)} MCM</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Add release</div>
              <form onSubmit={handleAddRelease}>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Node / canal</label>
                  <select className="select" value={nodeId} onChange={(e) => setNodeId(e.target.value)} disabled={submitting}>
                    <option value="">Select node...</option>
                    {scheduleNodes.map((n: any) => (
                      <option key={n.node_id} value={n.node_id}>
                        {n.display_name || n.node_id} · {n.node_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Start time</label>
                  <input className="input" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={submitting}/>
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>End time</label>
                  <input className="input" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={submitting}/>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Expected flow (m³/s)</label>
                  <input className="input" type="number" step="0.1" min="0" value={flowRate} onChange={(e) => setFlowRate(e.target.value)} disabled={submitting}/>
                </div>
                {submitMsg && (
                  <div style={{
                    marginBottom: 10,
                    padding: 8,
                    background: submitMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    border: `1px solid ${submitMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                    borderRadius: 6,
                    color: submitMsg.type === 'success' ? '#166534' : '#DC2626',
                    fontSize: 11,
                  }}>
                    {submitMsg.text}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? 'Queuing...' : 'Queue release'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <Hydraulics />
    </div>
  );
}

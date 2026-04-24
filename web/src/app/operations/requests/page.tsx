/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import {
  Icon,
  Chip,
  Frame,
} from '@/components/asi/ui';
import { officerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ManualRequests = () => {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actingOn, setActingOn] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState<Record<string, string>>({});

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/irrigation/manual-requests');
      const list = Array.isArray(res) ? res : res?.requests || res?.data || [];
      setRequests(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReview = async (requestId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    setActingOn(requestId);
    try {
      await apiPost(`/irrigation/manual-requests/${requestId}/review`, {
        decision,
        note: reason || '',
      });
      await loadData();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActingOn(null);
    }
  };

  const filteredRequests = requests.filter((r: any) => {
    const status = (r.status || '').toUpperCase();
    return status === tab;
  });

  const pendingCount = requests.filter((r: any) => (r.status || '').toUpperCase() === 'PENDING').length;
  const approvedCount = requests.filter((r: any) => (r.status || '').toUpperCase() === 'APPROVED').length;
  const rejectedCount = requests.filter((r: any) => (r.status || '').toUpperCase() === 'REJECTED').length;

  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={officerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'Manual Requests' })) }))}
      breadcrumb={['Operations', 'Manual Requests']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Manual request review</div>
          <div className="page-sub">Approve or reject with reason · {pendingCount} pending</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        {[
          ['PENDING', `Pending (${pendingCount})`],
          ['APPROVED', `Approved (${approvedCount})`],
          ['REJECTED', `Rejected (${rejectedCount})`],
        ].map(([val, label]: any) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className="btn btn-sm"
            style={{
              borderRadius: 0,
              background: 'transparent',
              height: 34,
              padding: '0 14px',
              color: tab === val ? 'var(--primary-600)' : 'var(--muted)',
              fontWeight: 600,
              borderBottom: tab === val ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <ApiState loading={loading && requests.length === 0} error={error} onRetry={loadData}>
        {filteredRequests.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Icon name="bell" size={40} color="var(--muted)"/>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No {tab.toLowerCase()} requests</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 12 }}>
            {filteredRequests.map((r: any) => {
              const requestId = r.request_id || r.id;
              const fieldName = r.field_name || r.field_id || '—';
              const farmerName = r.farmer_name || r.requested_by || 'Unknown';
              const action = r.requested_action || 'OPEN';
              const positionPct = r.requested_position_pct ?? 100;
              const reason = r.reason || '';
              const decision = r.source_decision || {};
              const status = (r.status || '').toUpperCase();
              const createdAt = r.created_at || r.submitted_at;

              return (
                <div key={requestId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }} className="between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{fieldName}</div>
                      <div className="tiny muted">
                        {farmerName} · {createdAt ? new Date(createdAt).toLocaleString() : '—'}
                      </div>
                    </div>
                    <Chip kind={status === 'PENDING' ? 'warn' : status === 'APPROVED' ? 'live' : 'crit'}>
                      {status}
                    </Chip>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="between small">
                      <span className="muted">Action</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {action} {positionPct !== null && `(${positionPct}%)`}
                      </span>
                    </div>
                    {reason && (
                      <div style={{
                        fontSize: 12.5,
                        marginTop: 8,
                        padding: 10,
                        background: '#FBFCF9',
                        borderRadius: 6,
                        borderLeft: '2px solid var(--border)',
                        fontStyle: 'italic',
                      }}>
                        "{reason}"
                      </div>
                    )}
                    {decision.model_name && (
                      <div style={{ marginTop: 10 }}>
                        <div className="tiny muted">ML recommendation</div>
                        <div className="small" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                          {decision.decision || '—'} (confidence {decision.confidence?.toFixed(2) ?? 'N/A'})
                        </div>
                      </div>
                    )}

                    {status === 'PENDING' && (
                      <>
                        <div className="field" style={{ marginTop: 14 }}>
                          <label style={{ fontSize: 11 }}>Optional note</label>
                          <input
                            className="input"
                            placeholder="Add a note..."
                            value={rejectReason[requestId] || ''}
                            onChange={(e) => setRejectReason(prev => ({ ...prev, [requestId]: e.target.value }))}
                            disabled={actingOn === requestId}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleReview(requestId, 'REJECT', rejectReason[requestId])}
                            disabled={actingOn === requestId}
                          >
                            Reject
                          </button>
                          <div style={{ flex: 1 }}/>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReview(requestId, 'APPROVE', rejectReason[requestId])}
                            disabled={actingOn === requestId}
                          >
                            {actingOn === requestId ? 'Processing...' : 'Approve'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <ManualRequests />
    </div>
  );
}

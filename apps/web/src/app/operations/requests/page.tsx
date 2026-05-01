/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Icon,
  Chip,
  Frame,
} from '@/components/asi/ui';
import { buildOfficerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type RequestTab = 'PENDING' | 'MANAGED' | 'REJECTED' | 'CLOSED' | 'ALL';

const normalizedStatus = (value: any) => String(value || '').toUpperCase();

const statusKind = (value: any): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const status = normalizedStatus(value);
  if (status === 'PENDING') return 'warn';
  if (status === 'EXECUTED' || status === 'APPROVED') return 'live';
  if (status === 'REJECTED') return 'crit';
  if (status === 'CLOSED') return 'off';
  return 'info';
};

const formatRelative = (value: any) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
};

const requestMatchesTab = (request: any, tab: RequestTab) => {
  const status = normalizedStatus(request?.status);
  if (tab === 'ALL') return true;
  if (tab === 'MANAGED') return status === 'EXECUTED' || status === 'APPROVED';
  return status === tab;
};

const lastAuditEntry = (request: any) => {
  const audit = Array.isArray(request?.audit) ? request.audit : [];
  if (!audit.length) return null;
  return [...audit].sort((a, b) => {
    const aTime = new Date(a.created_at || a.timestamp || 0).getTime();
    const bTime = new Date(b.created_at || b.timestamp || 0).getTime();
    return bTime - aTime;
  })[0];
};

const auditLabel = (entry: any) => {
  if (!entry) return null;
  return entry.event_type || entry.action || entry.status || 'Updated';
};

const requestScopeLabel = (farmerId: string, fieldId: string) => {
  if (farmerId) return `Farmer ${farmerId}`;
  if (fieldId) return `Field ${fieldId}`;
  return null;
};

const ManualRequests = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState<RequestTab>('PENDING');
  const [requests, setRequests] = React.useState<any[]>([]);
  const [farmers, setFarmers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [notesByRequest, setNotesByRequest] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState('');

  const scopedFarmerId = (searchParams.get('farmer') || '').trim();
  const scopedFieldId = (searchParams.get('field') || '').trim();
  const scopedRequestId = (searchParams.get('request') || '').trim();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestRes, farmerRes] = await Promise.allSettled([
        apiGet<any>('/irrigation/manual-requests'),
        apiGet<any>('/farm/farmers'),
      ]);

      if (requestRes.status === 'fulfilled') {
        const list = Array.isArray(requestRes.value)
          ? requestRes.value
          : requestRes.value?.items || requestRes.value?.requests || requestRes.value?.data || [];
        setRequests(list);
      } else {
        setRequests([]);
      }

      if (farmerRes.status === 'fulfilled') {
        setFarmers(Array.isArray(farmerRes.value?.items) ? farmerRes.value.items : []);
      } else {
        setFarmers([]);
      }

      if (requestRes.status === 'rejected' && farmerRes.status === 'rejected') {
        setError('Failed to load request queue');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const farmerIndex = React.useMemo(() => {
    const index = new Map<string, any>();
    farmers.forEach((farmer: any) => {
      const farmerId = farmer.farmer_id || farmer.owner_id;
      if (farmerId) index.set(String(farmerId), farmer);
    });
    return index;
  }, [farmers]);

  const pendingCount = requests.filter((r: any) => normalizedStatus(r.status) === 'PENDING').length;
  const managedCount = requests.filter((r: any) => ['APPROVED', 'EXECUTED'].includes(normalizedStatus(r.status))).length;
  const rejectedCount = requests.filter((r: any) => normalizedStatus(r.status) === 'REJECTED').length;
  const closedCount = requests.filter((r: any) => normalizedStatus(r.status) === 'CLOSED').length;

  const enrichedRequests = React.useMemo(() => (
    requests.map((request: any) => {
      const farmerId = String(request.requested_by || request.farmer_id || '').trim();
      const farmer = farmerId ? farmerIndex.get(farmerId) : null;
      const farmerName = farmer?.display_name || request.farmer_name || farmerId || 'Unknown farmer';
      const latestAudit = lastAuditEntry(request);
      return {
        ...request,
        farmerId,
        farmerName,
        farmerDisplayName: farmerName,
        latestAudit,
      };
    })
  ), [farmerIndex, requests]);

  const filteredRequests = React.useMemo(() => {
    const scopeText = query.trim().toLowerCase();
    return enrichedRequests.filter((request: any) => {
      if (!requestMatchesTab(request, tab)) return false;
      if (scopedRequestId && String(request.request_id || request.id || '') !== scopedRequestId) return false;
      if (scopedFieldId && String(request.field_id || '') !== scopedFieldId) return false;
      if (scopedFarmerId && String(request.farmerId || '') !== scopedFarmerId) return false;
      if (!scopeText) return true;
      const haystack = [
        request.request_id,
        request.field_id,
        request.field_name,
        request.scheme_id,
        request.farmerId,
        request.farmerDisplayName,
        request.requested_action,
        request.reason,
        request.policy_context?.blocked_reason,
        request.latestAudit?.note,
        request.latestAudit?.event_type,
        request.status,
      ].join(' ').toLowerCase();
      return haystack.includes(scopeText);
    });
  }, [enrichedRequests, query, scopedFarmerId, scopedFieldId, scopedRequestId, tab]);

  const handleReview = async (requestId: string, decision: 'APPROVE' | 'REJECT', note?: string) => {
    setActioningId(requestId);
    try {
      await apiPost(`/irrigation/manual-requests/${requestId}/review`, {
        decision,
        note: note || '',
      });
      await loadData();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleClose = async (requestId: string) => {
    setActioningId(requestId);
    try {
      await apiPost(`/irrigation/manual-requests/${requestId}/close`, {
        note: notesByRequest[requestId] || '',
      });
      await loadData();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActioningId(null);
    }
  };

  const sidebar = buildOfficerNav('Manual Requests', {
    'Manual Requests': pendingCount || undefined,
  });
  const displayName = user?.username || 'Officer';
  const activeScope = requestScopeLabel(scopedFarmerId, scopedFieldId);

  return (
    <Frame
      sidebar={sidebar}
      breadcrumb={['Operations', 'Manual Requests']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Manual request review</div>
          <div className="page-sub">
            Farmer-submitted irrigation overrides with full lifecycle tracking
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div className="metric"><div className="metric-label">Pending</div><div className="metric-value">{pendingCount}</div></div>
        <div className="metric"><div className="metric-label">Managed</div><div className="metric-value">{managedCount}</div></div>
        <div className="metric"><div className="metric-label">Rejected</div><div className="metric-value">{rejectedCount}</div></div>
        <div className="metric"><div className="metric-label">Closed</div><div className="metric-value">{closedCount}</div></div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="search" size={15} color="var(--muted)"/>
            <input
              className="input"
              style={{ height: 36 }}
              placeholder="Search request, field, farmer, reason..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {activeScope && <Chip kind="info" dot={false}>{activeScope}</Chip>}
          {scopedRequestId && <Chip kind="warn" dot={false}>Request {scopedRequestId}</Chip>}
          <Chip kind="info" dot={false}>{filteredRequests.length} shown</Chip>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['PENDING', `Pending (${pendingCount})`],
          ['MANAGED', `Managed (${managedCount})`],
          ['REJECTED', `Rejected (${rejectedCount})`],
          ['CLOSED', `Closed (${closedCount})`],
          ['ALL', `All (${requests.length})`],
        ].map(([value, label]: any) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className="btn btn-sm"
            style={{
              borderRadius: 0,
              background: 'transparent',
              height: 34,
              padding: '0 14px',
              color: tab === value ? 'var(--primary-600)' : 'var(--muted)',
              fontWeight: 600,
              borderBottom: tab === value ? '2px solid var(--primary)' : '2px solid transparent',
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
            <Icon name="handshake" size={40} color="var(--muted)"/>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No matching requests</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              Try a different tab or clear the current search/filter scope.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(430px, 1fr))', gap: 12 }}>
            {filteredRequests.map((request: any) => {
              const requestId = request.request_id || request.id;
              const fieldId = request.field_id || '';
              const fieldName = request.field_name || fieldId || '—';
              const farmerId = request.farmerId;
              const status = normalizedStatus(request.status);
              const action = request.requested_action || 'OPEN';
              const positionPct = request.requested_position_pct;
              const createdAt = request.created_at || request.submitted_at;
              const latestAuditEntry = request.latestAudit;
              const policyContext = request.policy_context || {};
              const focusMatch = scopedRequestId && requestId === scopedRequestId;
              const canClose = status !== 'PENDING' && status !== 'CLOSED';

              return (
                <div
                  key={requestId}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderColor: focusMatch ? 'var(--primary)' : undefined,
                    boxShadow: focusMatch ? '0 0 0 1px rgba(46, 125, 50, 0.18)' : undefined,
                  }}
                >
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }} className="between">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{fieldName}</div>
                      <div className="tiny muted">
                        {request.farmerDisplayName} · {createdAt ? new Date(createdAt).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {request.scheme_id && <Chip kind="info" dot={false}>{request.scheme_id}</Chip>}
                      <Chip kind={statusKind(status)}>{status}</Chip>
                    </div>
                  </div>

                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
                      <div>
                        <div className="tiny muted">Requested action</div>
                        <div style={{ fontWeight: 600 }}>
                          {action}{positionPct !== null && positionPct !== undefined ? ` (${positionPct}%)` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="tiny muted">Submitted</div>
                        <div style={{ fontWeight: 600 }}>{formatRelative(createdAt)}</div>
                      </div>
                    </div>

                    {request.reason && (
                      <div style={{
                        fontSize: 12.5,
                        marginTop: 8,
                        padding: 10,
                        background: '#FBFCF9',
                        borderRadius: 6,
                        borderLeft: '2px solid var(--border)',
                        fontStyle: 'italic',
                      }}>
                        "{request.reason}"
                      </div>
                    )}

                    {(policyContext.blocked_reason || policyContext.policy_id) && (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: '#9A3412' }}>Policy context</div>
                        <div className="tiny" style={{ marginTop: 4, color: '#9A3412' }}>
                          {policyContext.blocked_reason || 'Authority policy attached to this request.'}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          {policyContext.policy_id ? `Policy ${policyContext.policy_id}` : ''}
                          {policyContext.policy_version ? ` · v${policyContext.policy_version}` : ''}
                        </div>
                      </div>
                    )}

                    {request.source_decision?.model_name && (
                      <div style={{ marginTop: 10 }}>
                        <div className="tiny muted">ML recommendation</div>
                        <div className="small" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
                          {request.source_decision.decision || '—'} (confidence {request.source_decision.confidence?.toFixed(2) ?? 'N/A'})
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {fieldId && (
                        <Link href={`/operations/fields/${encodeURIComponent(fieldId)}`} className="btn btn-ghost btn-sm">
                          Field
                        </Link>
                      )}
                      {farmerId && (
                        <Link href={`/operations/farmers/${encodeURIComponent(farmerId)}`} className="btn btn-ghost btn-sm">
                          Farmer
                        </Link>
                      )}
                    </div>

                    <div className="field" style={{ marginTop: 14 }}>
                      <label style={{ fontSize: 11 }}>{status === 'PENDING' ? 'Officer note' : 'Closure note'}</label>
                      <input
                        className="input"
                        placeholder={status === 'PENDING' ? 'Add a review note...' : 'Add a closing note...'}
                        value={notesByRequest[requestId] || ''}
                        onChange={(event) => setNotesByRequest((current) => ({ ...current, [requestId]: event.target.value }))}
                        disabled={actioningId === requestId}
                      />
                    </div>

                    {latestAuditEntry && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                        <div className="tiny muted">Latest activity</div>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                          {auditLabel(latestAuditEntry)} · {formatRelative(latestAuditEntry.created_at || latestAuditEntry.timestamp)}
                        </div>
                        {(latestAuditEntry.note || latestAuditEntry.actor_id) && (
                          <div className="tiny muted" style={{ marginTop: 4 }}>
                            {latestAuditEntry.note || latestAuditEntry.actor_id}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
                      {status === 'PENDING' ? (
                        <>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleReview(requestId, 'REJECT', notesByRequest[requestId])}
                            disabled={actioningId === requestId}
                          >
                            Reject
                          </button>
                          <div style={{ flex: 1 }}/>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReview(requestId, 'APPROVE', notesByRequest[requestId])}
                            disabled={actioningId === requestId}
                          >
                            {actioningId === requestId ? 'Processing...' : 'Approve'}
                          </button>
                        </>
                      ) : canClose ? (
                        <>
                          <Chip kind={statusKind(status)} dot={false}>
                            {status === 'EXECUTED' || status === 'APPROVED' ? 'Ready to close' : 'Handled'}
                          </Chip>
                          <div style={{ flex: 1 }}/>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleClose(requestId)}
                            disabled={actioningId === requestId}
                          >
                            {actioningId === requestId ? 'Closing...' : 'Close request'}
                          </button>
                        </>
                      ) : (
                        <div className="tiny muted">Request lifecycle completed.</div>
                      )}
                    </div>
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
      <React.Suspense fallback={null}>
        <ManualRequests />
      </React.Suspense>
    </div>
  );
}

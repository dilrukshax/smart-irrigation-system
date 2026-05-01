/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState, EmptyState } from '@/components/asi/api-state';
import { buildAuthorityNav } from '@/components/asi/nav';
import { Chip, Frame, Icon } from '@/components/asi/ui';
import { useAuth } from '@/lib/auth';
import {
  fetchAuthorityPolicies,
  fetchAuthorityUsers,
  formatDateTime,
} from '../_lib/authority-dashboard';

const StatCard = ({ label, value, detail }) => (
  <div className="card" style={{ padding: 16 }}>
    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    <div className="tiny muted" style={{ marginTop: 4 }}>{detail}</div>
  </div>
);

function AuditLogScreen() {
  const { user } = useAuth();
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRows, userRows] = await Promise.all([
        fetchAuthorityPolicies(100),
        fetchAuthorityUsers(100),
      ]);
      setPolicies(policyRows);
      setUsers(userRows);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit activity');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const policyEvents = React.useMemo(() => (
    policies
      .flatMap((policy) => (policy.audit || []).map((event) => ({
        ...event,
        policy_id: policy.policy_id,
        scheme_id: event.scheme_id || policy.scheme_id,
      })))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  ), [policies]);

  const accountEvents = React.useMemo(() => (
    users
      .flatMap((record) => {
        const events = [];
        if (record.created_at) {
          events.push({
            key: `${record.id}-created`,
            type: 'account_created',
            username: record.username,
            roles: record.roles || [],
            occurred_at: record.created_at,
            is_active: record.is_active,
          });
        }
        if (record.updated_at && record.updated_at !== record.created_at) {
          events.push({
            key: `${record.id}-updated`,
            type: 'account_updated',
            username: record.username,
            roles: record.roles || [],
            occurred_at: record.updated_at,
            is_active: record.is_active,
          });
        }
        return events;
      })
      .sort((a, b) => new Date(b.occurred_at || 0).getTime() - new Date(a.occurred_at || 0).getTime())
  ), [users]);

  const lastAuditAt = policyEvents[0]?.created_at || accountEvents[0]?.occurred_at;
  const displayName = user?.username || 'Authority';

  return (
    <Frame
      sidebar={buildAuthorityNav('Audit Log')}
      breadcrumb={['Authority', 'Audit Log']}
      user={displayName}
      role="Authority"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Audit log</div>
          <div className="page-sub">Policy workflow history plus account registry changes</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <StatCard label="Policy events" value={policyEvents.length} detail="Draft and publish transitions from authority policies" />
          <StatCard label="Registry changes" value={accountEvents.length} detail="User creation and later updates from the account registry" />
          <StatCard label="Last activity" value={lastAuditAt ? formatDateTime(lastAuditAt) : '—'} detail="Most recent authority-side change in the current feed" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '16px 16px 10px' }}>
              <div className="card-title">Policy workflow</div>
              <Chip kind="info" dot={false}>{policyEvents.length} events</Chip>
            </div>
            {policyEvents.length === 0 ? (
              <div style={{ padding: 18 }}>
                <EmptyState
                  title="No policy audit entries yet"
                  description="Create or publish a policy draft to start building the governance trail."
                  icon={<Icon name="list" size={24} color="var(--muted)" />}
                />
              </div>
            ) : (
              <div style={{ maxHeight: 560, overflow: 'auto' }}>
                {policyEvents.slice(0, 24).map((event) => (
                  <div key={event.audit_id} style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                    <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {event.event_type?.replace(/_/g, ' ') || 'policy event'}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          Scheme {event.scheme_id || '—'} · v{event.version || '—'} · {formatDateTime(event.created_at)}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          Policy ID: {event.policy_id}
                        </div>
                      </div>
                      <Chip kind="info" dot={false}>
                        {(event.actor_roles || []).join(', ') || 'system'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '16px 16px 10px' }}>
              <div className="card-title">Account registry changes</div>
              <Chip kind="info" dot={false}>{accountEvents.length} changes</Chip>
            </div>
            {accountEvents.length === 0 ? (
              <div style={{ padding: 18 }}>
                <EmptyState
                  title="No account changes yet"
                  description="Create officers, farmers, or additional authority accounts to populate this view."
                  icon={<Icon name="users" size={24} color="var(--muted)" />}
                />
              </div>
            ) : (
              <div style={{ maxHeight: 560, overflow: 'auto' }}>
                {accountEvents.slice(0, 24).map((event) => (
                  <div key={event.key} style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}>
                    <div className="between" style={{ gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{event.username}</div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          {event.type === 'account_created' ? 'Account created' : 'Account updated'} · {formatDateTime(event.occurred_at)}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          Roles: {(event.roles || []).join(', ') || 'farmer'}
                        </div>
                      </div>
                      <Chip kind={event.is_active ? 'live' : 'off'}>
                        {event.is_active ? 'Active' : 'Inactive'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ApiState>
    </Frame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <AuditLogScreen />
    </div>
  );
}

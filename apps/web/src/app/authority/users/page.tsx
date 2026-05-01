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
import { buildAuthorityNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  // Invite user modal
  const [showInvite, setShowInvite] = React.useState(false);
  const [inviteUsername, setInviteUsername] = React.useState('');
  const [inviteFullName, setInviteFullName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [invitePhone, setInvitePhone] = React.useState('');
  const [invitePassword, setInvitePassword] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('farmer');
  const [inviteSchemeId, setInviteSchemeId] = React.useState('H-04');
  const [inviting, setInviting] = React.useState(false);
  const [inviteMsg, setInviteMsg] = React.useState<{type: string, text: string} | null>(null);

  // Action state
  const [actingOn, setActingOn] = React.useState<string | null>(null);
  const [actionMsg, setActionMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/authority/users?limit=100');
      const list = Array.isArray(res) ? res : res?.users || res?.data || [];
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !invitePassword.trim()) {
      setInviteMsg({ type: 'error', text: 'Username and password are required' });
      return;
    }
    setInviting(true);
    setInviteMsg(null);
    try {
      await apiPost('/authority/users', {
        username: inviteUsername,
        full_name: inviteFullName || null,
        email: inviteEmail || null,
        phone_number: invitePhone || null,
        password: invitePassword,
        roles: [inviteRole],
        is_active: true,
        scheme_ids: inviteSchemeId ? [inviteSchemeId] : [],
      });
      setInviteMsg({ type: 'success', text: `User ${inviteUsername} created` });
      setInviteUsername('');
      setInviteFullName('');
      setInviteEmail('');
      setInvitePhone('');
      setInvitePassword('');
      setInviteRole('farmer');
      await loadData();
      setTimeout(() => setShowInvite(false), 1200);
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err?.message || 'Failed to create user' });
    } finally {
      setInviting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    setActingOn(userId);
    setActionMsg(null);
    try {
      await apiPatch(`/authority/users/${userId}/status`, {
        is_active: !currentActive,
      });
      await loadData();
      setActionMsg(currentActive ? 'Account deactivated' : 'Account activated');
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown'}`);
    } finally {
      setActingOn(null);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: string) => {
    setActingOn(userId);
    setActionMsg(null);
    try {
      await apiPatch(`/authority/users/${userId}/roles`, {
        roles: [nextRole],
      });
      await loadData();
      setActionMsg('Role updated');
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown'}`);
    } finally {
      setActingOn(null);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Permanently delete user ${username}? This cannot be undone.`)) return;
    setActingOn(userId);
    setActionMsg(null);
    try {
      await apiDelete(`/authority/users/${userId}?hard_delete=true`);
      await loadData();
      setActionMsg('Account deleted');
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown'}`);
    } finally {
      setActingOn(null);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const haystack = [
        u.username,
        u.full_name,
        u.email,
        u.national_id,
        u.phone_number,
        ...(u.scheme_ids || []),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (roleFilter !== 'all') {
      if (!(u.roles || []).some((r: string) => r.toLowerCase() === roleFilter)) return false;
    }
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    return true;
  });

  const displayName = user?.username || 'Authority';

  return (
    <Frame sidebar={buildAuthorityNav('User Management')} breadcrumb={['Authority', 'User Management']} user={displayName} role="Authority">
      <div className="page-head">
        <div>
          <div className="page-title">User management</div>
          <div className="page-sub">{users.length} users · 3 roles</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="download" size={13}/> Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={13}/> Invite user
          </button>
        </div>
      </div>
      {actionMsg && (
        <div style={{ marginBottom: 12, padding: 10, border: '1px solid #BBF7D0', borderRadius: 6, background: '#F0FDF4', color: '#166534', fontSize: 12 }}>
          {actionMsg}
        </div>
      )}

      {showInvite && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="card" style={{ width: 460, maxWidth: '92vw', padding: 20 }}>
            <div className="between" style={{ marginBottom: 14 }}>
              <div className="card-title">Invite new user</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(false)}>
                <Icon name="x" size={14}/>
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Username</label>
                <input className="input" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} disabled={inviting}/>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Full name</label>
                <input className="input" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} disabled={inviting}/>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Email</label>
                <input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={inviting}/>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Phone</label>
                <input className="input" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} disabled={inviting}/>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Temporary password</label>
                <input className="input" type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} disabled={inviting}/>
              </div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>Role</label>
                <select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} disabled={inviting}>
                  <option value="farmer">Farmer</option>
                  <option value="officer">Officer</option>
                  <option value="authority">Authority</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Scheme ID</label>
                <input className="input" value={inviteSchemeId} onChange={(e) => setInviteSchemeId(e.target.value)} disabled={inviting}/>
              </div>
              {inviteMsg && (
                <div style={{
                  marginBottom: 10,
                  padding: 8,
                  background: inviteMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  border: `1px solid ${inviteMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                  borderRadius: 6,
                  color: inviteMsg.type === 'success' ? '#166534' : '#DC2626',
                  fontSize: 12,
                }}>
                  {inviteMsg.text}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)} disabled={inviting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Creating...' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 10 }}>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="search" size={14} color="var(--muted)"/>
            <input
              placeholder="Search users, IDs, phones, schemes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 12, fontFamily: 'inherit' }}
            />
          </div>
          <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            <option value="farmer">Farmer</option>
            <option value="officer">Officer</option>
            <option value="authority">Authority</option>
          </select>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <ApiState loading={loading && users.length === 0} error={error} onRetry={loadData}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Schemes</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: any) => {
                const userId = u.id;
                const userRoles = u.roles || [];
                const primaryRole = userRoles.includes('authority') ? 'authority' : userRoles.includes('officer') ? 'officer' : 'farmer';
                const schemeIds = u.scheme_ids || [];

                return (
                  <tr key={userId}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                        {(u.username || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.full_name || u.username}</div>
                        <div className="tiny muted">{u.full_name ? u.username : u.national_id || ''}</div>
                      </div>
                    </td>
                    <td className="muted">
                      <div>{u.email || '—'}</div>
                      {u.phone_number && <div className="tiny">{u.phone_number}</div>}
                    </td>
                    <td>
                      <select
                        className="select"
                        value={primaryRole}
                        onChange={(e) => handleRoleChange(userId, e.target.value)}
                        disabled={actingOn === userId}
                        style={{ minWidth: 110, height: 32, fontSize: 12 }}
                      >
                        <option value="farmer">Farmer</option>
                        <option value="officer">Officer</option>
                        <option value="authority">Authority</option>
                      </select>
                    </td>
                    <td className="small muted">{schemeIds.join(', ') || '—'}</td>
                    <td>
                      <Chip kind={u.is_active ? 'live' : 'off'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Chip>
                    </td>
                    <td className="muted small tabular">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggleStatus(userId, u.is_active)}
                          disabled={actingOn === userId}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDelete(userId, u.username)}
                          disabled={actingOn === userId}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <UserManagement />
    </div>
  );
}

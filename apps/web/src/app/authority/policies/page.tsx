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
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fetchAuthorityPolicies } from '../_lib/authority-dashboard';

const PolicySettings = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [schemeId, setSchemeId] = React.useState('H-04');
  const [quotaMcm, setQuotaMcm] = React.useState('12.5');
  const [maxFieldOpenPct, setMaxFieldOpenPct] = React.useState('80');
  const [emergencyMode, setEmergencyMode] = React.useState(false);
  const [maxPerFieldQuotaMm, setMaxPerFieldQuotaMm] = React.useState('1100');
  const [seasonQuotaMm, setSeasonQuotaMm] = React.useState('980');
  const [minPaddyAreaPct, setMinPaddyAreaPct] = React.useState('50');

  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<{type: string, text: string} | null>(null);
  const [publishing, setPublishing] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPolicies(await fetchAuthorityPolicies(100));
    } catch (err: any) {
      setError(err?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiPost('/authority/policies', {
        scheme_id: schemeId,
        quota_mcm: parseFloat(quotaMcm) || 0,
        max_field_open_pct: parseFloat(maxFieldOpenPct) || 0,
        emergency_mode: emergencyMode,
        constraints: {
          season_quota_mm: parseFloat(seasonQuotaMm) || 980,
          min_paddy_area_pct: parseFloat(minPaddyAreaPct) || 50,
          max_per_field_quota_mm: parseFloat(maxPerFieldQuotaMm) || 1100,
        },
      });
      setSaveMsg({ type: 'success', text: 'Policy draft saved. Publish to activate.' });
      await loadData();
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: err?.message || 'Failed to save policy' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (policyId: string) => {
    setPublishing(policyId);
    try {
      await apiPost(`/authority/policies/${policyId}/publish`);
      await loadData();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown'}`);
    } finally {
      setPublishing(null);
    }
  };

  const displayName = user?.username || 'Authority';

  return (
    <Frame
      sidebar={buildAuthorityNav('Policies & Quotas')}
      breadcrumb={['Authority', 'Policies & Quotas']}
      user={displayName}
      role="Authority"
    >
      <div className="page-head">
        <div>
          <div className="page-title">Policy & quota settings</div>
          <div className="page-sub">Season-wide rules · {policies.length} policies</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <Icon name="download" size={13}/> Refresh
        </button>
      </div>

      <ApiState loading={loading && policies.length === 0} error={error} onRetry={loadData}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">New policy draft</div>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div className="field">
                  <label>Scheme ID</label>
                  <input className="input" value={schemeId} onChange={(e) => setSchemeId(e.target.value)} disabled={saving}/>
                </div>
                <div className="field">
                  <label>Quota (MCM)</label>
                  <input className="input" type="number" step="0.1" value={quotaMcm} onChange={(e) => setQuotaMcm(e.target.value)} disabled={saving}/>
                </div>
                <div className="field">
                  <label>Max field open %</label>
                  <input className="input" type="number" value={maxFieldOpenPct} onChange={(e) => setMaxFieldOpenPct(e.target.value)} disabled={saving}/>
                </div>
                <div className="field">
                  <label>Season quota (mm)</label>
                  <input className="input" type="number" value={seasonQuotaMm} onChange={(e) => setSeasonQuotaMm(e.target.value)} disabled={saving}/>
                </div>
                <div className="field">
                  <label>Min paddy area (%)</label>
                  <input className="input" type="number" value={minPaddyAreaPct} onChange={(e) => setMinPaddyAreaPct(e.target.value)} disabled={saving}/>
                </div>
                <div className="field">
                  <label>Max per-field quota (mm)</label>
                  <input className="input" type="number" value={maxPerFieldQuotaMm} onChange={(e) => setMaxPerFieldQuotaMm(e.target.value)} disabled={saving}/>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginTop: 14, marginBottom: 8 }}>
                <input type="checkbox" checked={emergencyMode} onChange={(e) => setEmergencyMode(e.target.checked)} disabled={saving}/>
                Emergency mode (restrict all non-critical valves)
              </label>

              {saveMsg && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: saveMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  border: `1px solid ${saveMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                  borderRadius: 6,
                  color: saveMsg.type === 'success' ? '#166534' : '#DC2626',
                  fontSize: 12,
                }}>
                  {saveMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save draft'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Existing policies</div>
              <Chip kind="info" dot={false}>{policies.length} total</Chip>
            </div>
            {policies.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No policies yet
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {policies.map((p: any) => {
                  const policyId = p.policy_id || p.id;
                  const status = (p.status || 'DRAFT').toUpperCase();
                  const isDraft = status === 'DRAFT';

                  return (
                    <div key={policyId} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                      <div className="between">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            Scheme {p.scheme_id || '—'} · v{p.version || 1}
                          </div>
                          <div className="tiny muted">
                            Quota: {p.quota_mcm ?? '—'} MCM · Max open: {p.max_field_open_pct ?? '—'}%
                            {p.emergency_mode && ' · Emergency mode'}
                          </div>
                        </div>
                        <Chip kind={isDraft ? 'warn' : 'live'}>{status}</Chip>
                      </div>
                      {p.created_at && (
                        <div className="tiny muted" style={{ marginTop: 4 }}>
                          Created {new Date(p.created_at).toLocaleString()}
                        </div>
                      )}
                      {isDraft && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 8 }}
                          onClick={() => handlePublish(policyId)}
                          disabled={publishing === policyId}
                        >
                          {publishing === policyId ? 'Publishing...' : 'Publish'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
      <PolicySettings />
    </div>
  );
}

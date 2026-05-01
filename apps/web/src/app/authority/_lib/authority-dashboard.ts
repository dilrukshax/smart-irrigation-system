import { apiGet } from '@/lib/api';

export interface AuthorityPolicyAudit {
  audit_id: string;
  policy_id: string;
  scheme_id: string;
  version: number;
  event_type: string;
  actor_id?: string | null;
  actor_roles?: string[] | null;
  created_at?: string | null;
}

export interface AuthorityPolicy {
  policy_id: string;
  scheme_id: string;
  version: number;
  status: string;
  quota_mcm?: number | null;
  max_field_open_pct?: number | null;
  emergency_mode?: boolean;
  constraints?: Record<string, unknown> | null;
  created_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  audit?: AuthorityPolicyAudit[];
}

export interface AuthorityUser {
  id: string;
  username: string;
  full_name?: string | null;
  national_id?: string | null;
  phone_number?: string | null;
  email?: string | null;
  roles?: string[];
  is_active: boolean;
  scheme_ids?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ServiceHealthItem {
  status: string;
  url?: string;
  error?: string;
}

export type ServiceHealthMap = Record<string, ServiceHealthItem>;

interface AuthorityPoliciesPayload {
  items?: AuthorityPolicy[];
  policies?: AuthorityPolicy[];
  data?: AuthorityPolicy[];
}

interface AuthorityUsersPayload {
  users?: AuthorityUser[];
  data?: AuthorityUser[];
}

export async function fetchAuthorityPolicies(limit = 100): Promise<AuthorityPolicy[]> {
  const res = await apiGet<AuthorityPolicy[] | AuthorityPoliciesPayload>(`/authority/policies?limit=${limit}`);
  if (Array.isArray(res)) {
    return res;
  }
  return res?.items || res?.policies || res?.data || [];
}

export async function fetchAuthorityUsers(limit = 100): Promise<AuthorityUser[]> {
  const res = await apiGet<AuthorityUser[] | AuthorityUsersPayload>(`/authority/users?limit=${limit}`);
  if (Array.isArray(res)) {
    return res;
  }
  return res?.users || res?.data || [];
}

export function buildSchemeSnapshots(policies: AuthorityPolicy[]) {
  const grouped = new Map<string, AuthorityPolicy[]>();

  policies.forEach((policy) => {
    const schemeId = policy.scheme_id || 'Unassigned';
    const current = grouped.get(schemeId) || [];
    current.push(policy);
    grouped.set(schemeId, current);
  });

  return Array.from(grouped.entries())
    .map(([schemeId, items]) => {
      const ordered = [...items].sort((a, b) => {
        const left = new Date(b.updated_at || b.created_at || 0).getTime();
        const right = new Date(a.updated_at || a.created_at || 0).getTime();
        return left - right;
      });
      const latestPolicy = ordered[0];
      return {
        schemeId,
        latestPolicy,
        policies: ordered,
        publishedCount: ordered.filter((item) => item.status?.toUpperCase() === 'PUBLISHED').length,
        draftCount: ordered.filter((item) => item.status?.toUpperCase() === 'DRAFT').length,
      };
    })
    .sort((a, b) => a.schemeId.localeCompare(b.schemeId));
}

export function collectSchemeIds(users: AuthorityUser[], policies: AuthorityPolicy[]) {
  const schemeIds = new Set<string>();

  users.forEach((user) => {
    (user.scheme_ids || []).forEach((schemeId) => {
      if (schemeId) {
        schemeIds.add(schemeId);
      }
    });
  });

  policies.forEach((policy) => {
    if (policy.scheme_id) {
      schemeIds.add(policy.scheme_id);
    }
  });

  return Array.from(schemeIds).sort((a, b) => a.localeCompare(b));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export function getStatusChipKind(status?: string | null) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PUBLISHED' || normalized === 'HEALTHY' || normalized === 'ACTIVE') {
    return 'live';
  }
  if (normalized === 'UNAVAILABLE' || normalized === 'UNHEALTHY' || normalized === 'INACTIVE') {
    return 'crit';
  }
  if (normalized === 'DRAFT' || normalized === 'DEGRADED') {
    return 'warn';
  }
  return 'info';
}

export function getRoleLabel(user: AuthorityUser) {
  return (user.roles && user.roles[0]) || 'farmer';
}

export function getGatewayBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
  return baseUrl.replace(/\/api\/v1\/?$/, '');
}

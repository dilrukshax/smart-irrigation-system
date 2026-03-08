export type DataStatus =
  | 'ok'
  | 'stale'
  | 'data_unavailable'
  | 'analysis_pending'
  | 'source_unavailable';

export interface FreshnessMeta {
  status?: DataStatus | string;
  data_available?: boolean;
  is_live?: boolean;
  staleness_sec?: number | null;
}

export interface FreshnessView {
  label: 'Live' | 'Stale' | 'Unavailable';
  color: 'success' | 'warning' | 'default';
}

export function getFreshnessView(meta?: FreshnessMeta | null): FreshnessView {
  if (!meta) {
    return { label: 'Unavailable', color: 'default' };
  }

  const status = String(meta.status || '').toLowerCase();
  const hasData = meta.data_available !== false;
  const isLive = meta.is_live !== false;
  const stalenessSec = meta.staleness_sec ?? 0;

  if (
    !hasData ||
    status === 'data_unavailable' ||
    status === 'analysis_pending' ||
    status === 'source_unavailable'
  ) {
    return { label: 'Unavailable', color: 'default' };
  }

  if (status === 'stale' || !isLive || stalenessSec > 120) {
    return { label: 'Stale', color: 'warning' };
  }

  return { label: 'Live', color: 'success' };
}

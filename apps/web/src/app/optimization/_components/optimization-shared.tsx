/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { Chip, Frame, Icon, Progress } from '@/components/asi/ui';
import { officerModuleNav } from '@/components/asi/nav';
import { useAuth } from '@/lib/auth';

export const DEFAULT_SEASON = 'Maha-2025';

export const gridAuto = (min = 240) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 14,
});

export const asArray = (value: any) => Array.isArray(value) ? value : [];

export const optionalNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const num = (value: any, fallback = 0) => optionalNum(value) ?? fallback;

export const formatNumber = (value: any, digits = 1) => {
  const parsed = optionalNum(value);
  return parsed === null ? '-' : parsed.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatCompact = (value: any, prefix = '') => {
  const parsed = optionalNum(value);
  if (parsed === null) return '-';
  if (Math.abs(parsed) >= 1000000) return `${prefix}${(parsed / 1000000).toFixed(1)}M`;
  if (Math.abs(parsed) >= 1000) return `${prefix}${Math.round(parsed / 1000)}k`;
  return `${prefix}${Math.round(parsed)}`;
};

export const formatPct = (value: any, digits = 0) => {
  const parsed = optionalNum(value);
  if (parsed === null) return '-';
  return `${parsed.toFixed(digits)}%`;
};

export const formatDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const statusKind = (status: any, risk?: any) => {
  const key = String(risk || status || '').toLowerCase();
  if (['critical', 'high', 'infeasible', 'source_unavailable', 'data_unavailable'].includes(key)) return 'crit';
  if (['medium', 'stale', 'analysis_pending'].includes(key)) return 'warn';
  if (['low', 'ok', 'optimal', 'feasible', 'good'].includes(key)) return 'live';
  return 'sim';
};

export const unwrapData = (payload: any) => payload?.data || payload || {};

export const topCrops = (overview: any) => asArray(unwrapData(overview).top_crops);
export const overviewRecommendations = (overview: any) => asArray(unwrapData(overview).recommendations);
export const waterBudget = (overview: any) => unwrapData(overview).water_budget || {};

export const getParamDefault = (params: any, group: string, key: string, fallback: any) => {
  const spec = params?.[group]?.[key];
  return spec && Object.prototype.hasOwnProperty.call(spec, 'default') ? spec.default : fallback;
};

export function buildQuery(params: Record<string, any>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function OptimizationFrame({ active, title, subtitle, actions, onRefresh, children }: any) {
  const { user } = useAuth();
  const displayName = user?.username || user?.email || 'Officer';

  return (
    <Frame
      sidebar={officerModuleNav('Optimization', active)}
      breadcrumb={['Modules', 'F4 · ACA-O']}
      user={displayName}
      role="Officer"
    >
      <div className="page-head">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {actions}
          {onRefresh && (
            <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
              <Icon name="download" size={13}/> Refresh
            </button>
          )}
        </div>
      </div>
      {children}
    </Frame>
  );
}

export function SeasonControl({ season, onSeasonChange, disabled = false }: any) {
  return (
    <div className="field" style={{ minWidth: 170 }}>
      <label>Season</label>
      <select className="select" value={season} onChange={(event) => onSeasonChange(event.target.value)} disabled={disabled}>
        <option value="Maha-2025">Maha 2025</option>
        <option value="Yala-2026">Yala 2026</option>
        <option value="Maha-2026">Maha 2026</option>
        <option value="Yala-2027">Yala 2027</option>
      </select>
    </div>
  );
}

export function MetricCard({ title, value, sub, icon = 'target', chip, kind = 'live', color = 'var(--primary)' }: any) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {chip && <Chip kind={kind}>{chip}</Chip>}
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color,
          background: 'rgba(46, 125, 50, 0.08)',
          flex: '0 0 auto',
        }}>
          <Icon name={icon} size={18}/>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="tabular" style={{ fontSize: 27, lineHeight: 1.05, fontWeight: 750, color }}>{value}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function BackendStatus({ payload }: any) {
  if (!payload) return null;
  return (
    <Chip kind={statusKind(payload.status)}>
      {payload.status || 'status'}
    </Chip>
  );
}

export function AllocationTable({ allocation }: any) {
  const rows = asArray(allocation);
  if (!rows.length) {
    return <div className="tiny muted" style={{ padding: 18 }}>No allocation rows returned by the optimizer.</div>;
  }
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Crop</th>
          <th>Area</th>
          <th>Water</th>
          <th>Yield</th>
          <th>Profit</th>
          <th>Risk</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row: any, index: number) => (
          <tr key={`${row.crop_id || row.crop_name || 'crop'}-${index}`}>
            <td style={{ fontWeight: 650 }}>{row.crop_name || row.crop_id || '-'}</td>
            <td className="tabular">{formatNumber(row.area_ha, 2)} ha</td>
            <td className="tabular">{formatNumber(row.water_usage ?? row.water_mm, 1)}</td>
            <td className="tabular">{formatNumber(row.predicted_yield ?? row.expected_yield_t, 2)} t/ha</td>
            <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{formatCompact(row.profit ?? row.projected_profit_lkr, 'LKR ')}</td>
            <td><Chip kind={statusKind(row.risk)}>{row.risk || 'risk'}</Chip></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CropBudgetTable({ crops }: any) {
  const rows = asArray(crops);
  if (!rows.length) {
    return <div className="tiny muted" style={{ padding: 18 }}>No crop budget rows are available yet.</div>;
  }
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Crop</th>
          <th>Fields</th>
          <th>Area</th>
          <th>Water</th>
          <th>Expected profit</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((row: any) => (
          <tr key={row.crop_id || row.crop_name}>
            <td style={{ fontWeight: 650 }}>{row.crop_name || row.crop_id || '-'}</td>
            <td className="tabular">{row.field_count ?? '-'}</td>
            <td className="tabular">{formatNumber(row.area_ha, 2)} ha</td>
            <td className="tabular">{formatNumber(row.water_usage, 1)}</td>
            <td className="tabular" style={{ color: 'var(--primary-600)', fontWeight: 700 }}>{formatCompact(row.expected_profit, 'LKR ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RecommendationCard({ row }: any) {
  const score = num(row.suitability_score ?? row.combined_score, 0);
  const risk = row.risk_band || row.risk_level || row.risk;
  const color = score >= 0.8 ? 'var(--primary)' : score >= 0.65 ? '#6D9F2B' : 'var(--accent)';

  return (
    <div className="card">
      <div className="card-head">
        <div style={{ minWidth: 0 }}>
          <div className="card-title" style={{ fontSize: 14 }}>{row.crop_name || row.crop_id || 'Crop'}</div>
          <div className="tiny muted" style={{ marginTop: 3 }}>{row.field_name || row.field_id || row.season || '-'}</div>
        </div>
        <Chip kind={statusKind(risk)}>{risk || 'risk'}</Chip>
      </div>
      <Progress value={score} max={1} color={color} label="Suitability"/>
      <div style={{ ...gridAuto(120), gap: 10, marginTop: 12 }}>
        <div>
          <div className="tiny muted">Yield</div>
          <div className="tabular" style={{ fontWeight: 700 }}>{formatNumber(row.expected_yield_t_per_ha ?? row.predicted_yield_t_ha, 2)} t/ha</div>
        </div>
        <div>
          <div className="tiny muted">Profit</div>
          <div className="tabular" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{formatCompact(row.expected_profit_per_ha ?? row.profit_per_ha, 'LKR ')}</div>
        </div>
      </div>
      {row.rationale && <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.45 }}>{row.rationale}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'target', title, children, actionHref, actionLabel }: any) {
  return (
    <div className="card" style={{ padding: 34, textAlign: 'center' }}>
      <Icon name={icon} size={38} color="var(--muted)"/>
      <div style={{ fontWeight: 700, marginTop: 12 }}>{title}</div>
      {children && <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>{children}</div>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
          <Icon name="arrow" size={13}/> {actionLabel}
        </Link>
      )}
    </div>
  );
}

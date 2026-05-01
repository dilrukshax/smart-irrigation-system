/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { Chip, Donut, Frame, Icon, Progress } from '@/components/asi/ui';
import { officerModuleNav } from '@/components/asi/nav';
import { FieldHealthMap } from '@/components/asi/field-health-map';
import { useAuth } from '@/lib/auth';

export const DEFAULT_ZONE_COUNT = 8;
export const DEFAULT_AREA_KM2 = 10;

export const gridAuto = (min = 240) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 14,
});

export const asArray = (value: any) => Array.isArray(value) ? value : [];

export const num = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const optionalNum = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumber = (value: any, digits = 1) => {
  const parsed = optionalNum(value);
  return parsed === null ? '-' : parsed.toFixed(digits);
};

export const formatPct = (value: any, digits = 0) => {
  const parsed = optionalNum(value);
  if (parsed === null) return '-';
  const normalized = parsed <= 1 ? parsed * 100 : parsed;
  return `${normalized.toFixed(digits)}%`;
};

export const formatHa = (value: any) => {
  const parsed = optionalNum(value);
  return parsed === null ? '-' : `${parsed.toFixed(1)} ha`;
};

export const formatDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const statusKind = (status: any, priority?: any) => {
  const key = String(priority || status || '').toLowerCase();
  if (['critical', 'high', 'severe stress', 'source_unavailable', 'unavailable'].includes(key)) return 'crit';
  if (['medium', 'mild stress', 'stale', 'analysis_pending'].includes(key)) return 'warn';
  if (['low', 'healthy', 'ok', 'good'].includes(key)) return 'live';
  return 'sim';
};

export const priorityColor = (priority: any) => {
  const key = String(priority || '').toLowerCase();
  if (key === 'critical') return 'var(--danger)';
  if (key === 'high') return '#D84315';
  if (key === 'medium') return 'var(--accent)';
  return 'var(--primary)';
};

export const normalizeZonesPayload = (payload: any): any[] => {
  const rawZones =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.zones?.features) && payload.zones.features) ||
    (Array.isArray(payload?.features) && payload.features) ||
    (Array.isArray(payload?.data?.zones?.features) && payload.data.zones.features) ||
    (Array.isArray(payload?.data?.features) && payload.data.features) ||
    (Array.isArray(payload?.data?.zones) && payload.data.zones) ||
    (Array.isArray(payload?.zones) && payload.zones) ||
    [];

  return rawZones.map((zone: any, index: number) => {
    const props = zone?.properties || {};
    const metric = optionalNum(props.ndvi ?? props.score ?? zone?.ndvi ?? zone?.score) ?? 0;
    const zoneId = props.zone_id || zone?.zone_id || zone?.id || `Z-${index + 1}`;
    return {
      ...zone,
      ...props,
      id: zone?.id || zoneId,
      zone_id: zoneId,
      field_name: props.name || zone?.field_name || zone?.field || zone?.label || `Zone ${index + 1}`,
      ndvi: metric,
      ndwi: optionalNum(props.ndwi ?? zone?.ndwi) ?? 0,
      score: metric,
      health_status: props.health_status || zone?.health_status,
      risk_level: props.risk_level || zone?.risk_level,
      recommendation: props.recommendation || zone?.recommendation,
      color: props.color || zone?.color,
    };
  });
};

export const zoneGeoJson = (payload: any) => {
  const zones = payload?.zones;
  if (zones?.type === 'FeatureCollection') return zones;
  if (payload?.type === 'FeatureCollection') return payload;
  if (payload?.data?.zones?.type === 'FeatureCollection') return payload.data.zones;
  return null;
};

export const zoneSummary = (zonesPayload: any, summaryPayload?: any) =>
  summaryPayload?.summary || summaryPayload?.data?.summary || summaryPayload?.data || summaryPayload || zonesPayload?.summary || {};

export const zoneCenter = (payload: any) => {
  const center = payload?.center || payload?.data?.center || payload?.zones?.metadata?.center;
  return {
    lat: num(center?.lat, 6.42),
    lon: num(center?.lon ?? center?.lng, 80.89),
  };
};

export const zoneStatusLabel = (zone: any) => {
  const ndvi = num(zone?.ndvi ?? zone?.score);
  return zone?.health_status || (ndvi > 0.55 ? 'Healthy' : ndvi > 0.4 ? 'Mild Stress' : 'Severe Stress');
};

export function CropHealthFrame({ active, children, title, subtitle, onRefresh, actions }: any) {
  const { user } = useAuth();
  const displayName = user?.username || 'Officer';

  return (
    <Frame
      sidebar={officerModuleNav('Crop Health', active)}
      breadcrumb={['Modules', 'F2 · Crop Health']}
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

export function MetricCard({ title, value, sub, icon = 'shield_check', chip, kind = 'live', color = 'var(--primary)' }: any) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        {chip && <Chip kind={kind}>{chip}</Chip>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            color,
            background: 'rgba(46, 125, 50, 0.08)',
            flex: '0 0 auto',
          }}
        >
          <Icon name={icon} size={18}/>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 750, color, lineHeight: 1.05 }}>{value}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function HealthDistribution({ summary, zones }: any) {
  const rows = asArray(zones);
  const total = num(summary?.total_zones, rows.length);
  const healthy = num(summary?.healthy_count, rows.filter((z: any) => zoneStatusLabel(z) === 'Healthy').length);
  const mild = num(summary?.mild_stress_count, rows.filter((z: any) => zoneStatusLabel(z) === 'Mild Stress').length);
  const severe = num(summary?.severe_stress_count, rows.filter((z: any) => zoneStatusLabel(z) === 'Severe Stress').length);
  const displayTotal = Math.max(total, healthy + mild + severe);
  const healthyPct = displayTotal ? Math.round((healthy / displayTotal) * 100) : 0;
  const segments = displayTotal ? [
    { value: healthy || 0.001, color: 'var(--primary)' },
    { value: mild || 0.001, color: 'var(--accent)' },
    { value: severe || 0.001, color: 'var(--danger)' },
  ] : [{ value: 1, color: '#E5E7EB' }];

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Health distribution</div>
          <div className="tiny muted">{displayTotal} monitored zones</div>
        </div>
        <Chip kind="sim">{formatNumber(summary?.average_ndvi, 2)} NDVI</Chip>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Donut
          size={132}
          segments={segments}
          center={<><div style={{ fontSize: 20, fontWeight: 700 }} className="tabular">{healthyPct}%</div><div className="tiny muted">healthy</div></>}
        />
        <div style={{ flex: 1 }}>
          {[
            ['Healthy', healthy, 'var(--primary)'],
            ['Mild stress', mild, 'var(--accent)'],
            ['Severe stress', severe, 'var(--danger)'],
          ].map((row: any) => (
            <div key={row[0]} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: row[2] }}/>
              <span style={{ flex: 1 }}>{row[0]}</span>
              <span className="tabular" style={{ fontWeight: 700 }}>{row[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ZoneList({ zones, limit }: any) {
  const rows = asArray(zones).slice(0, limit || asArray(zones).length);
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="card-title">Zones ({rows.length})</div>
      </div>
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {!rows.length ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No zones available
          </div>
        ) : rows.map((zone: any, index: number) => {
          const label = zoneStatusLabel(zone);
          const ndvi = optionalNum(zone.ndvi);
          return (
            <div key={zone.id || zone.zone_id || index} style={{ display: 'grid', gridTemplateColumns: '78px minmax(0, 1fr) 70px 104px', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--line)', alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{zone.zone_id || zone.id || `Z-${index + 1}`}</span>
              <span className="muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zone.field_name || zone.name || 'Zone'}</span>
              <span className="tabular" style={{ fontWeight: 600 }}>{ndvi === null ? '-' : ndvi.toFixed(2)}</span>
              <Chip kind={statusKind(label)}>{label}</Chip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ZoneMapPanel({ zonesPayload, mapLayer, onMapLayerChange, height = 440 }: any) {
  const geo = zoneGeoJson(zonesPayload);
  const center = zoneCenter(zonesPayload);
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Zone map</div>
          <div className="tiny muted">{geo?.features?.length || 0} F2 health zones</div>
        </div>
        <Chip kind="live">Satellite</Chip>
      </div>
      <FieldHealthMap
        center={center}
        zonesGeoJson={geo}
        mapLayer={mapLayer}
        onMapLayerChange={onMapLayerChange}
        height={height}
        showCenterMarker
        showLegend={false}
        hint="F2 zones"
      />
    </div>
  );
}

export function CropAlertsList({ alerts, compact = false }: any) {
  const rows = asArray(alerts);
  if (!rows.length) {
    return (
      <div className="card">
        <div className="card-title">Stress alerts</div>
        <div className="tiny muted" style={{ marginTop: 8 }}>No crop-health alerts are active.</div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Stress alerts</div>
        <Chip kind={statusKind(rows[0]?.priority)}>{rows.length} active</Chip>
      </div>
      <div style={{ display: 'grid', gap: compact ? 8 : 10 }}>
        {rows.map((alert: any) => (
          <div
            key={alert.id || `${alert.type}-${alert.generated_at}`}
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr auto' : '110px minmax(0, 1fr) 112px',
              gap: 12,
              alignItems: compact ? 'start' : 'center',
              borderBottom: '1px solid var(--border)',
              padding: compact ? '8px 0' : '11px 0',
            }}
          >
            {!compact && (
              <div>
                <Chip kind={statusKind(alert.priority)}>{alert.priority || 'low'}</Chip>
                <div className="tiny muted" style={{ marginTop: 5 }}>{formatDate(alert.generated_at)}</div>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: priorityColor(alert.priority) }}>{alert.title || alert.type}</div>
              <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{alert.message}</div>
              {!compact && alert.recommendation && (
                <div style={{ fontSize: 12, marginTop: 7, lineHeight: 1.45 }}>{alert.recommendation}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {compact && <Chip kind={statusKind(alert.priority)}>{alert.priority || 'low'}</Chip>}
              {alert.metric && (
                <div className="tiny muted tabular" style={{ marginTop: compact ? 6 : 0 }}>
                  {alert.metric}: {formatNumber(alert.value, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModelStatusPanel({ status, classes }: any) {
  const loaded = Boolean(status?.model_loaded);
  const classCount = num(status?.num_classes ?? classes?.num_classes);
  const loadedCount = asArray(status?.loaded_models).length;
  const requiredCount = Object.keys(status?.required_models || {}).length || 1;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Disease model</div>
          <div className="tiny muted">MobileNet crop-health classifier</div>
        </div>
        <Chip kind={loaded ? 'live' : 'warn'}>{loaded ? 'Ready' : status?.status || 'Unavailable'}</Chip>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <Progress value={loadedCount} max={requiredCount} color={loaded ? 'var(--primary)' : 'var(--accent)'} label="Model artifacts"/>
        <div style={gridAuto(130)}>
          <div>
            <div className="tiny muted">Classes</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatNumber(classCount, 0)}</div>
          </div>
          <div>
            <div className="tiny muted">Image size</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatNumber(status?.image_size, 0)}</div>
          </div>
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>
          {status?.message || 'Model status will appear when F2 responds.'}
        </div>
      </div>
    </div>
  );
}

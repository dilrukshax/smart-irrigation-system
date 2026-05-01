/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { Icon, Chip, Frame, Progress } from '@/components/asi/ui';
import { farmerNav } from '@/components/asi/nav';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type MapLayer = 'terrain' | 'satellite';
type AreaMode = 'all' | 'selected' | 'boundary';

type LatLng = {
  lat: number;
  lng: number;
};

const SRI_LANKA_CENTER: LatLng = { lat: 7.8731, lng: 80.7718 };

const formatPct = (value: any, digits = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '-';
};

const formatArea = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2).replace(/\.00$/, '')} ha` : '0 ha';
};

const getFieldId = (field: any, index = 0) => field.field_id || field.id || field.slug || `field-${index}`;
const getFieldName = (field: any, index = 0) => field.field_name || field.name || getFieldId(field, index);

const getCoords = (field: any): LatLng | null => {
  const lat = Number(field.latitude ?? field.lat);
  const lng = Number(field.longitude ?? field.lng ?? field.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const buildBoundary = (points: LatLng[], closed: boolean) => {
  if (!closed || points.length < 3) return null;
  const ring = [...points, points[0]].map((point) => [point.lng, point.lat]);
  return { type: 'Polygon', coordinates: [ring] };
};

const pointInPolygon = (point: LatLng, polygon: LatLng[]) => {
  if (polygon.length < 3) return false;
  let inside = false;
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i += 1) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = ((yi > point.lat) !== (yj > point.lat)) &&
      point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersects) inside = !inside;
    j = i;
  }
  return inside;
};

const decisionKind = (action?: string): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  if (action === 'IRRIGATE_NOW') return 'live';
  if (action === 'REQUEST_REVIEW') return 'crit';
  if (action === 'WATCH') return 'warn';
  if (action === 'SKIP') return 'info';
  return 'off';
};

const fieldStatusKind = (status?: string): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const value = String(status || '').toUpperCase();
  if (value === 'CRITICAL') return 'crit';
  if (['WARNING', 'IRRIGATING'].includes(value)) return 'warn';
  if (value === 'OK') return 'live';
  return 'off';
};

function boundaryFieldIds(fields: any[], points: LatLng[], closed: boolean) {
  if (!closed || points.length < 3) return [];
  return fields
    .filter((field, index) => {
      const coords = getCoords(field);
      return coords ? pointInPolygon(coords, points) : false;
    })
    .map((field, index) => getFieldId(field, index));
}

function AreaBoundaryMap({
  fields,
  selectedFieldIds,
  points,
  closed,
  mapLayer,
  onMapLayerChange,
  onAddPoint,
  onUndoPoint,
  onClear,
  onCloseBoundary,
}: any) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const terrainRef = React.useRef<any>(null);
  const satelliteRef = React.useRef<any>(null);
  const fieldLayerRef = React.useRef<any>(null);
  const boundaryLayerRef = React.useRef<any>(null);
  const onAddPointRef = React.useRef(onAddPoint);
  const closedRef = React.useRef(closed);

  React.useEffect(() => {
    onAddPointRef.current = onAddPoint;
  }, [onAddPoint]);

  React.useEffect(() => {
    closedRef.current = closed;
  }, [closed]);

  React.useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (typeof window === 'undefined' || !containerRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current || mapRef.current) return;

      const firstCoords = fields.map(getCoords).find(Boolean) || SRI_LANKA_CENTER;
      const map = L.map(containerRef.current, { zoomControl: true });
      mapRef.current = map;
      map.setView([firstCoords.lat, firstCoords.lng], firstCoords === SRI_LANKA_CENTER ? 8 : 14);

      terrainRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      });
      satelliteRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
      );

      if (mapLayer === 'satellite') {
        satelliteRef.current.addTo(map);
      } else {
        terrainRef.current.addTo(map);
      }

      fieldLayerRef.current = L.layerGroup().addTo(map);
      boundaryLayerRef.current = L.layerGroup().addTo(map);

      map.on('click', (event: any) => {
        if (closedRef.current) return;
        onAddPointRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
    };

    void init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      terrainRef.current = null;
      satelliteRef.current = null;
      fieldLayerRef.current = null;
      boundaryLayerRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const terrain = terrainRef.current;
    const satellite = satelliteRef.current;
    if (!map || !terrain || !satellite) return;
    if (mapLayer === 'satellite') {
      if (!map.hasLayer(satellite)) satellite.addTo(map);
      if (map.hasLayer(terrain)) map.removeLayer(terrain);
    } else {
      if (!map.hasLayer(terrain)) terrain.addTo(map);
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
    }
  }, [mapLayer]);

  React.useEffect(() => {
    const map = mapRef.current;
    const layer = fieldLayerRef.current;
    if (!map || !layer) return;
    let cancelled = false;

    const draw = async () => {
      const L = await import('leaflet');
      if (cancelled || !fieldLayerRef.current) return;
      layer.clearLayers();
      const selected = new Set(selectedFieldIds);
      fields.forEach((field: any, index: number) => {
        const coords = getCoords(field);
        if (!coords) return;
        const fieldId = getFieldId(field, index);
        const isSelected = selected.has(fieldId);
        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: isSelected ? 8 : 6,
          color: isSelected ? '#2E7D32' : '#6B7280',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#2E7D32' : '#9CA3AF',
          fillOpacity: isSelected ? 0.9 : 0.65,
        }).addTo(layer);
        marker.bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px;">
            <div style="font-weight: 700;">${getFieldName(field, index)}</div>
            <div style="color: #666;">${field.crop_type || field.crop || 'Crop not assigned'}</div>
          </div>`,
        );
      });
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [fields, selectedFieldIds.join('|')]);

  React.useEffect(() => {
    const layer = boundaryLayerRef.current;
    if (!layer) return;
    let cancelled = false;

    const draw = async () => {
      const L = await import('leaflet');
      if (cancelled || !boundaryLayerRef.current) return;
      layer.clearLayers();
      if (!points.length) return;
      const latLngs = points.map((point: LatLng) => [point.lat, point.lng]);
      if (closed && points.length >= 3) {
        L.polygon(latLngs, {
          color: '#0288D1',
          weight: 2,
          fillColor: '#0288D1',
          fillOpacity: 0.18,
        }).addTo(layer);
      } else if (points.length >= 2) {
        L.polyline(latLngs, { color: '#0288D1', weight: 2, dashArray: '6 6' }).addTo(layer);
      }
      latLngs.forEach((latLng: any, index: number) => {
        L.circleMarker(latLng, {
          radius: 4,
          color: '#0288D1',
          weight: 2,
          fillColor: 'white',
          fillOpacity: 1,
        }).bindTooltip(`${index + 1}`, { permanent: false }).addTo(layer);
      });
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [points, closed]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={mapLayer === 'satellite' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => onMapLayerChange('satellite')}
          >
            <Icon name="map" size={13}/> Satellite
          </button>
          <button
            type="button"
            className={mapLayer === 'terrain' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => onMapLayerChange('terrain')}
          >
            <Icon name="map" size={13}/> Terrain
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUndoPoint} disabled={!points.length}>
            <Icon name="arrow" size={13} style={{ transform: 'rotate(180deg)' }}/> Undo
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear} disabled={!points.length}>
            <Icon name="x" size={13}/> Clear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onCloseBoundary}
            disabled={closed || points.length < 3}
          >
            <Icon name="check" size={13} color="white"/> Close area
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 380,
          borderRadius: 8,
          border: '1px solid var(--border)',
          overflow: 'hidden',
          background: '#EAF1E8',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="tiny muted">Boundary points: {points.length}</span>
        <span className="tiny muted">Selected fields: {selectedFieldIds.length}</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, chip }: any) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="tiny muted">{label}</div>
        <Icon name={icon} size={14} color="var(--muted)" />
      </div>
      <div className="tabular" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {chip && <div style={{ marginTop: 8 }}><Chip kind={chip.kind} dot={false}>{chip.text}</Chip></div>}
    </div>
  );
}

function ModeButton({ active, icon, children, onClick }: any) {
  return (
    <button
      type="button"
      className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
      onClick={onClick}
    >
      <Icon name={icon} size={13} color={active ? 'white' : 'currentColor'}/>
      {children}
    </button>
  );
}

function FarmerIrrigationPage() {
  const { user } = useAuth();
  const [fields, setFields] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any | null>(null);
  const [fieldsLoading, setFieldsLoading] = React.useState(true);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<AreaMode>('all');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [boundaryPoints, setBoundaryPoints] = React.useState<LatLng[]>([]);
  const [boundaryClosed, setBoundaryClosed] = React.useState(false);
  const [mapLayer, setMapLayer] = React.useState<MapLayer>('satellite');

  const displayName = user?.username || 'Farmer';
  const activeNav = React.useMemo(
    () => farmerNav.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, active: item.name === 'Irrigation' })),
    })),
    [],
  );

  const boundaryIds = React.useMemo(
    () => boundaryFieldIds(fields, boundaryPoints, boundaryClosed),
    [fields, boundaryPoints, boundaryClosed],
  );

  const activeFieldIds = mode === 'all'
    ? fields.map(getFieldId)
    : mode === 'selected'
    ? selectedIds
    : boundaryIds;

  const loadSummary = React.useCallback(async (nextMode: AreaMode = mode) => {
    setSummaryLoading(true);
    setError(null);
    try {
      let body: any = { mode: 'all' };
      if (nextMode === 'selected') {
        body = { mode: 'fields', field_ids: selectedIds };
      }
      if (nextMode === 'boundary') {
        const boundary = buildBoundary(boundaryPoints, boundaryClosed);
        if (!boundary) {
          setError('Close the map area before analyzing the boundary.');
          return;
        }
        body = { mode: 'boundary', field_ids: boundaryIds, boundary };
      }
      const response = await apiPost<any>('/irrigation/farmer/area-summary', body);
      setSummary(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load irrigation area summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [mode, selectedIds, boundaryIds, boundaryPoints, boundaryClosed]);

  const loadFields = React.useCallback(async () => {
    setFieldsLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>('/farm/fields');
      const list = Array.isArray(res) ? res : res?.fields || res?.data || [];
      setFields(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load fields');
    } finally {
      setFieldsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

  React.useEffect(() => {
    if (!fieldsLoading && !summary && !error) {
      loadSummary('all');
    }
  }, [fieldsLoading, summary, error, loadSummary]);

  const toggleField = (fieldId: string) => {
    setMode('selected');
    setSelectedIds((current) =>
      current.includes(fieldId)
        ? current.filter((item) => item !== fieldId)
        : [...current, fieldId]
    );
  };

  const handleAddPoint = (point: LatLng) => {
    setMode('boundary');
    setBoundaryClosed(false);
    setBoundaryPoints((current) => [...current, point]);
  };

  const kpis = summary?.kpis || {};
  const decision = summary?.area_decision || {};
  const modelEvidence = summary?.model_evidence || {};
  const selectedFieldCount = summary?.selection?.field_count ?? activeFieldIds.length;
  const totalArea = summary?.selection?.total_hectares ?? fields.reduce((sum, field) => sum + Number(field.area_hectares || field.area || 0), 0);

  return (
    <Frame
      sidebar={activeNav}
      breadcrumb={['Farmer', 'Irrigation']}
      user={displayName}
      role="Farmer"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="page-head">
          <div>
            <div className="page-title">Irrigation area workspace</div>
            <div className="page-sub">{selectedFieldCount} selected fields / {formatArea(totalArea)} / {summary?.quality || 'loading'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={loadFields}>
              <Icon name="download" size={13}/> Refresh fields
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => loadSummary(mode)} disabled={summaryLoading}>
              <Icon name="target" size={13} color="white"/> {summaryLoading ? 'Analyzing...' : 'Analyze area'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="map" size={14} color="var(--primary-600)"/> Area selection</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <ModeButton active={mode === 'all'} icon="leaf" onClick={() => setMode('all')}>All</ModeButton>
                <ModeButton active={mode === 'selected'} icon="check" onClick={() => setMode('selected')}>Checked</ModeButton>
                <ModeButton active={mode === 'boundary'} icon="map" onClick={() => setMode('boundary')}>Boundary</ModeButton>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <AreaBoundaryMap
                fields={fields}
                selectedFieldIds={activeFieldIds}
                points={boundaryPoints}
                closed={boundaryClosed}
                mapLayer={mapLayer}
                onMapLayerChange={setMapLayer}
                onAddPoint={handleAddPoint}
                onUndoPoint={() => {
                  setBoundaryClosed(false);
                  setBoundaryPoints((current) => current.slice(0, -1));
                }}
                onClear={() => {
                  setBoundaryClosed(false);
                  setBoundaryPoints([]);
                }}
                onCloseBoundary={() => {
                  setBoundaryClosed(true);
                  setMode('boundary');
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Area decision</div>
                <Chip kind={decisionKind(decision.action)} dot={false}>{decision.action || 'PENDING'}</Chip>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{decision.title || 'Loading decision'}</div>
              <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>{decision.summary || 'Area summary will appear after analysis.'}</div>
              {!!decision.recommended_field_ids?.length && (
                <div style={{ marginTop: 12 }}>
                  <Progress value={Math.min(100, (decision.recommended_field_ids.length / Math.max(1, selectedFieldCount)) * 100)} max={100} label="Fields needing action" />
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Model evidence</div>
                <Chip kind={modelEvidence.available ? 'live' : 'off'} dot={false}>{modelEvidence.model_ready ? 'Ready' : 'Fallback'}</Chip>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <MiniMetric label="Predictions" value={`${modelEvidence.available_count ?? 0}/${(modelEvidence.fields || []).length}`} />
                <MiniMetric label="Confidence" value={modelEvidence.average_confidence !== null && modelEvidence.average_confidence !== undefined ? formatPct(Number(modelEvidence.average_confidence) * 100) : '-'} />
              </div>
              {modelEvidence.message && <div className="tiny muted" style={{ marginTop: 10 }}>{modelEvidence.message}</div>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {Object.entries(modelEvidence.recommendation_counts || {}).map(([name, count]) => (
                  <Chip key={name} kind={name === 'WATER_ON' ? 'warn' : 'info'} dot={false}>{name}: {String(count)}</Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ApiState loading={(fieldsLoading || summaryLoading) && !summary} error={error} onRetry={() => loadSummary(mode)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <KpiCard label="Soil moisture" icon="humidity" value={formatPct(kpis.average_soil_moisture_pct)} chip={{ kind: kpis.average_soil_moisture_pct < 55 ? 'warn' : 'live', text: 'Area avg' }} />
            <KpiCard label="Water level" icon="droplet" value={formatPct(kpis.average_water_level_pct)} chip={{ kind: kpis.average_water_level_pct < 45 ? 'warn' : 'info', text: 'Area avg' }} />
            <KpiCard label="Live fields" icon="wifi" value={`${kpis.live_fields ?? 0}`} chip={{ kind: (kpis.stale_fields || kpis.no_telemetry_fields) ? 'warn' : 'live', text: `${kpis.stale_fields ?? 0} stale` }} />
            <KpiCard label="Open valves" icon="valve" value={`${kpis.open_valves ?? 0}`} chip={{ kind: kpis.open_valves ? 'live' : 'off', text: `${kpis.pending_manual_requests ?? 0} pending` }} />
            <KpiCard label="Devices online" icon="flash" value={`${kpis.online_devices ?? 0}/${kpis.total_devices ?? 0}`} chip={{ kind: kpis.online_devices ? 'live' : 'off', text: 'Device health' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.8fr)', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div className="card-title">Selected fields</div>
                <Chip kind="info" dot={false}>{activeFieldIds.length} active</Chip>
              </div>
              {fields.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  No registered fields yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Field</th>
                        <th>Moisture</th>
                        <th>Water</th>
                        <th>Decision</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field: any, index: number) => {
                        const fieldId = getFieldId(field, index);
                        const row = (summary?.fields || []).find((item: any) => item.field_id === fieldId);
                        const selected = activeFieldIds.includes(fieldId);
                        return (
                          <tr key={fieldId} style={{ opacity: selected ? 1 : 0.56 }}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Select ${getFieldName(field, index)}`}
                                checked={selectedIds.includes(fieldId)}
                                onChange={() => toggleField(fieldId)}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{getFieldName(field, index)}</div>
                              <div className="tiny muted">{field.crop_type || field.crop || 'Not assigned'} / {formatArea(field.area_hectares || field.area)}</div>
                            </td>
                            <td className="tabular">{formatPct(row?.soil_moisture_pct)}</td>
                            <td className="tabular">{formatPct(row?.water_level_pct)}</td>
                            <td><Chip kind={row?.auto_action === 'OPEN' ? 'warn' : 'info'} dot={false}>{row?.auto_action || '-'}</Chip></td>
                            <td><Chip kind={fieldStatusKind(row?.overall_status)}>{row?.overall_status || 'Not analyzed'}</Chip></td>
                            <td><Link href={`/farmer/field/${fieldId}`} className="btn btn-ghost btn-sm">Workspace</Link></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Scenarios</div>
                <Chip kind="sim" dot={false}>{summary?.scenarios?.length || 0}</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {(summary?.scenarios || []).map((scenario: any) => (
                  <div key={scenario.scenario_id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{scenario.title}</div>
                      <Chip kind={scenario.action === 'REQUEST_REVIEW' ? 'crit' : scenario.action === 'DELAY' ? 'warn' : 'info'} dot={false}>
                        {scenario.action}
                      </Chip>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.55 }}>{scenario.summary}</div>
                    <div className="tiny muted" style={{ marginTop: 8 }}>{scenario.field_ids?.length || 0} field targets</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ApiState>
      </div>
    </Frame>
  );
}

function MiniMetric({ label, value }: any) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
      <div className="metric-label">{label}</div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerIrrigationPage />
    </div>
  );
}

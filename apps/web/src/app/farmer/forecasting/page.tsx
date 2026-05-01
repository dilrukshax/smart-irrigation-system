/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import Link from 'next/link';
import { Icon, Chip, Frame } from '@/components/asi/ui';
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

const asNumber = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMm = (value: any, digits = 1) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)} mm`;
};

const formatSignedMm = (value: any, digits = 1) => {
  const n = asNumber(value);
  if (n === null) return '-';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)} mm`;
};

const formatPct = (value: any, digits = 0) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(digits)}%`;
};

const formatTemp = (value: any) => {
  const n = asNumber(value);
  return n === null ? '-' : `${n.toFixed(1)} C`;
};

const formatArea = (value: any) => {
  const n = asNumber(value);
  return n === null ? '0 ha' : `${n.toFixed(2).replace(/\.00$/, '')} ha`;
};

const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
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

function boundaryFieldIds(fields: any[], points: LatLng[], closed: boolean) {
  if (!closed || points.length < 3) return [];
  return fields
    .filter((field) => {
      const coords = getCoords(field);
      return coords ? pointInPolygon(coords, points) : false;
    })
    .map((field, index) => getFieldId(field, index));
}

const decisionKind = (action?: string): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  if (action === 'PREPARE_IRRIGATION') return 'warn';
  if (action === 'REDUCE_IRRIGATION') return 'info';
  if (action === 'SKIP_IRRIGATION') return 'live';
  if (action === 'WATCH_WEATHER') return 'warn';
  return 'off';
};

const balanceKind = (value: any): 'live' | 'warn' | 'crit' | 'info' => {
  const n = asNumber(value);
  if (n === null) return 'info';
  if (n >= 0) return 'live';
  if (n <= -25) return 'crit';
  if (n <= -10) return 'warn';
  return 'info';
};

const fieldStatusKind = (status?: string): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const value = String(status || '').toUpperCase();
  if (value === 'CRITICAL') return 'crit';
  if (['WARNING', 'IRRIGATING'].includes(value)) return 'warn';
  if (value === 'OK') return 'live';
  return 'off';
};

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
    const layer = fieldLayerRef.current;
    if (!layer) return;
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
          color: isSelected ? '#0288D1' : '#6B7280',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#0288D1' : '#9CA3AF',
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
          <button type="button" className={mapLayer === 'satellite' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => onMapLayerChange('satellite')}>
            <Icon name="map" size={13}/> Satellite
          </button>
          <button type="button" className={mapLayer === 'terrain' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => onMapLayerChange('terrain')}>
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
          <button type="button" className="btn btn-primary btn-sm" onClick={onCloseBoundary} disabled={closed || points.length < 3}>
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

function MiniMetric({ label, value }: any) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
      <div className="metric-label">{label}</div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ModeButton({ active, icon, children, onClick }: any) {
  return (
    <button type="button" className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={onClick}>
      <Icon name={icon} size={13} color={active ? 'white' : 'currentColor'}/>
      {children}
    </button>
  );
}

function FarmerForecastingPage() {
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
      items: group.items.map((item) => ({ ...item, active: item.name === 'Forecast' })),
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
      const response = await apiPost<any>('/irrigation/farmer/forecast-area-summary', body);
      setSummary(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load forecast area summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [mode, selectedIds, boundaryIds, boundaryPoints, boundaryClosed]);

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
  const decision = summary?.forecast_decision || {};
  const modelSummary = summary?.model_summary || {};
  const advancedModel = modelSummary?.advanced_models || {};
  const basicModel = modelSummary?.basic_model || {};
  const daily = summary?.daily || [];
  const selectedFieldCount = summary?.selection?.field_count ?? activeFieldIds.length;
  const totalArea = summary?.selection?.total_hectares ?? fields.reduce((sum, field) => sum + Number(field.area_hectares || field.area || 0), 0);

  return (
    <Frame
      sidebar={activeNav}
      breadcrumb={['Farmer', 'Forecast']}
      user={displayName}
      role="Farmer"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="page-head">
          <div>
            <div className="page-title">Forecast area workspace</div>
            <div className="page-sub">{selectedFieldCount} selected fields / {formatArea(totalArea)} / {summary?.quality || 'loading'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={loadFields}>
              <Icon name="download" size={13}/> Refresh fields
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => loadSummary(mode)} disabled={summaryLoading}>
              <Icon name="cloud" size={13} color="white"/> {summaryLoading ? 'Forecasting...' : 'Forecast area'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 14 }}>
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
                <div className="card-title">Forecast decision</div>
                <Chip kind={decisionKind(decision.action)} dot={false}>{decision.action || 'PENDING'}</Chip>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{decision.title || 'Loading forecast'}</div>
              <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>{decision.summary || 'Area forecast guidance will appear after analysis.'}</div>
              {!!decision.key_dates?.length && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {decision.key_dates.slice(0, 5).map((date: string) => (
                    <Chip key={date} kind="info" dot={false}>{shortDate(date)}</Chip>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Forecast model</div>
                <Chip kind={modelSummary.available ? 'live' : 'off'} dot={false}>{modelSummary.available ? 'Available' : 'Fallback'}</Chip>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <MiniMetric label="Best model" value={advancedModel.best_model || basicModel.name || '-'} />
                <MiniMetric label="Weather scope" value={modelSummary?.scope?.weather || '-'} />
                <MiniMetric label="Features" value={advancedModel.features_engineered ?? basicModel.features_used_count ?? '-'} />
                <MiniMetric label="Uncertainty" value={advancedModel.uncertainty_supported ? 'On' : 'Off'} />
              </div>
              {modelSummary.message && <div className="tiny muted" style={{ marginTop: 10 }}>{modelSummary.message}</div>}
            </div>
          </div>
        </div>

        <ApiState loading={(fieldsLoading || summaryLoading) && !summary} error={error} onRetry={() => loadSummary(mode)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <KpiCard label="Expected rain" icon="cloud" value={formatMm(kpis.total_expected_rain_mm)} chip={{ kind: (kpis.total_expected_rain_mm || 0) > 25 ? 'live' : 'info', text: `${kpis.rainy_days_expected ?? 0} rainy days` }} />
            <KpiCard label="Expected ET" icon="sun" value={formatMm(kpis.total_expected_evapotranspiration_mm)} chip={{ kind: (kpis.high_heat_days || 0) ? 'warn' : 'info', text: `${kpis.high_heat_days ?? 0} hot days` }} />
            <KpiCard label="Water balance" icon="droplet" value={formatSignedMm(kpis.net_water_balance_mm)} chip={{ kind: balanceKind(kpis.net_water_balance_mm), text: '7-day balance' }} />
            <KpiCard label="Irrigation adjustment" icon="target" value={formatPct(kpis.average_irrigation_adjustment_percent)} chip={{ kind: (kpis.average_irrigation_adjustment_percent || 100) > 120 ? 'warn' : 'info', text: 'Forecast factor' }} />
            <KpiCard label="Average temp" icon="sun" value={formatTemp(kpis.average_temp_c)} chip={{ kind: (kpis.average_temp_c || 0) >= 32 ? 'warn' : 'info', text: 'Area weather' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div className="card-title">14-day forecast</div>
                <Chip kind={summary?.weather?.available || summary?.week_plan?.available ? 'live' : 'off'} dot={false}>
                  {daily.length} days
                </Chip>
              </div>
              {daily.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Forecast data unavailable.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Rain</th>
                        <th>ET</th>
                        <th>Balance</th>
                        <th>Temp</th>
                        <th>Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.slice(0, 14).map((day: any) => (
                        <tr key={day.date}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{shortDate(day.date)}</div>
                            <div className="tiny muted">{day.weather_description || 'Forecast'}</div>
                          </td>
                          <td className="tabular">{formatMm(day.rain_mm)}</td>
                          <td className="tabular">{formatMm(day.evapotranspiration_mm)}</td>
                          <td><Chip kind={balanceKind(day.water_balance_mm)} dot={false}>{formatSignedMm(day.water_balance_mm)}</Chip></td>
                          <td className="tabular">{formatTemp(day.temp_max_c)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Chip kind={day.recommendation === 'SKIP' ? 'live' : day.recommendation === 'INCREASE' ? 'warn' : 'info'} dot={false}>
                                {day.recommendation || 'NORMAL'}
                              </Chip>
                              <span className="tiny muted tabular">{formatPct(day.irrigation_percent)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Forecast scenarios</div>
                <Chip kind="sim" dot={false}>{summary?.scenarios?.length || 0}</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {(summary?.scenarios || []).map((scenario: any) => (
                  <div key={scenario.scenario_id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{scenario.title}</div>
                      <Chip kind={scenario.action === 'CHECK_SENSORS' ? 'warn' : scenario.action === 'PREPARE_IRRIGATION' ? 'crit' : 'info'} dot={false}>
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
                      <th>Telemetry</th>
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
                          <td><Chip kind={row?.reading_status === 'ok' ? 'live' : row?.reading_status === 'stale' ? 'warn' : 'off'} dot={false}>{row?.reading_status || 'Not analyzed'}</Chip></td>
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
        </ApiState>
      </div>
    </Frame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerForecastingPage />
    </div>
  );
}

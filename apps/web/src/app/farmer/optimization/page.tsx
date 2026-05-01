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
type LatLng = { lat: number; lng: number };

const SRI_LANKA_CENTER: LatLng = { lat: 7.8731, lng: 80.7718 };
const SOIL_TYPES = ['Clay', 'Clay Loam', 'Loam', 'Sandy Loam', 'Sandy Clay', 'Silty Loam', 'Red Loam'];

const asNumber = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatArea = (value: any) => {
  const n = asNumber(value);
  return n === null ? '0 ha' : `${n.toFixed(2).replace(/\.00$/, '')} ha`;
};

const formatMm = (value: any) => {
  const n = asNumber(value);
  return n === null ? '-' : `${Math.round(n)} mm`;
};

const formatPct = (value: any, digits = 0) => {
  const n = asNumber(value);
  return n === null ? '-' : `${(n * (n <= 1 ? 100 : 1)).toFixed(digits)}%`;
};

const formatMoney = (value: any) => {
  const n = asNumber(value);
  return n === null ? '-' : `LKR ${Math.round(n / 1000)}k`;
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

const riskKind = (risk?: string): 'live' | 'warn' | 'crit' | 'info' | 'off' => {
  const value = String(risk || '').toLowerCase();
  if (value === 'low') return 'live';
  if (value === 'medium') return 'warn';
  if (value === 'high') return 'crit';
  return 'info';
};

function makeDefaultScenarios() {
  return [
    { scenario_id: 'current-plan', title: 'Current', soil_type: 'Loam', season_rainfall_mm: 300, season_avg_temp: 28, water_availability_mm: 500, price_factor: 1 },
    { scenario_id: 'dry-shift', title: 'Dry', soil_type: 'Sandy Loam', season_rainfall_mm: 160, season_avg_temp: 31, water_availability_mm: 320, price_factor: 1.05 },
    { scenario_id: 'wet-shift', title: 'Wet', soil_type: 'Clay Loam', season_rainfall_mm: 520, season_avg_temp: 27, water_availability_mm: 850, price_factor: 0.98 },
  ];
}

function shuffleScenarios() {
  const pick = (items: any[]) => items[Math.floor(Math.random() * items.length)];
  return ['shuffle-a', 'shuffle-b', 'shuffle-c'].map((id, index) => {
    const rain = Math.round(80 + Math.random() * 700);
    const temp = Number((24 + Math.random() * 10).toFixed(1));
    const water = Math.round(180 + Math.random() * 1100);
    return {
      scenario_id: `${id}-${Date.now()}-${index}`,
      title: `Shuffle ${index + 1}`,
      soil_type: pick(SOIL_TYPES),
      season_rainfall_mm: rain,
      season_avg_temp: temp,
      water_availability_mm: water,
      price_factor: Number((0.85 + Math.random() * 0.35).toFixed(2)),
    };
  });
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
        if (!closedRef.current) onAddPointRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
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
          color: isSelected ? '#7C3AED' : '#6B7280',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#7C3AED' : '#9CA3AF',
          fillOpacity: isSelected ? 0.9 : 0.65,
        }).addTo(layer);
        marker.bindPopup(`<div style="font-family: sans-serif; font-size: 12px;"><b>${getFieldName(field, index)}</b><br/>${field.soil_type || field.crop_type || 'Field'}</div>`);
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
        L.polygon(latLngs, { color: '#7C3AED', weight: 2, fillColor: '#7C3AED', fillOpacity: 0.16 }).addTo(layer);
      } else if (points.length >= 2) {
        L.polyline(latLngs, { color: '#7C3AED', weight: 2, dashArray: '6 6' }).addTo(layer);
      }
      latLngs.forEach((latLng: any, index: number) => {
        L.circleMarker(latLng, { radius: 4, color: '#7C3AED', weight: 2, fillColor: 'white', fillOpacity: 1 })
          .bindTooltip(`${index + 1}`, { permanent: false })
          .addTo(layer);
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
      <div ref={containerRef} style={{ width: '100%', height: 360, borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', background: '#EAF1E8' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="tiny muted">Boundary points: {points.length}</span>
        <span className="tiny muted">Selected fields: {selectedFieldIds.length}</span>
      </div>
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

function KpiCard({ label, value, icon, chip }: any) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="tiny muted">{label}</div>
        <Icon name={icon} size={14} color="var(--muted)" />
      </div>
      <div className="tabular" style={{ fontSize: 23, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {chip && <div style={{ marginTop: 8 }}><Chip kind={chip.kind} dot={false}>{chip.text}</Chip></div>}
    </div>
  );
}

function FarmerOptimizationPage() {
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
  const [season, setSeason] = React.useState('Yala-2026');
  const [scenarioDrafts, setScenarioDrafts] = React.useState<any[]>(makeDefaultScenarios);

  const displayName = user?.username || 'Farmer';
  const activeNav = React.useMemo(
    () => farmerNav.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, active: item.name === 'Optimization' })),
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
      let fieldIds = fields.map(getFieldId);
      let bodyMode: any = 'all';
      let boundary: any = null;
      if (nextMode === 'selected') {
        fieldIds = selectedIds;
        bodyMode = 'fields';
      }
      if (nextMode === 'boundary') {
        boundary = buildBoundary(boundaryPoints, boundaryClosed);
        if (!boundary) {
          setError('Close the map area before running optimization.');
          return;
        }
        fieldIds = boundaryIds;
        bodyMode = 'boundary';
      }
      const response = await apiPost<any>('/planning/farmer/area-optimize', {
        mode: bodyMode,
        field_ids: fieldIds,
        boundary,
        season,
        top_n: 5,
        scenarios: scenarioDrafts.map((scenario) => ({
          ...scenario,
          season_rainfall_mm: Number(scenario.season_rainfall_mm),
          season_avg_temp: Number(scenario.season_avg_temp),
          water_availability_mm: Number(scenario.water_availability_mm),
          price_factor: Number(scenario.price_factor),
        })),
      });
      setSummary(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load crop optimization summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [mode, fields, selectedIds, boundaryIds, boundaryPoints, boundaryClosed, season, scenarioDrafts]);

  React.useEffect(() => {
    loadFields();
  }, [loadFields]);

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

  const updateScenario = (index: number, key: string, value: any) => {
    setScenarioDrafts((current) => current.map((scenario, i) => i === index ? { ...scenario, [key]: value } : scenario));
  };

  const bestCrop = summary?.best_crop || null;
  const selectedFieldCount = summary?.selection?.field_count ?? activeFieldIds.length;
  const totalArea = summary?.selection?.total_hectares ?? fields.reduce((sum, field) => sum + Number(field.area_hectares || field.area || 0), 0);

  return (
    <Frame sidebar={activeNav} breadcrumb={['Farmer', 'Optimization']} user={displayName} role="Farmer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="page-head">
          <div>
            <div className="page-title">Optimization area workspace</div>
            <div className="page-sub">{selectedFieldCount} selected fields / {formatArea(totalArea)} / {bestCrop?.crop_name || summary?.quality || 'ready'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={loadFields}>
              <Icon name="download" size={13}/> Refresh fields
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => loadSummary(mode)} disabled={summaryLoading}>
              <Icon name="target" size={13} color="white"/> {summaryLoading ? 'Optimizing...' : 'Run optimization'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 390px), 1fr))', gap: 14 }}>
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

          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="target" size={14} color="var(--primary-600)"/> Scenario inputs</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setScenarioDrafts(makeDefaultScenarios())}>
                  <Icon name="x" size={13}/> Reset
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={() => setScenarioDrafts(shuffleScenarios())}>
                  <Icon name="flash" size={13} color="white"/> Shuffle
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div className="field">
                <label>Season</label>
                <select className="select" value={season} onChange={(event) => setSeason(event.target.value)}>
                  <option value="Yala-2026">Yala-2026</option>
                  <option value="Maha-2026">Maha-2026</option>
                  <option value="Yala-2027">Yala-2027</option>
                </select>
              </div>
              <div className="field">
                <label>Scenarios</label>
                <input className="input" value={`${scenarioDrafts.length} active`} readOnly />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {scenarioDrafts.map((scenario, index) => (
                <div key={scenario.scenario_id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="field">
                      <label>{scenario.title} soil</label>
                      <select className="select" value={scenario.soil_type} onChange={(event) => updateScenario(index, 'soil_type', event.target.value)}>
                        {SOIL_TYPES.map((soil) => <option key={soil} value={soil}>{soil}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Price factor</label>
                      <input className="input" type="number" min="0.5" max="2" step="0.05" value={scenario.price_factor} onChange={(event) => updateScenario(index, 'price_factor', event.target.value)} />
                    </div>
                    <ScenarioSlider label="Rain" value={scenario.season_rainfall_mm} min={0} max={900} unit="mm" onChange={(value: number) => updateScenario(index, 'season_rainfall_mm', value)} />
                    <ScenarioSlider label="Water" value={scenario.water_availability_mm} min={0} max={1500} unit="mm" onChange={(value: number) => updateScenario(index, 'water_availability_mm', value)} />
                    <ScenarioSlider label="Temp" value={scenario.season_avg_temp} min={20} max={38} unit="C" step={0.5} onChange={(value: number) => updateScenario(index, 'season_avg_temp', value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ApiState loading={(fieldsLoading || summaryLoading) && !summary} error={error} onRetry={() => loadSummary(mode)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            <KpiCard label="Best crop" icon="leaf" value={bestCrop?.crop_name || '-'} chip={{ kind: riskKind(bestCrop?.risk_level), text: bestCrop?.risk_level || 'No run' }} />
            <KpiCard label="Score" icon="target" value={formatPct(bestCrop?.average_combined_score)} chip={{ kind: 'info', text: `${bestCrop?.first_place_count ?? 0} wins` }} />
            <KpiCard label="Profit / ha" icon="chart" value={formatMoney(bestCrop?.average_profit_per_ha)} chip={{ kind: 'live', text: `${formatPct(bestCrop?.average_roi_percentage, 0)} ROI` }} />
            <KpiCard label="Water need" icon="droplet" value={formatMm(bestCrop?.average_water_requirement_mm)} chip={{ kind: bestCrop?.water_sensitivity === 'high' ? 'warn' : 'info', text: bestCrop?.water_sensitivity || '-' }} />
            <KpiCard label="Crops ranked" icon="grid" value={`${summary?.crop_rankings?.length ?? 0}`} chip={{ kind: 'info', text: `${summary?.scenarios?.length ?? scenarioDrafts.length} scenarios` }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div className="card-title">Area crop ranking</div>
                <Chip kind={bestCrop ? 'live' : 'off'} dot={false}>{summary?.status || 'pending'}</Chip>
              </div>
              {!summary?.crop_rankings?.length ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No crop ranking yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th>Score</th>
                        <th>Profit</th>
                        <th>Water</th>
                        <th>Risk</th>
                        <th>Wins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.crop_rankings.slice(0, 10).map((crop: any) => (
                        <tr key={crop.crop_id}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{crop.crop_name}</div>
                            <div className="tiny muted">{crop.water_sensitivity} water sensitivity</div>
                          </td>
                          <td className="tabular">{formatPct(crop.average_combined_score)}</td>
                          <td className="tabular">{formatMoney(crop.average_profit_per_ha)}</td>
                          <td className="tabular">{formatMm(crop.average_water_requirement_mm)}</td>
                          <td><Chip kind={riskKind(crop.risk_level)} dot={false}>{crop.risk_level}</Chip></td>
                          <td className="tabular">{crop.first_place_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Scenario winners</div>
                <Chip kind="sim" dot={false}>{summary?.scenarios?.length || 0}</Chip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {(summary?.scenarios || []).map((scenario: any) => (
                  <div key={scenario.scenario_id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800 }}>{scenario.title}</div>
                        <div className="tiny muted" style={{ marginTop: 4 }}>{scenario.inputs.soil_type} / {formatMm(scenario.inputs.season_rainfall_mm)} rain / {formatMm(scenario.inputs.water_availability_mm)} water</div>
                      </div>
                      <Chip kind={riskKind(scenario.best_crop?.risk_level)} dot={false}>
                        {scenario.best_crop?.crop_name || '-'}
                      </Chip>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 8 }}>{scenario.field_results?.length || 0} fields / {scenario.crop_rankings?.length || 0} crops</div>
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
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No registered fields yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Field</th>
                      <th>Soil</th>
                      <th>Area</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field: any, index: number) => {
                      const fieldId = getFieldId(field, index);
                      const selected = activeFieldIds.includes(fieldId);
                      return (
                        <tr key={fieldId} style={{ opacity: selected ? 1 : 0.56 }}>
                          <td>
                            <input aria-label={`Select ${getFieldName(field, index)}`} type="checkbox" checked={selectedIds.includes(fieldId)} onChange={() => toggleField(fieldId)} />
                          </td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{getFieldName(field, index)}</div>
                            <div className="tiny muted">{field.crop_type || field.crop || 'Not assigned'}</div>
                          </td>
                          <td>{field.soil_type || '-'}</td>
                          <td className="tabular">{formatArea(field.area_hectares || field.area)}</td>
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

function ScenarioSlider({ label, value, min, max, step = 10, unit, onChange }: any) {
  return (
    <div className="field">
      <label>{label} <span className="tabular" style={{ color: 'var(--text)', fontWeight: 700 }}>{value} {unit}</span></label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: 'var(--primary)' }}
      />
    </div>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FarmerOptimizationPage />
    </div>
  );
}

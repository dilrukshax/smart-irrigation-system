/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { Icon, Chip, Gauge, Progress } from '@/components/asi/ui';
import { ApiState } from '@/components/asi/api-state';
import {
  FieldHealthMap,
  type ObservationKind,
  type ObservationMarker,
  type DeviceMarker,
} from '@/components/asi/field-health-map';
import { apiGet, apiPost, apiPatch, apiDelete, uploadFile } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StressSummary {
  field_id: string;
  generated_at?: string | null;
  stress_index?: number | null;
  priority?: string | null;
  stress_penalty_factor?: number | null;
  healthy_ratio?: number | null;
  mild_stress_ratio?: number | null;
  severe_stress_ratio?: number | null;
  recommended_action?: string | null;
  source?: string | null;
  status?: string | null;
  is_live?: boolean | null;
  observed_at?: string | null;
  data_available?: boolean | null;
  message?: string | null;
}

interface ZoneFeature {
  type: 'Feature';
  geometry: any;
  properties: {
    zone_id?: string;
    name?: string;
    health_status?: string;
    color?: string;
    risk_level?: string;
    ndvi?: number;
    ndwi?: number;
    area_hectares?: number;
    confidence?: number;
    recommendation?: string | null;
  };
}

interface ZoneCollection {
  type: 'FeatureCollection';
  features: ZoneFeature[];
  metadata?: any;
}

interface ZoneSummary {
  total_zones: number;
  healthy_count: number;
  mild_stress_count: number;
  severe_stress_count: number;
  total_area_hectares: number;
  average_ndvi: number;
  average_ndwi: number;
  last_updated?: string;
}

interface FieldObservation {
  observation_id: string;
  field_id: string;
  latitude: number;
  longitude: number;
  kind: ObservationKind;
  severity?: string | null;
  title: string;
  note?: string | null;
  photo_url?: string | null;
  prediction_label?: string | null;
  prediction_confidence?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface PredictionResult {
  predicted_class?: string;
  confidence?: number;
  health_status?: string;
  severity?: string;
  recommendation?: string;
  color?: string;
  risk_level?: string;
  message?: string;
  error?: string;
}

interface IrrigationSummaryDeviceItem {
  device_id: string;
  is_online: boolean | null;
}

interface IrrigationSummary {
  field?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  devices?: {
    items?: IrrigationSummaryDeviceItem[];
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const formatPct = (v: any, digits = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
};

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString();
};

const priorityKind = (priority: string | null | undefined): 'live' | 'warn' | 'crit' | 'info' => {
  const norm = String(priority || '').toLowerCase();
  if (norm === 'critical') return 'crit';
  if (norm === 'high') return 'warn';
  if (norm === 'low') return 'live';
  return 'info';
};

const KIND_OPTIONS: { value: ObservationKind; label: string; description: string }[] = [
  { value: 'disease', label: 'Disease', description: 'Visible disease on plant tissue' },
  { value: 'pest', label: 'Pest', description: 'Insect / animal damage observed' },
  { value: 'water_stress', label: 'Water stress', description: 'Wilting, drought signs' },
  { value: 'healthy', label: 'Healthy', description: 'Strong, well-growing patch' },
  { value: 'note', label: 'Note', description: 'General field observation' },
];

const SEVERITY_OPTIONS: { value: '' | 'low' | 'medium' | 'high' | 'critical'; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// Map F2 prediction.severity → our observation severity enum.
const PREDICTION_SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  none: 'low',
  moderate: 'medium',
  high: 'high',
};

// ---------------------------------------------------------------------------
// sessionStorage cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000;

interface CachedData {
  fetchedAt: number;
  stress: StressSummary | null;
  zones: ZoneCollection | null;
  observations: FieldObservation[];
}

function readCache(fieldId: string): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`crop-health-${fieldId}`);
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(fieldId: string, data: Omit<CachedData, 'fetchedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      `crop-health-${fieldId}`,
      JSON.stringify({ fetchedAt: Date.now(), ...data }),
    );
  } catch {
    // sessionStorage may be full or disabled — ignore.
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CropHealthPanelProps {
  fieldId: string;
  fieldStatus?: any;
  onRefresh?: () => void;
}

export function CropHealthPanel({ fieldId, fieldStatus, onRefresh }: CropHealthPanelProps) {
  const cached = readCache(fieldId);
  const [stress, setStress] = React.useState<StressSummary | null>(cached?.stress ?? null);
  const [zones, setZones] = React.useState<ZoneCollection | null>(cached?.zones ?? null);
  const [observations, setObservations] = React.useState<FieldObservation[]>(
    cached?.observations ?? [],
  );
  const [loading, setLoading] = React.useState(!cached);
  const [error, setError] = React.useState<string | null>(null);
  const [mapLayer, setMapLayer] = React.useState<'terrain' | 'satellite'>('satellite');
  const [deviceMarkers, setDeviceMarkers] = React.useState<DeviceMarker[]>([]);

  // Drop-pin / observation modal state
  const [addMode, setAddMode] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<'create' | 'edit'>('create');
  const [draftObservation, setDraftObservation] = React.useState<{
    observation_id?: string;
    latitude: number;
    longitude: number;
    kind: ObservationKind;
    severity: '' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    note: string;
    prediction_label?: string | null;
    prediction_confidence?: number | null;
  } | null>(null);
  const [modalSubmitting, setModalSubmitting] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [focusedObservationId, setFocusedObservationId] = React.useState<string | null>(null);

  // Image diagnosis state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [predictionResult, setPredictionResult] = React.useState<PredictionResult | null>(null);

  // Resolve field center coordinates
  const fieldLat = Number(fieldStatus?.latitude);
  const fieldLon = Number(fieldStatus?.longitude);
  const centerLat = Number.isFinite(fieldLat) ? fieldLat : 7.21;
  const centerLon = Number.isFinite(fieldLon) ? fieldLon : 80.65;
  const fieldArea = Math.max(0.5, Number(fieldStatus?.area_hectares) || 1.0);

  // Tune zone request to the field's footprint (capped to 4 km², ≥1 km²)
  const zoneAreaKm2 = Math.max(1, Math.min(4, fieldArea * 0.05));

  const loadAll = React.useCallback(
    async (silent = false) => {
      if (!fieldId) return;
      if (!silent) setLoading(true);
      setError(null);

      const stressUrl = `/crop-health/fields/${fieldId}/stress-summary`;
      const zonesUrl = `/crop-health/zones/geojson?lat=${centerLat}&lon=${centerLon}&area_km2=${zoneAreaKm2}&num_zones=6`;
      const observationsUrl = `/farm/fields/${fieldId}/observations?limit=200`;
      const irrigationUrl = `/irrigation/farmer/fields/${fieldId}/summary`;

      try {
        const [stressRes, zonesRes, observationsRes, irrigationRes] = await Promise.all([
          apiGet<StressSummary>(stressUrl).catch(() => null),
          apiGet<ZoneCollection>(zonesUrl).catch(() => null),
          apiGet<{ items: FieldObservation[] }>(observationsUrl),
          apiGet<IrrigationSummary>(irrigationUrl).catch(() => null),
        ]);

        const items = Array.isArray(observationsRes?.items) ? observationsRes.items : [];
        setStress(stressRes);
        setZones(zonesRes);
        setObservations(items);
        writeCache(fieldId, { stress: stressRes, zones: zonesRes, observations: items });

        // Devices: pulled from the irrigation aggregator (already shipped). If unavailable,
        // fall back to a single primary device pin at field center if known.
        const deviceItems = Array.isArray(irrigationRes?.devices?.items)
          ? irrigationRes.devices.items
          : [];
        if (deviceItems.length > 0) {
          setDeviceMarkers(
            deviceItems
              .filter((d: any) => d?.device_id)
              .map((d: any) => ({
                id: d.device_id,
                lat: centerLat,
                lon: centerLon,
                online: d.is_online === true,
              })),
          );
        } else {
          setDeviceMarkers([]);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load crop health data');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fieldId, centerLat, centerLon, zoneAreaKm2],
  );

  React.useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  // 60 s background refresh while tab is visible
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') {
        loadAll(true);
      }
    };
    const handle = window.setInterval(tick, 60_000);
    return () => window.clearInterval(handle);
  }, [loadAll]);

  // ---- Drop-pin flow ----
  const handleMapAdd = (lat: number, lon: number) => {
    setAddMode(false);
    setDraftObservation({
      latitude: lat,
      longitude: lon,
      kind: 'note',
      severity: '',
      title: '',
      note: '',
    });
    setModalMode('create');
    setModalError(null);
    setModalOpen(true);
  };

  const startNewObservation = () => {
    setDraftObservation({
      latitude: centerLat,
      longitude: centerLon,
      kind: 'note',
      severity: '',
      title: '',
      note: '',
    });
    setModalMode('create');
    setModalError(null);
    setModalOpen(true);
  };

  const startEditObservation = (obs: FieldObservation) => {
    setDraftObservation({
      observation_id: obs.observation_id,
      latitude: obs.latitude,
      longitude: obs.longitude,
      kind: obs.kind,
      severity: (obs.severity as any) || '',
      title: obs.title,
      note: obs.note || '',
      prediction_label: obs.prediction_label,
      prediction_confidence: obs.prediction_confidence,
    });
    setModalMode('edit');
    setModalError(null);
    setModalOpen(true);
  };

  const submitObservation = async () => {
    if (!draftObservation) return;
    if (!draftObservation.title.trim()) {
      setModalError('Please give the observation a title.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);

    const body: any = {
      kind: draftObservation.kind,
      title: draftObservation.title.trim(),
    };
    if (draftObservation.severity) body.severity = draftObservation.severity;
    if (draftObservation.note?.trim()) body.note = draftObservation.note.trim();
    if (modalMode === 'create') {
      body.latitude = draftObservation.latitude;
      body.longitude = draftObservation.longitude;
      if (draftObservation.prediction_label)
        body.prediction_label = draftObservation.prediction_label;
      if (typeof draftObservation.prediction_confidence === 'number')
        body.prediction_confidence = draftObservation.prediction_confidence;
    }

    try {
      if (modalMode === 'create') {
        await apiPost<FieldObservation>(
          `/farm/fields/${fieldId}/observations`,
          body,
        );
      } else if (draftObservation.observation_id) {
        await apiPatch<FieldObservation>(
          `/farm/fields/${fieldId}/observations/${draftObservation.observation_id}`,
          body,
        );
      }
      setModalOpen(false);
      setDraftObservation(null);
      await loadAll(true);
      onRefresh?.();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save observation');
    } finally {
      setModalSubmitting(false);
    }
  };

  const deleteObservation = async (obs: FieldObservation) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${obs.title}"?`)) return;
    try {
      await apiDelete(`/farm/fields/${fieldId}/observations/${obs.observation_id}`);
      await loadAll(true);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete observation');
    }
  };

  // ---- Image diagnosis ----
  const handleImageUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    setPredictionResult(null);
    try {
      const res = await uploadFile<PredictionResult>('/crop-health/predict', uploadedFile);
      setPredictionResult(res);
    } catch (err: any) {
      setPredictionResult({ error: err?.message || 'Prediction failed' });
    } finally {
      setUploading(false);
    }
  };

  const saveDiagnosisAsObservation = () => {
    if (!predictionResult || predictionResult.error) return;
    const mappedSeverity =
      PREDICTION_SEVERITY_MAP[String(predictionResult.severity || '').toLowerCase()] || '';
    const isHealthy = String(predictionResult.health_status || '')
      .toLowerCase()
      .includes('healthy');
    setDraftObservation({
      latitude: centerLat,
      longitude: centerLon,
      kind: isHealthy ? 'healthy' : 'disease',
      severity: mappedSeverity as any,
      title: predictionResult.predicted_class || 'Image diagnosis',
      note: predictionResult.recommendation || '',
      prediction_label: predictionResult.predicted_class,
      prediction_confidence: predictionResult.confidence,
    });
    setModalMode('create');
    setModalError(null);
    setModalOpen(true);
  };

  // ---- Derived view-model ----
  const stressIndex = Number(stress?.stress_index);
  const healthScorePct =
    Number.isFinite(stressIndex) ? Math.max(0, Math.min(100, Math.round((1 - stressIndex) * 100))) : null;
  const healthColor =
    healthScorePct === null
      ? 'var(--muted)'
      : healthScorePct >= 70
        ? 'var(--primary)'
        : healthScorePct >= 40
          ? '#F59E0B'
          : 'var(--danger, #DC2626)';

  const zoneFeatures = Array.isArray(zones?.features) ? zones.features : [];
  const zoneNdviValues = zoneFeatures
    .map((feature) => Number(feature?.properties?.ndvi))
    .filter((value) => Number.isFinite(value));
  const zoneNdwiValues = zoneFeatures
    .map((feature) => Number(feature?.properties?.ndwi))
    .filter((value) => Number.isFinite(value));
  const averageNdvi = zoneNdviValues.length
    ? zoneNdviValues.reduce((sum, value) => sum + value, 0) / zoneNdviValues.length
    : null;
  const averageNdwi = zoneNdwiValues.length
    ? zoneNdwiValues.reduce((sum, value) => sum + value, 0) / zoneNdwiValues.length
    : null;

  const observationMarkers: ObservationMarker[] = observations.map((obs) => ({
    id: obs.observation_id,
    lat: obs.latitude,
    lon: obs.longitude,
    kind: obs.kind,
    title: obs.title,
    severity: obs.severity,
  }));

  const focusObservation = (id: string) => {
    setFocusedObservationId(id);
    window.setTimeout(() => {
      document
        .getElementById(`observation-${id}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  };

  return (
    <ApiState loading={loading} error={error} onRetry={() => loadAll(false)}>
      <div className="crop-health-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ----- KPI strip ----- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          <KpiCard
            label="Health score"
            icon="leaf"
            value={healthScorePct !== null ? `${healthScorePct}` : '—'}
            caption={
              stressIndex !== null && Number.isFinite(stressIndex)
                ? `Stress index ${stressIndex.toFixed(2)}`
                : 'No stress data'
            }
            chip={
              stress?.priority
                ? { kind: priorityKind(stress.priority), text: stress.priority }
                : { kind: 'off', text: 'Unavailable' }
            }
          />
          <KpiCard
            label="Healthy zones"
            icon="leaf"
            value={
              Number.isFinite(Number(stress?.healthy_ratio))
                ? `${Math.round(Number(stress!.healthy_ratio) * 100)}%`
                : '—'
            }
            caption={
              Number.isFinite(Number(stress?.severe_stress_ratio))
                ? `Severe ${Math.round(Number(stress!.severe_stress_ratio) * 100)}%`
                : 'No zone data'
            }
            chip={
              Number.isFinite(Number(stress?.severe_stress_ratio)) &&
              Number(stress!.severe_stress_ratio) > 0.2
                ? { kind: 'crit', text: 'Action needed' }
                : { kind: 'live', text: 'Stable' }
            }
          />
          <KpiCard
            label="Average NDVI"
            icon="cloud"
            value={
              Number.isFinite(Number(averageNdvi))
                ? Number(averageNdvi).toFixed(2)
                : '—'
            }
            caption={
              Number.isFinite(Number(averageNdwi))
                ? `NDWI ${Number(averageNdwi).toFixed(2)}`
                : 'No vegetation index'
            }
          />
          <KpiCard
            label="Last analysis"
            icon="target"
            value={formatRelative(stress?.observed_at || stress?.generated_at)}
            caption={stress?.source ? `Source: ${stress.source}` : 'Awaiting analysis'}
            chip={
              stress?.is_live
                ? { kind: 'live', text: 'Live' }
                : { kind: 'off', text: 'Cached' }
            }
          />
        </div>

        {/* ----- Map card ----- */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="droplet" size={14} color="var(--primary-600)" /> Field map
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={addMode ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setAddMode((v) => !v)}
              >
                {addMode ? 'Cancel pin' : 'Drop pin'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => loadAll(false)}
              >
                <Icon name="refresh" size={12} /> Refresh
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <FieldHealthMap
              center={{ lat: centerLat, lon: centerLon }}
              zonesGeoJson={zones || null}
              observations={observationMarkers}
              deviceMarkers={deviceMarkers}
              addMode={addMode}
              onAdd={handleMapAdd}
              onMarkerClick={focusObservation}
              mapLayer={mapLayer}
              onMapLayerChange={setMapLayer}
              focusedObservationId={focusedObservationId}
              height={400}
            />
          </div>

          {!zones && (
            <div className="tiny muted" style={{ marginTop: 8 }}>
              Zone overlay unavailable. NDVI/NDWI estimates are model-derived; refresh to retry.
            </div>
          )}
        </div>

        {/* ----- Observations list ----- */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="target" size={14} color="var(--primary-600)" /> Field observations · {observations.length}
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={startNewObservation}>
              + New observation
            </button>
          </div>

          {observations.length === 0 ? (
            <div className="tiny muted" style={{ marginTop: 10 }}>
              No observations yet. Click <b>Drop pin</b> on the map or <b>+ New observation</b> to record one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {observations.map((obs) => (
                <div
                  key={obs.observation_id}
                  id={`observation-${obs.observation_id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 10,
                    border:
                      focusedObservationId === obs.observation_id
                        ? '2px solid var(--primary)'
                        : '1px solid var(--border)',
                    borderRadius: 10,
                    background:
                      focusedObservationId === obs.observation_id ? 'var(--primary-50)' : 'white',
                  }}
                >
                  <ObservationKindBadge kind={obs.kind} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{obs.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      <Chip kind="info" dot={false}>{obs.kind.replace('_', ' ')}</Chip>
                      {obs.severity && (
                        <Chip
                          kind={
                            obs.severity === 'critical' || obs.severity === 'high'
                              ? 'crit'
                              : obs.severity === 'medium'
                                ? 'warn'
                                : 'live'
                          }
                          dot={false}
                        >
                          {obs.severity}
                        </Chip>
                      )}
                      <span className="tiny muted">{formatRelative(obs.created_at)}</span>
                    </div>
                    {obs.note && (
                      <div className="tiny" style={{ marginTop: 4, color: 'var(--text)' }}>
                        {obs.note}
                      </div>
                    )}
                    {obs.prediction_label && (
                      <div className="tiny muted" style={{ marginTop: 4 }}>
                        Diagnosis: <b>{obs.prediction_label}</b>
                        {typeof obs.prediction_confidence === 'number'
                          ? ` (${Math.round(obs.prediction_confidence * 100)}% conf.)`
                          : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFocusedObservationId(obs.observation_id)}
                    >
                      View on map
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => startEditObservation(obs)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteObservation(obs)}
                      style={{ color: 'var(--danger, #DC2626)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ----- Image diagnosis card ----- */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Icon name="leaf" size={14} color="var(--primary-600)" /> Image diagnosis
            </div>
          </div>

          <div className="field" style={{ marginTop: 8 }}>
            <label>Upload a leaf photo for disease detection</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              className="input"
              disabled={uploading}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8, width: '100%' }}
            onClick={handleImageUpload}
            disabled={!uploadedFile || uploading}
          >
            {uploading ? 'Analyzing…' : 'Run detection'}
          </button>

          {predictionResult && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: predictionResult.error ? '#FEE2E2' : 'var(--primary-50)',
                border: `1px solid ${predictionResult.error ? '#FECACA' : 'var(--primary)'}`,
                borderRadius: 8,
                fontSize: 12.5,
              }}
            >
              {predictionResult.error ? (
                <div style={{ color: '#DC2626' }}>{predictionResult.error}</div>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {predictionResult.predicted_class || 'Unknown'}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    {predictionResult.health_status || '—'}
                    {typeof predictionResult.confidence === 'number'
                      ? ` · ${Math.round(predictionResult.confidence * 100)}% confidence`
                      : ''}
                    {predictionResult.severity ? ` · severity ${predictionResult.severity}` : ''}
                  </div>
                  {predictionResult.recommendation && (
                    <div className="tiny" style={{ marginTop: 6 }}>
                      {predictionResult.recommendation}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={saveDiagnosisAsObservation}
                  >
                    Save as observation
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ----- Recommendations / Stress alerts ----- */}
        {(stress?.recommended_action || stress?.message) && (
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <Icon name="target" size={14} color="var(--primary-600)" /> Recommendation
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {stress?.recommended_action || stress?.message}
            </div>
            {Number.isFinite(Number(stress?.stress_penalty_factor)) && (
              <div style={{ marginTop: 10 }}>
                <Progress
                  value={Math.round(Number(stress!.stress_penalty_factor) * 100)}
                  max={100}
                  label={`Stress penalty factor: ${(Number(stress!.stress_penalty_factor) * 100).toFixed(0)}%`}
                />
              </div>
            )}
          </div>
        )}

        {/* ----- Observation modal ----- */}
        {modalOpen && draftObservation && (
          <ObservationModal
            mode={modalMode}
            draft={draftObservation}
            submitting={modalSubmitting}
            error={modalError}
            onChange={setDraftObservation}
            onSubmit={submitObservation}
            onClose={() => {
              setModalOpen(false);
              setModalError(null);
            }}
          />
        )}
      </div>
    </ApiState>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  icon: string;
  value: string;
  caption?: string;
  chip?: { kind: 'live' | 'warn' | 'crit' | 'info' | 'off'; text: string };
}

function KpiCard({ label, icon, value, caption, chip }: KpiCardProps) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="tiny muted">{label}</div>
        <Icon name={icon} size={13} color="var(--muted)" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {chip && (
        <div style={{ marginTop: 6 }}>
          <Chip kind={chip.kind} dot={false}>{chip.text}</Chip>
        </div>
      )}
      {caption && <div className="tiny muted" style={{ marginTop: 6 }}>{caption}</div>}
    </div>
  );
}

const KIND_BADGE_COLORS: Record<ObservationKind, string> = {
  disease: '#DC2626',
  pest: '#EA580C',
  water_stress: '#2563EB',
  healthy: '#16A34A',
  note: '#6B7280',
};

function ObservationKindBadge({ kind }: { kind: ObservationKind }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: '50% 50% 50% 0',
        transform: 'rotate(-45deg)',
        background: KIND_BADGE_COLORS[kind] || KIND_BADGE_COLORS.note,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      <span style={{ transform: 'rotate(45deg)' }}>
        {kind === 'disease' ? '!' : kind === 'pest' ? 'P' : kind === 'water_stress' ? '~' : kind === 'healthy' ? '✓' : '•'}
      </span>
    </div>
  );
}

interface ObservationModalProps {
  mode: 'create' | 'edit';
  draft: {
    observation_id?: string;
    latitude: number;
    longitude: number;
    kind: ObservationKind;
    severity: '' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    note: string;
    prediction_label?: string | null;
    prediction_confidence?: number | null;
  };
  submitting: boolean;
  error: string | null;
  onChange: (next: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function ObservationModal({
  mode,
  draft,
  submitting,
  error,
  onChange,
  onSubmit,
  onClose,
}: ObservationModalProps) {
  const update = (patch: Partial<typeof draft>) => onChange({ ...draft, ...patch });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 520, width: '100%', padding: 18, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-head">
          <div className="card-title">
            {mode === 'create' ? 'New observation' : 'Edit observation'}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Title</label>
            <input
              className="input"
              type="text"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              maxLength={160}
              placeholder="e.g. Brown spots on tomato leaves"
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label>Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {KIND_OPTIONS.map((opt) => {
                const active = draft.kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ kind: opt.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: active ? 'var(--primary-50)' : 'white',
                      color: active ? 'var(--primary-600)' : 'var(--text)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              {KIND_OPTIONS.find((o) => o.value === draft.kind)?.description}
            </div>
          </div>

          <div className="field">
            <label>Severity</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SEVERITY_OPTIONS.map((opt) => {
                const active = draft.severity === opt.value;
                return (
                  <button
                    key={opt.value || 'none'}
                    type="button"
                    onClick={() => update({ severity: opt.value })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: active ? 'var(--primary-50)' : 'white',
                      color: active ? 'var(--primary-600)' : 'var(--text)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>Note</label>
            <textarea
              className="textarea"
              rows={3}
              value={draft.note}
              onChange={(e) => update({ note: e.target.value })}
              maxLength={2000}
              placeholder="What did you observe?"
              disabled={submitting}
            />
          </div>

          {mode === 'create' && (
            <div
              style={{
                padding: 8,
                background: 'var(--bg)',
                borderRadius: 6,
                fontSize: 11.5,
                color: 'var(--muted)',
              }}
            >
              Pin location: {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
            </div>
          )}

          {draft.prediction_label && (
            <div
              style={{
                padding: 10,
                background: 'var(--primary-50)',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <b>Linked diagnosis:</b> {draft.prediction_label}
              {typeof draft.prediction_confidence === 'number'
                ? ` (${Math.round(draft.prediction_confidence * 100)}% conf.)`
                : ''}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 10,
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: 6,
                color: '#DC2626',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting
                ? 'Saving…'
                : mode === 'create'
                  ? 'Save observation'
                  : 'Update observation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

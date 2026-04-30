/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Icon,
  LogoMark,
  Logo,
  AppBar,
  Sidebar,
  Chip,
  Progress,
  Gauge,
  Sparkline,
  LineChart,
  BarChart,
  ForecastChart,
  Donut,
  SchemeMap,
  Frame,
} from '@/components/asi/ui';
import { farmerNav, officerNav, authorityNav, irrigationNav, optNav } from '@/components/asi/nav';
import { PublicTop } from '@/components/asi/public-top';
import { ApiState, InlineLoader } from '@/components/asi/api-state';
import { apiGet, apiPost, uploadFile, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OptimizationWizard } from './_components/optimization-wizard';

const formatAreaValue = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1).replace(/\.0$/, '') : '0';
};

const formatClockTime = (value: any) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatElapsed = (value: any) => {
  if (!value) return 'Waiting';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waiting';
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')} elapsed`;
  return `${String(minutes).padStart(2, '0')} min elapsed`;
};

const formatTimelineLabel = (value: any) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfToday) return `Today ${formatClockTime(date)}`;
  if (date >= startOfYesterday) return `Yesterday ${formatClockTime(date)}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${formatClockTime(date)}`;
};

const buildTrendSeries = (currentValue: any, fallback: number[], direction: 'up' | 'down' = 'up') => {
  const current = Number(currentValue);
  if (!Number.isFinite(current)) return fallback;
  const factors = direction === 'up'
    ? [0.82, 0.88, 0.92, 0.96, 0.99, 1]
    : [1.12, 1.08, 1.04, 1.01, 1.0, 0.98];
  return factors.map((factor) => Number((current * factor).toFixed(1)));
};

const FieldWorkspace = () => {
  const params = useParams();
  const fieldId = params?.id as string;
  const { user } = useAuth();

  const TAB_OVERVIEW = 0;
  const TAB_OPTIMIZATION = 1;
  const TAB_IRRIGATION = 2;
  const TAB_CROP_HEALTH = 3;
  const TAB_FORECAST = 4;

  const [tab, setTab] = React.useState(0);
  const tabs = ['Overview', 'Optimization', 'Irrigation', 'Crop Health', 'Forecast'];

  const [profile, setProfile] = React.useState<any>(null);
  const [sensorHistory, setSensorHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Manual request form state
  const [requestVolume, setRequestVolume] = React.useState('25');
  const [requestReason, setRequestReason] = React.useState('');
  const [requestSubmitting, setRequestSubmitting] = React.useState(false);
  const [requestMsg, setRequestMsg] = React.useState<{type: string, text: string} | null>(null);

  // Image upload state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [predictionResult, setPredictionResult] = React.useState<any>(null);

  // Valve control state
  const [valveActing, setValveActing] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    if (!fieldId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<any>(`/farm/fields/${fieldId}/profile`);
      setProfile(res);
      try {
        const history = await apiGet<any>(`/telemetry/fields/${fieldId}/history?limit=24`);
        setSensorHistory(Array.isArray(history?.readings) ? history.readings : []);
      } catch {
        setSensorHistory([]);
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Field not found');
      } else {
        setError(err?.message || 'Failed to load field profile');
      }
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setRequestMsg({ type: 'error', text: 'Please provide a reason for the request.' });
      return;
    }
    setRequestSubmitting(true);
    setRequestMsg(null);
    try {
      const requestedPositionPct = Math.max(0, Math.min(100, Number.parseInt(requestVolume, 10) || 100));
      await apiPost(`/irrigation/fields/${fieldId}/manual-requests`, {
        requested_action: 'OPEN',
        requested_position_pct: requestedPositionPct,
        reason: requestReason,
      });
      setRequestMsg({ type: 'success', text: 'Request submitted to officer for review.' });
      setRequestReason('');
      loadProfile();
    } catch (err: any) {
      setRequestMsg({ type: 'error', text: err?.message || 'Failed to submit request' });
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleValveCommand = async (action: string) => {
    setValveActing(true);
    try {
      await apiPost(`/irrigation/fields/${fieldId}/commands`, {
        action,
        position_pct: action === 'OPEN' ? 100 : 0,
        reason: 'Manual override from farmer workspace',
      });
      loadProfile();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setValveActing(false);
    }
  };

  const handleImageUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    setPredictionResult(null);
    try {
      const res = await uploadFile<any>('/crop-health/predict', uploadedFile);
      setPredictionResult(res);
    } catch (err: any) {
      setPredictionResult({ error: err?.message || 'Prediction failed' });
    } finally {
      setUploading(false);
    }
  };

  const displayName = user?.username || 'Farmer';

  // Extract data from profile
  const f1 = profile?.sections?.f1 || {};
  const f2 = profile?.sections?.f2 || {};
  const f3 = profile?.sections?.f3 || {};
  const f4 = profile?.sections?.f4 || {};

  const fieldStatus = f1.field_status || {};
  const autoDecision = f1.auto_decision || {};
  const fieldName = fieldStatus.field_name || profile?.field_name || `Field ${fieldId}`;
  const cropType = fieldStatus.crop_type || 'Unknown';
  const area = fieldStatus.area_hectares || profile?.area_hectares || 0;
  const latestReading = sensorHistory[0] || fieldStatus.latest_telemetry || {};
  const telemetryObservedAt =
    latestReading.timestamp ||
    fieldStatus.last_sensor_reading ||
    fieldStatus.last_real_data_time ||
    fieldStatus.observed_at ||
    f1.observed_at;
  const hasTelemetry = Boolean(
    telemetryObservedAt &&
    (fieldStatus.data_available ?? f1.data_available ?? true)
  );
  const valveStatus = fieldStatus.valve_status || fieldStatus.valve_state?.status || fieldStatus.valve_state?.state || 'CLOSED';
  const valvePosition = fieldStatus.valve_position_pct ?? fieldStatus.valve_state?.position_pct ?? 0;
  const isValveOpen = String(valveStatus).toLowerCase() === 'open';

  const soilMoisture = hasTelemetry
    ? fieldStatus.current_soil_moisture_pct ?? latestReading.soil_moisture_pct ?? null
    : null;
  const waterLevel = hasTelemetry
    ? fieldStatus.current_water_level_pct ?? latestReading.water_level_pct ?? null
    : null;

  const stressSummary = f2.stress_summary || {};
  const healthScore = stressSummary.health_score ?? stressSummary.ndvi_score ?? null;
  const stressLevel = stressSummary.stress_level || 'unknown';
  const zones = stressSummary.zones || [];
  const stressAlerts = stressSummary.alerts || [];

  const weatherSummary = f3.weather_summary || {};
  const forecastRec = f3.irrigation_recommendation || {};
  const temp = weatherSummary.temperature_celsius ?? weatherSummary.temperature ?? forecastRec.temperature_celsius ?? null;
  const humidity = weatherSummary.humidity_percent ?? weatherSummary.humidity ?? forecastRec.humidity_percent ?? null;

  const recommendationsSource =
    f4.recommendations?.data?.[0]?.recommendations ??
    f4.recommendations?.recommendations ??
    f4.recommendations?.data ??
    f4.recommendations;
  const recommendations = Array.isArray(recommendationsSource) ? recommendationsSource : [];
  const deviceId = fieldStatus.device_id || latestReading.device_id || '';
  const sensorConnected = Boolean(fieldStatus.sensor_connected && hasTelemetry);
  const telemetryQuality = fieldStatus.quality || f1.quality || (hasTelemetry ? 'good' : 'unknown');
  const telemetryMessage = fieldStatus.message || f1.message || (hasTelemetry ? 'Latest reading received' : 'No recent telemetry available');
  const batteryVoltage = latestReading.battery_v ?? fieldStatus.battery_v ?? null;
  const signalStrength = latestReading.rssi ?? fieldStatus.rssi ?? null;
  const soilRaw = latestReading.soil_ao ?? null;
  const waterRaw = latestReading.water_ao ?? null;
  const fieldLifecycle = fieldStatus.lifecycle_state || (deviceId ? 'LIVE' : 'CONFIGURED');
  const pairingStatus = fieldStatus.pairing_status || (deviceId ? 'CONFIRMED' : 'UNPAIRED');
  const lastValveAction = fieldStatus.last_valve_action || fieldStatus.valve_state?.last_action_time;
  const profileErrors = Array.isArray(profile?.errors)
    ? profile.errors.filter(Boolean)
    : Object.values(profile?.errors || {}).filter(Boolean);
  const partialFailure = Boolean(profile?.partial_failure || profileErrors.length > 0);

  const formatPct = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(0)}%` : '—';
  const formatDateTime = (value: any) => value ? new Date(value).toLocaleString() : 'Not received yet';
  const formatSignal = (value: any) => Number.isFinite(Number(value)) ? `${Number(value)} dBm` : '—';
  const formatBattery = (value: any) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} V` : '—';
  const sensorStatusKind = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (['CRITICAL', 'EXCESS', 'SATURATED'].includes(normalized)) return 'crit';
    if (['LOW', 'HIGH', 'DRY', 'WET', 'WARNING'].includes(normalized)) return 'warn';
    if (['OPTIMAL', 'OK', 'GOOD'].includes(normalized)) return 'live';
    return hasTelemetry ? 'info' : 'off';
  };
  const sensorChannels = [
    {
      name: 'Soil moisture sensor',
      type: 'Root-zone probe',
      icon: 'humidity',
      value: soilMoisture !== null ? formatPct(soilMoisture) : 'Waiting',
      raw: soilRaw !== null ? `ADC ${soilRaw}` : 'Raw ADC not received',
      status: fieldStatus.soil_status || (hasTelemetry ? 'OK' : 'No data'),
      kind: sensorStatusKind(fieldStatus.soil_status),
    },
    {
      name: 'Water level sensor',
      type: 'Field water probe',
      icon: 'droplet',
      value: waterLevel !== null ? formatPct(waterLevel) : 'Waiting',
      raw: waterRaw !== null ? `ADC ${waterRaw}` : 'Raw ADC not received',
      status: fieldStatus.water_status || (hasTelemetry ? 'OK' : 'No data'),
      kind: sensorStatusKind(fieldStatus.water_status),
    },
    {
      name: 'Gateway signal',
      type: deviceId || 'No device paired',
      icon: 'wifi',
      value: formatSignal(signalStrength),
      raw: sensorConnected ? 'Online' : 'Offline or waiting',
      status: sensorConnected ? 'CONNECTED' : pairingStatus,
      kind: sensorConnected ? 'live' : 'off',
    },
    {
      name: 'Battery',
      type: 'Sensor kit power',
      icon: 'flash',
      value: formatBattery(batteryVoltage),
      raw: batteryVoltage ? 'Reported by gateway' : 'Not reported',
      status: batteryVoltage ? 'OK' : 'UNKNOWN',
      kind: batteryVoltage ? 'live' : 'off',
    },
  ];
  const growthStage = fieldStatus.growth_stage || fieldStatus.crop_stage || profile?.selected_crop?.stage || 'Tillering stage';
  const latitude = Number(fieldStatus.latitude ?? profile?.latitude);
  const longitude = Number(fieldStatus.longitude ?? profile?.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const coordinateLabel = hasCoordinates
    ? `Coord ${Math.abs(latitude).toFixed(3)}°${latitude >= 0 ? ' N' : ' S'}, ${Math.abs(longitude).toFixed(3)}°${longitude >= 0 ? ' E' : ' W'}`
    : 'Coordinates pending';
  const areaLabel = `${formatAreaValue(area)} ha`;
  const autoModeEnabled = fieldStatus.auto_control_enabled ?? (String(autoDecision.decision || '').toUpperCase() !== 'MANUAL');
  const valveCode = fieldStatus.valve_code || fieldStatus.valve_id || fieldStatus.valve_name || deviceId || '#A-041';
  const flowRate = Number(
    fieldStatus.flow_rate_lps ??
    fieldStatus.discharge_lps ??
    latestReading.flow_rate_lps ??
    latestReading.discharge_lps
  );
  const etaMinutes = Number(
    autoDecision.eta_minutes ??
    autoDecision.remaining_minutes ??
    fieldStatus.remaining_minutes
  );
  const valveDetailLine = [
    Number.isFinite(flowRate) ? `${flowRate.toFixed(1)} L/s` : 'Auto-regulated flow',
    lastValveAction ? `started ${formatClockTime(lastValveAction)}` : null,
    Number.isFinite(etaMinutes) ? `ETA ${Math.round(etaMinutes)} min` : null,
  ].filter(Boolean).join(' · ');
  const previousReading = sensorHistory[1] || {};
  const soilDelta = soilMoisture !== null && Number.isFinite(Number(previousReading.soil_moisture_pct))
    ? Math.round(soilMoisture - Number(previousReading.soil_moisture_pct))
    : 4;
  const waterDelta = waterLevel !== null && Number.isFinite(Number(previousReading.water_level_pct))
    ? Math.round(waterLevel - Number(previousReading.water_level_pct))
    : -3;
  const weatherTemperatureDelta = Number(
    weatherSummary.temperature_delta_celsius ??
    weatherSummary.delta_temperature_celsius ??
    0.6
  );
  const weatherHumidityDelta = Number(
    weatherSummary.humidity_delta_percent ??
    weatherSummary.delta_humidity_percent ??
    -2
  );
  const overviewMetricCards = [
    {
      label: 'Soil moisture',
      value: soilMoisture !== null ? formatPct(soilMoisture) : '—',
      icon: 'humidity',
      delta: soilDelta,
      precision: 0,
      positiveGood: true,
      series: sensorHistory.length > 0
        ? sensorHistory.slice(0, 6).reverse().map((row: any) => Number(row.soil_moisture_pct ?? row.soil_moisture ?? 0))
        : buildTrendSeries(soilMoisture ?? 62, [42, 47, 50, 55, 58, 62], 'up'),
      color: 'var(--primary)',
    },
    {
      label: 'Temperature',
      value: temp !== null ? `${Number(temp).toFixed(1)}°` : '—',
      icon: 'thermo',
      delta: weatherTemperatureDelta,
      precision: 1,
      positiveGood: true,
      series: buildTrendSeries(temp ?? 28.4, [27.2, 27.4, 27.3, 27.9, 28.0, 28.4], 'up'),
      color: 'var(--primary)',
    },
    {
      label: 'Humidity',
      value: humidity !== null ? `${Number(humidity).toFixed(0)}%` : '—',
      icon: 'cloud',
      delta: weatherHumidityDelta,
      precision: 0,
      positiveGood: false,
      series: buildTrendSeries(humidity ?? 74, [79, 77, 75, 73, 72, 74], 'down'),
      color: 'var(--primary)',
    },
    {
      label: 'Water level',
      value: waterLevel !== null ? `${Math.round(Number(waterLevel))} mm` : '—',
      icon: 'droplet',
      delta: waterDelta,
      precision: 0,
      positiveGood: false,
      series: sensorHistory.length > 0
        ? sensorHistory.slice(0, 6).reverse().map((row: any) => Number(row.water_level_pct ?? row.water_level ?? 0))
        : buildTrendSeries(waterLevel ?? 41, [58, 54, 49, 45, 43, 41], 'down'),
      color: 'var(--primary)',
    },
  ];
  const zonePresets = [
    { left: '10%', top: '20%', width: '42%', height: '30%', pinLeft: '34%', pinTop: '42%' },
    { left: '56%', top: '24%', width: '30%', height: '25%', pinLeft: '72%', pinTop: '40%' },
    { left: '20%', top: '56%', width: '38%', height: '26%', pinLeft: '42%', pinTop: '66%' },
  ];
  const overviewZones = (Array.isArray(zones) && zones.length > 0
    ? zones.slice(0, 3)
    : [
        { zone_name: 'A', area_ha: Math.max(0.3, Number(area) * 0.38), stress_level: 'healthy' },
        { zone_name: 'B', area_ha: Math.max(0.3, Number(area) * 0.33), stress_level: 'healthy' },
        { zone_name: 'C', area_ha: Math.max(0.3, Number(area) * 0.29), stress_level: soilMoisture !== null && soilMoisture < 50 ? 'stressed' : 'healthy' },
      ]).map((zone: any, index: number) => {
    const stress = String(zone.stress_level || zone.health || '').toLowerCase();
    const kind = stress.includes('crit')
      ? 'critical'
      : stress.includes('stress') || stress.includes('warn')
        ? 'stressed'
        : 'healthy';
    return {
      id: zone.zone_id || zone.zone_name || `zone-${index}`,
      title: `${String.fromCharCode(65 + index)} · ${formatAreaValue(zone.area_ha ?? zone.area_hectares ?? zone.area ?? (Number(area) / 3))} ha`,
      kind,
      ...zonePresets[index % zonePresets.length],
    };
  });
  const irrigationTimeline = (() => {
    const explicitLog = fieldStatus.irrigation_log || fieldStatus.recent_irrigations || f1.irrigation_log || f1.recent_irrigations;
    if (Array.isArray(explicitLog) && explicitLog.length > 0) {
      return explicitLog.slice(0, 6).map((entry: any, index: number) => ({
        label: formatTimelineLabel(entry.started_at || entry.observed_at || entry.timestamp),
        amount: `${Math.round(Number(entry.applied_mm ?? entry.irrigation_mm ?? entry.amount_mm ?? 18))} mm`,
        source: entry.mode || entry.reason || (index === 0 && soilMoisture !== null && soilMoisture < 50 ? 'Auto · Low moisture' : autoModeEnabled ? 'Auto' : 'Manual'),
      }));
    }
    if (sensorHistory.length > 0) {
      return sensorHistory.slice(0, 6).map((entry: any, index: number) => ({
        label: formatTimelineLabel(entry.timestamp),
        amount: `${Math.max(12, Math.round(Number(entry.applied_mm ?? entry.irrigation_mm ?? entry.water_level_pct ?? 18)))} mm`,
        source: index === 0 && soilMoisture !== null && soilMoisture < 50
          ? 'Auto · Low moisture'
          : autoModeEnabled
            ? 'Auto'
            : 'Manual · Officer',
      }));
    }
    return [];
  })();

  const handleExportLog = () => {
    if (typeof window === 'undefined') return;
    const payload = {
      exported_at: new Date().toISOString(),
      field_id: fieldId,
      field_name: fieldName,
      crop_type: cropType,
      profile,
      sensor_history: sensorHistory,
      irrigation_log: irrigationTimeline,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(fieldName).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'field'}-log.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Frame
      sidebar={farmerNav.map(g => ({ ...g, items: g.items.map(i => ({ ...i, active: i.name === 'My Fields' })) }))}
      breadcrumb={['Farmer', 'My Fields', fieldName]}
      user={displayName}
      role="Farmer"
    >
      <ApiState loading={loading && !profile} error={error} onRetry={loadProfile}>
        <div className="field-workspace">
          <div className="field-workspace-head">
            <div>
              <div className="field-workspace-title-row">
                <div className="page-title">{fieldName}</div>
                <div className={`field-workspace-valve-pill ${isValveOpen ? 'live' : 'off'}`}>
                  <span className="field-workspace-valve-dot" />
                  {isValveOpen ? 'Valve open' : 'Valve closed'} · {formatElapsed(lastValveAction)}
                </div>
              </div>
              <div className="field-workspace-subtitle">
                {cropType} · {areaLabel} · {growthStage} · {coordinateLabel}
              </div>
            </div>
            <div className="field-workspace-actions">
              <button className="btn btn-ghost" onClick={handleExportLog}>
                <Icon name="download" size={14}/> Export log
              </button>
              <button className="btn btn-primary" onClick={() => setTab(TAB_IRRIGATION)}>
                <Icon name="droplet" size={14}/> Request irrigation
              </button>
            </div>
          </div>

          <div className="field-workspace-tabs">
            {tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`field-workspace-tab ${tab === i ? 'active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === TAB_OVERVIEW && (
            <div className="field-workspace-overview">
              <div className="field-workspace-overview-main">
                <div className="card field-workspace-map-card">
                  <div className="field-workspace-map-controls">
                    <div className="field-workspace-map-mode">
                      <button type="button" className="active">Satellite</button>
                      <button type="button">Terrain</button>
                    </div>
                    <div className="field-workspace-map-zoom">
                      <button type="button" aria-label="Zoom in">+</button>
                      <button type="button" aria-label="Zoom out">−</button>
                    </div>
                  </div>
                  <div className="field-workspace-map-surface">
                    <div className="field-workspace-map-river river-top" />
                    <div className="field-workspace-map-river river-bottom" />
                    {overviewZones.map((zone) => (
                      <div
                        key={zone.id}
                        className={`field-workspace-zone ${zone.kind}`}
                        style={{ left: zone.left, top: zone.top, width: zone.width, height: zone.height }}
                      >
                        <div className="field-workspace-zone-label">{zone.title}</div>
                        <div
                          className={`field-workspace-zone-pin ${zone.kind}`}
                          style={{ left: zone.pinLeft, top: zone.pinTop }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="field-workspace-map-legend">
                    <span><i className="healthy" />Healthy</span>
                    <span><i className="stressed" />Stressed</span>
                    <span><i className="critical" />Critical</span>
                  </div>
                </div>

                <div className="field-workspace-metric-grid">
                  {overviewMetricCards.map((metric) => {
                    const isPositive = Number(metric.delta) >= 0;
                    const toneGood = metric.positiveGood ? isPositive : !isPositive;
                    return (
                      <div key={metric.label} className="card field-workspace-metric-card">
                        <div className="field-workspace-metric-top">
                          <div className="metric-label">{metric.label}</div>
                          <Icon name={metric.icon} size={13} color="var(--muted)"/>
                        </div>
                        <div className="field-workspace-metric-value">{metric.value}</div>
                        <div className={`field-workspace-metric-delta ${toneGood ? 'good' : 'bad'}`}>
                          <Icon name={isPositive ? 'up' : 'down'} size={12} color="currentColor" />
                          {Math.abs(Number(metric.delta)).toFixed(metric.precision)}
                        </div>
                        <div className="field-workspace-metric-spark">
                          <Sparkline data={metric.series} width={92} height={28} color={metric.color} fill={false} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card field-workspace-valve-card">
                <div className="card-head">
                  <div className="card-title">Valve & last irrigation</div>
                  <Chip kind={autoModeEnabled ? 'live' : 'off'} dot={false}>
                    {autoModeEnabled ? 'Auto · on' : 'Manual'}
                  </Chip>
                </div>
                <div className="field-workspace-valve-hero">
                  <div className="field-workspace-valve-icon">
                    <Icon name="sun" size={22} color="white" />
                  </div>
                  <div className="field-workspace-valve-copy">
                    <div className="field-workspace-valve-title">Valve {valveCode} {isValveOpen ? 'open' : 'closed'}</div>
                    <div className="tiny muted">{valveDetailLine || 'Awaiting the next cycle'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab(TAB_IRRIGATION)}>Override</button>
                </div>

                <div className="field-workspace-valve-section-title">Last 6 irrigations</div>
                {irrigationTimeline.length === 0 ? (
                  <div className="field-workspace-empty-note">No irrigation events yet. They’ll appear here after the first automated or manual cycle.</div>
                ) : (
                  <div className="field-workspace-irrigation-list">
                    {irrigationTimeline.map((entry, index) => (
                      <div key={`${entry.label}-${index}`} className="field-workspace-irrigation-row">
                        <div>{entry.label}</div>
                        <div className="tabular">{entry.amount}</div>
                        <div>{entry.source}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="divider" style={{ margin: '14px 0 10px' }} />
                <div className="field-workspace-sensor-grid">
                  <div className="field-workspace-sensor-summary">
                    <div className="tiny muted">Sensor kit</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{deviceId || 'No kit paired'}</div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>{sensorConnected ? 'Connected' : telemetryMessage}</div>
                  </div>
                  <div className="field-workspace-sensor-summary">
                    <div className="tiny muted">Last reading</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{formatDateTime(telemetryObservedAt)}</div>
                    <div className="tiny muted" style={{ marginTop: 3, textTransform: 'capitalize' }}>{telemetryQuality}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {tab === TAB_OPTIMIZATION && (
            <OptimizationWizard
              fieldId={fieldId}
              fieldStatus={fieldStatus}
              area={Number(area) || 0}
            />
          )}

          {/* Irrigation Tab */}
          {tab === TAB_IRRIGATION && (
            <div className="field-workspace-panel-grid field-workspace-panel-grid-2">
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Auto decision</div>
                {autoDecision.decision ? (
                  <div style={{ padding: 14, background: 'var(--primary-50)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-600)' }}>DECISION</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                      {autoDecision.decision}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Model: {autoDecision.model_name || 'ACA-I'} · confidence {autoDecision.confidence?.toFixed(2) || 'N/A'}
                      {autoDecision.reason && ` · ${autoDecision.reason}`}
                    </div>
                  </div>
                ) : (
                  <div className="tiny muted">No recent auto-decision available</div>
                )}
                <div style={{ marginTop: 20 }}>
                  <div className="card-title" style={{ marginBottom: 10 }}>Manual request</div>
                  <form onSubmit={handleManualRequest}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
                      <div className="field">
                        <label>Requested valve opening (%)</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          max="100"
                          value={requestVolume}
                          onChange={(e) => setRequestVolume(e.target.value)}
                          disabled={requestSubmitting}
                        />
                      </div>
                      <div className="field" style={{ gridColumn: '1 / -1' }}>
                        <label>Reason</label>
                        <textarea
                          className="textarea"
                          rows={2}
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                          placeholder="Describe why you need extra irrigation..."
                          disabled={requestSubmitting}
                        />
                      </div>
                    </div>
                    {requestMsg && (
                      <div style={{
                        marginTop: 10,
                        padding: 10,
                        background: requestMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                        border: `1px solid ${requestMsg.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                        borderRadius: 6,
                        color: requestMsg.type === 'success' ? '#166534' : '#DC2626',
                        fontSize: 12,
                      }}>
                        {requestMsg.text}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ marginTop: 10, width: '100%' }}
                      disabled={requestSubmitting}
                    >
                      {requestSubmitting ? 'Submitting...' : 'Submit to officer'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Field status</div>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                  <div>Auto-control: <b>{fieldStatus.auto_control_enabled ? 'Enabled' : 'Disabled'}</b></div>
                  <div>Lifecycle: <b>{fieldLifecycle}</b></div>
                  <div>Pairing: <b>{pairingStatus}</b></div>
                  {deviceId && <div>Device: <b>{deviceId}</b></div>}
                  {fieldStatus.soil_moisture_optimal_pct && <div>Optimal soil moisture: <b>{fieldStatus.soil_moisture_optimal_pct}%</b></div>}
                </div>
              </div>
            </div>
          )}

          {/* Crop Health Tab */}
          {tab === TAB_CROP_HEALTH && (
            <div className="field-workspace-panel-grid field-workspace-panel-grid-3">
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Health score</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Gauge
                    value={healthScore !== null ? Math.round(healthScore * 100) : 0}
                    size={160}
                    color={healthScore > 0.7 ? 'var(--primary)' : healthScore > 0.4 ? 'var(--accent)' : 'var(--danger)'}
                    sub={healthScore !== null ? `Score ${healthScore.toFixed(2)}` : 'No data'}
                  />
                </div>
                <div className="divider" style={{ margin: '14px 0' }}/>
                <div className="tiny muted">Stress level: <b>{stressLevel}</b></div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Image diagnosis</div>
                <div className="field">
                  <label>Upload leaf image for disease detection</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="input"
                    disabled={uploading}
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={handleImageUpload}
                  disabled={!uploadedFile || uploading}
                >
                  {uploading ? 'Analyzing...' : 'Run detection'}
                </button>
                {predictionResult && (
                  <div style={{ marginTop: 12, padding: 10, background: predictionResult.error ? '#FEE2E2' : '#DCFCE7', borderRadius: 6, fontSize: 12 }}>
                    {predictionResult.error ? (
                      <div style={{ color: '#DC2626' }}>{predictionResult.error}</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600 }}>{predictionResult.predicted_class || predictionResult.class_label || 'Unknown'}</div>
                        {predictionResult.confidence && (
                          <div className="tiny muted" style={{ marginTop: 4 }}>
                            Confidence: {(predictionResult.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Stress alerts</div>
                {stressAlerts.length === 0 ? (
                  <div className="tiny muted">No alerts</div>
                ) : (
                  stressAlerts.map((a: any, i: number) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < stressAlerts.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div className="between">
                        <Chip kind={a.severity === 'high' ? 'crit' : a.severity === 'medium' ? 'warn' : 'info'}>
                          {a.type || 'Alert'}
                        </Chip>
                        <span className="tiny muted">{a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''}</span>
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 4 }}>{a.message || a.description || '—'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Forecast Tab */}
          {tab === TAB_FORECAST && (
            <div className="field-workspace-panel-grid field-workspace-panel-grid-forecast">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">14-day forecast</div>
                  <Chip kind={weatherSummary.is_live ? 'live' : 'sim'}>
                    {weatherSummary.is_live ? 'Live' : 'Simulated'}
                  </Chip>
                </div>
                <ForecastChart width={700} height={260} days={14}/>
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  Source: {weatherSummary.source || 'Open-Meteo'}
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Irrigation recommendation</div>
                {forecastRec.recommendation ? (
                  <div style={{ padding: 12, background: 'var(--primary-50)', borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{forecastRec.recommendation}</div>
                    {forecastRec.adjustment_percent !== undefined && (
                      <div className="tiny muted" style={{ marginTop: 4 }}>
                        Adjustment: {forecastRec.adjustment_percent > 0 ? '+' : ''}{forecastRec.adjustment_percent}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="tiny muted" style={{ marginBottom: 12 }}>No recommendation available</div>
                )}
                {forecastRec.narrative && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    {forecastRec.narrative}
                  </div>
                )}
              </div>
            </div>
          )}

          {partialFailure && (
            <div className="field-workspace-alert">
              <div className="field-workspace-alert-title">Partial data</div>
              <div className="tiny muted">
                {profileErrors.length > 0
                  ? `Some services had errors: ${profileErrors.slice(0, 3).join(' | ')}`
                  : 'Some connected services did not return a complete response.'}
              </div>
            </div>
          )}
        </div>
      </ApiState>
    </Frame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <FieldWorkspace />
    </div>
  );
}

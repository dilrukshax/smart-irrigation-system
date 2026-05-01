/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import {
  CropAlertsList,
  CropHealthFrame,
  DEFAULT_AREA_KM2,
  DEFAULT_ZONE_COUNT,
  HealthDistribution,
  MetricCard,
  ModelStatusPanel,
  ZoneMapPanel,
  ZoneList,
  formatHa,
  formatNumber,
  gridAuto,
  normalizeZonesPayload,
  statusKind,
  zoneSummary,
} from './_components/crop-health-shared';

const CropHealthOverview = () => {
  const [zonesPayload, setZonesPayload] = React.useState<any>(null);
  const [summaryPayload, setSummaryPayload] = React.useState<any>(null);
  const [alerts, setAlerts] = React.useState<any>(null);
  const [modelStatus, setModelStatus] = React.useState<any>(null);
  const [classes, setClasses] = React.useState<any>(null);
  const [mapLayer, setMapLayer] = React.useState<'terrain' | 'satellite'>('satellite');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>(`/crop-health/zones?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
        apiGet<any>(`/crop-health/zones/summary?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
        apiGet<any>(`/crop-health/alerts?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
        apiGet<any>('/crop-health/model/status'),
        apiGet<any>('/crop-health/model/classes'),
      ]);
      const [zonesRes, summaryRes, alertsRes, statusRes, classesRes] = results;
      if (zonesRes.status === 'fulfilled') setZonesPayload(zonesRes.value);
      if (summaryRes.status === 'fulfilled') setSummaryPayload(summaryRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (statusRes.status === 'fulfilled') setModelStatus(statusRes.value);
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load crop-health data');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load crop-health data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const zones = normalizeZonesPayload(zonesPayload);
  const summary = zoneSummary(zonesPayload, summaryPayload);
  const alertSummary = alerts?.summary || {};
  const healthyPct = summary?.total_zones ? (summary.healthy_count / summary.total_zones) * 100 : 0;

  return (
    <CropHealthFrame
      active="Overview"
      title="Crop health overview"
      subtitle="Scheme-wide satellite zones, disease model readiness, and stress alerts"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !zonesPayload && !alerts} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="Healthy zones"
            value={formatNumber(summary?.healthy_count, 0)}
            sub={`${formatNumber(healthyPct, 0)}% of monitored zones`}
            icon="shield_check"
            chip={summary?.total_zones ? `${summary.total_zones} zones` : 'zones'}
            kind="live"
            color="var(--primary)"
          />
          <MetricCard
            title="Mild stress"
            value={formatNumber(summary?.mild_stress_count, 0)}
            sub={`Average NDVI ${formatNumber(summary?.average_ndvi, 2)}`}
            icon="leaf"
            chip="watch"
            kind={summary?.mild_stress_count ? 'warn' : 'live'}
            color={summary?.mild_stress_count ? 'var(--accent)' : 'var(--primary)'}
          />
          <MetricCard
            title="Severe stress"
            value={formatNumber(summary?.severe_stress_count, 0)}
            sub={`Average NDWI ${formatNumber(summary?.average_ndwi, 2)}`}
            icon="bell"
            chip="priority"
            kind={summary?.severe_stress_count ? 'crit' : 'live'}
            color={summary?.severe_stress_count ? 'var(--danger)' : 'var(--primary)'}
          />
          <MetricCard
            title="Active alerts"
            value={formatNumber(alertSummary.total_alerts, 0)}
            sub={`Highest priority ${alertSummary.highest_priority || 'low'}`}
            icon="list"
            chip={alerts?.status || 'alerts'}
            kind={statusKind(alertSummary.highest_priority)}
            color={alertSummary.highest_priority === 'low' ? 'var(--primary)' : 'var(--danger)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.55fr)', gap: 14, marginBottom: 14 }}>
          <ZoneMapPanel zonesPayload={zonesPayload} mapLayer={mapLayer} onMapLayerChange={setMapLayer} height={420}/>
          <HealthDistribution summary={summary} zones={zones}/>
        </div>

        <div style={{ ...gridAuto(320), marginBottom: 14 }}>
          <CropAlertsList alerts={alerts?.alerts} compact/>
          <ModelStatusPanel status={modelStatus} classes={classes}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Satellite analysis area</div>
                <div className="tiny muted">Current F2 zone-analysis scope</div>
              </div>
              <span className="chip sim"><span className="chip-dot"/>F2</span>
            </div>
            <div style={gridAuto(130)}>
              <div>
                <div className="tiny muted">Area</div>
                <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{formatHa(summary?.total_area_hectares)}</div>
              </div>
              <div>
                <div className="tiny muted">Last update</div>
                <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{summary?.last_updated ? new Date(summary.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
              </div>
            </div>
            <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {zonesPayload?.validation?.message || alerts?.message || 'Crop-health status is generated by the F2 service.'}
            </div>
          </div>
        </div>

        <ZoneList zones={zones} limit={6}/>
      </ApiState>
    </CropHealthFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <CropHealthOverview />
    </div>
  );
}

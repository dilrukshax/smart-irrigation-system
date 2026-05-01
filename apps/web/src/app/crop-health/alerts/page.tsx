/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { Chip } from '@/components/asi/ui';
import { apiGet } from '@/lib/api';
import {
  CropAlertsList,
  CropHealthFrame,
  DEFAULT_AREA_KM2,
  DEFAULT_ZONE_COUNT,
  HealthDistribution,
  MetricCard,
  ZoneList,
  formatNumber,
  gridAuto,
  normalizeZonesPayload,
  priorityColor,
  statusKind,
  zoneSummary,
} from '../_components/crop-health-shared';

const StressAlerts = () => {
  const [alerts, setAlerts] = React.useState<any>(null);
  const [zonesPayload, setZonesPayload] = React.useState<any>(null);
  const [summaryPayload, setSummaryPayload] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        apiGet<any>(`/crop-health/alerts?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
        apiGet<any>(`/crop-health/zones?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
        apiGet<any>(`/crop-health/zones/summary?num_zones=${DEFAULT_ZONE_COUNT}&area_km2=${DEFAULT_AREA_KM2}`),
      ]);
      const [alertsRes, zonesRes, summaryRes] = results;
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value);
      if (zonesRes.status === 'fulfilled') setZonesPayload(zonesRes.value);
      if (summaryRes.status === 'fulfilled') setSummaryPayload(summaryRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load stress alerts');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load stress alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const alertRows = Array.isArray(alerts?.alerts) ? alerts.alerts : [];
  const alertSummary = alerts?.summary || {};
  const zones = normalizeZonesPayload(zonesPayload);
  const summary = zoneSummary(zonesPayload, summaryPayload);
  const firstAlert = alertRows[0];
  const zoneAlertSummary = alertSummary.zone_summary || summary;

  return (
    <CropHealthFrame
      active="Stress Alerts"
      title="Stress alerts"
      subtitle="F2 operator queue for crop stress, NDVI, NDWI, and field-priority alerts"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !alerts} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="Highest priority"
            value={alertSummary.highest_priority || 'low'}
            sub={alerts?.message || 'No active stress alerts'}
            icon="bell"
            chip={alerts?.status || 'alerts'}
            kind={statusKind(alertSummary.highest_priority)}
            color={priorityColor(alertSummary.highest_priority)}
          />
          <MetricCard
            title="Active alerts"
            value={formatNumber(alertSummary.total_alerts, 0)}
            sub={`${formatNumber(alertSummary.artifact_count, 0)} persisted field artifacts`}
            icon="list"
            chip={alertRows.length ? 'review' : 'clear'}
            kind={alertRows.length ? 'warn' : 'live'}
            color={alertRows.length ? 'var(--accent)' : 'var(--primary)'}
          />
          <MetricCard
            title="High fields"
            value={formatNumber((alertSummary.high_fields || 0) + (alertSummary.critical_fields || 0), 0)}
            sub={`${formatNumber(alertSummary.critical_fields, 0)} critical fields`}
            icon="shield_check"
            chip="field stress"
            kind={alertSummary.critical_fields || alertSummary.high_fields ? 'crit' : 'live'}
            color={alertSummary.critical_fields || alertSummary.high_fields ? 'var(--danger)' : 'var(--primary)'}
          />
          <MetricCard
            title="Stress zones"
            value={formatNumber((zoneAlertSummary?.mild_stress_count || 0) + (zoneAlertSummary?.severe_stress_count || 0), 0)}
            sub={`${formatNumber(zoneAlertSummary?.severe_stress_count, 0)} severe zones`}
            icon="map"
            chip="zone summary"
            kind={zoneAlertSummary?.severe_stress_count ? 'crit' : zoneAlertSummary?.mild_stress_count ? 'warn' : 'live'}
            color={zoneAlertSummary?.severe_stress_count ? 'var(--danger)' : 'var(--primary)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.55fr)', gap: 14, marginBottom: 14 }}>
          <CropAlertsList alerts={alertRows}/>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Immediate priority</div>
                <div className="tiny muted">Top alert from F2 aggregation</div>
              </div>
              <Chip kind={statusKind(firstAlert?.priority)}>{firstAlert?.priority || 'low'}</Chip>
            </div>
            {firstAlert ? (
              <div>
                <div style={{ fontSize: 22, fontWeight: 750, color: priorityColor(firstAlert.priority), lineHeight: 1.25 }}>{firstAlert.title}</div>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.55 }}>{firstAlert.message}</div>
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55 }}>{firstAlert.recommendation}</div>
              </div>
            ) : (
              <div className="tiny muted" style={{ lineHeight: 1.55 }}>No immediate stress action is queued.</div>
            )}
            <div style={{ ...gridAuto(130), marginTop: 14 }}>
              <div>
                <div className="tiny muted">Source</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{alerts?.source || '-'}</div>
              </div>
              <div>
                <div className="tiny muted">Quality</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{alerts?.quality || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.45fr) minmax(0, 1fr)', gap: 14 }}>
          <HealthDistribution summary={summary} zones={zones}/>
          <ZoneList zones={zones} limit={8}/>
        </div>
      </ApiState>
    </CropHealthFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <StressAlerts />
    </div>
  );
}

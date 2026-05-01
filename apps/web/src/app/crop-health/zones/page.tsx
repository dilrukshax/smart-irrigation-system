/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { apiGet } from '@/lib/api';
import {
  CropHealthFrame,
  DEFAULT_AREA_KM2,
  DEFAULT_ZONE_COUNT,
  HealthDistribution,
  MetricCard,
  ZoneList,
  ZoneMapPanel,
  formatHa,
  formatNumber,
  gridAuto,
  normalizeZonesPayload,
  statusKind,
  zoneSummary,
} from '../_components/crop-health-shared';

const ZoneMap = () => {
  const [zonesPayload, setZonesPayload] = React.useState<any>(null);
  const [summaryPayload, setSummaryPayload] = React.useState<any>(null);
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
      ]);
      const [zonesRes, summaryRes] = results;
      if (zonesRes.status === 'fulfilled') setZonesPayload(zonesRes.value);
      if (summaryRes.status === 'fulfilled') setSummaryPayload(summaryRes.value);
      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load crop-health zones');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load crop-health zones');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const zones = normalizeZonesPayload(zonesPayload);
  const summary = zoneSummary(zonesPayload, summaryPayload);
  const total = summary?.total_zones || zones.length;
  const severe = summary?.severe_stress_count || 0;
  const mild = summary?.mild_stress_count || 0;

  return (
    <CropHealthFrame
      active="Zone Map"
      title="Crop health zone map"
      subtitle="Satellite-style NDVI and NDWI zone classifications from F2"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !zonesPayload} error={error} onRetry={loadData}>
        <div style={{ ...gridAuto(230), marginBottom: 14 }}>
          <MetricCard
            title="Total zones"
            value={formatNumber(total, 0)}
            sub={formatHa(summary?.total_area_hectares)}
            icon="map"
            chip="mapped"
            kind="live"
            color="var(--secondary)"
          />
          <MetricCard
            title="Average NDVI"
            value={formatNumber(summary?.average_ndvi, 2)}
            sub="Vegetation vigor index"
            icon="leaf"
            chip={summary?.average_ndvi < 0.45 ? 'low' : 'normal'}
            kind={summary?.average_ndvi < 0.45 ? 'warn' : 'live'}
            color={summary?.average_ndvi < 0.45 ? 'var(--accent)' : 'var(--primary)'}
          />
          <MetricCard
            title="Stress zones"
            value={formatNumber(mild + severe, 0)}
            sub={`${formatNumber(severe, 0)} severe zones`}
            icon="bell"
            chip={severe ? 'inspect' : 'watch'}
            kind={severe ? 'crit' : mild ? 'warn' : 'live'}
            color={severe ? 'var(--danger)' : mild ? 'var(--accent)' : 'var(--primary)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.48fr)', gap: 14 }}>
          <ZoneMapPanel zonesPayload={zonesPayload} mapLayer={mapLayer} onMapLayerChange={setMapLayer} height={520}/>
          <div style={{ display: 'grid', gap: 14 }}>
            <HealthDistribution summary={summary} zones={zones}/>
            <ZoneList zones={zones}/>
          </div>
        </div>
      </ApiState>
    </CropHealthFrame>
  );
};

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <ZoneMap />
    </div>
  );
}

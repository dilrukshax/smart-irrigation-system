/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { ApiState } from '@/components/asi/api-state';
import { Chip, Icon, Progress } from '@/components/asi/ui';
import { apiGet, apiPost } from '@/lib/api';
import {
  DEFAULT_SEASON,
  EmptyState,
  MetricCard,
  OptimizationFrame,
  RecommendationCard,
  formatCompact,
  formatNumber,
  getParamDefault,
  gridAuto,
  statusKind,
} from '../_components/optimization-shared';

function AdaptiveTuningPage() {
  const [parameters, setParameters] = React.useState<any>(null);
  const [crops, setCrops] = React.useState<any[]>([]);
  const [season, setSeason] = React.useState('Maha-2026');
  const [areaHa, setAreaHa] = React.useState('');
  const [soilPh, setSoilPh] = React.useState('');
  const [rainfall, setRainfall] = React.useState('');
  const [temperature, setTemperature] = React.useState('');
  const [waterQuota, setWaterQuota] = React.useState('');
  const [waterAvailability, setWaterAvailability] = React.useState('');
  const [priceFactor, setPriceFactor] = React.useState('');
  const [suitabilityWeight, setSuitabilityWeight] = React.useState(40);
  const [profitabilityWeight, setProfitabilityWeight] = React.useState(60);
  const [maxRisk, setMaxRisk] = React.useState('high');
  const [waterSensitivity, setWaterSensitivity] = React.useState('');
  const [preview, setPreview] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const defaultsAppliedRef = React.useRef(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paramsRes, cropsRes] = await Promise.allSettled([
        apiGet<any>('/planning/adaptive/parameters'),
        apiGet<any>('/planning/adaptive/crops'),
      ]);
      if (paramsRes.status === 'fulfilled') setParameters(paramsRes.value);
      if (cropsRes.status === 'fulfilled') {
        setCrops(Array.isArray(cropsRes.value) ? cropsRes.value : cropsRes.value?.crops || []);
      }
      if (paramsRes.status === 'rejected' && cropsRes.status === 'rejected') {
        setError('Unable to load adaptive parameters');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load adaptive parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!parameters || defaultsAppliedRef.current) return;
    const modelWeights = parameters.model_weights || {};
    setSeason((parameters.seasons || [])[0] || DEFAULT_SEASON);
    setAreaHa(String(getParamDefault(parameters, 'field_params', 'area_ha', '')));
    setSoilPh(String(getParamDefault(parameters, 'field_params', 'soil_ph', '')));
    setRainfall(String(getParamDefault(parameters, 'weather_params', 'season_rainfall_mm', '')));
    setTemperature(String(getParamDefault(parameters, 'weather_params', 'season_avg_temp', '')));
    setWaterQuota(String(getParamDefault(parameters, 'water_params', 'water_quota_mm', '')));
    setWaterAvailability(String(getParamDefault(parameters, 'water_params', 'water_availability_mm', '')));
    setPriceFactor(String(getParamDefault(parameters, 'market_params', 'price_factor', '')));
    setSuitabilityWeight(Math.round(Number(modelWeights.suitability_weight?.default ?? 0.4) * 100));
    setProfitabilityWeight(Math.round(Number(modelWeights.profitability_weight?.default ?? 0.6) * 100));
    defaultsAppliedRef.current = true;
  }, [parameters]);

  const resetDefaults = () => {
    defaultsAppliedRef.current = false;
    setPreview(null);
    if (parameters) {
      setParameters({ ...parameters });
    }
  };

  const runAdaptive = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await apiPost<any>('/planning/adaptive', {
        season,
        top_n: 10,
        field_params: {
          area_ha: Number(areaHa),
          soil_ph: Number(soilPh),
          soil_type: getParamDefault(parameters, 'field_params', 'soil_type', 'Loam'),
          soil_ec: getParamDefault(parameters, 'field_params', 'soil_ec', 1),
          soil_suitability: getParamDefault(parameters, 'field_params', 'soil_suitability', 0.75),
          location: getParamDefault(parameters, 'field_params', 'location', 'Kandy'),
          latitude: getParamDefault(parameters, 'field_params', 'latitude', 7.2906),
          longitude: getParamDefault(parameters, 'field_params', 'longitude', 80.6337),
          elevation: getParamDefault(parameters, 'field_params', 'elevation', 500),
        },
        weather_params: {
          season_avg_temp: Number(temperature),
          season_rainfall_mm: Number(rainfall),
          temp_mean_weekly: Number(temperature),
          temp_range_weekly: getParamDefault(parameters, 'weather_params', 'temp_range_weekly', 8),
          precip_weekly_sum: getParamDefault(parameters, 'weather_params', 'precip_weekly_sum', 50),
          humidity: getParamDefault(parameters, 'weather_params', 'humidity', 75),
        },
        water_params: {
          water_availability_mm: Number(waterAvailability),
          water_quota_mm: Number(waterQuota),
          water_coverage_ratio: getParamDefault(parameters, 'water_params', 'water_coverage_ratio', 0.8),
          irrigation_efficiency: getParamDefault(parameters, 'water_params', 'irrigation_efficiency', 0.7),
        },
        market_params: {
          price_factor: Number(priceFactor),
          price_volatility: getParamDefault(parameters, 'market_params', 'price_volatility', 'medium'),
          demand_level: getParamDefault(parameters, 'market_params', 'demand_level', 'normal'),
        },
        crop_filters: {
          water_sensitivity_filter: waterSensitivity || null,
          max_risk_level: maxRisk === 'all' ? null : maxRisk,
        },
        suitability_weight: suitabilityWeight / 100,
        profitability_weight: profitabilityWeight / 100,
      });
      setPreview(response);
    } catch (err: any) {
      setError(err?.message || 'Adaptive recommendation failed');
    } finally {
      setRunning(false);
    }
  };

  const recommendations = preview?.recommendations || [];
  const bestProfit = preview?.best_profit_per_ha;
  const averageSuitability = preview?.average_suitability;

  return (
    <OptimizationFrame
      active="Adaptive Tuning"
      title="Adaptive tuning"
      subtitle="Tune F4 adaptive inputs and send a valid backend request"
      onRefresh={loadData}
    >
      <ApiState loading={loading && !parameters} error={error && !preview ? error : null} onRetry={loadData}>
        <div style={{ ...gridAuto(220), marginBottom: 14 }}>
          <MetricCard title="Available crops" value={formatNumber(crops.length, 0)} sub="Loaded from the optimization catalog" icon="leaf" chip="catalog" kind="sim" color="#6D9F2B"/>
          <MetricCard title="Preview rows" value={formatNumber(recommendations.length, 0)} sub={preview?.message || 'Run adaptive tuning to populate'} icon="target" chip={preview?.status || 'preview'} kind={preview ? statusKind(preview.status) : 'sim'}/>
          <MetricCard title="Best profit / ha" value={formatCompact(bestProfit, 'LKR ')} sub={`Average suitability ${formatNumber(averageSuitability, 2)}`} icon="chart" chip="ranking" kind="live" color="var(--primary)"/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Adaptive inputs</div>
                <div className="tiny muted">Defaults are read from /planning/adaptive/parameters</div>
              </div>
              <Chip kind="live">F4</Chip>
            </div>
            <div style={{ ...gridAuto(160), marginTop: 12 }}>
              <div className="field">
                <label>Season</label>
                <select className="select" value={season} onChange={(event) => setSeason(event.target.value)} disabled={running}>
                  {(parameters?.seasons || [DEFAULT_SEASON]).map((value: string) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Area (ha)</label>
                <input className="input" type="number" step="0.1" value={areaHa} onChange={(event) => setAreaHa(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Soil pH</label>
                <input className="input" type="number" step="0.1" value={soilPh} onChange={(event) => setSoilPh(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Rainfall (mm)</label>
                <input className="input" type="number" step="10" value={rainfall} onChange={(event) => setRainfall(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Temperature (C)</label>
                <input className="input" type="number" step="0.5" value={temperature} onChange={(event) => setTemperature(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Water quota</label>
                <input className="input" type="number" step="50" value={waterQuota} onChange={(event) => setWaterQuota(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Water availability</label>
                <input className="input" type="number" step="100" value={waterAvailability} onChange={(event) => setWaterAvailability(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Price factor</label>
                <input className="input" type="number" step="0.05" min="0.5" max="2" value={priceFactor} onChange={(event) => setPriceFactor(event.target.value)} disabled={running}/>
              </div>
              <div className="field">
                <label>Water sensitivity</label>
                <select className="select" value={waterSensitivity} onChange={(event) => setWaterSensitivity(event.target.value)} disabled={running}>
                  <option value="">All crops</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="field">
                <label>Maximum risk</label>
                <select className="select" value={maxRisk} onChange={(event) => setMaxRisk(event.target.value)} disabled={running}>
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0' }}/>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div className="between small" style={{ marginBottom: 4 }}>
                  <span className="muted">Suitability weight</span>
                  <span className="tabular" style={{ fontWeight: 700 }}>{suitabilityWeight}%</span>
                </div>
                <input type="range" min="0" max="100" value={suitabilityWeight} onChange={(event) => setSuitabilityWeight(Number(event.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} disabled={running}/>
              </div>
              <div>
                <div className="between small" style={{ marginBottom: 4 }}>
                  <span className="muted">Profitability weight</span>
                  <span className="tabular" style={{ fontWeight: 700 }}>{profitabilityWeight}%</span>
                </div>
                <input type="range" min="0" max="100" value={profitabilityWeight} onChange={(event) => setProfitabilityWeight(Number(event.target.value))} style={{ width: '100%', accentColor: '#6D9F2B' }} disabled={running}/>
              </div>
            </div>

            {error && preview && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetDefaults} disabled={running}>Reset</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={runAdaptive} disabled={running || !waterQuota || !waterAvailability}>
                <Icon name="flash" size={14}/> {running ? 'Running...' : 'Apply'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {preview ? (
              <>
                <div className="card">
                  <div className="card-head">
                    <div>
                      <div className="card-title">Model contribution</div>
                      <div className="tiny muted">Response metadata from adaptive endpoint</div>
                    </div>
                    <Chip kind={statusKind(preview.status)}>{preview.status}</Chip>
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    {(preview.models_used || []).map((model: string) => (
                      <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="check" size={13} color="var(--primary)"/>
                        <div className="tiny" style={{ fontWeight: 600 }}>{model}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Progress value={averageSuitability || 0} max={1} label="Average suitability"/>
                  </div>
                </div>
                <div style={gridAuto(280)}>
                  {recommendations.slice(0, 8).map((row: any, index: number) => (
                    <RecommendationCard key={`${row.crop_id || index}-${row.rank || index}`} row={row}/>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon="flash" title="No adaptive preview yet">
                Apply the backend parameter set to calculate ranked crop recommendations.
              </EmptyState>
            )}
          </div>
        </div>
      </ApiState>
    </OptimizationFrame>
  );
}

export default function Page() {
  return (
    <div className="route-shell min-h-screen w-full bg-[var(--bg)]">
      <AdaptiveTuningPage />
    </div>
  );
}

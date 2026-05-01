/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client';
/* eslint-disable */

import * as React from 'react';
import { Icon, Chip, Sparkline, BarChart } from '@/components/asi/ui';
import { ApiState } from '@/components/asi/api-state';
import { apiGet, apiPost, ApiError } from '@/lib/api';

const SOIL_TYPES = [
  { value: 'Clay', desc: 'Heavy, holds water well' },
  { value: 'Clay Loam', desc: 'Balanced retention' },
  { value: 'Loam', desc: 'Ideal mix · most crops' },
  { value: 'Sandy Loam', desc: 'Drains fast · vegetables' },
  { value: 'Sandy Clay', desc: 'Sticky · slow drainage' },
  { value: 'Silty Loam', desc: 'Smooth · fertile' },
  { value: 'Red Loam', desc: 'Iron-rich upland soil' },
];

const SOIL_ALIASES: Record<string, string> = {
  loam: 'Loam',
  clay: 'Clay',
  'clay loam': 'Clay Loam',
  'sandy loam': 'Sandy Loam',
  'sandy clay': 'Sandy Clay',
  'silty loam': 'Silty Loam',
  'red loam': 'Red Loam',
  'reddish-brown earth': 'Red Loam',
  'reddish brown earth': 'Red Loam',
  'red earth': 'Red Loam',
};

function normalizeSoilType(value: any): string | null {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  if (SOIL_ALIASES[key]) return SOIL_ALIASES[key];
  // Direct case-insensitive match against canonical list.
  const direct = SOIL_TYPES.find((s) => s.value.toLowerCase() === key);
  return direct ? direct.value : null;
}

function inferSeasonFromDate(today: Date = new Date()): string {
  const month = today.getMonth() + 1; // 1..12
  const year = today.getFullYear();
  // Maha = Oct 1 – Mar 31 (year of Maha = starting calendar year)
  if (month >= 10) return `Maha-${year}`;
  if (month <= 3) return `Maha-${year - 1}`;
  // Yala = Apr 1 – Sep 30
  return `Yala-${year}`;
}

function seasonLabel(season: string): string {
  if (!season) return '';
  const [name, year] = season.split('-');
  if (name === 'Maha') {
    const next = String((Number(year) + 1) % 100).padStart(2, '0');
    return `Maha ${year}–${next}`;
  }
  return `${name} ${year}`;
}

const SEASON_OPTIONS = (suggested: string) => {
  const today = new Date();
  const year = today.getFullYear();
  const isYalaNow = today.getMonth() + 1 >= 4 && today.getMonth() + 1 <= 9;
  const mahaTag = isYalaNow ? `Maha-${year}` : suggested.startsWith('Maha-') ? suggested : `Maha-${year}`;
  const yalaTag = !isYalaNow ? `Yala-${year}` : suggested.startsWith('Yala-') ? suggested : `Yala-${year}`;
  return [
    { value: mahaTag, label: seasonLabel(mahaTag) },
    { value: yalaTag, label: seasonLabel(yalaTag) },
  ];
};

const formatLkr = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return `LKR ${(n / 1000).toFixed(0)}k`;
  return `LKR ${Math.round(n)}`;
};

const formatT = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)} t/ha` : '—';
};

const formatPrice = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? `Rs ${n.toFixed(0)}/kg` : '—';
};

const formatMm = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n)} mm` : '—';
};

const formatPct = (v: any, digits = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
};

// Mirrors the backend's cost-bucket shares in farmer_service.cost_breakdown
// so the drawer can render a breakdown immediately from local state.
const COST_SHARES: Array<[string, number]> = [
  ['seed', 0.10],
  ['fertilizer', 0.25],
  ['labour', 0.30],
  ['water', 0.15],
  ['other', 0.20],
];

function clientCostBreakdown(totalCost: any): Record<string, number> {
  const total = Math.max(Number(totalCost) || 0, 0);
  return COST_SHARES.reduce<Record<string, number>>((acc, [key, share]) => {
    acc[key] = Math.round(total * share);
    return acc;
  }, {});
}

const riskKind = (level: any) => {
  const v = String(level || '').toLowerCase();
  if (v === 'low') return 'live';
  if (v === 'high') return 'crit';
  return 'warn';
};

const bandKind = (band: string) => {
  if (band === 'low') return 'crit';
  if (band === 'high') return 'live';
  return 'warn';
};

const bandLabel = (band: string) => {
  if (band === 'low') return 'Low water';
  if (band === 'high') return 'High water';
  return 'Medium water';
};

interface FarmerCropRecommendation {
  rank: number;
  crop_id: string;
  crop_name: string;
  suitability_score: number;
  combined_score: number;
  predicted_yield_t_ha: number;
  predicted_price_per_kg: number;
  gross_revenue_per_ha: number;
  estimated_cost_per_ha: number;
  profit_per_ha: number;
  roi_percentage: number;
  risk_level: string;
  risk_factors: string[];
  water_requirement_mm: number;
  growth_duration_days: number;
  water_sensitivity: string;
  rationale: string;
  confidence: number;
}

interface FarmerFieldContext {
  field_id: string;
  field_name?: string | null;
  area_ha: number;
  soil_type: string;
  soil_ph?: number | null;
  water_availability_mm: number;
  water_band: string;
  water_explanation: string;
  reservoir_level_pct?: number | null;
  season: string;
  current_date: string;
  season_avg_temp: number;
  season_rainfall_mm: number;
}

interface FarmerRecommendResponse {
  field_context: FarmerFieldContext;
  recommendations: FarmerCropRecommendation[];
  models_used: string[];
  status: string;
  source: string;
  is_live: boolean;
  observed_at?: string | null;
  data_available: boolean;
  message?: string | null;
}

interface FarmerCropDetailResponse {
  field_id: string;
  season: string;
  crop: FarmerCropRecommendation;
  cost_breakdown: Record<string, number>;
  price_history: Array<{ date: string; price_per_kg: number; market_name?: string; price_type?: string }>;
  yield_history: Array<{ season: string; year: number; yield_t_per_ha: number; water_used_mm?: number | null }>;
  status: string;
  data_available: boolean;
  message?: string | null;
}

interface FarmerCurrentPlanResponse {
  field_id: string;
  season?: string | null;
  selected_crop_id?: string | null;
  selected_crop?: FarmerCropRecommendation | null;
  field_context?: FarmerFieldContext | null;
  recommendations: FarmerCropRecommendation[];
  status: string;
  source: string;
  is_live: boolean;
  observed_at?: string | null;
  data_available: boolean;
  message?: string | null;
}

interface FarmerSelectResponse {
  field_id: string;
  crop_id: string;
  season: string;
  recommendation_id?: number | null;
  persisted: boolean;
  status: string;
  source: string;
  is_live: boolean;
  observed_at?: string | null;
  data_available: boolean;
  message?: string | null;
}

interface LocalOptimizationPlan {
  field_id: string;
  season?: string | null;
  selected_crop_id: string;
  selected_crop: FarmerCropRecommendation;
  field_context?: FarmerFieldContext | null;
  recommendations: FarmerCropRecommendation[];
  saved_at: string;
}

interface OptimizationWizardProps {
  fieldId: string;
  fieldStatus: any;
  area: number;
}

export function OptimizationWizard({ fieldId, fieldStatus, area }: OptimizationWizardProps) {
  const suggestedSeason = React.useMemo(() => inferSeasonFromDate(), []);
  const seasonOptions = React.useMemo(() => SEASON_OPTIONS(suggestedSeason), [suggestedSeason]);

  const initialSoil = normalizeSoilType(fieldStatus?.soil_type) || 'Loam';
  const [soilType, setSoilType] = React.useState<string>(initialSoil);
  const [season, setSeason] = React.useState<string>(suggestedSeason);

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<FarmerRecommendResponse | null>(null);

  // Drill-down drawer state
  const [drawerCropId, setDrawerCropId] = React.useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [drawerData, setDrawerData] = React.useState<FarmerCropDetailResponse | null>(null);

  // Selection state
  const [selectedCropId, setSelectedCropId] = React.useState<string | null>(null);
  const [selectSubmitting, setSelectSubmitting] = React.useState(false);
  const [selectMessage, setSelectMessage] = React.useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = React.useState<FarmerCropDetailResponse | null>(null);
  const [selectedDetailLoading, setSelectedDetailLoading] = React.useState(false);
  const [hydratingSavedPlan, setHydratingSavedPlan] = React.useState(true);
  const [editMode, setEditMode] = React.useState(false);
  const localPlanKey = React.useMemo(() => `asi.optimization.plan.v1.${fieldId}`, [fieldId]);

  const persistLocalPlan = React.useCallback((plan: LocalOptimizationPlan) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(localPlanKey, JSON.stringify(plan));
    } catch {
      // Ignore storage failures (private mode/quota), server hydration remains primary.
    }
  }, [localPlanKey]);

  const readLocalPlan = React.useCallback((): LocalOptimizationPlan | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(localPlanKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocalOptimizationPlan;
      if (!parsed || parsed.field_id !== fieldId || !parsed.selected_crop_id || !parsed.selected_crop) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [fieldId, localPlanKey]);

  const buildLocalDetail = (cropId: string, seasonTag?: string) => {
    const localCrop = result?.recommendations?.find((r) => r.crop_id === cropId) || null;
    if (!localCrop) return null;
    return {
      field_id: fieldId,
      season: seasonTag || result?.field_context?.season || season,
      crop: localCrop,
      cost_breakdown: clientCostBreakdown(localCrop.estimated_cost_per_ha),
      price_history: [],
      yield_history: [],
      status: 'ok',
      data_available: true,
    } as FarmerCropDetailResponse;
  };

  const loadSelectedDetail = async (cropId: string, seasonTag?: string) => {
    const activeSeason = seasonTag || season;
    const local = buildLocalDetail(cropId, activeSeason);
    if (local) setSelectedDetail(local);

    setSelectedDetailLoading(true);
    try {
      const params = new URLSearchParams({
        field_id: fieldId,
        crop_id: cropId,
        season: activeSeason,
      });
      const detail = await apiGet<FarmerCropDetailResponse>(`/planning/farmer/crop-detail?${params.toString()}`);
      setSelectedDetail(detail);
    } catch {
      if (!local) setSelectedDetail(null);
    } finally {
      setSelectedDetailLoading(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    const applyHydratedPlan = async (current: FarmerCurrentPlanResponse) => {
      if (current.season) setSeason(current.season);
      const hydratedSoil = normalizeSoilType(current.field_context?.soil_type) || normalizeSoilType(fieldStatus?.soil_type);
      if (hydratedSoil) setSoilType(hydratedSoil);

      const normalizedRecs = Array.isArray(current.recommendations) && current.recommendations.length > 0
        ? current.recommendations
        : (current.selected_crop ? [current.selected_crop] : []);
      const hasHydratableRecs = normalizedRecs.length > 0;
      if (hasHydratableRecs) {
        const hydratedContext = current.field_context || {
          field_id: fieldId,
          field_name: fieldStatus?.field_name || null,
          area_ha: Number(area) || 0,
          soil_type: hydratedSoil || 'Loam',
          soil_ph: null,
          water_availability_mm: 0,
          water_band: 'medium',
          water_explanation: 'Run analysis to refresh water context.',
          reservoir_level_pct: null,
          season: current.season || suggestedSeason,
          current_date: new Date().toISOString().slice(0, 10),
          season_avg_temp: 0,
          season_rainfall_mm: 0,
        };

        setResult({
          field_context: hydratedContext,
          recommendations: normalizedRecs,
          models_used: [],
          status: current.status,
          source: current.source,
          is_live: current.is_live,
          observed_at: current.observed_at ?? null,
          data_available: current.data_available,
          message: current.message ?? null,
        });
      }

      if (current.selected_crop_id) {
        setSelectedCropId(current.selected_crop_id);
        setEditMode(false);
        if (hasHydratableRecs) {
          await loadSelectedDetail(current.selected_crop_id, current.season || undefined);
        }
      } else {
        setSelectedCropId(null);
        setSelectedDetail(null);
      }
    };

    const hydrate = async () => {
      if (!fieldId) return;
      setHydratingSavedPlan(true);
      let localApplied = false;
      const localPlan = readLocalPlan();
      if (localPlan) {
        localApplied = true;
        const localCurrent: FarmerCurrentPlanResponse = {
          field_id: localPlan.field_id,
          season: localPlan.season || null,
          selected_crop_id: localPlan.selected_crop_id,
          selected_crop: localPlan.selected_crop,
          field_context: localPlan.field_context || null,
          recommendations: localPlan.recommendations || [localPlan.selected_crop],
          status: 'ok',
          source: 'local_cache',
          is_live: false,
          observed_at: localPlan.saved_at,
          data_available: true,
          message: 'Loaded cached planned crop.',
        };
        await applyHydratedPlan(localCurrent);
      }
      try {
        const params = new URLSearchParams({ field_id: fieldId });
        const current = await apiGet<FarmerCurrentPlanResponse>(`/planning/farmer/current?${params.toString()}`);
        if (!active) {
          return;
        }
        const remoteHasPlan = Boolean(
          (Array.isArray(current.recommendations) && current.recommendations.length > 0)
          || current.selected_crop
        );
        if (!remoteHasPlan && localApplied) {
          return;
        }
        await applyHydratedPlan(current);
        if (remoteHasPlan && current.selected_crop_id) {
          const normalizedRecs = Array.isArray(current.recommendations) && current.recommendations.length > 0
            ? current.recommendations
            : (current.selected_crop ? [current.selected_crop] : []);
          const selected = current.selected_crop
            || normalizedRecs.find((r) => r.crop_id === current.selected_crop_id)
            || null;
          if (selected) {
            persistLocalPlan({
              field_id: fieldId,
              season: current.season || null,
              selected_crop_id: current.selected_crop_id,
              selected_crop: selected,
              field_context: current.field_context || null,
              recommendations: normalizedRecs,
              saved_at: new Date().toISOString(),
            });
          }
        }
      } catch {
        // No saved plan yet (or service unavailable); local cache (if any) remains active.
      } finally {
        if (active) setHydratingSavedPlan(false);
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, [area, fieldId, fieldStatus?.field_name, fieldStatus?.soil_type, persistLocalPlan, readLocalPlan, suggestedSeason]);

  const handleRecommend = async () => {
    if (!fieldId) return;
    setRunning(true);
    setError(null);
    setSelectMessage(null);
    try {
      const res = await apiPost<FarmerRecommendResponse>('/planning/farmer/recommend', {
        field_id: fieldId,
        soil_type: soilType,
        season,
        top_n: 5,
      });
      setResult(res);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || 'Failed to load recommendations');
      setError(msg);
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const openDrawer = async (cropId: string) => {
    const analysisSeason = result?.field_context?.season || season;
    setDrawerCropId(cropId);

    // Render immediately from local state. The recommend response already
    // carries every field needed for the KPIs, cost breakdown, risks,
    // rationale and confidence — so the drawer is usable even if the
    // server-side cache lookup below fails (e.g. postgres down).
    const localCrop = result?.recommendations?.find((r) => r.crop_id === cropId) || null;
    if (localCrop) {
      setDrawerData({
        field_id: fieldId,
        season: analysisSeason,
        crop: localCrop,
        cost_breakdown: clientCostBreakdown(localCrop.estimated_cost_per_ha),
        price_history: [],
        yield_history: [],
        status: 'ok',
        data_available: true,
      });
    } else {
      setDrawerData(null);
    }

    // Best-effort server enrichment for price/yield history. Failures
    // here (404 when no DB cache, DB down) are intentionally silent —
    // the local view above is already complete enough to act on.
    setDrawerLoading(true);
    try {
      const params = new URLSearchParams({
        field_id: fieldId,
        crop_id: cropId,
        season: analysisSeason,
      });
      const detail = await apiGet<FarmerCropDetailResponse>(`/planning/farmer/crop-detail?${params.toString()}`);
      setDrawerData(detail);
    } catch {
      // Keep the local view; nothing to surface to the user.
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerCropId(null);
    setDrawerData(null);
  };

  const handleSelect = async (cropId: string) => {
    const analysisSeason = result?.field_context?.season || season;
    const cropSnapshot =
      result?.recommendations?.find((r) => r.crop_id === cropId)
      || selectedDetail?.crop
      || null;
    const selectedLabel = cropSnapshot?.crop_name || cropId;
    const fallbackFieldContext = result?.field_context || {
      field_id: fieldId,
      field_name: fieldStatus?.field_name || null,
      area_ha: Number(area) || 0,
      soil_type: soilType,
      soil_ph: null,
      water_availability_mm: 0,
      water_band: 'medium',
      water_explanation: 'Run analysis to refresh water context.',
      reservoir_level_pct: null,
      season: analysisSeason,
      current_date: new Date().toISOString().slice(0, 10),
      season_avg_temp: 0,
      season_rainfall_mm: 0,
    };
    const fallbackRecommendations = result?.recommendations?.length
      ? result.recommendations
      : (cropSnapshot ? [cropSnapshot] : []);
    const persistSelectedPlan = (
      seasonTag = analysisSeason,
      fieldContext = fallbackFieldContext,
      recommendations = fallbackRecommendations,
      selected = cropSnapshot,
    ) => {
      const selectedCrop = selected
        || recommendations.find((r) => r.crop_id === cropId)
        || null;
      if (!selectedCrop) return;
      persistLocalPlan({
        field_id: fieldId,
        season: seasonTag,
        selected_crop_id: cropId,
        selected_crop: selectedCrop,
        field_context: fieldContext,
        recommendations: recommendations.length ? recommendations : [selectedCrop],
        saved_at: new Date().toISOString(),
      });
    };
    const syncConfirmedCrop = async (recommendationId?: string | number | null) => {
      if (!cropSnapshot) return;
      try {
        await apiPost(`/farm/fields/${fieldId}/confirm-crop`, {
          crop_type: cropSnapshot.crop_name || cropId,
          source: 'optimization_wizard',
          recommendation_id: recommendationId ? String(recommendationId) : undefined,
          expected_profit_per_ha: cropSnapshot.profit_per_ha,
        });
      } catch {
        // F1 crop confirmation is best-effort; the F4 plan remains the source of truth.
      }
    };
    setSelectSubmitting(true);
    setSelectMessage(null);
    // Mark the crop as chosen locally first. The server call below
    // persists to the shared database; the local copy keeps refresh
    // hydration working while the DB or planning service is unavailable.
    setSelectedCropId(cropId);
    setSelectedDetail(buildLocalDetail(cropId, analysisSeason));
    persistSelectedPlan();
    setEditMode(false);
    closeDrawer();
    try {
      const selectRes = await apiPost<FarmerSelectResponse>('/planning/farmer/select', {
        field_id: fieldId,
        crop_id: cropId,
        season: analysisSeason,
        crop_snapshot: cropSnapshot ?? undefined,
        field_context: result?.field_context ?? undefined,
      });
      if (!selectRes?.persisted) {
        await syncConfirmedCrop(selectRes?.recommendation_id);
        setSelectMessage(`Chosen ${selectedLabel}. Saved locally; database sync failed.`);
        return;
      }
      await syncConfirmedCrop(selectRes.recommendation_id);
      setSelectMessage('Saved as your planned crop for this field.');
      const params = new URLSearchParams({ field_id: fieldId });
      let current: FarmerCurrentPlanResponse | null = null;
      try {
        current = await apiGet<FarmerCurrentPlanResponse>(`/planning/farmer/current?${params.toString()}`);
      } catch {
        current = null;
      }
      const normalizedRecs = current
        ? (
          Array.isArray(current.recommendations) && current.recommendations.length > 0
            ? current.recommendations
            : (current.selected_crop ? [current.selected_crop] : [])
        )
        : (
          result?.recommendations?.length
            ? result.recommendations
            : (cropSnapshot ? [cropSnapshot] : [])
        );
      if (normalizedRecs.length > 0) {
        const hydratedFieldContext = current?.field_context || fallbackFieldContext;
        setResult((prev) => ({
          field_context: hydratedFieldContext,
          recommendations: normalizedRecs,
          models_used: prev?.models_used || [],
          status: current?.status || 'ok',
          source: current?.source || 'optimization_service',
          is_live: Boolean(current?.is_live ?? true),
          observed_at: current?.observed_at ?? null,
          data_available: Boolean(current?.data_available ?? true),
          message: current?.message ?? null,
        }));
        const selected = normalizedRecs.find((r) => r.crop_id === cropId) || cropSnapshot || null;
        persistSelectedPlan(current?.season || analysisSeason, hydratedFieldContext, normalizedRecs, selected);
      }
      loadSelectedDetail(cropId, current?.season || analysisSeason);
    } catch (err: any) {
      await syncConfirmedCrop(null);
      const msg = err instanceof ApiError ? err.message : (err?.message || 'database sync failed.');
      setSelectMessage(`Chosen ${selectedLabel}. Saved locally; ${msg}`);
    } finally {
      setSelectSubmitting(false);
    }
  };

  const ctx = result?.field_context;
  const selectedRecommendation = React.useMemo(() => {
    if (!selectedCropId) return null;
    return result?.recommendations?.find((rec) => rec.crop_id === selectedCropId) || selectedDetail?.crop || null;
  }, [result?.recommendations, selectedCropId, selectedDetail?.crop]);
  const showSelectedOnly = Boolean(selectedCropId && selectedRecommendation && !editMode);

  return (
    <div className="optimization-wizard" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Step 1 — Soil Type */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <span className="step-pill">1</span> Soil type
          </div>
          {soilType && <Chip kind="info" dot={false}>{soilType}</Chip>}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 8,
            marginTop: 10,
          }}
        >
          {SOIL_TYPES.map((s) => {
            const active = soilType === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setSoilType(s.value)}
                className="soil-option"
                style={{
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 10,
                  border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-50)' : 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: active ? 'var(--primary-600)' : 'var(--text)' }}>
                  {s.value}
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Season */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <span className="step-pill">2</span> Season
          </div>
          <Chip kind="info" dot={false}>{seasonLabel(season)}</Chip>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
            marginTop: 10,
          }}
        >
          {seasonOptions.map((opt) => {
            const active = season === opt.value;
            const isSuggested = opt.value === suggestedSeason;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSeason(opt.value)}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 10,
                  border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'var(--primary-50)' : 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  position: 'relative',
                }}
              >
                <div style={{ fontWeight: 600, color: active ? 'var(--primary-600)' : 'var(--text)' }}>
                  {opt.label}
                </div>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  {opt.value.startsWith('Maha')
                    ? 'Oct – Mar · main paddy season'
                    : 'Apr – Sep · vegetables, pulses'}
                </div>
                {isSuggested && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--primary-600)',
                      background: 'var(--primary-50)',
                      border: '1px solid var(--primary)',
                      padding: '2px 6px',
                      borderRadius: 99,
                    }}
                  >
                    Suggested
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3 — Water context (auto, populated after recommend) */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <span className="step-pill">3</span> Water context
          </div>
          {ctx ? (
            <Chip kind={bandKind(ctx.water_band)} dot>{bandLabel(ctx.water_band)}</Chip>
          ) : (
            <Chip kind="off" dot={false}>Auto-detected</Chip>
          )}
        </div>
        {ctx ? (
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55 }}>
            <div style={{ color: 'var(--text)' }}>{ctx.water_explanation}</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>
              Available {Math.round(ctx.water_availability_mm)} mm
              {ctx.reservoir_level_pct !== null && ctx.reservoir_level_pct !== undefined
                ? ` · scheme reservoir ${Math.round(ctx.reservoir_level_pct)}%`
                : ''}
              {' · field '}{Number(area).toFixed(1)} ha
            </div>
          </div>
        ) : (
          <div className="tiny muted" style={{ marginTop: 10 }}>
            Field water allocation and the scheme reservoir reading will appear here once you run the analysis.
          </div>
        )}
      </div>

      {/* CTA + run state */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {showSelectedOnly ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditMode(true)}
            disabled={running}
          >
            Edit crop choice
            <Icon name="arrow" size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRecommend}
            disabled={running || !soilType || !season}
          >
            {running ? 'Analyzing…' : (result ? 'Re-run analysis' : 'Find best crops')}
            <Icon name="arrow" size={13} />
          </button>
        )}
        {editMode && selectedCropId && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setEditMode(false)}
            disabled={running}
          >
            Back to planned crop
          </button>
        )}
        {hydratingSavedPlan && (
          <span className="tiny muted">Loading your saved crop plan…</span>
        )}
        {result && (
          <span className="tiny muted">
            {result.recommendations.length
              ? `${result.recommendations.length} crops · ${result.is_live ? 'live' : 'modeled'} data`
              : 'No crops met the constraints'}
          </span>
        )}
        {selectMessage && (
          <span
            style={{
              fontSize: 12,
              color: selectMessage.startsWith('Saved') ? 'var(--primary-600)' : '#B91C1C',
              fontWeight: 600,
            }}
          >
            {selectMessage}
          </span>
        )}
      </div>

      {/* Results */}
      <ApiState loading={running && !result} error={error} onRetry={handleRecommend}>
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.recommendations.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No suitable crops</div>
                <div className="tiny muted">
                  {result.message || 'Try a different soil type or season.'}
                </div>
              </div>
            ) : (
              <>
                {showSelectedOnly ? (
                  <>
                    <div className="card-title" style={{ marginTop: 4 }}>Planned crop for this field</div>
                    {selectedRecommendation && (
                      <CropCard
                        rec={selectedRecommendation}
                        isSelected
                        onClick={() => openDrawer(selectedRecommendation.crop_id)}
                      />
                    )}
                    <div className="card" style={{ padding: 14 }}>
                      <div className="card-title" style={{ fontSize: 13 }}>
                        Selected crop analysis
                      </div>
                      {selectedDetail ? (
                        <CropInsights data={selectedDetail} />
                      ) : (
                        <div className="tiny muted" style={{ marginTop: 6 }}>
                          Detail is loading for your selected crop.
                        </div>
                      )}
                      {selectedDetailLoading && (
                        <div className="tiny muted" style={{ marginTop: 8 }}>
                          Refreshing market and yield history…
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card-title" style={{ marginTop: 4 }}>Recommended crops</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 10,
                      }}
                    >
                      {result.recommendations.map((rec) => (
                        <CropCard
                          key={rec.crop_id}
                          rec={rec}
                          isSelected={selectedCropId === rec.crop_id}
                          onClick={() => openDrawer(rec.crop_id)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {result.models_used && result.models_used.length > 0 && (
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    Models: {result.models_used.join(' · ')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </ApiState>

      {/* Drill-down drawer */}
      {drawerCropId && (
        <CropDetailDrawer
          loading={drawerLoading}
          data={drawerData}
          submitting={selectSubmitting}
          isSelected={selectedCropId === drawerCropId}
          onClose={closeDrawer}
          onChoose={() => drawerCropId && handleSelect(drawerCropId)}
        />
      )}

      <style jsx>{`
        .step-pill {
          display: inline-flex;
          width: 18px;
          height: 18px;
          align-items: center;
          justify-content: center;
          border-radius: 99px;
          background: var(--primary-50);
          color: var(--primary-600);
          font-size: 11px;
          font-weight: 700;
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
}

interface CropCardProps {
  rec: FarmerCropRecommendation;
  isSelected: boolean;
  onClick: () => void;
}

function CropCard({ rec, isSelected, onClick }: CropCardProps) {
  const suitability = Math.max(0, Math.min(1, Number(rec.suitability_score) || 0));
  const score = Math.round(suitability * 100);
  const fillColor = suitability > 0.8 ? 'var(--primary)' : suitability > 0.6 ? '#8BC34A' : 'var(--accent)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        textAlign: 'left',
        padding: 14,
        cursor: 'pointer',
        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
        background: isSelected ? 'var(--primary-50)' : 'white',
        position: 'relative',
      }}
    >
      <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
            #{rec.rank}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{rec.crop_name}</div>
        </div>
        <Chip kind={riskKind(rec.risk_level)} dot>{String(rec.risk_level || 'medium').toUpperCase()}</Chip>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="between" style={{ fontSize: 11, color: 'var(--muted)' }}>
          <span>Suitability</span>
          <span className="tabular" style={{ color: 'var(--text)', fontWeight: 600 }}>{score}%</span>
        </div>
        <div className="prog slim" style={{ marginTop: 4 }}>
          <div className="prog-fill" style={{ width: `${score}%`, background: fillColor }} />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontSize: 12,
        }}
      >
        <Metric label="Yield" value={formatT(rec.predicted_yield_t_ha)} />
        <Metric label="Profit/ha" value={formatLkr(rec.profit_per_ha)} />
        <Metric label="Price" value={formatPrice(rec.predicted_price_per_kg)} />
        <Metric label="Water" value={formatMm(rec.water_requirement_mm)} />
      </div>

      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--primary)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 99,
          }}
        >
          ✓ CHOSEN
        </div>
      )}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tiny muted">{label}</div>
      <div className="tabular" style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function CropInsights({ data }: { data: FarmerCropDetailResponse }) {
  const crop = data.crop;
  const costEntries = React.useMemo(() => {
    if (!data.cost_breakdown) return [];
    return Object.entries(data.cost_breakdown).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: Number(value) || 0,
    }));
  }, [data.cost_breakdown]);

  const priceSeries = React.useMemo(() => {
    if (!data.price_history?.length) return [];
    return data.price_history.map((p) => Number(p.price_per_kg) || 0);
  }, [data.price_history]);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginTop: 8,
        }}
      >
        <KpiTile label="Predicted yield" value={formatT(crop.predicted_yield_t_ha)} />
        <KpiTile label="Market price" value={formatPrice(crop.predicted_price_per_kg)} />
        <KpiTile label="Profit / ha" value={formatLkr(crop.profit_per_ha)} accent />
        <KpiTile label="ROI" value={formatPct(crop.roi_percentage, 1)} accent />
      </div>

      {costEntries.length > 0 && (
        <div className="card" style={{ padding: 12, marginTop: 10 }}>
          <div className="card-title" style={{ fontSize: 13 }}>Cost breakdown</div>
          <div className="tiny muted" style={{ marginBottom: 6 }}>
            Estimated cost per hectare · {formatLkr(crop.estimated_cost_per_ha)}
          </div>
          <BarChart
            data={costEntries.map((e) => e.value)}
            labels={costEntries.map((e) => e.label)}
            width={460}
            height={140}
            color="var(--primary)"
          />
        </div>
      )}

      {priceSeries.length > 0 && (
        <div className="card" style={{ padding: 12, marginTop: 10 }}>
          <div className="card-title" style={{ fontSize: 13 }}>Price history (last {priceSeries.length} weeks)</div>
          <div style={{ marginTop: 6 }}>
            <Sparkline data={priceSeries} width={460} height={48} color="var(--primary)" />
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Latest market: Rs {priceSeries[priceSeries.length - 1].toFixed(0)}/kg
          </div>
        </div>
      )}

      {data.yield_history && data.yield_history.length > 0 && (
        <div className="card" style={{ padding: 12, marginTop: 10 }}>
          <div className="card-title" style={{ fontSize: 13 }}>Recent yields on this field</div>
          <table className="tbl" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Season</th>
                <th>Yield</th>
                <th>Water used</th>
              </tr>
            </thead>
            <tbody>
              {data.yield_history.map((row, i) => (
                <tr key={i}>
                  <td>{row.season} {row.year}</td>
                  <td className="tabular">{row.yield_t_per_ha.toFixed(1)} t/ha</td>
                  <td className="tabular muted">
                    {row.water_used_mm !== null && row.water_used_mm !== undefined
                      ? `${Math.round(row.water_used_mm)} mm`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginTop: 10 }}>
        <div className="card-title" style={{ fontSize: 13 }}>Crop properties</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.8, marginTop: 4 }}>
          <div>Water requirement: <b>{formatMm(crop.water_requirement_mm)}</b></div>
          <div>Growth duration: <b>{crop.growth_duration_days} days</b></div>
          <div>Water sensitivity: <b style={{ textTransform: 'capitalize' }}>{crop.water_sensitivity}</b></div>
        </div>
      </div>

      {crop.risk_factors && crop.risk_factors.length > 0 && (
        <div className="card" style={{ padding: 12, marginTop: 10 }}>
          <div className="card-title" style={{ fontSize: 13 }}>Risk factors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {crop.risk_factors.map((rf, i) => (
              <Chip key={i} kind={riskKind(crop.risk_level)} dot={false}>{rf}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginTop: 10 }}>
        <div className="card-title" style={{ fontSize: 13 }}>Why this crop</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>{crop.rationale}</div>
        <div className="between" style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
          <span>Model confidence</span>
          <span className="tabular" style={{ color: 'var(--text)', fontWeight: 600 }}>
            {Math.round((crop.confidence || 0) * 100)}%
          </span>
        </div>
        <div className="prog slim" style={{ marginTop: 4 }}>
          <div
            className="prog-fill"
            style={{ width: `${Math.round((crop.confidence || 0) * 100)}%`, background: 'var(--primary)' }}
          />
        </div>
      </div>
    </>
  );
}

interface CropDetailDrawerProps {
  loading: boolean;
  data: FarmerCropDetailResponse | null;
  submitting: boolean;
  isSelected: boolean;
  onClose: () => void;
  onChoose: () => void;
}

function CropDetailDrawer({
  loading,
  data,
  submitting,
  isSelected,
  onClose,
  onChoose,
}: CropDetailDrawerProps) {
  const crop = data?.crop;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 15, 0.35)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          height: '100%',
          background: 'white',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          padding: 20,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div className="between">
          <div>
            <div className="tiny muted" style={{ fontWeight: 600, letterSpacing: 0.4 }}>CROP DETAIL</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
              {crop?.crop_name || 'Loading…'}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        {!crop ? (
          <div className="tiny muted" style={{ padding: 12 }}>
            Crop record unavailable. Re-run the analysis from the wizard.
          </div>
        ) : (
          <>
              <CropInsights data={data} />

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onChoose}
                  disabled={submitting || isSelected}
                  style={{ flex: 1 }}
                >
                  {isSelected ? '✓ Already chosen' : submitting ? 'Saving…' : 'Choose this crop'}
                </button>
              </div>
              {loading && (
                <div className="tiny muted" style={{ textAlign: 'center', marginTop: -6 }}>
                  Loading market history…
                </div>
              )}
            </>
        )}
      </div>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 10,
        background: accent ? 'var(--primary-50)' : '#FAFBF9',
        border: `1px solid ${accent ? 'var(--primary)' : 'var(--border)'}`,
      }}
    >
      <div className="tiny muted">{label}</div>
      <div
        className="tabular"
        style={{
          fontSize: 16,
          fontWeight: 700,
          marginTop: 2,
          color: accent ? 'var(--primary-600)' : 'var(--text)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { cropFieldsApi } from '@api/f1-irrigation.api';
import { forecastingApi } from '@api/f3-forecasting.api';
import {
  acaoApi,
  type AdaptiveRecommendationRequest,
  type AdaptiveRecommendationResponse,
  type ScenarioEvaluationResponse,
} from '@api/f4-acao.api';

type LanguageCode = 'en' | 'si' | 'ta';
type BudgetBand = 'Healthy' | 'Watch' | 'Over-budget' | 'Unknown';

type Translation = {
  title: string;
  subtitle: string;
  announcement: string;
  currentDetails: string;
  quickScenario: string;
  quickAdaptive: string;
  runSimulation: string;
  runAnalysis: string;
  waterBudgetTitle: string;
  cropContributionTitle: string;
  languageLabel: string;
};

const TRANSLATIONS: Record<LanguageCode, Translation> = {
  en: {
    title: 'Farmer Portal',
    subtitle: 'Check current details, water budget, and run quick simulations.',
    announcement: 'New Farmer Portal is live. Check current field details, water budget, and run quick simulations.',
    currentDetails: 'Current Details',
    quickScenario: 'Quick Scenario Simulation',
    quickAdaptive: 'Quick Adaptive Simulation',
    runSimulation: 'Run Scenario',
    runAnalysis: 'Run Adaptive Analysis',
    waterBudgetTitle: 'Water Budget Analytics',
    cropContributionTitle: 'Crop-Level Water Contribution',
    languageLabel: 'Language',
  },
  si: {
    title: 'ගොවි ද්වාරය',
    subtitle: 'වත්මන් තොරතුරු, ජල අයවැය සහ ඉක්මන් simulation පරීක්ෂා කරන්න.',
    announcement: 'නව ගොවි ද්වාරය දැන් සජීවීයි. වත්මන් කෙත් තොරතුරු, ජල අයවැය සහ ඉක්මන් simulation පරීක්ෂා කරන්න.',
    currentDetails: 'වත්මන් තොරතුරු',
    quickScenario: 'ඉක්මන් සිද්ධි simulation',
    quickAdaptive: 'ඉක්මන් adaptive simulation',
    runSimulation: 'සිද්ධිය ධාවනය කරන්න',
    runAnalysis: 'Adaptive විශ්ලේෂණය ධාවනය කරන්න',
    waterBudgetTitle: 'ජල අයවැය විශ්ලේෂණය',
    cropContributionTitle: 'බෝග අනුව ජල දායකත්වය',
    languageLabel: 'භාෂාව',
  },
  ta: {
    title: 'விவசாயி போர்டல்',
    subtitle: 'தற்போதைய தகவல்கள், நீர் பட்ஜெட் மற்றும் விரைவு simulation-களை பார்க்கவும்.',
    announcement: 'புதிய விவசாயி போர்டல் இப்போது செயல்பாட்டில் உள்ளது. தற்போதைய புல தகவல்கள், நீர் பட்ஜெட் மற்றும் விரைவு simulation-களை பார்க்கவும்.',
    currentDetails: 'தற்போதைய விவரங்கள்',
    quickScenario: 'விரைவு சூழ்நிலை simulation',
    quickAdaptive: 'விரைவு adaptive simulation',
    runSimulation: 'சூழ்நிலையை இயக்கவும்',
    runAnalysis: 'Adaptive பகுப்பாய்வை இயக்கவும்',
    waterBudgetTitle: 'நீர் பட்ஜெட் பகுப்பாய்வு',
    cropContributionTitle: 'பயிர் வாரியான நீர் பங்களிப்பு',
    languageLabel: 'மொழி',
  },
};

const FARMER_PORTAL_LANGUAGE_KEY = 'farmerPortalLanguage';
const FARMER_PORTAL_BANNER_KEY = 'farmerPortalBannerDismissed';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (value !== null && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringValue = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const wrapped = error as {
      response?: { data?: { detail?: string; message?: string } };
      message?: string;
    };
    const detail = wrapped.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
    const responseMessage = wrapped.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage;
    }
    if (typeof wrapped.message === 'string' && wrapped.message.trim().length > 0) {
      return wrapped.message;
    }
  }
  return fallback;
};

const computeBudgetBand = (
  quota: number | null,
  usage: number
): { band: BudgetBand; utilization: number | null; remaining: number | null } => {
  if (quota === null || quota <= 0) {
    return { band: 'Unknown', utilization: null, remaining: null };
  }

  const utilization = (usage / quota) * 100;
  const remaining = quota - usage;
  if (utilization > 100) {
    return { band: 'Over-budget', utilization, remaining };
  }
  if (utilization > 70) {
    return { band: 'Watch', utilization, remaining };
  }
  return { band: 'Healthy', utilization, remaining };
};

const getBandChipColor = (band: BudgetBand): 'success' | 'warning' | 'error' | 'default' => {
  if (band === 'Healthy') return 'success';
  if (band === 'Watch') return 'warning';
  if (band === 'Over-budget') return 'error';
  return 'default';
};

const buildAdaptiveRequest = (topN: number, waterQuotaMm: number, priceFactor: number): AdaptiveRecommendationRequest => ({
  season: 'Maha-2026',
  top_n: topN,
  field_params: {
    area_ha: 5.0,
    soil_type: 'Loam',
    soil_ph: 6.5,
    soil_ec: 1.0,
    soil_suitability: 0.75,
    location: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    elevation: 500.0,
  },
  weather_params: {
    season_avg_temp: 28.0,
    season_rainfall_mm: 250.0,
    temp_mean_weekly: 28.0,
    temp_range_weekly: 8.0,
    precip_weekly_sum: 50.0,
    radiation_weekly_sum: 150.0,
    et0_weekly_sum: 30.0,
    humidity: 75.0,
  },
  water_params: {
    water_availability_mm: 5000.0,
    water_quota_mm: waterQuotaMm,
    water_coverage_ratio: 0.8,
    irrigation_efficiency: 0.7,
  },
  market_params: {
    price_factor: priceFactor,
    price_volatility: 'medium',
    demand_level: 'normal',
  },
  crop_filters: {},
  suitability_weight: 0.4,
  profitability_weight: 0.6,
});

export default function FarmerPortal() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem(FARMER_PORTAL_LANGUAGE_KEY);
    return savedLanguage === 'si' || savedLanguage === 'ta' ? savedLanguage : 'en';
  });
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(
    () => localStorage.getItem(FARMER_PORTAL_BANNER_KEY) !== 'true'
  );
  const [scenarioQuota, setScenarioQuota] = useState(3000);
  const [scenarioMinPaddy, setScenarioMinPaddy] = useState(120);
  const [scenarioRisk, setScenarioRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [adaptiveTopN, setAdaptiveTopN] = useState(5);
  const [adaptiveWaterQuota, setAdaptiveWaterQuota] = useState(800);
  const [adaptivePriceFactor, setAdaptivePriceFactor] = useState(1);

  useEffect(() => {
    localStorage.setItem(FARMER_PORTAL_LANGUAGE_KEY, language);
  }, [language]);

  const overviewQuery = useQuery({
    queryKey: ['farmer-portal-overview'],
    queryFn: async () => {
      const [fields, weather, optimization, budget] = await Promise.allSettled([
        cropFieldsApi.getFields(),
        forecastingApi.getWeatherSummary(),
        acaoApi.getRecommendations(),
        acaoApi.getWaterBudget(),
      ]);

      return { fields, weather, optimization, budget };
    },
    refetchInterval: 15000,
  });

  const scenarioMutation = useMutation({
    mutationFn: () =>
      acaoApi.evaluateScenario({
        scenario_name: 'Farmer Quick Scenario',
        water_quota_mm: scenarioQuota,
        min_paddy_area: scenarioMinPaddy,
        max_risk_level: scenarioRisk,
      }),
  });

  const adaptiveMutation = useMutation({
    mutationFn: (request: AdaptiveRecommendationRequest) =>
      acaoApi.getAdaptiveRecommendations(request),
  });

  const copy = TRANSLATIONS[language];

  const fieldsCount = useMemo(() => {
    if (overviewQuery.data?.fields.status === 'fulfilled' && Array.isArray(overviewQuery.data.fields.value.data)) {
      return overviewQuery.data.fields.value.data.length;
    }
    return 0;
  }, [overviewQuery.data]);

  const weatherSnapshot = useMemo(() => {
    if (overviewQuery.data?.weather.status !== 'fulfilled') {
      return { available: false, temperature: null as number | null, summary: null as string | null };
    }

    const root = toRecord(overviewQuery.data.weather.value.data);
    const current = toRecord(root?.current);
    return {
      available: root !== null,
      temperature: toNumber(current?.temperature_c),
      summary: toStringValue(current?.weather_description),
    };
  }, [overviewQuery.data]);

  const optimizationCount = useMemo(() => {
    if (overviewQuery.data?.optimization.status !== 'fulfilled') {
      return 0;
    }

    const root = toRecord(overviewQuery.data.optimization.value);
    const directCount = toNumber(root?.count);
    if (directCount !== null) {
      return directCount;
    }

    if (Array.isArray(root?.data)) {
      return root.data.length;
    }

    const nested = toRecord(root?.data);
    if (nested && Array.isArray(nested.data)) {
      return nested.data.length;
    }

    return 0;
  }, [overviewQuery.data]);

  const waterBudget = useMemo(() => {
    if (overviewQuery.data?.budget.status !== 'fulfilled') {
      return {
        available: false,
        quota: null as number | null,
        usage: 0,
        crops: [] as Array<{ cropName: string; waterUsage: number }>,
      };
    }

    const root = toRecord(overviewQuery.data.budget.value);
    const payload = toRecord(root?.data) ?? root;
    const crops = Array.isArray(payload?.crops)
      ? payload.crops
          .map((entry) => {
            const row = toRecord(entry);
            const cropName = toStringValue(row?.crop_name) ?? 'Unknown Crop';
            const waterUsage = toNumber(row?.water_usage) ?? toNumber(row?.waterUsed) ?? 0;
            return { cropName, waterUsage };
          })
          .sort((a, b) => b.waterUsage - a.waterUsage)
      : [];

    return {
      available: payload !== null,
      quota: toNumber(payload?.quota),
      usage: toNumber(payload?.total_usage) ?? toNumber(payload?.totalWaterUsage) ?? 0,
      crops,
    };
  }, [overviewQuery.data]);

  const budgetSummary = useMemo(
    () => computeBudgetBand(waterBudget.quota, waterBudget.usage),
    [waterBudget.quota, waterBudget.usage]
  );

  const adaptiveResult = adaptiveMutation.data?.data as AdaptiveRecommendationResponse | undefined;
  const topAdaptiveRecommendation = adaptiveResult?.recommendations?.[0];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            {copy.title}
          </Typography>
          <Typography color="text.secondary">{copy.subtitle}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {copy.languageLabel}
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={language}
            exclusive
            onChange={(_, value: LanguageCode | null) => {
              if (value) {
                setLanguage(value);
              }
            }}
          >
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="si">SI</ToggleButton>
            <ToggleButton value="ta">TA</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {showAnnouncement && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => {
                setShowAnnouncement(false);
                localStorage.setItem(FARMER_PORTAL_BANNER_KEY, 'true');
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {copy.announcement}
        </Alert>
      )}

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        {copy.currentDetails}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Field Snapshot
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {fieldsCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configured fields
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Weather / Forecast
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {weatherSnapshot.temperature !== null ? `${weatherSnapshot.temperature.toFixed(1)}°C` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {weatherSnapshot.summary ?? 'Weather summary unavailable'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Optimization Snapshot
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {optimizationCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recommendation rows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Water Budget Status
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {budgetSummary.band}
              </Typography>
              <Chip label={budgetSummary.band} color={getBandChipColor(budgetSummary.band)} size="small" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {copy.waterBudgetTitle}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Quota
            </Typography>
            <Typography variant="h6">
              {waterBudget.quota !== null ? `${waterBudget.quota.toFixed(1)} mm` : 'Unavailable'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Used
            </Typography>
            <Typography variant="h6">{waterBudget.usage.toFixed(1)} mm</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Remaining
            </Typography>
            <Typography variant="h6">
              {budgetSummary.remaining !== null ? `${budgetSummary.remaining.toFixed(1)} mm` : 'Unavailable'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="caption" color="text.secondary">
              Utilization
            </Typography>
            <Typography variant="h6">
              {budgetSummary.utilization !== null ? `${budgetSummary.utilization.toFixed(1)}%` : 'Unavailable'}
            </Typography>
          </Grid>
        </Grid>

        {budgetSummary.utilization !== null && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, budgetSummary.utilization))}
            color={budgetSummary.band === 'Over-budget' ? 'error' : budgetSummary.band === 'Watch' ? 'warning' : 'success'}
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {copy.cropContributionTitle}
        </Typography>
        {waterBudget.crops.length > 0 ? (
          <Stack spacing={1}>
            {waterBudget.crops.slice(0, 6).map((crop) => (
              <Box key={crop.cropName} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{crop.cropName}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {crop.waterUsage.toFixed(1)} mm
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No crop-level water budget data available.
          </Typography>
        )}
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {copy.quickScenario}
            </Typography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Water Quota (mm)"
                type="number"
                value={scenarioQuota}
                onChange={(event) => setScenarioQuota(Number(event.target.value))}
                inputProps={{ min: 100, step: 50 }}
                size="small"
              />
              <TextField
                label="Minimum Paddy Area (ha)"
                type="number"
                value={scenarioMinPaddy}
                onChange={(event) => setScenarioMinPaddy(Number(event.target.value))}
                inputProps={{ min: 0, step: 10 }}
                size="small"
              />
              <FormControl size="small">
                <InputLabel id="risk-level-label">Risk Level</InputLabel>
                <Select
                  labelId="risk-level-label"
                  label="Risk Level"
                  value={scenarioRisk}
                  onChange={(event) => setScenarioRisk(event.target.value as 'low' | 'medium' | 'high')}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={() => scenarioMutation.mutate()}
                disabled={scenarioMutation.isPending}
              >
                {scenarioMutation.isPending ? 'Running...' : copy.runSimulation}
              </Button>
            </Stack>

            {scenarioMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {getApiErrorMessage(scenarioMutation.error, 'Scenario simulation failed.')}
              </Alert>
            )}

            {scenarioMutation.isSuccess && (
              <ScenarioResultCard payload={scenarioMutation.data} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {copy.quickAdaptive}
            </Typography>
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Top Recommendations"
                type="number"
                value={adaptiveTopN}
                onChange={(event) => setAdaptiveTopN(Number(event.target.value))}
                inputProps={{ min: 1, max: 10, step: 1 }}
                size="small"
              />
              <TextField
                label="Water Quota (mm)"
                type="number"
                value={adaptiveWaterQuota}
                onChange={(event) => setAdaptiveWaterQuota(Number(event.target.value))}
                inputProps={{ min: 100, max: 5000, step: 50 }}
                size="small"
              />
              <TextField
                label="Price Factor"
                type="number"
                value={adaptivePriceFactor}
                onChange={(event) => setAdaptivePriceFactor(Number(event.target.value))}
                inputProps={{ min: 0.5, max: 2, step: 0.05 }}
                size="small"
              />
              <Button
                variant="contained"
                onClick={() =>
                  adaptiveMutation.mutate(
                    buildAdaptiveRequest(adaptiveTopN, adaptiveWaterQuota, adaptivePriceFactor)
                  )
                }
                disabled={adaptiveMutation.isPending}
              >
                {adaptiveMutation.isPending ? 'Running...' : copy.runAnalysis}
              </Button>
            </Stack>

            {adaptiveMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {getApiErrorMessage(adaptiveMutation.error, 'Adaptive analysis failed.')}
              </Alert>
            )}

            {topAdaptiveRecommendation && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Top Result
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {topAdaptiveRecommendation.crop_name}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Suitability ${(topAdaptiveRecommendation.suitability_score * 100).toFixed(0)}%`}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={`Profit Rs.${topAdaptiveRecommendation.profit_per_ha.toFixed(0)}/ha`}
                        size="small"
                        color="success"
                      />
                      <Chip label={`Risk ${topAdaptiveRecommendation.risk_level}`} size="small" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {topAdaptiveRecommendation.rationale}
                    </Typography>
                  </CardContent>
                </Card>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Processed in {adaptiveResult?.processing_time_ms.toFixed(0)} ms
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {(overviewQuery.isLoading || overviewQuery.isFetching) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Refreshing portal data...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {overviewQuery.isError && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Some current details could not be loaded. Portal is showing available data only.
        </Alert>
      )}
    </Box>
  );
}

function ScenarioResultCard({ payload }: { payload: ScenarioEvaluationResponse }) {
  const topRows = payload.data.allocation.slice(0, 3);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Chip label={`Status: ${payload.data.status}`} size="small" color="primary" />
          <Chip label={`Profit Rs.${(payload.data.total_profit ?? 0).toFixed(0)}`} size="small" color="success" />
          <Chip label={`Water ${(payload.data.water_usage ?? 0).toFixed(1)} mm`} size="small" />
        </Stack>

        {topRows.length > 0 ? (
          <Stack spacing={1}>
            {topRows.map((row) => (
              <Box key={row.crop_id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{row.crop_name}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {row.area_ha.toFixed(1)} ha
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No allocation rows returned for this scenario.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

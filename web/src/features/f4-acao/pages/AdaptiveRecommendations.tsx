import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Slider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Stack,
  Switch,
  FormControlLabel,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import GrassIcon from '@mui/icons-material/Grass';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TerrainIcon from '@mui/icons-material/Terrain';
import CloudIcon from '@mui/icons-material/Cloud';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMutation } from '@tanstack/react-query';
import { acaoApi } from '../../../api/f4-acao.api';
import {
  AdaptiveParams,
  AdaptiveResponse,
  DEFAULT_ADAPTIVE_PARAMS,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AdaptiveRecommendations() {
  // State for parameters
  const [params, setParams] = useState<AdaptiveParams>(DEFAULT_ADAPTIVE_PARAMS);
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState<AdaptiveResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mutation for getting recommendations
  const recommendationMutation = useMutation({
    mutationFn: (requestParams: AdaptiveParams) =>
      acaoApi.getAdaptiveRecommendations(requestParams as any),
    onSuccess: (response) => {
      setResults(response.data as any);
    },
  });

  // Load initial recommendations on mount
  useEffect(() => {
    recommendationMutation.mutate(params);
  }, []);

  const handleRunAnalysis = () => {
    recommendationMutation.mutate(params);
  };

  const handleResetParams = () => {
    setParams(DEFAULT_ADAPTIVE_PARAMS);
  };

  const updateFieldParam = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      field_params: { ...prev.field_params, [key]: value },
    }));
  };

  const updateWeatherParam = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      weather_params: { ...prev.weather_params, [key]: value },
    }));
  };

  const updateWaterParam = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      water_params: { ...prev.water_params, [key]: value },
    }));
  };

  const updateMarketParam = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      market_params: { ...prev.market_params, [key]: value },
    }));
  };

  const updateCropFilter = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      crop_filters: { ...prev.crop_filters, [key]: value },
    }));
  };

  const locations = [
    'Kandy', 'Dambulla', 'Anuradhapura', 'Polonnaruwa', 'Kurunegala',
    'Matale', 'Gampaha', 'Kegalle', 'Ratnapura', 'Hambantota',
    'Nuwara Eliya', 'Chilaw', 'Puttalam'
  ];

  const soilTypes = [
    'Clay', 'Clay Loam', 'Loam', 'Sandy Loam', 'Sandy Clay', 'Silty Loam', 'Red Loam'
  ];

  const seasons = ['Maha-2026', 'Yala-2026', 'Maha-2027', 'Yala-2027'];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Adaptive Crop Recommendations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Adjust input parameters to see how they affect ML model predictions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleResetParams}
          >
            Reset Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<TuneIcon />}
            onClick={handleRunAnalysis}
            disabled={recommendationMutation.isPending}
          >
            {recommendationMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel - Parameters */}
        <Grid item xs={12} md={5} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TuneIcon /> Input Parameters
              </Typography>

              {/* Parameter Tabs */}
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab icon={<TerrainIcon />} label="Field" />
                <Tab icon={<CloudIcon />} label="Weather" />
                <Tab icon={<WaterDropIcon />} label="Water" />
                <Tab icon={<StorefrontIcon />} label="Market" />
                <Tab icon={<GrassIcon />} label="Crops" />
              </Tabs>

              {/* Field Parameters Tab */}
              <TabPanel value={activeTab} index={0}>
                <Stack spacing={2.5}>
                  {/* Season Selector */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Season</InputLabel>
                    <Select
                      value={params.season}
                      label="Season"
                      onChange={(e) => setParams({ ...params, season: e.target.value })}
                    >
                      {seasons.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Location */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={params.field_params.location}
                      label="Location"
                      onChange={(e) => updateFieldParam('location', e.target.value)}
                    >
                      {locations.map((loc) => (
                        <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Soil Type */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Soil Type</InputLabel>
                    <Select
                      value={params.field_params.soil_type}
                      label="Soil Type"
                      onChange={(e) => updateFieldParam('soil_type', e.target.value)}
                    >
                      {soilTypes.map((st) => (
                        <MenuItem key={st} value={st}>{st}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Field Area */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Field Area: <strong>{params.field_params.area_ha} ha</strong>
                    </Typography>
                    <Slider
                      value={params.field_params.area_ha}
                      onChange={(_, v) => updateFieldParam('area_ha', v)}
                      min={0.1}
                      max={50}
                      step={0.5}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Soil pH */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Soil pH: <strong>{params.field_params.soil_ph}</strong>
                    </Typography>
                    <Slider
                      value={params.field_params.soil_ph}
                      onChange={(_, v) => updateFieldParam('soil_ph', v)}
                      min={4.0}
                      max={9.0}
                      step={0.1}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 5.5, label: 'Acidic' },
                        { value: 6.5, label: 'Optimal' },
                        { value: 7.5, label: 'Alkaline' },
                      ]}
                    />
                  </Box>

                  {/* Soil EC */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Soil EC: <strong>{params.field_params.soil_ec} mS/cm</strong>
                    </Typography>
                    <Slider
                      value={params.field_params.soil_ec}
                      onChange={(_, v) => updateFieldParam('soil_ec', v)}
                      min={0}
                      max={5}
                      step={0.1}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Soil Suitability */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Soil Suitability: <strong>{(params.field_params.soil_suitability * 100).toFixed(0)}%</strong>
                    </Typography>
                    <Slider
                      value={params.field_params.soil_suitability}
                      onChange={(_, v) => updateFieldParam('soil_suitability', v)}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                  </Box>

                  {/* Elevation */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Elevation: <strong>{params.field_params.elevation} m</strong>
                    </Typography>
                    <Slider
                      value={params.field_params.elevation}
                      onChange={(_, v) => updateFieldParam('elevation', v)}
                      min={0}
                      max={2500}
                      step={50}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Stack>
              </TabPanel>

              {/* Weather Parameters Tab */}
              <TabPanel value={activeTab} index={1}>
                <Stack spacing={2.5}>
                  {/* Season Avg Temp */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Average Temperature: <strong>{params.weather_params.season_avg_temp}°C</strong>
                    </Typography>
                    <Slider
                      value={params.weather_params.season_avg_temp}
                      onChange={(_, v) => updateWeatherParam('season_avg_temp', v)}
                      min={15}
                      max={40}
                      step={0.5}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 20, label: '20°C' },
                        { value: 28, label: '28°C (Optimal)' },
                        { value: 35, label: '35°C' },
                      ]}
                    />
                  </Box>

                  {/* Seasonal Rainfall */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Seasonal Rainfall: <strong>{params.weather_params.season_rainfall_mm} mm</strong>
                    </Typography>
                    <Slider
                      value={params.weather_params.season_rainfall_mm}
                      onChange={(_, v) => updateWeatherParam('season_rainfall_mm', v)}
                      min={0}
                      max={1500}
                      step={25}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Humidity */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Humidity: <strong>{params.weather_params.humidity}%</strong>
                    </Typography>
                    <Slider
                      value={params.weather_params.humidity}
                      onChange={(_, v) => updateWeatherParam('humidity', v)}
                      min={20}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Weekly Precipitation */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Weekly Precipitation: <strong>{params.weather_params.precip_weekly_sum} mm</strong>
                    </Typography>
                    <Slider
                      value={params.weather_params.precip_weekly_sum}
                      onChange={(_, v) => updateWeatherParam('precip_weekly_sum', v)}
                      min={0}
                      max={300}
                      step={5}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Temperature Range */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Weekly Temp Range: <strong>{params.weather_params.temp_range_weekly}°C</strong>
                    </Typography>
                    <Slider
                      value={params.weather_params.temp_range_weekly}
                      onChange={(_, v) => updateWeatherParam('temp_range_weekly', v)}
                      min={2}
                      max={20}
                      step={0.5}
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Stack>
              </TabPanel>

              {/* Water Parameters Tab */}
              <TabPanel value={activeTab} index={2}>
                <Stack spacing={2.5}>
                  {/* Water Availability */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Water Availability: <strong>{params.water_params.water_availability_mm} mm</strong>
                    </Typography>
                    <Slider
                      value={params.water_params.water_availability_mm}
                      onChange={(_, v) => updateWaterParam('water_availability_mm', v)}
                      min={500}
                      max={15000}
                      step={100}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Water Quota */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Water Quota: <strong>{params.water_params.water_quota_mm} mm</strong>
                    </Typography>
                    <Slider
                      value={params.water_params.water_quota_mm}
                      onChange={(_, v) => updateWaterParam('water_quota_mm', v)}
                      min={100}
                      max={3000}
                      step={50}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  {/* Water Coverage Ratio */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Water Coverage: <strong>{(params.water_params.water_coverage_ratio * 100).toFixed(0)}%</strong>
                    </Typography>
                    <Slider
                      value={params.water_params.water_coverage_ratio}
                      onChange={(_, v) => updateWaterParam('water_coverage_ratio', v)}
                      min={0}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                  </Box>

                  {/* Irrigation Efficiency */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Irrigation Efficiency: <strong>{(params.water_params.irrigation_efficiency * 100).toFixed(0)}%</strong>
                    </Typography>
                    <Slider
                      value={params.water_params.irrigation_efficiency}
                      onChange={(_, v) => updateWaterParam('irrigation_efficiency', v)}
                      min={0.3}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${(v * 100).toFixed(0)}%`}
                      marks={[
                        { value: 0.5, label: 'Flood' },
                        { value: 0.75, label: 'Sprinkler' },
                        { value: 0.9, label: 'Drip' },
                      ]}
                    />
                  </Box>
                </Stack>
              </TabPanel>

              {/* Market Parameters Tab */}
              <TabPanel value={activeTab} index={3}>
                <Stack spacing={2.5}>
                  {/* Price Factor */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Price Factor: <strong>{params.market_params.price_factor.toFixed(2)}x</strong>
                    </Typography>
                    <Slider
                      value={params.market_params.price_factor}
                      onChange={(_, v) => updateMarketParam('price_factor', v)}
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 0.7, label: 'Low' },
                        { value: 1.0, label: 'Normal' },
                        { value: 1.5, label: 'High' },
                      ]}
                    />
                  </Box>

                  {/* Price Volatility */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Price Volatility</InputLabel>
                    <Select
                      value={params.market_params.price_volatility}
                      label="Price Volatility"
                      onChange={(e) => updateMarketParam('price_volatility', e.target.value)}
                    >
                      <MenuItem value="low">Low - Stable prices</MenuItem>
                      <MenuItem value="medium">Medium - Normal fluctuation</MenuItem>
                      <MenuItem value="high">High - Unpredictable</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Market Demand */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Market Demand</InputLabel>
                    <Select
                      value={params.market_params.demand_level}
                      label="Market Demand"
                      onChange={(e) => updateMarketParam('demand_level', e.target.value)}
                    >
                      <MenuItem value="low">Low demand</MenuItem>
                      <MenuItem value="normal">Normal demand</MenuItem>
                      <MenuItem value="high">High demand</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </TabPanel>

              {/* Crop Filters Tab */}
              <TabPanel value={activeTab} index={4}>
                <Stack spacing={2.5}>
                  {/* Number of Recommendations */}
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Top N Recommendations: <strong>{params.top_n}</strong> (out of 30 crops)
                    </Typography>
                    <Slider
                      value={params.top_n}
                      onChange={(_, v) => setParams({ ...params, top_n: v as number })}
                      min={1}
                      max={20}
                      step={1}
                      valueLabelDisplay="auto"
                      marks={[{value: 1, label: '1'}, {value: 10, label: '10'}, {value: 20, label: '20'}]}
                    />
                  </Box>

                  {/* Water Sensitivity Filter */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Water Sensitivity</InputLabel>
                    <Select
                      value={params.crop_filters.water_sensitivity_filter || ''}
                      label="Water Sensitivity"
                      onChange={(e) => updateCropFilter('water_sensitivity_filter', e.target.value || null)}
                    >
                      <MenuItem value="">All crops</MenuItem>
                      <MenuItem value="low">Low (drought tolerant)</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High (water intensive)</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Max Risk Level */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Max Risk Level</InputLabel>
                    <Select
                      value={params.crop_filters.max_risk_level || ''}
                      label="Max Risk Level"
                      onChange={(e) => updateCropFilter('max_risk_level', e.target.value || null)}
                    >
                      <MenuItem value="">Any risk level</MenuItem>
                      <MenuItem value="low">Low risk only</MenuItem>
                      <MenuItem value="medium">Up to medium risk</MenuItem>
                      <MenuItem value="high">All risk levels</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Max Growth Duration */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Max Growth Duration (days)"
                    value={params.crop_filters.max_growth_duration_days || ''}
                    onChange={(e) =>
                      updateCropFilter('max_growth_duration_days', e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="e.g., 120"
                  />

                  {/* Min Profit Filter */}
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Min Profit per Hectare (Rs)"
                    value={params.crop_filters.min_profit_per_ha || ''}
                    onChange={(e) =>
                      updateCropFilter('min_profit_per_ha', e.target.value ? parseFloat(e.target.value) : null)
                    }
                    placeholder="e.g., 100000"
                  />

                  {/* Advanced: Model Weights */}
                  <Divider />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showAdvanced}
                        onChange={(e) => setShowAdvanced(e.target.checked)}
                      />
                    }
                    label="Show Advanced Options"
                  />

                  {showAdvanced && (
                    <>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Suitability Weight: <strong>{params.suitability_weight.toFixed(1)}</strong>
                        </Typography>
                        <Slider
                          value={params.suitability_weight}
                          onChange={(_, v) =>
                            setParams({
                              ...params,
                              suitability_weight: v as number,
                              profitability_weight: 1 - (v as number),
                            })
                          }
                          min={0}
                          max={1}
                          step={0.1}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Profitability Weight: <strong>{params.profitability_weight.toFixed(1)}</strong>
                        </Typography>
                        <Slider
                          value={params.profitability_weight}
                          onChange={(_, v) =>
                            setParams({
                              ...params,
                              profitability_weight: v as number,
                              suitability_weight: 1 - (v as number),
                            })
                          }
                          min={0}
                          max={1}
                          step={0.1}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                    </>
                  )}
                </Stack>
              </TabPanel>
            </CardContent>
          </Card>

          {/* Input Summary Card */}
          {results && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Input Summary
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">{results.input_summary.location}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Season</TableCell>
                      <TableCell align="right">{results.input_summary.season}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Field Area</TableCell>
                      <TableCell align="right">{results.input_summary.field_area_ha} ha</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Soil pH</TableCell>
                      <TableCell align="right">{results.input_summary.soil_ph}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Soil Suitability</TableCell>
                      <TableCell align="right">
                        {(results.input_summary.soil_suitability * 100).toFixed(0)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Water Available</TableCell>
                      <TableCell align="right">{results.input_summary.water_availability_mm} mm</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Avg Temperature</TableCell>
                      <TableCell align="right">{results.input_summary.season_avg_temp}°C</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Rainfall</TableCell>
                      <TableCell align="right">{results.input_summary.season_rainfall_mm} mm</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Price Factor</TableCell>
                      <TableCell align="right">{results.input_summary.price_factor}x</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Crops Evaluated</TableCell>
                      <TableCell align="right">{results.input_summary.crops_evaluated}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Panel - Results */}
        <Grid item xs={12} md={7} lg={8}>
          {/* Loading State */}
          {recommendationMutation.isPending && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress size={60} />
            </Box>
          )}

          {/* Error State */}
          {recommendationMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to get recommendations. Please ensure the backend service is running on port 8004.
            </Alert>
          )}

          {/* Results */}
          {results && !recommendationMutation.isPending && (
            <>
              {/* Summary Stats */}
              <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary" fontWeight={600}>
                        {results.recommendations.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Recommendations
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main" fontWeight={600}>
                        {(results.average_suitability * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Suitability
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main" fontWeight={600}>
                        Rs {(results.best_profit_per_ha / 1000).toFixed(0)}K
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Best Profit/ha
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main" fontWeight={600}>
                        {results.processing_time_ms.toFixed(0)}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Processing Time
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Recommendation Cards */}
              <Grid container spacing={2}>
                {results.recommendations.map((rec) => (
                  <Grid item xs={12} key={rec.crop_id}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderColor: rec.rank === 1 ? 'primary.main' : 'divider',
                        borderWidth: rec.rank === 1 ? 2 : 1,
                      }}
                    >
                      <CardContent>
                        <Grid container spacing={2}>
                          {/* Left: Crop Info */}
                          <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Chip
                                label={`#${rec.rank} Recommended`}
                                color={rec.rank === 1 ? 'primary' : 'default'}
                                size="small"
                              />
                              <Chip
                                icon={
                                  rec.risk_level === 'low' ? <CheckCircleIcon /> :
                                  rec.risk_level === 'high' ? <WarningIcon /> : undefined
                                }
                                label={rec.risk_level.charAt(0).toUpperCase() + rec.risk_level.slice(1)}
                                size="small"
                                color={
                                  rec.risk_level === 'low' ? 'success' :
                                  rec.risk_level === 'medium' ? 'warning' : 'error'
                                }
                              />
                            </Box>

                            <Typography variant="h6" fontWeight={600}>
                              {rec.crop_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rec.crop_id} • {rec.growth_duration_days} days • {rec.water_sensitivity} water
                            </Typography>

                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                Combined Score
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={rec.combined_score * 100}
                                sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                                color={rec.combined_score > 0.7 ? 'success' : rec.combined_score > 0.5 ? 'warning' : 'error'}
                              />
                              <Typography variant="body2" fontWeight={600}>
                                {(rec.combined_score * 100).toFixed(1)}%
                              </Typography>
                            </Box>

                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Suitability (Fuzzy-TOPSIS)
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={rec.suitability_score * 100}
                                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                                color="info"
                              />
                              <Typography variant="caption">
                                {(rec.suitability_score * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Grid>

                          {/* Middle: Predictions */}
                          <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                              ML Predictions
                            </Typography>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GrassIcon fontSize="small" color="success" />
                                <Typography variant="body2">
                                  <strong>Yield:</strong> {rec.predicted_yield_t_ha.toFixed(1)} t/ha
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MonetizationOnIcon fontSize="small" color="warning" />
                                <Typography variant="body2">
                                  <strong>Price:</strong> Rs {rec.predicted_price_per_kg.toFixed(0)}/kg
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WaterDropIcon fontSize="small" color="primary" />
                                <Typography variant="body2">
                                  <strong>Water:</strong> {rec.water_requirement_mm} mm
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InfoIcon fontSize="small" color="info" />
                                <Typography variant="body2">
                                  <strong>Confidence:</strong> {(rec.confidence * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>

                          {/* Right: Financials */}
                          <Grid item xs={12} sm={4}>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                              Financial Analysis
                            </Typography>
                            <Stack spacing={1}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Gross Revenue</Typography>
                                <Typography variant="body1" fontWeight={500}>
                                  Rs {(rec.gross_revenue_per_ha / 1000).toFixed(0)}K/ha
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Production Cost</Typography>
                                <Typography variant="body1" fontWeight={500}>
                                  Rs {(rec.estimated_cost_per_ha / 1000).toFixed(0)}K/ha
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Net Profit</Typography>
                                <Typography variant="h6" fontWeight={600} color="success.main">
                                  Rs {(rec.profit_per_ha / 1000).toFixed(0)}K/ha
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">ROI</Typography>
                                <Typography variant="body1" fontWeight={600} color="primary">
                                  {rec.roi_percentage.toFixed(1)}%
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>
                        </Grid>

                        {/* Rationale & Risk Factors */}
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="body2">
                            <strong>Rationale:</strong> {rec.rationale}
                          </Typography>
                          {rec.risk_factors.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Risk Factors:</strong>
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {rec.risk_factors.map((rf, idx) => (
                                  <Chip key={idx} label={rf} size="small" variant="outlined" color="warning" />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* ML Models Used */}
              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  ML Models Used
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {results.models_used.map((model, idx) => (
                    <Chip key={idx} label={model} size="small" variant="outlined" color="info" />
                  ))}
                </Box>
              </Paper>
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

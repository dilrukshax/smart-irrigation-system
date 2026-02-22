import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import forecastingAPI, { ModelInfo, ModelComparisonResponse } from '../../../api/forecasting';

interface ModelPerformanceChartsProps {
  compact?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

const ModelPerformanceCharts: React.FC<ModelPerformanceChartsProps> = ({ compact = false }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelComparison, setModelComparison] = useState<ModelComparisonResponse | null>(null);
  const [modelRankings, setModelRankings] = useState<any>(null);
  const [featureImportance, setFeatureImportance] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('rf');
  const [tabValue, setTabValue] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comparison, rankings, features] = await Promise.all([
        forecastingAPI.getModelComparison().catch(() => null),
        forecastingAPI.getModelRankings().catch(() => null),
        forecastingAPI.getFeatureImportance(selectedModel).catch(() => null),
      ]);

      setModelComparison(comparison);
      setModelRankings(rankings);
      setFeatureImportance(features);
    } catch (err: any) {
      console.error('Error fetching model data:', err);
      setError(err.message || 'Failed to fetch model performance data');
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getModelColor = (index: number) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main,
    ];
    return colors[index % colors.length];
  };

  const getMetricStatus = (value: number, metric: string) => {
    if (metric === 'r2') {
      if (value > 0.9) return { color: 'success', label: 'Excellent' };
      if (value > 0.7) return { color: 'success', label: 'Good' };
      if (value > 0.5) return { color: 'warning', label: 'Fair' };
      return { color: 'error', label: 'Poor' };
    }
    // For RMSE and MAE, lower is better
    if (value < 1) return { color: 'success', label: 'Excellent' };
    if (value < 3) return { color: 'success', label: 'Good' };
    if (value < 5) return { color: 'warning', label: 'Fair' };
    return { color: 'error', label: 'Needs Improvement' };
  };

  // Generate simulated model data if not available
  const getModelData = (): ModelInfo[] => {
    if (modelComparison?.models) {
      return modelComparison.models;
    }
    // Simulated data for demo
    return [
      { name: 'Random Forest', metrics: { rmse: 1.24, mae: 0.89, r2: 0.92 }, rank: 1 },
      { name: 'Gradient Boosting', metrics: { rmse: 1.31, mae: 0.95, r2: 0.90 }, rank: 2 },
      { name: 'LSTM', metrics: { rmse: 1.45, mae: 1.12, r2: 0.88 }, rank: 3 },
      { name: 'Linear Regression', metrics: { rmse: 2.15, mae: 1.68, r2: 0.75 }, rank: 4 },
      { name: 'ARIMA', metrics: { rmse: 1.98, mae: 1.52, r2: 0.78 }, rank: 5 },
    ];
  };

  const models = getModelData();
  const bestModel = modelComparison?.best_model || models[0]?.name || 'Random Forest';

  // Prepare chart data
  const metricsBarData = models.map((model, index) => ({
    name: model.name,
    rmse: model.metrics.rmse,
    mae: model.metrics.mae,
    r2: model.metrics.r2 * 10, // Scale R² for visibility
    fill: getModelColor(index),
  }));

  const radarData = [
    { metric: 'Accuracy', fullMark: 100 },
    { metric: 'Speed', fullMark: 100 },
    { metric: 'Stability', fullMark: 100 },
    { metric: 'Robustness', fullMark: 100 },
    { metric: 'Interpretability', fullMark: 100 },
  ].map((item) => {
    const result: any = { ...item };
    models.slice(0, 3).forEach((model) => {
      // Generate synthetic scores based on metrics
      const baseScore = (1 - model.metrics.rmse / 5) * 100;
      result[model.name] = Math.min(100, Math.max(0, baseScore + (Math.random() * 20 - 10)));
    });
    return result;
  });

  // Feature importance data
  const getFeatureData = () => {
    if (featureImportance?.features) {
      return featureImportance.features;
    }
    // Simulated feature importance
    return [
      { feature: 'hour', importance: 0.25 },
      { feature: 'day_of_week', importance: 0.18 },
      { feature: 'rolling_mean_24h', importance: 0.15 },
      { feature: 'lag_1h', importance: 0.12 },
      { feature: 'lag_24h', importance: 0.10 },
      { feature: 'rolling_std_6h', importance: 0.08 },
      { feature: 'month', importance: 0.07 },
      { feature: 'trend', importance: 0.05 },
    ];
  };

  const featureData = getFeatureData();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (compact) {
    // Compact view for dashboard widget
    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Model Performance
            </Typography>
            <IconButton size="small" onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Box>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <TrophyIcon sx={{ color: '#ffc107', fontSize: 32 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Best Model
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {bestModel}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={1}>
            {models.slice(0, 3).map((model, index) => (
              <Grid item xs={12} key={model.name}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {index === 0 && '🥇'} {index === 1 && '🥈'} {index === 2 && '🥉'} {model.name}
                  </Typography>
                  <Box sx={{ width: '40%' }}>
                    <LinearProgress
                      variant="determinate"
                      value={model.metrics.r2 * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={index === 0 ? 'primary' : index === 1 ? 'secondary' : 'info'}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    R²: {model.metrics.r2.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Model Performance Analysis
        </Typography>
        <IconButton onClick={fetchData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}. Showing sample data for demonstration.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Model Comparison" icon={<CompareIcon />} iconPosition="start" />
        <Tab label="Feature Importance" icon={<TrendingUpIcon />} iconPosition="start" />
        <Tab label="Model Details" icon={<SpeedIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 1: Model Comparison */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Best Model Card */}
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ bgcolor: 'primary.dark', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrophyIcon sx={{ fontSize: 48, color: '#ffc107' }} />
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Best Performing Model
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {bestModel}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>RMSE</Typography>
                    <Typography variant="h6">{models[0]?.metrics.rmse.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>MAE</Typography>
                    <Typography variant="h6">{models[0]?.metrics.mae.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>R²</Typography>
                    <Typography variant="h6">{models[0]?.metrics.r2.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Metrics Bar Chart */}
          <Grid item xs={12} md={8}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Metrics Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="rmse" name="RMSE" fill={theme.palette.error.main} />
                    <Bar dataKey="mae" name="MAE" fill={theme.palette.warning.main} />
                    <Bar dataKey="r2" name="R² × 10" fill={theme.palette.success.main} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Radar Chart */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Model Characteristics
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    {models.slice(0, 3).map((model, index) => (
                      <Radar
                        key={model.name}
                        name={model.name}
                        dataKey={model.name}
                        stroke={getModelColor(index)}
                        fill={getModelColor(index)}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Rankings Table */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Model Rankings
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Model</TableCell>
                        <TableCell align="right">RMSE</TableCell>
                        <TableCell align="right">MAE</TableCell>
                        <TableCell align="right">R²</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {models.map((model, index) => {
                        const status = getMetricStatus(model.metrics.r2, 'r2');
                        return (
                          <TableRow key={model.name}>
                            <TableCell>
                              {index === 0 && '🥇'}
                              {index === 1 && '🥈'}
                              {index === 2 && '🥉'}
                              {index > 2 && `#${index + 1}`}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={index === 0 ? 'bold' : 'normal'}>
                                {model.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{model.metrics.rmse.toFixed(3)}</TableCell>
                            <TableCell align="right">{model.metrics.mae.toFixed(3)}</TableCell>
                            <TableCell align="right">{model.metrics.r2.toFixed(3)}</TableCell>
                            <TableCell>
                              <Chip
                                label={status.label}
                                size="small"
                                color={status.color as any}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Feature Importance */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Select Model
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    label="Model"
                  >
                    <MenuItem value="rf">Random Forest</MenuItem>
                    <MenuItem value="gb">Gradient Boosting</MenuItem>
                    <MenuItem value="lr">Linear Regression</MenuItem>
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Top Features
                </Typography>
                {featureData.slice(0, 5).map((f: any, index: number) => (
                  <Box key={f.feature} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">{f.feature}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {(f.importance * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={f.importance * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={index === 0 ? 'primary' : 'secondary'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Feature Importance Chart
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={featureData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 0.3]} tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`} />
                    <YAxis dataKey="feature" type="category" width={120} />
                    <RechartsTooltip
                      formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                    />
                    <Bar
                      dataKey="importance"
                      name="Importance"
                      fill={theme.palette.primary.main}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Model Details */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {models.map((model, index) => (
            <Grid item xs={12} md={6} lg={4} key={model.name}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    {index === 0 && <TrophyIcon sx={{ color: '#ffc107' }} />}
                    <Typography variant="h6" fontWeight="bold">
                      {model.name}
                    </Typography>
                    <Chip
                      label={`Rank #${index + 1}`}
                      size="small"
                      color={index === 0 ? 'primary' : 'default'}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'error.light', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption">RMSE</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {model.metrics.rmse.toFixed(3)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption">MAE</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {model.metrics.mae.toFixed(3)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption">R²</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {model.metrics.r2.toFixed(3)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Overall Performance
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={model.metrics.r2 * 100}
                      sx={{ height: 10, borderRadius: 5, mt: 1 }}
                      color={model.metrics.r2 > 0.8 ? 'success' : model.metrics.r2 > 0.6 ? 'warning' : 'error'}
                    />
                    <Typography variant="body2" align="right" sx={{ mt: 0.5 }}>
                      {(model.metrics.r2 * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ModelPerformanceCharts;

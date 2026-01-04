import { Box, Typography, Grid, Card, CardContent, Paper, Chip, LinearProgress, Button, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { forecastingAPI, type ForecastResponse, type ModelComparisonResponse, type RiskAssessment } from '../../../api/forecasting';
import RefreshIcon from '@mui/icons-material/Refresh';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import TimelineIcon from '@mui/icons-material/Timeline';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ForecastDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [modelComparison, setModelComparison] = useState<ModelComparisonResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if ML models are trained
      const status = await forecastingAPI.getAdvancedStatus();
      setSystemStatus(status);

      if (status.models_trained) {
        // Fetch ML predictions
        const [forecastData, riskData, comparisonData] = await Promise.all([
          forecastingAPI.getAdvancedForecast(72, 'best', true),
          forecastingAPI.getAdvancedRiskAssessment(),
          forecastingAPI.getModelComparison()
        ]);

        setForecast(forecastData);
        setRiskAssessment(riskData);
        setModelComparison(comparisonData);
      } else {
        // Use basic forecasting as fallback
        const basicForecast = await forecastingAPI.getBasicForecast(24);
        const basicRisk = await forecastingAPI.getBasicRiskAssessment();
        
        setForecast(basicForecast as any);
        setRiskAssessment(basicRisk as any);
      }
    } catch (err: any) {
      console.error('Error fetching forecast data:', err);
      setError(err.response?.data?.detail || 'Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModels = async () => {
    try {
      setTraining(true);
      setError(null);
      
      const result = await forecastingAPI.trainModels();
      
      if (result.status === 'success') {
        // Refresh data after training
        await fetchData();
      }
    } catch (err: any) {
      console.error('Error training models:', err);
      // Handle 503 (TensorFlow not available) gracefully
      if (err.response?.status === 503) {
        setError('Advanced ML features unavailable. TensorFlow is not installed on the server. Please contact your administrator to install TensorFlow, or use basic forecasting features.');
      } else {
        setError(err.response?.data?.detail || 'Failed to train models');
      }
    } finally {
      setTraining(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const forecastChartData = forecast ? {
    labels: forecast.predictions.map(p => {
      const date = new Date(p.timestamp * 1000);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
    }),
    datasets: [
      {
        label: 'Predicted Water Level',
        data: forecast.predictions.map(p => p.predicted_water_level),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4,
      },
      ...(forecast.predictions[0]?.lower_bound !== undefined ? [
        {
          label: 'Upper Bound (90%)',
          data: forecast.predictions.map(p => p.upper_bound),
          borderColor: 'rgba(75, 192, 192, 0.3)',
          borderDash: [5, 5],
          fill: false,
        },
        {
          label: 'Lower Bound (10%)',
          data: forecast.predictions.map(p => p.lower_bound),
          borderColor: 'rgba(75, 192, 192, 0.3)',
          borderDash: [5, 5],
          fill: '-1',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
        }
      ] : [])
    ]
  } : null;

  const modelComparisonChartData = modelComparison ? {
    labels: modelComparison.models.map(m => m.name),
    datasets: [
      {
        label: 'RMSE (lower is better)',
        data: modelComparison.models.map(m => m.metrics.rmse),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
      },
      {
        label: 'MAE (lower is better)',
        data: modelComparison.models.map(m => m.metrics.mae),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
      },
      {
        label: 'R² Score (higher is better, ×100)',
        data: modelComparison.models.map(m => m.metrics.r2 * 100),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      }
    ]
  } : null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  if (loading && !forecast) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            🌊 Advanced Forecasting Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ML-powered time-series forecasts with multi-model ensemble
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={training ? <CircularProgress size={20} /> : <ModelTrainingIcon />}
            onClick={handleTrainModels}
            disabled={training || systemStatus?.status === 'unavailable'}
          >
            {training ? 'Training...' : systemStatus?.models_trained ? 'Retrain ML' : 'Train ML'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {systemStatus && (
        <Alert severity={systemStatus.models_trained ? 'success' : systemStatus.status === 'unavailable' ? 'warning' : 'info'} sx={{ mb: 3 }}>
          {systemStatus.status === 'unavailable'
            ? '⚠️ Advanced ML features unavailable. TensorFlow is not installed on the server. Using basic linear forecasting.'
            : systemStatus.models_trained
              ? `✓ ML Models Active: ${systemStatus.available_models.join(', ')} | Data Points: ${systemStatus.data_points}`
              : '⚠️ Using basic linear forecasting. Train ML models for advanced predictions.'}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Forecast" icon={<TimelineIcon />} iconPosition="start" />
        <Tab label="Risk Assessment" />
        <Tab label="Model Comparison" disabled={!systemStatus?.models_trained} />
      </Tabs>

      {/* Tab 0: Forecast */}
      {tabValue === 0 && forecast && (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Water Level
                  </Typography>
                  <Typography variant="h4" fontWeight={600} sx={{ my: 1 }}>
                    {forecast.current_level.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Model: {forecast.model_used}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {forecast.metrics && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        RMSE
                      </Typography>
                      <Typography variant="h4" fontWeight={600} sx={{ my: 1 }}>
                        {forecast.metrics.rmse.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        Lower is better
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        R² Score
                      </Typography>
                      <Typography variant="h4" fontWeight={600} sx={{ my: 1 }}>
                        {(forecast.metrics.r2 * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        Model accuracy
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Forecast Horizon
                      </Typography>
                      <Typography variant="h4" fontWeight={600} sx={{ my: 1 }}>
                        {forecast.predictions.length}h
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(forecast.predictions.length / 24).toFixed(1)} days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              📈 {forecast.predictions.length}-Hour Forecast
            </Typography>
            {forecastChartData && (
              <Box sx={{ height: 400 }}>
                <Line
                  data={forecastChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                      title: {
                        display: true,
                        text: `Water Level Prediction (Current: ${forecast.current_level.toFixed(1)}%)`
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Water Level (%)' }
                      }
                    }
                  }}
                />
              </Box>
            )}
          </Paper>
        </>
      )}

      {/* Tab 1: Risk Assessment */}
      {tabValue === 1 && riskAssessment && (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🌊 Flood Risk
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Chip
                      label={riskAssessment.flood_risk}
                      color={getRiskColor(riskAssessment.flood_risk)}
                      size="medium"
                      sx={{ fontSize: '1.1rem', px: 2 }}
                    />
                    {riskAssessment.confidence && (
                      <Typography variant="body2" color="text.secondary">
                        Confidence: {(riskAssessment.confidence * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    24h Max Prediction: {riskAssessment.predicted_max_24h?.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ☀️ Drought Risk
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Chip
                      label={riskAssessment.drought_risk}
                      color={getRiskColor(riskAssessment.drought_risk)}
                      size="medium"
                      sx={{ fontSize: '1.1rem', px: 2 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    24h Min Prediction: {riskAssessment.predicted_min_24h?.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  💧 Recent Rainfall (24h)
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {riskAssessment.recent_rainfall_24h.toFixed(1)} mm
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Level Trend
                </Typography>
                <Typography variant="h5" fontWeight={600} color={riskAssessment.level_trend > 0 ? 'success.main' : 'error.main'}>
                  {riskAssessment.level_trend > 0 ? '↑' : '↓'} {Math.abs(riskAssessment.level_trend).toFixed(2)}%
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  🎯 Current Level
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {riskAssessment.current_water_level.toFixed(1)}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {riskAssessment.alerts && riskAssessment.alerts.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                ⚠️ Active Alerts
              </Typography>
              {riskAssessment.alerts.map((alert, idx) => (
                <Alert key={idx} severity={alert.includes('WARNING') ? 'error' : 'warning'} sx={{ mb: 1 }}>
                  {alert}
                </Alert>
              ))}
            </Paper>
          )}
        </>
      )}

      {/* Tab 2: Model Comparison */}
      {tabValue === 2 && modelComparison && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🏆 Best Model: {modelComparison.best_model}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ranked by RMSE (Root Mean Square Error)
            </Typography>
          </Paper>

          <Grid container spacing={3}>
            {modelComparison.models.map((model, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        {model.name}
                      </Typography>
                      <Chip
                        label={`#${model.rank}`}
                        color={model.rank === 1 ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">RMSE</Typography>
                      <Typography variant="h6">{model.metrics.rmse.toFixed(4)}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">MAE</Typography>
                      <Typography variant="h6">{model.metrics.mae.toFixed(4)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">R² Score</Typography>
                      <Typography variant="h6">{(model.metrics.r2 * 100).toFixed(2)}%</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {modelComparisonChartData && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                📊 Model Performance Comparison
              </Typography>
              <Box sx={{ height: 400 }}>
                <Bar
                  data={modelComparisonChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' as const },
                      title: {
                        display: true,
                        text: 'Model Metrics Comparison'
                      }
                    }
                  }}
                />
              </Box>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}

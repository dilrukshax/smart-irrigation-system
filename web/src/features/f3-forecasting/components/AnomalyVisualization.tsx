import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  BubbleChart as AnomalyIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import forecastingAPI, { AnomalyDetectionResponse } from '../../../api/forecasting';

interface AnomalyVisualizationProps {
  data?: number[];
  timestamps?: string[];
  onAnomalyDetected?: (anomalies: any[]) => void;
}

const AnomalyVisualization: React.FC<AnomalyVisualizationProps> = ({
  data: externalData,
  timestamps: externalTimestamps,
  onAnomalyDetected,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnomalyDetectionResponse | null>(null);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['z_score', 'iqr', 'isolation_forest']);
  const [showDetails, setShowDetails] = useState(false);
  const [useSimulatedData, setUseSimulatedData] = useState(true);

  // Generate simulated data for demo
  const generateSimulatedData = useCallback(() => {
    const data: number[] = [];
    const now = new Date();
    const timestamps: string[] = [];
    
    // Generate 168 hours (7 days) of water level data
    for (let i = 0; i < 168; i++) {
      const hour = i % 24;
      const day = Math.floor(i / 24);
      
      // Base pattern: daily cycle
      let value = 50 + 10 * Math.sin((hour - 6) * Math.PI / 12);
      
      // Weekly variation
      value += 5 * Math.sin(day * Math.PI / 3.5);
      
      // Random noise
      value += (Math.random() - 0.5) * 5;
      
      // Inject some anomalies
      if (i === 25 || i === 72 || i === 130) {
        value += 30; // Spike
      }
      if (i === 50 || i === 100) {
        value -= 25; // Drop
      }
      
      data.push(value);
      
      const timestamp = new Date(now.getTime() - (168 - i) * 60 * 60 * 1000);
      timestamps.push(timestamp.toISOString());
    }
    
    return { data, timestamps };
  }, []);

  const runAnomalyDetection = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: number[];
      let timestamps: string[] | undefined;
      
      if (externalData && externalData.length > 0) {
        data = externalData;
        timestamps = externalTimestamps;
      } else if (useSimulatedData) {
        const simulated = generateSimulatedData();
        data = simulated.data;
        timestamps = simulated.timestamps;
      } else {
        setError('No data provided for analysis');
        setLoading(false);
        return;
      }
      
      const result = await forecastingAPI.detectAnomalies(
        data,
        timestamps,
        selectedMethods,
        sensitivity
      );
      
      setResults(result);
      
      if (onAnomalyDetected && result.consensus_anomalies) {
        onAnomalyDetected(result.consensus_anomalies);
      }
    } catch (err: any) {
      console.error('Anomaly detection error:', err);
      setError(err.message || 'Failed to detect anomalies');
    } finally {
      setLoading(false);
    }
  }, [externalData, externalTimestamps, useSimulatedData, selectedMethods, sensitivity, generateSimulatedData, onAnomalyDetected]);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'HIGH':
        return <WarningIcon sx={{ color: theme.palette.error.light }} />;
      case 'MEDIUM':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case 'LOW':
        return <InfoIcon sx={{ color: theme.palette.info.main }} />;
      default:
        return <CheckIcon sx={{ color: theme.palette.success.main }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return theme.palette.error.main;
      case 'HIGH': return theme.palette.error.light;
      case 'MEDIUM': return theme.palette.warning.main;
      case 'LOW': return theme.palette.info.main;
      default: return theme.palette.success.main;
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!results) return [];
    
    let data: number[];
    let timestamps: string[] | undefined;
    
    if (externalData && externalData.length > 0) {
      data = externalData;
      timestamps = externalTimestamps;
    } else {
      const simulated = generateSimulatedData();
      data = simulated.data;
      timestamps = simulated.timestamps;
    }
    
    const anomalyIndices = new Set(results.consensus_anomalies.map(a => a.index));
    
    return data.map((value, index) => ({
      index,
      value,
      timestamp: timestamps?.[index] ? new Date(timestamps[index]).toLocaleString() : `Point ${index}`,
      isAnomaly: anomalyIndices.has(index),
      anomalyInfo: results.consensus_anomalies.find(a => a.index === index),
    }));
  };

  const chartData = prepareChartData();
  const mean = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length : 0;
  const std = chartData.length > 0 
    ? Math.sqrt(chartData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / chartData.length)
    : 0;

  const methodLabels: Record<string, string> = {
    'z_score': 'Z-Score',
    'iqr': 'IQR',
    'isolation_forest': 'Isolation Forest',
    'moving_average': 'Moving Average',
    'seasonal': 'Seasonal',
    'rate_of_change': 'Rate of Change',
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          <AnomalyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Anomaly Detection
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {!externalData && (
            <FormControlLabel
              control={
                <Switch
                  checked={useSimulatedData}
                  onChange={(e) => setUseSimulatedData(e.target.checked)}
                />
              }
              label="Use Demo Data"
            />
          )}
          <Button
            variant="contained"
            onClick={runAnomalyDetection}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
          >
            {loading ? 'Analyzing...' : 'Run Detection'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Controls Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Detection Settings
              </Typography>

              <Box mb={3}>
                <Typography gutterBottom>
                  Sensitivity: {sensitivity.toFixed(1)}
                </Typography>
                <Slider
                  value={sensitivity}
                  onChange={(_, value) => setSensitivity(value as number)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: 'Low' },
                    { value: 1, label: 'Normal' },
                    { value: 2, label: 'High' },
                  ]}
                />
                <Typography variant="caption" color="text.secondary">
                  Higher sensitivity detects more anomalies
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Detection Methods</InputLabel>
                <Select
                  multiple
                  value={selectedMethods}
                  onChange={(e) => setSelectedMethods(e.target.value as string[])}
                  label="Detection Methods"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={methodLabels[value]} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {Object.entries(methodLabels).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              {results && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Detection Summary
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Typography variant="body2">
                      Data Points: <strong>{results.data_length}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Methods Used: <strong>{results.methods_used.length}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Consensus Anomalies: <strong>{results.consensus_count}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Detection Rate: <strong>{(results.summary.detection_rate * 100).toFixed(1)}%</strong>
                    </Typography>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Chart Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Time Series with Anomalies
              </Typography>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="index" 
                      tickFormatter={(value) => `${value}`}
                      label={{ value: 'Time Index', position: 'bottom' }}
                    />
                    <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip
                      content={(props: any) => {
                        const { active, payload } = props;
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1.5 }}>
                              <Typography variant="body2">
                                <strong>Index:</strong> {data.index}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Value:</strong> {data.value.toFixed(2)}
                              </Typography>
                              {data.isAnomaly && (
                                <Typography variant="body2" color="error">
                                  <strong>ANOMALY</strong> - Detected by {data.anomalyInfo?.detection_methods?.join(', ')}
                                </Typography>
                              )}
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={mean} stroke="#666" strokeDasharray="3 3" label="Mean" />
                    <ReferenceLine y={mean + 2 * std} stroke="#ff9800" strokeDasharray="3 3" label="+2σ" />
                    <ReferenceLine y={mean - 2 * std} stroke="#ff9800" strokeDasharray="3 3" label="-2σ" />
                    
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={theme.palette.primary.main}
                      dot={false}
                      name="Value"
                    />
                    
                    <Scatter
                      dataKey="value"
                      name="Anomalies"
                      shape={(props: any): React.ReactElement => {
                        const { cx, cy, payload } = props;
                        if (payload.isAnomaly) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={8}
                              fill={getSeverityColor(payload.anomalyInfo?.severity || 'medium')}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          );
                        }
                        // Return an invisible element for non-anomaly points
                        return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={350}>
                  <Typography color="text.secondary">
                    Run detection to see anomaly visualization
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly List */}
        {results && results.consensus_anomalies.length > 0 && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight="bold">
                    Detected Anomalies ({results.consensus_anomalies.length})
                  </Typography>
                  <IconButton onClick={() => setShowDetails(!showDetails)}>
                    {showDetails ? <CollapseIcon /> : <ExpandIcon />}
                  </IconButton>
                </Box>

                <Collapse in={showDetails}>
                  <List>
                    {results.consensus_anomalies.slice(0, 20).map((anomaly, index) => (
                      <ListItem key={index} divider>
                        <ListItemIcon>
                          {getSeverityIcon(anomaly.severity)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2">
                                Index {anomaly.index}
                              </Typography>
                              <Chip
                                label={anomaly.severity}
                                size="small"
                                sx={{ 
                                  bgcolor: getSeverityColor(anomaly.severity),
                                  color: 'white'
                                }}
                              />
                              <Chip
                                label={`Confidence: ${(anomaly.confidence * 100).toFixed(0)}%`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary">
                                Value: {anomaly.value.toFixed(2)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Detected by: {anomaly.detection_methods.map(m => methodLabels[m] || m).join(', ')}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  {results.consensus_anomalies.length > 20 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                      Showing 20 of {results.consensus_anomalies.length} anomalies
                    </Typography>
                  )}
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Method-specific results */}
        {results && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Results by Detection Method
                </Typography>

                <Grid container spacing={2}>
                  {Object.entries(results.total_anomalies_per_method).map(([method, count]: [string, number]) => (
                    <Grid item xs={6} sm={4} md={2} key={method}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="primary">
                          {count}
                        </Typography>
                        <Typography variant="caption">
                          {methodLabels[method] || method}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AnomalyVisualization;

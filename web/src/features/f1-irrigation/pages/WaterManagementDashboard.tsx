import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Water,
  Speed,
  Cloud,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Info,
  Waves,
  Opacity,
  WaterDrop,
} from '@mui/icons-material';
import { waterManagementApi } from '../../../api/f1-irrigation.api';
import type {
  WaterManagementRecommendation,
  ReservoirData,
  ManualOverrideStatus,
  WaterManagementStatus,
  ModelInfo,
} from '../types';

// Status color mapping
const getStatusColor = (
  status: string
): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'HIGH':
      return 'warning';
    case 'NORMAL':
      return 'success';
    case 'LOW':
      return 'warning';
    case 'CRITICAL':
      return 'error';
    default:
      return 'info';
  }
};

const getPriorityColor = (
  priority: string
): 'success' | 'warning' | 'error' | 'info' => {
  switch (priority) {
    case 'low':
      return 'success';
    case 'medium':
      return 'info';
    case 'high':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'info';
  }
};

const getActionColor = (
  action: string
): 'success' | 'warning' | 'error' | 'info' => {
  switch (action) {
    case 'OPEN':
      return 'success';
    case 'CLOSE':
      return 'info';
    case 'HOLD':
      return 'warning';
    case 'EMERGENCY_RELEASE':
      return 'error';
    default:
      return 'info';
  }
};

export default function WaterManagementDashboard() {
  // State
  const [recommendation, setRecommendation] =
    useState<WaterManagementRecommendation | null>(null);
  const [reservoirData, setReservoirData] = useState<ReservoirData | null>(
    null
  );
  const [serviceStatus, setServiceStatus] =
    useState<WaterManagementStatus | null>(null);
  const [overrideStatus, setOverrideStatus] =
    useState<ManualOverrideStatus | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dialog states
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Override form state
  const [overrideAction, setOverrideAction] = useState<string>('OPEN');
  const [overridePosition, setOverridePosition] = useState<number>(50);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, recommendRes, overrideRes] = await Promise.all([
        waterManagementApi.getStatus(),
        waterManagementApi.getAutoRecommendation(),
        waterManagementApi.getManualOverrideStatus(),
      ]);

      setServiceStatus(statusRes.data);
      setRecommendation(recommendRes.data);
      setReservoirData({
        water_level_mmsl: recommendRes.data.reservoir_status.level_mmsl,
        total_storage_mcm: recommendRes.data.reservoir_status.total_storage_mcm,
        active_storage_mcm:
          recommendRes.data.reservoir_status.active_storage_mcm,
        inflow_mcm: recommendRes.data.input_data.inflow_mcm || 0,
        rain_mm: recommendRes.data.input_data.rain_mm || 0,
        main_canals_mcm: recommendRes.data.input_data.main_canals_mcm || 0,
        lb_main_canal_mcm: 0,
        rb_main_canal_mcm: 0,
      });
      setOverrideStatus(overrideRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to fetch water management data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch model info
  const fetchModelInfo = async () => {
    try {
      const res = await waterManagementApi.getModelInfo();
      setModelInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch model info:', err);
    }
  };

  // Auto refresh
  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  // Handle manual override
  const handleSetOverride = async () => {
    try {
      await waterManagementApi.setManualOverride({
        action: overrideAction as
          | 'OPEN'
          | 'CLOSE'
          | 'HOLD'
          | 'EMERGENCY_RELEASE',
        valve_position: overridePosition,
        reason: overrideReason,
      });
      setOverrideDialogOpen(false);
      setOverrideReason('');
      fetchData();
    } catch (err) {
      console.error('Failed to set override:', err);
      setError('Failed to set manual override.');
    }
  };

  // Handle cancel override
  const handleCancelOverride = async () => {
    try {
      await waterManagementApi.cancelManualOverride();
      fetchData();
    } catch (err) {
      console.error('Failed to cancel override:', err);
      setError('Failed to cancel manual override.');
    }
  };

  // Open model info dialog
  const handleOpenModelInfo = () => {
    fetchModelInfo();
    setInfoDialogOpen(true);
  };

  if (loading && !recommendation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            <Water sx={{ mr: 1, verticalAlign: 'middle' }} />
            Smart Water Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ML-powered irrigation water release prediction and control
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Model Information">
            <IconButton onClick={handleOpenModelInfo}>
              <Info />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Chip
            label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
          />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Manual Override Alert */}
      {overrideStatus?.override_active && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleCancelOverride}>
              Cancel Override
            </Button>
          }
        >
          <AlertTitle>Manual Override Active</AlertTitle>
          Current action: <strong>{overrideStatus.current_action}</strong> |
          Valve position: <strong>{overrideStatus.valve_position}%</strong>
        </Alert>
      )}

      {/* Reservoir Status Alert */}
      {recommendation?.reservoir_status.alert && (
        <Alert
          severity={
            recommendation.reservoir_status.status === 'CRITICAL'
              ? 'error'
              : 'warning'
          }
          sx={{ mb: 3 }}
        >
          <AlertTitle>Reservoir Alert</AlertTitle>
          {recommendation.reservoir_status.alert}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Reservoir Status Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Waves sx={{ mr: 1, verticalAlign: 'middle' }} />
                Reservoir Status
              </Typography>
              <Divider sx={{ my: 2 }} />

              {recommendation && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Water Level
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {recommendation.reservoir_status.level_mmsl.toFixed(1)}{' '}
                        mMSL
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(
                        100,
                        (recommendation.reservoir_status.level_mmsl / 100) * 100
                      )}
                      color={getStatusColor(
                        recommendation.reservoir_status.status
                      )}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Storage Capacity
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {recommendation.reservoir_status.storage_percentage.toFixed(
                          1
                        )}
                        %
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        recommendation.reservoir_status.storage_percentage
                      }
                      color={getStatusColor(
                        recommendation.reservoir_status.status
                      )}
                    />
                  </Box>

                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={recommendation.reservoir_status.status}
                      color={getStatusColor(
                        recommendation.reservoir_status.status
                      )}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary" paragraph>
                    Active Storage:{' '}
                    {recommendation.reservoir_status.active_storage_mcm.toFixed(
                      2
                    )}{' '}
                    MCM
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Capacity:{' '}
                    {recommendation.reservoir_status.total_storage_mcm.toFixed(
                      2
                    )}{' '}
                    MCM
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ML Prediction Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                ML Prediction
              </Typography>
              <Divider sx={{ my: 2 }} />

              {recommendation && (
                <>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h3" color="primary" fontWeight={700}>
                      {recommendation.prediction.predicted_release_mcm.toFixed(
                        3
                      )}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      MCM predicted release (next day)
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Confidence
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {(recommendation.prediction.confidence * 100).toFixed(
                          0
                        )}
                        %
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={recommendation.prediction.confidence * 100}
                      color="primary"
                    />
                  </Box>

                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Model
                    </Typography>
                    <Chip
                      label={recommendation.prediction.model_used}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Control Decision Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                Control Decision
              </Typography>
              <Divider sx={{ my: 2 }} />

              {recommendation && (
                <>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Chip
                      icon={
                        recommendation.decision.action === 'OPEN' ? (
                          <PlayArrow />
                        ) : recommendation.decision.action ===
                          'EMERGENCY_RELEASE' ? (
                          <Warning />
                        ) : (
                          <Stop />
                        )
                      }
                      label={recommendation.decision.action}
                      color={getActionColor(recommendation.decision.action)}
                      sx={{ fontSize: '1.2rem', py: 3, px: 2 }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Valve Position
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {recommendation.decision.valve_position}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={recommendation.decision.valve_position}
                      color={getActionColor(recommendation.decision.action)}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Priority
                    </Typography>
                    <Chip
                      label={recommendation.decision.priority.toUpperCase()}
                      color={getPriorityColor(recommendation.decision.priority)}
                      size="small"
                    />
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{ p: 1.5, bgcolor: 'grey.50' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {recommendation.decision.reason}
                    </Typography>
                  </Paper>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Input Data Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Cloud sx={{ mr: 1, verticalAlign: 'middle' }} />
                Current Conditions
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Opacity color="primary" />
                    <Typography variant="h5" fontWeight={600}>
                      {recommendation?.input_data.inflow_mcm?.toFixed(3) ||
                        '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inflow (MCM)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Cloud color="info" />
                    <Typography variant="h5" fontWeight={600}>
                      {recommendation?.input_data.rain_mm?.toFixed(1) || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rainfall (mm)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <WaterDrop color="success" />
                    <Typography variant="h5" fontWeight={600}>
                      {recommendation?.input_data.main_canals_mcm?.toFixed(3) ||
                        '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Canal Release (MCM)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Speed color="warning" />
                    <Typography variant="h5" fontWeight={600}>
                      {recommendation?.input_data.evap_mm?.toFixed(2) || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Evaporation (mm)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Manual Control Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Manual Control
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                Override the automatic ML-based control with manual commands.
                Use with caution.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrow />}
                  onClick={() => {
                    setOverrideAction('OPEN');
                    setOverridePosition(75);
                    setOverrideDialogOpen(true);
                  }}
                  disabled={overrideStatus?.override_active}
                >
                  Open Valves
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={() => {
                    setOverrideAction('CLOSE');
                    setOverridePosition(0);
                    setOverrideDialogOpen(true);
                  }}
                  disabled={overrideStatus?.override_active}
                >
                  Close Valves
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Warning />}
                  onClick={() => {
                    setOverrideAction('EMERGENCY_RELEASE');
                    setOverridePosition(100);
                    setOverrideDialogOpen(true);
                  }}
                  disabled={overrideStatus?.override_active}
                >
                  Emergency Release
                </Button>
              </Box>

              {overrideStatus?.override_active && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancelOverride}
                    fullWidth
                  >
                    Cancel Manual Override
                  </Button>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Service Status
                </Typography>
                <Chip
                  icon={
                    serviceStatus?.model_ready ? (
                      <CheckCircle />
                    ) : (
                      <Error />
                    )
                  }
                  label={serviceStatus?.model_ready ? 'Ready' : 'Not Ready'}
                  color={serviceStatus?.model_ready ? 'success' : 'error'}
                  size="small"
                />
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                Last updated:{' '}
                {recommendation
                  ? new Date(recommendation.timestamp).toLocaleString()
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Override Dialog */}
      <Dialog
        open={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set Manual Override</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={overrideAction}
                label="Action"
                onChange={(e) => setOverrideAction(e.target.value as string)}
              >
                <MenuItem value="OPEN">OPEN - Start water release</MenuItem>
                <MenuItem value="CLOSE">CLOSE - Stop water release</MenuItem>
                <MenuItem value="HOLD">HOLD - Maintain current state</MenuItem>
                <MenuItem value="EMERGENCY_RELEASE">
                  EMERGENCY RELEASE - Maximum release
                </MenuItem>
              </Select>
            </FormControl>

            <Typography gutterBottom>
              Valve Position: {overridePosition}%
            </Typography>
            <Slider
              value={overridePosition}
              onChange={(_event: Event, value: number | number[]) => setOverridePosition(value as number)}
              min={0}
              max={100}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Reason for Override"
              value={overrideReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverrideReason(e.target.value)}
              multiline
              rows={2}
              required
              helperText="Please provide a reason for the manual override (required for audit)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSetOverride}
            variant="contained"
            disabled={!overrideReason.trim()}
          >
            Apply Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* Model Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>ML Model Information</DialogTitle>
        <DialogContent>
          {modelInfo ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Model Type
              </Typography>
              <Typography paragraph>{modelInfo.model_type}</Typography>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Training Data
              </Typography>
              <Typography paragraph>{modelInfo.training_data}</Typography>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Target Variable
              </Typography>
              <Typography paragraph>{modelInfo.target}</Typography>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Input Features
              </Typography>
              <Box sx={{ mb: 2 }}>
                {modelInfo.features.map((feature: string, idx: number) => (
                  <Chip
                    key={idx}
                    label={feature}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                    variant="outlined"
                  />
                ))}
              </Box>

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Training Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {modelInfo.metrics.mae?.toFixed(4) || 'N/A'}
                    </Typography>
                    <Typography variant="caption">MAE</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {modelInfo.metrics.rmse?.toFixed(4) || 'N/A'}
                    </Typography>
                    <Typography variant="caption">RMSE</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">
                      {modelInfo.metrics.r2?.toFixed(4) || 'N/A'}
                    </Typography>
                    <Typography variant="caption">R²</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

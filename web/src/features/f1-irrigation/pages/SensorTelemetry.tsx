/**
 * Sensor Telemetry Page
 *
 * Displays live and historical telemetry data from ESP32 IoT sensors.
 * Features:
 * - Device selector dropdown
 * - Live telemetry cards with auto-refresh
 * - Historical data chart and table
 * - Device command controls
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Sensors as SensorsIcon,
  WaterDrop as WaterIcon,
  Opacity as MoistureIcon,
  SignalCellularAlt as SignalIcon,
  BatteryFull as BatteryIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { iotApi, TelemetryReading, DeviceInfo } from '@/api/f1-iot.api';

// Color constants
const COLORS = {
  soilMoisture: '#4caf50',
  waterLevel: '#2196f3',
  warning: '#ff9800',
  error: '#f44336',
  success: '#4caf50',
};

// Helper to format timestamp — treats the ISO string as UTC since the server stores UTC
function formatTimestamp(ts: string): string {
  // Append 'Z' if not already timezone-qualified so the browser treats it as UTC
  const normalized = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  return new Date(normalized).toLocaleString();
}

// Helper to format time for chart
function formatChartTime(ts: string): string {
  const normalized = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const date = new Date(normalized);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Returns true if the ISO timestamp string is within the last `seconds` seconds
function isRecentTimestamp(ts: string | undefined | null, seconds = 120): boolean {
  if (!ts) return false;
  const normalized = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = (Date.now() - new Date(normalized).getTime()) / 1000;
  return Math.abs(diff) <= seconds;
}

// Status chip based on value
function getStatusColor(
  value: number,
  thresholds: { low: number; high: number }
): 'success' | 'warning' | 'error' {
  if (value < thresholds.low) return 'error';
  if (value < thresholds.high) return 'warning';
  return 'success';
}

export default function SensorTelemetry() {
  // State
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [samplingInterval, setSamplingInterval] = useState<number>(60000);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch devices list
  const {
    data: devicesData,
    isLoading: loadingDevices,
    error: devicesError,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['iot-devices'],
    queryFn: () => iotApi.getDevices(),
    refetchInterval: 5000, // Refresh device list every 5 seconds for responsive online/offline
  });

  // Fetch latest reading with auto-refresh (every 3 seconds)
  const {
    data: latestData,
    isLoading: loadingLatest,
    error: latestError,
  } = useQuery({
    queryKey: ['iot-latest', selectedDevice],
    queryFn: () => iotApi.getLatest(selectedDevice),
    enabled: !!selectedDevice,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const latestReading = latestData?.data;

  // Fetch historical data
  const {
    data: historyData,
    isLoading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['iot-history', selectedDevice, dateFrom, dateTo],
    queryFn: () => iotApi.getRange(selectedDevice, dateFrom || undefined, dateTo || undefined, 100),
    enabled: !!selectedDevice,
  });

  const historyReadings = historyData?.data?.readings || [];

  // Derive devices array from query result
  const devices: DeviceInfo[] = devicesData?.data?.devices || [];

  // Send command mutation
  const sendCommandMutation = useMutation({
    mutationFn: ({
      deviceId,
      command,
    }: {
      deviceId: string;
      command: { type: 'set_interval_ms'; value: number };
    }) => iotApi.sendCommand(deviceId, command),
    onSuccess: (response) => {
      setSnackbar({
        open: true,
        message: `Command sent successfully: ${response.data.message}`,
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Failed to send command: ${error.message}`,
        severity: 'error',
      });
    },
  });

  // Handle send command
  const handleSendCommand = () => {
    if (!selectedDevice || !samplingInterval) return;

    sendCommandMutation.mutate({
      deviceId: selectedDevice,
      command: {
        type: 'set_interval_ms',
        value: samplingInterval,
      },
    });
  };

  // Handle load history
  const handleLoadHistory = () => {
    refetchHistory();
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return historyReadings
      .slice()
      .reverse()
      .map((reading: TelemetryReading) => ({
        time: formatChartTime(reading.timestamp),
        fullTime: reading.timestamp,
        soilMoisture: reading.soil_moisture_pct,
        waterLevel: reading.water_level_pct,
        waterLevelCm: reading.water_level_cm ?? 0,
        soilAo: reading.soil_ao,
        waterAo: reading.water_ao,
      }));
  }, [historyReadings]);

  // Loading state
  const isLoading = loadingDevices;

  // Error state
  const hasError = devicesError || latestError;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            <SensorsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Sensor Telemetry
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time monitoring of ESP32 IoT sensors
          </Typography>
        </Box>
        <Tooltip title="Refresh devices">
          <IconButton onClick={() => refetchDevices()} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(devicesError as any)?.message || (latestError as any)?.message || 'Failed to load data'}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      )}

      {/* No Devices State */}
      {!isLoading && devices.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SensorsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Devices Connected
          </Typography>
          <Typography color="text.secondary">
            No IoT devices have sent telemetry data yet. Make sure your ESP32 devices are configured
            and connected to the MQTT broker.
          </Typography>
        </Paper>
      )}

      {/* Main Content */}
      {!isLoading && devices.length > 0 && (
        <Grid container spacing={3}>
          {/* Device Selector */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel id="device-select-label">Select Device</InputLabel>
                <Select
                  labelId="device-select-label"
                  value={selectedDevice}
                  label="Select Device"
                  onChange={(e) => setSelectedDevice(e.target.value)}
                >
                  {devices.map((device: DeviceInfo) => {
                    // A device is considered online only if both the backend flag is
                    // set AND the latest reading timestamp is recent (< 2 minutes old).
                    const latestTs = device.latest_reading?.timestamp;
                    const actuallyOnline = device.is_online && isRecentTimestamp(latestTs, 120);
                    return (
                      <MenuItem key={device.device_id} value={device.device_id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            size="small"
                            label={actuallyOnline ? 'Online' : 'Offline'}
                            color={actuallyOnline ? 'success' : 'default'}
                          />
                          {device.device_id}
                          {latestTs && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({formatTimestamp(latestTs)})
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Paper>
          </Grid>

          {/* Live Telemetry Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingIcon sx={{ mr: 1 }} />
              Live Readings
              {loadingLatest && <CircularProgress size={16} sx={{ ml: 2 }} />}
            </Typography>
          </Grid>

          {latestReading ? (
            <>
              {/* ── Soil Moisture Card ─────────────────────────────────── */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderTop: `4px solid ${COLORS.soilMoisture}` }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                        SOIL MOISTURE
                      </Typography>
                      <MoistureIcon sx={{ color: COLORS.soilMoisture }} />
                    </Box>

                    {/* Big percentage */}
                    <Typography
                      variant="h2"
                      fontWeight={700}
                      color={COLORS.soilMoisture}
                      lineHeight={1}
                    >
                      {latestReading.soil_moisture_pct.toFixed(1)}%
                    </Typography>

                    <LinearProgress
                      variant="determinate"
                      value={latestReading.soil_moisture_pct}
                      sx={{ my: 1, height: 10, borderRadius: 5 }}
                      color={
                        getStatusColor(latestReading.soil_moisture_pct, {
                          low: 30,
                          high: 70,
                        }) as any
                      }
                    />

                    <Chip
                      label={(latestReading.soil_status ?? 'unknown').toUpperCase()}
                      size="small"
                      color={
                        getStatusColor(latestReading.soil_moisture_pct, {
                          low: 30,
                          high: 70,
                        }) as any
                      }
                      sx={{ mb: 1 }}
                    />

                    <Typography variant="caption" color="text.secondary" display="block">
                      Probe depth: {(latestReading.soil_probe_depth_cm ?? 5.0).toFixed(1)} cm zone
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Raw ADC: {latestReading.soil_ao}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* ── Water Level Card ───────────────────────────────────── */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderTop: `4px solid ${COLORS.waterLevel}` }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                        WATER LEVEL
                      </Typography>
                      <WaterIcon sx={{ color: COLORS.waterLevel }} />
                    </Box>

                    {/* Physical cm — primary value: e.g. 1.92 cm / 4.0 cm */}
                    <Box
                      sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }}
                    >
                      <Typography
                        variant="h2"
                        fontWeight={700}
                        color={COLORS.waterLevel}
                        lineHeight={1}
                      >
                        {(latestReading.water_level_cm ?? 0).toFixed(2)}
                      </Typography>
                      <Typography variant="h5" color="text.secondary" fontWeight={400}>
                        / {(latestReading.water_sensor_height_cm ?? 4.0).toFixed(1)} cm
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={latestReading.water_level_pct}
                      sx={{ my: 1, height: 10, borderRadius: 5 }}
                      color={
                        getStatusColor(latestReading.water_level_pct, { low: 20, high: 50 }) as any
                      }
                    />

                    <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${latestReading.water_level_pct.toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                        color={
                          getStatusColor(latestReading.water_level_pct, {
                            low: 20,
                            high: 50,
                          }) as any
                        }
                      />
                      <Chip
                        label={(latestReading.water_status ?? 'unknown').toUpperCase()}
                        size="small"
                        color={
                          getStatusColor(latestReading.water_level_pct, {
                            low: 20,
                            high: 50,
                          }) as any
                        }
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" display="block">
                      Sensor height: {(latestReading.water_sensor_height_cm ?? 4.0).toFixed(1)} cm
                      total
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Raw ADC: {latestReading.water_ao}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* ── WiFi Signal Card ───────────────────────────────────── */}
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                        WiFi SIGNAL
                      </Typography>
                      <SignalIcon color="primary" />
                    </Box>
                    <Typography variant="h3" fontWeight={600}>
                      {latestReading.rssi ?? '--'} dBm
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {latestReading.rssi && latestReading.rssi > -50
                        ? '🟢 Excellent'
                        : latestReading.rssi && latestReading.rssi > -70
                          ? '🟡 Good'
                          : latestReading.rssi
                            ? '🔴 Weak'
                            : 'N/A'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      Updated: {formatTimestamp(latestReading.timestamp)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* ── Summary Card ──────────────────────────────────────── */}
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                        SENSOR SUMMARY
                      </Typography>
                      <BatteryIcon color="success" />
                    </Box>
                    <Stack spacing={0.8}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Soil:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {latestReading.soil_moisture_pct.toFixed(1)}% —{' '}
                          {latestReading.soil_status ?? '?'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Water:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {(latestReading.water_level_cm ?? 0).toFixed(2)} /{' '}
                          {(latestReading.water_sensor_height_cm ?? 4.0).toFixed(1)} cm —{' '}
                          {latestReading.water_status ?? '?'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Device:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {latestReading.device_id}
                        </Typography>
                      </Box>
                      {latestReading.battery_v != null && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Battery:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {latestReading.battery_v.toFixed(2)} V
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">
                {loadingLatest
                  ? 'Loading latest reading...'
                  : 'No readings available for this device'}
              </Alert>
            </Grid>
          )}

          {/* Historical Data Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1 }} />
              Historical Data
            </Typography>
          </Grid>

          {/* Date Range Picker */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="From"
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="To"
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
                <Button
                  variant="contained"
                  onClick={handleLoadHistory}
                  disabled={loadingHistory}
                  startIcon={loadingHistory ? <CircularProgress size={16} /> : <RefreshIcon />}
                >
                  Load History
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* History Error */}
          {historyError && (
            <Grid item xs={12}>
              <Alert severity="error">
                Failed to load historical data: {(historyError as any)?.message}
              </Alert>
            </Grid>
          )}

          {/* Historical Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Sensor Trends
              </Typography>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="pct" domain={[0, 100]} unit="%" />
                    <YAxis yAxisId="cm" orientation="right" domain={[0, 4]} unit=" cm" />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Water Level (cm)') return [`${value.toFixed(2)} cm`, name];
                        return [`${value.toFixed(1)}%`, name];
                      }}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Legend />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="soilMoisture"
                      name="Soil Moisture"
                      stroke={COLORS.soilMoisture}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="waterLevel"
                      name="Water Level (%)"
                      stroke={COLORS.waterLevel}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="cm"
                      type="monotone"
                      dataKey="waterLevelCm"
                      name="Water Level (cm)"
                      stroke="#1565c0"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No historical data available. Adjust the date range and click "Load History".
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Historical Data Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Recent Readings ({historyReadings.length})
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell align="right">Soil Moisture</TableCell>
                      <TableCell align="right">Water (cm)</TableCell>
                      <TableCell align="right">Water (%)</TableCell>
                      <TableCell align="right">Soil ADC</TableCell>
                      <TableCell align="right">Water ADC</TableCell>
                      <TableCell align="right">RSSI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyReadings
                      .slice(0, 50)
                      .map((reading: TelemetryReading, index: number) => (
                        <TableRow key={index} hover>
                          <TableCell>{formatTimestamp(reading.timestamp)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${reading.soil_moisture_pct.toFixed(1)}% (${reading.soil_status ?? '?'})`}
                              color={getStatusColor(reading.soil_moisture_pct, {
                                low: 30,
                                high: 70,
                              })}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color={COLORS.waterLevel}>
                              {(reading.water_level_cm ?? 0).toFixed(2)} /{' '}
                              {(reading.water_sensor_height_cm ?? 4.0).toFixed(1)} cm
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${reading.water_level_pct.toFixed(1)}% (${reading.water_status ?? '?'})`}
                              color={getStatusColor(reading.water_level_pct, { low: 20, high: 50 })}
                            />
                          </TableCell>
                          <TableCell align="right">{reading.soil_ao}</TableCell>
                          <TableCell align="right">{reading.water_ao}</TableCell>
                          <TableCell align="right">{reading.rssi ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    {historyReadings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 2 }}>
                            No readings to display
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Device Command Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ScheduleIcon sx={{ mr: 1 }} />
              Device Control
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Set Sampling Interval
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure how often the device sends telemetry data (in milliseconds).
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Interval (ms)"
                  type="number"
                  value={samplingInterval}
                  onChange={(e) => setSamplingInterval(parseInt(e.target.value) || 60000)}
                  size="small"
                  sx={{ width: 150 }}
                  inputProps={{ min: 1000, max: 3600000, step: 1000 }}
                />
                <Typography variant="body2" color="text.secondary">
                  = {(samplingInterval / 1000).toFixed(0)} seconds
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSendCommand}
                  disabled={sendCommandMutation.isPending || !selectedDevice}
                  startIcon={
                    sendCommandMutation.isPending ? <CircularProgress size={16} /> : <SendIcon />
                  }
                >
                  Apply
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Quick Presets */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Quick Presets
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[
                  { label: '10 sec', value: 10000 },
                  { label: '30 sec', value: 30000 },
                  { label: '1 min', value: 60000 },
                  { label: '5 min', value: 300000 },
                  { label: '15 min', value: 900000 },
                  { label: '1 hour', value: 3600000 },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={samplingInterval === preset.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setSamplingInterval(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  CircularProgress,
  Alert,
} from '@mui/material';
import { WaterDrop, Opacity, Water, ArrowForward, Agriculture, Sensors } from '@mui/icons-material';
import { ROUTES } from '../../../config/routes';
import { iotApi } from '@/api/f1-iot.api';

export default function IrrigationDashboard() {
  const navigate = useNavigate();

  const {
    data: devicesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['iot-devices'],
    queryFn: () => iotApi.getDevices(),
    refetchInterval: 5000,
  });

  const devices = devicesData?.data?.devices ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Irrigation Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time monitoring of field irrigation and sensor data
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Water />}
          endIcon={<ArrowForward />}
          onClick={() => navigate(ROUTES.IRRIGATION.WATER_MANAGEMENT)}
        >
          Smart Water Management
        </Button>
      </Box>

      {/* Quick Access Card for Water Management */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Water sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  ML-Powered Water Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Predict irrigation water releases using machine learning trained on Udawalawe
                  reservoir data (1994-2025)
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" onClick={() => navigate(ROUTES.IRRIGATION.WATER_MANAGEMENT)}>
              Open Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Access Card for Crop Field Management */}
      <Card sx={{ mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Agriculture sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  IoT Crop Field Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automatic valve control for rice fields based on real-time water level and soil
                  moisture sensors
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              color="success"
              onClick={() => navigate(ROUTES.IRRIGATION.CROP_FIELDS)}
            >
              Manage Fields
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Live ESP32 Sensor Cards */}
      <Typography
        variant="h6"
        fontWeight={600}
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Sensors color="primary" />
        Live ESP32 Sensors
        {isLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          IoT service unavailable — sensor cards will appear when the service is reachable.
        </Alert>
      )}

      {!isLoading && devices.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No ESP32 devices detected yet. Waiting for telemetry from <strong>esp32-01</strong>…
        </Alert>
      )}

      <Grid container spacing={3}>
        {devices.map((device) => {
          const r = device.latest_reading;
          const water = r?.water_level_pct ?? null;
          const soil = r?.soil_moisture_pct ?? null;
          const waterStatus =
            water === null ? 'Unknown' : water < 20 ? 'Low' : water < 70 ? 'Medium' : 'High';
          const soilStatus =
            soil === null
              ? 'Unknown'
              : soil < 30
                ? 'Dry'
                : soil < 60
                  ? 'Moderate'
                  : soil <= 80
                    ? 'Optimal'
                    : 'Wet';
          const chipColor = device.is_online ? 'success' : 'default';
          return (
            <Grid item xs={12} sm={6} md={4} key={device.device_id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{device.device_id}</Typography>
                    <Chip
                      label={device.is_online ? 'Online' : 'Offline'}
                      color={chipColor}
                      size="small"
                      icon={<Sensors />}
                    />
                  </Box>

                  {/* Water Level */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WaterDrop sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="body2">Water Level</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {water !== null ? `${water.toFixed(1)}%` : '—'}
                        </Typography>
                        <Chip
                          label={waterStatus}
                          size="small"
                          color={
                            waterStatus === 'Low'
                              ? 'error'
                              : waterStatus === 'Medium'
                                ? 'warning'
                                : waterStatus === 'High'
                                  ? 'success'
                                  : 'default'
                          }
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={water ?? 0}
                      color={
                        waterStatus === 'Low'
                          ? 'error'
                          : waterStatus === 'Medium'
                            ? 'warning'
                            : 'primary'
                      }
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* Soil Moisture */}
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Opacity sx={{ fontSize: 18, color: 'success.main' }} />
                        <Typography variant="body2">Soil Moisture</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {soil !== null ? `${soil.toFixed(1)}%` : '—'}
                        </Typography>
                        <Chip
                          label={soilStatus}
                          size="small"
                          color={
                            soilStatus === 'Dry'
                              ? 'error'
                              : soilStatus === 'Moderate'
                                ? 'warning'
                                : soilStatus === 'Optimal'
                                  ? 'success'
                                  : 'default'
                          }
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={soil ?? 0}
                      color={
                        soilStatus === 'Dry'
                          ? 'error'
                          : soilStatus === 'Moderate'
                            ? 'warning'
                            : 'success'
                      }
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {r && (
                    <Typography variant="caption" color="text.secondary">
                      Updated: {new Date(r.timestamp).toLocaleTimeString()}
                      {r.rssi !== undefined && r.rssi !== null && ` · WiFi: ${r.rssi} dBm`}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

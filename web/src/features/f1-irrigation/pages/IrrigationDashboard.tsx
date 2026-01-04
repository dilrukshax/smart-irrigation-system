import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Chip, Button } from '@mui/material';
import { WaterDrop, Thermostat, Opacity, Water, ArrowForward, Agriculture } from '@mui/icons-material';
import { ROUTES } from '../../../config/routes';

const mockSensors = [
  { id: 1, field: 'Field A1', moisture: 45, temp: 28, humidity: 65, status: 'OK' },
  { id: 2, field: 'Field A2', moisture: 32, temp: 30, humidity: 58, status: 'Low' },
  { id: 3, field: 'Field B1', moisture: 55, temp: 27, humidity: 70, status: 'OK' },
  { id: 4, field: 'Field B2', moisture: 28, temp: 31, humidity: 52, status: 'Critical' },
];

export default function IrrigationDashboard() {
  const navigate = useNavigate();

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
                  Predict irrigation water releases using machine learning trained on Udawalawe reservoir data (1994-2025)
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={() => navigate(ROUTES.IRRIGATION.WATER_MANAGEMENT)}
            >
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
                  Automatic valve control for rice fields based on real-time water level and soil moisture sensors
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

      <Grid container spacing={3}>
        {mockSensors.map((sensor) => (
          <Grid item xs={12} sm={6} md={3} key={sensor.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{sensor.field}</Typography>
                  <Chip
                    label={sensor.status}
                    color={
                      sensor.status === 'OK'
                        ? 'success'
                        : sensor.status === 'Low'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Opacity sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography>Moisture: {sensor.moisture}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Thermostat sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography>Temp: {sensor.temp}°C</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WaterDrop sx={{ mr: 1, color: 'info.main' }} />
                  <Typography>Humidity: {sensor.humidity}%</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

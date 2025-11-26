import { Box, Typography, Grid, Card, CardContent, Chip } from '@mui/material';
import { WaterDrop, Thermostat, Opacity } from '@mui/icons-material';

const mockSensors = [
  { id: 1, field: 'Field A1', moisture: 45, temp: 28, humidity: 65, status: 'OK' },
  { id: 2, field: 'Field A2', moisture: 32, temp: 30, humidity: 58, status: 'Low' },
  { id: 3, field: 'Field B1', moisture: 55, temp: 27, humidity: 70, status: 'OK' },
  { id: 4, field: 'Field B2', moisture: 28, temp: 31, humidity: 52, status: 'Critical' },
];

export default function IrrigationDashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Irrigation Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Real-time monitoring of field irrigation and sensor data
      </Typography>

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

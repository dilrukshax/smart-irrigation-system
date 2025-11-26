import { Box, Typography, Grid, Card, CardContent, Paper, Chip, LinearProgress } from '@mui/material';

const mockForecasts = [
  { metric: 'Rainfall (7-day)', value: '45 mm', trend: 'up', confidence: 85 },
  { metric: 'Reservoir Level', value: '72%', trend: 'stable', confidence: 90 },
  { metric: 'Canal Demand', value: '2.4 MCM/day', trend: 'up', confidence: 78 },
];

const mockAlerts = [
  { id: 1, type: 'warning', message: 'High rainfall expected in 3 days', time: '2 hours ago' },
  { id: 2, type: 'info', message: 'Reservoir level stable', time: '5 hours ago' },
];

export default function ForecastDashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Forecasting Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        ML-based time-series forecasts and early warning alerts
      </Typography>

      <Grid container spacing={3}>
        {mockForecasts.map((forecast, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {forecast.metric}
                </Typography>
                <Typography variant="h4" fontWeight={600} sx={{ my: 1 }}>
                  {forecast.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={forecast.trend}
                    size="small"
                    color={forecast.trend === 'up' ? 'warning' : 'success'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {forecast.confidence}% confidence
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              14-Day Forecast
            </Typography>
            <Box
              sx={{
                height: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary">Forecast chart placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Active Alerts
            </Typography>
            {mockAlerts.map((alert) => (
              <Box
                key={alert.id}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 1,
                  bgcolor: alert.type === 'warning' ? 'warning.light' : 'info.light',
                }}
              >
                <Typography variant="body2">{alert.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {alert.time}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Risk Indicators
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              Drought Risk
            </Typography>
            <LinearProgress variant="determinate" value={25} color="success" sx={{ height: 10, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">Low (25%)</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              Flood Risk
            </Typography>
            <LinearProgress variant="determinate" value={60} color="warning" sx={{ height: 10, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">Medium (60%)</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              Spill Risk
            </Typography>
            <LinearProgress variant="determinate" value={15} color="success" sx={{ height: 10, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">Low (15%)</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

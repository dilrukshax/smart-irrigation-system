import { Grid, Card, CardContent, Typography, Box, Paper } from '@mui/material';
import {
  WaterDrop as WaterIcon,
  Grass as CropIcon,
  ShowChart as ForecastIcon,
  Agriculture as OptimizeIcon,
} from '@mui/icons-material';

const summaryCards = [
  {
    title: 'Irrigation Status',
    value: '12 Active',
    description: 'Fields being irrigated',
    icon: <WaterIcon fontSize="large" />,
    color: '#1976d2',
  },
  {
    title: 'Crop Health',
    value: '89%',
    description: 'Fields healthy',
    icon: <CropIcon fontSize="large" />,
    color: '#2e7d32',
  },
  {
    title: 'Water Forecast',
    value: '75%',
    description: 'Reservoir capacity',
    icon: <ForecastIcon fontSize="large" />,
    color: '#ed6c02',
  },
  {
    title: 'Optimized Area',
    value: '450 ha',
    description: 'Under recommendation',
    icon: <OptimizeIcon fontSize="large" />,
    color: '#9c27b0',
  },
];

export default function Home() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome to the Smart Irrigation & Crop Optimization Platform
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${card.color}20`,
                      color: card.color,
                      mr: 2,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6" color="text.secondary">
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Water Usage Trends
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
              <Typography color="text.secondary">Chart placeholder</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No active alerts
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

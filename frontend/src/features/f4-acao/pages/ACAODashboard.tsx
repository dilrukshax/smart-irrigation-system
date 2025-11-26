import { Box, Typography, Grid, Card, CardContent, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@config/routes';

const summaryStats = [
  { label: 'Fields Analyzed', value: '24' },
  { label: 'Crops Evaluated', value: '8' },
  { label: 'Optimized Area', value: '450 ha' },
  { label: 'Expected Profit', value: 'Rs. 12.5M' },
];

export default function ACAODashboard() {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Crop & Area Optimization
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Adaptive crop recommendations and area allocation optimization
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryStats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.OPTIMIZATION.RECOMMENDATIONS)}
              >
                View Field Recommendations
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.OPTIMIZATION.PLANNER)}
              >
                Run Optimization Planner
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.OPTIMIZATION.SCENARIOS)}
              >
                Explore Scenarios
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Water Budget vs Quota
            </Typography>
            <Box
              sx={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
              }}
            >
              <Typography color="text.secondary">Water budget chart</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profit & Risk Overview
        </Typography>
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Typography color="text.secondary">Profit-risk scatter chart placeholder</Typography>
        </Box>
      </Paper>
    </Box>
  );
}

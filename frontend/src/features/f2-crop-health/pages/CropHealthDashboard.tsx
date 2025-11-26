import { Box, Typography, Grid, Card, CardContent, Paper } from '@mui/material';

const mockZones = [
  { id: 1, name: 'Zone A', ndvi: 0.72, health: 'Healthy', color: '#4caf50' },
  { id: 2, name: 'Zone B', ndvi: 0.58, health: 'Mild Stress', color: '#ff9800' },
  { id: 3, name: 'Zone C', ndvi: 0.45, health: 'Severe Stress', color: '#f44336' },
  { id: 4, name: 'Zone D', ndvi: 0.68, health: 'Healthy', color: '#4caf50' },
];

export default function CropHealthDashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Crop Health Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Satellite-based crop health monitoring and vegetation indices
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Health Status Map
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
              <Typography color="text.secondary">Map placeholder - Leaflet integration</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Zone Health Summary
          </Typography>
          {mockZones.map((zone) => (
            <Card key={zone.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {zone.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      NDVI: {zone.ndvi}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: `${zone.color}20`,
                      color: zone.color,
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {zone.health}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Grid>
      </Grid>
    </Box>
  );
}

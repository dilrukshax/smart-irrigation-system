import { Box, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import PublicSiteFrame from '@components/common/PublicSiteFrame';
import { useHomepageResearchData } from '@hooks/useHomepageResearchData';

const PIPELINE = [
  {
    step: 'F1 Data Capture',
    detail: 'Collect IoT telemetry: soil moisture, water level, inflow, and system status.',
  },
  {
    step: 'F2 Health Analysis',
    detail: 'Run NDVI/NDWI-based crop health analysis and zone-level classification.',
  },
  {
    step: 'F3 Forecasting',
    detail: 'Generate short-term water level predictions with uncertainty bounds and risk alerts.',
  },
  {
    step: 'F4 Optimization',
    detail: 'Compute crop recommendations, profitability, and quota-aware allocation plans.',
  },
];

export default function ResearchTopics() {
  const { data } = useHomepageResearchData();

  return (
    <PublicSiteFrame
      title="Research Topics"
      subtitle="Detailed methodology and progress across the four integrated research functions."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            End-to-End Methodology
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {PIPELINE.map((item) => (
              <Box key={item.step} sx={{ pl: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {item.step}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Live Topic Progress
          </Typography>
          <Box sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, bgcolor: 'white', p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Overall Progress
            </Typography>
            <LinearProgress variant="determinate" value={data?.overallProgress ?? 0} sx={{ height: 10, borderRadius: 999, mb: 2 }} />

            <Box sx={{ display: 'grid', gap: 1 }}>
              {data?.modules.map((module) => (
                <Box key={module.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {module.id}
                  </Typography>
                  <Chip label={module.ready ? 'Ready' : 'Pending'} size="small" color={module.ready ? 'success' : 'default'} />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </PublicSiteFrame>
  );
}

import { Box, Grid, Typography } from '@mui/material';
import PublicSiteFrame from '@components/common/PublicSiteFrame';

const TEAM = [
  {
    name: 'Hesara',
    role: 'F1 - IoT Smart Water Management',
    responsibility: 'IoT telemetry, irrigation control logic, field-level monitoring.',
  },
  {
    name: 'Abishek',
    role: 'F2 - Crop Health Monitoring',
    responsibility: 'Satellite analytics, zone classification, stress mapping.',
  },
  {
    name: 'Trishni',
    role: 'F3 - Forecasting and Alerting',
    responsibility: 'Time-series forecasting, uncertainty, risk alerts.',
  },
  {
    name: 'Dilruksha',
    role: 'F4 - ACA-O Optimization',
    responsibility: 'Adaptive recommendations, crop planning, cost-profit modeling.',
  },
];

export default function AboutUs() {
  return (
    <PublicSiteFrame
      title="About Us"
      subtitle="This research project integrates IoT, satellite analytics, forecasting, and optimization for smart irrigation planning."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Project Mission
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Build an end-to-end smart irrigation decision-support platform for quota-based agricultural schemes. The system supports
            field-level and scheme-level decisions by combining real-time data, machine learning, and optimization.
          </Typography>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            What We Built
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.2 }}>
            <Typography color="text.secondary">F1: IoT sensing and irrigation control recommendations.</Typography>
            <Typography color="text.secondary">F2: Satellite-based crop health and water stress detection.</Typography>
            <Typography color="text.secondary">F3: Multi-horizon forecasting and risk assessment.</Typography>
            <Typography color="text.secondary">F4: Adaptive crop and area optimization under water constraints.</Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            Research Context
          </Typography>
          <Box sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, bgcolor: 'white', p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
              Domain: Precision Agriculture
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
              Focus: Water allocation and crop planning
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
              Approach: IoT + ML + Optimization
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Type: 4th-year software engineering research project
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Typography variant="h5" fontWeight={800} sx={{ mt: 5, mb: 2 }}>
        Team Ownership
      </Typography>
      <Box sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, bgcolor: 'white' }}>
        {TEAM.map((member, index) => (
          <Box
            key={member.name}
            sx={{
              p: 2,
              borderBottom: index === TEAM.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              {member.name}
            </Typography>
            <Typography variant="body2" color="primary.main" sx={{ mb: 0.4 }}>
              {member.role}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.responsibility}
            </Typography>
          </Box>
        ))}
      </Box>
    </PublicSiteFrame>
  );
}

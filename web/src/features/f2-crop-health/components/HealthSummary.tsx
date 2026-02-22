/**
 * Health Summary Component
 * Displays summary statistics for health zones
 */

import { Box, Paper, Typography, Grid, LinearProgress } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as MildStressIcon,
  Error as SevereStressIcon,
  Terrain as AreaIcon,
} from '@mui/icons-material';
import type { ZoneSummary } from '../types';

interface HealthSummaryProps {
  summary: ZoneSummary | null;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}

function StatCard({ icon, label, value, color, subtext }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: '100%',
      }}
      elevation={1}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: color ? `${color}20` : 'grey.100',
          color: color || 'grey.600',
          display: 'flex',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {subtext && (
          <Typography variant="caption" color="text.secondary">
            {subtext}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function HealthSummary({ summary, isLoading = false }: HealthSummaryProps) {
  if (isLoading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Area Health Summary
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!summary) {
    return null;
  }

  const healthyPercent = summary.total_zones > 0 
    ? (summary.healthy_count / summary.total_zones) * 100 
    : 0;
  const mildStressPercent = summary.total_zones > 0 
    ? (summary.mild_stress_count / summary.total_zones) * 100 
    : 0;
  const severeStressPercent = summary.total_zones > 0 
    ? (summary.severe_stress_count / summary.total_zones) * 100 
    : 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Area Health Summary
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<HealthyIcon />}
            label="Healthy Zones"
            value={summary.healthy_count}
            color="#4caf50"
            subtext={`${healthyPercent.toFixed(0)}% of total`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<MildStressIcon />}
            label="Mild Stress"
            value={summary.mild_stress_count}
            color="#ff9800"
            subtext={`${mildStressPercent.toFixed(0)}% of total`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<SevereStressIcon />}
            label="Severe Stress"
            value={summary.severe_stress_count}
            color="#f44336"
            subtext={`${severeStressPercent.toFixed(0)}% of total`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<AreaIcon />}
            label="Total Area"
            value={`${summary.total_area_hectares.toFixed(0)} ha`}
            color="#2196f3"
            subtext={`${summary.total_zones} zones`}
          />
        </Grid>
      </Grid>

      {/* Health Distribution Bar */}
      <Paper sx={{ p: 2 }} elevation={1}>
        <Typography variant="subtitle2" gutterBottom>
          Health Distribution
        </Typography>
        <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden' }}>
          {healthyPercent > 0 && (
            <Box
              sx={{
                width: `${healthyPercent}%`,
                bgcolor: '#4caf50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {healthyPercent >= 15 && (
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                  {healthyPercent.toFixed(0)}%
                </Typography>
              )}
            </Box>
          )}
          {mildStressPercent > 0 && (
            <Box
              sx={{
                width: `${mildStressPercent}%`,
                bgcolor: '#ff9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mildStressPercent >= 15 && (
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                  {mildStressPercent.toFixed(0)}%
                </Typography>
              )}
            </Box>
          )}
          {severeStressPercent > 0 && (
            <Box
              sx={{
                width: `${severeStressPercent}%`,
                bgcolor: '#f44336',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {severeStressPercent >= 15 && (
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                  {severeStressPercent.toFixed(0)}%
                </Typography>
              )}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: 0.5 }} />
            <Typography variant="caption">Healthy</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: 0.5 }} />
            <Typography variant="caption">Mild Stress</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: 0.5 }} />
            <Typography variant="caption">Severe Stress</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Vegetation Indices */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }} elevation={1}>
          <Typography variant="caption" color="text.secondary">
            Average NDVI
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {summary.average_ndvi.toFixed(3)}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }} elevation={1}>
          <Typography variant="caption" color="text.secondary">
            Average NDWI
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {summary.average_ndwi.toFixed(3)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

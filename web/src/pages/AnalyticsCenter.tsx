import { Alert, Box, Grid, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PublicSiteFrame from '@components/common/PublicSiteFrame';
import { useHomepageResearchData } from '@hooks/useHomepageResearchData';

export default function AnalyticsCenter() {
  const { data, isError } = useHomepageResearchData();

  const healthDistribution = [
    { label: 'Healthy', value: data?.zoneSummary.healthy ?? 0 },
    { label: 'Mild Stress', value: data?.zoneSummary.mildStress ?? 0 },
    { label: 'Severe Stress', value: data?.zoneSummary.severeStress ?? 0 },
  ];

  return (
    <PublicSiteFrame
      title="Analytics"
      subtitle="Interactive live charts for telemetry, forecasting, crop-health distribution, and economics."
    >
      {isError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Some analytics feeds are unavailable. Showing available data only.
        </Alert>
      )}

      <Grid container spacing={2.4}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              F1 Telemetry Trend
            </Typography>
            {data?.charts.telemetry.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.charts.telemetry}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="soilMoisture" stroke="#4caf50" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="waterLevel" stroke="#2196f3" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No telemetry history available.</Alert>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              F3 Forecast Curve
            </Typography>
            {data?.charts.forecast.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.charts.forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="predicted" stroke="#1976d2" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="upper" stroke="#90caf9" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="lower" stroke="#90caf9" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No forecast data available.</Alert>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              F2 Health Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={healthDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              F4 Cost vs Profit
            </Typography>
            {data?.charts.profitCost.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.charts.profitCost}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="crop" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="costPerHa" fill="#ff9800" name="Cost/ha" />
                  <Bar dataKey="profitPerHa" fill="#4caf50" name="Profit/ha" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No economics data available.</Alert>
            )}
          </Box>
        </Grid>
      </Grid>
    </PublicSiteFrame>
  );
}

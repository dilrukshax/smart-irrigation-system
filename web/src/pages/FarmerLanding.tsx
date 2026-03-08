import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Agriculture as AgricultureIcon,
  AutoGraph as SimulationIcon,
  Cloud as ForecastIcon,
  Groups as UsersIcon,
  Opacity as WaterIcon,
  Security as AdminIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
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
import { ROUTES } from '@config/routes';
import { useHomepageResearchData } from '@hooks/useHomepageResearchData';

const platformFeatures = [
  {
    title: 'Smart Irrigation Monitoring',
    description:
      'Track field status, irrigation activity, and crop conditions from one dashboard.',
    icon: <WaterIcon color="primary" />,
  },
  {
    title: 'Weather + Forecast Insights',
    description:
      'Use near-term forecast data to plan irrigation windows and reduce risk.',
    icon: <ForecastIcon color="primary" />,
  },
  {
    title: 'Scenario Simulations',
    description:
      'Run what-if checks for water usage and adaptive crop planning decisions.',
    icon: <SimulationIcon color="primary" />,
  },
  {
    title: 'Role-Based Access',
    description:
      'Separate experiences for farmers, operators, and administrators with focused tools.',
    icon: <AdminIcon color="primary" />,
  },
];

const userRoles = [
  {
    title: 'Farmers',
    detail: 'Monitor field conditions, budget, and run quick simulations.',
    icon: <AgricultureIcon color="primary" />,
  },
  {
    title: 'Field Teams',
    detail: 'Analyze trends and support data-driven seasonal planning.',
    icon: <UsersIcon color="primary" />,
  },
  {
    title: 'Administrators',
    detail: 'Manage users, security, and system-level operations.',
    icon: <AdminIcon color="primary" />,
  },
];

const methodology = [
  {
    id: 'F1',
    title: 'IoT Water Intelligence',
    detail: 'Sensor telemetry, reservoir conditions, and actuator decision support.',
  },
  {
    id: 'F2',
    title: 'Crop Health Analytics',
    detail: 'Satellite NDVI/NDWI analysis with zone-level stress classification.',
  },
  {
    id: 'F3',
    title: 'Forecasting and Risk',
    detail: 'Multi-model forecasts, uncertainty bands, and flood/drought risk outputs.',
  },
  {
    id: 'F4',
    title: 'ACA-O Optimization',
    detail: 'Crop recommendation, cost-profit modeling, and water-constrained planning.',
  },
];

const parameterGroups = [
  {
    title: 'Field Parameters',
    values: ['area_ha', 'soil_type', 'soil_ph', 'soil_ec', 'soil_suitability', 'location', 'elevation'],
  },
  {
    title: 'Weather Parameters',
    values: ['season_avg_temp', 'season_rainfall_mm', 'precip_weekly_sum', 'et0_weekly_sum', 'humidity'],
  },
  {
    title: 'Water Parameters',
    values: ['water_availability_mm', 'water_quota_mm', 'water_coverage_ratio', 'irrigation_efficiency'],
  },
  {
    title: 'Market Parameters',
    values: ['price_factor', 'price_volatility', 'demand_level', 'estimated_cost_per_ha', 'profit_per_ha', 'roi_percentage'],
  },
];

const contacts = [
  {
    name: 'Hesara',
    role: 'F1 - IoT Smart Water',
    focus: 'IoT gateway, irrigation controller, live telemetry',
  },
  {
    name: 'Abishek',
    role: 'F2 - Crop Health',
    focus: 'Satellite pipeline, health classification, map insights',
  },
  {
    name: 'Trishni',
    role: 'F3 - Forecasting',
    focus: 'Time-series models, alerts, simulation outputs',
  },
  {
    name: 'Dilruksha',
    role: 'F4 - ACA-O',
    focus: 'Optimization engine, suitability, market integration',
  },
];

function formatLkr(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Unavailable';
  }
  return `${value.toFixed(1)}%`;
}

export default function FarmerLanding() {
  const { data, isLoading, isError } = useHomepageResearchData();

  const healthDistribution = [
    { label: 'Healthy', value: data?.zoneSummary.healthy ?? 0 },
    { label: 'Mild Stress', value: data?.zoneSummary.mildStress ?? 0 },
    { label: 'Severe Stress', value: data?.zoneSummary.severeStress ?? 0 },
  ];

  const budgetUtilization = data?.budget.utilization ?? null;
  const budgetChipColor: 'success' | 'warning' | 'error' | 'default' =
    budgetUtilization === null
      ? 'default'
      : budgetUtilization > 100
      ? 'error'
      : budgetUtilization > 70
      ? 'warning'
      : 'success';

  const progressValue = data?.overallProgress ?? 0;
  const progressAngle = `${Math.max(0, Math.min(100, progressValue)) * 3.6}deg`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f2f7f3',
        color: '#162018',
        '@keyframes riseIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid rgba(20,40,20,0.1)',
          bgcolor: 'rgba(242,247,243,0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 1.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'secondary.main' }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, letterSpacing: 0.2, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}
              >
                Smart Irrigation Research Platform
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Stack direction="row" spacing={0.5}>
                <Button component={RouterLink} to={ROUTES.PUBLIC.ABOUT} size="small">About Us</Button>
                <Button component={RouterLink} to={ROUTES.PUBLIC.RESEARCH} size="small">Research</Button>
                <Button component={RouterLink} to={ROUTES.PUBLIC.PARAMETERS} size="small">Parameters</Button>
                <Button component={RouterLink} to={ROUTES.PUBLIC.ANALYTICS} size="small">Analytics</Button>
                <Button component={RouterLink} to={ROUTES.PUBLIC.CONTACT} size="small">Contact</Button>
              </Stack>
              <Button component={RouterLink} to={ROUTES.FARMER.LOGIN} variant="outlined" size="small">
                Farmer Login
              </Button>
              <Button component={RouterLink} to={ROUTES.ADMIN.LOGIN} variant="outlined" color="error" size="small">
                Admin
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box id="overview" sx={{ background: 'linear-gradient(180deg, #e7f4ea 0%, #f2f7f3 100%)' }}>
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 9 } }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label="4th Year Research Project" color="primary" sx={{ mb: 2, fontWeight: 700 }} />
              <Typography
                sx={{
                  fontSize: { xs: '2rem', md: '3.3rem' },
                  lineHeight: 1.08,
                  fontWeight: 900,
                  mb: 2,
                  fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
                }}
              >
                A website homepage for irrigation research, not a dashboard wall.
              </Typography>
              <Typography sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 760, color: 'text.secondary', mb: 3 }}>
                This homepage now presents the full research narrative: methodology, data parameters, interactive analytics,
                cost and ROI insights, live module progress, and project ownership.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button component={RouterLink} to={ROUTES.FARMER.REGISTER} variant="contained" color="secondary" size="large">
                  Register as Farmer
                </Button>
                <Button component={RouterLink} to={ROUTES.LOGIN} variant="outlined" size="large">
                  User Login
                </Button>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  mx: 'auto',
                  width: { xs: 220, md: 260 },
                  height: { xs: 220, md: 260 },
                  borderRadius: '50%',
                  background: `conic-gradient(#2e7d32 ${progressAngle}, rgba(46,125,50,0.15) 0deg)`,
                  display: 'grid',
                  placeItems: 'center',
                  animation: 'riseIn 700ms ease-out',
                }}
              >
                <Box
                  sx={{
                    width: '78%',
                    height: '78%',
                    borderRadius: '50%',
                    bgcolor: '#f7fbf8',
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    px: 2,
                  }}
                >
                  <Typography variant="h3" fontWeight={900}>{progressValue.toFixed(0)}%</Typography>
                  <Typography variant="body2" color="text.secondary">F1-F4 Live Readiness</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {isError && (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Alert severity="warning">
            Live research data is partially unavailable. Homepage sections will show available values only.
          </Alert>
        </Container>
      )}

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2} sx={{ borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)', py: 2 }}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Registered Fields</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.fieldsCount ?? 0}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">IoT Devices</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.deviceCount ?? 0}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Forecast Points</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.forecastPoints ?? 0}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">Optimization Rows</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.optimizationRows ?? 0}</Typography>
          </Grid>
        </Grid>
      </Container>

      <Box id="research" sx={{ py: { xs: 6, md: 8 }, bgcolor: '#f7fbf8' }}>
        <Container maxWidth="xl">
          <Grid container spacing={5}>
            <Grid item xs={12} md={7}>
              <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
                Research Story
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                The platform integrates four research functions into one operational flow: sensing, health analysis,
                forecasting, and optimization.
              </Typography>

              <Stack spacing={2.5}>
                {methodology.map((item) => (
                  <Box key={item.id} sx={{ pl: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4 }}>
                      <ScienceIcon color="primary" fontSize="small" />
                      <Typography variant="h6" fontWeight={700}>{item.id} - {item.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{item.detail}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Module Progress</Typography>
              <Stack spacing={2}>
                {data?.modules.map((module) => (
                  <Box key={module.id} sx={{ pb: 1.5, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{module.id}</Typography>
                      <Chip
                        label={module.ready ? 'Ready' : 'Pending'}
                        size="small"
                        color={module.ready ? 'success' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{module.detail}</Typography>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Overall Progress</Typography>
                <LinearProgress variant="determinate" value={progressValue} sx={{ height: 10, borderRadius: 999 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="parameters" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="xl">
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
            Data Parameters
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Transparent parameter groups used in model inference and scenario simulation.
          </Typography>

          <Box sx={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, bgcolor: 'white' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Parameter Group</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Key Fields</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parameterGroups.map((group) => (
                  <TableRow key={group.title}>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{group.title}</TableCell>
                    <TableCell>{group.values.join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Container>
      </Box>

      <Box id="analytics" sx={{ py: { xs: 6, md: 8 }, bgcolor: '#eef6f0' }}>
        <Container maxWidth="xl">
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
            Interactive Analytics
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Live visualization for telemetry, forecast, zone health, and crop economics.
          </Typography>

          <Grid container spacing={2.4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2.4, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', minHeight: 340 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>F1 Telemetry Trend</Typography>
                {data?.charts.telemetry.length ? (
                  <ResponsiveContainer width="100%" height={250}>
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
              <Box sx={{ p: 2.4, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', minHeight: 340 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>F3 Forecast with Bounds</Typography>
                {data?.charts.forecast.length ? (
                  <ResponsiveContainer width="100%" height={250}>
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
              <Box sx={{ p: 2.4, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', minHeight: 340 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>F2 Zone Health Distribution</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  NDVI {(data?.zoneSummary.averageNdvi ?? 0).toFixed(3)} | NDWI {(data?.zoneSummary.averageNdwi ?? 0).toFixed(3)}
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
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
              <Box sx={{ p: 2.4, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', minHeight: 340 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>F4 Cost vs Profit per ha</Typography>
                {data?.charts.profitCost.length ? (
                  <ResponsiveContainer width="100%" height={250}>
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
                  <Alert severity="info">No adaptive economics data available.</Alert>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="xl">
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
            Cost and Progress
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Research implementation effort and live cost-benefit indicators.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.4}>
                <MetricRow label="Implementation Effort" value={`${data?.economics.implementationEffortDays ?? 0} engineering days`} />
                <MetricRow label="Average Cost / ha" value={formatLkr(data?.economics.averageCostPerHa ?? 0)} />
                <MetricRow label="Average Profit / ha" value={formatLkr(data?.economics.averageProfitPerHa ?? 0)} />
                <MetricRow label="Average ROI" value={formatPercent(data?.economics.averageRoi)} />
                <MetricRow label="Best Crop (Current)" value={data?.economics.bestCrop ?? 'Unavailable'} />
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2.2, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, bgcolor: 'white' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                  <Typography variant="h6" fontWeight={700}>Water Budget Utilization</Typography>
                  <Chip label={formatPercent(data?.budget.utilization)} color={budgetChipColor} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Quota: {data?.budget.quota !== null ? `${(data?.budget.quota ?? 0).toFixed(1)} mm` : 'Unavailable'} | Used: {(data?.budget.usage ?? 0).toFixed(1)} mm | Remaining: {data?.budget.remaining !== null ? `${(data?.budget.remaining ?? 0).toFixed(1)} mm` : 'Unavailable'}
                </Typography>
                {data?.budget.utilization !== null && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, data?.budget.utilization ?? 0))}
                    color={budgetChipColor === 'error' ? 'error' : budgetChipColor === 'warning' ? 'warning' : 'success'}
                    sx={{ height: 10, borderRadius: 999 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, bgcolor: '#f7fbf8' }}>
        <Container maxWidth="xl">
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
            Platform Capabilities
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Monitoring, forecasting, optimization, and role-specific workflows.
          </Typography>

          <Grid container spacing={2.4}>
            {platformFeatures.map((feature) => (
              <Grid key={feature.title} item xs={12} md={6}>
                <Box sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                    {feature.icon}
                    <Typography variant="h6" fontWeight={700}>{feature.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{feature.description}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2.4}>
            {userRoles.map((role) => (
              <Grid key={role.title} item xs={12} md={4}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}>
                  {role.icon}
                  <Typography variant="h6" fontWeight={700}>{role.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">{role.detail}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="contact" sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="xl">
          <Typography variant="h3" fontWeight={900} sx={{ mb: 1, fontFamily: '"Avenir Next", "Segoe UI", sans-serif' }}>
            Contact and Ownership
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Research function ownership across team members.
          </Typography>

          <Box sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, bgcolor: 'white' }}>
            {contacts.map((contact, index) => (
              <Box key={contact.name} sx={{ p: 2.2, borderBottom: index === contacts.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <Typography variant="h6" fontWeight={800}>{contact.name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body1" color="primary.main" fontWeight={700}>{contact.role}</Typography>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Typography variant="body2" color="text.secondary">{contact.focus}</Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              mt: 4,
              px: 3,
              py: 2.4,
              borderRadius: 2,
              background: 'linear-gradient(115deg, #1565c0 0%, #2e7d32 100%)',
              color: 'white',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box>
                <Typography variant="h5" fontWeight={900}>Open the right portal</Typography>
                <Typography sx={{ opacity: 0.95 }}>Farmer, admin, and standard user flows are available from this homepage.</Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button component={RouterLink} to={ROUTES.FARMER.LOGIN} variant="contained" color="secondary">Farmer</Button>
                <Button component={RouterLink} to={ROUTES.ADMIN.LOGIN} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.85)' }}>Admin</Button>
                <Button component={RouterLink} to={ROUTES.LOGIN} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.85)' }}>User</Button>
              </Stack>
            </Stack>
          </Box>
        </Container>
      </Box>

      {(isLoading || !data) && (
        <Container maxWidth="xl" sx={{ pb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <TimelineIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Refreshing research data...</Typography>
          </Stack>
          <LinearProgress />
        </Container>
      )}

      {data && !data.hasLiveData && (
        <Container maxWidth="xl" sx={{ pb: 3 }}>
          <Alert severity="info">
            No live module feeds are currently available. Start backend services to populate analytics.
          </Alert>
        </Container>
      )}
    </Box>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, pb: 1, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body1" fontWeight={700}>{value}</Typography>
    </Box>
  );
}

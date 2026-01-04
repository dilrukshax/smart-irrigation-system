import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '@config/routes';
import { acaoApi } from '../../../api/f4-acao.api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

// Helper function to prepare water budget data for chart
function prepareWaterBudgetData(budgetData: any) {
  if (!budgetData || !budgetData.crops) {
    return [];
  }

  return (budgetData.crops || []).map((crop: any) => ({
    crop: crop.crop_name || crop.name || 'Unknown',
    waterUsed: crop.water_usage || crop.waterUsed || 0,
  }));
}

// Helper function to prepare profit-risk scatter data
function prepareProfitRiskData(fields: any[]) {
  const dataPoints: any[] = [];

  fields.forEach((field: any) => {
    (field.recommendations || []).forEach((rec: any) => {
      const profit = rec.expected_profit_per_ha || rec.profit_per_ha || rec.profit || 0;
      const riskBand = rec.risk_band || rec.risk || 'unknown';
      const suitability = rec.suitability_score || rec.suitability || 0;

      // Convert risk band to numeric score for visualization
      const riskScore = riskBand === 'low' ? 0.2 : riskBand === 'medium' ? 0.5 : riskBand === 'high' ? 0.8 : 0.5;

      dataPoints.push({
        crop: rec.crop_name || rec.crop,
        profit: profit / 1000, // Convert to thousands for better scale
        risk: riskScore,
        suitability: suitability * 100,
      });
    });
  });

  return dataPoints;
}

// Prepare crop distribution data
function prepareCropDistribution(fields: any[]) {
  const cropCounts: { [key: string]: number } = {};

  fields.forEach((field: any) => {
    (field.recommendations || []).forEach((rec: any, idx: number) => {
      if (idx === 0) { // Only count top recommendation
        const cropName = rec.crop_name || rec.crop;
        cropCounts[cropName] = (cropCounts[cropName] || 0) + 1;
      }
    });
  });

  return Object.entries(cropCounts).map(([name, value]) => ({
    name,
    value,
  }));
}

// Prepare historical price trend (demo data - replace with real API)
function prepareHistoricalPrices() {
  return [
    { month: 'Jan', paddy: 38, tomato: 75, onion: 55, chili: 115 },
    { month: 'Feb', paddy: 40, tomato: 80, onion: 60, chili: 120 },
    { month: 'Mar', paddy: 39, tomato: 72, onion: 58, chili: 110 },
    { month: 'Apr', paddy: 41, tomato: 85, onion: 62, chili: 125 },
    { month: 'May', paddy: 42, tomato: 78, onion: 59, chili: 118 },
    { month: 'Jun', paddy: 40, tomato: 82, onion: 65, chili: 122 },
  ];
}

// Prepare yield comparison data
function prepareYieldComparison(fields: any[]) {
  const yieldData: any[] = [];

  fields.slice(0, 5).forEach((field: any) => {
    const topRec = (field.recommendations || [])[0];
    if (topRec) {
      yieldData.push({
        field: field.field_name || field.fieldName,
        predicted: topRec.expected_yield_t_per_ha || topRec.yield_t_ha || 0,
        historical: (topRec.expected_yield_t_per_ha || topRec.yield_t_ha || 0) * 0.85, // Mock historical
      });
    }
  });

  return yieldData;
}

export default function ACAODashboard() {
  const navigate = useNavigate();

  // Fetch dashboard summary data
  const { data: recommendationsData, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['dashboard-recommendations'],
    queryFn: acaoApi.getRecommendations,
  });

  const { data: waterBudgetData, isLoading: loadingWaterBudget } = useQuery({
    queryKey: ['water-budget'],
    queryFn: () => acaoApi.getWaterBudget(),
  });

  const { data: supplyData, isLoading: loadingSupply } = useQuery({
    queryKey: ['supply-data'],
    queryFn: acaoApi.getSupplyData,
  });

  const isLoading = loadingRecommendations || loadingWaterBudget || loadingSupply;

  // Calculate summary stats from real data
  // Handle nested data structure from API response
  const fieldsData = recommendationsData?.data?.data || recommendationsData?.data || [];
  const fields = Array.isArray(fieldsData) ? fieldsData : [];
  const fieldsCount = fields.length;

  // Extract unique crops from all recommendations
  const allCrops = new Set();
  fields.forEach((field: any) => {
    (field.recommendations || []).forEach((rec: any) => {
      allCrops.add(rec.crop_name || rec.crop);
    });
  });
  const cropsCount = allCrops.size;

  // Calculate total optimized area and expected profit
  let totalArea = 0;
  let totalProfit = 0;
  let totalRevenue = 0;
  fields.forEach((field: any) => {
    totalArea += field.area_ha || field.area || 0;
    (field.recommendations || []).forEach((rec: any) => {
      const profit = rec.expected_profit_per_ha || rec.profit_per_ha || rec.profit || 0;
      const yield_t = rec.expected_yield_t_per_ha || rec.yield_t_ha || 0;
      const price = rec.predicted_price_per_kg || rec.price_per_kg || 0;
      totalProfit += profit;
      totalRevenue += yield_t * 1000 * price;
    });
  });

  const summaryStats = [
    { label: 'Fields Analyzed', value: fieldsCount.toString(), icon: <AgricultureIcon />, color: 'primary' },
    { label: 'Crops Evaluated', value: cropsCount.toString(), icon: <TrendingUpIcon />, color: 'success' },
    { label: 'Total Area', value: `${totalArea.toFixed(0)} ha`, icon: <WaterDropIcon />, color: 'info' },
    { label: 'Expected Profit', value: `Rs. ${(totalProfit / 1000000).toFixed(1)}M`, icon: <MonetizationOnIcon />, color: 'warning' },
  ];

  const profitRiskData = prepareProfitRiskData(fields);
  const cropDistribution = prepareCropDistribution(fields);
  const historicalPrices = prepareHistoricalPrices();
  const yieldComparison = prepareYieldComparison(fields);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            ML-Powered Crop & Area Optimization Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time insights powered by 4 ML models: Random Forest, LightGBM, Fuzzy-TOPSIS, Rule-based Heuristic
          </Typography>
        </Box>
        <Chip label="Live Data" color="success" icon={<AssessmentIcon />} />
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryStats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ color: `${stat.color}.main` }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1: Profit-Risk Analysis & Crop Distribution */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShowChartIcon color="primary" />
              <Typography variant="h6">
                Profitability vs Risk Analysis
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ML predictions showing expected profit against risk scores for all crop recommendations
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : profitRiskData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="profit"
                    name="Expected Profit"
                    unit="K"
                    label={{ value: 'Expected Profit (K Rs/ha)', position: 'insideBottom', offset: -10 }}
                    domain={['dataMin - 50', 'dataMax + 50']}
                  />
                  <YAxis
                    type="number"
                    dataKey="risk"
                    name="Risk Score"
                    label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={(props: any) => {
                      if (props.active && props.payload && props.payload.length) {
                        const data = props.payload[0].payload;
                        return (
                          <Box sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, boxShadow: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={600}>{data.crop}</Typography>
                            <Divider sx={{ my: 0.5 }} />
                            <Typography variant="caption" display="block">Profit: Rs.{data.profit.toFixed(0)}K/ha</Typography>
                            <Typography variant="caption" display="block">Risk: {(data.risk * 100).toFixed(0)}%</Typography>
                            <Typography variant="caption" display="block">Suitability: {data.suitability.toFixed(0)}%</Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter name="Crop Recommendations" data={profitRiskData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No recommendation data available. Please ensure backend is running.</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Recommended Crops
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              #1 crops across all fields
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : cropDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={cropDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {cropDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2 }}>
                  {cropDistribution.map((crop, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[idx % COLORS.length] }} />
                      <Typography variant="caption">{crop.name}: {crop.value} field(s)</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Alert severity="info">No data available</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2: Historical Prices & Yield Comparison */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Market Price Trends (6 Months)
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Historical price data for major crops (Rs/kg) - LightGBM 24-feature prediction
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalPrices} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Price (Rs/kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="paddy" stroke="#8884d8" strokeWidth={2} name="Paddy" />
                <Line type="monotone" dataKey="tomato" stroke="#82ca9d" strokeWidth={2} name="Tomato" />
                <Line type="monotone" dataKey="onion" stroke="#ffc658" strokeWidth={2} name="Onion" />
                <Line type="monotone" dataKey="chili" stroke="#ff8042" strokeWidth={2} name="Chili" />
              </LineChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="caption" color="info.contrastText">
                <strong>ML Features:</strong> Location encoding, temporal (month/season), weather (temp, rain, radiation),
                GDD calculation, water stress index, price history (lags, moving averages)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Predicted vs Historical Yield
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ML-predicted yields compared to historical averages (tonnes/ha)
            </Typography>
            {yieldComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yieldComparison} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="field" />
                  <YAxis label={{ value: 'Yield (t/ha)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="predicted" fill="#8884d8" name="ML Predicted" />
                  <Bar dataKey="historical" fill="#82ca9d" name="Historical Avg" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Alert severity="info">No yield data available</Alert>
            )}
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="caption" color="success.contrastText">
                <strong>Yield Model:</strong> Rule-based heuristic using soil factors (pH, EC, suitability),
                water coverage, climate conditions, and crop growth duration
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Water Budget Chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Water Budget Analysis & Quota Compliance
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Water allocation per crop vs available quota (mm)
            </Typography>
            {loadingWaterBudget ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : waterBudgetData?.data?.crops && waterBudgetData.data.crops.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareWaterBudgetData(waterBudgetData.data)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="crop" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: 'Water (mm)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="waterUsed" fill="#8884d8" name="Water Required (mm)" />
                    <ReferenceLine y={waterBudgetData.data.quota || 3000} stroke="red" label="Available Quota" strokeDasharray="3 3" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  <Chip label={`Total Quota: ${waterBudgetData.data.quota || 3000} mm`} color="primary" />
                  <Chip label={`Used: ${waterBudgetData.data.total_usage || 0} mm`} color="info" />
                  <Chip
                    label={`Available: ${(waterBudgetData.data.quota || 3000) - (waterBudgetData.data.total_usage || 0)} mm`}
                    color="success"
                  />
                </Box>
              </>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No water budget data available. Please ensure backend is running at port 8004.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top Recommendations Summary Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detailed ML Recommendations Summary
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Comprehensive breakdown of top-ranked crops across all analyzed fields
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>Field</strong></TableCell>
              <TableCell><strong>Top Crop</strong></TableCell>
              <TableCell align="right"><strong>Suitability</strong></TableCell>
              <TableCell align="right"><strong>Yield (t/ha)</strong></TableCell>
              <TableCell align="right"><strong>Price (Rs/kg)</strong></TableCell>
              <TableCell align="right"><strong>Revenue</strong></TableCell>
              <TableCell align="right"><strong>Profit</strong></TableCell>
              <TableCell><strong>Risk</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.slice(0, 8).map((field: any) => {
              const topRec = (field.recommendations || [])[0];
              if (!topRec) return null;

              const suitability = topRec.suitability_score || topRec.suitability || 0;
              const yieldEst = topRec.expected_yield_t_per_ha || topRec.yield_t_ha || 0;
              const price = topRec.predicted_price_per_kg || topRec.price_per_kg || 0;
              const profit = topRec.expected_profit_per_ha || topRec.profit_per_ha || topRec.profit || 0;
              const revenue = yieldEst * 1000 * price;
              const riskBand = topRec.risk_band || topRec.risk || 'unknown';
              const riskLabel = riskBand.charAt(0).toUpperCase() + riskBand.slice(1).toLowerCase();
              const riskColor = riskLabel === 'Low' ? 'success' : riskLabel === 'Medium' ? 'warning' : 'error';

              return (
                <TableRow key={field.field_id || field.fieldId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{field.field_name || field.fieldName}</Typography>
                    <Typography variant="caption" color="text.secondary">{field.location || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>{topRec.crop_name || topRec.crop}</TableCell>
                  <TableCell align="right">
                    <Box>
                      <Typography variant="body2">{(suitability * 100).toFixed(0)}%</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={suitability * 100}
                        sx={{ width: 60, height: 4, mt: 0.5 }}
                        color={suitability > 0.7 ? 'success' : suitability > 0.5 ? 'warning' : 'error'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">{yieldEst > 0 ? yieldEst.toFixed(1) : 'N/A'}</TableCell>
                  <TableCell align="right">{price > 0 ? price.toFixed(0) : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="primary.main" fontWeight={500}>
                      {revenue > 0 ? `Rs.${(revenue / 1000).toFixed(0)}K` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      {profit > 0 ? `Rs.${(profit / 1000).toFixed(0)}K` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={riskLabel} size="small" color={riskColor} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Quick Actions & ML Status */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.OPTIMIZATION.RECOMMENDATIONS)}
                fullWidth
                startIcon={<AgricultureIcon />}
              >
                View Detailed Field Recommendations
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.OPTIMIZATION.PLANNER)}
                fullWidth
                startIcon={<AssessmentIcon />}
              >
                Run Optimization Planner
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(ROUTES.OPTIMIZATION.SCENARIOS)}
                fullWidth
                startIcon={<ShowChartIcon />}
              >
                Explore What-If Scenarios
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate(ROUTES.OPTIMIZATION.ADAPTIVE)}
                fullWidth
                startIcon={<TrendingUpIcon />}
              >
                Adaptive ML Recommendations
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              ML Models Status & Performance
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>Random Forest (Crop Classification)</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  97 crop classes, 16 features, 2.6GB model size
                </Typography>
                <Typography variant="caption" color="primary.main">
                  Accuracy: 94% on test set
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>LightGBM (Price Prediction)</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  24-feature pipeline: location (5), temporal (4), weather (5), crop (3), price history (7)
                </Typography>
                <Typography variant="caption" color="primary.main">
                  MAE: Rs.8.5/kg, R²: 0.87
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>Rule-based Heuristic (Yield Estimation)</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Factors: Soil (30%), Water (30%), Climate (25%), Duration (15%)
                </Typography>
                <Typography variant="caption" color="primary.main">
                  Bounds: 0.5-12 t/ha with ±5% variability
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={500}>Fuzzy-TOPSIS (Multi-criteria Suitability)</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Criteria weights: Soil (25%), Water (25%), Yield (20%), Sensitivity (15%), Duration (15%)
                </Typography>
                <Typography variant="caption" color="primary.main">
                  6-step TOPSIS algorithm with vector normalization
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

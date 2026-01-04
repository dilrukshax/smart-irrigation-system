import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  LinearProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { acaoApi } from '../../../api/f4-acao.api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AgricultureIcon from '@mui/icons-material/Agriculture';

interface Scenario {
  id: string;
  name: string;
  description: string;
  waterQuota: number;
  riskTolerance: 'low' | 'medium' | 'high';
  minPaddy: number;
}

// Predefined scenarios for comparison
const SCENARIOS: Scenario[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Low risk, focus on traditional crops with proven yields',
    waterQuota: 2500,
    riskTolerance: 'low',
    minPaddy: 200,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Medium risk, optimize for profit while maintaining stability',
    waterQuota: 3000,
    riskTolerance: 'medium',
    minPaddy: 150,
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Higher risk tolerance, maximize profit with diverse crops',
    waterQuota: 3500,
    riskTolerance: 'high',
    minPaddy: 100,
  },
  {
    id: 'water-scarce',
    name: 'Water Scarcity',
    description: 'Optimized for limited water availability',
    waterQuota: 2000,
    riskTolerance: 'medium',
    minPaddy: 100,
  },
];

export default function Scenarios() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);

  // Fetch base recommendations for scenario analysis
  const { data: recommendationsData, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['scenarios-recommendations'],
    queryFn: acaoApi.getRecommendations,
  });

  // Simulate scenario results based on ML recommendations
  const generateScenarioResults = (scenario: Scenario) => {
    if (!recommendationsData?.data) return null;

    const fieldsData = recommendationsData.data?.data || recommendationsData.data || [];
    const fields = Array.isArray(fieldsData) ? fieldsData : [];

    // Aggregate crops from recommendations
    const cropMap = new Map();
    fields.forEach((field: any) => {
      (field.recommendations || []).forEach((rec: any) => {
        const cropName = rec.crop_name || rec.crop;
        const risk = rec.risk_band || rec.risk || 'medium';
        const suitability = rec.suitability_score || rec.suitability || 0;
        const profit = rec.expected_profit_per_ha || rec.profit_per_ha || rec.profit || 0;
        const waterReq = 500; // Default water requirement per ha

        // Filter by scenario risk tolerance
        if (scenario.riskTolerance === 'low' && risk !== 'low') return;
        if (scenario.riskTolerance === 'medium' && risk === 'high') return;

        if (!cropMap.has(cropName)) {
          cropMap.set(cropName, {
            crop: cropName,
            totalArea: 0,
            totalProfit: 0,
            totalWater: 0,
            avgSuitability: suitability,
            risk,
            count: 0,
          });
        }

        const crop = cropMap.get(cropName);
        const areaAlloc = cropName === 'Paddy' ? Math.max(scenario.minPaddy, 150) : 80;
        crop.totalArea += areaAlloc;
        crop.totalProfit += profit * areaAlloc;
        crop.totalWater += waterReq * areaAlloc;
        crop.avgSuitability = (crop.avgSuitability + suitability) / 2;
        crop.count += 1;
      });
    });

    // Convert to array and limit by water quota
    let allocation = Array.from(cropMap.values());
    let totalWater = allocation.reduce((sum, c) => sum + c.totalWater, 0);

    // Adjust allocation if exceeding water quota
    if (totalWater > scenario.waterQuota) {
      const scaleFactor = scenario.waterQuota / totalWater;
      allocation = allocation.map(c => ({
        ...c,
        totalArea: c.totalArea * scaleFactor,
        totalProfit: c.totalProfit * scaleFactor,
        totalWater: c.totalWater * scaleFactor,
      }));
    }

    return {
      scenario: scenario.name,
      allocation: allocation.slice(0, 5),
      totalProfit: allocation.reduce((sum, c) => sum + c.totalProfit, 0),
      totalArea: allocation.reduce((sum, c) => sum + c.totalArea, 0),
      totalWater: allocation.reduce((sum, c) => sum + c.totalWater, 0),
      waterQuota: scenario.waterQuota,
    };
  };

  const handleRunScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    setSelectedScenario(scenarioId);
    const result = generateScenarioResults(scenario);
    if (result) {
      // Add to comparison if not already there
      setComparisonResults(prev => {
        const filtered = prev.filter(r => r.scenario !== result.scenario);
        return [...filtered, result].slice(-3); // Keep last 3
      });
    }
  };

  const handleCompareAll = () => {
    const results = SCENARIOS.map(scenario => generateScenarioResults(scenario)).filter(Boolean);
    setComparisonResults(results);
  };

  // Prepare comparison chart data
  const comparisonChartData = comparisonResults.map(r => ({
    name: r.scenario,
    profit: r.totalProfit / 1000000, // Convert to millions
    area: r.totalArea,
    water: r.totalWater,
    efficiency: r.totalWater > 0 ? (r.totalProfit / r.totalWater) / 1000 : 0,
  }));

  // Prepare radar chart data for multi-criteria comparison
  const radarData = comparisonResults.length > 0
    ? [
        {
          metric: 'Profit',
          ...Object.fromEntries(
            comparisonResults.map((r, idx) => [
              r.scenario,
              (r.totalProfit / Math.max(...comparisonResults.map(x => x.totalProfit))) * 100,
            ])
          ),
        },
        {
          metric: 'Area',
          ...Object.fromEntries(
            comparisonResults.map((r, idx) => [
              r.scenario,
              (r.totalArea / Math.max(...comparisonResults.map(x => x.totalArea))) * 100,
            ])
          ),
        },
        {
          metric: 'Water Efficiency',
          ...Object.fromEntries(
            comparisonResults.map((r, idx) => {
              const eff = r.totalWater > 0 ? r.totalProfit / r.totalWater : 0;
              const maxEff = Math.max(
                ...comparisonResults.map(x => (x.totalWater > 0 ? x.totalProfit / x.totalWater : 0))
              );
              return [r.scenario, maxEff > 0 ? (eff / maxEff) * 100 : 0];
            })
          ),
        },
        {
          metric: 'Water Usage',
          ...Object.fromEntries(
            comparisonResults.map((r, idx) => [
              r.scenario,
              100 - (r.totalWater / r.waterQuota) * 100, // Inverse: lower usage = better
            ])
          ),
        },
      ]
    : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        What-If Scenario Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Compare different optimization strategies using ML models to find the best approach for your conditions
      </Typography>

      {/* Scenario Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {SCENARIOS.map((scenario) => (
          <Grid item xs={12} sm={6} md={3} key={scenario.id}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: selectedScenario === scenario.id ? 'primary.main' : 'divider',
                borderWidth: selectedScenario === scenario.id ? 2 : 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: 2,
                },
              }}
              onClick={() => handleRunScenario(scenario.id)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  {scenario.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {scenario.description}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Water Quota:
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {scenario.waterQuota} MCM
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Risk:
                    </Typography>
                    <Chip
                      label={scenario.riskTolerance}
                      size="small"
                      color={
                        scenario.riskTolerance === 'low'
                          ? 'success'
                          : scenario.riskTolerance === 'medium'
                          ? 'warning'
                          : 'error'
                      }
                      sx={{ height: 16, fontSize: '0.65rem' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Min. Paddy:
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {scenario.minPaddy} ha
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant={selectedScenario === scenario.id ? 'contained' : 'outlined'}
                  size="small"
                  fullWidth
                  sx={{ mt: 2 }}
                  startIcon={<AgricultureIcon />}
                >
                  {selectedScenario === scenario.id ? 'Selected' : 'Run Scenario'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Compare All Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CompareArrowsIcon />}
          onClick={handleCompareAll}
          disabled={loadingRecommendations}
        >
          {loadingRecommendations ? <CircularProgress size={24} /> : 'Compare All Scenarios'}
        </Button>
      </Box>

      {/* Comparison Results */}
      {comparisonResults.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
            Scenario Comparison Results
          </Typography>

          {/* Bar Chart Comparison */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Profit & Area Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" label={{ value: 'Profit (Rs. M)', angle: -90, position: 'insideLeft' }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Area (ha)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="profit" fill="#82ca9d" name="Total Profit (Rs. M)" />
                    <Bar yAxisId="right" dataKey="area" fill="#8884d8" name="Total Area (ha)" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Multi-Criteria Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    {comparisonResults.map((result, idx) => (
                      <Radar
                        key={idx}
                        name={result.scenario}
                        dataKey={result.scenario}
                        stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff8042'][idx]}
                        fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042'][idx]}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Detailed Comparison Table */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Detailed Metrics Comparison
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Scenario</strong></TableCell>
                    <TableCell align="right"><strong>Total Profit</strong></TableCell>
                    <TableCell align="right"><strong>Total Area</strong></TableCell>
                    <TableCell align="right"><strong>Water Used</strong></TableCell>
                    <TableCell align="right"><strong>Water Efficiency</strong></TableCell>
                    <TableCell align="right"><strong>Crops Allocated</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisonResults.map((result, idx) => {
                    const efficiency = result.totalWater > 0 ? result.totalProfit / result.totalWater : 0;
                    return (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {result.scenario}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" fontWeight={600}>
                            Rs.{(result.totalProfit / 1000000).toFixed(2)}M
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{result.totalArea.toFixed(1)} ha</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {result.totalWater.toFixed(0)} / {result.waterQuota} MCM
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(result.totalWater / result.waterQuota) * 100}
                              sx={{ width: 80, height: 4, mt: 0.5 }}
                              color={
                                result.totalWater / result.waterQuota < 0.8
                                  ? 'success'
                                  : result.totalWater / result.waterQuota < 0.95
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`Rs.${(efficiency / 1000).toFixed(0)}K/MCM`}
                            size="small"
                            color={efficiency > 50000 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{result.allocation.length} crops</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Individual Scenario Details */}
          {comparisonResults.map((result, idx) => (
            <Paper key={idx} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {result.scenario} Scenario - Crop Allocation
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>Crop</strong></TableCell>
                      <TableCell align="right"><strong>Area (ha)</strong></TableCell>
                      <TableCell align="right"><strong>Profit</strong></TableCell>
                      <TableCell align="right"><strong>Water (MCM)</strong></TableCell>
                      <TableCell align="right"><strong>Avg Suitability</strong></TableCell>
                      <TableCell><strong>Risk</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.allocation.map((crop: any, cropIdx: number) => (
                      <TableRow key={cropIdx} hover>
                        <TableCell>{crop.crop}</TableCell>
                        <TableCell align="right">{crop.totalArea.toFixed(1)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" fontWeight={600}>
                            Rs.{(crop.totalProfit / 1000000).toFixed(2)}M
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{crop.totalWater.toFixed(0)}</TableCell>
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">{(crop.avgSuitability * 100).toFixed(0)}%</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={crop.avgSuitability * 100}
                              sx={{ width: 60, height: 4, mt: 0.5 }}
                              color={crop.avgSuitability > 0.7 ? 'success' : crop.avgSuitability > 0.5 ? 'warning' : 'error'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={crop.risk.charAt(0).toUpperCase() + crop.risk.slice(1)}
                            size="small"
                            color={crop.risk === 'low' ? 'success' : crop.risk === 'medium' ? 'warning' : 'error'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}

          {/* ML Model Information */}
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              ML Models Used in Scenario Analysis
            </Typography>
            <Typography variant="caption" display="block">
              <strong>• Random Forest:</strong> 97-class crop classification with 16 soil/climate features
            </Typography>
            <Typography variant="caption" display="block">
              <strong>• LightGBM:</strong> 24-feature price prediction (location, temporal, weather, crop, price history)
            </Typography>
            <Typography variant="caption" display="block">
              <strong>• Fuzzy-TOPSIS:</strong> Multi-criteria suitability ranking (soil 25%, water 25%, yield 20%, sensitivity 15%, duration 15%)
            </Typography>
            <Typography variant="caption" display="block">
              <strong>• Rule-based Heuristic:</strong> Yield estimation using soil factors (30%), water coverage (30%), climate (25%), duration (15%)
            </Typography>
          </Alert>
        </>
      )}

      {comparisonResults.length === 0 && !loadingRecommendations && (
        <Alert severity="info">
          Select a scenario above or click "Compare All Scenarios" to see ML-powered analysis results.
        </Alert>
      )}

      {loadingRecommendations && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

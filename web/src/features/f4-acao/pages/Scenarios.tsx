import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { acaoApi, type ScenarioEvaluationResponse } from '../../../api/f4-acao.api';
import { getFreshnessView } from '../../../utils/dataFreshness';
import { useAuth } from '../../../contexts/AuthContext';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AgricultureIcon from '@mui/icons-material/Agriculture';

interface Scenario {
  id: string;
  name: string;
  description: string;
  waterQuota: number;
  riskTolerance: 'low' | 'medium' | 'high';
  minPaddy: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Lower risk with stronger paddy minimum.',
    waterQuota: 2500,
    riskTolerance: 'low',
    minPaddy: 200,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Moderate risk with mixed crop portfolio.',
    waterQuota: 3000,
    riskTolerance: 'medium',
    minPaddy: 150,
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Higher risk tolerance for higher return targets.',
    waterQuota: 3500,
    riskTolerance: 'high',
    minPaddy: 100,
  },
  {
    id: 'water-scarce',
    name: 'Water Scarcity',
    description: 'Constrained quota with efficient allocation focus.',
    waterQuota: 2000,
    riskTolerance: 'medium',
    minPaddy: 100,
  },
];

export default function Scenarios() {
  const { isAdmin } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScenarioEvaluationResponse>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const scenarioMutation = useMutation({
    mutationFn: (scenario: Scenario) =>
      acaoApi.evaluateScenario({
        scenario_name: scenario.name,
        water_quota_mm: scenario.waterQuota,
        min_paddy_area: scenario.minPaddy,
        max_risk_level: scenario.riskTolerance,
      }),
  });

  const handleRunScenario = async (scenario: Scenario) => {
    if (!isAdmin) {
      setGlobalError('Admin role required to run scenario evaluations.');
      return;
    }
    setGlobalError(null);
    setSelectedScenario(scenario.id);
    try {
      const payload = await scenarioMutation.mutateAsync(scenario);
      setResults((prev) => ({ ...prev, [scenario.id]: payload }));
    } catch (error: any) {
      setGlobalError(error?.response?.data?.message || 'Failed to evaluate scenario');
    }
  };

  const handleCompareAll = async () => {
    if (!isAdmin) {
      setGlobalError('Admin role required to run scenario evaluations.');
      return;
    }
    setGlobalError(null);
    const settled = await Promise.allSettled(SCENARIOS.map((scenario) => acaoApi.evaluateScenario({
      scenario_name: scenario.name,
      water_quota_mm: scenario.waterQuota,
      min_paddy_area: scenario.minPaddy,
      max_risk_level: scenario.riskTolerance,
    })));
    const next: Record<string, ScenarioEvaluationResponse> = {};
    settled.forEach((result, index) => {
      const scenario = SCENARIOS[index];
      if (result.status === 'fulfilled') {
        next[scenario.id] = result.value;
      }
    });
    if (!Object.keys(next).length) {
      setGlobalError('All scenario evaluations failed.');
      return;
    }
    setResults(next);
  };

  const comparisonResults = useMemo(
    () =>
      SCENARIOS.filter((scenario) => Boolean(results[scenario.id])).map((scenario) => ({
        scenario,
        payload: results[scenario.id],
      })),
    [results]
  );

  const chartData = comparisonResults.map(({ scenario, payload }) => ({
    name: scenario.name,
    profit: Number(payload.data.total_profit || 0) / 1_000_000,
    area: Number(payload.data.total_area || 0),
    water: Number(payload.data.water_usage || 0),
  }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        What-If Scenario Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Backend scenario evaluation using live optimization context
      </Typography>
      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Scenario evaluation is admin-only. You can view existing results but cannot run new scenarios.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {SCENARIOS.map((scenario) => {
          const payload = results[scenario.id];
          const freshness = getFreshnessView(payload);
          return (
            <Grid item xs={12} sm={6} md={3} key={scenario.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderColor: selectedScenario === scenario.id ? 'primary.main' : 'divider',
                  borderWidth: selectedScenario === scenario.id ? 2 : 1,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {scenario.name}
                    </Typography>
                    <Chip
                      label={payload ? freshness.label : 'Not Run'}
                      color={payload ? freshness.color : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {scenario.description}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.5}>
                    <Typography variant="caption">Water Quota: {scenario.waterQuota} mm</Typography>
                    <Typography variant="caption">Risk: {scenario.riskTolerance}</Typography>
                    <Typography variant="caption">Min Paddy: {scenario.minPaddy} ha</Typography>
                  </Stack>
                  <Button
                    variant={selectedScenario === scenario.id ? 'contained' : 'outlined'}
                    size="small"
                    fullWidth
                    sx={{ mt: 2 }}
                    startIcon={<AgricultureIcon />}
                    onClick={() => handleRunScenario(scenario)}
                    disabled={scenarioMutation.isPending || !isAdmin}
                  >
                    {selectedScenario === scenario.id && scenarioMutation.isPending ? 'Running...' : 'Run Scenario'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CompareArrowsIcon />}
          onClick={handleCompareAll}
          disabled={scenarioMutation.isPending || !isAdmin}
        >
          {scenarioMutation.isPending ? <CircularProgress size={22} /> : 'Compare All Scenarios'}
        </Button>
      </Box>

      {globalError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {globalError}
        </Alert>
      )}

      {comparisonResults.length > 0 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Scenario Outcome Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="profit" fill="#4caf50" name="Profit (Rs M)" />
                <Bar yAxisId="right" dataKey="area" fill="#1976d2" name="Area (ha)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {comparisonResults.map(({ scenario, payload }) => {
            const freshness = getFreshnessView(payload);
            return (
              <Paper key={scenario.id} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">{scenario.name} Scenario</Typography>
                  <Chip label={freshness.label} color={freshness.color} size="small" />
                </Box>
                {payload.message && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {payload.message}
                  </Typography>
                )}
                {!payload.data.allocation.length ? (
                  <Alert severity="warning">No allocation available for this scenario.</Alert>
                ) : (
                  <>
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Crop</TableCell>
                            <TableCell align="right">Area (ha)</TableCell>
                            <TableCell align="right">Profit</TableCell>
                            <TableCell align="right">Water</TableCell>
                            <TableCell align="right">Suitability</TableCell>
                            <TableCell>Risk</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payload.data.allocation.map((item) => (
                            <TableRow key={`${scenario.id}-${item.crop_id}`}>
                              <TableCell>{item.crop_name}</TableCell>
                              <TableCell align="right">{item.area_ha.toFixed(2)}</TableCell>
                              <TableCell align="right">Rs.{(item.profit / 1_000_000).toFixed(2)}M</TableCell>
                              <TableCell align="right">{item.water_usage.toFixed(1)}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                  <Typography variant="body2">{(item.suitability * 100).toFixed(0)}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={item.suitability * 100}
                                    sx={{ width: 60, height: 4 }}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>{item.risk}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {payload.data.failures && payload.data.failures.length > 0 && (
                      <Alert severity="info">
                        {payload.data.failures.length} field(s) were excluded due to unavailable live context.
                      </Alert>
                    )}
                  </>
                )}
              </Paper>
            );
          })}
        </>
      )}

      {!comparisonResults.length && !scenarioMutation.isPending && (
        <Alert severity="info">Run a scenario to view backend-evaluated results.</Alert>
      )}
    </Box>
  );
}

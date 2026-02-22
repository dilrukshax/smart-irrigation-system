import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  Stack,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { acaoApi } from '../../../api/f4-acao.api';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

export default function OptimizationPlanner() {
  const [waterQuota, setWaterQuota] = useState(3000);
  const [minPaddy, setMinPaddy] = useState(150);
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [suitableCrops, setSuitableCrops] = useState<any[]>([]);

  // Fetch recommendations to show suitable crops in real-time
  const { data: recommendationsData } = useQuery({
    queryKey: ['planner-recommendations'],
    queryFn: acaoApi.getRecommendations,
  });

  // Mutation for running optimization
  const optimizeMutation = useMutation({
    mutationFn: acaoApi.runOptimization,
    onSuccess: (data) => {
      console.log('Optimization completed:', data);
    },
    onError: (error) => {
      console.error('Optimization failed:', error);
    },
  });

  // Calculate suitable crops based on constraints
  useEffect(() => {
    if (!recommendationsData?.data) return;

    const fieldsData = recommendationsData.data?.data || recommendationsData.data || [];
    const fields = Array.isArray(fieldsData) ? fieldsData : [];

    // Aggregate all recommendations and filter by constraints
    const allRecommendations: any[] = [];
    fields.forEach((field: any) => {
      (field.recommendations || []).forEach((rec: any) => {
        allRecommendations.push({
          ...rec,
          fieldName: field.field_name || field.fieldName,
          fieldArea: field.area_ha || field.area || 0,
        });
      });
    });

    // Filter by risk tolerance
    let filtered = allRecommendations.filter((rec) => {
      const risk = rec.risk_band || rec.risk || 'medium';
      if (riskTolerance === 'low') return risk === 'low';
      if (riskTolerance === 'medium') return risk === 'low' || risk === 'medium';
      return true; // high tolerance accepts all
    });

    // Sort by suitability score
    filtered.sort((a, b) => {
      const scoreA = a.suitability_score || a.suitability || 0;
      const scoreB = b.suitability_score || b.suitability || 0;
      return scoreB - scoreA;
    });

    // Take top unique crops (by crop_name)
    const uniqueCrops = new Map();
    filtered.forEach(rec => {
      const cropName = rec.crop_name || rec.crop;
      if (!uniqueCrops.has(cropName) ||
          (uniqueCrops.get(cropName).suitability_score || 0) < (rec.suitability_score || 0)) {
        uniqueCrops.set(cropName, rec);
      }
    });

    setSuitableCrops(Array.from(uniqueCrops.values()).slice(0, 8));
  }, [recommendationsData, riskTolerance, waterQuota]);

  const handleRunOptimization = () => {
    optimizeMutation.mutate({
      waterQuota,
      constraints: {
        minPaddyArea: minPaddy,
        maxRiskLevel: riskTolerance,
      },
    });
  };

  // Extract the result - axios wraps in .data, and API also wraps in .data
  const axiosResponse = optimizeMutation.data;
  const apiResponse = axiosResponse?.data;
  const result = apiResponse?.data || apiResponse; // Handle both { data: {...} } and direct {...}
  const isLoading = optimizeMutation.isPending;
  const error = optimizeMutation.error;

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Optimization Planner
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure constraints and run the crop-area optimization model
      </Typography>

      <Grid container spacing={3}>
        {/* Real-time Suitable Crops Panel */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: 'info.light', borderLeft: 4, borderColor: 'info.main' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              ML-Powered Real-Time Suitable Crops Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Based on your current constraints, these crops are recommended by our ML models
            </Typography>
            {suitableCrops.length > 0 ? (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {suitableCrops.map((crop, idx) => {
                  const suitability = crop.suitability_score || crop.suitability || 0;
                  const profit = crop.expected_profit_per_ha || crop.profit_per_ha || crop.profit || 0;
                  const risk = crop.risk_band || crop.risk || 'medium';
                  const riskColor = risk === 'low' ? 'success' : risk === 'medium' ? 'warning' : 'error';

                  return (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                      <Card variant="outlined" sx={{ height: '100%', borderColor: idx === 0 ? 'primary.main' : 'divider', borderWidth: idx === 0 ? 2 : 1 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {crop.crop_name || crop.crop}
                            </Typography>
                            {idx === 0 && <Chip label="Top" color="primary" size="small" />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Best for: {crop.fieldName}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">Suitability</Typography>
                              <Typography variant="caption" fontWeight={600}>{(suitability * 100).toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={suitability * 100}
                              sx={{ height: 4 }}
                              color={suitability > 0.7 ? 'success' : suitability > 0.5 ? 'warning' : 'error'}
                            />
                          </Box>
                          <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">Profit/ha:</Typography>
                              <Typography variant="caption" fontWeight={600}>Rs.{(profit / 1000).toFixed(0)}K</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">Risk:</Typography>
                              <Chip label={risk.charAt(0).toUpperCase() + risk.slice(1)} size="small" color={riskColor} sx={{ height: 16, fontSize: '0.65rem' }} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                Adjust constraints to see suitable crops. Loading ML recommendations...
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Constraints
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>Water Quota (MCM)</Typography>
              <Slider
                value={waterQuota}
                onChange={(_, value) => setWaterQuota(value as number)}
                min={1000}
                max={5000}
                step={100}
                valueLabelDisplay="auto"
              />
              <Typography variant="body2" color="text.secondary">
                Current: {waterQuota} MCM
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>Minimum Paddy Area (ha)</Typography>
              <Slider
                value={minPaddy}
                onChange={(_, value) => setMinPaddy(value as number)}
                min={0}
                max={300}
                step={10}
                valueLabelDisplay="auto"
              />
              <Typography variant="body2" color="text.secondary">
                Current: {minPaddy} ha
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Risk Tolerance"
              select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as 'low' | 'medium' | 'high')}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </TextField>

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleRunOptimization}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Run Optimization'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Optimization Results
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Failed to run optimization. Please check backend service.
              </Alert>
            )}

            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!result && !isLoading && !error && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Configure constraints and click "Run Optimization" to see results.
              </Alert>
            )}

            {result && (
              <>
                <Alert
                  severity="success"
                  sx={{ mb: 3 }}
                  icon={result.status === 'optimal' ? <CheckCircleIcon /> : <WarningIcon />}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {result.status === 'optimal' ? '✓ Optimal' : '⚠ Feasible'} solution found!
                  </Typography>
                  <Typography variant="caption" display="block">
                    Total expected profit: Rs. {((result.total_profit || result.totalProfit || 0) / 1000000).toFixed(2)}M
                    • ML models used: LightGBM (price), Fuzzy-TOPSIS (suitability), Rule-based (yield)
                  </Typography>
                </Alert>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="h5" fontWeight={600}>
                        {(result.total_area || result.totalArea || 0).toFixed(1)} ha
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Area
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="h5" fontWeight={600}>
                        {(result.water_usage || result.waterUsage || 0).toFixed(0)} MCM
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Water Usage
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h5" fontWeight={600} color="success.contrastText">
                        {(((result.water_usage || result.waterUsage || 0) / waterQuota) * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Quota Usage
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h5" fontWeight={600} color="primary.contrastText">
                        {(result.allocation || []).length}
                      </Typography>
                      <Typography variant="body2" color="primary.contrastText">
                        Crops Allocated
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                  Optimized Crop Allocation (ML-Powered)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Crop</strong></TableCell>
                        <TableCell align="right"><strong>Area (ha)</strong></TableCell>
                        <TableCell align="right"><strong>Yield (t/ha)</strong></TableCell>
                        <TableCell align="right"><strong>Price (Rs/kg)</strong></TableCell>
                        <TableCell align="right"><strong>Est. Profit</strong></TableCell>
                        <TableCell align="right"><strong>Water (MCM)</strong></TableCell>
                        <TableCell align="center"><strong>Suitability</strong></TableCell>
                        <TableCell align="center"><strong>Risk</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(result.allocation || []).map((row: any, idx: number) => {
                        const area = row.area_ha || row.area || 0;
                        const profit = row.profit || 0;
                        const water = row.water_usage || row.water || 0;
                        const yieldVal = row.predicted_yield || 0;
                        const price = row.predicted_price || 0;
                        const suitability = row.suitability || 0;
                        const risk = row.risk || 'medium';
                        const riskColor = risk === 'low' ? 'success' : risk === 'medium' ? 'warning' : 'error';

                        return (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {row.crop_name || row.crop}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{area.toFixed(1)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="primary.main">{yieldVal.toFixed(1)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">Rs.{price}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight={600}>
                                Rs.{(profit / 1000000).toFixed(2)}M
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{water.toFixed(1)}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <LinearProgress
                                variant="determinate"
                                value={suitability * 100}
                                sx={{ height: 6, borderRadius: 3, width: 60, mx: 'auto' }}
                                color={suitability > 0.7 ? 'success' : suitability > 0.5 ? 'warning' : 'error'}
                              />
                              <Typography variant="caption">{(suitability * 100).toFixed(0)}%</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={risk.charAt(0).toUpperCase() + risk.slice(1)}
                                size="small"
                                color={riskColor}
                                sx={{ minWidth: 60 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="info.contrastText">
                    <strong>Optimization Method:</strong> Linear Programming with constraints
                    • <strong>ML Components:</strong> LightGBM (24-feature price prediction),
                    Fuzzy-TOPSIS (suitability ranking), Rule-based heuristic (yield estimation)
                    • <strong>Constraints Applied:</strong> Water quota ({waterQuota} MCM),
                    Min. Paddy area ({minPaddy} ha), Risk tolerance ({riskTolerance})
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

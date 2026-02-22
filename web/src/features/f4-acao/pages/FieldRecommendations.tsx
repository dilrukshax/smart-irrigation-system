import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import GrassIcon from '@mui/icons-material/Grass';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useQuery } from '@tanstack/react-query';
import { acaoApi } from '../../../api/f4-acao.api';

export default function FieldRecommendations() {
  // Fetch recommendations from API
  const { data: recommendationsData, isLoading, error } = useQuery({
    queryKey: ['field-recommendations'],
    queryFn: acaoApi.getRecommendations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Failed to load recommendations. Please ensure the backend service is running.
        </Alert>
      </Box>
    );
  }

  // Transform API response to match component structure
  // Handle nested data structure from API response
  const fieldsData = recommendationsData?.data?.data || recommendationsData?.data || [];
  const fields = Array.isArray(fieldsData) ? fieldsData : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        ML-Powered Field Recommendations
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        AI-generated recommendations using Random Forest, LightGBM, and Fuzzy-TOPSIS models
      </Typography>

      {fields.length === 0 && (
        <Alert severity="info">
          No field recommendations available. Please add fields to the database.
        </Alert>
      )}

      <Grid container spacing={3}>
        {fields.map((field: any) => (
          <Grid item xs={12} key={field.field_id || field.fieldId}>
            <Card>
              <CardContent>
                {/* Field Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      {field.field_name || field.fieldName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {field.area_ha || field.area} hectares • {field.location || 'Unknown Location'}
                    </Typography>
                  </Box>
                  <Chip label={field.field_id || field.fieldId} variant="outlined" />
                </Box>

                {/* Field Details */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Soil Type</Typography>
                    <Typography variant="body2" fontWeight={500}>{field.soil_type || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Soil pH</Typography>
                    <Typography variant="body2" fontWeight={500}>{field.soil_ph || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Soil Suitability</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {field.soil_suitability ? `${(field.soil_suitability * 100).toFixed(0)}%` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Water Available</Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {field.water_availability_mm || 'N/A'} mm
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Crop Recommendations */}
                <Typography variant="h6" gutterBottom>
                  Top 3 Crop Recommendations (ML-Powered)
                </Typography>

                <Grid container spacing={2}>
                  {(field.recommendations || []).map((rec: any, idx: number) => {
                    const rank = rec.rank || idx + 1;
                    const cropName = rec.crop_name || rec.crop;
                    const suitability = rec.suitability_score || rec.suitability || 0;
                    const yieldEst = rec.expected_yield_t_per_ha || rec.yield_t_ha || 0;
                    const price = rec.predicted_price_per_kg || rec.price_per_kg || 0;
                    const profit = rec.expected_profit_per_ha || rec.profit_per_ha || rec.profit || 0;
                    const riskBand = rec.risk_band || rec.risk || 'unknown';
                    const rationale = rec.rationale || 'ML model recommendation based on field conditions';

                    const riskLabel = riskBand.charAt(0).toUpperCase() + riskBand.slice(1).toLowerCase();
                    const riskColor = riskLabel === 'Low' ? 'success' : riskLabel === 'Medium' ? 'warning' : 'error';

                    return (
                      <Grid item xs={12} md={4} key={rec.crop_id || rec.id || idx}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: rank === 1 ? 'primary.main' : 'divider',
                            borderWidth: rank === 1 ? 2 : 1,
                            height: '100%'
                          }}
                        >
                          <CardContent>
                            {/* Rank Badge */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Chip
                                label={`#${rank} Recommended`}
                                color={rank === 1 ? 'primary' : 'default'}
                                size="small"
                              />
                              <Chip label={riskLabel} size="small" color={riskColor} />
                            </Box>

                            {/* Crop Name */}
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                              {cropName}
                            </Typography>

                            {/* Suitability Score */}
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  ML Suitability Score
                                </Typography>
                                <Typography variant="caption" fontWeight={600}>
                                  {(suitability * 100).toFixed(0)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={suitability * 100}
                                sx={{ height: 6, borderRadius: 3 }}
                                color={suitability > 0.7 ? 'success' : suitability > 0.5 ? 'warning' : 'error'}
                              />
                            </Box>

                            {/* Key Metrics */}
                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GrassIcon fontSize="small" color="success" />
                                <Typography variant="body2">
                                  <strong>Yield:</strong> {yieldEst > 0 ? `${yieldEst.toFixed(1)} t/ha` : 'Calculating...'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MonetizationOnIcon fontSize="small" color="warning" />
                                <Typography variant="body2">
                                  <strong>Market Price:</strong> {price > 0 ? `Rs.${price.toFixed(0)}/kg` : 'Calculating...'}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpIcon fontSize="small" color="primary" />
                                <Typography variant="body2">
                                  <strong>Est. Profit:</strong> {profit > 0 ? `Rs.${(profit / 1000).toFixed(0)}K/ha` : 'Calculating...'}
                                </Typography>
                              </Box>
                            </Stack>

                            {/* Accordion for More Details */}
                            <Accordion elevation={0} sx={{ bgcolor: 'grey.50' }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="caption" fontWeight={600}>
                                  View ML Model Details
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Table size="small">
                                  <TableBody>
                                    <TableRow>
                                      <TableCell><strong>Crop ID:</strong></TableCell>
                                      <TableCell>{rec.crop_id || 'N/A'}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Suitability (Fuzzy-TOPSIS):</strong></TableCell>
                                      <TableCell>{(suitability * 100).toFixed(2)}%</TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Yield Prediction:</strong></TableCell>
                                      <TableCell>
                                        {yieldEst > 0 ? `${yieldEst.toFixed(2)} tonnes/ha` : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Price (LightGBM 24-features):</strong></TableCell>
                                      <TableCell>
                                        {price > 0 ? `Rs.${price.toFixed(2)}/kg` : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Gross Revenue:</strong></TableCell>
                                      <TableCell>
                                        {(yieldEst * 1000 * price) > 0
                                          ? `Rs.${((yieldEst * 1000 * price) / 1000).toFixed(0)}K/ha`
                                          : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Expected Profit:</strong></TableCell>
                                      <TableCell>
                                        {profit > 0 ? `Rs.${(profit / 1000).toFixed(0)}K/ha` : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell><strong>Risk Level:</strong></TableCell>
                                      <TableCell>
                                        <Chip label={riskLabel} size="small" color={riskColor} />
                                      </TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell colSpan={2}>
                                        <Typography variant="caption" color="text.secondary">
                                          <strong>Rationale:</strong> {rationale}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>

                                <Box sx={{ mt: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                                  <Typography variant="caption" color="info.contrastText">
                                    <strong>ML Models Used:</strong> Random Forest (Crop Classification),
                                    LightGBM (Price Prediction with 24 features), Rule-based Heuristic (Yield),
                                    Fuzzy-TOPSIS (Multi-criteria Suitability)
                                  </Typography>
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

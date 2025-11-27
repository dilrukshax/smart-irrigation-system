import { useState } from 'react';
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
} from '@mui/material';

const mockOptimizationResult = {
  status: 'optimal',
  totalProfit: 12500000,
  totalArea: 450,
  waterUsage: 2850,
  waterQuota: 3000,
  allocation: [
    { crop: 'Paddy', area: 200, profit: 5000000, water: 1400 },
    { crop: 'Vegetables', area: 100, profit: 4000000, water: 600 },
    { crop: 'Chili', area: 80, profit: 2400000, water: 480 },
    { crop: 'Onion', area: 70, profit: 1100000, water: 370 },
  ],
};

export default function OptimizationPlanner() {
  const [waterQuota, setWaterQuota] = useState(3000);
  const [minPaddy, setMinPaddy] = useState(150);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Optimization Planner
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure constraints and run the crop-area optimization model
      </Typography>

      <Grid container spacing={3}>
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
              defaultValue="medium"
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </TextField>

            <Button variant="contained" fullWidth sx={{ mt: 2 }}>
              Run Optimization
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Optimization Results
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Optimal solution found! Total expected profit: Rs. {(mockOptimizationResult.totalProfit / 1000000).toFixed(1)}M
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" fontWeight={600}>
                    {mockOptimizationResult.totalArea} ha
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Area
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" fontWeight={600}>
                    {mockOptimizationResult.waterUsage} MCM
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Water Usage
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h5" fontWeight={600} color="success.contrastText">
                    {((mockOptimizationResult.waterUsage / mockOptimizationResult.waterQuota) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Quota Usage
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Crop</TableCell>
                    <TableCell align="right">Area (ha)</TableCell>
                    <TableCell align="right">Profit (Rs.)</TableCell>
                    <TableCell align="right">Water (MCM)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockOptimizationResult.allocation.map((row) => (
                    <TableRow key={row.crop}>
                      <TableCell>{row.crop}</TableCell>
                      <TableCell align="right">{row.area}</TableCell>
                      <TableCell align="right">{(row.profit / 1000000).toFixed(1)}M</TableCell>
                      <TableCell align="right">{row.water}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

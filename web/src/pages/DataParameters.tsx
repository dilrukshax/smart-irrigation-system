import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import PublicSiteFrame from '@components/common/PublicSiteFrame';

const PARAMETER_ROWS = [
  {
    group: 'Field Parameters',
    description: 'Static and semi-static field context used for crop suitability.',
    fields: 'area_ha, soil_type, soil_ph, soil_ec, soil_suitability, location, latitude, longitude, elevation',
  },
  {
    group: 'Weather Parameters',
    description: 'Seasonal and weekly climate variables for model inference.',
    fields: 'season_avg_temp, season_rainfall_mm, temp_mean_weekly, temp_range_weekly, precip_weekly_sum, et0_weekly_sum, humidity',
  },
  {
    group: 'Water Parameters',
    description: 'Quota and coverage parameters for irrigation feasibility.',
    fields: 'water_availability_mm, water_quota_mm, water_coverage_ratio, irrigation_efficiency',
  },
  {
    group: 'Market Parameters',
    description: 'Economic assumptions used in profitability scoring.',
    fields: 'price_factor, price_volatility, demand_level, estimated_cost_per_ha, profit_per_ha, roi_percentage',
  },
];

export default function DataParameters() {
  return (
    <PublicSiteFrame
      title="Data Parameters"
      subtitle="A transparent view of all key model input groups used for analytics and optimization."
    >
      <Box sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden', bgcolor: 'white' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Group</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Why It Matters</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Data Fields</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {PARAMETER_ROWS.map((row) => (
              <TableRow key={row.group}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.group}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.fields}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Typography color="text.secondary" sx={{ mt: 2 }}>
        These parameters are consumed across F1-F4 workflows to support forecasting, risk detection, and adaptive optimization.
      </Typography>
    </PublicSiteFrame>
  );
}

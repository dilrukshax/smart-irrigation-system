import { Box, Typography, Grid, Card, CardContent, Chip, Rating, Divider } from '@mui/material';

const mockRecommendations = [
  {
    fieldId: 'F001',
    fieldName: 'Field A1',
    area: 5.2,
    recommendations: [
      { rank: 1, crop: 'Paddy', suitability: 0.89, profit: 125000, risk: 'Low' },
      { rank: 2, crop: 'Chili', suitability: 0.75, profit: 180000, risk: 'Medium' },
      { rank: 3, crop: 'Onion', suitability: 0.68, profit: 150000, risk: 'Medium' },
    ],
  },
  {
    fieldId: 'F002',
    fieldName: 'Field A2',
    area: 3.8,
    recommendations: [
      { rank: 1, crop: 'Vegetables', suitability: 0.92, profit: 200000, risk: 'Low' },
      { rank: 2, crop: 'Paddy', suitability: 0.78, profit: 95000, risk: 'Low' },
      { rank: 3, crop: 'Maize', suitability: 0.65, profit: 85000, risk: 'Medium' },
    ],
  },
  {
    fieldId: 'F003',
    fieldName: 'Field B1',
    area: 4.5,
    recommendations: [
      { rank: 1, crop: 'Paddy', suitability: 0.85, profit: 112000, risk: 'Low' },
      { rank: 2, crop: 'Banana', suitability: 0.72, profit: 165000, risk: 'High' },
      { rank: 3, crop: 'Cowpea', suitability: 0.70, profit: 78000, risk: 'Low' },
    ],
  },
];

export default function FieldRecommendations() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Field Recommendations
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Top-3 crop recommendations per field based on suitability, profit and risk analysis
      </Typography>

      <Grid container spacing={3}>
        {mockRecommendations.map((field) => (
          <Grid item xs={12} md={6} lg={4} key={field.fieldId}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{field.fieldName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {field.area} hectares
                    </Typography>
                  </Box>
                  <Chip label={field.fieldId} variant="outlined" size="small" />
                </Box>
                <Divider sx={{ mb: 2 }} />
                {field.recommendations.map((rec) => (
                  <Box
                    key={rec.rank}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      borderRadius: 1,
                      bgcolor: rec.rank === 1 ? 'primary.light' : 'grey.100',
                      color: rec.rank === 1 ? 'primary.contrastText' : 'inherit',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">
                        #{rec.rank} {rec.crop}
                      </Typography>
                      <Chip
                        label={rec.risk}
                        size="small"
                        color={rec.risk === 'Low' ? 'success' : rec.risk === 'Medium' ? 'warning' : 'error'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption">
                        Suitability: {(rec.suitability * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption">
                        Profit: Rs.{(rec.profit / 1000).toFixed(0)}K/ha
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { cropFieldsApi } from '../api/f1-irrigation.api';
import { acaoApi } from '../api/f4-acao.api';
import forecastingAPI from '../api/forecasting';
import cropHealthApi from '../features/f2-crop-health/api/cropHealth.api';
import { getFreshnessView } from '../utils/dataFreshness';

type CardState = {
  title: string;
  value: string;
  description: string;
  freshness: ReturnType<typeof getFreshnessView>;
};

export default function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-overview-live'],
    queryFn: async () => {
      const [fields, cropModel, forecast, optimization] = await Promise.allSettled([
        cropFieldsApi.getFields(),
        cropHealthApi.getModelStatus(),
        forecastingAPI.getBasicForecast(24),
        acaoApi.getRecommendations(),
      ]);
      return {
        fields,
        cropModel,
        forecast,
        optimization,
      };
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const fieldsValue =
    data?.fields.status === 'fulfilled'
      ? Array.isArray(data.fields.value.data)
        ? data.fields.value.data.length
        : 0
      : 0;
  const forecastValue =
    data?.forecast.status === 'fulfilled'
      ? Array.isArray(data.forecast.value?.predictions)
        ? data.forecast.value.predictions.length
        : 0
      : 0;
  const optimizationCount =
    data?.optimization.status === 'fulfilled'
      ? Number(data.optimization.value?.count || 0)
      : 0;

  const cards: CardState[] = [
    {
      title: 'Irrigation Fields',
      value: `${fieldsValue}`,
      description: 'Registered field configurations',
      freshness: getFreshnessView({
        status: data?.fields.status === 'fulfilled' ? 'ok' : 'data_unavailable',
        data_available: data?.fields.status === 'fulfilled',
      }),
    },
    {
      title: 'Crop Health Model',
      value:
        data?.cropModel.status === 'fulfilled'
          ? data.cropModel.value.model_loaded
            ? 'Ready'
            : 'Unavailable'
          : 'Unavailable',
      description: 'Image prediction model state',
      freshness: getFreshnessView({
        status:
          data?.cropModel.status === 'fulfilled' && data.cropModel.value.model_loaded
            ? 'ok'
            : data?.cropModel.status === 'fulfilled'
            ? data.cropModel.value.status
            : 'data_unavailable',
        data_available:
          data?.cropModel.status === 'fulfilled'
            ? Boolean(data.cropModel.value.model_loaded)
            : false,
      }),
    },
    {
      title: 'Forecast Horizon',
      value: `${forecastValue} points`,
      description: 'Live forecast samples returned',
      freshness: getFreshnessView(
        data?.forecast.status === 'fulfilled'
          ? data.forecast.value
          : { status: 'data_unavailable', data_available: false }
      ),
    },
    {
      title: 'Optimization Records',
      value: `${optimizationCount}`,
      description: 'Latest recommendation rows',
      freshness: getFreshnessView(
        data?.optimization.status === 'fulfilled'
          ? data.optimization.value
          : { status: 'data_unavailable', data_available: false }
      ),
    },
  ];

  const liveCount = cards.filter((card) => card.freshness.label === 'Live').length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Runtime status from live service endpoints only
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" color="text.secondary">
                    {card.title}
                  </Typography>
                  <Chip label={card.freshness.label} color={card.freshness.color} size="small" />
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {liveCount === 0 ? (
        <Alert severity="warning">No live data is currently available from upstream services.</Alert>
      ) : (
        <Alert severity="success">{liveCount} modules are currently reporting live data.</Alert>
      )}

      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          One or more dashboard modules failed to load.
        </Alert>
      )}
    </Box>
  );
}

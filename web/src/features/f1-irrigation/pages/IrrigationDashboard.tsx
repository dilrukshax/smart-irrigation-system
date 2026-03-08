import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { WaterDrop, Thermostat, Opacity, Water, ArrowForward, Agriculture } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { ROUTES } from '../../../config/routes';
import { cropFieldsApi } from '../../../api/f1-irrigation.api';
import { getFreshnessView } from '../../../utils/dataFreshness';

type FieldCard = {
  field_id: string;
  field_name: string;
  water_level: number | null;
  soil_moisture: number | null;
  status_label: string;
  freshness: ReturnType<typeof getFreshnessView>;
};

export default function IrrigationDashboard() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['irrigation-dashboard-live-status'],
    queryFn: async () => {
      const fieldsResponse = await cropFieldsApi.getFields();
      const fields = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [];
      const statuses = await Promise.all(
        fields.map(async (field) => {
          try {
            const statusResponse = await cropFieldsApi.getFieldStatus(field.field_id, false);
            return { field, status: statusResponse.data };
          } catch (_error) {
            return { field, status: null };
          }
        })
      );
      return statuses;
    },
    refetchInterval: 10000,
  });

  const cards: FieldCard[] =
    data?.map(({ field, status }) => {
      const freshness = getFreshnessView(
        status
          ? {
              status: status.status,
              data_available: status.data_available,
              is_live: status.is_live,
              staleness_sec: status.staleness_sec,
            }
          : { status: 'data_unavailable', data_available: false }
      );
      return {
        field_id: field.field_id,
        field_name: field.field_name,
        water_level: status?.current_water_level_pct ?? null,
        soil_moisture: status?.current_soil_moisture_pct ?? null,
        status_label: status?.overall_status || 'NO_DATA',
        freshness,
      };
    }) || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Irrigation Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Live field telemetry and irrigation state
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Water />}
          endIcon={<ArrowForward />}
          onClick={() => navigate(ROUTES.IRRIGATION.WATER_MANAGEMENT)}
        >
          Smart Water Management
        </Button>
      </Box>

      <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Water sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  ML-Powered Water Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reservoir decisions generated from backend live context
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" onClick={() => navigate(ROUTES.IRRIGATION.WATER_MANAGEMENT)}>
              Open Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Agriculture sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  IoT Crop Field Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Valve control and status from field telemetry streams
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" color="success" onClick={() => navigate(ROUTES.IRRIGATION.CROP_FIELDS)}>
              Manage Fields
            </Button>
          </Box>
        </CardContent>
      </Card>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : cards.length === 0 ? (
        <Alert severity="warning">No field configurations are available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {cards.map((field) => (
            <Grid item xs={12} sm={6} md={3} key={field.field_id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                    <Typography variant="h6">{field.field_name}</Typography>
                    <Chip label={field.freshness.label} color={field.freshness.color} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Status: {field.status_label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Opacity sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>
                      Water: {field.water_level !== null ? `${field.water_level.toFixed(1)}%` : 'Unavailable'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Thermostat sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography>Soil: {field.soil_moisture !== null ? `${field.soil_moisture.toFixed(1)}%` : 'Unavailable'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WaterDrop sx={{ mr: 1, color: 'info.main' }} />
                    <Typography>{field.freshness.label === 'Live' ? 'Streaming' : 'No live telemetry'}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load irrigation dashboard data.
        </Alert>
      )}
    </Box>
  );
}

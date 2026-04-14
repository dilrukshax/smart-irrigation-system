import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoGraph as AutoGraphIcon,
  Grass as CropHealthIcon,
  Info as InfoIcon,
  ShowChart as ForecastIcon,
  Speed as SpeedIcon,
  Water as WaterIcon,
  WaterDrop as WaterDropIcon,
} from '@mui/icons-material';

import { cropFieldsApi } from '@/api/f1-irrigation.api';
import { ROUTES } from '@/config/routes';

const formatPercent = (value: number | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(1)}%`;
};

const getRouteWithField = (basePath: string, fieldId: string, extras?: Record<string, string>): string => {
  const params = new URLSearchParams({ fieldId, ...extras });
  return `${basePath}?${params.toString()}`;
};

export default function FarmerFieldWorkspace() {
  const navigate = useNavigate();
  const { fieldId } = useParams<{ fieldId: string }>();

  const workspaceQuery = useQuery({
    queryKey: ['farmer-field-workspace', fieldId],
    enabled: Boolean(fieldId),
    queryFn: async () => {
      const [fieldResult, statusResult] = await Promise.allSettled([
        cropFieldsApi.getField(fieldId as string),
        cropFieldsApi.getFieldStatus(fieldId as string),
      ]);

      return {
        field: fieldResult.status === 'fulfilled' ? fieldResult.value.data : null,
        status: statusResult.status === 'fulfilled' ? statusResult.value.data : null,
        fieldError:
          fieldResult.status === 'rejected' ? 'Unable to load field details for this location.' : null,
        statusError:
          statusResult.status === 'rejected' ? 'Live status is unavailable right now.' : null,
      };
    },
  });

  const field = workspaceQuery.data?.field ?? null;
  const status = workspaceQuery.data?.status ?? null;

  const workspaceCards = useMemo(() => {
    if (!fieldId) {
      return [];
    }

    const lat = typeof field?.latitude === 'number' ? field.latitude.toFixed(6) : undefined;
    const lng = typeof field?.longitude === 'number' ? field.longitude.toFixed(6) : undefined;

    return [
      {
        title: 'Unified Field Profile',
        description: 'Open full field profile with irrigation, telemetry, and recommendation context.',
        to: ROUTES.FARMER.FIELD_PROFILE_WITH_ID(fieldId),
        icon: <InfoIcon color="primary" />,
      },
      {
        title: 'Water Management',
        description: 'Review auto decisions and control actions for this field.',
        to: getRouteWithField(ROUTES.IRRIGATION.WATER_MANAGEMENT, fieldId),
        icon: <WaterIcon color="primary" />,
      },
      {
        title: 'Sensor Telemetry',
        description: 'Inspect live ESP32 telemetry and history.',
        to: getRouteWithField(ROUTES.IRRIGATION.TELEMETRY, fieldId),
        icon: <SpeedIcon color="primary" />,
      },
      {
        title: 'Crop Health',
        description: 'Run crop health checks for this location.',
        to: getRouteWithField(ROUTES.CROP_HEALTH.ROOT, fieldId, {
          ...(lat ? { lat } : {}),
          ...(lng ? { lng } : {}),
        }),
        icon: <CropHealthIcon color="primary" />,
      },
      {
        title: 'Forecasting',
        description: 'Open weather and irrigation forecast for planning.',
        to: getRouteWithField(ROUTES.FORECASTING.ROOT, fieldId),
        icon: <ForecastIcon color="primary" />,
      },
      {
        title: 'Optimization Recommendations',
        description: 'View crop recommendations for this field.',
        to: getRouteWithField(ROUTES.OPTIMIZATION.RECOMMENDATIONS, fieldId),
        icon: <AutoGraphIcon color="primary" />,
      },
      {
        title: 'Scenario Evaluation',
        description: 'Compare planning scenarios with this field in context.',
        to: getRouteWithField(ROUTES.OPTIMIZATION.SCENARIOS, fieldId),
        icon: <WaterDropIcon color="primary" />,
      },
      {
        title: 'Adaptive Recommendations',
        description: 'Run adaptive optimization with customizable weights.',
        to: getRouteWithField(ROUTES.OPTIMIZATION.ADAPTIVE, fieldId),
        icon: <AutoGraphIcon color="primary" />,
      },
    ];
  }, [field?.latitude, field?.longitude, fieldId]);

  if (!fieldId) {
    return (
      <Alert severity="error">
        Field ID is missing. Return to My Fields and open a field again.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Field Workspace
          </Typography>
          <Typography color="text.secondary">
            Field: {field?.field_name || fieldId}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.FARMER.FIELDS)}>
            Back to My Fields
          </Button>
          <Button variant="contained" onClick={() => navigate(ROUTES.FARMER.ONBOARDING)}>
            Add Another Field
          </Button>
        </Stack>
      </Stack>

      {workspaceQuery.isLoading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading field workspace...
          </Typography>
        </Stack>
      )}

      {workspaceQuery.data?.fieldError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {workspaceQuery.data.fieldError}
        </Alert>
      )}

      {workspaceQuery.data?.statusError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {workspaceQuery.data.statusError}
        </Alert>
      )}

      {field && (
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Chip label={`Lifecycle: ${field.lifecycle_state || 'Unknown'}`} size="small" />
          <Chip label={`Pairing: ${field.pairing_status || 'Unknown'}`} size="small" />
          <Chip label={`Water: ${formatPercent(status?.current_water_level_pct)}`} size="small" color="info" />
          <Chip label={`Soil: ${formatPercent(status?.current_soil_moisture_pct)}`} size="small" color="success" />
          <Chip
            label={`Telemetry: ${status?.overall_status || 'Unknown'}`}
            size="small"
            color={status?.overall_status === 'OK' ? 'success' : 'default'}
          />
        </Stack>
      )}

      <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
        Field Functions
      </Typography>

      <Grid container spacing={2}>
        {workspaceCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                sx={{ height: '100%', alignItems: 'stretch' }}
                onClick={() => navigate(card.to)}
              >
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    {card.icon}
                    <Typography variant="subtitle1" fontWeight={700}>
                      {card.title}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

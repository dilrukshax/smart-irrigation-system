import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AddCircleOutline as AddCircleOutlineIcon,
  Agriculture as AgricultureIcon,
  Analytics as AnalyticsIcon,
  Sensors as SensorsIcon,
  WaterDrop as WaterDropIcon,
} from '@mui/icons-material';

import { cropFieldsApi } from '@/api/f1-irrigation.api';
import type { CropFieldConfig, CropFieldStatus } from '@/features/f1-irrigation/types';
import { ROUTES } from '@/config/routes';

const parseErrorDetail = (error: unknown, fallback: string): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
  ) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback;
  }
  return fallback;
};

interface FieldDashboardItem {
  config: CropFieldConfig;
  status: CropFieldStatus | null;
  statusError: string | null;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatCoordinate = (value: unknown): string => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return 'N/A';
  }
  return numeric.toFixed(4);
};

export default function FarmerPortal() {
  const navigate = useNavigate();

  const fieldsQuery = useQuery({
    queryKey: ['farmer-fields-dashboard'],
    queryFn: async (): Promise<FieldDashboardItem[]> => {
      const fieldsResponse = await cropFieldsApi.getFields();
      const fields = fieldsResponse.data || [];

      const statuses = await Promise.allSettled(
        fields.map(async (field) => {
          const statusResponse = await cropFieldsApi.getFieldStatus(field.field_id);
          return {
            fieldId: field.field_id,
            status: statusResponse.data,
          };
        })
      );

      const statusByFieldId = new Map<string, CropFieldStatus | null>();
      const errorByFieldId = new Map<string, string | null>();

      statuses.forEach((result, index) => {
        const fieldId = fields[index].field_id;
        if (result.status === 'fulfilled') {
          statusByFieldId.set(fieldId, result.value.status);
          errorByFieldId.set(fieldId, null);
        } else {
          statusByFieldId.set(fieldId, null);
          errorByFieldId.set(fieldId, 'Unable to load live field status');
        }
      });

      return fields.map((field) => ({
        config: field,
        status: statusByFieldId.get(field.field_id) || null,
        statusError: errorByFieldId.get(field.field_id) || null,
      }));
    },
    refetchInterval: 15000,
  });

  const fields = useMemo(() => fieldsQuery.data || [], [fieldsQuery.data]);

  const summary = useMemo(() => {
    const total = fields.length;
    const live = fields.filter((field) => field.status?.overall_status === 'OK').length;
    const noSensor = fields.filter((field) => field.status?.overall_status === 'NO_SENSOR').length;
    const warningOrCritical = fields.filter((field) => {
      const state = field.status?.overall_status;
      return state === 'WARNING' || state === 'CRITICAL';
    }).length;

    return { total, live, noSensor, warningOrCritical };
  }, [fields]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            My Fields
          </Typography>
          <Typography color="text.secondary">
            Select a field to open its workspace and continue with the right function flow.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => navigate(ROUTES.IRRIGATION.CROP_FIELDS)}
          >
            Crop Fields Admin View
          </Button>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate(ROUTES.FARMER.ONBOARDING)}
          >
            New Field Wizard
          </Button>
        </Stack>
      </Stack>

      {fieldsQuery.isLoading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Loading your fields...
          </Typography>
        </Stack>
      )}

      {fieldsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseErrorDetail(fieldsQuery.error, 'Failed to load fields from gateway.')}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Fields</Typography>
              <Typography variant="h4" fontWeight={700}>{summary.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Healthy / Live</Typography>
              <Typography variant="h4" fontWeight={700}>{summary.live}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Need Device Pairing</Typography>
              <Typography variant="h4" fontWeight={700}>{summary.noSensor}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Warning / Critical</Typography>
              <Typography variant="h4" fontWeight={700}>{summary.warningOrCritical}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {fields.length === 0 && !fieldsQuery.isLoading && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              No fields available yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Start by creating your first field in the onboarding wizard.
            </Typography>
            <Button variant="contained" onClick={() => navigate(ROUTES.FARMER.ONBOARDING)}>
              Create First Field
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {fields.map(({ config, status, statusError }) => (
          <Grid item xs={12} sm={6} md={4} key={config.field_id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                sx={{ height: '100%' }}
                onClick={() => navigate(ROUTES.FARMER.FIELD_WORKSPACE_WITH_ID(config.field_id))}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {config.field_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {config.field_id}
                      </Typography>
                    </Box>
                    <AgricultureIcon color="primary" />
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                    <Chip label={config.crop_type || 'unassigned'} size="small" />
                    <Chip label={config.soil_type || 'soil unknown'} size="small" variant="outlined" />
                    <Chip label={`${config.area_hectares.toFixed(2)} ha`} size="small" variant="outlined" />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Location: {config.location_name || 'Unnamed location'} ({formatCoordinate(config.latitude)}, {formatCoordinate(config.longitude)})
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={`Lifecycle: ${config.lifecycle_state || 'Unknown'}`}
                      color={config.lifecycle_state === 'LIVE' ? 'success' : 'default'}
                    />
                    <Chip size="small" label={`Pairing: ${config.pairing_status || 'UNPAIRED'}`} />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <WaterDropIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Water {typeof status?.current_water_level_pct === 'number' ? `${status.current_water_level_pct.toFixed(1)}%` : 'N/A'}
                    </Typography>
                    <SensorsIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {status?.overall_status || 'Status pending'}
                    </Typography>
                  </Stack>

                  {statusError && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                      {statusError}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

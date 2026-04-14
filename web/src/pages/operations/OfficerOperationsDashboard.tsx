import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { irrigationAuthorityApi } from '@/api/f1-irrigation.api';
import { useAuth } from '@/contexts/AuthContext';
import type { OfficerOverviewItem } from '@/features/f1-irrigation/types';

const statusColor = (status?: string): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'ok') {
    return 'success';
  }
  if (status === 'stale') {
    return 'warning';
  }
  if (status === 'data_unavailable' || status === 'source_unavailable') {
    return 'error';
  }
  return 'default';
};

export default function OfficerOperationsDashboard() {
  const { user, isOfficer, isAuthority } = useAuth();
  const canView = isOfficer || isAuthority;

  const schemeIds = useMemo(() => user?.scheme_ids || [], [user?.scheme_ids]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');

  const [items, setItems] = useState<OfficerOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schemeIds.length > 0 && !selectedSchemeId) {
      setSelectedSchemeId(schemeIds[0]);
    }
  }, [schemeIds, selectedSchemeId]);

  const loadOverview = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    if (schemeIds.length === 0) {
      setError('No assigned schemes. Officer operations are disabled until assignments are configured.');
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await irrigationAuthorityApi.getOfficerOverview(selectedSchemeId || schemeIds[0]);
      setItems(response.data.items || []);
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to load officer operations overview';
      setError(detail || 'Failed to load officer operations overview');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView, schemeIds, selectedSchemeId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (!canView) {
    return <Alert severity="error">Officer or authority role required.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Officer Operations Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Scheme-scoped overview for request backlog, telemetry freshness, and hydraulic planning workflow.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Scheme"
              value={selectedSchemeId}
              onChange={(event) => setSelectedSchemeId(event.target.value)}
              sx={{ minWidth: 260 }}
              disabled={schemeIds.length === 0}
            >
              {schemeIds.map((schemeId) => (
                <option key={schemeId} value={schemeId}>
                  {schemeId}
                </option>
              ))}
            </TextField>
            <Chip label={`Assigned schemes: ${schemeIds.length}`} variant="outlined" />
            {loading && <CircularProgress size={20} />}
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No overview data available for this scheme yet.</Alert>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.scheme_id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {item.scheme_id}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={item.status} color={statusColor(item.status)} size="small" />
                    <Chip label={item.data_available ? 'data available' : 'data unavailable'} size="small" variant="outlined" />
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Manual Request Queue
                        </Typography>
                        <Typography variant="body2">Pending: {item.queue.pending_requests}</Typography>
                        <Typography variant="body2">Open lifecycle: {item.queue.open_lifecycle_requests}</Typography>
                        <Typography variant="body2">Total: {item.queue.total_requests}</Typography>
                        <Chip
                          sx={{ mt: 1 }}
                          size="small"
                          label={item.queue.status}
                          color={statusColor(item.queue.status)}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Telemetry Freshness
                        </Typography>
                        <Typography variant="body2">Fields: {item.telemetry.total_fields}</Typography>
                        <Typography variant="body2">Fresh: {item.telemetry.fresh_fields}</Typography>
                        <Typography variant="body2">Stale: {item.telemetry.stale_fields}</Typography>
                        <Typography variant="body2">No data: {item.telemetry.no_telemetry_fields}</Typography>
                        <Chip
                          sx={{ mt: 1 }}
                          size="small"
                          label={item.telemetry.status}
                          color={statusColor(item.telemetry.status)}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Hydraulic Planning
                        </Typography>
                        <Typography variant="body2">Accepted: {item.hydraulic.accepted_schedules}</Typography>
                        <Typography variant="body2">Rejected: {item.hydraulic.rejected_schedules}</Typography>
                        <Typography variant="body2">Cancelled: {item.hydraulic.cancelled_schedules}</Typography>
                        <Typography variant="body2">Total: {item.hydraulic.total_schedules}</Typography>
                        <Chip
                          sx={{ mt: 1 }}
                          size="small"
                          label={item.hydraulic.status}
                          color={statusColor(item.hydraulic.status)}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {(item.queue.pending_requests > 0 || item.telemetry.stale_fields > 0 || item.hydraulic.rejected_schedules > 0) && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {item.queue.pending_requests > 0 && `${item.queue.pending_requests} pending request(s). `}
                    {item.telemetry.stale_fields > 0 && `${item.telemetry.stale_fields} stale telemetry field(s). `}
                    {item.hydraulic.rejected_schedules > 0 && `${item.hydraulic.rejected_schedules} rejected schedule(s).`}
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

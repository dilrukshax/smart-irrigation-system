import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { cropFieldsApi } from '@/api/f1-irrigation.api';
import { useAuth } from '@/contexts/AuthContext';
import type { ManualRequestItem } from '@/features/f1-irrigation/types';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'CLOSED'] as const;

export default function OfficerManualRequestsPage() {
  const { user, isOfficer, isAuthority } = useAuth();
  const canReview = isOfficer || isAuthority;
  const schemeIds = user?.scheme_ids || [];

  const [items, setItems] = useState<ManualRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [schemeIdFilter, setSchemeIdFilter] = useState('');
  const [fieldIdFilter, setFieldIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (schemeIds.length > 0 && !schemeIdFilter) {
      setSchemeIdFilter(schemeIds[0]);
    }
  }, [schemeIdFilter, schemeIds]);

  const loadItems = useCallback(async () => {
    if (!canReview) {
      setLoading(false);
      return;
    }
    if (schemeIds.length === 0) {
      setItems([]);
      setError('No assigned schemes. Officer queue is unavailable until assignments are configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await cropFieldsApi.listManualRequests({
        scheme_id: schemeIdFilter || schemeIds[0],
        field_id: fieldIdFilter || undefined,
        status: statusFilter || undefined,
        limit: 200,
      });
      setItems(response.data.items || []);
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to load manual requests';
      setError(detail || 'Failed to load manual requests');
    } finally {
      setLoading(false);
    }
  }, [canReview, fieldIdFilter, schemeIdFilter, schemeIds, statusFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleReview = async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
    setError(null);
    setMessage(null);
    try {
      await cropFieldsApi.reviewManualRequest(requestId, {
        decision,
        note: reviewNote || undefined,
      });
      setMessage(`Request ${requestId} ${decision.toLowerCase()}d`);
      await loadItems();
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to review request';
      setError(detail || 'Failed to review request');
    }
  };

  const handleClose = async (requestId: string) => {
    setError(null);
    setMessage(null);
    try {
      await cropFieldsApi.closeManualRequest(requestId, reviewNote || undefined);
      setMessage(`Request ${requestId} closed`);
      await loadItems();
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to close request';
      setError(detail || 'Failed to close request');
    }
  };

  if (!canReview) {
    return <Alert severity="error">Officer or authority role required.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Manual Request Queue
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Scheme-filtered queue for officer and authority review, execution, and closure lifecycle.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select
          SelectProps={{ native: true }}
          label="Scheme"
          value={schemeIdFilter}
          onChange={(e) => setSchemeIdFilter(e.target.value)}
          sx={{ minWidth: 220 }}
          disabled={schemeIds.length === 0}
        >
          {schemeIds.map((schemeId) => (
            <option key={schemeId} value={schemeId}>
              {schemeId}
            </option>
          ))}
        </TextField>
        <TextField
          label="Field ID Filter (optional)"
          value={fieldIdFilter}
          onChange={(e) => setFieldIdFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          select
          SelectProps={{ native: true }}
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </TextField>
        <TextField
          fullWidth
          label="Review/Closure Note"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
        <Button variant="outlined" onClick={loadItems}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No requests found for this filter.</Alert>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.request_id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {item.request_id}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.status}
                        color={item.status === 'PENDING' ? 'warning' : item.status === 'CLOSED' ? 'success' : 'default'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Scheme: {item.scheme_id || '-'} | Field: {item.field_id} | Action: {item.requested_action}{' '}
                      {item.requested_position_pct}% | Created: {item.created_at}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Reason: {item.reason}
                    </Typography>
                    {(item.policy_context || item.source_decision) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Policy: {String(item.policy_context?.policy_id || '-')} v
                        {String(item.policy_context?.policy_version || '-')} | Blocked:{' '}
                        {String(item.policy_context?.blocked_reason || '-')}
                      </Typography>
                    )}
                    {(item.audit || []).length > 0 && (
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {(item.audit || []).slice(-3).map((audit) => (
                          <Typography key={audit.audit_id} variant="caption" color="text.secondary">
                            {audit.created_at} | {audit.event_type} | {audit.actor_id || 'system'}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    {item.status === 'PENDING' && (
                      <>
                        <Button variant="outlined" color="success" onClick={() => handleReview(item.request_id, 'APPROVE')}>
                          Approve
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => handleReview(item.request_id, 'REJECT')}>
                          Reject
                        </Button>
                      </>
                    )}
                    {item.status !== 'PENDING' && item.status !== 'CLOSED' && (
                      <Button variant="outlined" onClick={() => handleClose(item.request_id)}>
                        Close
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}

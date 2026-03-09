import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import ScienceIcon from '@mui/icons-material/Science';
import { cropFieldsApi, waterManagementApi } from '@/api/f1-irrigation.api';
import { acaoApi } from '@/api/f4-acao.api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ManualRequestItem,
  UnifiedFieldProfile,
} from '../types';

const statusColor = (status?: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
  switch (status) {
    case 'ok':
      return 'success';
    case 'stale':
      return 'warning';
    case 'source_unavailable':
    case 'data_unavailable':
      return 'error';
    case 'analysis_pending':
      return 'info';
    default:
      return 'default';
  }
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export default function FieldProfilePage() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const { isAdmin } = useAuth();

  const [profile, setProfile] = useState<UnifiedFieldProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [manualAction, setManualAction] = useState<'OPEN' | 'CLOSE'>('OPEN');
  const [manualPosition, setManualPosition] = useState(100);
  const [manualReason, setManualReason] = useState('');

  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [manualRequests, setManualRequests] = useState<ManualRequestItem[]>([]);

  const [overrideAction, setOverrideAction] = useState<'OPEN' | 'CLOSE' | 'HOLD' | 'EMERGENCY_RELEASE'>('HOLD');
  const [overridePosition, setOverridePosition] = useState(0);
  const [overrideReason, setOverrideReason] = useState('Admin override from field profile');
  const [reservoirLevel, setReservoirLevel] = useState(85);

  const loadManualRequests = useCallback(async () => {
    if (!isAdmin || !fieldId) {
      return;
    }
    try {
      const response = await cropFieldsApi.listManualRequests({
        field_id: fieldId,
        status: 'PENDING',
        limit: 50,
      });
      setManualRequests(response.data.items || []);
    } catch (err) {
      console.error('Failed to load manual requests', err);
    }
  }, [fieldId, isAdmin]);

  const loadProfile = useCallback(async () => {
    if (!fieldId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await cropFieldsApi.getUnifiedFieldProfile(fieldId);
      setProfile(response.data);
    } catch (err) {
      console.error('Failed to load unified field profile', err);
      setError('Failed to load field profile from gateway');
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadManualRequests();
  }, [loadManualRequests]);

  const f1 = profile?.sections.f1;
  const f2 = profile?.sections.f2;
  const f3 = profile?.sections.f3;
  const f4 = profile?.sections.f4;

  const weatherSummary = useMemo(() => asRecord(f3?.weather_summary), [f3?.weather_summary]);
  const weatherCurrent = useMemo(() => asRecord(weatherSummary.current), [weatherSummary]);
  const irrigationRecommendation = useMemo(
    () => asRecord(f3?.irrigation_recommendation),
    [f3?.irrigation_recommendation]
  );
  const stressSummary = useMemo(() => asRecord(f2?.stress_summary), [f2?.stress_summary]);

  const recommendationsCount = useMemo(() => {
    const recommendations = asRecord(f4?.recommendations);
    const data = recommendations.data;
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof recommendations.count === 'number') {
      return recommendations.count;
    }
    return 0;
  }, [f4?.recommendations]);

  const handleCreateManualRequest = async () => {
    if (!fieldId || !manualReason.trim()) {
      setActionMessage('Reason is required for manual request');
      return;
    }
    try {
      const response = await cropFieldsApi.createManualRequest(fieldId, {
        requested_action: manualAction,
        requested_position_pct: manualAction === 'OPEN' ? manualPosition : 0,
        reason: manualReason.trim(),
      });
      setActionMessage(`Manual request created: ${response.data.request_id}`);
      setManualReason('');
      await Promise.all([loadProfile(), loadManualRequests()]);
    } catch (err) {
      console.error('Failed to create manual request', err);
      setActionMessage('Manual request creation failed');
    }
  };

  const handleReview = async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await cropFieldsApi.reviewManualRequest(requestId, {
        decision,
        note: adminReviewNote || undefined,
      });
      setActionMessage(`Request ${requestId} marked as ${decision}`);
      await Promise.all([loadProfile(), loadManualRequests()]);
    } catch (err) {
      console.error('Failed to review manual request', err);
      setActionMessage('Manual request review failed');
    }
  };

  const handleReservoirIngest = async () => {
    try {
      await waterManagementApi.ingestReservoirData({
        water_level_mmsl: reservoirLevel,
        total_storage_mcm: 268,
        active_storage_mcm: 180,
        inflow_mcm: 0.5,
        rain_mm: 2,
        main_canals_mcm: 0.3,
        lb_main_canal_mcm: 0.15,
        rb_main_canal_mcm: 0.15,
      });
      setActionMessage('Reservoir snapshot ingested');
      await loadProfile();
    } catch (err) {
      console.error('Failed to ingest reservoir snapshot', err);
      setActionMessage('Reservoir ingest failed');
    }
  };

  const handleSetOverride = async () => {
    try {
      await waterManagementApi.setManualOverride({
        action: overrideAction,
        valve_position: overridePosition,
        reason: overrideReason,
      });
      setActionMessage('Manual override set');
      await loadProfile();
    } catch (err) {
      console.error('Failed to set manual override', err);
      setActionMessage('Manual override failed');
    }
  };

  const handleCancelOverride = async () => {
    try {
      await waterManagementApi.cancelManualOverride();
      setActionMessage('Manual override cancelled');
      await loadProfile();
    } catch (err) {
      console.error('Failed to cancel manual override', err);
      setActionMessage('Cancel override failed');
    }
  };

  const handleRequestRecommendation = async () => {
    if (!fieldId) return;
    try {
      await acaoApi.getFieldRecommendations(fieldId);
      setActionMessage('Recommendation request sent');
      await loadProfile();
    } catch (err) {
      console.error('Failed to refresh recommendations', err);
      setActionMessage('Recommendation refresh failed');
    }
  };

  const handleRequestPlanB = async () => {
    if (!fieldId) return;
    try {
      await acaoApi.getPlanB(fieldId);
      setActionMessage('Plan B request sent');
      await loadProfile();
    } catch (err) {
      console.error('Failed to request Plan B', err);
      setActionMessage('Plan B request failed');
    }
  };

  const handleRunOptimize = async () => {
    try {
      await acaoApi.runOptimization({
        waterQuota: 3000,
        constraints: { minPaddyArea: 0, maxRiskLevel: 'high' },
      });
      setActionMessage('Optimization trigger sent');
      await loadProfile();
    } catch (err) {
      console.error('Failed to trigger optimization', err);
      setActionMessage('Optimization trigger failed');
    }
  };

  const handleRunScenario = async () => {
    if (!fieldId) return;
    try {
      await acaoApi.evaluateScenario({
        season: 'Maha-2025',
        field_ids: [fieldId],
        scenario_name: 'field-profile-trigger',
      });
      setActionMessage('Scenario evaluation trigger sent');
      await loadProfile();
    } catch (err) {
      console.error('Failed to trigger scenario evaluation', err);
      setActionMessage('Scenario trigger failed');
    }
  };

  if (!fieldId) {
    return <Alert severity="error">Field ID is required</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Unified Field Profile
          </Typography>
          <Typography color="text.secondary">Field: {fieldId}</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadProfile}>
          Refresh Profile
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {actionMessage && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setActionMessage(null)}>
          {actionMessage}
        </Alert>
      )}
      {profile?.partial_failure && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Partial data received. Dependencies unavailable: {profile.errors.join(' | ')}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <WaterDropIcon color="primary" />
                <Typography variant="h6">F1 Field Status + Decision</Typography>
                <Chip size="small" color={statusColor(f1?.status)} label={f1?.status || 'unknown'} />
              </Stack>
              <Typography variant="body2">
                Water: {f1?.field_status?.current_water_level_pct ?? '-'}% | Soil: {f1?.field_status?.current_soil_moisture_pct ?? '-'}%
              </Typography>
              <Typography variant="body2">
                Valve: {f1?.field_status?.valve_status || '-'} ({f1?.field_status?.valve_position_pct ?? '-'}%)
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Decision: {f1?.auto_decision?.action || '-'} | {f1?.auto_decision?.reason || 'No decision'}
              </Typography>
              {f1?.auto_decision?.manual_request_required && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Auto OPEN blocked by reservoir safety. Request ID: {f1.auto_decision.manual_request_id || 'pending'}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <ScienceIcon color="success" />
                <Typography variant="h6">F2 Stress Summary</Typography>
                <Chip size="small" color={statusColor(f2?.status)} label={f2?.status || 'unknown'} />
              </Stack>
              <Typography variant="body2">Stress Index: {String(stressSummary.stress_index ?? '-')}</Typography>
              <Typography variant="body2">Priority: {String(stressSummary.priority ?? '-')}</Typography>
              <Typography variant="body2">Penalty: {String(stressSummary.stress_penalty_factor ?? '-')}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <AutoModeIcon color="warning" />
                <Typography variant="h6">F3 Forecast + Irrigation</Typography>
                <Chip size="small" color={statusColor(f3?.status)} label={f3?.status || 'unknown'} />
              </Stack>
              <Typography variant="body2">
                Temperature: {String(weatherCurrent.temperature_c ?? '-')} C | Humidity: {String(weatherCurrent.humidity_percent ?? '-')}%
              </Typography>
              <Typography variant="body2">
                Overall Recommendation: {String(irrigationRecommendation.overall_recommendation ?? '-')}
              </Typography>
              <Button sx={{ mt: 1 }} size="small" variant="outlined" onClick={loadProfile}>
                Refresh Forecast
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">F4 Recommendations + Plan B</Typography>
                <Chip size="small" color={statusColor(f4?.status)} label={f4?.status || 'unknown'} />
              </Stack>
              <Typography variant="body2">Recommendations Count: {recommendationsCount}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={handleRequestRecommendation}>
                  Request Recommendation
                </Button>
                <Button size="small" variant="outlined" onClick={handleRequestPlanB}>
                  Request Plan B
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Farmer Actions
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <Select
                  size="small"
                  value={manualAction}
                  onChange={(e) => setManualAction(e.target.value as 'OPEN' | 'CLOSE')}
                >
                  <MenuItem value="OPEN">OPEN</MenuItem>
                  <MenuItem value="CLOSE">CLOSE</MenuItem>
                </Select>
                <TextField
                  size="small"
                  type="number"
                  label="Position %"
                  value={manualPosition}
                  onChange={(e) => setManualPosition(Number(e.target.value))}
                  disabled={manualAction === 'CLOSE'}
                />
                <TextField
                  size="small"
                  label="Reason"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={handleCreateManualRequest}>
                  Submit Manual Request
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {isAdmin && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <AdminPanelSettingsIcon color="error" />
                  <Typography variant="h6">Admin Actions</Typography>
                </Stack>

                <Typography variant="subtitle1">Pending Manual Requests</Typography>
                {manualRequests.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No pending manual requests for this field.
                  </Typography>
                )}
                {manualRequests.map((request) => (
                  <Box key={request.request_id} sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2">
                      {request.request_id} | {request.requested_action} {request.requested_position_pct}% | {request.reason}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button size="small" color="success" variant="outlined" onClick={() => handleReview(request.request_id, 'APPROVE')}>
                        Approve
                      </Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => handleReview(request.request_id, 'REJECT')}>
                        Reject
                      </Button>
                    </Stack>
                  </Box>
                ))}

                <TextField
                  size="small"
                  label="Admin Review Note"
                  value={adminReviewNote}
                  onChange={(e) => setAdminReviewNote(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Reservoir Level mMSL"
                    value={reservoirLevel}
                    onChange={(e) => setReservoirLevel(Number(e.target.value))}
                  />
                  <Button variant="outlined" onClick={handleReservoirIngest}>
                    Ingest Reservoir Snapshot
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2 }}>
                  <Select
                    size="small"
                    value={overrideAction}
                    onChange={(e) =>
                      setOverrideAction(
                        e.target.value as 'OPEN' | 'CLOSE' | 'HOLD' | 'EMERGENCY_RELEASE'
                      )
                    }
                  >
                    <MenuItem value="OPEN">OPEN</MenuItem>
                    <MenuItem value="CLOSE">CLOSE</MenuItem>
                    <MenuItem value="HOLD">HOLD</MenuItem>
                    <MenuItem value="EMERGENCY_RELEASE">EMERGENCY_RELEASE</MenuItem>
                  </Select>
                  <TextField
                    size="small"
                    type="number"
                    label="Valve %"
                    value={overridePosition}
                    onChange={(e) => setOverridePosition(Number(e.target.value))}
                  />
                  <TextField
                    size="small"
                    label="Override Reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={handleSetOverride}>
                    Set Override
                  </Button>
                  <Button variant="outlined" color="warning" onClick={handleCancelOverride}>
                    Cancel Override
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={handleRunOptimize}>
                    Run Optimize
                  </Button>
                  <Button variant="outlined" onClick={handleRunScenario}>
                    Run Scenario
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { irrigationAuthorityApi } from '@/api/f1-irrigation.api';
import type {
  AuthorityPolicyItem,
  HydraulicScheduleItem,
  HydraulicTopologyNode,
} from '@/features/f1-irrigation/types';
import { useAuth } from '@/contexts/AuthContext';

type ActivePolicySummary = {
  policy_id?: string;
  version?: number;
  quota_mcm?: number;
  emergency_mode?: string | null;
} | null;

export default function AuthorityPoliciesPage() {
  const { isAuthority } = useAuth();

  const [schemeId, setSchemeId] = useState('scheme-default');
  const [quotaMcm, setQuotaMcm] = useState(100);
  const [maxFieldOpenPct, setMaxFieldOpenPct] = useState(70);
  const [emergencyMode, setEmergencyMode] = useState('');
  const [selectedDraftPolicyId, setSelectedDraftPolicyId] = useState<string>('');

  const [turnoutId, setTurnoutId] = useState('scheme-default-turnout-main-1');
  const [channelId, setChannelId] = useState('scheme-default-channel-main');
  const [tunnelId, setTunnelId] = useState('scheme-default-tunnel-main');
  const [canalId, setCanalId] = useState('scheme-default-canal-main');
  const [scheduleStart, setScheduleStart] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [scheduleEnd, setScheduleEnd] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const [activePolicy, setActivePolicy] = useState<ActivePolicySummary>(null);
  const [policies, setPolicies] = useState<AuthorityPolicyItem[]>([]);
  const [schedules, setSchedules] = useState<HydraulicScheduleItem[]>([]);
  const [topology, setTopology] = useState<HydraulicTopologyNode[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [networkRes, policiesRes, schedulesRes, topologyRes] = await Promise.all([
        irrigationAuthorityApi.getNetworkState(schemeId),
        irrigationAuthorityApi.listPolicies({ scheme_id: schemeId, limit: 200 }),
        irrigationAuthorityApi.listNetworkSchedules({ scheme_id: schemeId, limit: 200 }),
        irrigationAuthorityApi.getNetworkTopology(schemeId),
      ]);

      const network = networkRes.data as { active_policy?: ActivePolicySummary };
      setActivePolicy(network.active_policy || null);
      setPolicies((policiesRes.data.items || []) as AuthorityPolicyItem[]);
      setSchedules((schedulesRes.data.items || []) as HydraulicScheduleItem[]);
      setTopology((topologyRes.data.items || []) as HydraulicTopologyNode[]);
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to load authority policy data';
      setError(detail || 'Failed to load authority policy data');
    } finally {
      setLoading(false);
    }
  }, [schemeId]);

  useEffect(() => {
    if (isAuthority) {
      loadData();
    }
  }, [isAuthority, loadData]);

  const draftPolicies = useMemo(
    () => policies.filter((p) => p.status === 'DRAFT').sort((a, b) => b.version - a.version),
    [policies]
  );

  const handleCreateDraft = async () => {
    setError(null);
    setMessage(null);
    try {
      const response = await irrigationAuthorityApi.createPolicy({
        scheme_id: schemeId,
        quota_mcm: quotaMcm,
        max_field_open_pct: maxFieldOpenPct,
        emergency_mode: emergencyMode || undefined,
      });
      const created = response.data as AuthorityPolicyItem;
      setSelectedDraftPolicyId(created.policy_id);
      setMessage(`Draft policy created: ${created.policy_id} (v${created.version})`);
      await loadData();
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to create draft policy';
      setError(detail || 'Failed to create draft policy');
    }
  };

  const handlePublish = async () => {
    if (!selectedDraftPolicyId) {
      setError('Select or create a draft policy first.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const response = await irrigationAuthorityApi.publishPolicy(selectedDraftPolicyId);
      const published = response.data as AuthorityPolicyItem;
      setMessage(`Policy published: ${published.policy_id} (v${published.version})`);
      await loadData();
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to publish policy';
      setError(detail || 'Failed to publish policy');
    }
  };

  const handleCreateSchedule = async () => {
    setError(null);
    setMessage(null);
    try {
      const response = await irrigationAuthorityApi.createNetworkSchedule({
        scheme_id: schemeId,
        canal_id: canalId || undefined,
        tunnel_id: tunnelId || undefined,
        channel_id: channelId || undefined,
        turnout_id: turnoutId || undefined,
        action: 'OPEN',
        expected_flow_m3s: 2,
        start_time: new Date(scheduleStart).toISOString(),
        end_time: new Date(scheduleEnd).toISOString(),
        reason: 'Authority planned release',
      });
      const created = response.data as HydraulicScheduleItem;
      if (created.status === 'REJECTED') {
        setError(created.conflict_reason || 'Schedule rejected');
      } else {
        setMessage(`Schedule accepted: ${created.schedule_id}`);
      }
      await loadData();
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to create schedule';
      setError(detail || 'Failed to create schedule');
    }
  };

  if (!isAuthority) {
    return <Alert severity="error">Authority role required.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Authority Policy and Scheduling Console
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Manage versioned policy lifecycle, scheme-scoped constraints, and hydraulic schedules.
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

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField label="Scheme ID" value={schemeId} onChange={(e) => setSchemeId(e.target.value)} sx={{ maxWidth: 280 }} />
            <Button variant="outlined" onClick={loadData} disabled={loading}>
              Refresh Scheme
            </Button>
            {loading && <CircularProgress size={20} />}
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          {activePolicy?.policy_id ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Active: ${activePolicy.policy_id}`} color="success" />
              <Chip label={`Version: ${activePolicy.version ?? '-'}`} variant="outlined" />
              <Chip label={`Quota: ${activePolicy.quota_mcm ?? '-'} mcm`} variant="outlined" />
              <Chip label={`Emergency: ${activePolicy.emergency_mode || 'none'}`} variant="outlined" />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No published policy for this scheme.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Draft and Publish
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Quota (mcm)"
                  type="number"
                  value={quotaMcm}
                  onChange={(e) => setQuotaMcm(Number(e.target.value))}
                />
                <TextField
                  label="Max Field Open %"
                  type="number"
                  value={maxFieldOpenPct}
                  onChange={(e) => setMaxFieldOpenPct(Number(e.target.value))}
                />
                <TextField
                  label="Emergency Mode (optional)"
                  value={emergencyMode}
                  onChange={(e) => setEmergencyMode(e.target.value)}
                />
                <Button variant="outlined" onClick={handleCreateDraft}>
                  Create Draft
                </Button>
                <TextField
                  label="Draft Policy ID to Publish"
                  value={selectedDraftPolicyId}
                  onChange={(e) => setSelectedDraftPolicyId(e.target.value)}
                />
                <Button variant="contained" color="error" onClick={handlePublish}>
                  Publish Draft
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Policy Versions
              </Typography>
              <Stack spacing={1}>
                {policies.length === 0 && <Typography color="text.secondary">No policy versions found.</Typography>}
                {policies.map((policy) => (
                  <Box key={policy.policy_id} sx={{ border: '1px solid', borderColor: 'divider', p: 1.25, borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap">
                      <Chip label={policy.status} size="small" color={policy.status === 'PUBLISHED' ? 'success' : 'default'} />
                      <Typography variant="body2" fontWeight={600}>
                        {policy.policy_id} (v{policy.version})
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Quota: {policy.quota_mcm} mcm | Max Open: {policy.max_field_open_pct}% | Emergency: {policy.emergency_mode || 'none'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Hydraulic Schedule
              </Typography>
              <Stack spacing={1.5}>
                <TextField label="Canal ID" value={canalId} onChange={(e) => setCanalId(e.target.value)} />
                <TextField label="Tunnel ID" value={tunnelId} onChange={(e) => setTunnelId(e.target.value)} />
                <TextField label="Channel ID" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
                <TextField label="Turnout ID" value={turnoutId} onChange={(e) => setTurnoutId(e.target.value)} />
                <TextField
                  label="Start"
                  type="datetime-local"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End"
                  type="datetime-local"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Button variant="outlined" onClick={handleCreateSchedule}>
                  Create Schedule
                </Button>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Topology Nodes
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {topology.map((node) => (
                  <Chip key={node.node_id} size="small" label={`${node.node_type}:${node.node_id}`} variant="outlined" />
                ))}
                {topology.length === 0 && <Typography color="text.secondary">No topology nodes found for this scheme.</Typography>}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recent Schedules
              </Typography>
              <Stack spacing={1}>
                {schedules.length === 0 && <Typography color="text.secondary">No schedules found.</Typography>}
                {schedules.map((schedule) => (
                  <Box key={schedule.schedule_id} sx={{ border: '1px solid', borderColor: 'divider', p: 1.25, borderRadius: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                      <Chip
                        size="small"
                        label={schedule.status}
                        color={schedule.status === 'ACCEPTED' ? 'success' : 'error'}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {schedule.schedule_id}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {schedule.action} | Turnout: {schedule.turnout_id || '-'} | Start: {schedule.start_time}
                    </Typography>
                    {schedule.conflict_reason && (
                      <Typography variant="body2" color="error.main">
                        {schedule.conflict_reason}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
              {draftPolicies.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Draft versions available: {draftPolicies.map((p) => `v${p.version}`).join(', ')}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

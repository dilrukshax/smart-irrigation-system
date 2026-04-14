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
import { irrigationAuthorityApi } from '@/api/f1-irrigation.api';
import { useAuth } from '@/contexts/AuthContext';
import type { HydraulicScheduleItem, HydraulicTopologyNode } from '@/features/f1-irrigation/types';

export default function OfficerHydraulicsPage() {
  const { user, isOfficer, isAuthority } = useAuth();
  const canOperate = isOfficer || isAuthority;
  const schemeIds = user?.scheme_ids || [];

  const [schemeId, setSchemeId] = useState('');
  const [turnoutId, setTurnoutId] = useState('scheme-default-turnout-main-1');
  const [channelId, setChannelId] = useState('scheme-default-channel-main');
  const [tunnelId, setTunnelId] = useState('scheme-default-tunnel-main');
  const [canalId, setCanalId] = useState('scheme-default-canal-main');
  const [start, setStart] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [end, setEnd] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const [schedules, setSchedules] = useState<HydraulicScheduleItem[]>([]);
  const [topology, setTopology] = useState<HydraulicTopologyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (schemeIds.length > 0 && !schemeId) {
      setSchemeId(schemeIds[0]);
    }
  }, [schemeId, schemeIds]);

  useEffect(() => {
    if (!schemeId) {
      return;
    }
    setCanalId(`${schemeId}-canal-main`);
    setTunnelId(`${schemeId}-tunnel-main`);
    setChannelId(`${schemeId}-channel-main`);
    setTurnoutId(`${schemeId}-turnout-main-1`);
  }, [schemeId]);

  const loadData = useCallback(async () => {
    if (!canOperate) {
      return;
    }
    if (schemeIds.length === 0) {
      setError('No assigned schemes. Hydraulic planning is unavailable until assignments are configured.');
      setSchedules([]);
      setTopology([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [schedulesRes, topologyRes] = await Promise.all([
        irrigationAuthorityApi.listNetworkSchedules({ scheme_id: schemeId || schemeIds[0], limit: 200 }),
        irrigationAuthorityApi.getNetworkTopology(schemeId || schemeIds[0]),
      ]);
      setSchedules((schedulesRes.data.items || []) as HydraulicScheduleItem[]);
      setTopology((topologyRes.data.items || []) as HydraulicTopologyNode[]);
    } catch (err) {
      const detail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to load hydraulic data';
      setError(detail || 'Failed to load hydraulic data');
    } finally {
      setLoading(false);
    }
  }, [canOperate, schemeId, schemeIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (schemeIds.length === 0) {
      setError('No assigned schemes. Cannot create schedule.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const response = await irrigationAuthorityApi.createNetworkSchedule({
        scheme_id: schemeId || schemeIds[0],
        canal_id: canalId || undefined,
        tunnel_id: tunnelId || undefined,
        channel_id: channelId || undefined,
        turnout_id: turnoutId || undefined,
        action: 'OPEN',
        expected_flow_m3s: 2,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        reason: 'Officer hydraulic control',
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

  if (!canOperate) {
    return <Alert severity="error">Officer or authority role required.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Hydraulic Operations
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Officer console for turnout scheduling with topology and policy validation.
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Scheme"
              value={schemeId}
              onChange={(e) => setSchemeId(e.target.value)}
              sx={{ minWidth: 220 }}
              disabled={schemeIds.length === 0}
            >
              {schemeIds.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </TextField>
            <Button variant="outlined" onClick={loadData}>
              Refresh
            </Button>
            {loading && <CircularProgress size={20} />}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create Schedule
          </Typography>
          <Stack spacing={1.25}>
            <TextField label="Canal ID" value={canalId} onChange={(e) => setCanalId(e.target.value)} />
            <TextField label="Tunnel ID" value={tunnelId} onChange={(e) => setTunnelId(e.target.value)} />
            <TextField label="Channel ID" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            <TextField label="Turnout ID" value={turnoutId} onChange={(e) => setTurnoutId(e.target.value)} />
            <TextField label="Start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="End" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="outlined" onClick={handleCreate}>
              Create Schedule
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Topology
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {topology.map((node) => (
              <Chip key={node.node_id} size="small" label={`${node.node_type}:${node.node_id}`} variant="outlined" />
            ))}
            {topology.length === 0 && <Typography color="text.secondary">No topology nodes found.</Typography>}
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
            {schedules.map((item) => (
              <Box key={item.schedule_id} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip size="small" label={item.status} color={item.status === 'ACCEPTED' ? 'success' : 'error'} />
                  <Typography variant="body2" fontWeight={600}>
                    {item.schedule_id}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {item.action} | Turnout: {item.turnout_id || '-'} | {item.start_time}
                </Typography>
                {item.conflict_reason && (
                  <Typography variant="body2" color="error.main">
                    {item.conflict_reason}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

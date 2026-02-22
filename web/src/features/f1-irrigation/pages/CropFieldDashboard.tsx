import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  LinearProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Collapse,
} from '@mui/material';
import {
  Water,
  Opacity,
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  AutoMode,
  Agriculture,
  Sensors,
  SensorsOff,
  Speed,
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  SignalWifiOff,
} from '@mui/icons-material';
import { cropFieldsApi } from '../../../api/f1-irrigation.api';
import type {
  CropFieldConfig,
  CropFieldStatus,
  CropDefaults,
  ValveControlRequest,
} from '../types';

// Status color mapping
const getWaterStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'OPTIMAL': return 'success';
    case 'LOW':
    case 'HIGH': return 'warning';
    case 'CRITICAL':
    case 'EXCESS': return 'error';
    default: return 'info';
  }
};

const getSoilStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'OPTIMAL': return 'success';
    case 'DRY':
    case 'WET': return 'warning';
    case 'CRITICAL':
    case 'SATURATED': return 'error';
    default: return 'info';
  }
};

const getOverallStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default' => {
  switch (status) {
    case 'OK': return 'success';
    case 'WARNING': return 'warning';
    case 'CRITICAL': return 'error';
    case 'IRRIGATING': return 'primary';
    case 'NO_SENSOR': return 'default';
    default: return 'info';
  }
};

const getCropIcon = (cropType: string) => {
  switch (cropType) {
    case 'rice': return '🌾';
    case 'wheat': return '🌿';
    case 'vegetables': return '🥬';
    case 'sugarcane': return '🎋';
    default: return '🌱';
  }
};

// Field Card Component with live sensor data
interface FieldCardProps {
  field: CropFieldConfig;
  status: CropFieldStatus | null;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

function FieldCard({ field, status, isSelected, onSelect, onDelete, onRefresh }: FieldCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card 
      sx={{ 
        height: '100%',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h3" component="span">{getCropIcon(field.crop_type)}</Typography>
            <Box>
              <Typography variant="h6" fontWeight={600}>{field.field_name}</Typography>
              <Chip 
                label={field.crop_type.toUpperCase()} 
                size="small" 
                variant="outlined"
                color="primary"
              />
            </Box>
          </Box>
          {status && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Chip
                icon={
                  status.overall_status === 'OK' ? <CheckCircle /> :
                  status.overall_status === 'IRRIGATING' ? <Water /> :
                  status.overall_status === 'CRITICAL' ? <ErrorIcon /> :
                  status.overall_status === 'NO_SENSOR' ? <SensorsOff /> : <Warning />
                }
                label={status.overall_status === 'NO_SENSOR' ? 'NO SENSOR' : status.overall_status}
                color={getOverallStatusColor(status.overall_status) as 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default'}
                size="small"
              />
              {/* Sensor connection indicator */}
              <Chip
                icon={status.sensor_connected ? <Sensors /> : <SignalWifiOff />}
                label={status.sensor_connected ? 'Connected' : (status.is_simulated ? 'Simulated' : 'Disconnected')}
                size="small"
                variant="outlined"
                color={status.sensor_connected ? 'success' : (status.is_simulated ? 'info' : 'error')}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </Box>
          )}
        </Box>

        {/* Sensor Data */}
        {status ? (
          status.overall_status === 'NO_SENSOR' && !status.is_simulated ? (
            /* No Sensor Detected State */
            <Box sx={{ mt: 2, textAlign: 'center', py: 3 }}>
              <SensorsOff sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary" fontWeight={600}>
                Sensor Not Detected
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {field.device_id 
                  ? `Waiting for device: ${field.device_id}` 
                  : 'No IoT device assigned to this field'
                }
              </Typography>
              {status.last_real_data_time && (
                <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                  Last data: {new Date(status.last_real_data_time).toLocaleString()}
                </Typography>
              )}
            </Box>
          ) : (
            /* Normal Sensor Data Display */
            <Box sx={{ mt: 2 }}>
              {/* Simulated data indicator */}
              {status.is_simulated && (
                <Alert severity="info" sx={{ mb: 2, py: 0 }} icon={<Sensors sx={{ fontSize: 18 }} />}>
                  <Typography variant="caption">
                    Using simulated data. Connect IoT device for real readings.
                  </Typography>
                </Alert>
              )}
              
              {/* Water Level */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Water sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="body2">Water Level</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {status.current_water_level_pct.toFixed(1)}%
                    </Typography>
                    <Chip 
                      label={status.water_status} 
                      size="small" 
                      color={getWaterStatusColor(status.water_status)}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={status.current_water_level_pct} 
                  color={getWaterStatusColor(status.water_status)}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Range: {field.water_level_min_pct}% - {field.water_level_max_pct}%
                </Typography>
              </Box>

              {/* Soil Moisture */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Opacity sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">Soil Moisture</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {status.current_soil_moisture_pct.toFixed(1)}%
                    </Typography>
                  <Chip 
                    label={status.soil_status} 
                    size="small" 
                    color={getSoilStatusColor(status.soil_status)}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={status.current_soil_moisture_pct} 
                color={getSoilStatusColor(status.soil_status)}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary">
                Range: {field.soil_moisture_min_pct}% - {field.soil_moisture_max_pct}%
              </Typography>
            </Box>

            {/* Valve Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Speed sx={{ fontSize: 18, color: 'warning.main' }} />
                <Typography variant="body2">Valve</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={status.valve_status === 'OPEN' ? <PlayArrow /> : <Stop />}
                  label={`${status.valve_status} (${status.valve_position_pct}%)`}
                  size="small"
                  color={status.valve_status === 'OPEN' ? 'success' : 'default'}
                />
                {status.auto_control_enabled && (
                  <Chip icon={<AutoMode />} label="Auto" size="small" color="info" sx={{ height: 20 }} />
                )}
              </Box>
            </Box>
          </Box>
          )
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Expandable Details */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Thresholds</Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Water Min/Max</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    {field.water_level_min_pct}% / {field.water_level_max_pct}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Soil Min/Max</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    {field.soil_moisture_min_pct}% / {field.soil_moisture_max_pct}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Device ID</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    {field.device_id || 'Not assigned'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Area</TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    {field.area_hectares} ha
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
        <Button 
          size="small" 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        >
          {expanded ? 'Less' : 'More'}
        </Button>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRefresh(); }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Field">
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}

// Main Dashboard Component
export default function CropFieldDashboard() {
  // State
  const [fields, setFields] = useState<CropFieldConfig[]>([]);
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, CropFieldStatus>>({});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [cropDefaults, setCropDefaults] = useState<Record<string, CropDefaults>>({});
  const [supportedCrops, setSupportedCrops] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dialog states
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [valveDialogOpen, setValveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  // Add field form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newCropType, setNewCropType] = useState('rice');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newAreaHectares, setNewAreaHectares] = useState(1);
  const [newFieldThresholds, setNewFieldThresholds] = useState({
    water_level_min_pct: 50,
    water_level_max_pct: 80,
    water_level_optimal_pct: 65,
    water_level_critical_pct: 30,
    soil_moisture_min_pct: 70,
    soil_moisture_max_pct: 95,
    soil_moisture_optimal_pct: 85,
    soil_moisture_critical_pct: 50,
  });

  // Valve control form state
  const [valveAction, setValveAction] = useState<'OPEN' | 'CLOSE' | 'AUTO'>('AUTO');
  const [valvePosition, setValvePosition] = useState<number>(100);
  const [valveReason, setValveReason] = useState<string>('');

  // Fetch crop defaults
  const fetchCropDefaults = async () => {
    try {
      const res = await cropFieldsApi.getCropDefaults();
      setCropDefaults(res.data.crops);
      setSupportedCrops(res.data.supported_crops);
    } catch (err) {
      console.error('Failed to fetch crop defaults:', err);
    }
  };

  // Fetch fields list
  const fetchFields = async () => {
    try {
      const res = await cropFieldsApi.getFields();
      setFields(res.data);
      
      // Select first field if none selected
      if (!selectedField && res.data.length > 0) {
        setSelectedField(res.data[0].field_id);
      }
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    }
  };

  // Fetch status for all fields
  const fetchAllFieldStatuses = useCallback(async () => {
    try {
      const statuses: Record<string, CropFieldStatus> = {};
      await Promise.all(
        fields.map(async (field) => {
          try {
            const res = await cropFieldsApi.getFieldStatus(field.field_id);
            statuses[field.field_id] = res.data;
          } catch (err) {
            console.error(`Failed to fetch status for ${field.field_id}:`, err);
          }
        })
      );
      setFieldStatuses(statuses);
    } catch (err) {
      console.error('Failed to fetch field statuses:', err);
    }
  }, [fields]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchCropDefaults(), fetchFields()]);
      setLoading(false);
    };
    loadInitialData();
  }, []);

  // Fetch all field statuses when fields change
  useEffect(() => {
    if (fields.length > 0) {
      fetchAllFieldStatuses();
    }
  }, [fields, fetchAllFieldStatuses]);

  // Auto refresh all field statuses
  useEffect(() => {
    if (autoRefresh && fields.length > 0) {
      const interval = setInterval(fetchAllFieldStatuses, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fields, fetchAllFieldStatuses]);

  // Update thresholds when crop type changes
  useEffect(() => {
    if (cropDefaults[newCropType]) {
      const defaults = cropDefaults[newCropType];
      setNewFieldThresholds({
        water_level_min_pct: defaults.water_level_min_pct,
        water_level_max_pct: defaults.water_level_max_pct,
        water_level_optimal_pct: defaults.water_level_optimal_pct,
        water_level_critical_pct: defaults.water_level_critical_pct,
        soil_moisture_min_pct: defaults.soil_moisture_min_pct,
        soil_moisture_max_pct: defaults.soil_moisture_max_pct,
        soil_moisture_optimal_pct: defaults.soil_moisture_optimal_pct,
        soil_moisture_critical_pct: defaults.soil_moisture_critical_pct,
      });
    }
  }, [newCropType, cropDefaults]);

  // Handle add field
  const handleAddField = async () => {
    try {
      const fieldId = `field-${newCropType}-${Date.now()}`;
      const newField: CropFieldConfig = {
        field_id: fieldId,
        field_name: newFieldName,
        crop_type: newCropType,
        area_hectares: newAreaHectares,
        device_id: newDeviceId || null,
        ...newFieldThresholds,
        irrigation_duration_minutes: 30,
        auto_control_enabled: true,
      };

      await cropFieldsApi.createField(newField);
      setAddFieldDialogOpen(false);
      resetAddFieldForm();
      await fetchFields();
    } catch (err) {
      console.error('Failed to add field:', err);
      setError('Failed to add field. Please try again.');
    }
  };

  // Reset add field form
  const resetAddFieldForm = () => {
    setNewFieldName('');
    setNewCropType('rice');
    setNewDeviceId('');
    setNewAreaHectares(1);
  };

  // Handle delete field
  const handleDeleteField = async () => {
    if (!fieldToDelete) return;

    try {
      await cropFieldsApi.deleteField(fieldToDelete);
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
      if (selectedField === fieldToDelete) {
        setSelectedField(null);
      }
      await fetchFields();
    } catch (err) {
      console.error('Failed to delete field:', err);
      setError('Failed to delete field.');
    }
  };

  // Handle valve control
  const handleValveControl = async () => {
    if (!selectedField) return;

    try {
      const request: ValveControlRequest = {
        action: valveAction,
        position_pct: valveAction === 'OPEN' ? valvePosition : 0,
        reason: valveReason || `Manual ${valveAction.toLowerCase()} from dashboard`,
      };

      await cropFieldsApi.controlValve(selectedField, request);
      setValveDialogOpen(false);
      setValveReason('');
      fetchAllFieldStatuses();
    } catch (err) {
      console.error('Failed to control valve:', err);
      setError('Failed to control valve.');
    }
  };

  // Get selected field config and status
  const selectedFieldConfig = fields.find((f) => f.field_id === selectedField);
  const selectedFieldStatus = selectedField ? fieldStatuses[selectedField] : null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            <Agriculture sx={{ mr: 1, verticalAlign: 'middle' }} />
            Crop Field Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            IoT-based automatic irrigation control with real-time sensor data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddFieldDialogOpen(true)}
          >
            Add Field
          </Button>
          <Tooltip title="Refresh All">
            <IconButton onClick={fetchAllFieldStatuses}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Chip
            label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
          />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* No Fields Message */}
      {fields.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Agriculture sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Crop Fields Configured
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Add your first crop field to start monitoring water levels and soil moisture.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddFieldDialogOpen(true)}
          >
            Add Your First Field
          </Button>
        </Paper>
      )}

      {/* Field Cards Grid */}
      {fields.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {fields.map((field) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={field.field_id}>
              <FieldCard
                field={field}
                status={fieldStatuses[field.field_id] || null}
                isSelected={selectedField === field.field_id}
                onSelect={() => setSelectedField(field.field_id)}
                onDelete={() => {
                  setFieldToDelete(field.field_id);
                  setDeleteDialogOpen(true);
                }}
                onRefresh={() => {
                  cropFieldsApi.getFieldStatus(field.field_id).then((res) => {
                    setFieldStatuses((prev) => ({ ...prev, [field.field_id]: res.data }));
                  });
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Selected Field Details */}
      {selectedFieldConfig && selectedFieldStatus && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {getCropIcon(selectedFieldConfig.crop_type)} {selectedFieldConfig.field_name} - Control Panel
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedFieldStatus.auto_control_enabled}
                      onChange={async () => {
                        const request: ValveControlRequest = {
                          action: 'AUTO',
                          position_pct: 0,
                          reason: 'Toggle auto control from dashboard',
                        };
                        await cropFieldsApi.controlValve(selectedField!, request);
                        fetchAllFieldStatuses();
                      }}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AutoMode fontSize="small" />
                      Auto Control
                    </Box>
                  }
                />
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setValveDialogOpen(true)}
                >
                  Manual Control
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              {/* Live Sensor Data */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    <Sensors sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Live Sensor Data
                  </Typography>
                  <Chip
                    icon={selectedFieldStatus.sensor_connected ? <Sensors /> : <SensorsOff />}
                    label={selectedFieldStatus.sensor_connected ? 'Sensor Connected' : (selectedFieldStatus.is_simulated ? 'Simulated Data' : 'Sensor Disconnected')}
                    size="small"
                    color={selectedFieldStatus.sensor_connected ? 'success' : (selectedFieldStatus.is_simulated ? 'info' : 'error')}
                  />
                </Box>
                
                {/* No Sensor Warning */}
                {selectedFieldStatus.overall_status === 'NO_SENSOR' && !selectedFieldStatus.is_simulated && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>Sensor Not Detected</AlertTitle>
                    {selectedFieldConfig.device_id 
                      ? `Waiting for data from device: ${selectedFieldConfig.device_id}`
                      : 'No IoT device assigned. Assign a device ID to connect sensors.'
                    }
                    {selectedFieldStatus.last_real_data_time && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Last received: {new Date(selectedFieldStatus.last_real_data_time).toLocaleString()}
                      </Typography>
                    )}
                  </Alert>
                )}
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Water sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                          Water Level
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {selectedFieldStatus.current_water_level_pct.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={selectedFieldStatus.water_status}
                            size="small"
                            color={getWaterStatusColor(selectedFieldStatus.water_status)}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Opacity sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                          Soil Moisture
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {selectedFieldStatus.current_soil_moisture_pct.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={selectedFieldStatus.soil_status}
                            size="small"
                            color={getSoilStatusColor(selectedFieldStatus.soil_status)}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Speed sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                          Valve Status
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {selectedFieldStatus.valve_position_pct}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            icon={selectedFieldStatus.valve_status === 'OPEN' ? <PlayArrow /> : <Stop />}
                            label={selectedFieldStatus.valve_status}
                            size="small"
                            color={selectedFieldStatus.valve_status === 'OPEN' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Device ID</TableCell>
                        <TableCell align="right" colSpan={2}>
                          <Chip
                            icon={selectedFieldStatus.sensor_connected ? <Sensors /> : <SensorsOff />}
                            label={selectedFieldStatus.device_id || 'Not Assigned'}
                            size="small"
                            variant="outlined"
                            color={selectedFieldStatus.sensor_connected ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Data Source</TableCell>
                        <TableCell align="right" colSpan={2}>
                          <Chip
                            label={selectedFieldStatus.is_simulated ? 'Simulated' : 'Real IoT'}
                            size="small"
                            color={selectedFieldStatus.is_simulated ? 'info' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Last Reading</TableCell>
                        <TableCell align="right" colSpan={2}>
                          {new Date(selectedFieldStatus.last_sensor_reading).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Next Action / Recommendation */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  <AutoMode sx={{ mr: 1, verticalAlign: 'middle' }} />
                  System Recommendation
                </Typography>
                {selectedFieldStatus.next_action ? (
                  <Alert severity="info">
                    <AlertTitle>Recommended Action</AlertTitle>
                    {selectedFieldStatus.next_action}
                  </Alert>
                ) : (
                  <Alert severity="success">
                    <AlertTitle>All Good</AlertTitle>
                    Water level and soil moisture are within optimal range. No action needed.
                  </Alert>
                )}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Configured Thresholds
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Water Level Range
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedFieldConfig.water_level_min_pct}% - {selectedFieldConfig.water_level_max_pct}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Soil Moisture Range
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selectedFieldConfig.soil_moisture_min_pct}% - {selectedFieldConfig.soil_moisture_max_pct}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Add Field Dialog */}
      <Dialog open={addFieldDialogOpen} onClose={() => setAddFieldDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Add sx={{ mr: 1, verticalAlign: 'middle' }} />
          Add New Crop Field
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Basic Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Basic Information
              </Typography>
              
              <TextField
                fullWidth
                label="Field Name"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g., Rice Paddy Field A1"
                sx={{ mb: 2 }}
                required
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Crop Type</InputLabel>
                <Select
                  value={newCropType}
                  label="Crop Type"
                  onChange={(e) => setNewCropType(e.target.value)}
                >
                  {supportedCrops.map((crop) => (
                    <MenuItem key={crop} value={crop}>
                      {getCropIcon(crop)} {crop.charAt(0).toUpperCase() + crop.slice(1)}
                      {cropDefaults[crop] && ` - ${cropDefaults[crop].name}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {cropDefaults[newCropType] && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>{cropDefaults[newCropType].name}</AlertTitle>
                  {cropDefaults[newCropType].description}
                </Alert>
              )}

              <TextField
                fullWidth
                label="IoT Device ID"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="e.g., esp32-field-01"
                sx={{ mb: 2 }}
                helperText="Leave empty if no device connected yet"
              />

              <TextField
                fullWidth
                label="Area (hectares)"
                type="number"
                value={newAreaHectares}
                onChange={(e) => setNewAreaHectares(parseFloat(e.target.value) || 1)}
                inputProps={{ min: 0.1, step: 0.1 }}
              />
            </Grid>

            {/* Thresholds */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Water & Soil Thresholds (auto-filled from crop type)
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="primary.main" gutterBottom fontWeight={600}>
                  <Water sx={{ mr: 0.5, fontSize: 16, verticalAlign: 'middle' }} />
                  Water Level Thresholds
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Minimum %"
                      type="number"
                      value={newFieldThresholds.water_level_min_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          water_level_min_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Maximum %"
                      type="number"
                      value={newFieldThresholds.water_level_max_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          water_level_max_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Optimal %"
                      type="number"
                      value={newFieldThresholds.water_level_optimal_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          water_level_optimal_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Critical %"
                      type="number"
                      value={newFieldThresholds.water_level_critical_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          water_level_critical_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="success.main" gutterBottom fontWeight={600}>
                  <Opacity sx={{ mr: 0.5, fontSize: 16, verticalAlign: 'middle' }} />
                  Soil Moisture Thresholds
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Minimum %"
                      type="number"
                      value={newFieldThresholds.soil_moisture_min_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          soil_moisture_min_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Maximum %"
                      type="number"
                      value={newFieldThresholds.soil_moisture_max_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          soil_moisture_max_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Optimal %"
                      type="number"
                      value={newFieldThresholds.soil_moisture_optimal_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          soil_moisture_optimal_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Critical %"
                      type="number"
                      value={newFieldThresholds.soil_moisture_critical_pct}
                      onChange={(e) =>
                        setNewFieldThresholds((prev) => ({
                          ...prev,
                          soil_moisture_critical_pct: parseFloat(e.target.value) || 0,
                        }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddFieldDialogOpen(false); resetAddFieldForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddField}
            disabled={!newFieldName.trim()}
            startIcon={<Add />}
          >
            Add Field
          </Button>
        </DialogActions>
      </Dialog>

      {/* Valve Control Dialog */}
      <Dialog open={valveDialogOpen} onClose={() => setValveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
          Manual Valve Control - {selectedFieldConfig?.field_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={valveAction}
                label="Action"
                onChange={(e) => setValveAction(e.target.value as 'OPEN' | 'CLOSE' | 'AUTO')}
              >
                <MenuItem value="OPEN">
                  <PlayArrow sx={{ mr: 1 }} /> Open Valve
                </MenuItem>
                <MenuItem value="CLOSE">
                  <Stop sx={{ mr: 1 }} /> Close Valve
                </MenuItem>
                <MenuItem value="AUTO">
                  <AutoMode sx={{ mr: 1 }} /> Enable Auto Control
                </MenuItem>
              </Select>
            </FormControl>

            {valveAction === 'OPEN' && (
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>Valve Position: {valvePosition}%</Typography>
                <Slider
                  value={valvePosition}
                  onChange={(_, value) => setValvePosition(value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="Reason (optional)"
              value={valveReason}
              onChange={(e) => setValveReason(e.target.value)}
              placeholder="Enter reason for manual control"
              multiline
              rows={2}
            />

            {valveAction !== 'AUTO' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Manual control will disable automatic valve management.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleValveControl}
            color={valveAction === 'OPEN' ? 'success' : valveAction === 'CLOSE' ? 'error' : 'primary'}
          >
            {valveAction === 'AUTO' ? 'Enable Auto Control' : `${valveAction} Valve`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Field?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this field? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteField}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

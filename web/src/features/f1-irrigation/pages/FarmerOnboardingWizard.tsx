import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ROUTES } from '@/config/routes';
import { MAP_CONFIG } from '@/config/constants';
import { cropFieldsApi } from '@/api/f1-irrigation.api';

const steps = ['Create Field', 'Threshold Setup', 'ESP32 Pairing (Optional)', 'Live Validation'];

const initialThresholds = {
  water_level_min_pct: 50,
  water_level_max_pct: 80,
  water_level_optimal_pct: 65,
  water_level_critical_pct: 30,
  soil_moisture_min_pct: 70,
  soil_moisture_max_pct: 95,
  soil_moisture_optimal_pct: 85,
  soil_moisture_critical_pct: 50,
};

interface PairingSessionItem {
  pairing_id: string;
  field_id: string;
  device_id: string;
  status: string;
  challenge_code?: string;
  initiated_by?: string | null;
  confirmed_by?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  first_telemetry_at?: string | null;
  confirmed_at?: string | null;
  updated_at?: string | null;
}

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (latitude: number, longitude: number) => void;
}

const parseErrorDetail = (err: unknown, fallback: string): string => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
  ) {
    return (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback;
  }
  return fallback;
};

const formatTimestamp = (value?: string | null, emptyLabel = 'Not available'): string => {
  if (!value) {
    return emptyLabel;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const pairingStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' => {
  const normalized = status.toUpperCase();
  if (normalized === 'CONFIRMED') {
    return 'success';
  }
  if (normalized === 'PENDING') {
    return 'warning';
  }
  if (normalized === 'FAILED' || normalized === 'EXPIRED') {
    return 'error';
  }
  return 'default';
};

function LocationPickerMap({ latitude, longitude, onCoordinateChange }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const fallbackLat = Number.isFinite(MAP_CONFIG.DEFAULT_CENTER[0]) ? MAP_CONFIG.DEFAULT_CENTER[0] : 7.2906;
    const fallbackLng = Number.isFinite(MAP_CONFIG.DEFAULT_CENTER[1]) ? MAP_CONFIG.DEFAULT_CENTER[1] : 80.6337;
    const initialLat = Number.isFinite(latitude) ? latitude : fallbackLat;
    const initialLng = Number.isFinite(longitude) ? longitude : fallbackLng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: Number.isFinite(MAP_CONFIG.DEFAULT_ZOOM) ? MAP_CONFIG.DEFAULT_ZOOM : 12,
      zoomControl: true,
    });

    L.tileLayer(MAP_CONFIG.TILE_URL, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.circleMarker([initialLat, initialLng], {
      radius: 8,
      color: '#1976d2',
      fillColor: '#1976d2',
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(map);

    const handleClick = (event: L.LeafletMouseEvent) => {
      const nextLat = Number(event.latlng.lat.toFixed(6));
      const nextLng = Number(event.latlng.lng.toFixed(6));
      onCoordinateChange(nextLat, nextLng);
    };

    map.on('click', handleClick);
    mapInstanceRef.current = map;

    return () => {
      map.off('click', handleClick);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, onCoordinateChange]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const next: [number, number] = [latitude, longitude];
    markerRef.current.setLatLng(next);
    mapInstanceRef.current.setView(next, mapInstanceRef.current.getZoom());
  }, [latitude, longitude]);

  return (
    <Box
      ref={mapContainerRef}
      sx={{
        height: 280,
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}

export default function FarmerOnboardingWizard() {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pairingListLoading, setPairingListLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fieldId, setFieldId] = useState(`field-${Date.now()}`);
  const [fieldName, setFieldName] = useState('My Field');
  const [soilType, setSoilType] = useState('Loam');
  const [areaHectares, setAreaHectares] = useState(1);
  const [schemeId, setSchemeId] = useState('scheme-default');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(7.2906);
  const [longitude, setLongitude] = useState(80.6337);

  const [pairings, setPairings] = useState<PairingSessionItem[]>([]);
  const [deviceInput, setDeviceInput] = useState('');
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);
  const [pairingSkipped, setPairingSkipped] = useState(false);

  const [latestTelemetryAt, setLatestTelemetryAt] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [fieldLifecycleState, setFieldLifecycleState] = useState<string | null>(null);
  const [fieldCreated, setFieldCreated] = useState(false);

  const selectedPairing = useMemo(
    () => pairings.find((item) => item.pairing_id === selectedPairingId) || null,
    [pairings, selectedPairingId]
  );

  const confirmedPairings = useMemo(
    () => pairings.filter((item) => item.status.toUpperCase() === 'CONFIRMED'),
    [pairings]
  );

  const canContinue = useMemo(() => {
    if (activeStep === 0) {
      return (
        fieldName.trim().length > 0 &&
        schemeId.trim().length > 0 &&
        areaHectares > 0 &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      );
    }
    if (activeStep === 2) {
      return pairingSkipped || confirmedPairings.length > 0;
    }
    return true;
  }, [activeStep, areaHectares, confirmedPairings.length, fieldName, latitude, longitude, pairingSkipped, schemeId]);

  const upsertPairing = useCallback((nextPairing: PairingSessionItem) => {
    setPairings((previous) => {
      const next = [...previous];
      const index = next.findIndex((item) => item.pairing_id === nextPairing.pairing_id);
      if (index >= 0) {
        next[index] = {
          ...next[index],
          ...nextPairing,
        };
        return next;
      }
      return [nextPairing, ...next];
    });
  }, []);

  const handleMapCoordinateChange = useCallback((nextLatitude: number, nextLongitude: number) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
  }, []);

  const loadThresholdDefaults = async () => {
    try {
      const response = await cropFieldsApi.getCropDefault('unassigned');
      const defaults = response.data;
      setThresholds({
        water_level_min_pct: defaults.water_level_min_pct,
        water_level_max_pct: defaults.water_level_max_pct,
        water_level_optimal_pct: defaults.water_level_optimal_pct,
        water_level_critical_pct: defaults.water_level_critical_pct,
        soil_moisture_min_pct: defaults.soil_moisture_min_pct,
        soil_moisture_max_pct: defaults.soil_moisture_max_pct,
        soil_moisture_optimal_pct: defaults.soil_moisture_optimal_pct,
        soil_moisture_critical_pct: defaults.soil_moisture_critical_pct,
      });
    } catch {
      // Keep local defaults on failure.
    }
  };

  useEffect(() => {
    loadThresholdDefaults();
  }, []);

  const loadFieldPairings = useCallback(async () => {
    if (!fieldCreated) {
      return;
    }

    setPairingListLoading(true);
    setError(null);

    try {
      const response = await cropFieldsApi.listFieldPairings(fieldId);
      const items = response.data.items || [];
      setPairings(items);

      if (items.length > 0) {
        const preferredPairing = items.find((item) => item.status.toUpperCase() === 'PENDING') || items[0];
        setSelectedPairingId(preferredPairing.pairing_id);
      }

      if (items.some((item) => item.status.toUpperCase() === 'CONFIRMED')) {
        setPairingSkipped(false);
      }
    } catch (err) {
      setError(parseErrorDetail(err, 'Failed to load field devices'));
    } finally {
      setPairingListLoading(false);
    }
  }, [fieldCreated, fieldId]);

  useEffect(() => {
    if (activeStep === 2 && fieldCreated) {
      void loadFieldPairings();
    }
  }, [activeStep, fieldCreated, loadFieldPairings]);

  const createField = async () => {
    const payload = {
      field_id: fieldId,
      field_name: fieldName,
      crop_type: 'unassigned',
      soil_type: soilType,
      area_hectares: areaHectares,
      scheme_id: schemeId,
      location_name: locationName,
      latitude,
      longitude,
      device_id: null,
      irrigation_duration_minutes: 30,
      auto_control_enabled: true,
      ...thresholds,
    };

    await cropFieldsApi.createField(payload);
    await cropFieldsApi.updateField(fieldId, payload);
  };

  const saveThresholds = async () => {
    await cropFieldsApi.updateField(fieldId, {
      field_id: fieldId,
      field_name: fieldName,
      crop_type: 'unassigned',
      soil_type: soilType,
      area_hectares: areaHectares,
      scheme_id: schemeId,
      location_name: locationName,
      latitude,
      longitude,
      device_id: null,
      irrigation_duration_minutes: 30,
      auto_control_enabled: true,
      ...thresholds,
    });
  };

  const refreshLiveValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResponse, telemetryResponse, fieldResponse] = await Promise.all([
        cropFieldsApi.getFieldStatus(fieldId),
        cropFieldsApi.getLatestTelemetry(fieldId),
        cropFieldsApi.getField(fieldId),
      ]);

      setValidationStatus(statusResponse.data.status || statusResponse.data.overall_status);
      setLatestTelemetryAt(
        typeof telemetryResponse.data.timestamp === 'string' ? telemetryResponse.data.timestamp : null
      );
      const lifecycle = (fieldResponse.data as unknown as { lifecycle_state?: string }).lifecycle_state;
      setFieldLifecycleState(lifecycle || null);

      if (statusResponse.data.overall_status === 'NO_SENSOR') {
        setMessage('Field is configured. Pair at least one ESP32 when you are ready to stream telemetry.');
      } else {
        setMessage('Field telemetry validated successfully.');
      }
    } catch (err) {
      setError(parseErrorDetail(err, 'Failed to validate live status'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrimary = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (activeStep === 0) {
        await createField();
        setFieldCreated(true);
        setMessage('Field and location saved. Continue to threshold setup.');
        setActiveStep(1);
      } else if (activeStep === 1) {
        await saveThresholds();
        setMessage('Thresholds saved. Continue to device pairing.');
        setActiveStep(2);
      } else if (activeStep === 2) {
        setActiveStep(3);
        if (pairingSkipped) {
          setMessage('Device pairing skipped. You can pair devices later from the field profile.');
        }
        await refreshLiveValidation();
      } else {
        navigate(ROUTES.FARMER.FIELD_PROFILE_WITH_ID(fieldId));
      }
    } catch (err) {
      setError(parseErrorDetail(err, 'Action failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePairing = async () => {
    if (!deviceInput.trim()) {
      setError('Device ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setPairingSkipped(false);

    try {
      const response = await cropFieldsApi.initiatePairing(fieldId, deviceInput.trim());
      upsertPairing(response.data);
      setSelectedPairingId(response.data.pairing_id);
      setDeviceInput('');
      setMessage(
        `Pairing started for ${response.data.device_id}. Challenge code: ${response.data.challenge_code}`
      );
    } catch (err) {
      setError(parseErrorDetail(err, 'Failed to initiate pairing'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPairing = async () => {
    if (!selectedPairingId) {
      setError('Select a pairing session first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await cropFieldsApi.getPairing(selectedPairingId);
      upsertPairing(response.data);

      if (response.data.first_telemetry_at) {
        setMessage('First telemetry handshake detected. You can now confirm pairing.');
      }
    } catch (err) {
      setError(parseErrorDetail(err, 'Failed to refresh pairing status'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPairing = async () => {
    if (!selectedPairingId) {
      setError('Select a pairing session first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await cropFieldsApi.confirmPairing(selectedPairingId);
      upsertPairing(response.data as PairingSessionItem);
      setPairingSkipped(false);
      setMessage('Pairing confirmed. You can continue or add another device.');
    } catch (err) {
      setError(parseErrorDetail(err, 'Failed to confirm pairing'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPairing = () => {
    setPairingSkipped(true);
    setError(null);
    setMessage('Pairing skipped for now. You can link devices later from Field Profile.');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setLocating(false);
        setMessage('Current location captured.');
      },
      (geolocationError) => {
        setLocating(false);
        setError(geolocationError.message || 'Unable to access your current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Farmer Onboarding Wizard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Create your field, set thresholds, pair one or more ESP32 devices, and verify telemetry.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Field ID" value={fieldId} onChange={(e) => setFieldId(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Field Name" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Soil Type"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                >
                  <MenuItem value="Loam">Loam</MenuItem>
                  <MenuItem value="Clay">Clay</MenuItem>
                  <MenuItem value="Clay Loam">Clay Loam</MenuItem>
                  <MenuItem value="Sandy Loam">Sandy Loam</MenuItem>
                  <MenuItem value="Silty Loam">Silty Loam</MenuItem>
                  <MenuItem value="Red Loam">Red Loam</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Area (ha)"
                  value={areaHectares}
                  onChange={(e) => setAreaHectares(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Scheme ID" value={schemeId} onChange={(e) => setSchemeId(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location Name (Optional)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Click on the map to pin the field location.
                  </Typography>
                  <Button variant="outlined" onClick={handleUseCurrentLocation} disabled={locating}>
                    {locating ? 'Fetching Location...' : 'Use Current Location'}
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <LocationPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  onCoordinateChange={handleMapCoordinateChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Crop is selected later from Adaptive Recommendation after field onboarding.
                </Typography>
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={2}>
              {Object.entries(thresholds).map(([key, value]) => (
                <Grid key={key} item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label={key}
                    value={value}
                    onChange={(e) =>
                      setThresholds((previous) => ({
                        ...previous,
                        [key]: Number(e.target.value),
                      }))
                    }
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  label="ESP32 Device ID"
                  placeholder="e.g. esp32-field-01"
                  value={deviceInput}
                  onChange={(e) => setDeviceInput(e.target.value)}
                />
                <Button
                  variant="outlined"
                  onClick={handleInitiatePairing}
                  disabled={loading || pairingListLoading || !deviceInput.trim()}
                >
                  Add & Start Pairing
                </Button>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={handleRefreshPairing}
                  disabled={!selectedPairingId || loading || pairingListLoading}
                >
                  Refresh Selected Pairing
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmPairing}
                  disabled={!selectedPairingId || loading || pairingListLoading}
                >
                  Confirm Selected Pairing
                </Button>
                <Button variant="text" color="inherit" onClick={handleSkipPairing} disabled={loading || pairingListLoading}>
                  Skip for now
                </Button>
              </Stack>

              {pairingSkipped && (
                <Alert severity="info">
                  You skipped ESP32 pairing for now. You can continue onboarding and link devices later.
                </Alert>
              )}

              <Typography variant="subtitle2">Devices linked to this location</Typography>

              {pairings.length === 0 && !pairingListLoading && (
                <Typography variant="body2" color="text.secondary">
                  No pairing sessions yet. Add a device and start pairing, or skip for now.
                </Typography>
              )}

              {pairingListLoading && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading devices...
                  </Typography>
                </Stack>
              )}

              {pairings.map((pairing) => {
                const selected = pairing.pairing_id === selectedPairingId;
                return (
                  <Box
                    key={pairing.pairing_id}
                    sx={{
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                      justifyContent="space-between"
                      alignItems={{ md: 'center' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {pairing.device_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pairing ID: {pairing.pairing_id}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={pairing.status} color={pairingStatusColor(pairing.status)} />
                        <Button
                          size="small"
                          variant={selected ? 'contained' : 'outlined'}
                          onClick={() => setSelectedPairingId(pairing.pairing_id)}
                        >
                          {selected ? 'Selected' : 'Select'}
                        </Button>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      First telemetry: {formatTimestamp(pairing.first_telemetry_at, 'Waiting for first telemetry handshake')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Confirmed at: {formatTimestamp(pairing.confirmed_at, 'Not confirmed yet')}
                    </Typography>
                  </Box>
                );
              })}

              <Typography variant="body2" color="text.secondary">
                Confirmed devices: {confirmedPairings.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selected pairing: {selectedPairing?.pairing_id || 'None'}
              </Typography>
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={2}>
              <Button variant="outlined" onClick={refreshLiveValidation} disabled={loading}>
                Refresh Live Validation
              </Button>
              <Typography variant="body2">
                Field Lifecycle: <strong>{fieldLifecycleState || 'Unknown'}</strong>
              </Typography>
              <Typography variant="body2">
                Validation Status: <strong>{validationStatus || 'Unknown'}</strong>
              </Typography>
              <Typography variant="body2">
                Latest Telemetry: <strong>{formatTimestamp(latestTelemetryAt, 'No telemetry yet')}</strong>
              </Typography>
              <Alert severity={validationStatus === 'ok' || fieldLifecycleState === 'LIVE' ? 'success' : 'warning'}>
                {validationStatus === 'ok' || fieldLifecycleState === 'LIVE'
                  ? 'Field is live. Continue to profile.'
                  : 'Field is not live yet. Keep telemetry streaming and refresh.'}
              </Alert>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={activeStep === 0 || loading} onClick={() => setActiveStep((value) => value - 1)}>
          Back
        </Button>
        <Button variant="contained" disabled={!canContinue || loading} onClick={handlePrimary}>
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            'Open Field Profile'
          ) : (
            'Continue'
          )}
        </Button>
      </Stack>
    </Box>
  );
}

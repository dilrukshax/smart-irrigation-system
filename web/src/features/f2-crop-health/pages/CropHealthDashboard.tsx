/**
 * Crop Health Dashboard
 * Main page for crop health monitoring and water stress detection
 * 
 * VALIDATION RULES:
 * - Location must have ≥90% vegetation coverage
 * - Sea/ocean areas will be rejected (WATER_BODY)
 * - Urban/built-up areas will be rejected (URBAN_AREA)
 * - High cloud cover (>30%) will be rejected
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Alert,
  AlertTitle,
  Divider,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  MyLocation as LocationIcon,
  Satellite as SatelliteIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
  WaterDrop as WaterIcon,
  LocationCity as CityIcon,
  Cloud as CloudIcon,
  Landscape as LandscapeIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { HealthMap, ZoneList, HealthSummary, ImageUpload } from '../components';
import { cropHealthApi } from '../api';
import type { 
  HealthZone, 
  ZoneSummary, 
  GeoCoordinate, 
  ImagePredictionResponse,
  ValidationErrorResponse,
  ValidationStatus 
} from '../types';

// Default location (Sri Lanka - Udawalawa agricultural region)
const DEFAULT_LOCATION: GeoCoordinate = {
  lat: 6.42,
  lon: 80.89,
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function CropHealthDashboard() {
  // State
  const [zones, setZones] = useState<HealthZone[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const [center, setCenter] = useState<GeoCoordinate>(DEFAULT_LOCATION);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ValidationErrorResponse | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Location inputs
  const [latitude, setLatitude] = useState(DEFAULT_LOCATION.lat.toString());
  const [longitude, setLongitude] = useState(DEFAULT_LOCATION.lon.toString());
  const [areaKm2, setAreaKm2] = useState('10');
  const [numZones, setNumZones] = useState('6');

  // Get icon for validation status
  const getValidationIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'WATER_BODY':
        return <WaterIcon color="info" />;
      case 'URBAN_AREA':
        return <CityIcon color="warning" />;
      case 'HIGH_CLOUD_COVER':
        return <CloudIcon color="action" />;
      case 'BARREN_LAND':
      case 'INSUFFICIENT_VEGETATION':
        return <LandscapeIcon color="error" />;
      default:
        return <WarningIcon color="error" />;
    }
  };

  // Get alert severity for validation status
  const getAlertSeverity = (status: ValidationStatus): 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'WATER_BODY':
        return 'info';
      case 'URBAN_AREA':
        return 'warning';
      default:
        return 'error';
    }
  };

  // Fetch health zones from API
  const fetchHealthData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setValidationError(null);

    try {
      const lat = parseFloat(latitude) || DEFAULT_LOCATION.lat;
      const lon = parseFloat(longitude) || DEFAULT_LOCATION.lon;
      const area = parseFloat(areaKm2) || 10;
      const zones_count = parseInt(numZones) || 6;

      const response = await cropHealthApi.getHealthZones(lat, lon, area, zones_count);

      setZones(response.zones.features);
      setSummary(response.summary);
      setCenter(response.center);
      setSelectedZoneId(undefined);
    } catch (err: any) {
      console.error('Failed to fetch health data:', err);
      
      // Check if this is a validation error (422 status)
      if (err.response?.status === 422 && err.response?.data?.error === 'INVALID_LOCATION') {
        setValidationError(err.response.data as ValidationErrorResponse);
        setZones([]);
        setSummary(null);
      } else {
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch health data. Please ensure the crop health service is running.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, areaKm2, numZones]);

  // Initial load
  useEffect(() => {
    fetchHealthData();
  }, []);

  // Handle zone selection
  const handleZoneClick = useCallback((zone: HealthZone) => {
    setSelectedZoneId(zone.properties.zone_id);
  }, []);

  const handleZoneSelect = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId);
  }, []);

  // Handle prediction complete
  const handlePredictionComplete = useCallback((result: ImagePredictionResponse) => {
    console.log('Prediction result:', result);
    // Could add notification or update state here
  }, []);

  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(4));
        setLongitude(position.coords.longitude.toFixed(4));
      },
      (err) => {
        setError(`Failed to get location: ${err.message}`);
      }
    );
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Crop Health Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Satellite-based crop health monitoring and water stress detection using NDVI/NDWI analysis
        </Typography>
      </Box>

      {/* Location Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            size="small"
            sx={{ width: 130 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">°</InputAdornment>,
            }}
          />
          <TextField
            label="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            size="small"
            sx={{ width: 130 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">°</InputAdornment>,
            }}
          />
          <TextField
            label="Area (km²)"
            value={areaKm2}
            onChange={(e) => setAreaKm2(e.target.value)}
            size="small"
            sx={{ width: 100 }}
            type="number"
          />
          <TextField
            label="Zones"
            value={numZones}
            onChange={(e) => setNumZones(e.target.value)}
            size="small"
            sx={{ width: 80 }}
            type="number"
          />
          <Button
            variant="outlined"
            startIcon={<LocationIcon />}
            onClick={handleGetCurrentLocation}
            size="small"
          >
            My Location
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchHealthData}
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Area'}
          </Button>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <Alert 
          severity={getAlertSeverity(validationError.status)}
          sx={{ mb: 3 }}
          onClose={() => setValidationError(null)}
          icon={getValidationIcon(validationError.status)}
        >
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Location Rejected
            <Chip 
              label={validationError.status.replace(/_/g, ' ')} 
              size="small" 
              color={getAlertSeverity(validationError.status)}
            />
          </AlertTitle>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            {validationError.message}
          </Typography>
          
          {validationError.validation && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Land Cover:</strong> {validationError.validation.land_cover_type || 'Unknown'}
                {validationError.validation.vegetation_percentage !== undefined && (
                  <> • <strong>Vegetation:</strong> {validationError.validation.vegetation_percentage.toFixed(1)}%</>
                )}
                {validationError.validation.ndvi_mean !== undefined && (
                  <> • <strong>NDVI:</strong> {validationError.validation.ndvi_mean.toFixed(3)}</>
                )}
              </Typography>
            </Box>
          )}
          
          {validationError.suggestions && validationError.suggestions.length > 0 && (
            <>
              <Button
                size="small"
                onClick={() => setShowSuggestions(!showSuggestions)}
                endIcon={showSuggestions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ mb: 1 }}
              >
                {showSuggestions ? 'Hide' : 'Show'} Suggestions
              </Button>
              <Collapse in={showSuggestions}>
                <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, mt: 1 }}>
                  {validationError.suggestions.map((suggestion, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <InfoIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={suggestion} 
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </>
          )}
        </Alert>
      )}

      {/* Health Summary */}
      <HealthSummary summary={summary} isLoading={isLoading} />

      {/* Tabs for Map and Upload */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<SatelliteIcon />} label="Satellite Analysis" />
          <Tab icon={<UploadIcon />} label="Image Upload" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Map */}
          <Grid item xs={12} md={8}>
            <HealthMap
              zones={zones}
              center={center}
              selectedZoneId={selectedZoneId}
              onZoneClick={handleZoneClick}
              isLoading={isLoading}
              error={error}
            />
          </Grid>

          {/* Zone List */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, maxHeight: 450, overflow: 'auto' }}>
              <ZoneList
                zones={zones}
                selectedZoneId={selectedZoneId}
                onZoneSelect={handleZoneSelect}
              />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ImageUpload onPredictionComplete={handlePredictionComplete} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                How It Works
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Our AI model uses MobileNetV2 deep learning architecture trained on agricultural
                imagery to detect crop health issues and diseases.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Supported Analysis:
              </Typography>
              <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
                <li>
                  <Typography variant="body2">Crop disease detection</Typography>
                </li>
                <li>
                  <Typography variant="body2">Water stress identification</Typography>
                </li>
                <li>
                  <Typography variant="body2">Nutrient deficiency signs</Typography>
                </li>
                <li>
                  <Typography variant="body2">Pest damage assessment</Typography>
                </li>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Tips for Best Results:
              </Typography>
              <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
                <li>
                  <Typography variant="body2">Use clear, well-lit images</Typography>
                </li>
                <li>
                  <Typography variant="body2">Focus on the affected area</Typography>
                </li>
                <li>
                  <Typography variant="body2">Include both healthy and stressed leaves</Typography>
                </li>
                <li>
                  <Typography variant="body2">Avoid blurry or distant shots</Typography>
                </li>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

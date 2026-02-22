/**
 * Zone List Component
 * Displays a list of health zones with their status
 */

import { Card, CardContent, Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as MildStressIcon,
  Error as SevereStressIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { HealthZone } from '../types';

interface ZoneListProps {
  zones: HealthZone[];
  selectedZoneId?: string;
  onZoneSelect?: (zoneId: string) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Healthy':
      return <HealthyIcon sx={{ color: '#4caf50' }} />;
    case 'Mild Stress':
      return <MildStressIcon sx={{ color: '#ff9800' }} />;
    case 'Severe Stress':
      return <SevereStressIcon sx={{ color: '#f44336' }} />;
    default:
      return <InfoIcon color="disabled" />;
  }
};

const getRiskChipColor = (risk: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (risk) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'error';
    default:
      return 'default';
  }
};

export default function ZoneList({ zones, selectedZoneId, onZoneSelect }: ZoneListProps) {
  if (zones.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Zone Health Summary
        </Typography>
        <Typography color="text.secondary" variant="body2">
          No zones available. Analyze an area to see health data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Zone Health Summary
      </Typography>
      {zones.map((zone) => {
        const { properties } = zone;
        const isSelected = selectedZoneId === properties.zone_id;

        return (
          <Card
            key={properties.zone_id}
            sx={{
              mb: 2,
              cursor: 'pointer',
              border: isSelected ? 2 : 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 3,
                borderColor: 'primary.light',
              },
            }}
            onClick={() => onZoneSelect?.(properties.zone_id)}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(properties.health_status)}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {properties.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {properties.area_hectares.toFixed(1)} hectares
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: `${properties.color}20`,
                      color: properties.color,
                      display: 'inline-block',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {properties.health_status}
                    </Typography>
                  </Box>
                  <Box>
                    <Chip
                      label={`Risk: ${properties.risk_level}`}
                      size="small"
                      color={getRiskChipColor(properties.risk_level)}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 1.5, display: 'flex', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    NDVI
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {properties.ndvi.toFixed(3)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    NDWI
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {properties.ndwi.toFixed(3)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Confidence
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {(properties.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Box>

              {properties.recommendation && (
                <Tooltip title={properties.recommendation} arrow>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <InfoIcon fontSize="small" color="action" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {properties.recommendation}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

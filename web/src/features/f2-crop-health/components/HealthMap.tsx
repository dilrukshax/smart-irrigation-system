/**
 * Health Status Map Component
 * Renders an interactive Leaflet map with health zone overlays
 */

import { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HealthZone, GeoCoordinate } from '../types';

interface HealthMapProps {
  zones: HealthZone[];
  center: GeoCoordinate;
  selectedZoneId?: string;
  onZoneClick?: (zone: HealthZone) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function HealthMap({
  zones,
  center,
  selectedZoneId,
  onZoneClick,
  isLoading = false,
  error = null,
}: HealthMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lon],
      zoom: 13,
      zoomControl: true,
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create layer group for zones
    layerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lon], 13);
    }
  }, [center]);

  // Render zones on map
  useEffect(() => {
    if (!mapReady || !layerGroupRef.current) return;

    // Clear existing layers
    layerGroupRef.current.clearLayers();

    if (zones.length === 0) return;

    // Add zone polygons
    zones.forEach((zone) => {
      const { geometry, properties } = zone;
      
      // Convert coordinates to Leaflet format [lat, lng]
      const coordinates = geometry.coordinates[0].map(
        (coord) => [coord[1], coord[0]] as [number, number]
      );

      // Determine if zone is selected
      const isSelected = selectedZoneId === properties.zone_id;

      // Create polygon with styling
      const polygon = L.polygon(coordinates, {
        color: isSelected ? '#1976d2' : properties.color,
        fillColor: properties.color,
        fillOpacity: isSelected ? 0.6 : 0.4,
        weight: isSelected ? 3 : 2,
      });

      // Add popup with zone info
      polygon.bindPopup(`
        <div style="min-width: 150px;">
          <strong>${properties.name}</strong><br/>
          <span style="color: ${properties.color};">● ${properties.health_status}</span><br/>
          NDVI: ${properties.ndvi.toFixed(3)}<br/>
          NDWI: ${properties.ndwi.toFixed(3)}<br/>
          Area: ${properties.area_hectares.toFixed(1)} ha<br/>
          Confidence: ${(properties.confidence * 100).toFixed(0)}%
        </div>
      `);

      // Add click handler
      polygon.on('click', () => {
        if (onZoneClick) {
          onZoneClick(zone);
        }
      });

      // Add tooltip
      polygon.bindTooltip(properties.name, {
        permanent: false,
        direction: 'center',
      });

      // Add to layer group
      layerGroupRef.current?.addLayer(polygon);
    });

    // Fit bounds to show all zones
    if (zones.length > 0) {
      const allCoords: [number, number][] = [];
      zones.forEach((zone) => {
        zone.geometry.coordinates[0].forEach((coord) => {
          allCoords.push([coord[1], coord[0]]);
        });
      });
      
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [zones, selectedZoneId, mapReady, onZoneClick]);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Health Status Map
        </Typography>
        <Box
          sx={{
            height: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }} color="text.secondary">
            Loading satellite data...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Health Status Map
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 450 }}>
      <Typography variant="h6" gutterBottom>
        Health Status Map
      </Typography>
      <Box
        ref={mapRef}
        sx={{
          height: 380,
          borderRadius: 1,
          overflow: 'hidden',
          '& .leaflet-container': {
            height: '100%',
            width: '100%',
            borderRadius: 1,
          },
        }}
      />
    </Paper>
  );
}

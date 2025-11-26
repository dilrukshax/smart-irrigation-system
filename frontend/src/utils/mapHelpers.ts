import type { GeoPoint, GeoPolygon } from '@/types';

// Calculate center of polygon
export const getPolygonCenter = (polygon: GeoPolygon): GeoPoint => {
  const { coordinates } = polygon;
  const total = coordinates.length;
  
  const sum = coordinates.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / total,
    lng: sum.lng / total,
  };
};

// Calculate polygon area (approximate, in hectares)
export const calculatePolygonArea = (polygon: GeoPolygon): number => {
  const { coordinates } = polygon;
  const n = coordinates.length;
  
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i].lng * coordinates[j].lat;
    area -= coordinates[j].lng * coordinates[i].lat;
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to hectares (approximate)
  return area * 111319.9 * 111319.9 * 0.0001;
};

// Convert coordinates to GeoJSON format
export const toGeoJSON = (polygon: GeoPolygon) => {
  return {
    type: 'Polygon',
    coordinates: [
      polygon.coordinates.map((point) => [point.lng, point.lat]),
    ],
  };
};

// Parse GeoJSON to internal format
export const fromGeoJSON = (geojson: { coordinates: number[][][] }): GeoPolygon => {
  return {
    coordinates: geojson.coordinates[0].map(([lng, lat]) => ({ lat, lng })),
  };
};

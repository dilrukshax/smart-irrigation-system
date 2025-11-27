// Common Types

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface SelectOption {
  value: string;
  label: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  coordinates: GeoPoint[];
}

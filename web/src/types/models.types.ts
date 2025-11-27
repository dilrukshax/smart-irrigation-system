// Domain Model Types

export interface Field {
  id: string;
  name: string;
  area: number; // hectares
  soilType: string;
  cropType?: string;
  coordinates: { lat: number; lng: number }[];
}

export interface Crop {
  id: string;
  name: string;
  waterRequirement: number; // mm per season
  growthDays: number;
  optimalPh: { min: number; max: number };
  optimalTemperature: { min: number; max: number };
}

export interface Sensor {
  id: string;
  fieldId: string;
  type: 'soil-moisture' | 'temperature' | 'humidity' | 'water-level';
  status: 'active' | 'inactive' | 'error';
  lastReading?: number;
  lastUpdated?: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'farmer' | 'officer' | 'admin';
  phone?: string;
  assignedFields?: string[];
}

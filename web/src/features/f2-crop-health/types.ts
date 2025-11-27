// F2 - Crop Health Types

export interface ZoneHealth {
  id: string;
  name: string;
  ndvi: number;
  ndwi: number;
  savi: number;
  healthClass: 'healthy' | 'mild-stress' | 'severe-stress' | 'disease';
  confidence: number;
  lastUpdated: Date;
}

export interface VegetationIndex {
  date: Date;
  ndvi: number;
  ndwi: number;
  savi: number;
}

export interface StressAlert {
  id: string;
  zoneId: string;
  type: 'water-stress' | 'nutrient-deficiency' | 'disease' | 'pest';
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  description: string;
}

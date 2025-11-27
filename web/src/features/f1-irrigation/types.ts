// F1 - Irrigation Types

export interface SensorReading {
  id: string;
  fieldId: string;
  timestamp: Date;
  soilMoisture: number;
  temperature: number;
  humidity: number;
  canalLevel: number;
}

export interface IrrigationEvent {
  id: string;
  fieldId: string;
  startTime: Date;
  endTime?: Date;
  waterVolume: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface FieldStatus {
  id: string;
  name: string;
  status: 'ok' | 'under-irrigated' | 'over-irrigated';
  lastIrrigation: Date;
  nextScheduled?: Date;
  currentMoisture: number;
  targetMoisture: number;
}

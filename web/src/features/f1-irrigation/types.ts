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

// ============ Smart Water Management Types ============

export interface ReservoirData {
  water_level_mmsl: number;
  total_storage_mcm: number;
  active_storage_mcm: number;
  inflow_mcm: number;
  rain_mm: number;
  main_canals_mcm: number;
  lb_main_canal_mcm: number;
  rb_main_canal_mcm: number;
  evap_mm?: number;
  spillway_mcm?: number;
  wind_speed_ms?: number;
  timestamp?: string;
  source?: 'simulated' | 'iot_sensors';
}

export interface WaterReleasePrediction {
  predicted_release_mcm: number;
  confidence: number;
  model_used: string;
}

export interface ActuatorDecision {
  action: 'OPEN' | 'CLOSE' | 'HOLD' | 'EMERGENCY_RELEASE';
  valve_position: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReservoirStatus {
  level_mmsl: number;
  total_storage_mcm: number;
  active_storage_mcm: number;
  storage_percentage: number;
  status: 'HIGH' | 'NORMAL' | 'LOW' | 'CRITICAL';
  alert: string | null;
}

export interface WaterManagementRecommendation {
  timestamp: string;
  prediction: WaterReleasePrediction;
  decision: ActuatorDecision;
  reservoir_status: ReservoirStatus;
  input_data: {
    inflow_mcm: number | null;
    rain_mm: number | null;
    main_canals_mcm: number | null;
    evap_mm: number | null;
  };
}

export interface ThresholdConfig {
  release_threshold_mcm: number;
  min_safe_level_mmsl: number;
  max_safe_level_mmsl: number;
}

export interface ManualOverrideRequest {
  action: 'OPEN' | 'CLOSE' | 'HOLD' | 'EMERGENCY_RELEASE';
  valve_position: number;
  reason: string;
  operator_id?: string;
}

export interface ManualOverrideResponse {
  status: string;
  action_taken: string;
  valve_position: number;
  timestamp: number;
  override_active: boolean;
}

export interface ManualOverrideStatus {
  override_active: boolean;
  current_action: string | null;
  valve_position: number | null;
}

export interface WaterManagementStatus {
  service: string;
  status: string;
  model_ready: boolean;
  model_type: string;
  timestamp: string;
  manual_override_active: boolean;
}

export interface ModelInfo {
  model_type: string;
  training_data: string;
  target: string;
  features: string[];
  metrics: {
    model_type: string;
    training_period: string;
    test_period: string;
    mae: number | null;
    rmse: number | null;
    r2: number | null;
  };
  is_loaded: boolean;
}

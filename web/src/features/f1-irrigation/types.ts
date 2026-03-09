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
  status?: 'ok' | 'stale' | 'data_unavailable' | 'analysis_pending' | 'source_unavailable';
  is_live?: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality?: string;
  data_available?: boolean;
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
  data_source?: 'simulated' | 'iot_sensors';
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

// ============ Crop Field Management Types ============

export interface CropDefaults {
  name: string;
  description: string;
  water_level_min_pct: number;
  water_level_max_pct: number;
  water_level_optimal_pct: number;
  water_level_critical_pct: number;
  soil_moisture_min_pct: number;
  soil_moisture_max_pct: number;
  soil_moisture_optimal_pct: number;
  soil_moisture_critical_pct: number;
  irrigation_duration_minutes: number;
  check_interval_seconds: number;
  valve_response_delay_seconds: number;
}

export interface CropFieldConfig {
  field_id: string;
  field_name: string;
  crop_type: string;
  area_hectares: number;
  device_id: string | null;
  water_level_min_pct: number;
  water_level_max_pct: number;
  water_level_optimal_pct: number;
  water_level_critical_pct: number;
  soil_moisture_min_pct: number;
  soil_moisture_max_pct: number;
  soil_moisture_optimal_pct: number;
  soil_moisture_critical_pct: number;
  irrigation_duration_minutes: number;
  auto_control_enabled: boolean;
}

export interface CropFieldStatus {
  field_id: string;
  field_name: string;
  crop_type: string;
  device_id: string | null;
  // Sensor connection status
  sensor_connected: boolean;
  is_simulated: boolean;
  last_real_data_time: string | null;
  // Sensor readings
  current_water_level_pct: number;
  current_soil_moisture_pct: number;
  valve_status: 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING';
  valve_position_pct: number;
  water_status: 'CRITICAL' | 'LOW' | 'OPTIMAL' | 'HIGH' | 'EXCESS' | 'UNKNOWN';
  soil_status: 'CRITICAL' | 'DRY' | 'OPTIMAL' | 'WET' | 'SATURATED' | 'UNKNOWN';
  overall_status: 'OK' | 'WARNING' | 'CRITICAL' | 'IRRIGATING' | 'NO_SENSOR';
  last_sensor_reading: string;
  last_valve_action: string | null;
  auto_control_enabled: boolean;
  next_action: string | null;
  status?: 'ok' | 'stale' | 'data_unavailable' | 'analysis_pending' | 'source_unavailable';
  source?: string;
  is_live?: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality?: string;
  data_available?: boolean;
  message?: string | null;
  manual_request_required?: boolean;
  manual_request_id?: string | null;
  manual_request_status?: string | null;
  manual_request_reason?: string | null;
}

export interface IoTSensorData {
  device_id: string;
  timestamp: string;
  soil_moisture_pct: number;
  water_level_pct: number;
  soil_ao?: number;
  water_ao?: number;
  rssi?: number;
  battery_v?: number;
}

export interface ValveControlRequest {
  action: 'OPEN' | 'CLOSE' | 'AUTO';
  position_pct: number;
  reason: string;
}

export interface ValveControlResponse {
  field_id: string;
  action_taken: string;
  valve_position_pct: number;
  timestamp: string;
  status: string;
  message: string;
}

export interface AutoControlDecision {
  field_id: string;
  timestamp: string;
  water_level_pct: number;
  soil_moisture_pct: number;
  water_level_min: number;
  water_level_max: number;
  soil_moisture_min: number;
  soil_moisture_max: number;
  action: 'OPEN' | 'CLOSE' | 'HOLD';
  valve_position_pct: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ml_prediction?: Record<string, unknown>;
  status?: 'ok' | 'stale' | 'data_unavailable' | 'analysis_pending' | 'source_unavailable';
  source?: string;
  is_live?: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality?: string;
  data_available?: boolean;
  message?: string | null;
  manual_request_required?: boolean;
  manual_request_id?: string | null;
  manual_request_status?: string | null;
  manual_request_reason?: string | null;
}

export interface DataContract {
  status: 'ok' | 'stale' | 'data_unavailable' | 'analysis_pending' | 'source_unavailable';
  source?: string;
  is_live?: boolean;
  observed_at?: string | null;
  staleness_sec?: number | null;
  quality?: string;
  data_available?: boolean;
  message?: string | null;
}

export interface ManualRequestCreate {
  requested_action: 'OPEN' | 'CLOSE';
  requested_position_pct: number;
  reason: string;
}

export interface ManualRequestReview {
  decision: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface ManualRequestAuditItem {
  audit_id: string;
  request_id: string;
  event_type: string;
  actor_id?: string | null;
  actor_roles?: string[] | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
}

export interface ManualRequestItem {
  request_id: string;
  field_id: string;
  requested_action: 'OPEN' | 'CLOSE';
  requested_position_pct: number;
  reason: string;
  source_decision?: Record<string, unknown> | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_by?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  audit?: ManualRequestAuditItem[];
}

export interface UnifiedF1Section extends DataContract {
  field_status?: CropFieldStatus | null;
  auto_decision?: AutoControlDecision | null;
  controls?: Record<string, string>;
}

export interface UnifiedF2Section extends DataContract {
  stress_summary?: Record<string, unknown> | null;
}

export interface UnifiedF3Section extends DataContract {
  weather_summary?: Record<string, unknown> | null;
  irrigation_recommendation?: Record<string, unknown> | null;
}

export interface UnifiedF4Section extends DataContract {
  recommendations?: Record<string, unknown> | null;
  optimization_context?: Record<string, unknown> | null;
  actions?: Record<string, string>;
}

export interface UnifiedFieldProfile extends DataContract {
  field_id: string;
  generated_at: string;
  partial_failure: boolean;
  errors: string[];
  sections: {
    f1: UnifiedF1Section;
    f2: UnifiedF2Section;
    f3: UnifiedF3Section;
    f4: UnifiedF4Section;
  };
}

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
  soil_type?: string | null;
  area_hectares: number;
  owner_id?: string | null;
  scheme_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  lifecycle_state?: 'REGISTERED' | 'CONFIGURED' | 'DEVICELINKED' | 'LIVE' | 'DEGRADED' | 'SUSPENDED' | 'ARCHIVED' | string;
  pairing_status?: 'UNPAIRED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  last_handshake_at?: string | null;
  live_since?: string | null;
  suspended_reason?: string | null;
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
  soil_type?: string | null;
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
  blocked?: boolean;
  blocked_reason?: string | null;
  policy_id?: string | null;
  policy_version?: number | null;
  quota_remaining_mcm?: number | null;
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
  scheme_id?: string | null;
  requested_action: 'OPEN' | 'CLOSE';
  requested_position_pct: number;
  reason: string;
  source_decision?: Record<string, unknown> | null;
  policy_context?: {
    policy_id?: string | null;
    policy_version?: number | null;
    blocked_reason?: string | null;
  } | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CLOSED';
  created_by?: string | null;
  reviewed_by?: string | null;
  closed_by?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  executed_at?: string | null;
  closed_at?: string | null;
  execution_note?: string | null;
  created_at: string;
  updated_at: string;
  audit?: ManualRequestAuditItem[];
}

export interface AuthorityPolicyAuditItem {
  audit_id: string;
  policy_id: string;
  scheme_id: string;
  version: number;
  event_type: string;
  actor_id?: string | null;
  actor_roles?: string[] | null;
  created_at: string;
}

export interface AuthorityPolicyItem {
  policy_id: string;
  scheme_id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  quota_mcm: number;
  max_field_open_pct: number;
  emergency_mode?: string | null;
  constraints?: Record<string, unknown> | null;
  created_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  audit?: AuthorityPolicyAuditItem[];
}

export interface HydraulicScheduleItem {
  schedule_id: string;
  scheme_id: string;
  canal_id?: string | null;
  tunnel_id?: string | null;
  channel_id?: string | null;
  turnout_id?: string | null;
  action: 'OPEN' | 'HOLD' | 'CLOSE' | 'PARTIAL' | string;
  expected_flow_m3s?: number | null;
  start_time: string;
  end_time: string;
  requested_by?: string | null;
  requested_roles?: string[] | null;
  policy_id?: string | null;
  policy_version?: number | null;
  status: 'ACCEPTED' | 'REJECTED' | string;
  reason?: string | null;
  conflict_reason?: string | null;
  created_at: string;
}

export interface HydraulicTopologyNode {
  node_id: string;
  scheme_id: string;
  node_type: 'reservoir' | 'canal' | 'tunnel' | 'channel' | 'turnout' | string;
  parent_node_id?: string | null;
  display_name: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfficerOverviewQueue extends DataContract {
  total_requests: number;
  pending_requests: number;
  open_lifecycle_requests: number;
}

export interface OfficerOverviewTelemetry extends DataContract {
  total_fields: number;
  field_ids: string[];
  live_fields: number;
  degraded_fields: number;
  fresh_fields: number;
  stale_fields: number;
  no_telemetry_fields: number;
  worst_staleness_sec?: number | null;
}

export interface OfficerOverviewHydraulic extends DataContract {
  total_schedules: number;
  accepted_schedules: number;
  rejected_schedules: number;
  cancelled_schedules: number;
  next_accepted_start_at?: string | null;
}

export interface OfficerOverviewItem extends DataContract {
  scheme_id: string;
  queue: OfficerOverviewQueue;
  telemetry: OfficerOverviewTelemetry;
  hydraulic: OfficerOverviewHydraulic;
}

export interface OfficerOverviewResponse extends DataContract {
  count: number;
  generated_at: string;
  items: OfficerOverviewItem[];
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
  recommendation_summary?: Record<string, unknown> | null;
  income_projection?: Record<string, unknown> | null;
  market_snapshot?: Record<string, unknown> | null;
  actions?: Record<string, string>;
}

export interface UnifiedFieldProfile extends DataContract {
  field_id: string;
  generated_at: string;
  partial_failure: boolean;
  errors: string[];
  selected_crop?: Record<string, unknown> | null;
  satellite_stress_summary?: Record<string, unknown> | null;
  sections: {
    f1: UnifiedF1Section;
    f2: UnifiedF2Section;
    f3: UnifiedF3Section;
    f4: UnifiedF4Section;
  };
}

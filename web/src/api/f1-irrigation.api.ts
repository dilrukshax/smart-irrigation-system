import type { AxiosResponse } from 'axios';

import { apiClient } from './index';
import type {
  ReservoirData,
  WaterReleasePrediction,
  ActuatorDecision,
  WaterManagementRecommendation,
  ThresholdConfig,
  ManualOverrideRequest,
  ManualOverrideResponse,
  ManualOverrideStatus,
  WaterManagementStatus,
  ModelInfo,
  CropDefaults,
  CropFieldConfig,
  CropFieldStatus,
  ValveControlRequest,
  ValveControlResponse,
  AutoControlDecision,
  IoTSensorData,
  ManualRequestCreate,
  ManualRequestItem,
  ManualRequestReview,
  AuthorityPolicyItem,
  HydraulicScheduleItem,
  HydraulicTopologyNode,
  OfficerOverviewResponse,
  UnifiedFieldProfile,
} from '../features/f1-irrigation/types';

const DEFAULT_SCHEME_ID = 'scheme-default';

const ENDPOINTS = {
  FARM: {
    CROP_DEFAULTS: '/farm/crops/defaults',
    CROP_DEFAULT: (cropType: string) => `/farm/crops/defaults/${cropType}`,
    FIELDS: '/farm/fields',
    FIELD: (fieldId: string) => `/farm/fields/${fieldId}`,
    FIELD_PROFILE: (fieldId: string) => `/farm/fields/${fieldId}/profile`,
    CONFIRM_CROP: (fieldId: string) => `/farm/fields/${fieldId}/confirm-crop`,
  },
  DEVICES: {
    LIST: '/devices',
    PAIRING_INITIATE: '/devices/pairing/initiate',
    PAIRING_STATUS: (pairingId: string) => `/devices/pairing/${pairingId}`,
    PAIRING_CONFIRM: (pairingId: string) => `/devices/pairing/${pairingId}/confirm`,
    FIELD_PAIRINGS: (fieldId: string) => `/devices/fields/${fieldId}/pairings`,
  },
  TELEMETRY: {
    INGEST: '/telemetry/ingest',
    LATEST: (fieldId: string) => `/telemetry/fields/${fieldId}/latest`,
    HISTORY: (fieldId: string) => `/telemetry/fields/${fieldId}/history`,
  },
  IRRIGATION: {
    STATUS: (fieldId: string) => `/irrigation/fields/${fieldId}/status`,
    AUTO_DECISION: (fieldId: string) => `/irrigation/fields/${fieldId}/auto-decision`,
    COMMANDS: (fieldId: string) => `/irrigation/fields/${fieldId}/commands`,
    FIELD_MANUAL_REQUESTS: (fieldId: string) => `/irrigation/fields/${fieldId}/manual-requests`,
    MANUAL_REQUESTS: '/irrigation/manual-requests',
    MANUAL_REQUEST_REVIEW: (requestId: string) => `/irrigation/manual-requests/${requestId}/review`,
    MANUAL_REQUEST_CLOSE: (requestId: string) => `/irrigation/manual-requests/${requestId}/close`,
    OFFICER_OVERVIEW: '/irrigation/officer/overview',
    NETWORK_STATE: '/irrigation/network/state',
    NETWORK_SCHEDULES: '/irrigation/network/schedules',
    NETWORK_SCHEDULE: (scheduleId: string) => `/irrigation/network/schedules/${scheduleId}`,
    NETWORK_TOPOLOGY: '/irrigation/network/topology',
  },
};

const DEFAULT_CROP_DEFAULTS: Record<string, CropDefaults> = {
  rice: {
    name: 'Rice',
    description: 'Paddy cultivation profile',
    water_level_min_pct: 50,
    water_level_max_pct: 80,
    water_level_optimal_pct: 65,
    water_level_critical_pct: 30,
    soil_moisture_min_pct: 70,
    soil_moisture_max_pct: 95,
    soil_moisture_optimal_pct: 85,
    soil_moisture_critical_pct: 50,
    irrigation_duration_minutes: 30,
    check_interval_seconds: 60,
    valve_response_delay_seconds: 3,
  },
  wheat: {
    name: 'Wheat',
    description: 'Wheat cultivation profile',
    water_level_min_pct: 20,
    water_level_max_pct: 50,
    water_level_optimal_pct: 35,
    water_level_critical_pct: 10,
    soil_moisture_min_pct: 40,
    soil_moisture_max_pct: 70,
    soil_moisture_optimal_pct: 55,
    soil_moisture_critical_pct: 25,
    irrigation_duration_minutes: 20,
    check_interval_seconds: 60,
    valve_response_delay_seconds: 3,
  },
  vegetables: {
    name: 'Vegetables',
    description: 'Vegetable cultivation profile',
    water_level_min_pct: 25,
    water_level_max_pct: 55,
    water_level_optimal_pct: 40,
    water_level_critical_pct: 15,
    soil_moisture_min_pct: 50,
    soil_moisture_max_pct: 80,
    soil_moisture_optimal_pct: 65,
    soil_moisture_critical_pct: 35,
    irrigation_duration_minutes: 15,
    check_interval_seconds: 60,
    valve_response_delay_seconds: 3,
  },
  sugarcane: {
    name: 'Sugarcane',
    description: 'Sugarcane cultivation profile',
    water_level_min_pct: 40,
    water_level_max_pct: 70,
    water_level_optimal_pct: 55,
    water_level_critical_pct: 25,
    soil_moisture_min_pct: 60,
    soil_moisture_max_pct: 90,
    soil_moisture_optimal_pct: 75,
    soil_moisture_critical_pct: 40,
    irrigation_duration_minutes: 45,
    check_interval_seconds: 60,
    valve_response_delay_seconds: 3,
  },
  unassigned: {
    name: 'Unassigned',
    description: 'Crop-agnostic baseline profile',
    water_level_min_pct: 35,
    water_level_max_pct: 65,
    water_level_optimal_pct: 50,
    water_level_critical_pct: 20,
    soil_moisture_min_pct: 55,
    soil_moisture_max_pct: 85,
    soil_moisture_optimal_pct: 70,
    soil_moisture_critical_pct: 35,
    irrigation_duration_minutes: 20,
    check_interval_seconds: 60,
    valve_response_delay_seconds: 3,
  },
};

const mockResponse = <T>(data: T): AxiosResponse<T> =>
  ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse<T>['config'],
  }) as AxiosResponse<T>;

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toReservoirStatus = (waterLevelMmsl: number) => {
  if (waterLevelMmsl < 78) {
    return { status: 'CRITICAL' as const, alert: 'Reservoir level critically low' };
  }
  if (waterLevelMmsl < 82) {
    return { status: 'LOW' as const, alert: 'Reservoir level below target' };
  }
  if (waterLevelMmsl > 92) {
    return { status: 'HIGH' as const, alert: 'Reservoir level above target' };
  }
  return { status: 'NORMAL' as const, alert: null };
};

const mapDecisionAction = (action?: string): ActuatorDecision['action'] => {
  if (action === 'OPEN' || action === 'CLOSE' || action === 'EMERGENCY_RELEASE') {
    return action;
  }
  return 'HOLD';
};

const mapDecisionPriority = (priority?: string): ActuatorDecision['priority'] => {
  if (priority === 'low' || priority === 'medium' || priority === 'high' || priority === 'critical') {
    return priority;
  }
  return 'medium';
};

const mapWaterRecommendation = (status: CropFieldStatus, decision: AutoControlDecision): WaterManagementRecommendation => {
  const waterLevelMmsl = 80 + status.current_water_level_pct / 5;
  const reservoirStatus = toReservoirStatus(waterLevelMmsl);
  return {
    timestamp: decision.timestamp || new Date().toISOString(),
    prediction: {
      predicted_release_mcm: Math.max(0, parseNumber(status.current_water_level_pct) / 10),
      confidence: 0.72,
      model_used: 'adaptive-threshold-v1',
    },
    decision: {
      action: mapDecisionAction(decision.action),
      valve_position: parseNumber(decision.valve_position_pct),
      reason: decision.reason || 'Auto-decision',
      priority: mapDecisionPriority(decision.priority),
    },
    reservoir_status: {
      level_mmsl: waterLevelMmsl,
      total_storage_mcm: 268,
      active_storage_mcm: 180,
      storage_percentage: Math.min(100, Math.max(0, parseNumber(status.current_water_level_pct))),
      status: reservoirStatus.status,
      alert: reservoirStatus.alert,
    },
    input_data: {
      inflow_mcm: 0.5,
      rain_mm: 2,
      main_canals_mcm: 0.3,
      evap_mm: 0.1,
    },
    data_source: status.source === 'simulated' ? 'simulated' : 'iot_sensors',
  };
};

const normalizeCropDefaultsResponse = (
  payload: unknown
): { crops: Record<string, CropDefaults>; supported_crops: string[] } => {
  if (payload && typeof payload === 'object') {
    const root = payload as { crops?: Record<string, CropDefaults>; supported_crops?: string[] };
    if (root.crops && root.supported_crops) {
      return { crops: root.crops, supported_crops: root.supported_crops };
    }
  }
  return { crops: DEFAULT_CROP_DEFAULTS, supported_crops: Object.keys(DEFAULT_CROP_DEFAULTS) };
};

const getDefaultFieldId = async (explicitFieldId?: string): Promise<string> => {
  if (explicitFieldId) {
    return explicitFieldId;
  }
  const fieldsRes = await apiClient.get<CropFieldConfig[]>(ENDPOINTS.FARM.FIELDS);
  const firstField = fieldsRes.data[0];
  return firstField?.field_id || 'field-rice-01';
};

export const irrigationApi = {
  healthCheck: () => apiClient.get(ENDPOINTS.FARM.FIELDS),
  getSensors: () => apiClient.get(ENDPOINTS.DEVICES.LIST),
  getSensorData: (sensorId: string, params?: { from?: string; to?: string }) =>
    apiClient.get(`/devices/${sensorId}/range`, {
      params: {
        from: params?.from,
        to: params?.to,
      },
    }),
  getSchedules: () => apiClient.get(ENDPOINTS.IRRIGATION.NETWORK_STATE),
  getEvents: (params?: { fieldId?: string; status?: string }) =>
    apiClient.get(ENDPOINTS.IRRIGATION.MANUAL_REQUESTS, {
      params: {
        field_id: params?.fieldId,
        status: params?.status,
      },
    }),
  control: (fieldId: string, action: 'start' | 'stop', duration?: number) =>
    apiClient.post(ENDPOINTS.IRRIGATION.COMMANDS(fieldId), {
      action: action === 'start' ? 'OPEN' : 'CLOSE',
      position_pct: action === 'start' ? 100 : 0,
      reason: duration ? `Requested for ${duration} minutes` : 'Manual control request',
    }),
  predict: (sensorData: {
    soil_moisture: number;
    temperature: number;
    humidity: number;
    rainfall: number;
    crop_type: string;
  }) =>
    mockResponse({
      prediction: {
        soil_moisture: sensorData.soil_moisture,
        rainfall: sensorData.rainfall,
      },
      model: 'adaptive-threshold-v1',
    }),
};

export const waterManagementApi = {
  getStatus: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.IRRIGATION.NETWORK_STATE, {
        params: { scheme_id: DEFAULT_SCHEME_ID },
      });
      const payload = response.data as {
        active_policy?: { emergency_mode?: string | null };
      };
      const data: WaterManagementStatus = {
        service: 'water-management',
        status: 'ok',
        model_ready: true,
        model_type: 'adaptive-threshold-v1',
        timestamp: new Date().toISOString(),
        manual_override_active: Boolean(payload.active_policy?.emergency_mode),
      };
      return { ...response, data };
    } catch {
      return mockResponse<WaterManagementStatus>({
        service: 'water-management',
        status: 'degraded',
        model_ready: false,
        model_type: 'adaptive-threshold-v1',
        timestamp: new Date().toISOString(),
        manual_override_active: false,
      });
    }
  },

  getCurrentReservoirData: async () => {
    const response = await apiClient.get(ENDPOINTS.IRRIGATION.NETWORK_STATE, {
      params: { scheme_id: DEFAULT_SCHEME_ID },
    });
    const network = response.data as { reservoir?: Partial<ReservoirData> };
    const reservoir = network.reservoir || {};
    const data: ReservoirData = {
      water_level_mmsl: parseNumber(reservoir.water_level_mmsl, 85),
      total_storage_mcm: parseNumber(reservoir.total_storage_mcm, 268),
      active_storage_mcm: parseNumber(reservoir.active_storage_mcm, 180),
      inflow_mcm: parseNumber(reservoir.inflow_mcm, 0.5),
      rain_mm: parseNumber(reservoir.rain_mm, 2),
      main_canals_mcm: parseNumber(reservoir.main_canals_mcm, 0.3),
      lb_main_canal_mcm: parseNumber(reservoir.lb_main_canal_mcm, 0.15),
      rb_main_canal_mcm: parseNumber(reservoir.rb_main_canal_mcm, 0.15),
    };
    return { ...response, data };
  },

  ingestReservoirData: async (_data: ReservoirData) =>
    mockResponse<{ status: string; message: string }>({
      status: 'accepted',
      message: 'Reservoir ingest endpoint is deprecated in grouped API; data not persisted.',
    }),

  predictRelease: async (data: ReservoirData) =>
    mockResponse<WaterReleasePrediction>({
      predicted_release_mcm: Math.max(0, data.inflow_mcm + data.rain_mm / 20 - data.main_canals_mcm),
      confidence: 0.7,
      model_used: 'adaptive-threshold-v1',
    }),

  getDecision: async (data: ReservoirData, thresholds?: ThresholdConfig) => {
    const releaseThreshold = thresholds?.release_threshold_mcm ?? 0.8;
    const shouldOpen = data.inflow_mcm > releaseThreshold || data.rain_mm > 5;
    return mockResponse<ActuatorDecision>({
      action: shouldOpen ? 'OPEN' : 'HOLD',
      valve_position: shouldOpen ? 65 : 0,
      reason: shouldOpen ? 'Inflow and rainfall indicate release is needed' : 'No release required',
      priority: shouldOpen ? 'high' : 'low',
    });
  },

  getRecommendation: async (data: ReservoirData) => {
    const prediction = await waterManagementApi.predictRelease(data);
    const decision = await waterManagementApi.getDecision(data);
    const reservoirStatus = toReservoirStatus(data.water_level_mmsl);
    return mockResponse<WaterManagementRecommendation>({
      timestamp: new Date().toISOString(),
      prediction: prediction.data,
      decision: decision.data,
      reservoir_status: {
        level_mmsl: data.water_level_mmsl,
        total_storage_mcm: data.total_storage_mcm,
        active_storage_mcm: data.active_storage_mcm,
        storage_percentage: data.total_storage_mcm
          ? (data.active_storage_mcm / data.total_storage_mcm) * 100
          : 0,
        status: reservoirStatus.status,
        alert: reservoirStatus.alert,
      },
      input_data: {
        inflow_mcm: data.inflow_mcm,
        rain_mm: data.rain_mm,
        main_canals_mcm: data.main_canals_mcm,
        evap_mm: data.evap_mm ?? 0.1,
      },
      data_source: data.source || 'iot_sensors',
    });
  },

  getAutoRecommendation: async (fieldId?: string) => {
    const resolvedFieldId = await getDefaultFieldId(fieldId);
    const [statusRes, decisionRes] = await Promise.all([
      apiClient.get<CropFieldStatus>(ENDPOINTS.IRRIGATION.STATUS(resolvedFieldId)),
      apiClient.get<AutoControlDecision>(ENDPOINTS.IRRIGATION.AUTO_DECISION(resolvedFieldId)),
    ]);
    const recommendation = mapWaterRecommendation(statusRes.data, decisionRes.data);
    return { ...decisionRes, data: recommendation };
  },

  setManualOverride: async (request: ManualOverrideRequest, fieldId?: string) => {
    const resolvedFieldId = await getDefaultFieldId(fieldId);
    const action = request.action === 'EMERGENCY_RELEASE' ? 'OPEN' : request.action;
    const response = await apiClient.post(ENDPOINTS.IRRIGATION.COMMANDS(resolvedFieldId), {
      action,
      position_pct: request.action === 'CLOSE' ? 0 : request.valve_position,
      reason: request.reason,
    });
    return {
      ...response,
      data: {
        status: 'success',
        action_taken: action,
        valve_position: request.action === 'CLOSE' ? 0 : request.valve_position,
        timestamp: Date.now(),
        override_active: true,
      } as ManualOverrideResponse,
    };
  },

  cancelManualOverride: async (fieldId?: string) => {
    const resolvedFieldId = await getDefaultFieldId(fieldId);
    const response = await apiClient.post(ENDPOINTS.IRRIGATION.COMMANDS(resolvedFieldId), {
      action: 'AUTO',
      position_pct: 0,
      reason: 'Return to auto control',
    });
    return {
      ...response,
      data: {
        status: 'success',
        action_taken: 'AUTO',
        valve_position: 0,
        timestamp: Date.now(),
        override_active: false,
      } as ManualOverrideResponse,
    };
  },

  getManualOverrideStatus: async () =>
    mockResponse<ManualOverrideStatus>({
      override_active: false,
      current_action: null,
      valve_position: null,
    }),

  getDefaultThresholds: async (fieldId?: string) => {
    const resolvedFieldId = await getDefaultFieldId(fieldId);
    const response = await apiClient.get<CropFieldConfig>(ENDPOINTS.FARM.FIELD(resolvedFieldId));
    return {
      ...response,
      data: {
        release_threshold_mcm: Math.max(0.2, parseNumber(response.data.water_level_min_pct) / 100),
        min_safe_level_mmsl: 80,
        max_safe_level_mmsl: 92,
      } as ThresholdConfig,
    };
  },

  getModelInfo: async () =>
    mockResponse<ModelInfo>({
      model_type: 'adaptive-threshold-v1',
      training_data: 'rule-adaptive, telemetry-synchronized',
      target: 'valve_action',
      features: ['soil_moisture_pct', 'water_level_pct', 'policy_quota'],
      metrics: {
        model_type: 'rule-adaptive',
        training_period: 'rolling',
        test_period: 'rolling',
        mae: null,
        rmse: null,
        r2: null,
      },
      is_loaded: true,
    }),
};

export const cropFieldsApi = {
  getCropDefaults: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.FARM.CROP_DEFAULTS);
      return {
        ...response,
        data: normalizeCropDefaultsResponse(response.data),
      };
    } catch {
      return mockResponse({
        crops: DEFAULT_CROP_DEFAULTS,
        supported_crops: Object.keys(DEFAULT_CROP_DEFAULTS),
      });
    }
  },

  getCropDefault: async (cropType: string) => {
    try {
      const response = await apiClient.get<CropDefaults>(ENDPOINTS.FARM.CROP_DEFAULT(cropType));
      return response;
    } catch {
      return mockResponse(DEFAULT_CROP_DEFAULTS[cropType] || DEFAULT_CROP_DEFAULTS.rice);
    }
  },

  getFields: () => apiClient.get<CropFieldConfig[]>(ENDPOINTS.FARM.FIELDS),

  createField: async (config: CropFieldConfig) => {
    const createPayload = {
      field_id: config.field_id,
      field_name: config.field_name,
      crop_type: config.crop_type || undefined,
      soil_type: config.soil_type || undefined,
      area_hectares: config.area_hectares,
      scheme_id: (config as unknown as { scheme_id?: string }).scheme_id || DEFAULT_SCHEME_ID,
      latitude: config.latitude ?? undefined,
      longitude: config.longitude ?? undefined,
      location_name: config.location_name ?? undefined,
      auto_control_enabled: config.auto_control_enabled,
    };
    await apiClient.post<CropFieldConfig>(ENDPOINTS.FARM.FIELDS, createPayload);

    const patchPayload = {
      auto_control_enabled: config.auto_control_enabled,
      soil_type: config.soil_type || undefined,
      scheme_id: (config as unknown as { scheme_id?: string }).scheme_id || DEFAULT_SCHEME_ID,
      latitude: config.latitude ?? undefined,
      longitude: config.longitude ?? undefined,
      location_name: config.location_name ?? undefined,
      water_level_min_pct: config.water_level_min_pct,
      water_level_max_pct: config.water_level_max_pct,
      water_level_optimal_pct: config.water_level_optimal_pct,
      water_level_critical_pct: config.water_level_critical_pct,
      soil_moisture_min_pct: config.soil_moisture_min_pct,
      soil_moisture_max_pct: config.soil_moisture_max_pct,
      soil_moisture_optimal_pct: config.soil_moisture_optimal_pct,
      soil_moisture_critical_pct: config.soil_moisture_critical_pct,
    };
    const response = await apiClient.patch<CropFieldConfig>(
      ENDPOINTS.FARM.FIELD(config.field_id),
      patchPayload
    );

    if (config.device_id) {
      await apiClient.post(ENDPOINTS.DEVICES.PAIRING_INITIATE, {
        field_id: config.field_id,
        device_id: config.device_id,
      });
    }

    return response;
  },

  getField: (fieldId: string) => apiClient.get<CropFieldConfig>(ENDPOINTS.FARM.FIELD(fieldId)),

  updateField: (fieldId: string, config: CropFieldConfig) =>
    apiClient.patch<CropFieldConfig>(ENDPOINTS.FARM.FIELD(fieldId), config),

  confirmCrop: (
    fieldId: string,
    payload: { crop_type: string; source?: string; recommendation_id?: string; expected_profit_per_ha?: number }
  ) => apiClient.post(ENDPOINTS.FARM.CONFIRM_CROP(fieldId), payload),

  deleteField: (fieldId: string) =>
    apiClient.delete<{ status: string; field_id: string }>(ENDPOINTS.FARM.FIELD(fieldId)),

  getFieldStatus: (fieldId: string, _useSimulated = false) =>
    apiClient.get<CropFieldStatus>(ENDPOINTS.IRRIGATION.STATUS(fieldId)),

  controlValve: (fieldId: string, request: ValveControlRequest) =>
    apiClient.post<ValveControlResponse>(ENDPOINTS.IRRIGATION.COMMANDS(fieldId), {
      action: request.action,
      position_pct: request.position_pct,
      reason: request.reason,
    }),

  getAutoDecision: (fieldId: string, _useSimulated = false) =>
    apiClient.get<AutoControlDecision>(ENDPOINTS.IRRIGATION.AUTO_DECISION(fieldId)),

  sendSensorData: (fieldId: string, data: IoTSensorData) =>
    apiClient.post<{
      data_received: boolean;
      auto_control_triggered: boolean;
      decision?: AutoControlDecision;
      manual_request_required?: boolean;
      manual_request_id?: string | null;
      manual_request_reason?: string | null;
    }>(ENDPOINTS.TELEMETRY.INGEST, {
      field_id: fieldId,
      ...data,
    }),

  initiatePairing: (fieldId: string, deviceId: string) =>
    apiClient.post<{
      pairing_id: string;
      field_id: string;
      device_id: string;
      challenge_code: string;
      status: string;
      expires_at: string;
    }>(ENDPOINTS.DEVICES.PAIRING_INITIATE, { field_id: fieldId, device_id: deviceId }),

  getPairing: (pairingId: string) =>
    apiClient.get<{
      pairing_id: string;
      field_id: string;
      device_id: string;
      status: string;
      first_telemetry_at?: string | null;
      confirmed_at?: string | null;
    }>(ENDPOINTS.DEVICES.PAIRING_STATUS(pairingId)),

  listFieldPairings: (fieldId: string, limit: number = 50) =>
    apiClient.get<{
      field_id: string;
      count: number;
      items: Array<{
        pairing_id: string;
        field_id: string;
        device_id: string;
        status: string;
        challenge_code: string;
        initiated_by?: string | null;
        confirmed_by?: string | null;
        created_at?: string | null;
        expires_at?: string | null;
        first_telemetry_at?: string | null;
        confirmed_at?: string | null;
        updated_at?: string | null;
      }>;
    }>(ENDPOINTS.DEVICES.FIELD_PAIRINGS(fieldId), { params: { limit } }),

  confirmPairing: (pairingId: string) =>
    apiClient.post(ENDPOINTS.DEVICES.PAIRING_CONFIRM(pairingId), { confirm: true }),

  getLatestTelemetry: (fieldId: string) =>
    apiClient.get(ENDPOINTS.TELEMETRY.LATEST(fieldId)),

  getSensorHistory: (fieldId: string, limit: number = 50) =>
    apiClient.get<{ field_id: string; count: number; readings: IoTSensorData[] }>(
      ENDPOINTS.TELEMETRY.HISTORY(fieldId),
      { params: { limit } }
    ),

  createManualRequest: (fieldId: string, payload: ManualRequestCreate) =>
    apiClient.post<ManualRequestItem>(ENDPOINTS.IRRIGATION.FIELD_MANUAL_REQUESTS(fieldId), payload),

  listManualRequests: (params?: { field_id?: string; scheme_id?: string; status?: string; limit?: number }) =>
    apiClient.get<{ count: number; items: ManualRequestItem[] }>(ENDPOINTS.IRRIGATION.MANUAL_REQUESTS, {
      params,
    }),

  reviewManualRequest: (requestId: string, payload: ManualRequestReview) =>
    apiClient.post<ManualRequestItem>(ENDPOINTS.IRRIGATION.MANUAL_REQUEST_REVIEW(requestId), payload),

  closeManualRequest: (requestId: string, note?: string) =>
    apiClient.post<ManualRequestItem>(ENDPOINTS.IRRIGATION.MANUAL_REQUEST_CLOSE(requestId), { note }),

  getUnifiedFieldProfile: (fieldId: string) =>
    apiClient.get<UnifiedFieldProfile>(ENDPOINTS.FARM.FIELD_PROFILE(fieldId)),
};

export const irrigationAuthorityApi = {
  getOfficerOverview: (schemeId?: string) =>
    apiClient.get<OfficerOverviewResponse>(ENDPOINTS.IRRIGATION.OFFICER_OVERVIEW, {
      params: { scheme_id: schemeId },
    }),
  getNetworkState: (schemeId?: string) =>
    apiClient.get(ENDPOINTS.IRRIGATION.NETWORK_STATE, {
      params: { scheme_id: schemeId || DEFAULT_SCHEME_ID },
    }),
  listNetworkSchedules: (params?: { scheme_id?: string; status?: string; limit?: number }) =>
    apiClient.get<{ scheme_id: string; count: number; items: HydraulicScheduleItem[] }>(
      ENDPOINTS.IRRIGATION.NETWORK_SCHEDULES,
      { params }
    ),
  getNetworkSchedule: (scheduleId: string) =>
    apiClient.get<HydraulicScheduleItem>(ENDPOINTS.IRRIGATION.NETWORK_SCHEDULE(scheduleId)),
  getNetworkTopology: (schemeId?: string) =>
    apiClient.get<{ scheme_id: string; count: number; items: HydraulicTopologyNode[] }>(
      ENDPOINTS.IRRIGATION.NETWORK_TOPOLOGY,
      { params: { scheme_id: schemeId || DEFAULT_SCHEME_ID } }
    ),
  createNetworkSchedule: (payload: {
    scheme_id: string;
    canal_id?: string;
    tunnel_id?: string;
    channel_id?: string;
    turnout_id?: string;
    action: 'OPEN' | 'HOLD' | 'CLOSE' | 'PARTIAL';
    expected_flow_m3s?: number;
    start_time: string;
    end_time: string;
    reason?: string;
  }) => apiClient.post(ENDPOINTS.IRRIGATION.NETWORK_SCHEDULES, payload),
  listPolicies: (params?: { scheme_id?: string; status?: string; limit?: number }) =>
    apiClient.get<{ scheme_id: string; count: number; items: AuthorityPolicyItem[] }>(
      '/authority/policies',
      { params }
    ),
  getPolicy: (policyId: string) => apiClient.get<AuthorityPolicyItem>(`/authority/policies/${policyId}`),
  createPolicy: (payload: {
    scheme_id: string;
    quota_mcm: number;
    max_field_open_pct: number;
    emergency_mode?: string;
    constraints?: Record<string, unknown>;
  }) => apiClient.post<AuthorityPolicyItem>('/authority/policies', payload),
  publishPolicy: (policyId: string) => apiClient.post<AuthorityPolicyItem>(`/authority/policies/${policyId}/publish`),
};

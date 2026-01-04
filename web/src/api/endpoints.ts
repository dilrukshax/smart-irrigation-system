// API Endpoint Constants

export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },

  // F1 - Irrigation
  IRRIGATION: {
    SENSORS: '/irrigation/sensors',
    SENSOR_DATA: (id: string) => `/irrigation/sensors/${id}/data`,
    SCHEDULES: '/irrigation/schedules',
    EVENTS: '/irrigation/events',
    CONTROL: '/irrigation/control',
    // IoT Telemetry endpoints
    IOT_DEVICES: '/irrigation/iot/devices',
    IOT_LATEST: (id: string) => `/irrigation/iot/devices/${id}/latest`,
    IOT_RANGE: (id: string) => `/irrigation/iot/devices/${id}/range`,
    IOT_CMD: (id: string) => `/irrigation/iot/devices/${id}/cmd`,
    IOT_TELEMETRY: '/irrigation/iot/telemetry',
  },

  // F2 - Crop Health
  CROP_HEALTH: {
    ZONES: '/crop-health/zones',
    ZONE_HEALTH: (id: string) => `/crop-health/zones/${id}/health`,
    INDICES: '/crop-health/indices',
    ALERTS: '/crop-health/alerts',
    VALIDATION: '/crop-health/validation',
  },

  // F3 - Forecasting
  FORECASTING: {
    FORECASTS: '/forecasting/forecasts',
    FORECAST_BY_METRIC: (metric: string) => `/forecasting/forecasts/${metric}`,
    ALERTS: '/forecasting/alerts',
    SIMULATION: '/forecasting/simulation',
    RISK: '/forecasting/risk',
  },

  // F4 - ACA-O
  ACAO: {
    RECOMMENDATIONS: '/acao/recommendations',
    FIELD_RECOMMENDATIONS: (id: string) => `/acao/recommendations/${id}`,
    OPTIMIZE: '/acao/optimize',
    SCENARIOS: '/acao/scenarios',
    PLANB: '/acao/planb',
    WATER_BUDGET: '/acao/water-budget',
    SUPPLY: '/acao/supply',
  },
};

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
    // IoT Telemetry endpoints (canonical)
    IOT_DEVICES: '/iot/devices',
    IOT_LATEST: (id: string) => `/iot/devices/${id}/latest`,
    IOT_RANGE: (id: string) => `/iot/devices/${id}/range`,
    IOT_CMD: (id: string) => `/iot/devices/${id}/cmd`,
    IOT_TELEMETRY: '/iot/telemetry',
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
    STATUS: '/forecast/status',
    CURRENT: '/forecast/current-data',
    FORECASTS: '/forecast/forecast',
    RISK: '/forecast/risk-assessment',
    WEATHER_SUMMARY: '/forecast/weather/summary',
  },

  // F4 - ACA-O
  ACAO: {
    RECOMMENDATIONS: '/optimization/recommendations',
    FIELD_RECOMMENDATIONS: (id: string) => `/optimization/recommendations?field_id=${id}`,
    OPTIMIZE: '/optimization/recommendations/optimize',
    PLANB: '/optimization/planb',
    WATER_BUDGET: '/optimization/supply/water-budget',
    SUPPLY: '/optimization/supply',
  },
};

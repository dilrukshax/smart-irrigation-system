export const ROUTES = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',

  // Dashboard
  HOME: '/',

  // F1 - Irrigation
  IRRIGATION: {
    ROOT: '/irrigation',
    MONITORING: '/irrigation/monitoring',
    HISTORY: '/irrigation/history',
  },

  // F2 - Crop Health
  CROP_HEALTH: {
    ROOT: '/crop-health',
    ZONE_ANALYSIS: '/crop-health/zones',
    VALIDATION: '/crop-health/validation',
  },

  // F3 - Forecasting
  FORECASTING: {
    ROOT: '/forecasting',
    ALERTS: '/forecasting/alerts',
    SIMULATION: '/forecasting/simulation',
  },

  // F4 - ACA-O
  OPTIMIZATION: {
    ROOT: '/optimization',
    RECOMMENDATIONS: '/optimization/recommendations',
    PLANNER: '/optimization/planner',
    SCENARIOS: '/optimization/scenarios',
  },

  // User
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

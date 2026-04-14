export const ROUTES = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',
  LANDING: '/landing',
  PUBLIC: {
    HOME: '/',
    ABOUT: '/about-us',
    RESEARCH: '/research',
    PARAMETERS: '/data-parameters',
    ANALYTICS: '/analytics',
    CONTACT: '/contact-us',
  },

  // Dashboard
  HOME: '/dashboard',
  DASHBOARD: '/dashboard',

  // Farmer
  FARMER: {
    ROOT: '/farmer',
    FIELDS: '/farmer/fields',
    LANDING: '/farmer/landing',
    LOGIN: '/login',
    REGISTER: '/farmer/register',
    ONBOARDING: '/farmer/onboarding',
    FIELD_WORKSPACE: '/farmer/fields/:fieldId',
    FIELD_WORKSPACE_BASE: '/farmer/fields',
    FIELD_WORKSPACE_WITH_ID: (fieldId: string) => `/farmer/fields/${fieldId}`,
    FIELD_PROFILE: '/farmer/field-profile/:fieldId',
    FIELD_PROFILE_BASE: '/farmer/field-profile',
    FIELD_PROFILE_WITH_ID: (fieldId: string) => `/farmer/field-profile/${fieldId}`,
  },

  // Authority
  AUTHORITY: {
    ROOT: '/authority',
    LOGIN: '/login',
    USERS: '/authority/users',
    POLICIES: '/authority/policies',
  },

  // Officer
  OFFICER: {
    ROOT: '/officer',
    OVERVIEW: '/officer/overview',
    REQUESTS: '/officer/manual-requests',
    HYDRAULICS: '/officer/hydraulics',
  },

  // F1 - Irrigation
  IRRIGATION: {
    ROOT: '/irrigation',
    TELEMETRY: '/irrigation/telemetry',
    DEVICE_TELEMETRY: '/devices/telemetry',
    MONITORING: '/irrigation/monitoring',
    HISTORY: '/irrigation/history',
    WATER_MANAGEMENT: '/irrigation/water-management',
    CROP_FIELDS: '/irrigation/crop-fields',
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
    ADAPTIVE: '/optimization/adaptive',
  },

  // User
  PROFILE: '/profile',
  SETTINGS: '/settings',
};

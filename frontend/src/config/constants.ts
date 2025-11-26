// API Endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Service URLs
export const SERVICE_URLS = {
  F1_IRRIGATION: import.meta.env.VITE_F1_SERVICE_URL || 'http://localhost:8001',
  F2_CROP_HEALTH: import.meta.env.VITE_F2_SERVICE_URL || 'http://localhost:8002',
  F3_FORECASTING: import.meta.env.VITE_F3_SERVICE_URL || 'http://localhost:8003',
  F4_ACAO: import.meta.env.VITE_F4_SERVICE_URL || 'http://localhost:8004',
};

// Map Configuration
export const MAP_CONFIG = {
  TILE_URL: import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  DEFAULT_CENTER: (import.meta.env.VITE_DEFAULT_MAP_CENTER || '6.9271,79.8612').split(',').map(Number) as [number, number],
  DEFAULT_ZOOM: Number(import.meta.env.VITE_DEFAULT_MAP_ZOOM) || 10,
};

// Feature Flags
export const FEATURES = {
  F1_ENABLED: import.meta.env.VITE_ENABLE_F1_MODULE === 'true',
  F2_ENABLED: import.meta.env.VITE_ENABLE_F2_MODULE === 'true',
  F3_ENABLED: import.meta.env.VITE_ENABLE_F3_MODULE === 'true',
  F4_ENABLED: import.meta.env.VITE_ENABLE_F4_MODULE === 'true',
  AUTH_ENABLED: import.meta.env.VITE_AUTH_ENABLED === 'true',
};

// UI Constants
export const DRAWER_WIDTH = 260;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

// Status Colors
export const STATUS_COLORS = {
  healthy: '#4caf50',
  warning: '#ff9800',
  critical: '#f44336',
  unknown: '#9e9e9e',
};

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

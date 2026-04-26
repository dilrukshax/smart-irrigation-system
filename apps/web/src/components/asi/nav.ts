/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const farmerNav = [
  { label: 'Farm', items: [
    { name: 'Dashboard', icon: 'home', active: true },
    { name: 'My Fields', icon: 'leaf' },
    { name: 'Irrigation', icon: 'droplet' },
    { name: 'Crop Health', icon: 'shield_check' },
  ]},
  { label: 'Plan', items: [
    { name: 'Forecast', icon: 'cloud' },
    { name: 'Optimization', icon: 'target' },
    { name: 'Scenarios', icon: 'chart' },
  ]},
  { label: 'Account', items: [
    { name: 'Onboarding', icon: 'plus' },
    { name: 'Settings', icon: 'gear' },
  ]},
];

const officerNav = [
  { label: 'Operations', items: [
    { name: 'Overview', icon: 'home', active: true },
    { name: 'Manual Requests', icon: 'handshake', badge: 12 },
    { name: 'Hydraulics', icon: 'valve' },
    { name: 'Alert Queue', icon: 'bell' },
  ]},
  { label: 'Modules', items: [
    { name: 'Irrigation', icon: 'droplet' },
    { name: 'Crop Health', icon: 'shield_check' },
    { name: 'Forecasting', icon: 'cloud' },
    { name: 'Optimization', icon: 'target' },
  ]},
];

const authorityNav = [
  { label: 'Governance', items: [
    { name: 'User Management', icon: 'users', active: true },
    { name: 'Policies & Quotas', icon: 'shield' },
    { name: 'Scheme Zones', icon: 'map' },
    { name: 'Audit Log', icon: 'list' },
  ]},
  { label: 'Reports', items: [
    { name: 'System Health', icon: 'wifi' },
    { name: 'Seasonal Summary', icon: 'chart' },
  ]},
];

const irrigationNav = (active) => [
  { label: 'F1 · Irrigation', items: [
    { name: 'Overview', icon: 'home', active: active === 'over' },
    { name: 'Water Management', icon: 'wave', active: active === 'water' },
    { name: 'Sensor Telemetry', icon: 'chart', active: active === 'tele' },
    { name: 'Valve Control', icon: 'valve' },
  ]},
  { label: 'Modules', items: [
    { name: 'Crop Health', icon: 'shield_check' },
    { name: 'Forecasting', icon: 'cloud' },
    { name: 'Optimization', icon: 'target' },
  ]},
];

const optNav = (active) => [
  { label: 'F4 · ACA-O', items: [
    { name: 'Overview', icon: 'home', active: active === 'over' },
    { name: 'Recommendations', icon: 'leaf', active: active === 'rec' },
    { name: 'Planner', icon: 'target', active: active === 'plan' },
    { name: 'Scenarios', icon: 'chart', active: active === 'sce' },
    { name: 'Adaptive Tuning', icon: 'flash', active: active === 'ada' },
  ]},
  { label: 'Modules', items: [
    { name: 'Irrigation', icon: 'droplet' },
    { name: 'Crop Health', icon: 'shield_check' },
    { name: 'Forecasting', icon: 'cloud' },
  ]},
];


/* Public pages: Landing, Farmer Landing, Login, Register */

export { farmerNav, officerNav, authorityNav, irrigationNav, optNav };

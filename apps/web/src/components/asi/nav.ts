/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const farmerNav = [
  { label: 'Farm', items: [
    { name: 'Dashboard', icon: 'home', active: true },
    { name: 'My Fields', icon: 'leaf' },
    { name: 'Irrigation', icon: 'droplet', href: '/farmer/irrigation' },
    { name: 'Crop Health', icon: 'shield_check', href: '/farmer/crop-health' },
  ]},
  { label: 'Plan', items: [
    { name: 'Forecast', icon: 'cloud', href: '/farmer/forecasting' },
    { name: 'Optimization', icon: 'target', href: '/farmer/optimization' },
    { name: 'Scenarios', icon: 'chart' },
  ]},
  { label: 'Account', items: [
    { name: 'Onboarding', icon: 'plus' },
    { name: 'Settings', icon: 'gear' },
  ]},
];

const officerNav = [
  { label: 'Operations', items: [
    { name: 'Overview', icon: 'home', href: '/operations', active: true },
    { name: 'Farmers', icon: 'users', href: '/operations/farmers' },
    { name: 'Manual Requests', icon: 'handshake', href: '/operations/requests' },
    { name: 'Hydraulics', icon: 'valve', href: '/operations/hydraulics' },
    { name: 'Alert Queue', icon: 'bell', href: '/operations/alerts' },
  ]},
  { label: 'Modules', items: [
    { name: 'Irrigation', icon: 'droplet', children: [
      { name: 'Overview', icon: 'home', href: '/irrigation' },
      { name: 'Water Management', icon: 'wave', href: '/irrigation/water' },
      { name: 'Sensor Telemetry', icon: 'chart', href: '/irrigation/telemetry' },
      { name: 'Valve Control', icon: 'valve', href: '/irrigation/water-management' },
    ]},
    { name: 'Crop Health', icon: 'shield_check', children: [
      { name: 'Overview', icon: 'home', href: '/crop-health' },
      { name: 'Zone Map', icon: 'map', href: '/crop-health/zones' },
      { name: 'Disease Scans', icon: 'shield_check', href: '/crop-health/scans' },
      { name: 'Stress Alerts', icon: 'bell', href: '/crop-health/alerts' },
    ]},
    { name: 'Forecasting', icon: 'cloud', children: [
      { name: 'Overview', icon: 'home', href: '/forecasting' },
      { name: 'Reservoir', icon: 'wave', href: '/forecasting/reservoir' },
      { name: 'Rainfall', icon: 'cloud', href: '/forecasting/rainfall' },
      { name: 'Alerts', icon: 'bell', href: '/forecasting/alerts' },
    ]},
    { name: 'Optimization', icon: 'target', children: [
      { name: 'Overview', icon: 'home', href: '/optimization' },
      { name: 'Recommendations', icon: 'leaf', href: '/optimization/recommendations' },
      { name: 'Planner', icon: 'target', href: '/optimization/planner' },
      { name: 'Scenarios', icon: 'chart', href: '/optimization/scenarios' },
      { name: 'Adaptive Tuning', icon: 'flash', href: '/optimization/adaptive' },
    ]},
  ]},
];

const officerModuleNav = (moduleName, activeChild) =>
  officerNav.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const moduleActive = item.name === moduleName;
      return {
        ...item,
        active: moduleActive,
        defaultOpen: moduleActive,
        children: item.children?.map((child) => ({
          ...child,
          active: moduleActive && child.name === activeChild,
        })),
      };
    }),
  }));

const buildOfficerNav = (activeName, badges = {}) =>
  officerNav.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const hasExplicitBadge = Object.prototype.hasOwnProperty.call(badges, item.name);
      return {
        ...item,
        active: item.name === activeName,
        badge: hasExplicitBadge ? badges[item.name] : item.badge,
      };
    }),
  }));

const authorityNav = [
  { label: 'Governance', items: [
    { name: 'User Management', icon: 'users', href: '/authority/users', active: true },
    { name: 'Policies & Quotas', icon: 'shield', href: '/authority/policies' },
    { name: 'Scheme Zones', icon: 'map', href: '/authority/schemes' },
    { name: 'Audit Log', icon: 'list', href: '/authority/audit' },
  ]},
  { label: 'Reports', items: [
    { name: 'System Health', icon: 'wifi', href: '/authority/health' },
    { name: 'Seasonal Summary', icon: 'chart', href: '/authority/seasonal-summary' },
  ]},
];

const buildAuthorityNav = (activeName) =>
  authorityNav.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      active: item.name === activeName,
    })),
  }));

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

export { farmerNav, officerNav, officerModuleNav, buildOfficerNav, authorityNav, buildAuthorityNav, irrigationNav, optNav };

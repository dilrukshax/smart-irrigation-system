export type NavItem = {
  href: string;
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/domain", label: "Domain" },
  { href: "/milestones", label: "Milestones" },
  { href: "/documents", label: "Documents" },
  { href: "/presentations", label: "Slides" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export const projectStats = [
  { value: "7", label: "Integrated services" },
  { value: "4", label: "Research streams" },
  { value: "1-14", label: "Day forecast horizon" },
  { value: "38", label: "Crop health classes" },
];

export const modules = [
  {
    id: "f1",
    name: "IoT Smart Water Management",
    shortName: "F1 Irrigation",
    owner: "Hesara",
    service: "irrigation_service",
    port: "8002",
    accent: "water",
    image: "/assets/research/fig9_actuation_decision_pipeline.png",
    imageAlt: "Irrigation actuation decision pipeline diagram",
    summary:
      "Sensor readings, field profiles, and a Random Forest controller decide when valves should open while preserving manual review where authority is required.",
    bullets: [
      "ESP32 telemetry for soil moisture, temperature, humidity, and water level",
      "ML valve recommendation with manual request and approval workflow",
      "Reservoir snapshots and water release prediction for scheme operations",
    ],
  },
  {
    id: "f2",
    name: "Hybrid Satellite Crop Health Monitoring",
    shortName: "F2 Crop Health",
    owner: "Abishek",
    service: "crop_health_and_water_stress_detection",
    port: "8007",
    accent: "leaf",
    image: "/assets/research/fig10_zone_health_map.png",
    imageAlt: "Zone health map produced by the crop health service",
    summary:
      "Satellite-style zone analysis and image disease prediction identify crop stress before it becomes visible across the whole field.",
    bullets: [
      "NDVI and NDWI style health analysis with vegetation validation",
      "MobileNetV2 image classifier for 38 crop disease and health classes",
      "Field stress summary consumed by irrigation and optimization services",
    ],
  },
  {
    id: "f3",
    name: "ML Time-Series Forecasting and Alerting",
    shortName: "F3 Forecasting",
    owner: "Trishni",
    service: "forecasting_service",
    port: "8003",
    accent: "sky",
    image: "/assets/research/fig13_ensemble_forecast.png",
    imageAlt: "Ensemble water forecasting result chart",
    summary:
      "Forecasts rainfall and reservoir behavior with risk bands so irrigation schedules and crop allocations can adapt before water scarcity arrives.",
    bullets: [
      "Water level and rainfall forecasts across 1 to 14 day horizons",
      "P10, P50, and P90 risk bands for drought and flood decisions",
      "Weather intelligence endpoints consumed by F1 and F4",
    ],
  },
  {
    id: "f4",
    name: "Adaptive Crop and Area Optimization",
    shortName: "F4 ACA-O",
    owner: "Dilruksha",
    service: "optimize_service",
    port: "8004",
    accent: "harvest",
    image: "/assets/research/fig16_acao_architecture_diagram.png",
    imageAlt: "Adaptive crop and area optimization architecture diagram",
    summary:
      "Ranks crop suitability, predicts yield and price, then solves crop area allocation under water, soil, and policy constraints.",
    bullets: [
      "Fuzzy-TOPSIS suitability scoring for crop and field matching",
      "PuLP optimization for water quota, area, profit, and policy constraints",
      "Plan B recommendations when quotas, stress, or prices change mid-season",
    ],
  },
];

export const literaturePoints = [
  "Quota-based irrigation schemes in Sri Lanka need decisions that connect field-level water demand with scheme-level release planning.",
  "IoT soil and water-level sensing improves visibility, but isolated controllers often miss forecasted rainfall, crop stress, and allocation policy constraints.",
  "Remote sensing research shows that vegetation indices can highlight water stress and disease risk, especially when paired with ground validation images.",
  "Time-series forecasting and mathematical optimization can guide water releases and crop planning, but existing prototypes rarely combine them into one operational platform.",
];

export const researchObjectives = [
  {
    title: "Automate irrigation decisions",
    detail:
      "Use IoT telemetry and a Random Forest controller to recommend valve actions for each field while preserving human review for critical operations.",
  },
  {
    title: "Detect crop health and water stress",
    detail:
      "Combine satellite-style zone analysis with MobileNetV2 image prediction to identify stressed or diseased areas early.",
  },
  {
    title: "Forecast rainfall and reservoir risk",
    detail:
      "Generate short-horizon water forecasts with risk bands and alerts for drought, flood, and demand pressure.",
  },
  {
    title: "Optimize crop area under quota",
    detail:
      "Use Fuzzy-TOPSIS and PuLP to recommend crop mixes that respect soil suitability, water budget, expected yield, and price risk.",
  },
];

export const methodologySteps = [
  "Literature survey and research gap analysis",
  "Stakeholder and service requirement definition",
  "Microservice architecture design with gateway routing",
  "Data collection from sensors, datasets, weather history, and agronomic sources",
  "Model implementation for irrigation, crop health, forecasting, and optimization",
  "FastAPI service integration with PostgreSQL, Redis, and MQTT",
  "Next.js dashboard and marketing website implementation",
  "Evaluation through unit tests, contract tests, model metrics, and system demonstrations",
];

export const technologyGroups = [
  {
    title: "Backend and APIs",
    items: ["Python 3.11", "FastAPI", "Uvicorn", "Pydantic", "SQLAlchemy"],
  },
  {
    title: "Data and Messaging",
    items: ["PostgreSQL", "Redis", "Mosquitto MQTT", "JSON event contracts"],
  },
  {
    title: "Machine Learning",
    items: ["scikit-learn", "TensorFlow Keras", "statsmodels", "PuLP", "pandas"],
  },
  {
    title: "Frontend and Infrastructure",
    items: ["Next.js 16", "React 19", "TypeScript", "Docker", "Kubernetes", "Terraform"],
  },
];

export const milestones = [
  {
    id: "proposal",
    name: "Project Proposal",
    date: "Week 6, Semester 1",
    marks: "6%",
    type: "Individual document",
    detail:
      "Each member submits an individual proposal covering background, literature, research gap, problem, objectives, contribution, methodology, and timeline.",
  },
  {
    id: "pp1",
    name: "Progress Presentation 1",
    date: "Week 11, Semester 1",
    marks: "15%",
    type: "Group presentation",
    detail:
      "Demonstrates roughly half of the system, including early ML models, service structure, core APIs, IoT data flow, and initial user interfaces.",
  },
  {
    id: "pp2",
    name: "Progress Presentation 2",
    date: "Week 6-8, Semester 2",
    marks: "18%",
    type: "Group presentation",
    detail:
      "Shows near-complete integration across F1 to F4, role-based workflows, deployed services, and validated model behavior.",
  },
  {
    id: "final",
    name: "Final Assessment",
    date: "Week 12-13, Semester 2",
    marks: "19%",
    type: "Group demonstration",
    detail:
      "Final system demonstration with documentation, deployment evidence, evaluation results, and defense of the integrated research contribution.",
  },
  {
    id: "viva",
    name: "Viva",
    date: "After final assessment",
    marks: "10%",
    type: "Individual oral examination",
    detail:
      "Each member explains and defends their research contribution, implementation decisions, model choices, and integration results.",
  },
  {
    id: "research-paper",
    name: "Research Paper",
    date: "End of Semester 2",
    marks: "10%",
    type: "Group submission",
    detail:
      "Publication-style paper that documents the integrated platform, methodology, evaluation, and comparison against existing work.",
  },
  {
    id: "logbook",
    name: "Logbook and Status Documents",
    date: "Continuous",
    marks: "12%",
    type: "Continuous submission",
    detail:
      "Weekly progress records, supervisor feedback, blockers, and status documents for each research stream.",
  },
];

export const documents = [
  {
    category: "Project-wide documents",
    items: [
      {
        title: "Project Charter",
        description: "Scope, stakeholders, project authority, and the initial agreement.",
        status: "Pending upload",
        href: "/submissions/documents/project-charter.pdf",
      },
      {
        title: "Proposal Document",
        description: "Group proposal with background, objectives, methodology, and expected outcomes.",
        status: "Pending upload",
        href: "/submissions/documents/proposal-document.pdf",
      },
      {
        title: "Checklist Documents",
        description: "Assessment checklists and supervisor review evidence.",
        status: "Pending upload",
        href: "/submissions/documents/checklist-documents.pdf",
      },
      {
        title: "Final Document - Main",
        description: "Integrated final report across all four research streams.",
        status: "Pending upload",
        href: "/submissions/documents/final-document-main.pdf",
      },
    ],
  },
  {
    category: "Individual final documents",
    items: [
      {
        title: "Final Document - F1, Hesara",
        description: "IoT smart irrigation, water management, and ML valve control.",
        status: "Pending upload",
        href: "/submissions/documents/final-document-f1.pdf",
      },
      {
        title: "Final Document - F2, Abishek",
        description: "Crop health, water stress detection, and image disease prediction.",
        status: "Pending upload",
        href: "/submissions/documents/final-document-f2.pdf",
      },
      {
        title: "Final Document - F3, Trishni",
        description: "Time-series forecasting, weather intelligence, and risk alerts.",
        status: "Pending upload",
        href: "/submissions/documents/final-document-f3.pdf",
      },
      {
        title: "Final Document - F4, Dilruksha",
        description: "Crop suitability, optimization, water budgeting, and Plan B.",
        status: "Pending upload",
        href: "/submissions/documents/final-document-f4.pdf",
      },
    ],
  },
];

export const presentations = [
  {
    category: "Assessment decks",
    items: [
      {
        title: "Proposal Presentation",
        description: "Background, literature, research gap, objectives, and proposed methodology.",
        status: "Pending upload",
        href: "/submissions/slides/proposal-presentation.pdf",
      },
      {
        title: "Progress Presentation 1",
        description: "Initial service implementation, model prototypes, and integration plan.",
        status: "Pending upload",
        href: "/submissions/slides/progress-presentation-1.pdf",
      },
      {
        title: "Progress Presentation 2",
        description: "Integrated workflows, evaluation updates, and near-final demonstration.",
        status: "Pending upload",
        href: "/submissions/slides/progress-presentation-2.pdf",
      },
      {
        title: "Final Presentation",
        description: "Complete system, deployment, evaluation, and contribution defense.",
        status: "Pending upload",
        href: "/submissions/slides/final-presentation.pdf",
      },
    ],
  },
  {
    category: "Stream deep dives",
    items: [
      {
        title: "F1 Smart Irrigation",
        description: "Sensor pipeline, Random Forest model, valve control, and water release logic.",
        status: "Pending upload",
        href: "/submissions/slides/f1-smart-irrigation.pdf",
      },
      {
        title: "F2 Crop Health",
        description: "Vegetation validation, zone health, and MobileNetV2 disease classification.",
        status: "Pending upload",
        href: "/submissions/slides/f2-crop-health.pdf",
      },
      {
        title: "F3 Forecasting",
        description: "Forecast horizons, risk bands, analytics routes, and alert generation.",
        status: "Pending upload",
        href: "/submissions/slides/f3-forecasting.pdf",
      },
      {
        title: "F4 ACA-O Optimization",
        description: "Fuzzy-TOPSIS, yield and price inference, PuLP area allocation, and Plan B.",
        status: "Pending upload",
        href: "/submissions/slides/f4-optimization.pdf",
      },
    ],
  },
];

export const team = [
  {
    initials: "DH",
    name: "Dilruksha A.G.C.D.",
    id: "IT22561770",
    email: "IT22561770@my.sliit.lk",
    stream: "F4 - Adaptive Crop and Area Optimization",
    focus: "Crop suitability, water budgeting, optimization, Plan B",
  },
  {
    initials: "HE",
    name: "Hesara P.K.A.N.",
    id: "IT22561398",
    email: "IT22561398@my.sliit.lk",
    stream: "F1 - IoT Smart Water Management",
    focus: "ESP32 telemetry, Random Forest irrigation, valve control",
  },
  {
    initials: "TR",
    name: "Trishni W.R.M.",
    id: "IT22076366",
    email: "IT22076366@my.sliit.lk",
    stream: "F3 - ML Time-Series Forecasting",
    focus: "Water level prediction, rainfall forecasting, risk alerts",
  },
  {
    initials: "AB",
    name: "Abishek W.R.M.",
    id: "IT22076547",
    email: "IT22076547@my.sliit.lk",
    stream: "F2 - Crop Health and Water Stress Detection",
    focus: "Zone analysis, crop stress, image disease prediction",
  },
];

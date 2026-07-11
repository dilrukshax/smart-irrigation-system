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
  { value: "11,687", label: "Udawalawe daily records" },
  { value: "10m", label: "Sentinel-2 analysis scale" },
  { value: "71,737", label: "Retail price observations" },
  { value: "1-14", label: "Day forecast horizon" },
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
      "Field telemetry, crop thresholds, reservoir safety gates, and ML predictions are fused into valve actions for quota-based irrigation fields.",
    metrics: [
      "11,687 Udawalawe daily hydrological records",
      "0.71 MCM RMSE for next-day release prediction",
    ],
    bullets: [
      "ESP32 telemetry for soil moisture, temperature, humidity, and field water level",
      "Random Forest field valve classifier plus HistGradientBoosting reservoir release predictor",
      "Manual officer queue when reservoir limits or quota rules block automated opening",
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
      "Remote-sensing zone health and plant image diagnosis identify stress early enough to prioritize irrigation and adjust crop planning.",
    metrics: [
      "10 m Sentinel-2 Level-2A pixel scale",
      "95.43% MobileNetV2 validation accuracy",
    ],
    bullets: [
      "NDVI and NDWI stress labels for Good, Moderate Stress, and High Stress zones",
      "Five-stage vegetation validation rejects cloud, water, urban, and non-crop requests",
      "Field stress index feeds F1 irrigation priority and F4 suitability penalties",
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
      "Reservoir and rainfall forecasts expose drought, flood, and uncertainty signals before they affect field schedules or seasonal plans.",
    metrics: [
      "12 engineered time-series features",
      "P10/P50/P90 water-risk bands",
    ],
    bullets: [
      "Gradient Boosting, Random Forest, LSTM, ARIMA, ensemble, and anomaly layers",
      "Open-Meteo weather integration and water-level risk endpoints",
      "Forecast scenarios suppress irrigation after rain and constrain F4 water budgets",
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
      "Crop suitability, price signals, water quotas, field stress, and policy rules are combined into practical crop-area recommendations.",
    metrics: [
      "71,737 Hector retail price observations",
      "5-criterion Fuzzy-TOPSIS crop ranking",
    ],
    bullets: [
      "Fuzzy-TOPSIS balances soil, water, yield history, sensitivity, and crop duration",
      "LightGBM and neural price models provide market-risk signals for crop ranking",
      "Greedy/PuLP allocation logic handles water quota, area, profit, and paddy policy",
    ],
  },
];

export const literaturePoints = [
  "Sri Lankan irrigation schemes such as Udawalawe manage water through reservoir releases, branch canals, seasonal quotas, and farmer-level field decisions. A useful platform must therefore connect field demand with scheme-level storage and release planning.",
  "IoT soil and water-level sensing improves visibility inside fields, but isolated controllers cannot decide safely unless they also know forecasted rainfall, crop stress severity, reservoir safety limits, and quota availability.",
  "Remote sensing research shows that Sentinel-2 vegetation indices such as NDVI and NDWI can surface crop water stress at zone level, while plant-image transfer learning can provide disease-specific recommendations when a farmer uploads a field photo.",
  "Forecasting and optimization research can support release planning and crop-area allocation, but most prototypes treat these as separate systems. This project studies them as one operating loop where forecast risk and crop stress alter irrigation and crop plans.",
];

export const researchObjectives = [
  {
    title: "Automate irrigation decisions",
    detail:
      "Use ESP32 telemetry, crop threshold tables, a Random Forest valve classifier, and reservoir release prediction to recommend OPEN, CLOSE, or HOLD actions for each field.",
  },
  {
    title: "Detect crop health and water stress",
    detail:
      "Combine Sentinel-2 NDVI/NDWI zone analysis with MobileNetV2 image prediction to classify field stress, disease severity, and treatment recommendations.",
  },
  {
    title: "Forecast rainfall and reservoir risk",
    detail:
      "Generate 1-14 day water-level and rainfall forecasts, P10/P50/P90 risk bands, and anomaly alerts for drought, flood, and canal demand pressure.",
  },
  {
    title: "Optimize crop area under quota",
    detail:
      "Use Fuzzy-TOPSIS, market price prediction, yield assumptions, and constrained allocation to recommend crop mixes that respect soil, water, profit, and paddy policy rules.",
  },
];

export const domainDetails = [
  {
    title: "Irrigation command-area operations",
    detail:
      "The project is grounded in canal-based irrigation, where reservoir level, active storage, inflow, rainfall, spillway discharge, and LB/RB main canal releases shape how much water can be issued to fields.",
    evidence: "F1 uses Udawalawe operational records from 1994-2025 and predicts next-day main canal release in MCM.",
  },
  {
    title: "Field water stress and crop health",
    detail:
      "The crop-health stream treats water stress as a spatial signal. NDVI measures vegetation vigor, NDWI reflects canopy water content, and a stress index converts zone results into field-level priority.",
    evidence: "F2 maps zones into Good, Moderate Stress, and High Stress, then sends penalty and priority values to F1 and F4.",
  },
  {
    title: "Reservoir risk under monsoon uncertainty",
    detail:
      "The forecasting stream focuses on short-horizon reservoir behavior in Sri Lanka's seasonal rainfall context, where dry spells, sudden inflows, and human release timing all matter.",
    evidence: "F3 exposes 1-14 day forecasts and P10/P50/P90 scenarios so downstream services can make conservative or optimistic plans.",
  },
  {
    title: "Crop economics and seasonal allocation",
    detail:
      "The optimization stream connects agronomic suitability with volatile Sri Lankan retail prices, seasonal Maha/Yala context, water quota, and minimum paddy allocation policies.",
    evidence: "F4 combines Hector retail prices, climate data, crop suitability weights, and allocation constraints into recommendation responses.",
  },
];

export const methodologyPhases = [
  {
    title: "Domain study and research gap",
    detail:
      "The work begins with the operating reality of Udawalawe-style irrigation: water is issued through reservoirs and canals, farmers need plot-level decisions, and authorities must keep within scheme-level quotas.",
    outputs: ["Literature survey", "Problem definition", "Service boundaries", "Evaluation criteria"],
  },
  {
    title: "Data acquisition and cleaning",
    detail:
      "Each stream builds its own evidence base: hydrological Excel sheets for release prediction, Sentinel-2 and PlantVillage data for crop health, reservoir time series for forecasting, and price/climate datasets for optimization.",
    outputs: ["NaN handling", "Time-based splits", "Feature dictionaries", "Reusable model artifacts"],
  },
  {
    title: "Feature engineering and modelling",
    detail:
      "The models use domain-shaped features rather than generic inputs: lagged canal releases, rolling rainfall, NDVI/NDWI thresholds, monsoon encodings, price lags, and water-stress constraints.",
    outputs: ["46 irrigation features", "12 forecasting features", "NDVI/NDWI labels", "24 LightGBM price features"],
  },
  {
    title: "Decision logic and integration",
    detail:
      "Model predictions are converted into actions using service rules. F1 gates valve decisions with reservoir limits, F2 converts stress into priority, F3 turns uncertainty into water scenarios, and F4 turns those signals into crop-area recommendations.",
    outputs: ["Manual request queue", "Stress penalty factor", "P10/P50/P90 scenarios", "Plan B recommendations"],
  },
  {
    title: "Evaluation and honest limitation tracking",
    detail:
      "The project records both strong results and current weaknesses, including synthetic irrigation labels, proxy satellite stress labels, F3's single-sheet notebook limitation, and F4's price-data mismatch.",
    outputs: ["Model metrics", "Architecture diagrams", "Known limitations", "Future work roadmap"],
  },
];

export const streamDeepDives = [
  {
    id: "f1",
    label: "F1 - IoT Smart Water Management",
    domain: "Reservoir-to-field irrigation control",
    dataset:
      "Udawalawe Hydrological Data, 32 year-sheets from 1994-2025, 11,687 daily records and 10,945 model-ready rows after target cleaning.",
    method:
      "A HistGradientBoostingRegressor predicts next-day combined canal release from 46 engineered hydrological features, while a RandomForestClassifier recommends field valve actions from soil moisture, temperature, humidity, and time of day.",
    evaluation:
      "The selected release model achieved MAE 0.4412 MCM, RMSE 0.7108 MCM, and R2 0.7949 on the 2023-2025 time-based test set.",
    integration:
      "F1 consumes rainfall forecasts from F3 and crop stress priority from F2, then blocks or escalates valve actions using reservoir level, quota, and manual approval rules.",
    caveat:
      "The field-level valve classifier currently uses synthetic labels, so real sensor and valve-log retraining is a future improvement.",
  },
  {
    id: "f2",
    label: "F2 - Crop Health and Water Stress",
    domain: "Remote sensing, crop disease, and field stress priority",
    dataset:
      "Sentinel-2 Level-2A imagery over Udawalawe at 10 m scale, plus PlantVillage crop-image data for 38 disease and healthy classes.",
    method:
      "Track A computes NDVI and NDWI, applies vegetation validation, and classifies zone stress with Random Forest. Track B uses MobileNetV2 transfer learning for uploaded crop-image diagnosis.",
    evaluation:
      "The satellite Random Forest reaches about 99% accuracy on NDVI/NDWI-derived labels, and MobileNetV2 reaches 95.43% best validation accuracy after 10 epochs.",
    integration:
      "A field-level stress index maps mild and severe zone ratios into low, medium, high, or critical priority for F1 and a penalty factor for F4 suitability scoring.",
    caveat:
      "The satellite labels are proxy labels derived from vegetation index thresholds, so field-verified stress observations would strengthen validation.",
  },
  {
    id: "f3",
    label: "F3 - ML Time-Series Forecasting and Alerting",
    domain: "Reservoir water-level forecasting and risk bands",
    dataset:
      "The forecasting notebook references the same 1994-2025 Udawalawe workbook, but the current notebook loads only the first 1994 sheet, producing 358 cleaned rows.",
    method:
      "Experiments include Random Forest, Gradient Boosting, LSTM, and quantile regressors; the service architecture adds Linear Regression, ARIMA/SARIMA, ensemble forecasting, and anomaly detection.",
    evaluation:
      "On the limited 1994 subset, Gradient Boosting is the best notebook model with RMSE 2.8763 mMSL and MAE 2.7027 mMSL, while negative R2 values are documented as a dataset loading limitation.",
    integration:
      "F3 provides 1-14 day forecasts, weather intelligence, and P10/P50/P90 water scenarios to suppress unnecessary irrigation and constrain optimization under conservative water availability.",
    caveat:
      "The documented next step is multi-sheet loading to move from 365 rows to about 11,687 rows, with expected RMSE below 1.0 mMSL.",
  },
  {
    id: "f4",
    label: "F4 - Adaptive Crop and Area Optimization",
    domain: "Crop suitability, market risk, and constrained area planning",
    dataset:
      "The optimization stream uses 71,737 Hector retail price observations, 314,000 climate records, 1,039 paddy cultivation records, and a 324-row rice time series baseline.",
    method:
      "Fuzzy-TOPSIS ranks crop suitability across soil, water coverage, yield, water sensitivity, and growth duration; price models and allocation logic then estimate profit and assign hectares under constraints.",
    evaluation:
      "The price neural model reports MAE Rs. 115.66/kg and RMSE Rs. 175.81/kg; 5-fold validation remains stable, while the crop recommender is treated as a market signal rather than full agronomic truth.",
    integration:
      "F4 pulls water availability from F1, stress penalties from F2, and P10/P50/P90 forecast scenarios from F3 before returning Top-3 crop plans, water budget use, risk level, and Plan B options.",
    caveat:
      "Current area allocation uses a greedy heuristic with the PuLP formulation documented as the target solver for larger scheme-level optimization.",
  },
];

export const researchEvidence = [
  {
    stream: "F1",
    metric: "Release prediction",
    value: "RMSE 0.7108 MCM",
    detail: "HistGradientBoosting on 2023-2025 test data from the 32-sheet Udawalawe workbook.",
  },
  {
    stream: "F2",
    metric: "Disease classification",
    value: "95.43% val accuracy",
    detail: "MobileNetV2 transfer learning across 38 PlantVillage crop health classes.",
  },
  {
    stream: "F3",
    metric: "Best current forecast",
    value: "RMSE 2.8763 mMSL",
    detail: "Gradient Boosting on the limited 1994 notebook subset; full multi-year training is documented as the fix.",
  },
  {
    stream: "F4",
    metric: "Price prediction",
    value: "MAE Rs. 115.66/kg",
    detail: "PricePredictorNN result on Hector-derived crop price data, used as a relative market signal.",
  },
];

export const integrationSignals = [
  {
    from: "F2 Crop Health",
    to: "F1 Irrigation",
    signal: "stress_priority",
    use: "High or critical stress can elevate an OPEN request and increase officer attention.",
  },
  {
    from: "F3 Forecasting",
    to: "F1 Irrigation",
    signal: "rain_forecast_24h",
    use: "Forecasted rain can reduce valve position or suppress unnecessary watering.",
  },
  {
    from: "F1 Irrigation",
    to: "F4 Optimization",
    signal: "quota_remaining_mm",
    use: "The optimizer uses live water availability as a hard constraint for crop-area allocation.",
  },
  {
    from: "F3 Forecasting",
    to: "F4 Optimization",
    signal: "P10/P50/P90 water scenarios",
    use: "Crop plans can be evaluated under conservative, expected, and optimistic water conditions.",
  },
  {
    from: "F2 Crop Health",
    to: "F4 Optimization",
    signal: "penalty_factor",
    use: "Stressed fields receive reduced effective suitability before crop ranking.",
  },
];

export const limitationsAndFutureWork = [
  "Replace F1 synthetic valve labels with real Udawalawe sensor and actuator logs from field trials.",
  "Validate F2 satellite stress labels using agronomist or field-survey ground truth instead of only NDVI/NDWI proxy rules.",
  "Fix F3 multi-sheet loading so the forecasting notebook trains on the full 1994-2025 workbook rather than only 1994.",
  "Move F4 allocation from the active greedy heuristic to the documented PuLP linear programming solver for larger multi-field planning.",
  "Recalibrate thresholds, Fuzzy-TOPSIS weights, reservoir gates, and crop calendars before applying the platform to irrigation schemes outside Udawalawe.",
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
    title: "Backend services and APIs",
    description: "Independent microservices expose typed REST contracts for irrigation, crop health, forecasting, optimization, auth, IoT, and gateway routing.",
    items: ["Python 3.11", "FastAPI", "Uvicorn", "Pydantic", "SQLAlchemy", "JWT roles"],
  },
  {
    title: "Data, telemetry, and messaging",
    description: "Operational readings, recommendations, event streams, and cached service context are stored or exchanged through the shared platform layer.",
    items: ["PostgreSQL", "Redis", "Mosquitto MQTT", "JSON event contracts", "Sensor payloads"],
  },
  {
    title: "Machine learning and optimization",
    description: "Each stream uses the model family that fits its domain: tree models for tabular hydrology, CNN transfer learning for images, statistical forecasting for time series, and optimization for crop planning.",
    items: ["scikit-learn", "TensorFlow Keras", "PyTorch", "LightGBM", "statsmodels", "PuLP", "pandas"],
  },
  {
    title: "Frontend and infrastructure",
    description: "The website and dashboard are backed by typed frontend routes and deployment assets that support repeatable demonstrations.",
    items: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "Docker", "Kubernetes", "Terraform"],
  },
  {
    title: "Remote sensing and climate sources",
    description: "The domain layer depends on agricultural and hydrological evidence from satellite imagery, public weather APIs, and Sri Lankan operational datasets.",
    items: ["Sentinel-2", "NDVI", "NDWI", "Open-Meteo", "NASA POWER", "Hector prices"],
  },
  {
    title: "IoT and control layer",
    description: "Field hardware and control rules keep the research connected to real irrigation actions rather than only analytical dashboards.",
    items: ["ESP32", "Soil moisture sensors", "Water-level sensors", "Valve control", "Manual approvals"],
  },
];

export const milestones = [
  {
    id: "proposal",
    name: "Project Proposal",
    date: "Week 6, Semester 1",
    type: "Individual document",
    detail:
      "Each member submits an individual proposal covering background, literature, research gap, problem, objectives, contribution, methodology, and timeline.",
  },
  {
    id: "pp1",
    name: "Progress Presentation 1",
    date: "Week 11, Semester 1",
    type: "Group presentation",
    detail:
      "Demonstrates roughly half of the system, including early ML models, service structure, core APIs, IoT data flow, and initial user interfaces.",
  },
  {
    id: "pp2",
    name: "Progress Presentation 2",
    date: "Week 6-8, Semester 2",
    type: "Group presentation",
    detail:
      "Shows near-complete integration across F1 to F4, role-based workflows, deployed services, and validated model behavior.",
  },
  {
    id: "final",
    name: "Final Assessment",
    date: "Week 12-13, Semester 2",
    type: "Group demonstration",
    detail:
      "Final system demonstration with documentation, deployment evidence, evaluation results, and defense of the integrated research contribution.",
  },
  {
    id: "viva",
    name: "Viva",
    date: "After final assessment",
    type: "Individual oral examination",
    detail:
      "Each member explains and defends their research contribution, implementation decisions, model choices, and integration results.",
  },
  {
    id: "research-paper",
    name: "Research Paper",
    date: "End of Semester 2",
    type: "Group submission",
    detail:
      "Publication-style paper that documents the integrated platform, methodology, evaluation, and comparison against existing work.",
  },
  {
    id: "logbook",
    name: "Logbook and Status Documents",
    date: "Continuous",
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
        description: "Integrated group report covering F1-F4 architecture, methodology, implementation, and evaluation.",
        status: "PDF | 94 pages",
        href: "/submissions/documents/final-document-main.pdf",
      },
      {
        title: "Research Paper IEEE (Draft)",
        description: "Publication-style manuscript draft with problem context, method, and integrated contribution.",
        status: "PDF | 7 pages",
        href: "/submissions/documents/research-paper-ieee-draft.pdf",
      },
      {
        title: "Team Assessment Form (TAF)",
        description: "Team assessment form and supporting submission summary for the project group.",
        status: "PDF | 17 pages",
        href: "/submissions/documents/team-assessment-form-taf.pdf",
      },
    ],
  },
  {
    category: "Individual proposal reports",
    items: [
      {
        title: "Proposal Report - IT22561398",
        description: "Proposal submission for the F1 IoT smart irrigation and valve-control stream.",
        status: "PDF | 30 pages",
        href: "/submissions/documents/proposal-f1.pdf",
      },
      {
        title: "Proposal Report - IT22186942",
        description: "Proposal submission for the F2 hybrid satellite crop health monitoring stream.",
        status: "PDF | 38 pages",
        href: "/submissions/documents/proposal-f2.pdf",
      },
      {
        title: "Proposal Report - IT22076366",
        description: "Proposal submission for the F3 forecasting and water-risk modelling stream.",
        status: "PDF | 53 pages",
        href: "/submissions/documents/proposal-f3.pdf",
      },
      {
        title: "Proposal Report - IT22561770",
        description: "Proposal submission for the F4 adaptive crop and area optimization stream.",
        status: "PDF | 37 pages",
        href: "/submissions/documents/proposal-f4.pdf",
      },
    ],
  },
  {
    category: "Individual final documents",
    items: [
      {
        title: "Final Document - F1, Hesara",
        description: "IoT smart irrigation, water management, and ML valve control final draft.",
        status: "PDF | 47 pages",
        href: "/submissions/documents/final-document-f1.pdf",
      },
      {
        title: "Final Document - F2, Abishek",
        description: "Crop health, water stress detection, and image disease prediction final draft.",
        status: "PDF | 55 pages",
        href: "/submissions/documents/final-document-f2.pdf",
      },
      {
        title: "Final Document - F3, Trishni",
        description: "Time-series forecasting, weather intelligence, and risk alerts final draft.",
        status: "PDF | 49 pages",
        href: "/submissions/documents/final-document-f3.pdf",
      },
      {
        title: "Final Document - F4, Dilruksha",
        description: "Crop suitability, optimization, water budgeting, and Plan B final draft.",
        status: "PDF | 48 pages",
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
        status: "PDF | 23 pages",
        href: "/submissions/slides/progress-presentation-1.pdf",
      },
      {
        title: "Progress Presentation 2",
        description: "Integrated workflows, evaluation updates, and near-final demonstration.",
        status: "PDF | 12 pages",
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
    initials: "HE",
    name: "Hesara P.K.A.N.",
    id: "IT22561398",
    email: "it22561398@my.sliit.lk",
    stream: "F1 - IoT Smart Water Management",
    focus: "ESP32 telemetry, Random Forest irrigation, valve control",
  },
  {
    initials: "AB",
    name: "Abishek S.",
    id: "IT22186942",
    email: "it22186942@my.sliit.lk",
    stream: "F2 - Crop Health and Water Stress Detection",
    focus: "Zone analysis, crop stress, image disease prediction",
  },
  {
    initials: "TR",
    name: "Trishni W.R.M.",
    id: "IT22076366",
    email: "it22076366@my.sliit.lk",
    stream: "F3 - ML Time-Series Forecasting",
    focus: "Water level prediction, rainfall forecasting, risk alerts",
  },
  {
    initials: "DH",
    name: "Dilruksha A.G.C.D.",
    id: "IT222561770",
    email: "it222561770@my.sliit.lk",
    stream: "F4 - Adaptive Crop and Area Optimization",
    focus: "Crop suitability, water budgeting, optimization, Plan B",
  },
];

export const problemsOvercome = [
  {
    title: "Inefficient Scheduling & High Water Waste",
    problem: "Traditional flood irrigation is applied on fixed 7-10 day schedules or on manual observation, ignoring weather forecasts and leading to estimated water losses of 35-50%.",
    solution: "ASICOP uses live soil moisture telemetry and a RandomForestClassifier combined with HistGradientBoosting reservoir release predictions, reducing field-level water waste by 20-35%.",
    accent: "water"
  },
  {
    title: "Rigid Seasonal Water Quota Allocation",
    problem: "Sri Lankan command-area schemes allocate top-down water quotas before the season. These quotas are highly rigid and cannot adapt to crop changes or weather fluctuations mid-season.",
    solution: "The F4 ACA-O service formulates a mathematical PuLP Mixed-Integer programming model that optimizes crop and area allocation under water limits, and offers Plan B re-planning if quotas change mid-season.",
    accent: "harvest"
  },
  {
    title: "Delayed Field Stress & Disease Alerts",
    problem: "Agronomists and officers manually survey fields to detect stress and disease. By the time visual symptoms are identified, the damage to crop health is often irreversible.",
    solution: "F2 integrates 10m Sentinel-2 satellite indices (NDVI/NDWI) for early zone-level stress detection, and a fine-tuned MobileNetV2 leaf image classifier for instant 38-class edge disease diagnosis.",
    accent: "leaf"
  },
  {
    title: "Market Price Shocks & Price Volatility",
    problem: "Farmers decide what crops to cultivate based on current prices, leading to crop gluts and severe market price crashes at harvest time.",
    solution: "F4 runs a LightGBM price predictor trained on 71,737 retail price observations, feeding anticipated farmgate prices into a Fuzzy-TOPSIS scorer to ensure crops are selected for economic viability.",
    accent: "clay"
  }
];

export const technicalDetails = [
  {
    name: "F1 - Smart Irrigation",
    algorithm: "RandomForest & HistGradientBoosting",
    dataset: "31 Years of Udawalawe Hydrology Data",
    metric: "0.71 MCM Inflow RMSE",
    impact: "20-35% water savings vs static scheduler"
  },
  {
    name: "F2 - Crop Health",
    algorithm: "MobileNetV2 Transfer Learning & Sentinel-2",
    dataset: "54,306 images (38 plant-disease classes)",
    metric: "95.43% disease classification accuracy",
    impact: "Automated vegetation validation & zone stress map"
  },
  {
    name: "F3 - Water Forecasting",
    algorithm: "ARIMA/SARIMA & LSTM Ensembles",
    dataset: "1994-2025 Udawalawe level time series",
    metric: "P10/P50/P90 risk scenarios & alerts",
    impact: "1-14 day lookahead for reservoir/rainfall"
  },
  {
    name: "F4 - Crop Optimization",
    algorithm: "Fuzzy-TOPSIS & PuLP MIP Solver",
    dataset: "71,737 Hector farmgate price records",
    metric: "Expected profit vs water budget optimization",
    impact: "Top-3 recommendations & dynamic Plan B updates"
  }
];


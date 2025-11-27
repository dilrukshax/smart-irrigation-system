# Smart Irrigation Platform - Frontend

React + TypeScript + Vite web dashboard for the Smart Irrigation & Crop Optimization Platform.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **MUI (Material UI)** - Component library
- **React Router** - Routing
- **TanStack Query** - Data fetching
- **Recharts** - Charts
- **Leaflet** - Maps
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:8005](http://localhost:8005) to view the dashboard.

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/              # API client and endpoints
├── assets/           # Static assets
├── components/       # Reusable UI components
├── config/           # Configuration files
├── contexts/         # React Context providers
├── features/         # Feature modules (F1-F4)
│   ├── f1-irrigation/
│   ├── f2-crop-health/
│   ├── f3-forecasting/
│   └── f4-acao/
├── hooks/            # Custom hooks
├── layouts/          # Page layouts
├── pages/            # Top-level pages
├── services/         # Business logic
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## Feature Modules

### F1 - IoT Smart Water Management
- Real-time sensor monitoring
- Irrigation scheduling
- Water usage analytics

### F2 - Satellite Crop Health
- Health status maps
- NDVI/NDWI trends
- Stress alerts

### F3 - Time-Series Forecasting
- Rainfall forecasts
- Reservoir level predictions
- Risk indicators

### F4 - ACA-O (Crop & Area Optimization)
- Crop recommendations
- Area allocation optimization
- Scenario analysis

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_F4_SERVICE_URL=http://localhost:8004
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

This project is part of the 4th Year Software Engineering Research Project.

import { Routes, Route } from 'react-router-dom';
import MainLayout from '@layouts/MainLayout';
import AuthLayout from '@layouts/AuthLayout';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

// Feature Pages - F1 Irrigation
import IrrigationDashboard from '@features/f1-irrigation/pages/IrrigationDashboard';

// Feature Pages - F2 Crop Health
import CropHealthDashboard from '@features/f2-crop-health/pages/CropHealthDashboard';

// Feature Pages - F3 Forecasting
import ForecastDashboard from '@features/f3-forecasting/pages/ForecastDashboard';

// Feature Pages - F4 ACA-O
import ACAODashboard from '@features/f4-acao/pages/ACAODashboard';
import FieldRecommendations from '@features/f4-acao/pages/FieldRecommendations';
import OptimizationPlanner from '@features/f4-acao/pages/OptimizationPlanner';

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Main App Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        {/* F1 - Irrigation Routes */}
        <Route path="/irrigation" element={<IrrigationDashboard />} />

        {/* F2 - Crop Health Routes */}
        <Route path="/crop-health" element={<CropHealthDashboard />} />

        {/* F3 - Forecasting Routes */}
        <Route path="/forecasting" element={<ForecastDashboard />} />

        {/* F4 - ACA-O Routes */}
        <Route path="/optimization" element={<ACAODashboard />} />
        <Route path="/optimization/recommendations" element={<FieldRecommendations />} />
        <Route path="/optimization/planner" element={<OptimizationPlanner />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

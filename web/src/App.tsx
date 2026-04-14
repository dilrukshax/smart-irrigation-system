import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@layouts/MainLayout';
import AuthLayout from '@layouts/AuthLayout';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NotFound from '@/pages/NotFound';
import FarmerPortal from '@/pages/FarmerPortal';
import FarmerFieldWorkspace from '@/pages/FarmerFieldWorkspace';
import FarmerLanding from '@/pages/FarmerLanding';
import FarmerRegister from '@/pages/FarmerRegister';
import AboutUs from '@/pages/AboutUs';
import ResearchTopics from '@/pages/ResearchTopics';
import DataParameters from '@/pages/DataParameters';
import AnalyticsCenter from '@/pages/AnalyticsCenter';
import ContactUs from '@/pages/ContactUs';

// Authority Pages
import AdminUserList from '@/pages/admin/AdminUserList';
import OfficerManualRequestsPage from '@/pages/operations/OfficerManualRequestsPage';
import AuthorityPoliciesPage from '@/pages/operations/AuthorityPoliciesPage';
import OfficerHydraulicsPage from '@/pages/operations/OfficerHydraulicsPage';
import OfficerOperationsDashboard from '@/pages/operations/OfficerOperationsDashboard';

// Auth Components
import { ProtectedRoute, AuthorityRoute, PublicRoute, RoleRoute } from '@components/auth/ProtectedRoute';

// Feature Pages - F1 Irrigation
import IrrigationDashboard from '@features/f1-irrigation/pages/IrrigationDashboard';
import WaterManagementDashboard from '@features/f1-irrigation/pages/WaterManagementDashboard';
import CropFieldDashboard from '@features/f1-irrigation/pages/CropFieldDashboard';
import SensorTelemetry from '@features/f1-irrigation/pages/SensorTelemetry';
import FieldProfilePage from '@features/f1-irrigation/pages/FieldProfilePage';
import FarmerOnboardingWizard from '@features/f1-irrigation/pages/FarmerOnboardingWizard';

// Feature Pages - F2 Crop Health
import CropHealthDashboard from '@features/f2-crop-health/pages/CropHealthDashboard';

// Feature Pages - F3 Forecasting
import EnhancedForecastDashboard from '@features/f3-forecasting/pages/EnhancedForecastDashboard';

// Feature Pages - F4 ACA-O
import ACAODashboard from '@features/f4-acao/pages/ACAODashboard';
import FieldRecommendations from '@features/f4-acao/pages/FieldRecommendations';
import OptimizationPlanner from '@features/f4-acao/pages/OptimizationPlanner';
import Scenarios from '@features/f4-acao/pages/Scenarios';
import AdaptiveRecommendations from '@features/f4-acao/pages/AdaptiveRecommendations';
import { ROUTES } from '@/config/routes';

function App() {
  return (
    <Routes>
      {/* Auth Routes - Public only (redirect if logged in) */}
      <Route element={<AuthLayout />}>
        <Route element={<PublicRoute />}>
          <Route path={ROUTES.PUBLIC.HOME} element={<FarmerLanding />} />
          <Route path={ROUTES.LANDING} element={<FarmerLanding />} />
          <Route path={ROUTES.FARMER.LANDING} element={<FarmerLanding />} />
          <Route path={ROUTES.PUBLIC.ABOUT} element={<AboutUs />} />
          <Route path={ROUTES.PUBLIC.RESEARCH} element={<ResearchTopics />} />
          <Route path={ROUTES.PUBLIC.PARAMETERS} element={<DataParameters />} />
          <Route path={ROUTES.PUBLIC.ANALYTICS} element={<AnalyticsCenter />} />
          <Route path={ROUTES.PUBLIC.CONTACT} element={<ContactUs />} />
          <Route path="/farmer/login" element={<Navigate to="/login" replace />} />
          <Route path={ROUTES.FARMER.REGISTER} element={<FarmerRegister />} />
          <Route path="/authority/login" element={<Navigate to="/login" replace />} />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
        </Route>
      </Route>

      {/* Main App Routes - Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.FARMER.ROOT} element={<Navigate to={ROUTES.FARMER.FIELDS} replace />} />
          <Route path={ROUTES.FARMER.FIELDS} element={<FarmerPortal />} />
          <Route path={ROUTES.FARMER.FIELD_WORKSPACE} element={<FarmerFieldWorkspace />} />
          <Route path={ROUTES.FARMER.ONBOARDING} element={<FarmerOnboardingWizard />} />
          <Route path={ROUTES.FARMER.FIELD_PROFILE} element={<FieldProfilePage />} />

          {/* F1 - Irrigation Routes */}
          <Route path={ROUTES.IRRIGATION.ROOT} element={<IrrigationDashboard />} />
          <Route path={ROUTES.IRRIGATION.TELEMETRY} element={<SensorTelemetry />} />
          <Route path={ROUTES.IRRIGATION.WATER_MANAGEMENT} element={<WaterManagementDashboard />} />
          <Route path={ROUTES.IRRIGATION.CROP_FIELDS} element={<CropFieldDashboard />} />
          <Route path={ROUTES.IRRIGATION.DEVICE_TELEMETRY} element={<SensorTelemetry />} />
          <Route path="/irrigation/fields/:fieldId/profile" element={<FieldProfilePage />} />

          {/* F2 - Crop Health Routes */}
          <Route path={ROUTES.CROP_HEALTH.ROOT} element={<CropHealthDashboard />} />

          {/* F3 - Forecasting Routes */}
          <Route path={ROUTES.FORECASTING.ROOT} element={<EnhancedForecastDashboard />} />

          {/* F4 - ACA-O Routes */}
          <Route path={ROUTES.OPTIMIZATION.ROOT} element={<ACAODashboard />} />
          <Route path={ROUTES.OPTIMIZATION.RECOMMENDATIONS} element={<FieldRecommendations />} />
          <Route path={ROUTES.OPTIMIZATION.PLANNER} element={<OptimizationPlanner />} />
          <Route path={ROUTES.OPTIMIZATION.SCENARIOS} element={<Scenarios />} />
          <Route path={ROUTES.OPTIMIZATION.ADAPTIVE} element={<AdaptiveRecommendations />} />

          {/* Authority Routes - Requires authority role */}
          <Route element={<AuthorityRoute />}>
            <Route path={ROUTES.AUTHORITY.USERS} element={<AdminUserList />} />
            <Route path={ROUTES.AUTHORITY.POLICIES} element={<AuthorityPoliciesPage />} />
          </Route>

          {/* Officer/Authority Operations */}
          <Route element={<RoleRoute allowedRoles={['officer', 'authority']} />}>
            <Route path={ROUTES.OFFICER.ROOT} element={<Navigate to={ROUTES.OFFICER.OVERVIEW} replace />} />
            <Route path={ROUTES.OFFICER.OVERVIEW} element={<OfficerOperationsDashboard />} />
            <Route path={ROUTES.OFFICER.REQUESTS} element={<OfficerManualRequestsPage />} />
            <Route path={ROUTES.OFFICER.HYDRAULICS} element={<OfficerHydraulicsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;

/**
 * Protected Route Components
 * Route guards for authenticated and role-based access
 */

import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@contexts/AuthContext';
import { ROUTES } from '@config/routes';

/**
 * Loading spinner component
 */
function LoadingScreen() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography color="text.secondary">Loading...</Typography>
    </Box>
  );
}

/**
 * Not Authorized component
 */
function NotAuthorized() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
      }}
    >
      <Typography variant="h4" color="error">
        Access Denied
      </Typography>
      <Typography color="text.secondary">
        You do not have permission to access this page.
      </Typography>
    </Box>
  );
}

/**
 * Protected Route - requires authentication
 * Uses Outlet for nested routes
 */
export function ProtectedRoute() {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/**
 * Admin Route - requires admin role
 * Uses Outlet for nested routes
 */
export function AdminRoute() {
  const { isAuthenticated, isAdmin, isInitialized, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Show not authorized if not admin
  if (!isAdmin) {
    return <NotAuthorized />;
  }

  return <Outlet />;
}

interface RoleRouteProps {
  allowedRoles: string[];
}

/**
 * Role Route - requires specific roles
 * Uses Outlet for nested routes
 */
export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, hasRole, isInitialized, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check if user has any of the allowed roles
  const hasAllowedRole = allowedRoles.some((role) => hasRole(role));

  if (!hasAllowedRole) {
    return <NotAuthorized />;
  }

  return <Outlet />;
}

/**
 * Public Route - only accessible when NOT authenticated
 * Redirects to dashboard if already logged in
 * Uses Outlet for nested routes
 */
export function PublicRoute() {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || ROUTES.HOME;

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to previous page or home if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

import { Outlet, useLocation } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { ROUTES } from '@config/routes';

export default function AuthLayout() {
  const location = useLocation();
  const fullPagePublicRoutes = new Set([
    ROUTES.PUBLIC.HOME,
    ROUTES.LANDING,
    ROUTES.FARMER.LANDING,
    ROUTES.PUBLIC.ABOUT,
    ROUTES.PUBLIC.RESEARCH,
    ROUTES.PUBLIC.PARAMETERS,
    ROUTES.PUBLIC.ANALYTICS,
    ROUTES.PUBLIC.CONTACT,
  ]);
  const isLandingRoute = fullPagePublicRoutes.has(location.pathname);

  if (isLandingRoute) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          py: 3,
          px: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h5" component="h1" fontWeight={700}>
            Smart Irrigation Platform
          </Typography>
        </Container>
      </Box>
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}

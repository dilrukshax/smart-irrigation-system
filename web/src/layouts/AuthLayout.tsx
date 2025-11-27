import { Outlet } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';

export default function AuthLayout() {
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

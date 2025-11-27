import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';

export default function MinimalLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="md">
        <Outlet />
      </Container>
    </Box>
  );
}

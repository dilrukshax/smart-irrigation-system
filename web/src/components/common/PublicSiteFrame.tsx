import { type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ROUTES } from '@config/routes';

type PublicSiteFrameProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const NAV_LINKS = [
  { label: 'Home', to: ROUTES.PUBLIC.HOME },
  { label: 'About Us', to: ROUTES.PUBLIC.ABOUT },
  { label: 'Research', to: ROUTES.PUBLIC.RESEARCH },
  { label: 'Data Parameters', to: ROUTES.PUBLIC.PARAMETERS },
  { label: 'Analytics', to: ROUTES.PUBLIC.ANALYTICS },
  { label: 'Contact Us', to: ROUTES.PUBLIC.CONTACT },
];

export default function PublicSiteFrame({ title, subtitle, children }: PublicSiteFrameProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f2f7f3' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid rgba(20,40,20,0.1)',
          bgcolor: 'rgba(242,247,243,0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 1.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              Smart Irrigation Research Platform
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                {NAV_LINKS.map((link) => (
                  <Button key={link.to} component={RouterLink} to={link.to} size="small">
                    {link.label}
                  </Button>
                ))}
              </Stack>
              <Button component={RouterLink} to={ROUTES.FARMER.LOGIN} variant="outlined" size="small">
                Farmer Login
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {subtitle}
        </Typography>
        {children}
      </Container>
    </Box>
  );
}

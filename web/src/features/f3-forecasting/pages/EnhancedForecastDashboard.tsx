import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  WbSunny as WeatherIcon,
  BubbleChart as AnomalyIcon,
  Assessment as PerformanceIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import ForecastDashboard from './ForecastDashboard';
import { WeatherDashboard, AnomalyVisualization, ModelPerformanceCharts } from '../components';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const EnhancedForecastDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          🌊 Smart Irrigation Forecasting Center
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive forecasting, weather intelligence, and anomaly detection for your irrigation system
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          aria-label="Forecasting tabs"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontWeight: 500,
            },
          }}
        >
          <Tab
            icon={<DashboardIcon />}
            label="Overview"
            iconPosition="start"
            sx={{ minWidth: isMobile ? 'auto' : 150 }}
          />
          <Tab
            icon={<TimelineIcon />}
            label="Forecast"
            iconPosition="start"
            sx={{ minWidth: isMobile ? 'auto' : 150 }}
          />
          <Tab
            icon={<WeatherIcon />}
            label="Weather"
            iconPosition="start"
            sx={{ minWidth: isMobile ? 'auto' : 150 }}
          />
          <Tab
            icon={<AnomalyIcon />}
            label="Anomaly Detection"
            iconPosition="start"
            sx={{ minWidth: isMobile ? 'auto' : 150 }}
          />
          <Tab
            icon={<PerformanceIcon />}
            label="Model Analysis"
            iconPosition="start"
            sx={{ minWidth: isMobile ? 'auto' : 150 }}
          />
        </Tabs>
      </Paper>

      {/* Overview Tab - Shows compact widgets */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {/* Weather Widget */}
          <Box>
            <WeatherDashboard compact />
          </Box>
          
          {/* Model Performance Widget */}
          <Box>
            <ModelPerformanceCharts compact />
          </Box>
          
          {/* Quick Stats Card */}
          <Box>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  ✅ Forecasting Service: Online
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  ✅ Weather API: Connected
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                  ✅ ML Models: Ready
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  ✅ Anomaly Detection: Active
                </Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Last updated: {new Date().toLocaleTimeString()}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Feature highlights */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Quick Navigation
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {[
              { icon: <TimelineIcon />, title: 'Water Level Forecast', desc: '72-hour predictions', tab: 1 },
              { icon: <WeatherIcon />, title: 'Weather Intelligence', desc: '7-day forecast & irrigation', tab: 2 },
              { icon: <AnomalyIcon />, title: 'Anomaly Detection', desc: 'Multi-method analysis', tab: 3 },
              { icon: <PerformanceIcon />, title: 'Model Performance', desc: 'Compare ML models', tab: 4 },
            ].map((item, index) => (
              <Paper
                key={index}
                elevation={1}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => setTabValue(item.tab)}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      </TabPanel>

      {/* Forecast Tab - Original Dashboard */}
      <TabPanel value={tabValue} index={1}>
        <ForecastDashboard />
      </TabPanel>

      {/* Weather Tab */}
      <TabPanel value={tabValue} index={2}>
        <WeatherDashboard />
      </TabPanel>

      {/* Anomaly Detection Tab */}
      <TabPanel value={tabValue} index={3}>
        <AnomalyVisualization />
      </TabPanel>

      {/* Model Analysis Tab */}
      <TabPanel value={tabValue} index={4}>
        <ModelPerformanceCharts />
      </TabPanel>
    </Box>
  );
};

export default EnhancedForecastDashboard;

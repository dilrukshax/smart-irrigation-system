import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  WbSunny as SunIcon,
  Cloud as CloudIcon,
  Opacity as RainIcon,
  Air as WindIcon,
  WaterDrop as HumidityIcon,
  Refresh as RefreshIcon,
  Agriculture as IrrigationIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Bar,
  Legend,
  ComposedChart,
  Line,
  Area,
} from 'recharts';
import forecastingAPI, { type IrrigationRecommendation, getForecastApiErrorMessage, type WeatherCurrent, type WeatherForecast } from '../../../api/forecasting';

interface WeatherDashboardProps {
  compact?: boolean;
}

const WeatherDashboard: React.FC<WeatherDashboardProps> = ({ compact = false }) => {
  const theme = useTheme();
  const [currentWeather, setCurrentWeather] = useState<WeatherCurrent | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [irrigationRec, setIrrigationRec] = useState<IrrigationRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotices([]);
    try {
      const [currentResult, forecastResult, irrigationResult] = await Promise.allSettled([
        forecastingAPI.getCurrentWeather(),
        forecastingAPI.getWeatherForecast(7),
        forecastingAPI.getIrrigationRecommendation(),
      ]);

      const nextNotices: string[] = [];

      if (currentResult.status === 'fulfilled') {
        setCurrentWeather(currentResult.value);
        if (currentResult.value.status !== 'ok') {
          nextNotices.push(`Current weather is ${currentResult.value.status} (${currentResult.value.source}).`);
        }
      } else {
        setCurrentWeather(null);
        nextNotices.push('Current weather is unavailable.');
      }

      if (forecastResult.status === 'fulfilled') {
        setForecast(forecastResult.value);
        if (forecastResult.value.status !== 'ok') {
          nextNotices.push(`Weather forecast is ${forecastResult.value.status} (${forecastResult.value.source}).`);
        }
      } else {
        setForecast(null);
        nextNotices.push('Weather forecast is unavailable.');
      }

      if (irrigationResult.status === 'fulfilled') {
        setIrrigationRec(irrigationResult.value);
        if (irrigationResult.value.status !== 'ok') {
          nextNotices.push(`Irrigation recommendation is ${irrigationResult.value.status} (${irrigationResult.value.source}).`);
        }
      } else {
        setIrrigationRec(null);
        nextNotices.push('Irrigation recommendation is unavailable.');
      }

      if (currentResult.status === 'rejected' && forecastResult.status === 'rejected' && irrigationResult.status === 'rejected') {
        setError('All weather sources are unavailable right now.');
      }
      setNotices(nextNotices);
    } catch (err: any) {
      console.error('Error fetching weather:', err);
      setError(getForecastApiErrorMessage(err, 'Failed to fetch weather data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeatherData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) {
      return <RainIcon sx={{ color: '#1976d2', fontSize: 40 }} />;
    } else if (desc.includes('cloud') || desc.includes('overcast')) {
      return <CloudIcon sx={{ color: '#78909c', fontSize: 40 }} />;
    } else {
      return <SunIcon sx={{ color: '#ff9800', fontSize: 40 }} />;
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('SKIP') || rec.includes('REDUCE significantly')) return 'error';
    if (rec.includes('REDUCE')) return 'warning';
    if (rec.includes('INCREASE')) return 'info';
    return 'success';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok':
        return 'success';
      case 'stale':
      case 'analysis_pending':
        return 'warning';
      case 'source_unavailable':
      case 'data_unavailable':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEvaporationColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return theme.palette.error.main;
      case 'MEDIUM': return theme.palette.warning.main;
      case 'LOW': return theme.palette.success.main;
      default: return theme.palette.info.main;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  // Prepare chart data
  const forecastChartData = forecast?.daily.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    tempMax: day.temp_max_c,
    tempMin: day.temp_min_c,
    rain: day.rain_mm,
    rainProb: day.precipitation_probability,
  })) || [];

  const irrigationChartData = irrigationRec?.daily_schedule?.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    rain: day.expected_rain_mm,
    evapotranspiration: day.expected_evapotranspiration_mm,
    waterBalance: day.water_balance_mm,
    irrigationPercent: day.irrigation_percent,
  })) || [];
  const netWaterBalance = irrigationRec?.weekly_outlook?.net_water_balance_mm ?? 0;

  if (compact) {
    // Compact view for dashboard widget
    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Weather Conditions
            </Typography>
            <IconButton size="small" onClick={fetchWeatherData}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {notices[0] && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {notices[0]}
            </Alert>
          )}
          
          {currentWeather && (
            <Box display="flex" alignItems="center" gap={2}>
              {getWeatherIcon(currentWeather.conditions.weather_description || 'clear')}
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {currentWeather.conditions.temperature_c}°C
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentWeather.conditions.weather_description}
                </Typography>
              </Box>
              <Box ml="auto" textAlign="right">
                <Typography variant="body2">
                  <HumidityIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  {currentWeather.conditions.humidity_percent}%
                </Typography>
                <Typography variant="body2">
                  <RainIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  {currentWeather.conditions.rain_mm} mm
                </Typography>
              </Box>
            </Box>
          )}

          {!currentWeather && (
            <Typography variant="body2" color="text.secondary">
              Current weather is not available.
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Irrigation Recommendation
            </Typography>
            <Chip
              icon={<IrrigationIcon />}
              label={currentWeather?.irrigation_impact.recommendation || 'Normal'}
              color={getRecommendationColor(currentWeather?.irrigation_impact.recommendation || '')}
              size="small"
            />
            <Chip
              label={currentWeather?.status || 'unknown'}
              color={getStatusColor(currentWeather?.status) as any}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Weather & Irrigation Intelligence
        </Typography>
        <IconButton onClick={fetchWeatherData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {notices.map((notice, index) => (
        <Alert key={`${notice}-${index}`} severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      ))}

      <Grid container spacing={3}>
        {/* Current Weather Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Current Conditions
              </Typography>
              
              {currentWeather && (
                <>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    {getWeatherIcon(currentWeather.conditions.weather_description)}
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {currentWeather.conditions.temperature_c}°C
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {currentWeather.conditions.weather_description}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <HumidityIcon color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Humidity</Typography>
                            <Typography variant="h6">{currentWeather.conditions.humidity_percent}%</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <WindIcon color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Wind</Typography>
                            <Typography variant="h6">{currentWeather.conditions.wind_speed_kmh} km/h</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <RainIcon color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Rain</Typography>
                            <Typography variant="h6">{currentWeather.conditions.rain_mm} mm</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CloudIcon color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary">Clouds</Typography>
                            <Typography variant="h6">{currentWeather.conditions.cloud_cover_percent}%</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Evaporation Risk
                    </Typography>
                    <Chip
                      label={currentWeather.irrigation_impact.evaporation_risk}
                      sx={{ 
                        bgcolor: getEvaporationColor(currentWeather.irrigation_impact.evaporation_risk),
                        color: 'white'
                      }}
                    />
                  </Box>

                  <Box mt={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="text.secondary">
                        Data source: {currentWeather.source}
                      </Typography>
                      <Chip
                        label={currentWeather.status}
                        size="small"
                        color={getStatusColor(currentWeather.status) as any}
                      />
                    </Box>
                  </Box>
                </>
              )}

              {!currentWeather && (
                <Alert severity="warning">Current weather data is unavailable.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 7-Day Forecast Chart */}
        <Grid item xs={12} md={8}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    7-Day Forecast
                  </Typography>
                  {forecast && (
                    <Chip
                      label={forecast.status}
                      size="small"
                      color={getStatusColor(forecast.status) as any}
                    />
                  )}
                </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={forecastChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="temp" orientation="left" label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="rain" orientation="right" label={{ value: 'mm', angle: 90, position: 'insideRight' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempMax"
                    name="Max Temp"
                    stroke="#ff7043"
                    fill="#ff7043"
                    fillOpacity={0.3}
                  />
                  <Area
                    yAxisId="temp"
                    type="monotone"
                    dataKey="tempMin"
                    name="Min Temp"
                    stroke="#42a5f5"
                    fill="#42a5f5"
                    fillOpacity={0.3}
                  />
                  <Bar yAxisId="rain" dataKey="rain" name="Rainfall" fill="#1976d2" opacity={0.8} />
                </ComposedChart>
              </ResponsiveContainer>

              {forecast?.summary && (
                <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                  <Chip
                    label={`Total Rain: ${forecast.summary.total_precipitation_7d_mm} mm`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Avg Temp: ${forecast.summary.average_temp_c}°C`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Rainy Days: ${forecast.summary.rainy_days_count}`}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Irrigation Recommendation Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  <IrrigationIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Irrigation Recommendation
                </Typography>
                {irrigationRec && (
                  <Chip
                    label={irrigationRec.status}
                    size="small"
                    color={getStatusColor(irrigationRec.status) as any}
                  />
                )}
              </Box>

              {irrigationRec && (
                <>
                  <Alert 
                    severity={getRecommendationColor(irrigationRec.overall_recommendation || '') as any}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold">
                      {irrigationRec.overall_recommendation}
                    </Typography>
                  </Alert>

                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Expected Rain (7d)</Typography>
                      <Typography variant="h6">{irrigationRec.weekly_outlook?.total_expected_rain_mm} mm</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Expected Evaporation (7d)</Typography>
                      <Typography variant="h6">{irrigationRec.weekly_outlook?.total_expected_evapotranspiration_mm} mm</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Net Water Balance</Typography>
                      <Typography 
                        variant="h6"
                        color={netWaterBalance > 0 ? 'success.main' : 'warning.main'}
                      >
                        {netWaterBalance > 0 ? '+' : ''}
                        {netWaterBalance} mm
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Avg. Irrigation Adjustment</Typography>
                      <Typography variant="h6">{irrigationRec.weekly_outlook?.average_irrigation_adjustment_percent}%</Typography>
                    </Grid>
                  </Grid>
                </>
              )}

              {!irrigationRec && (
                <Alert severity="warning">Irrigation recommendation data is unavailable.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Water Balance Chart */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Daily Water Balance
              </Typography>

              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={irrigationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="rain" name="Rain (mm)" fill="#1976d2" stackId="water" />
                  <Bar dataKey="evapotranspiration" name="Evaporation (mm)" fill="#ff7043" stackId="loss" />
                  <Line type="monotone" dataKey="waterBalance" name="Balance" stroke="#4caf50" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Schedule */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Daily Irrigation Schedule
              </Typography>

              <Grid container spacing={2}>
                {irrigationRec?.daily_schedule?.slice(0, 7).map((day: any, index: number) => (
                  <Grid item xs={12} sm={6} md={3} lg={1.7} key={index}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: day.recommendation === 'SKIP' ? 'error.light' :
                                 day.recommendation === 'REDUCE' ? 'warning.light' :
                                 day.recommendation === 'INCREASE' ? 'info.light' : 'success.light',
                        borderRadius: 2,
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </Typography>
                      <Typography variant="body2">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" fontWeight="bold">
                        {day.irrigation_percent}%
                      </Typography>
                      <Typography variant="caption" display="block">
                        {day.recommendation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rain: {day.expected_rain_mm}mm
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WeatherDashboard;

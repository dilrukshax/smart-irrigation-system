"""
Weather API Integration

Provides real-time weather data from multiple sources:
- OpenWeatherMap API
- Open-Meteo (free, no API key required)
- Simulated fallback data

For Sri Lanka irrigation system context.
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import random

import httpx

logger = logging.getLogger(__name__)


class WeatherAPIClient:
    """
    Weather API client supporting multiple providers.
    
    Primary: Open-Meteo (free, no API key)
    Fallback: Simulated data based on seasonal patterns
    """
    
    # Sri Lanka coordinates (Udawalawe region)
    DEFAULT_LAT = 6.4389
    DEFAULT_LON = 80.8984
    
    # Open-Meteo API (free, no key required)
    OPEN_METEO_BASE = "https://api.open-meteo.com/v1"
    
    def __init__(
        self,
        latitude: float = DEFAULT_LAT,
        longitude: float = DEFAULT_LON,
        openweathermap_key: Optional[str] = None
    ):
        self.latitude = latitude
        self.longitude = longitude
        self.openweathermap_key = openweathermap_key
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5 minutes cache
        self._last_fetch: Dict[str, float] = {}
    
    async def get_current_weather(self) -> Dict[str, Any]:
        """
        Get current weather conditions.
        
        Returns:
            Dict with temperature, humidity, rainfall, wind, etc.
        """
        cache_key = "current"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            weather = await self._fetch_open_meteo_current()
            self._update_cache(cache_key, weather)
            return weather
        except Exception as e:
            logger.warning(f"Failed to fetch weather API: {e}. Using simulated data.")
            return self._generate_simulated_current()
    
    async def get_forecast(self, days: int = 7) -> Dict[str, Any]:
        """
        Get weather forecast for specified days.
        
        Args:
            days: Number of days to forecast (1-14)
        
        Returns:
            Dict with daily and hourly forecasts
        """
        cache_key = f"forecast_{days}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            forecast = await self._fetch_open_meteo_forecast(days)
            self._update_cache(cache_key, forecast)
            return forecast
        except Exception as e:
            logger.warning(f"Failed to fetch forecast: {e}. Using simulated data.")
            return self._generate_simulated_forecast(days)
    
    async def get_historical(self, days_back: int = 30) -> Dict[str, Any]:
        """
        Get historical weather data.
        
        Args:
            days_back: Number of days of historical data
        
        Returns:
            Dict with historical weather data
        """
        cache_key = f"historical_{days_back}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]
        
        try:
            historical = await self._fetch_open_meteo_historical(days_back)
            self._update_cache(cache_key, historical)
            return historical
        except Exception as e:
            logger.warning(f"Failed to fetch historical data: {e}. Using simulated data.")
            return self._generate_simulated_historical(days_back)
    
    async def _fetch_open_meteo_current(self) -> Dict[str, Any]:
        """Fetch current weather from Open-Meteo API."""
        url = f"{self.OPEN_METEO_BASE}/forecast"
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover",
            "timezone": "Asia/Colombo"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        current = data.get("current", {})
        
        return {
            "status": "success",
            "source": "open-meteo",
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "region": "Udawalawe, Sri Lanka"
            },
            "timestamp": datetime.now().isoformat(),
            "conditions": {
                "temperature_c": current.get("temperature_2m", 28),
                "humidity_percent": current.get("relative_humidity_2m", 75),
                "precipitation_mm": current.get("precipitation", 0),
                "rain_mm": current.get("rain", 0),
                "weather_code": current.get("weather_code", 0),
                "weather_description": self._weather_code_to_description(current.get("weather_code", 0)),
                "wind_speed_kmh": current.get("wind_speed_10m", 10),
                "wind_direction_deg": current.get("wind_direction_10m", 180),
                "pressure_hpa": current.get("pressure_msl", 1013),
                "cloud_cover_percent": current.get("cloud_cover", 50)
            },
            "irrigation_impact": self._calculate_irrigation_impact(current)
        }
    
    async def _fetch_open_meteo_forecast(self, days: int) -> Dict[str, Any]:
        """Fetch weather forecast from Open-Meteo API."""
        url = f"{self.OPEN_METEO_BASE}/forecast"
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,evapotranspiration",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,weather_code,sunrise,sunset,et0_fao_evapotranspiration",
            "timezone": "Asia/Colombo",
            "forecast_days": min(days, 14)
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        # Process daily forecast
        daily = data.get("daily", {})
        daily_forecast = []
        for i in range(len(daily.get("time", []))):
            daily_forecast.append({
                "date": daily["time"][i],
                "temp_max_c": daily.get("temperature_2m_max", [28])[i],
                "temp_min_c": daily.get("temperature_2m_min", [22])[i],
                "precipitation_mm": daily.get("precipitation_sum", [0])[i],
                "rain_mm": daily.get("rain_sum", [0])[i],
                "precipitation_probability": daily.get("precipitation_probability_max", [0])[i],
                "weather_code": daily.get("weather_code", [0])[i],
                "weather_description": self._weather_code_to_description(daily.get("weather_code", [0])[i]),
                "evapotranspiration_mm": daily.get("et0_fao_evapotranspiration", [5])[i],
                "sunrise": daily.get("sunrise", ["06:00"])[i],
                "sunset": daily.get("sunset", ["18:00"])[i]
            })
        
        # Process hourly forecast (next 48 hours)
        hourly = data.get("hourly", {})
        hourly_forecast = []
        for i in range(min(48, len(hourly.get("time", [])))):
            hourly_forecast.append({
                "datetime": hourly["time"][i],
                "temperature_c": hourly.get("temperature_2m", [28])[i],
                "humidity_percent": hourly.get("relative_humidity_2m", [75])[i],
                "precipitation_probability": hourly.get("precipitation_probability", [0])[i],
                "precipitation_mm": hourly.get("precipitation", [0])[i],
                "rain_mm": hourly.get("rain", [0])[i],
                "evapotranspiration_mm": hourly.get("evapotranspiration", [0.2])[i]
            })
        
        # Calculate aggregated stats
        total_rain_7d = sum([d.get("rain_mm", 0) or 0 for d in daily_forecast[:7]])
        avg_temp = sum([d.get("temp_max_c", 28) for d in daily_forecast[:7]]) / max(len(daily_forecast[:7]), 1)
        
        return {
            "status": "success",
            "source": "open-meteo",
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "region": "Udawalawe, Sri Lanka"
            },
            "generated_at": datetime.now().isoformat(),
            "forecast_days": days,
            "daily": daily_forecast,
            "hourly": hourly_forecast,
            "summary": {
                "total_precipitation_7d_mm": round(total_rain_7d, 1),
                "average_temp_c": round(avg_temp, 1),
                "rainy_days_count": sum(1 for d in daily_forecast[:7] if (d.get("rain_mm") or 0) > 1),
                "irrigation_recommendation": self._calculate_irrigation_recommendation(daily_forecast)
            }
        }
    
    async def _fetch_open_meteo_historical(self, days_back: int) -> Dict[str, Any]:
        """Fetch historical weather from Open-Meteo Archive API."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        url = f"{self.OPEN_METEO_BASE}/forecast"  # Use forecast with past_days
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation,rain",
            "past_days": min(days_back, 92),  # Max 92 days
            "forecast_days": 0,
            "timezone": "Asia/Colombo"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        hourly = data.get("hourly", {})
        historical_data = []
        
        for i in range(len(hourly.get("time", []))):
            historical_data.append({
                "datetime": hourly["time"][i],
                "temperature_c": hourly.get("temperature_2m", [28])[i],
                "humidity_percent": hourly.get("relative_humidity_2m", [75])[i],
                "precipitation_mm": hourly.get("precipitation", [0])[i],
                "rain_mm": hourly.get("rain", [0])[i]
            })
        
        # Aggregate by day
        daily_aggregated = self._aggregate_hourly_to_daily(historical_data)
        
        return {
            "status": "success",
            "source": "open-meteo",
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days_back
            },
            "hourly_data": historical_data[-168:],  # Last 7 days hourly
            "daily_data": daily_aggregated,
            "statistics": self._calculate_historical_stats(daily_aggregated)
        }
    
    def _aggregate_hourly_to_daily(self, hourly_data: List[Dict]) -> List[Dict]:
        """Aggregate hourly data to daily summaries."""
        daily = {}
        for h in hourly_data:
            date = h["datetime"][:10]
            if date not in daily:
                daily[date] = {
                    "date": date,
                    "temp_values": [],
                    "humidity_values": [],
                    "precipitation_total": 0,
                    "rain_total": 0
                }
            daily[date]["temp_values"].append(h.get("temperature_c", 28))
            daily[date]["humidity_values"].append(h.get("humidity_percent", 75))
            daily[date]["precipitation_total"] += h.get("precipitation_mm", 0) or 0
            daily[date]["rain_total"] += h.get("rain_mm", 0) or 0
        
        result = []
        for date, data in sorted(daily.items()):
            result.append({
                "date": date,
                "temp_max_c": max(data["temp_values"]) if data["temp_values"] else 28,
                "temp_min_c": min(data["temp_values"]) if data["temp_values"] else 22,
                "temp_avg_c": sum(data["temp_values"]) / len(data["temp_values"]) if data["temp_values"] else 25,
                "humidity_avg_percent": sum(data["humidity_values"]) / len(data["humidity_values"]) if data["humidity_values"] else 75,
                "precipitation_mm": round(data["precipitation_total"], 1),
                "rain_mm": round(data["rain_total"], 1)
            })
        
        return result
    
    def _calculate_historical_stats(self, daily_data: List[Dict]) -> Dict[str, Any]:
        """Calculate statistics from historical data."""
        if not daily_data:
            return {}
        
        temps = [d["temp_avg_c"] for d in daily_data]
        rains = [d["rain_mm"] for d in daily_data]
        
        return {
            "avg_temperature_c": round(sum(temps) / len(temps), 1),
            "max_temperature_c": round(max(temps), 1),
            "min_temperature_c": round(min(temps), 1),
            "total_rainfall_mm": round(sum(rains), 1),
            "rainy_days": sum(1 for r in rains if r > 1),
            "max_daily_rainfall_mm": round(max(rains), 1) if rains else 0,
            "avg_daily_rainfall_mm": round(sum(rains) / len(rains), 1) if rains else 0
        }
    
    def _weather_code_to_description(self, code: int) -> str:
        """Convert WMO weather code to description."""
        codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
        }
        return codes.get(code, "Unknown")
    
    def _calculate_irrigation_impact(self, current: Dict) -> Dict[str, Any]:
        """Calculate impact on irrigation needs."""
        rain = current.get("rain", 0) or 0
        humidity = current.get("relative_humidity_2m", 75) or 75
        temp = current.get("temperature_2m", 28) or 28
        
        # Higher temp = more evaporation = more irrigation needed
        # Higher rain = less irrigation needed
        # Higher humidity = less evaporation = less irrigation needed
        
        irrigation_factor = 1.0
        
        if rain > 10:
            irrigation_factor -= 0.8  # Heavy rain
        elif rain > 5:
            irrigation_factor -= 0.5  # Moderate rain
        elif rain > 1:
            irrigation_factor -= 0.2  # Light rain
        
        if humidity > 80:
            irrigation_factor -= 0.1
        elif humidity < 50:
            irrigation_factor += 0.2
        
        if temp > 35:
            irrigation_factor += 0.3
        elif temp > 30:
            irrigation_factor += 0.1
        elif temp < 20:
            irrigation_factor -= 0.1
        
        irrigation_factor = max(0, min(1.5, irrigation_factor))
        
        return {
            "irrigation_need_factor": round(irrigation_factor, 2),
            "recommendation": self._get_irrigation_recommendation(irrigation_factor, rain),
            "evaporation_risk": "HIGH" if temp > 32 and humidity < 60 else "MEDIUM" if temp > 28 else "LOW"
        }
    
    def _get_irrigation_recommendation(self, factor: float, rain: float) -> str:
        """Get irrigation recommendation based on conditions."""
        if rain > 10:
            return "SKIP - Heavy rainfall detected"
        elif rain > 5:
            return "REDUCE - Recent rainfall, minimal irrigation needed"
        elif factor > 1.2:
            return "INCREASE - High evaporation conditions"
        elif factor < 0.5:
            return "REDUCE - Favorable moisture conditions"
        else:
            return "NORMAL - Standard irrigation schedule"
    
    def _calculate_irrigation_recommendation(self, daily_forecast: List[Dict]) -> str:
        """Calculate overall irrigation recommendation for the week."""
        total_rain = sum(d.get("rain_mm", 0) or 0 for d in daily_forecast[:7])
        rainy_days = sum(1 for d in daily_forecast[:7] if (d.get("rain_mm") or 0) > 1)
        
        if total_rain > 50:
            return "REDUCE significantly - Heavy rain expected"
        elif total_rain > 25:
            return "REDUCE - Moderate rain expected"
        elif rainy_days >= 3:
            return "ADJUST - Multiple rainy days expected"
        elif total_rain < 5:
            return "MAINTAIN or INCREASE - Dry week expected"
        else:
            return "MAINTAIN - Normal conditions expected"
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cached data is still valid."""
        if key not in self._cache or key not in self._last_fetch:
            return False
        return (datetime.now().timestamp() - self._last_fetch[key]) < self._cache_ttl
    
    def _update_cache(self, key: str, data: Any) -> None:
        """Update cache with new data."""
        self._cache[key] = data
        self._last_fetch[key] = datetime.now().timestamp()
    
    def _generate_simulated_current(self) -> Dict[str, Any]:
        """Generate simulated current weather for fallback."""
        # Seasonal simulation for Sri Lanka
        month = datetime.now().month
        is_monsoon = month in [5, 6, 7, 10, 11]  # SW & NE monsoons
        
        base_temp = 28 if month in [3, 4, 5] else 26
        rain = random.uniform(0, 20) if is_monsoon else random.uniform(0, 5)
        
        return {
            "status": "success",
            "source": "simulated",
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "region": "Udawalawe, Sri Lanka"
            },
            "timestamp": datetime.now().isoformat(),
            "conditions": {
                "temperature_c": round(base_temp + random.uniform(-3, 5), 1),
                "humidity_percent": round(70 + random.uniform(-15, 20), 0),
                "precipitation_mm": round(rain, 1),
                "rain_mm": round(rain * 0.9, 1),
                "weather_code": 63 if rain > 5 else 3 if rain > 0 else 1,
                "weather_description": "Moderate rain" if rain > 5 else "Partly cloudy",
                "wind_speed_kmh": round(10 + random.uniform(-5, 15), 1),
                "wind_direction_deg": random.randint(0, 360),
                "pressure_hpa": round(1010 + random.uniform(-5, 5), 0),
                "cloud_cover_percent": min(100, round(30 + rain * 5, 0))
            },
            "irrigation_impact": {
                "irrigation_need_factor": round(1.0 - rain / 20, 2),
                "recommendation": "REDUCE" if rain > 5 else "NORMAL",
                "evaporation_risk": "MEDIUM"
            }
        }
    
    def _generate_simulated_forecast(self, days: int) -> Dict[str, Any]:
        """Generate simulated weather forecast for fallback."""
        daily_forecast = []
        hourly_forecast = []
        
        month = datetime.now().month
        is_monsoon = month in [5, 6, 7, 10, 11]
        
        for d in range(days):
            date = (datetime.now() + timedelta(days=d)).strftime("%Y-%m-%d")
            rain = random.uniform(0, 25) if is_monsoon else random.uniform(0, 10)
            
            daily_forecast.append({
                "date": date,
                "temp_max_c": round(30 + random.uniform(-3, 5), 1),
                "temp_min_c": round(23 + random.uniform(-2, 3), 1),
                "precipitation_mm": round(rain, 1),
                "rain_mm": round(rain * 0.9, 1),
                "precipitation_probability": min(95, round(20 + rain * 3, 0)),
                "weather_code": 63 if rain > 10 else 61 if rain > 3 else 2,
                "weather_description": "Moderate rain" if rain > 10 else "Slight rain" if rain > 3 else "Partly cloudy",
                "evapotranspiration_mm": round(5 + random.uniform(-1, 2), 1),
                "sunrise": "06:05",
                "sunset": "18:15"
            })
        
        for h in range(48):
            dt = datetime.now() + timedelta(hours=h)
            hour_rain = random.uniform(0, 5) if is_monsoon else random.uniform(0, 2)
            hourly_forecast.append({
                "datetime": dt.isoformat(),
                "temperature_c": round(26 + random.uniform(-2, 6), 1),
                "humidity_percent": round(70 + random.uniform(-10, 20), 0),
                "precipitation_probability": min(90, round(15 + hour_rain * 10, 0)),
                "precipitation_mm": round(hour_rain, 1),
                "rain_mm": round(hour_rain * 0.9, 1),
                "evapotranspiration_mm": round(0.2 + random.uniform(0, 0.3), 2)
            })
        
        total_rain = sum(d["rain_mm"] for d in daily_forecast[:7])
        
        return {
            "status": "success",
            "source": "simulated",
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude,
                "region": "Udawalawe, Sri Lanka"
            },
            "generated_at": datetime.now().isoformat(),
            "forecast_days": days,
            "daily": daily_forecast,
            "hourly": hourly_forecast,
            "summary": {
                "total_precipitation_7d_mm": round(total_rain, 1),
                "average_temp_c": 28.5,
                "rainy_days_count": sum(1 for d in daily_forecast[:7] if d["rain_mm"] > 1),
                "irrigation_recommendation": "REDUCE" if total_rain > 30 else "NORMAL"
            }
        }
    
    def _generate_simulated_historical(self, days_back: int) -> Dict[str, Any]:
        """Generate simulated historical weather for fallback."""
        daily_data = []
        
        for d in range(days_back):
            date = (datetime.now() - timedelta(days=days_back - d)).strftime("%Y-%m-%d")
            month = (datetime.now() - timedelta(days=days_back - d)).month
            is_monsoon = month in [5, 6, 7, 10, 11]
            rain = random.uniform(0, 30) if is_monsoon else random.uniform(0, 10)
            
            daily_data.append({
                "date": date,
                "temp_max_c": round(30 + random.uniform(-3, 5), 1),
                "temp_min_c": round(23 + random.uniform(-2, 3), 1),
                "temp_avg_c": round(26 + random.uniform(-1, 3), 1),
                "humidity_avg_percent": round(70 + random.uniform(-10, 15), 0),
                "precipitation_mm": round(rain, 1),
                "rain_mm": round(rain * 0.9, 1)
            })
        
        return {
            "status": "success",
            "source": "simulated",
            "period": {
                "start": (datetime.now() - timedelta(days=days_back)).isoformat(),
                "end": datetime.now().isoformat(),
                "days": days_back
            },
            "hourly_data": [],
            "daily_data": daily_data,
            "statistics": self._calculate_historical_stats(daily_data)
        }


# Singleton instance
weather_client = WeatherAPIClient()

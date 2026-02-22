"""
Weather API Endpoints

Provides weather data endpoints for the forecasting service:
- Current weather conditions
- Weather forecasts (7-14 days)
- Historical weather data
- Weather-based irrigation recommendations
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
import logging

from ..integrations.weather_api import weather_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get("/current")
async def get_current_weather():
    """
    Get current weather conditions.
    
    Returns real-time weather data from Open-Meteo API (or simulated fallback).
    Includes temperature, humidity, precipitation, and irrigation impact analysis.
    """
    try:
        weather = await weather_client.get_current_weather()
        return weather
    except Exception as e:
        logger.error(f"Error fetching current weather: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather data: {str(e)}")


@router.get("/forecast")
async def get_weather_forecast(
    days: int = Query(default=7, ge=1, le=14, description="Number of days to forecast (1-14)")
):
    """
    Get weather forecast.
    
    Returns daily and hourly weather forecasts with:
    - Temperature (min/max)
    - Precipitation probability and amounts
    - Evapotranspiration estimates
    - Irrigation recommendations
    
    Args:
        days: Number of days to forecast (1-14)
    """
    try:
        forecast = await weather_client.get_forecast(days)
        return forecast
    except Exception as e:
        logger.error(f"Error fetching weather forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch forecast: {str(e)}")


@router.get("/historical")
async def get_historical_weather(
    days: int = Query(default=30, ge=1, le=92, description="Days of historical data (1-92)")
):
    """
    Get historical weather data.
    
    Returns historical weather data for analysis and model training:
    - Daily aggregated data
    - Temperature statistics
    - Rainfall totals and patterns
    
    Args:
        days: Number of days of historical data (1-92)
    """
    try:
        historical = await weather_client.get_historical(days)
        return historical
    except Exception as e:
        logger.error(f"Error fetching historical weather: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")


@router.get("/irrigation-recommendation")
async def get_irrigation_recommendation():
    """
    Get comprehensive irrigation recommendation based on weather.
    
    Analyzes current and forecasted weather to provide
    actionable irrigation guidance for the next 7 days.
    """
    try:
        current = await weather_client.get_current_weather()
        forecast = await weather_client.get_forecast(7)
        
        # Analyze conditions
        current_conditions = current.get("conditions", {})
        irrigation_impact = current.get("irrigation_impact", {})
        forecast_summary = forecast.get("summary", {})
        daily_forecast = forecast.get("daily", [])
        
        # Calculate 7-day recommendations
        daily_recommendations = []
        for day in daily_forecast:
            rain = day.get("rain_mm", 0) or 0
            evap = day.get("evapotranspiration_mm", 5) or 5
            
            # Simple water balance
            water_balance = rain - evap
            
            if water_balance > 5:
                recommendation = "SKIP"
                irrigation_percent = 0
            elif water_balance > 0:
                recommendation = "REDUCE"
                irrigation_percent = 50
            elif water_balance > -5:
                recommendation = "NORMAL"
                irrigation_percent = 100
            else:
                recommendation = "INCREASE"
                irrigation_percent = 125
            
            daily_recommendations.append({
                "date": day.get("date"),
                "expected_rain_mm": round(rain, 1),
                "expected_evapotranspiration_mm": round(evap, 1),
                "water_balance_mm": round(water_balance, 1),
                "recommendation": recommendation,
                "irrigation_percent": irrigation_percent
            })
        
        # Overall recommendation
        total_rain = sum(d.get("expected_rain_mm", 0) for d in daily_recommendations)
        total_evap = sum(d.get("expected_evapotranspiration_mm", 0) for d in daily_recommendations)
        avg_irrigation = sum(d.get("irrigation_percent", 100) for d in daily_recommendations) / max(len(daily_recommendations), 1)
        
        return {
            "status": "success",
            "generated_at": datetime.now().isoformat(),
            "current_conditions": {
                "temperature_c": current_conditions.get("temperature_c"),
                "humidity_percent": current_conditions.get("humidity_percent"),
                "current_rain_mm": current_conditions.get("rain_mm"),
                "immediate_impact": irrigation_impact.get("recommendation")
            },
            "weekly_outlook": {
                "total_expected_rain_mm": round(total_rain, 1),
                "total_expected_evapotranspiration_mm": round(total_evap, 1),
                "net_water_balance_mm": round(total_rain - total_evap, 1),
                "rainy_days_expected": sum(1 for d in daily_recommendations if d.get("expected_rain_mm", 0) > 1),
                "average_irrigation_adjustment_percent": round(avg_irrigation, 0)
            },
            "overall_recommendation": forecast_summary.get("irrigation_recommendation", "NORMAL"),
            "daily_schedule": daily_recommendations,
            "notes": [
                "Recommendations are based on predicted rainfall and evapotranspiration",
                "Consider soil moisture readings for fine-tuning",
                "Update recommendations as forecasts change"
            ]
        }
    except Exception as e:
        logger.error(f"Error generating irrigation recommendation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendation: {str(e)}")


@router.get("/summary")
async def get_weather_summary():
    """
    Get a comprehensive weather summary for dashboard display.
    
    Combines current conditions, short-term forecast,
    and irrigation impact into a single response.
    """
    try:
        current = await weather_client.get_current_weather()
        forecast = await weather_client.get_forecast(3)
        
        conditions = current.get("conditions", {})
        daily = forecast.get("daily", [])[:3]
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "current": {
                "temperature_c": conditions.get("temperature_c"),
                "humidity_percent": conditions.get("humidity_percent"),
                "weather_description": conditions.get("weather_description"),
                "rain_mm": conditions.get("rain_mm"),
                "wind_speed_kmh": conditions.get("wind_speed_kmh")
            },
            "forecast_preview": [
                {
                    "date": d.get("date"),
                    "temp_max_c": d.get("temp_max_c"),
                    "temp_min_c": d.get("temp_min_c"),
                    "rain_mm": d.get("rain_mm"),
                    "weather_description": d.get("weather_description")
                }
                for d in daily
            ],
            "irrigation_impact": current.get("irrigation_impact", {}),
            "data_source": current.get("source", "unknown")
        }
    except Exception as e:
        logger.error(f"Error fetching weather summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary: {str(e)}")

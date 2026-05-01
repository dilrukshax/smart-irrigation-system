"""
Weather API Endpoints

Provides weather data endpoints for the forecasting service:
- Current weather conditions
- Weather forecasts (7-14 days)
- Historical weather data
- Weather-based irrigation recommendations
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging

from ..core.contracts import build_contract
from ..db.repository import add_irrigation_recommendation_artifact, add_weather_artifact
from ..db.session import session_scope
from ..integrations.weather_api import weather_client
from ..core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weather", tags=["Weather"])


HEAVY_RAIN_MM = 25.0
MODERATE_RAIN_MM = 10.0
THREE_DAY_FLOOD_WATCH_MM = 60.0
DRY_DAY_RAIN_MM = 1.0
DRY_SPELL_DAYS = 3
HEAT_STRESS_TEMP_C = 35.0
WATER_DEFICIT_MM = 6.0


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _severity_rank(severity: str) -> int:
    return {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(severity, 0)


def _make_alert(
    *,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    date: Optional[str] = None,
    metric: Optional[str] = None,
    value: Optional[float] = None,
    recommendation: Optional[str] = None,
) -> Dict[str, Any]:
    starts_at = date or datetime.utcnow().date().isoformat()
    return {
        "id": f"{alert_type.lower()}-{starts_at}",
        "type": alert_type,
        "severity": severity,
        "title": title,
        "message": message,
        "date": date,
        "starts_at": starts_at,
        "metric": metric,
        "value": round(value, 1) if isinstance(value, (int, float)) else value,
        "recommendation": recommendation,
    }


def _build_weather_alerts(
    current: Dict[str, Any],
    forecast: Dict[str, Any],
) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    conditions = current.get("conditions") or {}
    daily = forecast.get("daily") or []
    alerts: List[Dict[str, Any]] = []

    current_rain = _as_float(conditions.get("rain_mm") or conditions.get("precipitation_mm"))
    current_temp = _as_float(conditions.get("temperature_c"))
    if current_rain >= HEAVY_RAIN_MM:
        alerts.append(
            _make_alert(
                alert_type="ACTIVE_HEAVY_RAIN",
                severity="HIGH",
                title="Heavy rainfall active now",
                message="Current rainfall is high enough to pause non-essential irrigation cycles.",
                metric="rain_mm",
                value=current_rain,
                recommendation="Hold irrigation and inspect canal/reservoir discharge points.",
            )
        )
    elif current_rain >= MODERATE_RAIN_MM:
        alerts.append(
            _make_alert(
                alert_type="ACTIVE_RAIN",
                severity="MEDIUM",
                title="Rainfall active now",
                message="Current rainfall can reduce near-term irrigation demand.",
                metric="rain_mm",
                value=current_rain,
                recommendation="Reduce scheduled irrigation until field telemetry confirms demand.",
            )
        )

    first_three_day_rain = sum(_as_float(day.get("rain_mm") or day.get("precipitation_mm")) for day in daily[:3])
    if first_three_day_rain >= THREE_DAY_FLOOD_WATCH_MM:
        alerts.append(
            _make_alert(
                alert_type="FLOOD_WATCH",
                severity="CRITICAL",
                title="Three-day flood watch",
                message="Forecast rainfall across the next three days is high enough to create drainage risk.",
                metric="rain_3d_mm",
                value=first_three_day_rain,
                recommendation="Coordinate water releases, defer irrigation, and monitor low-lying fields.",
            )
        )

    dry_streak = 0
    dry_streak_start: Optional[str] = None
    dry_streak_temps: List[float] = []

    for day in daily:
        date = day.get("date")
        rain = _as_float(day.get("rain_mm") or day.get("precipitation_mm"))
        evap = _as_float(day.get("evapotranspiration_mm"), 5.0)
        temp_max = _as_float(day.get("temp_max_c") or day.get("temperature_max_c") or current_temp)
        water_deficit = evap - rain

        if rain >= HEAVY_RAIN_MM:
            alerts.append(
                _make_alert(
                    alert_type="HEAVY_RAIN",
                    severity="HIGH",
                    title="Heavy rain forecast",
                    message="Daily forecast rainfall can satisfy most irrigation demand and may increase runoff.",
                    date=date,
                    metric="rain_mm",
                    value=rain,
                    recommendation="Pause routine irrigation for affected blocks and reassess after rainfall.",
                )
            )
        elif rain >= MODERATE_RAIN_MM:
            alerts.append(
                _make_alert(
                    alert_type="RAIN_WATCH",
                    severity="MEDIUM",
                    title="Rain watch",
                    message="Moderate forecast rainfall should reduce planned irrigation volume.",
                    date=date,
                    metric="rain_mm",
                    value=rain,
                    recommendation="Adjust schedules using field soil-moisture readings.",
                )
            )

        if temp_max >= HEAT_STRESS_TEMP_C:
            alerts.append(
                _make_alert(
                    alert_type="HEAT_STRESS",
                    severity="HIGH",
                    title="High evapotranspiration risk",
                    message="Forecast temperatures can increase crop water demand.",
                    date=date,
                    metric="temp_max_c",
                    value=temp_max,
                    recommendation="Prioritize vulnerable and recently planted fields during allocation.",
                )
            )

        if water_deficit >= WATER_DEFICIT_MM:
            alerts.append(
                _make_alert(
                    alert_type="WATER_DEFICIT",
                    severity="MEDIUM",
                    title="Irrigation deficit likely",
                    message="Forecast evapotranspiration exceeds expected rainfall for the day.",
                    date=date,
                    metric="deficit_mm",
                    value=water_deficit,
                    recommendation="Keep irrigation available unless soil-moisture telemetry shows surplus.",
                )
            )

        if rain < DRY_DAY_RAIN_MM:
            dry_streak += 1
            dry_streak_start = dry_streak_start or date
            dry_streak_temps.append(temp_max)
        else:
            dry_streak = 0
            dry_streak_start = None
            dry_streak_temps = []

        if dry_streak == DRY_SPELL_DAYS:
            avg_temp = sum(dry_streak_temps) / max(len(dry_streak_temps), 1)
            severity = "HIGH" if avg_temp >= 32 else "MEDIUM"
            alerts.append(
                _make_alert(
                    alert_type="DRY_SPELL",
                    severity=severity,
                    title="Dry spell forecast",
                    message=f"{DRY_SPELL_DAYS} consecutive low-rain days are forecast.",
                    date=dry_streak_start,
                    metric="dry_days",
                    value=float(DRY_SPELL_DAYS),
                    recommendation="Review rotation timing and reserve water for high-stress crop zones.",
                )
            )

    alerts.sort(key=lambda item: (-_severity_rank(item.get("severity", "")), item.get("starts_at") or ""))

    highest = alerts[0]["severity"] if alerts else "LOW"
    summary = {
        "total_alerts": len(alerts),
        "highest_severity": highest,
        "heavy_rain_days": sum(
            1
            for day in daily
            if _as_float(day.get("rain_mm") or day.get("precipitation_mm")) >= HEAVY_RAIN_MM
        ),
        "rain_watch_days": sum(
            1
            for day in daily
            if _as_float(day.get("rain_mm") or day.get("precipitation_mm")) >= MODERATE_RAIN_MM
        ),
        "heat_stress_days": sum(
            1
            for day in daily
            if _as_float(day.get("temp_max_c") or day.get("temperature_max_c") or current_temp) >= HEAT_STRESS_TEMP_C
        ),
        "dry_days": sum(
            1
            for day in daily
            if _as_float(day.get("rain_mm") or day.get("precipitation_mm")) < DRY_DAY_RAIN_MM
        ),
        "water_deficit_days": sum(
            1
            for day in daily
            if (
                _as_float(day.get("evapotranspiration_mm"), 5.0)
                - _as_float(day.get("rain_mm") or day.get("precipitation_mm"))
            )
            >= WATER_DEFICIT_MM
        ),
        "next_3_day_rain_mm": round(first_three_day_rain, 1),
        "status_text": "Weather risks detected" if alerts else "No weather alerts for the selected horizon",
    }
    return alerts, summary


@router.get("/current")
async def get_current_weather(
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
):
    """
    Get current weather conditions.
    
    Returns real-time weather data from Open-Meteo API (or simulated fallback).
    Includes temperature, humidity, precipitation, and irrigation impact analysis.
    """
    try:
        weather = await weather_client.get_current_weather(lat=lat, lon=lon)
        if weather.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=weather)
        async with session_scope() as session:
            await add_weather_artifact(
                session,
                kind="current",
                payload=weather,
                status=str(weather.get("status") or "ok"),
                source=str(weather.get("source") or "unknown"),
                observed_at=weather.get("observed_at") or weather.get("timestamp"),
            )
        return weather
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching current weather: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to fetch weather data: {str(e)}",
                stale_after_sec=900,
            ),
        )


@router.get("/forecast")
async def get_weather_forecast(
    days: int = Query(default=7, ge=1, le=14, description="Number of days to forecast (1-14)"),
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
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
        forecast = await weather_client.get_forecast(days, lat=lat, lon=lon)
        if forecast.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=forecast)
        async with session_scope() as session:
            await add_weather_artifact(
                session,
                kind="forecast",
                payload=forecast,
                status=str(forecast.get("status") or "ok"),
                source=str(forecast.get("source") or "unknown"),
                observed_at=forecast.get("observed_at") or forecast.get("generated_at"),
            )
        return forecast
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching weather forecast: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to fetch forecast: {str(e)}",
                stale_after_sec=900,
            ),
        )


@router.get("/historical")
async def get_historical_weather(
    days: int = Query(default=30, ge=1, le=92, description="Days of historical data (1-92)"),
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
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
        historical = await weather_client.get_historical(days, lat=lat, lon=lon)
        if historical.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=historical)
        async with session_scope() as session:
            await add_weather_artifact(
                session,
                kind="historical",
                payload=historical,
                status=str(historical.get("status") or "ok"),
                source=str(historical.get("source") or "unknown"),
                observed_at=historical.get("observed_at") or historical.get("generated_at"),
            )
        return historical
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching historical weather: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to fetch historical data: {str(e)}",
                stale_after_sec=900,
            ),
        )


@router.get("/alerts")
async def get_weather_alerts(
    days: int = Query(default=7, ge=1, le=14, description="Forecast horizon for weather alerts"),
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
):
    """
    Get operator-safe weather alerts derived from current and forecast data.

    This endpoint keeps risk computation in the backend so officer dashboards can
    render actionable alerts without client-side placeholder logic.
    """
    try:
        current = await weather_client.get_current_weather(lat=lat, lon=lon)
        forecast = await weather_client.get_forecast(days, lat=lat, lon=lon)
        if current.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=current)
        if forecast.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=forecast)

        alerts, summary = _build_weather_alerts(current, forecast)
        source = "simulated" if (
            str(current.get("source") or "").lower() == "simulated"
            or str(forecast.get("source") or "").lower() == "simulated"
        ) else "forecasting_service"
        raw_status = "stale" if source == "simulated" else "ok"
        generated_at = datetime.utcnow().isoformat()
        contract = build_contract(
            source=source,
            observed_at=generated_at,
            data_available=True,
            raw_status=raw_status,
            stale_after_sec=900,
        )

        response_payload = {
            "generated_at": generated_at,
            "ml_only_mode": settings.is_ml_only_mode,
            "days": days,
            "location": forecast.get("location") or current.get("location"),
            "summary": summary,
            "alerts": alerts,
            **contract,
        }
        async with session_scope() as session:
            await add_weather_artifact(
                session,
                kind="alerts",
                payload=response_payload,
                status=response_payload["status"],
                source=response_payload["source"],
                observed_at=response_payload.get("observed_at") or response_payload.get("generated_at"),
            )
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating weather alerts: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to generate alerts: {str(e)}",
                stale_after_sec=900,
            ),
        )


@router.get("/irrigation-recommendation")
async def get_irrigation_recommendation(
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
):
    """
    Get comprehensive irrigation recommendation based on weather.
    
    Analyzes current and forecasted weather to provide
    actionable irrigation guidance for the next 7 days.
    """
    try:
        current = await weather_client.get_current_weather(lat=lat, lon=lon)
        forecast = await weather_client.get_forecast(7, lat=lat, lon=lon)
        if current.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=current)
        if forecast.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=forecast)
        
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
        
        source = "simulated" if (
            str(current.get("source") or "").lower() == "simulated"
            or str(forecast.get("source") or "").lower() == "simulated"
        ) else "forecasting_service"
        raw_status = "stale" if source == "simulated" else "ok"
        generated_at = datetime.utcnow().isoformat()
        contract = build_contract(
            source=source,
            observed_at=generated_at,
            data_available=True,
            raw_status=raw_status,
            stale_after_sec=900,
        )

        response_payload = {
            "generated_at": datetime.now().isoformat(),
            "ml_only_mode": settings.is_ml_only_mode,
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
            ],
            **contract,
        }
        async with session_scope() as session:
            await add_irrigation_recommendation_artifact(
                session,
                payload=response_payload,
                status=response_payload["status"],
                source=response_payload["source"],
                observed_at=response_payload.get("observed_at") or response_payload.get("generated_at"),
            )
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating irrigation recommendation: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to generate recommendation: {str(e)}",
                stale_after_sec=900,
            ),
        )


@router.get("/summary")
async def get_weather_summary(
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Field latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Field longitude"),
):
    """
    Get a comprehensive weather summary for dashboard display.
    
    Combines current conditions, short-term forecast,
    and irrigation impact into a single response.
    """
    try:
        current = await weather_client.get_current_weather(lat=lat, lon=lon)
        forecast = await weather_client.get_forecast(3, lat=lat, lon=lon)
        if current.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=current)
        if forecast.get("status") == "source_unavailable":
            raise HTTPException(status_code=503, detail=forecast)
        
        conditions = current.get("conditions", {})
        daily = forecast.get("daily", [])[:3]
        
        source = "simulated" if (
            str(current.get("source") or "").lower() == "simulated"
            or str(forecast.get("source") or "").lower() == "simulated"
        ) else "forecasting_service"
        raw_status = "stale" if source == "simulated" else "ok"
        generated_at = datetime.utcnow().isoformat()
        contract = build_contract(
            source=source,
            observed_at=generated_at,
            data_available=True,
            raw_status=raw_status,
            stale_after_sec=900,
        )

        response_payload = {
            "timestamp": datetime.now().isoformat(),
            "ml_only_mode": settings.is_ml_only_mode,
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
            "data_source": current.get("source", "unknown"),
            **contract,
        }
        async with session_scope() as session:
            await add_weather_artifact(
                session,
                kind="summary",
                payload=response_payload,
                status=response_payload["status"],
                source=response_payload["source"],
                observed_at=response_payload.get("observed_at") or response_payload.get("timestamp"),
            )
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching weather summary: {e}")
        timestamp = datetime.utcnow().isoformat()
        raise HTTPException(
            status_code=500,
            detail=build_contract(
                source="forecasting_service",
                observed_at=timestamp,
                data_available=False,
                raw_status="source_unavailable",
                message=f"Failed to fetch summary: {str(e)}",
                stale_after_sec=900,
            ),
        )

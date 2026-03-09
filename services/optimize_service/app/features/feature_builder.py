"""
Feature Builder

This module combines data from multiple sources to create feature vectors
for ML models. It orchestrates:
- Loading field and crop data from repositories
- Fetching climate forecasts (stubbed for now)
- Computing water budgets
- Building feature dictionaries for each candidate crop

The output is suitable for:
- Suitability scoring (Fuzzy-TOPSIS)
- Yield prediction models
- Optimization input preparation
"""

import logging
from typing import Dict, List, Any, Optional

import requests
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.data.repositories import FieldRepository, CropRepository, HistoricalYieldRepository
from app.features.water_budget import (
    compute_crop_water_requirement,
    get_default_kc_curve,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class FeatureBuilder:
    """
    Builds feature vectors for crop recommendation.
    
    Combines static field data, crop requirements, climate forecasts,
    and historical performance into ML-ready feature dictionaries.
    
    Usage:
        builder = FeatureBuilder(db_session)
        features = builder.build_features(
            field_id="FIELD-001",
            season="Maha-2025",
            scenario={"water_quota_mm": 800}
        )
        # features is a dict: {crop_id: {feature_name: value}}
    """
    
    def __init__(self, db_session: Session):
        """
        Initialize the feature builder.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session
        self._field_cache: Dict[str, Any] = {}
        self._crop_cache: Optional[List[Dict]] = None
        self._runtime_status: Dict[str, Any] = {
            "status": "data_unavailable",
            "data_available": False,
            "missing_sources": [],
            "contexts": {},
            "message": "Feature builder has not executed yet.",
        }

    def get_runtime_status(self) -> Dict[str, Any]:
        """Expose latest feature-building runtime data provenance status."""
        return dict(self._runtime_status)
    
    def build_features(
        self,
        field_id: str,
        season: str,
        scenario: Optional[Dict] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Build feature vectors for all candidate crops for a given field.
        
        Args:
            field_id: Field identifier
            season: Growing season (e.g., "Maha-2025")
            scenario: Optional scenario overrides
                     - water_quota_mm: Override water quota
                     - price_factor: Multiply prices by this factor
        
        Returns:
            Dict mapping crop_id to feature dictionary
            {
                "CROP-001": {
                    "crop_id": "CROP-001",
                    "crop_name": "Rice",
                    "soil_suitability": 0.85,
                    "water_requirement_mm": 650,
                    ...
                },
                ...
            }
        """
        logger.info(f"Building features for field={field_id}, season={season}")
        strict_live_data = settings.is_strict_live_data
        self._runtime_status = {
            "status": "data_unavailable",
            "data_available": False,
            "missing_sources": [],
            "contexts": {},
            "message": "",
        }

        # Load field data
        field = self._get_field(field_id)
        if not field:
            if strict_live_data:
                self._runtime_status.update(
                    {
                        "missing_sources": ["field_repository"],
                        "contexts": {"field_repository": {"data_available": False}},
                        "message": f"Field '{field_id}' was not found in persistent storage.",
                    }
                )
                logger.warning(
                    "Field %s not found and strict live-data mode is enabled.",
                    field_id,
                )
                return {}
            logger.warning(f"Field {field_id} not found, using default values")
            field = self._get_default_field(field_id)
        
        # Load candidate crops
        crops = self._get_candidate_crops()
        if not crops:
            self._runtime_status.update(
                {
                    "missing_sources": ["crop_repository"],
                    "contexts": {"crop_repository": {"data_available": False}},
                    "message": "No candidate crops available from persistent storage.",
                }
            )
            logger.warning("No candidate crops found for recommendations.")
            return {}
        
        # Get climate forecast (stubbed)
        climate = self._get_climate_forecast(field, season)
        irrigation_context = self._get_irrigation_context(field_id)
        stress_context = self._get_stress_context(field_id)

        context_map = {
            "forecasting_service": climate,
            "irrigation_service": irrigation_context,
            "crop_health_service": stress_context,
        }
        missing_sources = [
            source
            for source, payload in context_map.items()
            if not bool(payload.get("data_available"))
        ]
        self._runtime_status["contexts"] = context_map
        self._runtime_status["missing_sources"] = missing_sources

        if strict_live_data and missing_sources:
            self._runtime_status["message"] = (
                "Strict live-data mode requires all upstream contexts; "
                f"missing: {', '.join(missing_sources)}."
            )
            logger.warning(self._runtime_status["message"])
            return {}
        
        # Parse scenario overrides
        scenario = scenario or {}
        water_quota_mm = scenario.get("water_quota_mm")
        if water_quota_mm is None:
            water_quota_mm = field.get("water_availability_mm")
        if water_quota_mm is None:
            if strict_live_data:
                self._runtime_status["missing_sources"] = list(
                    set(self._runtime_status["missing_sources"] + ["water_quota"])
                )
                self._runtime_status["message"] = (
                    "Strict live-data mode requires scenario water_quota_mm or "
                    "persisted field water_availability_mm."
                )
                logger.warning(self._runtime_status["message"])
                return {}
            water_quota_mm = 800.0
        price_factor = scenario.get("price_factor", 1.0)
        
        # Build features for each crop
        features: Dict[str, Dict[str, Any]] = {}
        
        for crop in crops:
            crop_features = self._build_single_crop_features(
                field=field,
                crop=crop,
                climate=climate,
                irrigation_context=irrigation_context,
                stress_context=stress_context,
                water_quota_mm=float(water_quota_mm),
                price_factor=price_factor,
            )
            if crop_features:
                features[crop["id"]] = crop_features
            elif strict_live_data:
                logger.warning(
                    "Skipping crop '%s' due to missing live feature inputs in strict mode.",
                    crop.get("id"),
                )
        
        logger.info(f"Built features for {len(features)} candidate crops")
        if not features:
            self._runtime_status["message"] = (
                "No feature vectors could be built from available live inputs."
            )
            return {}
        self._runtime_status.update(
            {
                "status": "ok",
                "data_available": True,
                "message": "Feature vectors built from available upstream contexts.",
            }
        )
        
        return features
    
    def _get_field(self, field_id: str) -> Optional[Dict[str, Any]]:
        """Fetch field data with caching."""
        if field_id not in self._field_cache:
            self._field_cache[field_id] = FieldRepository.get_field_by_id(
                self.db, field_id
            )
        return self._field_cache[field_id]
    
    def _get_default_field(self, field_id: str) -> Dict[str, Any]:
        """Return default field values when field not found in DB."""
        return {
            "id": field_id,
            "name": f"Unknown Field {field_id}",
            "scheme_id": "UNKNOWN",
            "area_ha": 1.0,
            "soil_type": "loam",
            "soil_ph": 6.5,
            "soil_ec": 1.0,
        }
    
    def _get_candidate_crops(self) -> List[Dict[str, Any]]:
        """Fetch candidate crops with caching."""
        if self._crop_cache is None:
            self._crop_cache = CropRepository.list_candidate_crops(self.db)
        return self._crop_cache
    
    def _get_climate_forecast(
        self,
        field: Dict[str, Any],
        season: str,
    ) -> Dict[str, Any]:
        """
        Get climate forecast for the field and season.
        
        REQUIRES: Integration with forecasting service or weather API.
        
        Args:
            field: Field data dictionary
            season: Growing season
        
        Returns:
            Climate forecast data including ETo and rainfall predictions
            Returns empty forecast if service unavailable.
        """
        logger.debug(f"Fetching climate forecast for season {season}")

        strict_live_data = settings.is_strict_live_data
        default_payload = {
            "season": season,
            "avg_temp_c": None,
            "avg_humidity_pct": None,
            "total_rainfall_mm": None,
            "eto_mm_per_day": [],
            "rainfall_mm": [],
            "forecast_adjustment_pct": None,
            "data_available": False,
            "status": "source_unavailable",
            "source": "forecasting_service",
        }

        try:
            weather_resp = requests.get(
                f"{settings.forecasting_service_url}/api/weather/forecast",
                params={"days": 7},
                timeout=5,
            )
            weather_resp.raise_for_status()
            weather = weather_resp.json()

            irrigation_resp = requests.get(
                f"{settings.forecasting_service_url}/api/weather/irrigation-recommendation",
                timeout=5,
            )
            irrigation_resp.raise_for_status()
            irrigation = irrigation_resp.json()

            weather_status = str(weather.get("status") or "ok").lower()
            irrigation_status = str(irrigation.get("status") or "ok").lower()
            weather_available = bool(
                weather.get(
                    "data_available",
                    weather_status not in {"source_unavailable", "data_unavailable", "analysis_pending"},
                )
            )
            irrigation_available = bool(
                irrigation.get(
                    "data_available",
                    irrigation_status not in {"source_unavailable", "data_unavailable", "analysis_pending"},
                )
            )
            weather_unavailable = weather_status in {"source_unavailable", "data_unavailable", "analysis_pending"} or not weather_available
            irrigation_unavailable = irrigation_status in {"source_unavailable", "data_unavailable", "analysis_pending"} or not irrigation_available

            if strict_live_data and (weather_unavailable or irrigation_unavailable):
                return default_payload

            daily = weather.get("daily", [])
            eto_curve = [
                float(d.get("evapotranspiration_mm"))
                for d in daily[:5]
                if d.get("evapotranspiration_mm") is not None
            ]
            rain_curve = [
                float(d.get("rain_mm"))
                for d in daily[:5]
                if d.get("rain_mm") is not None
            ]
            avg_temp = weather.get("summary", {}).get("average_temp_c")
            total_rain = weather.get("summary", {}).get("total_precipitation_7d_mm")
            adjustment_pct = irrigation.get("weekly_outlook", {}).get(
                "average_irrigation_adjustment_percent",
            )
            if adjustment_pct is None:
                adjustment_pct = 100.0 if not strict_live_data else None

            if strict_live_data and (
                avg_temp is None
                or total_rain is None
                or adjustment_pct is None
                or not eto_curve
                or not rain_curve
            ):
                return default_payload

            source_value = "forecasting_service"
            if str(weather.get("source") or "").lower() == "simulated" or str(irrigation.get("source") or "").lower() == "simulated":
                source_value = "simulated"
            status_value = "stale" if source_value == "simulated" else "ok"

            return {
                "season": season,
                "avg_temp_c": float(avg_temp if avg_temp is not None else 28.0),
                "avg_humidity_pct": 75.0,
                "total_rainfall_mm": float(total_rain if total_rain is not None else sum(rain_curve or [0.0])),
                "eto_mm_per_day": eto_curve or ([5.0] * 5 if not strict_live_data else []),
                "rainfall_mm": rain_curve or ([0.0] * 5 if not strict_live_data else []),
                "forecast_adjustment_pct": float(adjustment_pct if adjustment_pct is not None else 100.0),
                "data_available": True,
                "status": status_value,
                "source": source_value,
            }
        except Exception as exc:
            logger.warning("Climate forecast integration unavailable: %s", exc)
            return default_payload

    def _get_irrigation_context(self, field_id: str) -> Dict[str, Any]:
        """Fetch field water status from the irrigation service (F1)."""
        strict_live_data = settings.is_strict_live_data
        unavailable_statuses = {"data_unavailable", "source_unavailable", "analysis_pending"}
        default_payload = {
            "water_level_pct": None,
            "soil_moisture_pct": None,
            "sensor_connected": False,
            "data_available": False,
            "status": "data_unavailable",
            "source": "irrigation_service",
        }
        try:
            response = requests.get(
                f"{settings.irrigation_service_url}/api/v1/crop-fields/fields/{field_id}/status",
                params={"use_simulated": False},
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
            status_value = str(payload.get("status") or "ok").lower()
            source_value = str(payload.get("source") or "irrigation_service")
            payload_available = bool(
                payload.get(
                    "data_available",
                    status_value not in unavailable_statuses,
                )
            )
            if strict_live_data and (not payload_available or status_value in unavailable_statuses):
                return default_payload

            water_level = payload.get("current_water_level_pct")
            soil_moisture = payload.get("current_soil_moisture_pct")
            metrics_available = water_level is not None and soil_moisture is not None
            if strict_live_data and not metrics_available:
                return default_payload
            effective_available = bool(payload_available and metrics_available)
            return {
                "water_level_pct": float(water_level or 0.0),
                "soil_moisture_pct": float(soil_moisture or 0.0),
                "sensor_connected": bool(payload.get("sensor_connected")),
                "data_available": effective_available,
                "status": status_value if status_value in {"ok", "stale", *unavailable_statuses} else ("ok" if effective_available else "data_unavailable"),
                "source": source_value,
            }
        except Exception as exc:
            logger.warning("Irrigation context unavailable for %s: %s", field_id, exc)
            return default_payload

    def _get_stress_context(self, field_id: str) -> Dict[str, Any]:
        """Fetch field-level stress summary from the crop-health service (F2)."""
        strict_live_data = settings.is_strict_live_data
        unavailable_statuses = {"data_unavailable", "source_unavailable", "analysis_pending"}
        default_payload = {
            "stress_index": None,
            "stress_priority": "unknown",
            "stress_penalty_factor": None,
            "data_available": False,
            "status": "analysis_pending",
            "source": "crop_health_service",
        }
        try:
            response = requests.get(
                f"{settings.crop_health_service_url}/api/v1/crop-health/fields/{field_id}/stress-summary",
                timeout=5,
            )
            response.raise_for_status()
            payload = response.json()
            status_value = str(payload.get("status") or "ok").lower()
            source_value = str(payload.get("source") or "crop_health_service")
            payload_available = bool(
                payload.get(
                    "data_available",
                    status_value not in unavailable_statuses,
                )
            )
            if strict_live_data and (not payload_available or status_value in unavailable_statuses):
                return default_payload

            stress_index = payload.get("stress_index")
            penalty = payload.get("stress_penalty_factor")
            metrics_available = stress_index is not None and penalty is not None
            if strict_live_data and not metrics_available:
                return default_payload
            effective_available = bool(payload_available and metrics_available)
            return {
                "stress_index": float(stress_index or 0.0),
                "stress_priority": payload.get("priority") or "low",
                "stress_penalty_factor": float(penalty or 0.0),
                "data_available": effective_available,
                "status": status_value if status_value in {"ok", "stale", *unavailable_statuses} else ("ok" if effective_available else "analysis_pending"),
                "source": source_value,
            }
        except Exception as exc:
            logger.warning("Stress context unavailable for %s: %s", field_id, exc)
            return default_payload

    def _build_single_crop_features(
        self,
        field: Dict[str, Any],
        crop: Dict[str, Any],
        climate: Dict[str, Any],
        irrigation_context: Dict[str, Any],
        stress_context: Dict[str, Any],
        water_quota_mm: float,
        price_factor: float,
    ) -> Optional[Dict[str, Any]]:
        """
        Build feature vector for a single crop-field combination.
        
        Args:
            field: Field data
            crop: Crop data
            climate: Climate forecast
            water_quota_mm: Available water quota
            price_factor: Price adjustment factor
        
        Returns:
            Feature dictionary for this crop
        """
        strict_live_data = settings.is_strict_live_data
        crop_id = crop["id"]
        
        # === Soil Suitability (+ stress penalties) ===
        soil_suitability = self._compute_soil_suitability(field, crop)
        stress_penalty_raw = stress_context.get("stress_penalty_factor")
        if strict_live_data and stress_penalty_raw is None:
            return None
        stress_penalty = float(stress_penalty_raw or 0.0)
        adjusted_soil_suitability = max(0.0, soil_suitability * (1.0 - stress_penalty))
        
        # === Water Requirement ===
        kc_curve = self._coerce_curve(
            crop.get("kc_curve"),
            None if strict_live_data else get_default_kc_curve(crop.get("category", "cereal")),
        )
        eto_curve = self._coerce_curve(
            climate.get("eto_mm_per_day"),
            None if strict_live_data else [5.0, 5.0, 5.0, 5.0, 5.0],
        )
        rainfall_curve = self._coerce_curve(
            climate.get("rainfall_mm"),
            None if strict_live_data else [50.0, 50.0, 50.0, 50.0, 50.0],
        )
        if strict_live_data and (not kc_curve or not eto_curve or not rainfall_curve):
            return None
        
        water_req = compute_crop_water_requirement(kc_curve, eto_curve, rainfall_curve)
        if strict_live_data and water_req <= 0:
            return None
        
        # === Water Budget Check ===
        forecast_adjustment_raw = climate.get("forecast_adjustment_pct")
        if strict_live_data and forecast_adjustment_raw is None:
            return None
        forecast_adjustment_pct = float(forecast_adjustment_raw or 100.0)
        adjusted_quota = water_quota_mm * (forecast_adjustment_pct / 100.0)
        water_coverage = min(1.0, adjusted_quota / water_req) if water_req > 0 else 1.0
        if strict_live_data and water_coverage <= 0:
            return None
        
        # === Historical Performance ===
        historical_yield = self._get_historical_yield(field["id"], crop_id)
        
        # Build feature dictionary
        features = {
            # Identifiers
            "crop_id": crop_id,
            "crop_name": crop["name"],
            "crop_category": crop.get("category", "unknown"),
            "field_id": field["id"],
            
            # Soil features
            "soil_type": field.get("soil_type", "loam"),
            "soil_ph": field.get("soil_ph", 6.5),
            "soil_ec": field.get("soil_ec", 1.0),
            "soil_suitability": adjusted_soil_suitability,
            
            # Crop requirements
            "ph_min": crop.get("ph_min", 5.5),
            "ph_max": crop.get("ph_max", 7.5),
            "ec_max": crop.get("ec_max", 4.0),
            "growth_duration_days": crop.get("growth_duration_days", 120),
            
            # Water features
            "water_requirement_mm": water_req,
            "water_quota_mm": water_quota_mm,
            "adjusted_water_quota_mm": adjusted_quota,
            "water_coverage_ratio": water_coverage,
            "water_sensitivity": crop.get("water_sensitivity", "medium"),
            
            # Climate features
            "season_avg_temp": climate.get("avg_temp_c", 28.0),
            "season_rainfall_mm": climate.get("total_rainfall_mm", 250.0),
            "forecast_adjustment_pct": forecast_adjustment_pct,

            # Historical features
            "historical_yield_t_ha": historical_yield,
            "base_yield_t_ha": crop.get("base_yield_t_per_ha", 3.0),

            # Live upstream integration context
            "field_water_level_pct": irrigation_context.get("water_level_pct", 0.0),
            "field_soil_moisture_pct": irrigation_context.get("soil_moisture_pct", 0.0),
            "field_sensor_connected": irrigation_context.get("sensor_connected", False),
            "stress_index": stress_context.get("stress_index", 0.0),
            "stress_priority": stress_context.get("stress_priority", "low"),
            "stress_penalty_factor": stress_penalty,

            # Economic features (prices will be predicted by price model)
            "price_factor": price_factor,
        }
        if strict_live_data:
            if (
                features.get("season_avg_temp") is None
                or features.get("season_rainfall_mm") is None
                or features.get("field_water_level_pct") is None
                or features.get("field_soil_moisture_pct") is None
                or features.get("stress_index") is None
            ):
                return None
        
        return features

    @staticmethod
    def _coerce_curve(
        raw_curve: Any,
        fallback_curve: Optional[List[float]] = None,
    ) -> Optional[List[float]]:
        """Normalize curve payloads to numeric lists for water-budget functions."""
        if isinstance(raw_curve, (list, tuple)):
            curve: List[float] = []
            for value in raw_curve:
                try:
                    curve.append(float(value))
                except (TypeError, ValueError):
                    continue
            if curve:
                return curve
            return [float(v) for v in fallback_curve] if fallback_curve else None

        if isinstance(raw_curve, (int, float)):
            length = len(fallback_curve) if fallback_curve else 1
            return [float(raw_curve)] * max(1, length)

        if isinstance(raw_curve, str):
            tokens = [token.strip() for token in raw_curve.split(",") if token.strip()]
            if len(tokens) > 1:
                parsed: List[float] = []
                for token in tokens:
                    try:
                        parsed.append(float(token))
                    except ValueError:
                        continue
                if parsed:
                    return parsed
            else:
                try:
                    scalar = float(raw_curve)
                    length = len(fallback_curve) if fallback_curve else 1
                    return [scalar] * max(1, length)
                except ValueError:
                    pass

        return [float(v) for v in fallback_curve] if fallback_curve else None
    
    def _compute_soil_suitability(
        self,
        field: Dict[str, Any],
        crop: Dict[str, Any],
    ) -> float:
        """
        Compute soil suitability score (0-1) for a crop in this field.
        
        Considers pH and EC tolerances.
        
        Args:
            field: Field data with soil properties
            crop: Crop data with tolerance ranges
        
        Returns:
            Suitability score between 0 and 1
        """
        score = 1.0
        
        # pH suitability
        ph = field.get("soil_ph", 6.5)
        ph_min = crop.get("ph_min", 5.5)
        ph_max = crop.get("ph_max", 7.5)
        
        if ph < ph_min:
            score *= max(0, 1 - (ph_min - ph) / 2)  # Penalty for too acidic
        elif ph > ph_max:
            score *= max(0, 1 - (ph - ph_max) / 2)  # Penalty for too alkaline
        
        # EC suitability (salinity)
        ec = field.get("soil_ec", 1.0)
        ec_max = crop.get("ec_max", 4.0)
        
        if ec > ec_max:
            score *= max(0, 1 - (ec - ec_max) / ec_max)
        
        return round(max(0, min(1, score)), 3)
    
    def _get_historical_yield(self, field_id: str, crop_id: str) -> Optional[float]:
        """Get average historical yield or base yield if no history."""
        avg_yield = HistoricalYieldRepository.get_average_yield(
            self.db, field_id, crop_id
        )
        
        if avg_yield > 0:
            return avg_yield
        
        # Return crop base yield as fallback
        crop = CropRepository.get_crop_by_id(self.db, crop_id)
        if crop and crop.get("base_yield_t_per_ha") is not None:
            return float(crop.get("base_yield_t_per_ha"))
        if settings.is_strict_live_data:
            return None
        return 3.0

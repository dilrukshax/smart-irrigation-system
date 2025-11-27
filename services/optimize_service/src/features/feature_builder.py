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

from sqlalchemy.orm import Session

from src.data.repositories import FieldRepository, CropRepository, HistoricalYieldRepository
from src.features.water_budget import (
    compute_crop_water_requirement,
    get_default_kc_curve,
)

logger = logging.getLogger(__name__)


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
        
        # Load field data
        field = self._get_field(field_id)
        if not field:
            logger.warning(f"Field {field_id} not found, using default values")
            field = self._get_default_field(field_id)
        
        # Load candidate crops
        crops = self._get_candidate_crops()
        
        # Get climate forecast (stubbed)
        climate = self._get_climate_forecast(field, season)
        
        # Parse scenario overrides
        scenario = scenario or {}
        water_quota_mm = scenario.get("water_quota_mm", 800)  # Default quota
        price_factor = scenario.get("price_factor", 1.0)
        
        # Build features for each crop
        features: Dict[str, Dict[str, Any]] = {}
        
        for crop in crops:
            crop_features = self._build_single_crop_features(
                field=field,
                crop=crop,
                climate=climate,
                water_quota_mm=water_quota_mm,
                price_factor=price_factor,
            )
            features[crop["id"]] = crop_features
        
        logger.info(f"Built features for {len(features)} candidate crops")
        
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
        
        # TODO: Integrate with forecasting microservice
        # Example integration:
        # from src.core.config import get_settings
        # settings = get_settings()
        # response = requests.get(
        #     f"{settings.forecasting_service_url}/forecast",
        #     params={"lat": field.get("latitude"), "lon": field.get("longitude"), "season": season}
        # )
        # return response.json()
        
        logger.warning(
            "Climate forecast service not configured. "
            "Please integrate with forecasting_service or weather API."
        )
        
        # Return empty/default forecast - indicates missing data
        return {
            "season": season,
            "avg_temp_c": None,
            "avg_humidity_pct": None,
            "total_rainfall_mm": None,
            "eto_mm_per_day": [],
            "rainfall_mm": [],
            "data_available": False,
        }
    
    def _build_single_crop_features(
        self,
        field: Dict[str, Any],
        crop: Dict[str, Any],
        climate: Dict[str, Any],
        water_quota_mm: float,
        price_factor: float,
    ) -> Dict[str, Any]:
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
        crop_id = crop["id"]
        
        # === Soil Suitability ===
        soil_suitability = self._compute_soil_suitability(field, crop)
        
        # === Water Requirement ===
        kc_curve = crop.get("kc_curve", get_default_kc_curve(crop.get("category", "cereal")))
        eto_curve = climate.get("eto_mm_per_day", [5.0, 5.0, 5.0, 5.0, 5.0])
        rainfall_curve = climate.get("rainfall_mm", [50, 50, 50, 50, 50])
        
        water_req = compute_crop_water_requirement(kc_curve, eto_curve, rainfall_curve)
        
        # === Water Budget Check ===
        water_coverage = min(1.0, water_quota_mm / water_req) if water_req > 0 else 1.0
        
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
            "soil_suitability": soil_suitability,
            
            # Crop requirements
            "ph_min": crop.get("ph_min", 5.5),
            "ph_max": crop.get("ph_max", 7.5),
            "ec_max": crop.get("ec_max", 4.0),
            "growth_duration_days": crop.get("growth_duration_days", 120),
            
            # Water features
            "water_requirement_mm": water_req,
            "water_quota_mm": water_quota_mm,
            "water_coverage_ratio": water_coverage,
            "water_sensitivity": crop.get("water_sensitivity", "medium"),
            
            # Climate features
            "season_avg_temp": climate.get("avg_temp_c", 28.0),
            "season_rainfall_mm": climate.get("total_rainfall_mm", 250.0),
            
            # Historical features
            "historical_yield_t_ha": historical_yield,
            "base_yield_t_ha": crop.get("base_yield_t_per_ha", 3.0),
            
            # Economic features (prices will be predicted by price model)
            "price_factor": price_factor,
        }
        
        return features
    
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
    
    def _get_historical_yield(self, field_id: str, crop_id: str) -> float:
        """Get average historical yield or base yield if no history."""
        avg_yield = HistoricalYieldRepository.get_average_yield(
            self.db, field_id, crop_id
        )
        
        if avg_yield > 0:
            return avg_yield
        
        # Return crop base yield as fallback
        crop = CropRepository.get_crop_by_id(self.db, crop_id)
        return crop.get("base_yield_t_per_ha", 3.0) if crop else 3.0

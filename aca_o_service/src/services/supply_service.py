"""
Supply Service (National/Regional Aggregation)

This service provides aggregate statistics about crop planting
and expected production at national or regional levels.

Used by:
- Agricultural ministry for food security planning
- Regional scheme managers for resource allocation
- Policy makers for price stabilization decisions

Data aggregation levels:
- National: All fields across the country
- Scheme: Fields within a specific irrigation scheme
- Season: Data for a specific growing season
"""

import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from src.core.schemas import SupplyResponse, SupplySummaryItem
from src.data.repositories import FieldRepository, CropRepository

logger = logging.getLogger(__name__)


class SupplyService:
    """
    Service for aggregating national/regional supply data.
    
    Queries recommendation and planting data to provide
    aggregate statistics for planning purposes.
    
    Usage:
        service = SupplyService()
        response = service.get_supply_summary(
            season="Maha-2025",
            scheme_id=None,  # National aggregate
            db_session=db
        )
    """
    
    def get_supply_summary(
        self,
        season: str,
        scheme_id: Optional[str],
        db_session: Session,
    ) -> SupplyResponse:
        """
        Get aggregate supply summary for crops.
        
        Aggregates planned planting data across fields to show:
        - Total area per crop
        - Expected total production per crop
        
        Args:
            season: Growing season (e.g., "Maha-2025")
            scheme_id: Optional irrigation scheme filter (None for national)
            db_session: Database session
        
        Returns:
            SupplyResponse with aggregated statistics per crop
        """
        logger.info(f"Getting supply summary for season={season}, scheme={scheme_id}")
        
        # Get aggregate data
        # In production, this would query actual recommendation/planting records
        # For now, return realistic dummy data
        items = self._get_aggregate_data(season, scheme_id, db_session)
        
        return SupplyResponse(
            season=season,
            scheme_id=scheme_id,
            items=items,
        )
    
    def _get_aggregate_data(
        self,
        season: str,
        scheme_id: Optional[str],
        db_session: Session,
    ) -> List[SupplySummaryItem]:
        """
        Fetch and aggregate supply data.
        
        TODO: Replace with actual database queries when data is available.
        
        Query would be something like:
            SELECT 
                crop_id, 
                crop_name,
                SUM(allocated_area_ha) as total_area,
                SUM(allocated_area_ha * expected_yield) as total_production
            FROM recommendations
            JOIN fields ON recommendations.field_id = fields.id
            WHERE season = :season
            AND (:scheme_id IS NULL OR fields.scheme_id = :scheme_id)
            GROUP BY crop_id, crop_name
        """
        logger.debug("Fetching aggregate supply data (stub implementation)")
        
        # Dummy data representing national aggregate
        # Scaled based on typical Sri Lankan agricultural statistics
        
        # Season factor - Maha typically has more planting
        if "maha" in season.lower():
            scale = 1.0
        else:
            scale = 0.7  # Yala is typically smaller
        
        # Scheme factor - if filtering by scheme, much smaller numbers
        if scheme_id:
            scheme_scale = 0.01  # About 1% of national
        else:
            scheme_scale = 1.0
        
        combined_scale = scale * scheme_scale
        
        # Dummy aggregate data
        base_data = [
            {
                "crop_id": "CROP-001",
                "crop_name": "Rice (BG 352)",
                "total_area_ha": 850000,  # ~850,000 ha rice nationally
                "avg_yield_t_ha": 4.2,
            },
            {
                "crop_id": "CROP-002",
                "crop_name": "Maize",
                "total_area_ha": 45000,
                "avg_yield_t_ha": 5.0,
            },
            {
                "crop_id": "CROP-003",
                "crop_name": "Green Gram",
                "total_area_ha": 35000,
                "avg_yield_t_ha": 1.2,
            },
            {
                "crop_id": "CROP-004",
                "crop_name": "Chilli",
                "total_area_ha": 28000,
                "avg_yield_t_ha": 8.0,
            },
            {
                "crop_id": "CROP-005",
                "crop_name": "Onion",
                "total_area_ha": 12000,
                "avg_yield_t_ha": 15.0,
            },
        ]
        
        items = []
        for data in base_data:
            area = data["total_area_ha"] * combined_scale
            production = area * data["avg_yield_t_ha"]
            
            items.append(SupplySummaryItem(
                crop_id=data["crop_id"],
                crop_name=data["crop_name"],
                total_area_ha=round(area, 2),
                total_expected_production_tonnes=round(production, 2),
            ))
        
        return items
    
    def get_crop_details(
        self,
        crop_id: str,
        season: str,
        db_session: Session,
    ) -> Dict[str, Any]:
        """
        Get detailed breakdown for a specific crop.
        
        Provides more detailed statistics for a single crop including:
        - Breakdown by scheme/region
        - Comparison with previous seasons
        - Price expectations
        
        Args:
            crop_id: Crop identifier
            season: Growing season
            db_session: Database session
        
        Returns:
            Detailed statistics dictionary
        """
        logger.debug(f"Getting crop details for {crop_id}")
        
        # Dummy detailed data
        return {
            "crop_id": crop_id,
            "season": season,
            "total_area_ha": 850000,
            "total_expected_production_tonnes": 3570000,
            "avg_yield_t_ha": 4.2,
            "num_fields": 125000,
            "by_region": [
                {"region": "North Central", "area_ha": 320000},
                {"region": "Eastern", "area_ha": 185000},
                {"region": "North Western", "area_ha": 165000},
                {"region": "Southern", "area_ha": 95000},
                {"region": "Other", "area_ha": 85000},
            ],
            "comparison": {
                "prev_season_area_ha": 810000,
                "change_pct": 4.9,
            },
        }


class SupplyForecastService:
    """
    Service for forecasting future supply based on recommendations.
    
    Uses recommendation data to project expected supply,
    useful for early warning of shortages or surpluses.
    
    Future enhancement for supply forecasting.
    """
    
    @staticmethod
    def forecast_supply(
        season: str,
        confidence_level: float = 0.8,
    ) -> Dict[str, Any]:
        """
        Forecast expected supply for the season.
        
        Args:
            season: Target season
            confidence_level: Statistical confidence for bounds
        
        Returns:
            Forecast with expected values and confidence bounds
        """
        # Placeholder for supply forecasting logic
        return {
            "season": season,
            "forecast_date": "2025-01-15",
            "confidence_level": confidence_level,
            "crops": [
                {
                    "crop_id": "CROP-001",
                    "expected_production_tonnes": 3500000,
                    "lower_bound_tonnes": 3200000,
                    "upper_bound_tonnes": 3800000,
                },
            ],
        }

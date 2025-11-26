"""
Supply Service (National/Regional Aggregation)

This service provides aggregate statistics about crop planting
and expected production at national or regional levels.

IMPORTANT: This service requires real data to be populated.
Without data in the database, it will return empty results.

Used by:
- Agricultural ministry for food security planning
- Regional scheme managers for resource allocation
- Policy makers for price stabilization decisions
"""

import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from src.core.schemas import SupplyResponse, SupplySummaryItem
from src.data.repositories import FieldRepository, CropRepository

logger = logging.getLogger(__name__)


class SupplyService:
    """
    Service for aggregating national/regional supply data.
    
    REQUIRES: Database with populated recommendation/planting data.
    
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
            Returns empty items list if no data available.
        """
        logger.info(f"Getting supply summary for season={season}, scheme={scheme_id}")
        
        # Get aggregate data from database
        items = self._get_aggregate_data(season, scheme_id, db_session)
        
        if not items:
            logger.warning(
                f"No supply data found for season={season}, scheme={scheme_id}. "
                "Please ensure recommendation/planting data is populated in the database."
            )
        
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
        Fetch and aggregate supply data from database.
        
        Queries the recommendations/planting records table to aggregate
        by crop. Returns empty list if no data available.
        """
        logger.debug("Fetching aggregate supply data from database")
        
        try:
            # TODO: Replace with actual query when recommendations table exists
            # Example query structure:
            #
            # from src.data.models_orm import Recommendation, Field, Crop
            # 
            # query = db_session.query(
            #     Recommendation.crop_id,
            #     Crop.name.label('crop_name'),
            #     func.sum(Recommendation.allocated_area_ha).label('total_area'),
            #     func.sum(Recommendation.allocated_area_ha * Recommendation.expected_yield).label('total_production')
            # ).join(
            #     Field, Recommendation.field_id == Field.id
            # ).join(
            #     Crop, Recommendation.crop_id == Crop.id
            # ).filter(
            #     Recommendation.season == season
            # )
            # 
            # if scheme_id:
            #     query = query.filter(Field.scheme_id == scheme_id)
            # 
            # results = query.group_by(Recommendation.crop_id, Crop.name).all()
            # 
            # return [
            #     SupplySummaryItem(
            #         crop_id=r.crop_id,
            #         crop_name=r.crop_name,
            #         total_area_ha=float(r.total_area or 0),
            #         total_expected_production_tonnes=float(r.total_production or 0),
            #     )
            #     for r in results
            # ]
            
            # For now, return empty list indicating no data
            logger.warning(
                "Supply aggregation requires recommendations/planting data table. "
                "Please implement the Recommendation model and populate data."
            )
            return []
            
        except Exception as e:
            logger.error(f"Database error fetching supply data: {e}")
            return []
    
    def get_crop_details(
        self,
        crop_id: str,
        season: str,
        db_session: Session,
    ) -> Dict[str, Any]:
        """
        Get detailed breakdown for a specific crop.
        
        Args:
            crop_id: Crop identifier
            season: Growing season
            db_session: Database session
        
        Returns:
            Detailed statistics dictionary.
            Returns minimal data if database not populated.
        """
        logger.debug(f"Getting crop details for {crop_id}")
        
        # Get crop name from database
        crop = CropRepository.get_crop_by_id(db_session, crop_id)
        crop_name = crop.get("name", "Unknown") if crop else "Unknown"
        
        # Return structure indicating no data available
        return {
            "crop_id": crop_id,
            "crop_name": crop_name,
            "season": season,
            "total_area_ha": None,
            "total_expected_production_tonnes": None,
            "avg_yield_t_ha": None,
            "num_fields": None,
            "by_region": [],
            "comparison": None,
            "data_available": False,
            "message": "Detailed supply data requires populated recommendations/planting records.",
        }


class SupplyForecastService:
    """
    Service for forecasting future supply based on recommendations.
    
    REQUIRES: Historical recommendation data and trained forecasting model.
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
            Forecast data or error message if data unavailable.
        """
        logger.warning(
            "Supply forecasting requires historical data and trained model. "
            "Please configure data sources."
        )
        
        return {
            "season": season,
            "forecast_date": None,
            "confidence_level": confidence_level,
            "crops": [],
            "data_available": False,
            "message": "Supply forecasting requires historical recommendation data.",
        }

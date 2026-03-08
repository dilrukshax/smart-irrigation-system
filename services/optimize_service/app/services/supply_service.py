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
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.schemas import SupplyResponse, SupplySummaryItem
from app.data.repositories import CropRepository, RecommendationRepository
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


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
        
        observed_at = datetime.utcnow().isoformat()
        data_available = bool(items)
        return SupplyResponse(
            season=season,
            scheme_id=scheme_id,
            items=items,
            status="ok" if data_available else "data_unavailable",
            source="optimization_service",
            is_live=data_available,
            observed_at=observed_at,
            staleness_sec=0 if data_available else None,
            quality="good" if data_available else "unavailable",
            data_available=data_available,
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
        logger.debug("Fetching aggregate supply data from recommendations table")

        try:
            records = RecommendationRepository.aggregate_supply(
                db_session=db_session,
                season=season,
                scheme_id=scheme_id,
            )
            return [
                SupplySummaryItem(
                    crop_id=item["crop_id"],
                    crop_name=item["crop_name"],
                    total_area_ha=float(item["total_area_ha"]),
                    total_expected_production_tonnes=float(
                        item["total_expected_production_tonnes"]
                    ),
                )
                for item in records
            ]
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

    def get_water_budget(
        self,
        season: str,
        scheme_id: Optional[str],
        db_session: Session,
    ) -> Dict[str, Any]:
        """Aggregate crop-level water usage from generated recommendations."""
        records = RecommendationRepository.list_latest_by_field(
            db_session=db_session,
            season=season,
            scheme_id=scheme_id,
        )

        crops: Dict[str, Dict[str, Any]] = {}
        total_usage = 0.0
        default_quota: Optional[float] = None

        for rec_record in records:
            request_data = rec_record.get("request_data") or {}
            scenario = request_data.get("scenario") or {}
            quota = scenario.get("water_quota_mm")
            if quota:
                default_quota = float(quota)

            top = ((rec_record.get("response_data") or {}).get("recommendations") or [])
            if not top:
                continue
            crop = top[0]
            crop_name = crop.get("crop_name") or crop.get("crop_id") or "Unknown"
            usage = float(
                (crop.get("expected_yield_t_per_ha") or 0.0) * 120
            )
            if crop_name not in crops:
                crops[crop_name] = {"crop_name": crop_name, "water_usage": 0.0}
            crops[crop_name]["water_usage"] += usage
            total_usage += usage

        return {
            "crops": [
                {
                    "crop_name": value["crop_name"],
                    "water_usage": round(value["water_usage"], 2),
                    "waterUsed": round(value["water_usage"], 2),
                }
                for value in crops.values()
            ],
            "quota": round(default_quota, 2) if default_quota is not None else None,
            "total_usage": round(total_usage, 2),
            "totalWaterUsage": round(total_usage, 2),
            "status": "ok" if default_quota is not None or total_usage > 0 else "data_unavailable",
            "source": "optimization_service",
            "is_live": bool(records),
            "observed_at": datetime.utcnow().isoformat(),
            "staleness_sec": 0 if records else None,
            "quality": "good" if records else "unavailable",
            "data_available": bool(records) and (default_quota is not None or not settings.is_strict_live_data),
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

"""
National Supply Routes

This module provides endpoints for aggregating supply and area data
at a national or regional level. This information is used by:
- Agricultural ministry planners
- Regional scheme managers
- Food security analysts

The aggregate data helps with:
- National food security planning
- Price stabilization policies
- Resource allocation decisions
"""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.schemas import SupplyResponse
from app.data.db import get_db
from app.services.supply_service import SupplyService

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/f4/national-supply",
    tags=["national-supply"],
)


@router.get("", response_model=SupplyResponse)
@router.get("/", response_model=SupplyResponse)
async def get_national_supply(
    db: Annotated[Session, Depends(get_db)],
    season: str = Query(
        default="Maha-2025",
        description="Growing season to query (e.g., 'Maha-2025', 'Yala-2025')",
    ),
    scheme_id: Optional[str] = Query(
        default=None,
        description="Optional irrigation scheme ID to filter by",
    ),
) -> SupplyResponse:
    """
    Get aggregated national/regional supply summary.
    
    This endpoint returns aggregate statistics showing:
    - Total planted area per crop across all fields
    - Expected total production per crop
    
    The data can be filtered by:
    - Season: Required parameter specifying which growing season
    - Scheme ID: Optional filter to limit to a specific irrigation scheme
    
    Args:
        db: Database session
        season: Growing season string (e.g., "Maha-2025")
        scheme_id: Optional irrigation scheme identifier
    
    Returns:
        SupplyResponse containing:
            - season: The queried season
            - scheme_id: The scheme filter (if applied)
            - items: List of SupplySummaryItem objects with:
                - crop_id: Crop identifier
                - crop_name: Human-readable crop name
                - total_area_ha: Total hectares planted
                - total_expected_production_tonnes: Expected yield
    
    Example response:
        {
            "season": "Maha-2025",
            "scheme_id": null,
            "items": [
                {
                    "crop_id": "CROP-001",
                    "crop_name": "Rice (BG 352)",
                    "total_area_ha": 15000.0,
                    "total_expected_production_tonnes": 63000.0
                },
                {
                    "crop_id": "CROP-002",
                    "crop_name": "Maize",
                    "total_area_ha": 8500.0,
                    "total_expected_production_tonnes": 42500.0
                }
            ]
        }
    """
    logger.info(f"National supply request for season={season}, scheme_id={scheme_id}")
    
    # Create service and get supply summary
    service = SupplyService()
    response = service.get_supply_summary(
        season=season,
        scheme_id=scheme_id,
        db_session=db,
    )
    
    logger.info(f"Returning supply data for {len(response.items)} crops")
    
    return response

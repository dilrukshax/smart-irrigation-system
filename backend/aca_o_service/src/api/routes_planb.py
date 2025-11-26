"""
Plan B Routes (Mid-Season Replanning)

This module provides the Plan B endpoint for mid-season replanning.
When water quotas change or market prices shift significantly during
the growing season, farmers may need to adjust their crop plans.

The Plan B service recalculates optimal crop allocations based on
updated constraints while considering crops already planted.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.core.schemas import PlanBRequest, PlanBResponse
from src.data.db import get_db
from src.services.planb_service import PlanBService

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/f4/planb",
    tags=["plan-b"],
)


@router.post("", response_model=PlanBResponse)
@router.post("/", response_model=PlanBResponse)
async def recompute_plan(
    request: PlanBRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PlanBResponse:
    """
    Recompute crop plan when constraints change mid-season (Plan B).
    
    This endpoint is called when:
    - Water quota is reduced due to drought or upstream allocation changes
    - Market prices change significantly, affecting profitability
    - Climate forecasts are updated with new information
    
    The service will:
    1. Load the original recommendations for the field
    2. Apply the updated constraints (quota, prices)
    3. Re-run optimization with new parameters
    4. Return an adjusted plan that may:
       - Reduce planted area for water-intensive crops
       - Suggest switching crops where possible
       - Prioritize higher-value crops within constraints
    
    Args:
        request: PlanBRequest containing:
            - field_id: Field identifier
            - season: Growing season
            - updated_quota_mm: New water quota in millimeters (optional)
            - updated_prices: Dict of crop_id -> new price per kg (optional)
        db: Database session
    
    Returns:
        PlanBResponse containing:
            - field_id: The field ID
            - season: The season
            - message: Human-readable explanation of changes
            - adjusted_plan: List of adjusted CropOption recommendations
    
    Example request:
        {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
            "updated_quota_mm": 600,
            "updated_prices": {"CROP-001": 85.0, "CROP-002": 120.0}
        }
    """
    logger.info(f"Plan B request for field={request.field_id}, season={request.season}")
    
    if request.updated_quota_mm:
        logger.info(f"Updated water quota: {request.updated_quota_mm} mm")
    if request.updated_prices:
        logger.info(f"Updated prices for {len(request.updated_prices)} crops")
    
    # Create service and recompute plan
    service = PlanBService()
    response = service.recompute_plan(request=request, db_session=db)
    
    logger.info(f"Plan B generated: {response.message}")
    
    return response

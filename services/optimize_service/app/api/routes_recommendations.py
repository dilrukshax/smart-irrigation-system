"""
Crop Recommendations Routes

This module provides the main recommendation endpoint for the ACA-O service.
The /f4/recommendations endpoint is the primary interface for getting
adaptive crop recommendations for a specific field.

Function 4 (F4) refers to the "Adaptive Crop & Area Optimization" function
in the smart irrigation system architecture.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.schemas import RecommendationRequest, RecommendationResponse
from app.data.db import get_db
from app.services.recommendation_service import RecommendationService

# Setup logging for this module
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/f4/recommendations",
    tags=["recommendations"],
)


@router.post("", response_model=RecommendationResponse)
@router.post("/", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    db: Annotated[Session, Depends(get_db)],
) -> RecommendationResponse:
    """
    Get adaptive crop recommendations for a specific field.
    
    This endpoint analyzes the given field and returns a ranked list of
    crop recommendations based on:
    - Field characteristics (soil type, area, location)
    - Water availability and quota constraints
    - Climate and weather forecasts
    - Historical yield data
    - Current market prices
    - Fuzzy-TOPSIS suitability scoring
    
    Args:
        request: RecommendationRequest containing:
            - field_id: Unique identifier for the field
            - season: Growing season (e.g., "Maha-2025", "Yala-2025")
            - scenario: Optional dict with quota/price scenario overrides
        db: Database session (injected by FastAPI)
    
    Returns:
        RecommendationResponse containing:
            - field_id: The requested field ID
            - season: The requested season
            - recommendations: List of CropOption objects ranked by suitability
    
    Example request body:
        {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
            "scenario": {"water_quota_mm": 800, "price_factor": 1.1}
        }
    
    Example response:
        {
            "field_id": "FIELD-001",
            "season": "Maha-2025",
            "recommendations": [
                {
                    "crop_id": "CROP-001",
                    "crop_name": "Rice (BG 352)",
                    "suitability_score": 0.85,
                    "expected_yield_t_per_ha": 4.2,
                    "expected_profit_per_ha": 125000.0,
                    "risk_band": "low",
                    "rationale": "High soil suitability, adequate water supply"
                },
                ...
            ]
        }
    """
    logger.info(f"Received recommendation request for field={request.field_id}, season={request.season}")
    
    # Create service instance and get recommendations
    service = RecommendationService()
    response = service.get_recommendations(request=request, db_session=db)
    
    logger.info(f"Returning {len(response.recommendations)} recommendations for field={request.field_id}")
    
    return response

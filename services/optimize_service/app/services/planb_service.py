"""
Plan B Service (Mid-Season Replanning)

This service handles mid-season replanning when conditions change.
Scenarios that trigger Plan B:
- Water quota reduced due to drought
- Market prices change significantly
- Weather forecast updates suggest different conditions

The service recalculates optimal crop allocation considering:
- Crops already planted (sunk costs)
- Updated constraints (water, prices)
- Feasibility of switching crops
"""

import logging
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from app.core.schemas import (
    PlanBRequest,
    PlanBResponse,
    CropOption,
    RecommendationRequest,
)
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)


class PlanBService:
    """
    Service for mid-season replanning.
    
    When water quotas or prices change during the season, this service
    recalculates the optimal crop plan while considering:
    - What's already planted
    - Updated constraints
    - Cost of switching
    
    Usage:
        service = PlanBService()
        response = service.recompute_plan(
            request=PlanBRequest(
                field_id="F1",
                season="Maha-2025",
                updated_quota_mm=600,
            ),
            db_session=db
        )
    """
    
    def __init__(self):
        """Initialize the Plan B service."""
        self._recommendation_service = RecommendationService()
    
    def recompute_plan(
        self,
        request: PlanBRequest,
        db_session: Session,
    ) -> PlanBResponse:
        """
        Recompute crop plan with updated constraints.
        
        Args:
            request: PlanBRequest containing:
                - field_id: Field identifier
                - season: Current season
                - updated_quota_mm: New water quota (if changed)
                - updated_prices: New price expectations (if changed)
            db_session: Database session
        
        Returns:
            PlanBResponse with adjusted recommendations and explanation
        """
        logger.info(
            f"Plan B requested for field={request.field_id}, "
            f"quota={request.updated_quota_mm}, prices={request.updated_prices}"
        )
        
        # Build scenario from updates
        scenario = self._build_scenario(request)
        
        # Create a recommendation request with the updated scenario
        rec_request = RecommendationRequest(
            field_id=request.field_id,
            season=request.season,
            scenario=scenario,
        )
        
        # Get new recommendations
        rec_response = self._recommendation_service.get_recommendations(
            request=rec_request,
            db_session=db_session,
        )
        
        # Generate Plan B message
        message = self._generate_message(request, rec_response.recommendations)
        
        # Adjust recommendations for Plan B context
        adjusted_plan = self._adjust_for_planb(rec_response.recommendations)
        
        return PlanBResponse(
            field_id=request.field_id,
            season=request.season,
            message=message,
            adjusted_plan=adjusted_plan,
        )
    
    def _build_scenario(self, request: PlanBRequest) -> Dict[str, Any]:
        """
        Build scenario dictionary from Plan B request.
        
        Converts the update parameters into a scenario that can be
        passed to the recommendation service.
        """
        scenario: Dict[str, Any] = {}
        
        if request.updated_quota_mm is not None:
            scenario["water_quota_mm"] = request.updated_quota_mm
        
        if request.updated_prices is not None:
            scenario["price_overrides"] = request.updated_prices
            # Calculate a simple price factor for overall adjustment
            if request.updated_prices:
                # If prices are provided, we're in a specific scenario
                scenario["price_factor"] = 1.0  # Use actual prices
        
        return scenario
    
    def _generate_message(
        self,
        request: PlanBRequest,
        recommendations: list,
    ) -> str:
        """
        Generate a human-readable message explaining the Plan B changes.
        
        Provides context about what changed and how recommendations adjusted.
        """
        parts = ["Plan B generated"]
        
        if request.updated_quota_mm is not None:
            parts.append(f"based on updated water quota ({request.updated_quota_mm:.0f} mm)")
        
        if request.updated_prices is not None:
            parts.append(f"incorporating {len(request.updated_prices)} price updates")
        
        if recommendations:
            top_crop = recommendations[0].crop_name
            parts.append(f"- top recommendation: {top_crop}")
        else:
            parts.append("- no viable crops found under new constraints")
        
        return "; ".join(parts) + "."
    
    def _adjust_for_planb(
        self,
        recommendations: list,
    ) -> list[CropOption]:
        """
        Adjust recommendations for Plan B context.
        
        Modifies recommendations to account for:
        - Preference for crops already in progress
        - Penalties for major switches
        - Feasibility notes
        
        For now, returns the recommendations with slightly modified rationales.
        """
        adjusted = []
        
        for i, rec in enumerate(recommendations):
            # Create adjusted copy
            adjusted_rec = CropOption(
                crop_id=rec.crop_id,
                crop_name=rec.crop_name,
                suitability_score=rec.suitability_score,
                expected_yield_t_per_ha=rec.expected_yield_t_per_ha,
                expected_profit_per_ha=rec.expected_profit_per_ha,
                risk_band=rec.risk_band,
                rationale=self._adjust_rationale(rec.rationale, is_planb=True),
            )
            adjusted.append(adjusted_rec)
        
        return adjusted
    
    def _adjust_rationale(self, original: str, is_planb: bool) -> str:
        """
        Adjust rationale text for Plan B context.
        
        Adds Plan B specific notes to the recommendation rationale.
        """
        if is_planb:
            return f"[Plan B] {original} Recommendation adjusted for updated constraints."
        return original


class QuotaReductionAnalyzer:
    """
    Helper class to analyze impact of water quota reduction.
    
    Provides analysis of:
    - Which crops are most affected
    - Suggested area reductions
    - Expected profit loss
    
    Future enhancement for detailed quota impact analysis.
    """
    
    @staticmethod
    def analyze_quota_reduction(
        original_quota_mm: float,
        new_quota_mm: float,
        current_allocations: Dict[str, float],
        water_requirements: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Analyze the impact of a water quota reduction.
        
        Args:
            original_quota_mm: Previous water quota
            new_quota_mm: New (reduced) water quota
            current_allocations: Current area allocations by crop
            water_requirements: Water requirement per ha by crop
        
        Returns:
            Analysis dictionary with:
            - reduction_pct: Percentage quota reduction
            - affected_crops: List of crops that need adjustment
            - suggested_reductions: Recommended area reductions
        """
        reduction_pct = (original_quota_mm - new_quota_mm) / original_quota_mm * 100
        
        # Calculate current water usage
        current_usage = sum(
            area * water_requirements.get(crop_id, 500)
            for crop_id, area in current_allocations.items()
        )
        
        # Calculate excess water usage
        excess = current_usage - new_quota_mm
        
        analysis = {
            "original_quota_mm": original_quota_mm,
            "new_quota_mm": new_quota_mm,
            "reduction_pct": round(reduction_pct, 1),
            "current_water_usage_mm": round(current_usage, 2),
            "excess_mm": max(0, round(excess, 2)),
            "requires_adjustment": excess > 0,
        }
        
        return analysis

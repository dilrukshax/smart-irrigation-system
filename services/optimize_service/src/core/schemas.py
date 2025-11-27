"""
Pydantic Schemas for API Request/Response Models

This module defines all Pydantic models used for:
- Request validation (incoming data from clients)
- Response serialization (outgoing data to clients)
- Internal data transfer between layers

These schemas enforce type safety and provide automatic
validation and documentation generation.
"""

from typing import Optional

from pydantic import BaseModel, Field


# =============================================================================
# Recommendation Schemas
# =============================================================================

class RecommendationRequest(BaseModel):
    """
    Request model for crop recommendations.
    
    Sent by clients to request crop recommendations for a specific field
    during a particular growing season.
    
    Attributes:
        field_id: Unique identifier for the agricultural field
        season: Growing season identifier (e.g., "Maha-2025", "Yala-2025")
        scenario: Optional scenario overrides for what-if analysis
                  Can include water_quota_mm, price_factor, etc.
    """
    field_id: str = Field(
        ...,
        description="Unique identifier for the field",
        examples=["FIELD-001", "FIELD-A23"],
    )
    season: str = Field(
        ...,
        description="Growing season (e.g., 'Maha-2025', 'Yala-2025')",
        examples=["Maha-2025"],
    )
    scenario: Optional[dict] = Field(
        default=None,
        description="Optional scenario parameters for what-if analysis",
        examples=[{"water_quota_mm": 800, "price_factor": 1.1}],
    )


class CropOption(BaseModel):
    """
    A single crop recommendation option.
    
    Represents one potential crop that could be planted in a field,
    along with suitability scores and expected outcomes.
    
    Attributes:
        crop_id: Unique identifier for the crop variety
        crop_name: Human-readable name of the crop
        suitability_score: Score from 0-1 indicating how suitable this crop
                          is for the field (higher is better)
        expected_yield_t_per_ha: Expected yield in tonnes per hectare
        expected_profit_per_ha: Expected profit in local currency per hectare
        risk_band: Risk classification (low, medium, high)
        rationale: Human-readable explanation of why this crop is recommended
    """
    crop_id: str = Field(
        ...,
        description="Unique identifier for the crop",
    )
    crop_name: str = Field(
        ...,
        description="Human-readable crop name",
    )
    suitability_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Suitability score between 0 and 1",
    )
    expected_yield_t_per_ha: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Expected yield in tonnes per hectare",
    )
    expected_profit_per_ha: Optional[float] = Field(
        default=None,
        description="Expected profit per hectare in local currency",
    )
    risk_band: Optional[str] = Field(
        default=None,
        description="Risk classification: 'low', 'medium', or 'high'",
    )
    rationale: str = Field(
        ...,
        description="Explanation of the recommendation",
    )


class RecommendationResponse(BaseModel):
    """
    Response model for crop recommendations.
    
    Contains a list of ranked crop options for the requested field.
    
    Attributes:
        field_id: The field these recommendations are for
        season: The growing season
        recommendations: List of crop options sorted by suitability
    """
    field_id: str = Field(..., description="Field identifier")
    season: str = Field(..., description="Growing season")
    recommendations: list[CropOption] = Field(
        ...,
        description="List of recommended crops, sorted by suitability",
    )


# =============================================================================
# Plan B Schemas
# =============================================================================

class PlanBRequest(BaseModel):
    """
    Request model for mid-season replanning (Plan B).
    
    When conditions change mid-season (water quota reduced, prices shift),
    this endpoint recalculates optimal crop allocations.
    
    Attributes:
        field_id: The field to replan
        season: Current growing season
        updated_quota_mm: New water quota in millimeters (if changed)
        updated_prices: New crop prices as dict of crop_id -> price_per_kg
    """
    field_id: str = Field(
        ...,
        description="Field identifier for replanning",
    )
    season: str = Field(
        ...,
        description="Current growing season",
    )
    updated_quota_mm: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Updated water quota in millimeters",
    )
    updated_prices: Optional[dict[str, float]] = Field(
        default=None,
        description="Updated prices as {crop_id: price_per_kg}",
    )


class PlanBResponse(BaseModel):
    """
    Response model for Plan B replanning.
    
    Contains the adjusted crop plan after constraint changes.
    
    Attributes:
        field_id: Field identifier
        season: Growing season
        message: Human-readable summary of changes made
        adjusted_plan: Updated list of crop recommendations
    """
    field_id: str = Field(..., description="Field identifier")
    season: str = Field(..., description="Growing season")
    message: str = Field(
        ...,
        description="Summary of adjustments made to the plan",
    )
    adjusted_plan: list[CropOption] = Field(
        ...,
        description="Adjusted crop recommendations",
    )


# =============================================================================
# Supply Aggregation Schemas
# =============================================================================

class SupplySummaryItem(BaseModel):
    """
    Summary statistics for a single crop at national/regional level.
    
    Aggregates data across all fields to show total planted area
    and expected production for planning purposes.
    
    Attributes:
        crop_id: Crop identifier
        crop_name: Human-readable crop name
        total_area_ha: Total hectares planted with this crop
        total_expected_production_tonnes: Expected total production
    """
    crop_id: str = Field(..., description="Crop identifier")
    crop_name: str = Field(..., description="Crop name")
    total_area_ha: float = Field(
        ...,
        ge=0.0,
        description="Total planted area in hectares",
    )
    total_expected_production_tonnes: float = Field(
        ...,
        ge=0.0,
        description="Expected total production in tonnes",
    )


class SupplyResponse(BaseModel):
    """
    Response model for national/regional supply aggregation.
    
    Provides aggregate statistics for agricultural planning.
    
    Attributes:
        season: The queried growing season
        scheme_id: Irrigation scheme filter (None if national aggregate)
        items: List of supply statistics per crop
    """
    season: str = Field(..., description="Growing season")
    scheme_id: Optional[str] = Field(
        default=None,
        description="Irrigation scheme ID if filtered, None for national",
    )
    items: list[SupplySummaryItem] = Field(
        ...,
        description="Supply statistics per crop",
    )

"""
Pydantic Schemas for API Request/Response Models

This module defines all Pydantic models used for:
- Request validation (incoming data from clients)
- Response serialization (outgoing data to clients)
- Internal data transfer between layers

These schemas enforce type safety and provide automatic
validation and documentation generation.
"""

from typing import Optional, List

from pydantic import BaseModel, Field


# =============================================================================
# Adaptive Input Parameters Schemas
# =============================================================================

class FieldParameters(BaseModel):
    """Field-level parameters that can be adjusted by user."""
    field_id: Optional[str] = Field(
        default=None,
        description="Field identifier (optional - can use custom values)"
    )
    area_ha: float = Field(
        default=5.0,
        ge=0.1,
        le=100.0,
        description="Field area in hectares"
    )
    soil_type: str = Field(
        default="Loam",
        description="Soil type classification"
    )
    soil_ph: float = Field(
        default=6.5,
        ge=4.0,
        le=9.0,
        description="Soil pH level"
    )
    soil_ec: float = Field(
        default=1.0,
        ge=0.0,
        le=5.0,
        description="Soil electrical conductivity (mS/cm)"
    )
    soil_suitability: float = Field(
        default=0.75,
        ge=0.0,
        le=1.0,
        description="Overall soil suitability score (0-1)"
    )
    location: str = Field(
        default="Kandy",
        description="Location name"
    )
    latitude: float = Field(
        default=7.2906,
        ge=-90.0,
        le=90.0,
        description="GPS latitude"
    )
    longitude: float = Field(
        default=80.6337,
        ge=-180.0,
        le=180.0,
        description="GPS longitude"
    )
    elevation: float = Field(
        default=500.0,
        ge=0.0,
        le=3000.0,
        description="Elevation in meters"
    )


class WeatherParameters(BaseModel):
    """Weather/climate parameters that can be adjusted."""
    season_avg_temp: float = Field(
        default=28.0,
        ge=10.0,
        le=45.0,
        description="Season average temperature (°C)"
    )
    season_rainfall_mm: float = Field(
        default=250.0,
        ge=0.0,
        le=2000.0,
        description="Seasonal rainfall in mm"
    )
    temp_mean_weekly: float = Field(
        default=28.0,
        ge=10.0,
        le=45.0,
        description="Weekly mean temperature (°C)"
    )
    temp_range_weekly: float = Field(
        default=8.0,
        ge=0.0,
        le=25.0,
        description="Weekly temperature range (°C)"
    )
    precip_weekly_sum: float = Field(
        default=50.0,
        ge=0.0,
        le=500.0,
        description="Weekly precipitation sum (mm)"
    )
    radiation_weekly_sum: float = Field(
        default=150.0,
        ge=0.0,
        le=300.0,
        description="Weekly solar radiation (MJ/m²)"
    )
    et0_weekly_sum: float = Field(
        default=30.0,
        ge=0.0,
        le=100.0,
        description="Weekly evapotranspiration (mm)"
    )
    humidity: float = Field(
        default=75.0,
        ge=0.0,
        le=100.0,
        description="Relative humidity (%)"
    )


class WaterParameters(BaseModel):
    """Water availability parameters."""
    water_availability_mm: float = Field(
        default=5000.0,
        ge=0.0,
        le=20000.0,
        description="Total water availability (mm)"
    )
    water_quota_mm: float = Field(
        default=800.0,
        ge=0.0,
        le=5000.0,
        description="Water quota/allocation (mm)"
    )
    water_coverage_ratio: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Water coverage ratio (0-1)"
    )
    irrigation_efficiency: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Irrigation system efficiency (0-1)"
    )


class MarketParameters(BaseModel):
    """Market/price parameters."""
    price_factor: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Price adjustment factor (1.0 = normal)"
    )
    price_volatility: str = Field(
        default="medium",
        description="Expected price volatility: low, medium, high"
    )
    demand_level: str = Field(
        default="normal",
        description="Market demand level: low, normal, high"
    )


class CropFilterParameters(BaseModel):
    """Crop filtering and preference parameters."""
    crop_ids: Optional[List[str]] = Field(
        default=None,
        description="Specific crop IDs to evaluate (None = all crops)"
    )
    water_sensitivity_filter: Optional[str] = Field(
        default=None,
        description="Filter by water sensitivity: low, medium, high"
    )
    max_growth_duration_days: Optional[int] = Field(
        default=None,
        ge=30,
        le=1000,
        description="Maximum crop growth duration in days"
    )
    min_profit_per_ha: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Minimum acceptable profit per hectare"
    )
    max_risk_level: Optional[str] = Field(
        default=None,
        description="Maximum acceptable risk: low, medium, high"
    )


class AdaptiveRecommendationRequest(BaseModel):
    """
    Request model for adaptive crop recommendations with adjustable parameters.
    
    Allows users to toggle and adjust all input parameters that affect
    the ML model outputs for what-if analysis and scenario planning.
    """
    # Basic identifiers
    season: str = Field(
        default="Maha-2026",
        description="Growing season (e.g., 'Maha-2026', 'Yala-2026')"
    )
    top_n: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Number of top recommendations to return"
    )
    
    # Grouped parameters
    field_params: FieldParameters = Field(
        default_factory=FieldParameters,
        description="Field characteristics"
    )
    weather_params: WeatherParameters = Field(
        default_factory=WeatherParameters,
        description="Weather/climate parameters"
    )
    water_params: WaterParameters = Field(
        default_factory=WaterParameters,
        description="Water availability parameters"
    )
    market_params: MarketParameters = Field(
        default_factory=MarketParameters,
        description="Market/price parameters"
    )
    crop_filters: CropFilterParameters = Field(
        default_factory=CropFilterParameters,
        description="Crop filtering preferences"
    )
    
    # Historical data (optional - from IoT/sensors)
    historical_yield_avg: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Historical average yield (t/ha) from past seasons"
    )
    
    # Model weights (advanced users)
    suitability_weight: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Weight for suitability score in ranking (0-1)"
    )
    profitability_weight: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Weight for profitability in ranking (0-1)"
    )


class AdaptiveCropRecommendation(BaseModel):
    """Enhanced crop recommendation with detailed breakdown."""
    rank: int = Field(..., description="Recommendation rank (1 = best)")
    crop_id: str = Field(..., description="Crop identifier")
    crop_name: str = Field(..., description="Crop name")
    
    # Scores
    suitability_score: float = Field(..., ge=0.0, le=1.0, description="Suitability (0-1)")
    combined_score: float = Field(..., ge=0.0, le=1.0, description="Combined ranking score")
    
    # Predictions
    predicted_yield_t_ha: float = Field(..., ge=0.0, description="Predicted yield (t/ha)")
    predicted_price_per_kg: float = Field(..., ge=0.0, description="Predicted price (Rs/kg)")
    
    # Financial
    gross_revenue_per_ha: float = Field(..., description="Gross revenue per hectare")
    estimated_cost_per_ha: float = Field(..., description="Estimated production cost")
    profit_per_ha: float = Field(..., description="Net profit per hectare")
    roi_percentage: float = Field(..., description="Return on investment (%)")
    
    # Risk
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    risk_factors: List[str] = Field(default=[], description="Contributing risk factors")
    
    # Crop details
    water_requirement_mm: float = Field(..., description="Water requirement (mm)")
    growth_duration_days: int = Field(..., description="Growth duration in days")
    water_sensitivity: str = Field(..., description="Water sensitivity level")
    
    # Explanation
    rationale: str = Field(..., description="Recommendation rationale")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0, description="Model confidence")


class InputParameterSummary(BaseModel):
    """Summary of input parameters used for the recommendation."""
    field_area_ha: float
    soil_ph: float
    soil_suitability: float
    water_availability_mm: float
    water_quota_mm: float
    season_avg_temp: float
    season_rainfall_mm: float
    location: str
    season: str
    price_factor: float
    crops_evaluated: int


class AdaptiveRecommendationResponse(BaseModel):
    """
    Response model for adaptive recommendations with full transparency.
    
    Includes input parameter summary, recommendations, and model metadata.
    """
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    
    # Input summary for verification
    input_summary: InputParameterSummary = Field(
        ...,
        description="Summary of input parameters used"
    )
    
    # Recommendations
    recommendations: List[AdaptiveCropRecommendation] = Field(
        ...,
        description="Ranked crop recommendations"
    )
    
    # Aggregate stats
    total_crops_evaluated: int = Field(..., description="Total crops evaluated")
    average_suitability: float = Field(..., description="Average suitability of top crops")
    best_profit_per_ha: float = Field(..., description="Highest profit potential")
    
    # Model metadata
    models_used: List[str] = Field(
        default=[
            "Random Forest (Crop Classification)",
            "LightGBM (Price Prediction)",
            "Rule-based Heuristic (Yield)",
            "Fuzzy-TOPSIS (Suitability)"
        ],
        description="ML models used for predictions"
    )
    processing_time_ms: float = Field(default=0.0, description="Processing time in milliseconds")


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

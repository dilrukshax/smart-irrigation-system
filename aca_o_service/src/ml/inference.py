"""
ML Inference Module

This module provides high-level inference functions that combine
multiple ML models to generate predictions for crop recommendations.

Functions in this module:
- predict_yield_for_candidates: Get yield predictions for all candidate crops
- predict_price_for_candidates: Get price predictions for all candidate crops
- compute_profitability: Calculate expected profit per hectare

These functions are used by the recommendation service to orchestrate
ML predictions.
"""

import logging
from typing import Dict, Any, List

from src.ml.yield_model import get_yield_model
from src.ml.price_model import get_price_model

logger = logging.getLogger(__name__)


def predict_yield_for_candidates(
    field_id: str,
    features_per_crop: Dict[str, Dict[str, Any]],
) -> Dict[str, float]:
    """
    Predict yield for all candidate crops in a field.
    
    Args:
        field_id: Field identifier
        features_per_crop: Dictionary mapping crop_id to feature dict
    
    Returns:
        Dictionary mapping crop_id to predicted yield (t/ha)
        {"CROP-001": 4.2, "CROP-002": 5.1, ...}
    
    Example:
        features = {
            "CROP-001": {"soil_suitability": 0.85, ...},
            "CROP-002": {"soil_suitability": 0.75, ...},
        }
        yields = predict_yield_for_candidates("FIELD-001", features)
    """
    logger.info(f"Predicting yields for {len(features_per_crop)} crops in {field_id}")
    
    model = get_yield_model()
    predictions: Dict[str, float] = {}
    
    for crop_id, features in features_per_crop.items():
        try:
            yield_pred = model.predict(
                field_id=field_id,
                crop_id=crop_id,
                features=features,
            )
            predictions[crop_id] = yield_pred
        except Exception as e:
            logger.error(f"Yield prediction failed for {crop_id}: {e}")
            # Use base yield as fallback
            predictions[crop_id] = features.get("base_yield_t_ha", 3.0)
    
    return predictions


def predict_price_for_candidates(
    crop_ids: List[str],
    season: str = None,
) -> Dict[str, float]:
    """
    Predict prices for all candidate crops.
    
    Args:
        crop_ids: List of crop identifiers
        season: Growing season for seasonal adjustment
    
    Returns:
        Dictionary mapping crop_id to predicted price (per kg)
        {"CROP-001": 85.0, "CROP-002": 70.0, ...}
    """
    logger.info(f"Predicting prices for {len(crop_ids)} crops")
    
    model = get_price_model()
    predictions: Dict[str, float] = {}
    
    for crop_id in crop_ids:
        try:
            price = model.predict(crop_id=crop_id, season=season)
            predictions[crop_id] = price
        except Exception as e:
            logger.error(f"Price prediction failed for {crop_id}: {e}")
            predictions[crop_id] = 100.0  # Default fallback
    
    return predictions


def compute_profitability(
    crop_id: str,
    yield_t_per_ha: float,
    price_per_kg: float,
    cost_per_ha: float = None,
) -> Dict[str, float]:
    """
    Compute profitability metrics for a crop.
    
    Args:
        crop_id: Crop identifier (for cost lookup)
        yield_t_per_ha: Expected yield in tonnes/ha
        price_per_kg: Expected price per kg
        cost_per_ha: Optional production cost per ha (uses default if None)
    
    Returns:
        Dictionary with profitability metrics:
        - gross_revenue_per_ha: Yield × Price
        - cost_per_ha: Production costs
        - profit_per_ha: Revenue - Costs
        - profit_margin: Profit / Revenue
    
    Example:
        profit = compute_profitability(
            crop_id="CROP-001",
            yield_t_per_ha=4.5,
            price_per_kg=85.0
        )
        # Returns: {"profit_per_ha": 247500.0, ...}
    """
    # Default production costs per hectare (LKR)
    # Based on typical Sri Lankan farming costs
    default_costs = {
        "CROP-001": 135000,  # Rice - high input costs
        "CROP-002": 95000,   # Maize
        "CROP-003": 75000,   # Green Gram - lower input
        "CROP-004": 180000,  # Chilli - labor intensive
        "CROP-005": 150000,  # Onion
    }
    
    # Get cost
    if cost_per_ha is None:
        cost_per_ha = default_costs.get(crop_id, 120000)
    
    # Calculate revenue (yield in tonnes → kg, multiply by price)
    yield_kg = yield_t_per_ha * 1000
    gross_revenue = yield_kg * price_per_kg
    
    # Calculate profit
    profit = gross_revenue - cost_per_ha
    margin = profit / gross_revenue if gross_revenue > 0 else 0
    
    return {
        "gross_revenue_per_ha": round(gross_revenue, 2),
        "cost_per_ha": cost_per_ha,
        "profit_per_ha": round(profit, 2),
        "profit_margin": round(margin, 3),
    }


def get_risk_assessment(
    crop_id: str,
    features: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Get comprehensive risk assessment for a crop selection.
    
    Combines multiple risk factors:
    - Price volatility risk
    - Water stress risk
    - Yield uncertainty
    
    Args:
        crop_id: Crop identifier
        features: Feature dictionary
    
    Returns:
        Risk assessment dictionary with:
        - overall_risk: "low", "medium", or "high"
        - price_risk: Price volatility classification
        - water_risk: Risk from water shortage
        - factors: List of specific risk factors
    """
    price_model = get_price_model()
    
    # Get price risk
    price_risk = price_model.get_risk_band(crop_id)
    
    # Assess water risk
    water_coverage = features.get("water_coverage_ratio", 0.8)
    water_sensitivity = features.get("water_sensitivity", "medium")
    
    if water_coverage < 0.7:
        if water_sensitivity == "high":
            water_risk = "high"
        else:
            water_risk = "medium"
    elif water_coverage < 0.9 and water_sensitivity == "high":
        water_risk = "medium"
    else:
        water_risk = "low"
    
    # Combine risks
    risk_scores = {"low": 1, "medium": 2, "high": 3}
    avg_risk = (risk_scores[price_risk] + risk_scores[water_risk]) / 2
    
    if avg_risk <= 1.5:
        overall_risk = "low"
    elif avg_risk <= 2.5:
        overall_risk = "medium"
    else:
        overall_risk = "high"
    
    # Identify specific factors
    factors = []
    if price_risk == "high":
        factors.append("High price volatility - market prices fluctuate significantly")
    if water_risk != "low":
        factors.append(f"Water availability concern - coverage at {water_coverage:.0%}")
    if water_sensitivity == "high":
        factors.append("Crop is sensitive to water stress")
    
    return {
        "overall_risk": overall_risk,
        "price_risk": price_risk,
        "water_risk": water_risk,
        "factors": factors if factors else ["No significant risk factors identified"],
    }

"""
ML Inference Module

This module provides high-level inference functions that combine
multiple ML models to generate predictions for crop recommendations.

IMPORTANT: This module requires trained ML models to be loaded.
Without models, predictions will return None/empty values.

Functions in this module:
- predict_yield_for_candidates: Get yield predictions for all candidate crops
- predict_price_for_candidates: Get price predictions for all candidate crops
- compute_profitability: Calculate expected profit per hectare
"""

import logging
from typing import Dict, Any, List, Optional

from src.ml.yield_model import get_yield_model
from src.ml.price_model import get_price_model

logger = logging.getLogger(__name__)


def predict_yield_for_candidates(
    field_id: str,
    features_per_crop: Dict[str, Dict[str, Any]],
) -> Dict[str, Optional[float]]:
    """
    Predict yield for all candidate crops in a field.
    
    Args:
        field_id: Field identifier
        features_per_crop: Dictionary mapping crop_id to feature dict
    
    Returns:
        Dictionary mapping crop_id to predicted yield (t/ha)
        Returns None for crops where prediction failed.
    """
    logger.info(f"Predicting yields for {len(features_per_crop)} crops in {field_id}")
    
    model = get_yield_model()
    predictions: Dict[str, Optional[float]] = {}
    
    if not model.model_loaded:
        logger.error(
            "Yield model not loaded. Cannot generate yield predictions. "
            "Please configure and load a trained yield model."
        )
        return {crop_id: None for crop_id in features_per_crop.keys()}
    
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
            predictions[crop_id] = None
    
    return predictions


def predict_price_for_candidates(
    crop_ids: List[str],
    season: str = None,
) -> Dict[str, Optional[float]]:
    """
    Predict prices for all candidate crops.
    
    Args:
        crop_ids: List of crop identifiers
        season: Growing season for seasonal adjustment
    
    Returns:
        Dictionary mapping crop_id to predicted price (per kg)
        Returns None for crops where prediction failed.
    """
    logger.info(f"Predicting prices for {len(crop_ids)} crops")
    
    model = get_price_model()
    predictions: Dict[str, Optional[float]] = {}
    
    if not model.model_loaded:
        logger.error(
            "Price model not loaded. Cannot generate price predictions. "
            "Please configure and load a trained price model."
        )
        return {crop_id: None for crop_id in crop_ids}
    
    for crop_id in crop_ids:
        try:
            price = model.predict(crop_id=crop_id, season=season)
            predictions[crop_id] = price
        except Exception as e:
            logger.error(f"Price prediction failed for {crop_id}: {e}")
            predictions[crop_id] = None
    
    return predictions


def compute_profitability(
    crop_id: str,
    yield_t_per_ha: Optional[float],
    price_per_kg: Optional[float],
    cost_per_ha: float = None,
) -> Dict[str, Any]:
    """
    Compute profitability metrics for a crop.
    
    Args:
        crop_id: Crop identifier (for cost lookup)
        yield_t_per_ha: Expected yield in tonnes/ha (None if unavailable)
        price_per_kg: Expected price per kg (None if unavailable)
        cost_per_ha: Optional production cost per ha
    
    Returns:
        Dictionary with profitability metrics.
        Values will be None if yield or price data is missing.
    """
    # If yield or price is missing, cannot calculate profitability
    if yield_t_per_ha is None or price_per_kg is None:
        logger.warning(
            f"Cannot compute profitability for {crop_id}: "
            f"yield={yield_t_per_ha}, price={price_per_kg}"
        )
        return {
            "gross_revenue_per_ha": None,
            "cost_per_ha": cost_per_ha,
            "profit_per_ha": None,
            "profit_margin": None,
            "data_complete": False,
        }
    
    # Get cost - requires external data source in production
    if cost_per_ha is None:
        logger.warning(
            f"Production cost not provided for {crop_id}. "
            "Please configure cost data source."
        )
        cost_per_ha = 0  # Will show gross revenue only
    
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
        "data_complete": True,
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
        Risk assessment dictionary
    """
    price_model = get_price_model()
    
    # Get price risk (returns "unknown" if model not loaded)
    price_risk = price_model.get_risk_band(crop_id)
    
    # Assess water risk from features
    water_coverage = features.get("water_coverage_ratio")
    water_sensitivity = features.get("water_sensitivity", "medium")
    
    if water_coverage is None:
        water_risk = "unknown"
    elif water_coverage < 0.7:
        if water_sensitivity == "high":
            water_risk = "high"
        else:
            water_risk = "medium"
    elif water_coverage < 0.9 and water_sensitivity == "high":
        water_risk = "medium"
    else:
        water_risk = "low"
    
    # Combine risks
    risk_scores = {"low": 1, "medium": 2, "high": 3, "unknown": 2}
    avg_risk = (risk_scores.get(price_risk, 2) + risk_scores.get(water_risk, 2)) / 2
    
    if avg_risk <= 1.5:
        overall_risk = "low"
    elif avg_risk <= 2.5:
        overall_risk = "medium"
    else:
        overall_risk = "high"
    
    # If both risks are unknown, overall is unknown
    if price_risk == "unknown" and water_risk == "unknown":
        overall_risk = "unknown"
    
    # Identify specific factors
    factors = []
    if price_risk == "unknown":
        factors.append("Price risk data not available - price model not loaded")
    elif price_risk == "high":
        factors.append("High price volatility - market prices fluctuate significantly")
    
    if water_risk == "unknown":
        factors.append("Water risk data not available - climate data missing")
    elif water_risk != "low":
        factors.append(f"Water availability concern - coverage at {(water_coverage or 0):.0%}")
    
    if water_sensitivity == "high":
        factors.append("Crop is sensitive to water stress")
    
    if not factors:
        factors.append("Insufficient data to assess risk factors")
    
    return {
        "overall_risk": overall_risk,
        "price_risk": price_risk,
        "water_risk": water_risk,
        "factors": factors,
        "data_complete": price_risk != "unknown" and water_risk != "unknown",
    }

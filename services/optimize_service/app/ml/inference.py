"""
ML Inference Module - Enhanced with Full Model Integration

This module orchestrates all ML models for the F4 ACAO service:
- Fuzzy-TOPSIS for suitability scoring
- Yield prediction (rule-based heuristic)
- Price prediction (LightGBM with 24 features)
- Crop recommendation (Random Forest)

Combines predictions to generate comprehensive crop recommendations.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from app.ml.yield_model import get_yield_model
from app.ml.price_model import get_price_model
from app.ml.crop_recommendation_model import get_crop_recommendation_model
from app.ml.suitability_fuzzy_topsis import compute_fuzzy_topsis_scores

logger = logging.getLogger(__name__)


def generate_crop_recommendations(
    field_id: str,
    field_features: Dict[str, Any],
    candidate_crops: List[Dict[str, Any]],
    top_n: int = 3
) -> List[Dict[str, Any]]:
    """
    Generate comprehensive crop recommendations for a field.

    This is the main orchestration function that combines all ML models.

    Args:
        field_id: Field identifier
        field_features: Field characteristics (soil, location, etc.)
        candidate_crops: List of crops to evaluate, each with:
            - crop_id
            - crop_name
            - water_sensitivity
            - growth_duration_days
            - (other crop properties)
        top_n: Number of top recommendations to return

    Returns:
        List of recommendation dicts with:
            - crop_id
            - crop_name
            - rank (1, 2, 3...)
            - suitability_score (0-1)
            - predicted_yield_t_ha
            - predicted_price_per_kg
            - gross_revenue_per_ha
            - profit_per_ha
            - risk_level
    """
    logger.info(f"Generating recommendations for field {field_id} with {len(candidate_crops)} candidates")

    if not candidate_crops:
        logger.warning("No candidate crops provided")
        return []

    # Step 1: Build feature vectors for all crops
    features_per_crop = {}
    crop_lookup = {}

    for crop in candidate_crops:
        crop_id = crop.get('crop_id', crop.get('id'))
        crop_name = crop.get('crop_name', crop.get('name', 'Unknown'))

        # Build feature vector for this crop
        features = build_crop_features(field_features, crop)
        features_per_crop[crop_id] = features
        crop_lookup[crop_id] = crop

    # Step 2: Compute suitability scores (Fuzzy-TOPSIS)
    logger.info("Computing Fuzzy-TOPSIS suitability scores...")
    suitability_scores = compute_fuzzy_topsis_scores(features_per_crop)

    # Step 3: Predict yields for all crops
    logger.info("Predicting yields...")
    yield_predictions = predict_yield_for_candidates(field_id, features_per_crop)

    # Step 4: Predict prices for all crops
    logger.info("Predicting prices...")
    crop_names = {cid: crop_lookup[cid].get('crop_name', crop_lookup[cid].get('name', 'Unknown'))
                  for cid in features_per_crop.keys()}
    price_predictions = predict_price_for_candidates_enhanced(crop_names, field_features)

    # Step 5: Calculate profitability
    logger.info("Computing profitability...")
    profitability_data = {}
    for crop_id in features_per_crop.keys():
        yield_val = yield_predictions.get(crop_id)
        price_val = price_predictions.get(crop_id)

        profitability = compute_profitability(
            crop_id=crop_id,
            yield_t_per_ha=yield_val,
            price_per_kg=price_val
        )
        profitability_data[crop_id] = profitability

    # Step 6: Combine all predictions into recommendations
    recommendations = []
    for crop_id, crop in crop_lookup.items():
        rec = {
            'crop_id': crop_id,
            'crop_name': crop.get('crop_name', crop.get('name', 'Unknown')),
            'suitability_score': round(suitability_scores.get(crop_id, 0.5), 3),
            'predicted_yield_t_ha': yield_predictions.get(crop_id),
            'predicted_price_per_kg': price_predictions.get(crop_id),
            'gross_revenue_per_ha': profitability_data[crop_id].get('gross_revenue_per_ha'),
            'profit_per_ha': profitability_data[crop_id].get('profit_per_ha'),
            'risk_level': get_risk_level(profitability_data[crop_id]),
            'water_sensitivity': crop.get('water_sensitivity', 'medium'),
            'growth_duration_days': crop.get('growth_duration_days', 120)
        }
        recommendations.append(rec)

    # Step 7: Rank by combined score (suitability + profitability)
    recommendations = rank_recommendations(recommendations)

    # Step 8: Add rank numbers and return top N
    for i, rec in enumerate(recommendations[:top_n]):
        rec['rank'] = i + 1

    logger.info(f"Generated {len(recommendations[:top_n])} recommendations for field {field_id}")
    return recommendations[:top_n]


def build_crop_features(
    field_features: Dict[str, Any],
    crop: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Build feature vector combining field and crop characteristics.

    Args:
        field_features: Field properties (soil, location, water, etc.)
        crop: Crop properties

    Returns:
        Combined feature dict for ML models
    """
    features = {
        # From field
        'soil_suitability': field_features.get('soil_suitability', 0.7),
        'water_coverage_ratio': field_features.get('water_coverage_ratio', 0.8),
        'soil_ph': field_features.get('soil_ph', 6.5),
        'soil_ec': field_features.get('soil_ec', 1.0),
        'season_avg_temp': field_features.get('season_avg_temp', 28.0),
        'season_rainfall_mm': field_features.get('season_rainfall_mm', 250.0),

        # From crop
        'growth_duration_days': crop.get('growth_duration_days', 120),
        'water_sensitivity': crop.get('water_sensitivity', 'medium'),

        # Historical data (if available)
        'historical_yield_t_ha': field_features.get('historical_yield_avg', 4.0),

        # Spatial
        'latitude': field_features.get('latitude', 7.8731),
        'longitude': field_features.get('longitude', 80.7718),
        'elevation': field_features.get('elevation', 300.0),
    }

    return features


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
    """
    logger.info(f"Predicting yields for {len(features_per_crop)} crops in {field_id}")

    model = get_yield_model()
    predictions: Dict[str, Optional[float]] = {}

    if not model.model_loaded:
        logger.error("Yield model not loaded. Using default fallback.")
        # Fallback to reasonable defaults
        return {crop_id: 4.5 for crop_id in features_per_crop.keys()}

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
            predictions[crop_id] = 4.5  # Default fallback

    return predictions


def predict_price_for_candidates_enhanced(
    crop_names: Dict[str, str],
    field_features: Dict[str, Any],
    season: str = None,
) -> Dict[str, Optional[float]]:
    """
    Predict prices for all candidate crops using enhanced price model.

    Args:
        crop_names: Dictionary mapping crop_id to crop_name
        field_features: Field features (for location, etc.)
        season: Growing season

    Returns:
        Dictionary mapping crop_id to predicted price (per kg)
    """
    logger.info(f"Predicting prices for {len(crop_names)} crops")

    model = get_price_model()
    predictions: Dict[str, Optional[float]] = {}

    if not model.model_loaded:
        logger.error("Price model not loaded. Using default fallback prices.")
        # Fallback to reasonable defaults (Rs/kg)
        return {crop_id: 50.0 for crop_id in crop_names.keys()}

    # Extract location from field features
    location = field_features.get('location', 'Kandy')

    for crop_id, crop_name in crop_names.items():
        try:
            price = model.predict(
                crop_id=crop_id,
                crop_name=crop_name,
                location=location,
                season=season,
                field_data={
                    'latitude': field_features.get('latitude', 7.8731),
                    'longitude': field_features.get('longitude', 80.7718),
                    'elevation': field_features.get('elevation', 300.0)
                }
            )
            predictions[crop_id] = price
        except Exception as e:
            logger.error(f"Price prediction failed for {crop_id}: {e}")
            predictions[crop_id] = 50.0  # Default fallback

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
        crop_id: Crop identifier
        yield_t_per_ha: Expected yield in tonnes/ha
        price_per_kg: Expected price per kg
        cost_per_ha: Optional production cost per ha

    Returns:
        Dictionary with profitability metrics
    """
    # If yield or price is missing, cannot calculate profitability
    if yield_t_per_ha is None or price_per_kg is None:
        return {
            "gross_revenue_per_ha": None,
            "cost_per_ha": cost_per_ha,
            "profit_per_ha": None,
            "profit_margin": None,
            "data_complete": False,
        }

    # Default production cost estimates (Rs/ha) if not provided
    if cost_per_ha is None:
        # Rough estimates for Sri Lankan agriculture
        default_costs = {
            'rice': 150000,
            'vegetable': 100000,
            'default': 120000
        }
        # Simple lookup - in production, should use database
        cost_per_ha = default_costs.get('default', 120000)

    # Calculate revenue (yield in tonnes → kg, multiply by price)
    yield_kg = yield_t_per_ha * 1000
    gross_revenue = yield_kg * price_per_kg

    # Calculate profit
    profit = gross_revenue - cost_per_ha

    # Calculate profit margin
    profit_margin = (profit / gross_revenue * 100) if gross_revenue > 0 else 0

    return {
        "gross_revenue_per_ha": round(gross_revenue, 2),
        "cost_per_ha": round(cost_per_ha, 2),
        "profit_per_ha": round(profit, 2),
        "profit_margin": round(profit_margin, 2),
        "data_complete": True,
    }


def get_risk_level(profitability: Dict[str, Any]) -> str:
    """
    Determine risk level based on profitability metrics.

    Args:
        profitability: Profitability dict from compute_profitability()

    Returns:
        Risk level: 'low', 'medium', 'high', or 'unknown'
    """
    if not profitability.get('data_complete', False):
        return 'unknown'

    profit_margin = profitability.get('profit_margin', 0)

    if profit_margin >= 40:
        return 'low'
    elif profit_margin >= 20:
        return 'medium'
    else:
        return 'high'


def rank_recommendations(recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank recommendations by combined score.

    Combines suitability score and profitability into a weighted ranking.

    Args:
        recommendations: List of recommendation dicts

    Returns:
        Sorted list (best first)
    """
    def get_combined_score(rec):
        # Normalize profit to 0-1 scale (assume max profit ~500k Rs/ha)
        profit = rec.get('profit_per_ha', 0) or 0
        profit_normalized = min(1.0, max(0.0, profit / 500000))

        # Combine: 60% profitability, 40% suitability
        suitability = rec.get('suitability_score', 0.5)
        combined = 0.6 * profit_normalized + 0.4 * suitability

        return combined

    # Sort by combined score (descending)
    sorted_recs = sorted(recommendations, key=get_combined_score, reverse=True)

    return sorted_recs


def get_risk_assessment(crop_id: str, features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assess risk level for a crop based on its features.

    Args:
        crop_id: Crop identifier
        features: Feature dict with crop/field properties

    Returns:
        Dictionary with risk assessment including:
            - water_risk: Risk related to water availability
            - climate_risk: Risk related to climate variability
            - market_risk: Risk related to price volatility
            - overall_risk: Combined risk level (low/medium/high/unknown)
    """
    # Water risk assessment
    water_coverage = features.get('water_coverage_ratio', 0.8)
    water_sensitivity = features.get('water_sensitivity', 'medium')

    if water_coverage >= 0.95 and water_sensitivity in ['low', 0.0]:
        water_risk = 'low'
    elif water_coverage >= 0.8 and water_sensitivity != 'high':
        water_risk = 'medium'
    else:
        water_risk = 'high'

    # Climate risk assessment (based on growth duration and weather variability)
    growth_duration = features.get('growth_duration_days', 120)
    season_rainfall = features.get('season_rainfall_mm', 250.0)

    if growth_duration <= 90 and 200 <= season_rainfall <= 400:
        climate_risk = 'low'
    elif growth_duration <= 150:
        climate_risk = 'medium'
    else:
        climate_risk = 'high'

    # Market risk (simplified - would need price volatility data in production)
    # For now, assume medium risk for all
    market_risk = 'medium'

    # Overall risk (worst case among categories)
    risk_levels = {'low': 1, 'medium': 2, 'high': 3, 'unknown': 0}
    max_risk_value = max(
        risk_levels.get(water_risk, 0),
        risk_levels.get(climate_risk, 0),
        risk_levels.get(market_risk, 0)
    )

    risk_mapping = {0: 'unknown', 1: 'low', 2: 'medium', 3: 'high'}
    overall_risk = risk_mapping.get(max_risk_value, 'unknown')

    return {
        'water_risk': water_risk,
        'climate_risk': climate_risk,
        'market_risk': market_risk,
        'overall_risk': overall_risk,
    }


# Legacy compatibility functions

def predict_price_for_candidates(
    crop_ids: List[str],
    season: str = None,
) -> Dict[str, Optional[float]]:
    """
    Legacy function - predicts prices without enhanced features.

    Args:
        crop_ids: List of crop identifiers
        season: Growing season

    Returns:
        Dictionary mapping crop_id to predicted price
    """
    model = get_price_model()

    if not model.model_loaded:
        logger.error("Price model not loaded")
        return {crop_id: 50.0 for crop_id in crop_ids}

    predictions = {}
    for crop_id in crop_ids:
        try:
            price = model.predict(crop_id=crop_id, season=season)
            predictions[crop_id] = price
        except Exception as e:
            logger.error(f"Price prediction failed for {crop_id}: {e}")
            predictions[crop_id] = 50.0

    return predictions

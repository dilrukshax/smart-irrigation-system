"""
Adaptive Recommendation Routes

This module provides the adaptive recommendation endpoint that allows users
to toggle and adjust all input parameters that affect ML model outputs.

Features:
- Full parameter control (field, weather, water, market, crop filters)
- What-if scenario analysis
- Real-time recalculation based on adjusted parameters
- Transparent input/output for verification
"""

import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.schemas import (
    AdaptiveRecommendationRequest,
    AdaptiveRecommendationResponse,
    AdaptiveCropRecommendation,
    InputParameterSummary,
    FieldParameters,
    WeatherParameters,
    WaterParameters,
    MarketParameters,
)
from app.core.config import get_settings
from app.core.contracts import build_contract
from app.data.db import get_db
from app.data.repositories import CropRepository, RunArtifactRepository
from app.dependencies.auth import get_current_user_context
from app.ml.suitability_fuzzy_topsis import compute_fuzzy_topsis_scores
from app.ml.yield_model import get_yield_model
from app.ml.price_model import get_price_model
from app.ml.crop_recommendation_model import get_crop_recommendation_model

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(
    prefix="/f4/adaptive",
    tags=["adaptive-recommendations"],
)


def load_crops_from_db(db_session: Session) -> List[Dict[str, Any]]:
    """Load crop catalog from persisted database rows."""
    crops = CropRepository.list_candidate_crops(db_session)
    result: List[Dict[str, Any]] = []
    for crop in crops:
        result.append(
            {
                "crop_id": crop.get("id", ""),
                "crop_name": crop.get("name", ""),
                "water_sensitivity": crop.get("water_sensitivity", "medium"),
                "growth_duration_days": int(crop.get("growth_duration_days") or 120),
                "typical_yield_t_ha": float(crop.get("base_yield_t_per_ha") or 5.0),
                "water_requirement_mm": float(crop.get("water_requirement_mm") or 500.0),
            }
        )
    return result


def filter_crops(
    crops: List[Dict[str, Any]],
    crop_ids: Optional[List[str]] = None,
    water_sensitivity_filter: Optional[str] = None,
    max_growth_duration: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Apply filters to crop list."""
    filtered = crops.copy()
    
    if crop_ids:
        filtered = [c for c in filtered if c['crop_id'] in crop_ids]
    
    if water_sensitivity_filter:
        filtered = [c for c in filtered if c['water_sensitivity'] == water_sensitivity_filter]
    
    if max_growth_duration:
        filtered = [c for c in filtered if c['growth_duration_days'] <= max_growth_duration]
    
    return filtered


def build_feature_vector(
    field_params: FieldParameters,
    weather_params: WeatherParameters,
    water_params: WaterParameters,
    crop: Dict[str, Any],
    historical_yield: Optional[float] = None,
) -> Dict[str, Any]:
    """Build feature vector from parameters for ML models."""
    return {
        # Field features
        'soil_suitability': field_params.soil_suitability,
        'soil_ph': field_params.soil_ph,
        'soil_ec': field_params.soil_ec,
        'latitude': field_params.latitude,
        'longitude': field_params.longitude,
        'elevation': field_params.elevation,
        
        # Weather features
        'season_avg_temp': weather_params.season_avg_temp,
        'season_rainfall_mm': weather_params.season_rainfall_mm,
        'temp_mean_weekly': weather_params.temp_mean_weekly,
        'temp_range_weekly': weather_params.temp_range_weekly,
        'precip_weekly_sum': weather_params.precip_weekly_sum,
        'radiation_weekly_sum': weather_params.radiation_weekly_sum,
        'et0_weekly_sum': weather_params.et0_weekly_sum,
        'humidity': weather_params.humidity,
        
        # Water features
        'water_coverage_ratio': water_params.water_coverage_ratio,
        'water_availability_mm': water_params.water_availability_mm,
        'irrigation_efficiency': water_params.irrigation_efficiency,
        
        # Crop features
        'growth_duration_days': crop['growth_duration_days'],
        'water_sensitivity': crop['water_sensitivity'],
        'water_requirement_mm': crop['water_requirement_mm'],
        
        # Historical
        'historical_yield_avg': historical_yield or crop['typical_yield_t_ha'],
    }


def calculate_suitability(
    features: Dict[str, Any],
    water_params: WaterParameters,
) -> float:
    """Calculate crop suitability score using simplified Fuzzy-TOPSIS."""
    # Soil suitability factor (25%)
    soil_score = features['soil_suitability']
    
    # pH penalty (optimal 6.0-7.0)
    ph = features['soil_ph']
    if 6.0 <= ph <= 7.0:
        ph_score = 1.0
    elif 5.5 <= ph < 6.0 or 7.0 < ph <= 7.5:
        ph_score = 0.85
    else:
        ph_score = 0.6
    
    # Water availability score (25%)
    water_req = features['water_requirement_mm']
    water_avail = features['water_availability_mm']
    water_score = min(1.0, water_avail / (water_req * 1.5)) if water_req > 0 else 0.5
    
    # Temperature suitability (20%)
    temp = features['season_avg_temp']
    if 25 <= temp <= 30:
        temp_score = 1.0
    elif 20 <= temp < 25 or 30 < temp <= 35:
        temp_score = 0.8
    else:
        temp_score = 0.5
    
    # Rainfall adequacy (15%)
    rainfall = features['season_rainfall_mm']
    if 200 <= rainfall <= 400:
        rain_score = 1.0
    elif 100 <= rainfall < 200 or 400 < rainfall <= 600:
        rain_score = 0.75
    else:
        rain_score = 0.5
    
    # Water sensitivity penalty (15%)
    sensitivity = features['water_sensitivity']
    water_ratio = water_params.water_coverage_ratio
    if sensitivity == 'high' and water_ratio < 0.7:
        sens_score = 0.5
    elif sensitivity == 'medium' and water_ratio < 0.5:
        sens_score = 0.6
    else:
        sens_score = 1.0
    
    # Weighted average
    suitability = (
        0.25 * soil_score * ph_score +
        0.25 * water_score +
        0.20 * temp_score +
        0.15 * rain_score +
        0.15 * sens_score
    )
    
    return round(min(1.0, max(0.0, suitability)), 3)


def predict_yield(
    features: Dict[str, Any],
    crop: Dict[str, Any],
) -> float:
    """Predict yield using rule-based heuristic."""
    base_yield = crop['typical_yield_t_ha']
    
    # Soil factor
    soil_factor = features['soil_suitability'] * 0.8 + 0.2
    
    # Water factor
    water_coverage = features['water_coverage_ratio']
    water_factor = 0.5 + 0.5 * water_coverage
    
    # Temperature factor (optimal 25-30°C)
    temp = features['season_avg_temp']
    if 25 <= temp <= 30:
        temp_factor = 1.0
    else:
        temp_factor = 1.0 - abs(temp - 27.5) * 0.03
    
    # Duration factor
    duration = features['growth_duration_days']
    duration_factor = min(1.2, 0.8 + duration / 600)
    
    # Combined yield
    predicted_yield = base_yield * soil_factor * water_factor * temp_factor * duration_factor
    
    return round(max(0.5, min(50.0, predicted_yield)), 2)


def predict_price(
    crop: Dict[str, Any],
    market_params: MarketParameters,
    weather_params: WeatherParameters,
) -> float:
    """Predict market price based on crop and market conditions."""
    # Base prices per crop type (Rs/kg)
    base_prices = {
        'Paddy': 45, 'Tomato': 85, 'Onion': 65, 'Cabbage': 40,
        'Chili': 180, 'Potato': 55, 'Carrot': 70, 'Beans': 90,
        'Eggplant': 75, 'Cucumber': 50, 'Pumpkin': 35, 'Bitter Gourd': 95,
        'Okra': 80, 'Radish': 45, 'Beetroot': 60, 'Sweet Corn': 70,
        'Cowpea': 120, 'Green Gram': 150, 'Banana': 65, 'Papaya': 55,
        'Pineapple': 80, 'Mango': 120, 'Coconut': 45, 'Tea': 350,
        'Rubber': 280, 'Sugarcane': 8, 'Maize': 35, 'Soybean': 110,
        'Groundnut': 130, 'Sesame': 200,
    }
    
    # Get base price
    crop_name = crop['crop_name'].split(' (')[0]  # Remove variety info
    base_price = base_prices.get(crop_name, 60.0)
    
    # Apply market factor
    price = base_price * market_params.price_factor
    
    # Demand adjustment
    demand_factors = {'low': 0.85, 'normal': 1.0, 'high': 1.2}
    price *= demand_factors.get(market_params.demand_level, 1.0)
    
    # Deterministic volatility penalty/bonus (no inference-time randomness).
    volatility_factor = {'low': 1.02, 'medium': 1.0, 'high': 0.95}
    price *= volatility_factor.get(market_params.price_volatility, 1.0)
    
    # Weather impact on price
    rainfall = weather_params.season_rainfall_mm
    if rainfall < 150:
        price *= 1.15  # Drought increases prices
    elif rainfall > 500:
        price *= 0.9  # Flooding decreases prices
    
    return round(max(5.0, price), 2)


def calculate_risk(
    features: Dict[str, Any],
    crop: Dict[str, Any],
    weather_params: WeatherParameters,
    water_params: WaterParameters,
    market_params: MarketParameters,
) -> tuple[str, List[str]]:
    """Calculate risk level and identify risk factors."""
    risk_factors = []
    risk_score = 0
    
    # Water risk
    if features['water_sensitivity'] == 'high' and water_params.water_coverage_ratio < 0.7:
        risk_factors.append("High water sensitivity with limited water")
        risk_score += 2
    
    if water_params.water_availability_mm < crop['water_requirement_mm']:
        risk_factors.append("Water availability below requirement")
        risk_score += 2
    
    # Climate risk
    temp = weather_params.season_avg_temp
    if temp < 20 or temp > 35:
        risk_factors.append(f"Suboptimal temperature ({temp}°C)")
        risk_score += 1
    
    rainfall = weather_params.season_rainfall_mm
    if rainfall < 100:
        risk_factors.append("Low rainfall expected")
        risk_score += 2
    elif rainfall > 600:
        risk_factors.append("Flood risk from excessive rainfall")
        risk_score += 1
    
    # Market risk
    if market_params.price_volatility == 'high':
        risk_factors.append("High market price volatility")
        risk_score += 1
    
    # Soil risk
    if features['soil_suitability'] < 0.6:
        risk_factors.append("Low soil suitability")
        risk_score += 1
    
    ph = features['soil_ph']
    if ph < 5.5 or ph > 7.5:
        risk_factors.append(f"Soil pH outside optimal range ({ph})")
        risk_score += 1
    
    # Long duration risk
    if crop['growth_duration_days'] > 180:
        risk_factors.append("Long growing season increases exposure")
        risk_score += 1
    
    # Determine risk level
    if risk_score <= 1:
        risk_level = "low"
    elif risk_score <= 3:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    return risk_level, risk_factors


def estimate_production_cost(
    crop: Dict[str, Any],
    field_params: FieldParameters,
    water_params: WaterParameters,
) -> float:
    """Estimate production cost per hectare."""
    # Base costs per hectare (Rs)
    base_costs = {
        'low': 80000,    # Low-maintenance crops
        'medium': 120000, # Medium-maintenance crops
        'high': 180000,   # High-maintenance crops
    }
    
    sensitivity = crop['water_sensitivity']
    base_cost = base_costs.get(sensitivity, 120000)
    
    # Adjust for water costs
    water_cost = crop['water_requirement_mm'] * 15  # Rs 15 per mm
    if water_params.irrigation_efficiency < 0.7:
        water_cost *= 1.3  # Inefficient irrigation costs more
    
    # Adjust for duration
    duration_factor = crop['growth_duration_days'] / 120
    
    # Total cost
    total_cost = (base_cost * duration_factor) + water_cost
    
    return round(total_cost, 0)


@router.post("", response_model=AdaptiveRecommendationResponse)
@router.post("/", response_model=AdaptiveRecommendationResponse)
async def get_adaptive_recommendations(
    request: AdaptiveRecommendationRequest,
    db: Session = Depends(get_db),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
) -> AdaptiveRecommendationResponse:
    """
    Get adaptive crop recommendations with fully adjustable parameters.
    
    This endpoint allows users to toggle and adjust ALL input parameters
    that affect the ML model outputs, enabling:
    - What-if scenario analysis
    - Parameter sensitivity testing
    - Custom field condition simulation
    - Market condition adjustment
    
    All parameters have sensible defaults based on Sri Lankan agriculture.
    
    Args:
        request: AdaptiveRecommendationRequest with all adjustable parameters
    
    Returns:
        AdaptiveRecommendationResponse with ranked recommendations and metadata
    """
    del user_context
    start_time = time.time()
    observed_at_dt = datetime.utcnow()
    observed_at = observed_at_dt.isoformat()

    def _input_summary(crops_evaluated: int) -> InputParameterSummary:
        return InputParameterSummary(
            field_area_ha=request.field_params.area_ha,
            soil_ph=request.field_params.soil_ph,
            soil_suitability=request.field_params.soil_suitability,
            water_availability_mm=request.water_params.water_availability_mm,
            water_quota_mm=request.water_params.water_quota_mm,
            season_avg_temp=request.weather_params.season_avg_temp,
            season_rainfall_mm=request.weather_params.season_rainfall_mm,
            location=request.field_params.location,
            season=request.season,
            price_factor=request.market_params.price_factor,
            crops_evaluated=crops_evaluated,
        )

    def _response(
        *,
        success: bool,
        raw_status: str,
        message: str,
        recommendations: List[AdaptiveCropRecommendation],
        crops_evaluated: int,
        average_suitability: float = 0.0,
        best_profit_per_ha: float = 0.0,
        models_used: Optional[List[str]] = None,
    ) -> AdaptiveRecommendationResponse:
        contract = build_contract(
            source="optimization_service",
            observed_at=observed_at,
            data_available=bool(recommendations),
            raw_status=raw_status,
            message=message,
        )
        response = AdaptiveRecommendationResponse(
            success=success,
            message=message,
            input_summary=_input_summary(crops_evaluated),
            recommendations=recommendations,
            total_crops_evaluated=crops_evaluated,
            average_suitability=round(average_suitability, 3),
            best_profit_per_ha=best_profit_per_ha,
            models_used=models_used or [],
            processing_time_ms=round((time.time() - start_time) * 1000, 1),
            **contract,
        )
        RunArtifactRepository.save_artifact(
            db,
            run_type="adaptive",
            field_id=request.field_params.field_id,
            season=request.season,
            request_payload=request.model_dump(),
            response_payload=response.model_dump(),
            status=response.status,
            source=response.source,
            data_available=response.data_available,
            observed_at=observed_at_dt,
        )
        return response

    logger.info(f"Received adaptive recommendation request for season={request.season}")
    all_crops = load_crops_from_db(db)
    if not all_crops:
        return _response(
            success=False,
            raw_status="data_unavailable",
            message="Crop catalog is not available in persistent storage.",
            recommendations=[],
            crops_evaluated=0,
        )

    filtered_crops = filter_crops(
        crops=all_crops,
        crop_ids=request.crop_filters.crop_ids,
        water_sensitivity_filter=request.crop_filters.water_sensitivity_filter,
        max_growth_duration=request.crop_filters.max_growth_duration_days,
    )
    if not filtered_crops:
        return _response(
            success=False,
            raw_status="data_unavailable",
            message="No crops match the specified filters.",
            recommendations=[],
            crops_evaluated=0,
        )

    yield_model = get_yield_model()
    price_model = get_price_model()
    crop_model = get_crop_recommendation_model()

    yield_ml_ready = bool(getattr(yield_model, "_model", None) is not None and not yield_model.use_heuristic)
    price_ml_ready = bool(price_model.model_loaded)
    crop_ml_ready = bool(crop_model.model_loaded)

    missing_models: List[str] = []
    if not yield_ml_ready:
        missing_models.append("yield_model")
    if not price_ml_ready:
        missing_models.append("price_prediction_lgb")
    if not crop_ml_ready:
        missing_models.append("crop_recommendation_rf")

    if settings.is_ml_only_mode and missing_models:
        return _response(
            success=False,
            raw_status="source_unavailable",
            message=f"ML-only mode requires all adaptive ML models. Missing: {', '.join(missing_models)}.",
            recommendations=[],
            crops_evaluated=len(filtered_crops),
        )

    logger.info(f"Evaluating %s crops after filtering", len(filtered_crops))

    # Compute suitability using Fuzzy-TOPSIS for all candidates.
    features_by_crop: Dict[str, Dict[str, Any]] = {}
    built_features: Dict[str, Dict[str, Any]] = {}
    for crop in filtered_crops:
        features = build_feature_vector(
            field_params=request.field_params,
            weather_params=request.weather_params,
            water_params=request.water_params,
            crop=crop,
            historical_yield=request.historical_yield_avg,
        )
        built_features[crop["crop_id"]] = features
        features_by_crop[crop["crop_id"]] = {
            "soil_suitability": features.get("soil_suitability", 0.0),
            "water_coverage_ratio": features.get("water_coverage_ratio", 0.0),
            "historical_yield_t_ha": features.get("historical_yield_avg", crop.get("typical_yield_t_ha", 0.0)),
            "water_sensitivity": crop.get("water_sensitivity", "medium"),
            "growth_duration_days": crop.get("growth_duration_days", 120),
        }

    suitability_scores = compute_fuzzy_topsis_scores(features_by_crop)
    if not suitability_scores:
        return _response(
            success=False,
            raw_status="source_unavailable",
            message="Suitability model could not score candidates.",
            recommendations=[],
            crops_evaluated=len(filtered_crops),
        )

    recommendations_raw = []
    for crop in filtered_crops:
        crop_id = crop["crop_id"]
        features = built_features[crop_id]
        suitability = float(suitability_scores.get(crop_id, 0.0))

        predicted_yield: Optional[float]
        if yield_ml_ready:
            predicted_yield = yield_model.predict(
                field_id=request.field_params.field_id or "adaptive-field",
                crop_id=crop_id,
                features=features,
            )
        else:
            predicted_yield = None if settings.is_ml_only_mode else predict_yield(features, crop)

        predicted_price: Optional[float]
        if price_ml_ready:
            predicted_price = price_model.predict(
                crop_id=crop_id,
                crop_name=crop.get("crop_name"),
                location=request.field_params.location,
                season=request.season,
                weather_data={
                    "temp_mean": request.weather_params.temp_mean_weekly,
                    "precip_sum": request.weather_params.precip_weekly_sum,
                    "radiation_sum": request.weather_params.radiation_weekly_sum,
                    "et0_sum": request.weather_params.et0_weekly_sum,
                    "temp_range": request.weather_params.temp_range_weekly,
                },
                field_data={
                    "latitude": request.field_params.latitude,
                    "longitude": request.field_params.longitude,
                    "elevation": request.field_params.elevation,
                },
            )
        else:
            predicted_price = None if settings.is_ml_only_mode else predict_price(
                crop=crop,
                market_params=request.market_params,
                weather_params=request.weather_params,
            )

        if settings.is_ml_only_mode and (predicted_yield is None or predicted_price is None):
            continue
        if predicted_yield is None or predicted_price is None:
            continue

        climate_score = min(1.0, max(0.0, (request.weather_params.season_avg_temp - 10.0) / 35.0))
        water_sensitivity_encoded = {"low": 0.0, "medium": 1.0, "high": 2.0}.get(
            str(crop.get("water_sensitivity", "medium")).lower(),
            1.0,
        )
        soil_type_encoded = {
            "clay": 0.0,
            "clay loam": 1.0,
            "loam": 2.0,
            "sandy loam": 3.0,
            "sandy clay": 4.0,
            "silty loam": 5.0,
            "red loam": 6.0,
        }.get(str(request.field_params.soil_type).lower(), 2.0)
        season_encoded = 0.0 if "maha" in request.season.lower() else 1.0
        terrain_type_encoded = 0.0 if request.field_params.elevation < 200 else (1.0 if request.field_params.elevation < 600 else 2.0)

        classifier_vector = np.array([
            features.get("soil_suitability", 0.0),
            features.get("water_coverage_ratio", 0.0),
            features.get("soil_ph", 6.5),
            features.get("soil_ec", 1.0),
            features.get("season_avg_temp", 28.0),
            features.get("season_rainfall_mm", 250.0),
            float(crop.get("growth_duration_days", 120)),
            climate_score,
            0.0,  # price_zscore unavailable in this endpoint context
            features.get("historical_yield_avg", crop.get("typical_yield_t_ha", 0.0)),
            water_sensitivity_encoded,
            terrain_type_encoded,
            soil_type_encoded,
            season_encoded,
            request.field_params.latitude,
            request.field_params.longitude,
        ], dtype=float)
        crop_classifier_confidence = 0.75
        if crop_ml_ready:
            _, crop_classifier_confidence = crop_model.predict_single(classifier_vector)

        gross_revenue = float(predicted_yield) * 1000.0 * float(predicted_price)
        production_cost = estimate_production_cost(
            crop=crop,
            field_params=request.field_params,
            water_params=request.water_params,
        )
        profit = gross_revenue - production_cost
        roi = (profit / production_cost * 100) if production_cost > 0 else 0

        risk_level, risk_factors = calculate_risk(
            features=features,
            crop=crop,
            weather_params=request.weather_params,
            water_params=request.water_params,
            market_params=request.market_params,
        )

        if request.crop_filters.min_profit_per_ha and profit < request.crop_filters.min_profit_per_ha:
            continue
        if request.crop_filters.max_risk_level:
            risk_order = {'low': 1, 'medium': 2, 'high': 3}
            if risk_order.get(risk_level, 3) > risk_order.get(request.crop_filters.max_risk_level, 3):
                continue

        combined_score = (
            request.suitability_weight * suitability +
            request.profitability_weight * min(1.0, profit / 500000.0)
        )

        recommendations_raw.append({
            'crop': crop,
            'suitability': suitability,
            'combined_score': combined_score,
            'predicted_yield': float(predicted_yield),
            'predicted_price': float(predicted_price),
            'gross_revenue': gross_revenue,
            'production_cost': production_cost,
            'profit': profit,
            'roi': roi,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'model_confidence': float(crop_classifier_confidence),
        })
    
    # Sort by combined score
    recommendations_raw.sort(key=lambda x: x['combined_score'], reverse=True)
    
    # Take top N
    top_n = min(request.top_n, len(recommendations_raw))
    top_recommendations = recommendations_raw[:top_n]
    
    # Build response recommendations
    recommendations = []
    for idx, rec in enumerate(top_recommendations):
        crop = rec['crop']
        
        # Generate rationale
        rationale_parts = []
        if rec['suitability'] > 0.7:
            rationale_parts.append("High soil and climate suitability")
        elif rec['suitability'] > 0.5:
            rationale_parts.append("Moderate suitability for conditions")
        
        if rec['profit'] > 200000:
            rationale_parts.append(f"Strong profit potential (Rs {rec['profit']/1000:.0f}K/ha)")
        
        if rec['risk_level'] == 'low':
            rationale_parts.append("Low risk profile")
        
        rationale = ". ".join(rationale_parts) if rationale_parts else "Meets basic criteria for cultivation"
        
        recommendations.append(AdaptiveCropRecommendation(
            rank=idx + 1,
            crop_id=crop['crop_id'],
            crop_name=crop['crop_name'],
            suitability_score=rec['suitability'],
            combined_score=round(rec['combined_score'], 3),
            predicted_yield_t_ha=rec['predicted_yield'],
            predicted_price_per_kg=rec['predicted_price'],
            gross_revenue_per_ha=round(rec['gross_revenue'], 0),
            estimated_cost_per_ha=rec['production_cost'],
            profit_per_ha=round(rec['profit'], 0),
            roi_percentage=round(rec['roi'], 1),
            risk_level=rec['risk_level'],
            risk_factors=rec['risk_factors'],
            water_requirement_mm=crop['water_requirement_mm'],
            growth_duration_days=crop['growth_duration_days'],
            water_sensitivity=crop['water_sensitivity'],
            rationale=rationale,
            confidence=round(float(rec.get("model_confidence", 0.75)), 3),
        ))
    
    # Calculate aggregates
    avg_suitability = sum(r.suitability_score for r in recommendations) / len(recommendations) if recommendations else 0
    best_profit = max(r.profit_per_ha for r in recommendations) if recommendations else 0
    
    logger.info(
        "Generated %s adaptive recommendations in %.0fms",
        len(recommendations),
        (time.time() - start_time) * 1000,
    )

    models_used = [
            "Fuzzy-TOPSIS (Suitability)",
            "Yield Model (ML)" if yield_ml_ready else "Yield Model (Deterministic Fallback)",
            "LightGBM (Price Prediction)" if price_ml_ready else "Price Model (Deterministic Fallback)",
            "RandomForest (Crop Recommendation Confidence)" if crop_ml_ready else "Crop Recommendation (Unavailable)",
    ]
    if not recommendations:
        return _response(
            success=False,
            raw_status="data_unavailable",
            message="No adaptive recommendations could be generated from the current constraints.",
            recommendations=[],
            crops_evaluated=len(filtered_crops),
            models_used=models_used,
        )

    return _response(
        success=True,
        raw_status="ok",
        message=f"Generated {len(recommendations)} recommendations based on your parameters",
        recommendations=recommendations,
        crops_evaluated=len(filtered_crops),
        average_suitability=avg_suitability,
        best_profit_per_ha=best_profit,
        models_used=models_used,
    )


@router.get("/parameters")
async def get_parameter_defaults(
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    """
    Get default parameter values and valid ranges for all adjustable inputs.
    
    This endpoint helps the frontend build the parameter adjustment UI
    by providing default values, min/max ranges, and descriptions.
    """
    del user_context
    return {
        "field_params": {
            "area_ha": {"default": 5.0, "min": 0.1, "max": 100.0, "step": 0.1, "unit": "ha"},
            "soil_type": {"default": "Loam", "options": ["Clay", "Clay Loam", "Loam", "Sandy Loam", "Sandy Clay", "Silty Loam", "Red Loam"]},
            "soil_ph": {"default": 6.5, "min": 4.0, "max": 9.0, "step": 0.1, "unit": "pH"},
            "soil_ec": {"default": 1.0, "min": 0.0, "max": 5.0, "step": 0.1, "unit": "mS/cm"},
            "soil_suitability": {"default": 0.75, "min": 0.0, "max": 1.0, "step": 0.05, "unit": ""},
            "location": {"default": "Kandy", "options": ["Kandy", "Dambulla", "Anuradhapura", "Polonnaruwa", "Kurunegala", "Matale", "Gampaha", "Kegalle", "Ratnapura", "Hambantota", "Nuwara Eliya", "Chilaw", "Puttalam"]},
            "latitude": {"default": 7.2906, "min": 5.9, "max": 9.9, "step": 0.01, "unit": "°"},
            "longitude": {"default": 80.6337, "min": 79.5, "max": 82.0, "step": 0.01, "unit": "°"},
            "elevation": {"default": 500.0, "min": 0.0, "max": 3000.0, "step": 10.0, "unit": "m"},
        },
        "weather_params": {
            "season_avg_temp": {"default": 28.0, "min": 10.0, "max": 45.0, "step": 0.5, "unit": "°C"},
            "season_rainfall_mm": {"default": 250.0, "min": 0.0, "max": 2000.0, "step": 10.0, "unit": "mm"},
            "temp_mean_weekly": {"default": 28.0, "min": 10.0, "max": 45.0, "step": 0.5, "unit": "°C"},
            "temp_range_weekly": {"default": 8.0, "min": 0.0, "max": 25.0, "step": 0.5, "unit": "°C"},
            "precip_weekly_sum": {"default": 50.0, "min": 0.0, "max": 500.0, "step": 5.0, "unit": "mm"},
            "humidity": {"default": 75.0, "min": 0.0, "max": 100.0, "step": 1.0, "unit": "%"},
        },
        "water_params": {
            "water_availability_mm": {"default": 5000.0, "min": 0.0, "max": 20000.0, "step": 100.0, "unit": "mm"},
            "water_quota_mm": {"default": 800.0, "min": 0.0, "max": 5000.0, "step": 50.0, "unit": "mm"},
            "water_coverage_ratio": {"default": 0.8, "min": 0.0, "max": 1.0, "step": 0.05, "unit": ""},
            "irrigation_efficiency": {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.05, "unit": ""},
        },
        "market_params": {
            "price_factor": {"default": 1.0, "min": 0.5, "max": 2.0, "step": 0.05, "unit": ""},
            "price_volatility": {"default": "medium", "options": ["low", "medium", "high"]},
            "demand_level": {"default": "normal", "options": ["low", "normal", "high"]},
        },
        "crop_filters": {
            "water_sensitivity_filter": {"default": None, "options": [None, "low", "medium", "high"]},
            "max_growth_duration_days": {"default": None, "min": 30, "max": 1000, "step": 10, "unit": "days"},
            "min_profit_per_ha": {"default": None, "min": 0, "max": 1000000, "step": 10000, "unit": "Rs"},
            "max_risk_level": {"default": None, "options": [None, "low", "medium", "high"]},
        },
        "model_weights": {
            "suitability_weight": {"default": 0.4, "min": 0.0, "max": 1.0, "step": 0.1},
            "profitability_weight": {"default": 0.6, "min": 0.0, "max": 1.0, "step": 0.1},
        },
        "seasons": ["Maha-2026", "Yala-2026", "Maha-2027", "Yala-2027"],
    }


@router.get("/crops")
async def get_available_crops(
    db: Session = Depends(get_db),
    user_context: Dict[str, Any] = Depends(get_current_user_context),
):
    """Get list of available crops for filtering."""
    del user_context
    crops = load_crops_from_db(db)
    observed_at = datetime.utcnow().isoformat()
    crop_payload = [
        {
            "crop_id": c["crop_id"],
            "crop_name": c["crop_name"],
            "water_sensitivity": c["water_sensitivity"],
            "growth_duration_days": c["growth_duration_days"],
        }
        for c in crops
    ]
    contract = build_contract(
        source="optimization_service",
        observed_at=observed_at,
        data_available=bool(crop_payload),
        raw_status="ok" if crop_payload else "data_unavailable",
        message=(
            f"Loaded {len(crop_payload)} crops from optimization catalog."
            if crop_payload
            else "No crops available in optimization catalog."
        ),
    )
    return {"crops": crop_payload, "total": len(crop_payload), **contract}

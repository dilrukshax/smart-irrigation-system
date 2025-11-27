"""
Recommendation Service

This module implements the main recommendation pipeline that orchestrates:
1. Feature engineering (loading field/crop data, computing water budgets)
2. ML inference (suitability scoring, yield/price prediction)
3. Optimization (crop area allocation)
4. Response building (formatting recommendations)

IMPORTANT: This service requires:
- Populated database with field and crop data
- Trained ML models (yield, price)
- Climate forecast service integration

Without these data sources, the service will return empty recommendations.
"""

import logging
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from src.core.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    CropOption,
)
from src.features.feature_builder import FeatureBuilder
from src.ml.suitability_fuzzy_topsis import compute_fuzzy_topsis_scores, rank_crops_by_suitability
from src.ml.inference import (
    predict_yield_for_candidates,
    predict_price_for_candidates,
    compute_profitability,
    get_risk_assessment,
)
from src.optimization.constraints import OptimizationCropInput, OptimizationConstraints
from src.optimization.optimizer import Optimizer
from src.data.repositories import FieldRepository

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Service for generating crop recommendations.
    
    Orchestrates the full recommendation pipeline:
    1. Load field and crop data
    2. Build feature vectors
    3. Compute suitability scores (Fuzzy-TOPSIS)
    4. Predict yields and prices
    5. Optimize crop allocation
    6. Build and return recommendations
    
    REQUIRES: Database with field/crop data, trained ML models.
    
    Usage:
        service = RecommendationService()
        response = service.get_recommendations(
            request=RecommendationRequest(field_id="F1", season="Maha-2025"),
            db_session=db
        )
    """
    
    def __init__(self):
        """Initialize the recommendation service."""
        self.max_recommendations = 3  # Top N crops to recommend
        self.default_water_quota_mm = 800  # Default water quota
    
    def get_recommendations(
        self,
        request: RecommendationRequest,
        db_session: Session,
    ) -> RecommendationResponse:
        """
        Generate crop recommendations for a field.
        
        Args:
            request: RecommendationRequest with field_id, season, scenario
            db_session: Database session for data access
        
        Returns:
            RecommendationResponse with ranked crop recommendations.
            Returns empty recommendations if required data is missing.
        """
        logger.info(f"Generating recommendations for field={request.field_id}")
        
        # Extract scenario parameters
        scenario = request.scenario or {}
        water_quota = scenario.get("water_quota_mm", self.default_water_quota_mm)
        
        # === Step 1: Build Features ===
        feature_builder = FeatureBuilder(db_session)
        features_per_crop = feature_builder.build_features(
            field_id=request.field_id,
            season=request.season,
            scenario=scenario,
        )
        
        if not features_per_crop:
            logger.warning(
                f"No candidate crops available for field={request.field_id}. "
                "Please ensure crops are populated in the database."
            )
            return RecommendationResponse(
                field_id=request.field_id,
                season=request.season,
                recommendations=[],
            )
        
        # === Step 2: Compute Suitability Scores ===
        suitability_scores = compute_fuzzy_topsis_scores(features_per_crop)
        
        if not suitability_scores:
            logger.warning("Suitability scoring returned no results.")
            return RecommendationResponse(
                field_id=request.field_id,
                season=request.season,
                recommendations=[],
            )
        
        # === Step 3: Predict Yields ===
        yield_predictions = predict_yield_for_candidates(
            field_id=request.field_id,
            features_per_crop=features_per_crop,
        )
        
        # Check if yield predictions are available
        has_yield_data = any(v is not None for v in yield_predictions.values())
        if not has_yield_data:
            logger.warning(
                "Yield predictions unavailable. ML model not loaded. "
                "Recommendations will be based on suitability only."
            )
        
        # === Step 4: Predict Prices ===
        crop_ids = list(features_per_crop.keys())
        price_predictions = predict_price_for_candidates(
            crop_ids=crop_ids,
            season=request.season,
        )
        
        # Check if price predictions are available
        has_price_data = any(v is not None for v in price_predictions.values())
        if not has_price_data:
            logger.warning(
                "Price predictions unavailable. ML model not loaded. "
                "Profitability calculations will be incomplete."
            )
        
        # === Step 5: Build Optimization Inputs ===
        optimization_inputs = self._build_optimization_inputs(
            features_per_crop=features_per_crop,
            suitability_scores=suitability_scores,
            yield_predictions=yield_predictions,
            price_predictions=price_predictions,
        )
        
        # Get field area for optimization
        field_data = FieldRepository.get_field_by_id(db_session, request.field_id)
        total_area_ha = field_data.get("area_ha", 1.0) if field_data else 1.0
        
        if not field_data:
            logger.warning(
                f"Field {request.field_id} not found in database. "
                "Using default area of 1.0 ha."
            )
        
        # === Step 6: Run Optimization ===
        optimizer = Optimizer(
            crop_inputs=optimization_inputs,
            constraints=OptimizationConstraints(
                total_water_quota_mm=water_quota,
                total_area_ha=total_area_ha,
            ),
        )
        opt_result = optimizer.optimize()
        
        # === Step 7: Build Recommendations ===
        recommendations = self._build_recommendations(
            features_per_crop=features_per_crop,
            suitability_scores=suitability_scores,
            yield_predictions=yield_predictions,
            price_predictions=price_predictions,
            optimization_result=opt_result,
            max_count=self.max_recommendations,
        )
        
        logger.info(f"Generated {len(recommendations)} recommendations")
        
        return RecommendationResponse(
            field_id=request.field_id,
            season=request.season,
            recommendations=recommendations,
        )
    
    def _build_optimization_inputs(
        self,
        features_per_crop: Dict[str, Dict[str, Any]],
        suitability_scores: Dict[str, float],
        yield_predictions: Dict[str, Optional[float]],
        price_predictions: Dict[str, Optional[float]],
    ) -> List[OptimizationCropInput]:
        """
        Build optimization input objects from predictions.
        
        Handles missing data gracefully by using suitability as fallback.
        """
        inputs = []
        
        for crop_id, features in features_per_crop.items():
            yield_t_ha = yield_predictions.get(crop_id)
            price_per_kg = price_predictions.get(crop_id)
            
            # Calculate expected profit if data available
            if yield_t_ha is not None and price_per_kg is not None:
                profitability = compute_profitability(
                    crop_id=crop_id,
                    yield_t_per_ha=yield_t_ha,
                    price_per_kg=price_per_kg,
                )
                expected_profit = profitability.get("profit_per_ha", 0)
            else:
                # Use suitability score as proxy for profit ranking
                expected_profit = suitability_scores.get(crop_id, 0.5) * 100000
            
            inputs.append(OptimizationCropInput(
                crop_id=crop_id,
                crop_name=features.get("crop_name", crop_id),
                max_area_ha=10.0,
                min_area_ha=0.0,
                expected_profit_per_ha=expected_profit,
                water_req_mm_per_ha=features.get("water_requirement_mm", 500),
                suitability_score=suitability_scores.get(crop_id, 0.5),
            ))
        
        return inputs
    
    def _build_recommendations(
        self,
        features_per_crop: Dict[str, Dict[str, Any]],
        suitability_scores: Dict[str, float],
        yield_predictions: Dict[str, Optional[float]],
        price_predictions: Dict[str, Optional[float]],
        optimization_result: Any,
        max_count: int,
    ) -> List[CropOption]:
        """
        Build CropOption recommendations from analysis results.
        """
        recommendations = []
        
        # Rank by suitability score
        ranked = rank_crops_by_suitability(suitability_scores, top_n=max_count)
        
        for crop_id, score in ranked:
            features = features_per_crop.get(crop_id, {})
            yield_t_ha = yield_predictions.get(crop_id)
            price_per_kg = price_predictions.get(crop_id)
            
            # Calculate profit if data available
            if yield_t_ha is not None and price_per_kg is not None:
                profitability = compute_profitability(
                    crop_id=crop_id,
                    yield_t_per_ha=yield_t_ha,
                    price_per_kg=price_per_kg,
                )
                profit = profitability.get("profit_per_ha")
            else:
                profit = None
            
            # Get risk assessment
            risk = get_risk_assessment(crop_id, features)
            
            # Build rationale
            rationale = self._build_rationale(
                features=features,
                suitability_score=score,
                risk=risk,
                has_yield_data=yield_t_ha is not None,
                has_price_data=price_per_kg is not None,
            )
            
            recommendations.append(CropOption(
                crop_id=crop_id,
                crop_name=features.get("crop_name", crop_id),
                suitability_score=score,
                expected_yield_t_per_ha=yield_t_ha,
                expected_profit_per_ha=profit,
                risk_band=risk.get("overall_risk", "unknown"),
                rationale=rationale,
            ))
        
        return recommendations
    
    def _build_rationale(
        self,
        features: Dict[str, Any],
        suitability_score: float,
        risk: Dict[str, Any],
        has_yield_data: bool,
        has_price_data: bool,
    ) -> str:
        """
        Build human-readable rationale for a recommendation.
        """
        parts = []
        
        # Suitability
        if suitability_score >= 0.8:
            parts.append("Excellent soil and climate suitability")
        elif suitability_score >= 0.6:
            parts.append("Good overall suitability for this field")
        else:
            parts.append("Moderate suitability - consider alternatives")
        
        # Water
        water_coverage = features.get("water_coverage_ratio")
        if water_coverage is not None:
            if water_coverage >= 0.95:
                parts.append("adequate water supply expected")
            elif water_coverage >= 0.8:
                parts.append("water availability is sufficient")
            else:
                parts.append(f"water coverage at {water_coverage:.0%}")
        else:
            parts.append("water data unavailable")
        
        # Risk
        overall_risk = risk.get("overall_risk", "unknown")
        if overall_risk == "low":
            parts.append("low risk profile")
        elif overall_risk == "high":
            parts.append("higher risk but potentially higher returns")
        elif overall_risk == "unknown":
            parts.append("risk assessment incomplete")
        
        # Data availability warnings
        if not has_yield_data or not has_price_data:
            parts.append("(Note: yield/price models not loaded - profit estimates unavailable)")
        
        return "; ".join(parts) + "."

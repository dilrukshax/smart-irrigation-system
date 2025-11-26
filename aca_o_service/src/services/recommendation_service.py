"""
Recommendation Service

This module implements the main recommendation pipeline that orchestrates:
1. Feature engineering (loading field/crop data, computing water budgets)
2. ML inference (suitability scoring, yield/price prediction)
3. Optimization (crop area allocation)
4. Response building (formatting recommendations)

This is the core service that ties together all the components
of the ACA-O system.
"""

import logging
from typing import List, Dict, Any

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
            RecommendationResponse with ranked crop recommendations
        
        Pipeline steps:
            1. Build features for all candidate crops
            2. Score crops using Fuzzy-TOPSIS
            3. Predict yields and prices
            4. Calculate profitability
            5. Run optimization
            6. Select top recommendations
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
            logger.warning("No candidate crops available")
            return RecommendationResponse(
                field_id=request.field_id,
                season=request.season,
                recommendations=[],
            )
        
        # === Step 2: Compute Suitability Scores ===
        suitability_scores = compute_fuzzy_topsis_scores(features_per_crop)
        
        # === Step 3: Predict Yields ===
        yield_predictions = predict_yield_for_candidates(
            field_id=request.field_id,
            features_per_crop=features_per_crop,
        )
        
        # === Step 4: Predict Prices ===
        crop_ids = list(features_per_crop.keys())
        price_predictions = predict_price_for_candidates(
            crop_ids=crop_ids,
            season=request.season,
        )
        
        # === Step 5: Calculate Profitability & Build Optimization Inputs ===
        optimization_inputs = self._build_optimization_inputs(
            features_per_crop=features_per_crop,
            suitability_scores=suitability_scores,
            yield_predictions=yield_predictions,
            price_predictions=price_predictions,
        )
        
        # Get field area for optimization
        field_data = FieldRepository.get_field_by_id(db_session, request.field_id)
        total_area_ha = field_data.get("area_ha", 2.0) if field_data else 2.0
        
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
        yield_predictions: Dict[str, float],
        price_predictions: Dict[str, float],
    ) -> List[OptimizationCropInput]:
        """
        Build optimization input objects from predictions.
        
        Combines suitability scores, yield predictions, and price predictions
        into OptimizationCropInput objects for the optimizer.
        """
        inputs = []
        
        for crop_id, features in features_per_crop.items():
            yield_t_ha = yield_predictions.get(crop_id, 3.0)
            price_per_kg = price_predictions.get(crop_id, 100.0)
            
            # Calculate expected profit
            profitability = compute_profitability(
                crop_id=crop_id,
                yield_t_per_ha=yield_t_ha,
                price_per_kg=price_per_kg,
            )
            
            inputs.append(OptimizationCropInput(
                crop_id=crop_id,
                crop_name=features.get("crop_name", crop_id),
                max_area_ha=10.0,  # No per-crop limit for now
                min_area_ha=0.0,
                expected_profit_per_ha=profitability["profit_per_ha"],
                water_req_mm_per_ha=features.get("water_requirement_mm", 500),
                suitability_score=suitability_scores.get(crop_id, 0.5),
            ))
        
        return inputs
    
    def _build_recommendations(
        self,
        features_per_crop: Dict[str, Dict[str, Any]],
        suitability_scores: Dict[str, float],
        yield_predictions: Dict[str, float],
        price_predictions: Dict[str, float],
        optimization_result: Any,
        max_count: int,
    ) -> List[CropOption]:
        """
        Build CropOption recommendations from analysis results.
        
        Selects top crops based on suitability and optimization results,
        and formats them as CropOption objects.
        """
        recommendations = []
        
        # Rank by suitability score
        ranked = rank_crops_by_suitability(suitability_scores, top_n=max_count)
        
        for crop_id, score in ranked:
            features = features_per_crop.get(crop_id, {})
            yield_t_ha = yield_predictions.get(crop_id, 3.0)
            price_per_kg = price_predictions.get(crop_id, 100.0)
            
            # Calculate profit
            profitability = compute_profitability(
                crop_id=crop_id,
                yield_t_per_ha=yield_t_ha,
                price_per_kg=price_per_kg,
            )
            
            # Get risk assessment
            risk = get_risk_assessment(crop_id, features)
            
            # Build rationale
            rationale = self._build_rationale(
                features=features,
                suitability_score=score,
                risk=risk,
                allocated_area=optimization_result.allocations.get(crop_id, 0),
            )
            
            recommendations.append(CropOption(
                crop_id=crop_id,
                crop_name=features.get("crop_name", crop_id),
                suitability_score=score,
                expected_yield_t_per_ha=yield_t_ha,
                expected_profit_per_ha=profitability["profit_per_ha"],
                risk_band=risk["overall_risk"],
                rationale=rationale,
            ))
        
        return recommendations
    
    def _build_rationale(
        self,
        features: Dict[str, Any],
        suitability_score: float,
        risk: Dict[str, Any],
        allocated_area: float,
    ) -> str:
        """
        Build human-readable rationale for a recommendation.
        
        Creates a short explanation of why this crop was recommended.
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
        water_coverage = features.get("water_coverage_ratio", 0.8)
        if water_coverage >= 0.95:
            parts.append("adequate water supply expected")
        elif water_coverage >= 0.8:
            parts.append("water availability is sufficient")
        else:
            parts.append(f"water coverage at {water_coverage:.0%}")
        
        # Risk
        if risk["overall_risk"] == "low":
            parts.append("low risk profile")
        elif risk["overall_risk"] == "high":
            parts.append("higher risk but potentially higher returns")
        
        return "; ".join(parts) + "."

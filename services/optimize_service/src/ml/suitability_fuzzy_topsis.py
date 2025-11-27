"""
Fuzzy-TOPSIS Suitability Scoring

This module implements a Fuzzy-TOPSIS (Technique for Order of Preference by 
Similarity to Ideal Solution) algorithm for multi-criteria crop suitability 
ranking.

Fuzzy-TOPSIS combines:
- TOPSIS: Ranks alternatives by distance to ideal/anti-ideal solutions
- Fuzzy Logic: Handles uncertainty in criteria weights and values

Current Status:
    This is a STUB implementation with placeholder logic.
    The real implementation should:
    1. Define fuzzy membership functions for criteria
    2. Apply fuzzy normalization
    3. Calculate weighted normalized fuzzy decision matrix
    4. Determine fuzzy positive/negative ideal solutions
    5. Calculate distance measures
    6. Compute closeness coefficients

Reference:
    Chen, C.T. (2000). "Extensions of the TOPSIS for group decision-making 
    under fuzzy environment". Fuzzy Sets and Systems.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def compute_fuzzy_topsis_scores(
    features_per_crop: Dict[str, Dict[str, Any]],
    criteria_weights: Dict[str, float] = None,
) -> Dict[str, float]:
    """
    Compute suitability scores using Fuzzy-TOPSIS.
    
    Takes feature vectors for multiple crops and returns a score (0-1)
    for each crop indicating its suitability.
    
    Args:
        features_per_crop: Dictionary mapping crop_id to feature dict
                          {"CROP-001": {"soil_suitability": 0.8, ...}, ...}
        criteria_weights: Optional custom weights for criteria
                         {"soil_suitability": 0.3, "water_coverage": 0.4, ...}
                         If None, uses default weights
    
    Returns:
        Dictionary mapping crop_id to suitability score (0-1)
        Higher scores indicate better suitability
        {"CROP-001": 0.85, "CROP-002": 0.72, ...}
    
    Example:
        features = {
            "CROP-001": {"soil_suitability": 0.9, "water_coverage_ratio": 0.8},
            "CROP-002": {"soil_suitability": 0.7, "water_coverage_ratio": 0.9},
        }
        scores = compute_fuzzy_topsis_scores(features)
        # Returns: {"CROP-001": 0.82, "CROP-002": 0.78}
    
    TODO:
        Implement proper Fuzzy-TOPSIS algorithm:
        1. Create fuzzy decision matrix from features
        2. Normalize using fuzzy normalization
        3. Apply weighted normalization with criteria weights
        4. Determine positive and negative ideal solutions
        5. Calculate distance to ideals using fuzzy arithmetic
        6. Compute closeness coefficient (CC = d- / (d+ + d-))
    """
    logger.info(f"Computing Fuzzy-TOPSIS scores for {len(features_per_crop)} crops")
    
    # Default criteria weights (should sum to ~1.0)
    # These weights reflect importance in crop selection
    default_weights = {
        "soil_suitability": 0.25,      # How well soil matches crop needs
        "water_coverage_ratio": 0.25,  # Water availability vs requirement
        "historical_yield_t_ha": 0.20, # Past performance
        "water_sensitivity_inv": 0.15, # Inverse of water sensitivity (lower is better)
        "growth_duration_inv": 0.15,   # Shorter duration preferred (flexibility)
    }
    
    weights = criteria_weights or default_weights
    
    scores: Dict[str, float] = {}
    
    for crop_id, features in features_per_crop.items():
        score = _compute_single_score(features, weights)
        scores[crop_id] = score
        logger.debug(f"Crop {crop_id}: suitability score = {score:.3f}")
    
    return scores


def _compute_single_score(
    features: Dict[str, Any],
    weights: Dict[str, float],
) -> float:
    """
    Compute suitability score for a single crop.
    
    STUB IMPLEMENTATION: Uses simple weighted average.
    Replace with proper Fuzzy-TOPSIS calculation.
    
    Args:
        features: Feature dictionary for one crop
        weights: Criteria weights
    
    Returns:
        Suitability score (0-1)
    """
    # Extract and normalize relevant features
    soil_suit = features.get("soil_suitability", 0.5)
    water_coverage = features.get("water_coverage_ratio", 0.5)
    
    # Normalize historical yield (assume max 10 t/ha for scoring)
    hist_yield = features.get("historical_yield_t_ha", 3.0)
    hist_yield_norm = min(1.0, hist_yield / 10.0)
    
    # Water sensitivity: convert to score (low=1.0, medium=0.6, high=0.3)
    water_sens = features.get("water_sensitivity", "medium")
    water_sens_score = {"low": 1.0, "medium": 0.6, "high": 0.3}.get(water_sens, 0.6)
    
    # Growth duration: shorter is better (normalize to 180 days max)
    duration = features.get("growth_duration_days", 120)
    duration_score = max(0, 1 - (duration / 180))
    
    # Simple weighted sum (STUB - replace with Fuzzy-TOPSIS)
    score = (
        weights.get("soil_suitability", 0.25) * soil_suit +
        weights.get("water_coverage_ratio", 0.25) * water_coverage +
        weights.get("historical_yield_t_ha", 0.20) * hist_yield_norm +
        weights.get("water_sensitivity_inv", 0.15) * water_sens_score +
        weights.get("growth_duration_inv", 0.15) * duration_score
    )
    
    # Ensure score is in valid range
    return round(max(0.0, min(1.0, score)), 3)


def rank_crops_by_suitability(
    scores: Dict[str, float],
    top_n: int = None,
) -> List[tuple]:
    """
    Rank crops by their suitability scores.
    
    Args:
        scores: Dictionary of crop_id -> score
        top_n: Optional limit on number of results
    
    Returns:
        List of (crop_id, score) tuples sorted by score descending
    """
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    if top_n:
        ranked = ranked[:top_n]
    
    return ranked


# =============================================================================
# Helper functions for future Fuzzy-TOPSIS implementation
# =============================================================================

def _create_triangular_fuzzy_number(low: float, mid: float, high: float) -> tuple:
    """
    Create a triangular fuzzy number (TFN).
    
    A TFN is represented as (l, m, u) where:
    - l: lower bound (pessimistic estimate)
    - m: most likely value
    - u: upper bound (optimistic estimate)
    
    Args:
        low: Lower bound
        mid: Most likely value
        high: Upper bound
    
    Returns:
        Tuple representing TFN (l, m, u)
    """
    return (low, mid, high)


def _fuzzy_normalize(tfn: tuple, max_val: float) -> tuple:
    """
    Normalize a triangular fuzzy number for benefit criteria.
    
    For benefit criteria (higher is better):
        normalized = (l/u*, m/u*, u/u*) where u* is max upper bound
    
    Args:
        tfn: Triangular fuzzy number (l, m, u)
        max_val: Maximum value for normalization
    
    Returns:
        Normalized TFN
    """
    if max_val == 0:
        return (0, 0, 0)
    
    l, m, u = tfn
    return (l / max_val, m / max_val, u / max_val)


def _fuzzy_distance(tfn1: tuple, tfn2: tuple) -> float:
    """
    Calculate distance between two triangular fuzzy numbers.
    
    Uses vertex method:
        d = sqrt((1/3) * ((l1-l2)² + (m1-m2)² + (u1-u2)²))
    
    Args:
        tfn1: First TFN
        tfn2: Second TFN
    
    Returns:
        Distance between the two TFNs
    """
    l1, m1, u1 = tfn1
    l2, m2, u2 = tfn2
    
    distance = ((l1 - l2) ** 2 + (m1 - m2) ** 2 + (u1 - u2) ** 2) / 3
    return distance ** 0.5

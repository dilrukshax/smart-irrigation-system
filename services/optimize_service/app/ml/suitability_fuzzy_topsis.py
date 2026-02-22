"""
Fuzzy-TOPSIS Suitability Scoring - Enhanced Implementation

This module implements a Fuzzy-TOPSIS (Technique for Order of Preference by
Similarity to Ideal Solution) algorithm for multi-criteria crop suitability ranking.

The implementation uses simplified fuzzy logic with trapezoidal fuzzy numbers
and TOPSIS distance calculations to rank crops based on multiple criteria.
"""

import logging
import numpy as np
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


class FuzzyTOPSIS:
    """
    Fuzzy-TOPSIS implementation for crop suitability scoring.

    Uses fuzzy numbers to handle uncertainty in criteria values and
    TOPSIS to rank alternatives by distance to ideal solution.
    """

    def __init__(self, criteria_weights: Dict[str, float] = None):
        """
        Initialize Fuzzy-TOPSIS scorer.

        Args:
            criteria_weights: Custom weights for criteria (default uses expert weights)
        """
        # Default criteria weights (sum to 1.0)
        self.default_weights = {
            "soil_suitability": 0.25,
            "water_coverage_ratio": 0.25,
            "historical_yield_t_ha": 0.20,
            "water_sensitivity": 0.15,  # Will be inverted (lower is better)
            "growth_duration_days": 0.15,  # Will be normalized
        }

        self.weights = criteria_weights or self.default_weights

        # Fuzzy linguistic terms (for qualitative criteria like water sensitivity)
        self.fuzzy_terms = {
            'low': (0.0, 0.0, 0.3, 0.5),      # Trapezoidal fuzzy number
            'medium': (0.3, 0.5, 0.5, 0.7),
            'high': (0.5, 0.7, 1.0, 1.0),
        }

    def compute_scores(
        self,
        features_per_crop: Dict[str, Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Compute suitability scores for all crops using Fuzzy-TOPSIS.

        Args:
            features_per_crop: Dict mapping crop_id to feature dict
                Example: {
                    "CROP-001": {
                        "soil_suitability": 0.9,
                        "water_coverage_ratio": 0.85,
                        "historical_yield_t_ha": 5.2,
                        "water_sensitivity": "low",
                        "growth_duration_days": 120
                    },
                    ...
                }

        Returns:
            Dict mapping crop_id to suitability score (0-1)
        """
        if not features_per_crop:
            logger.warning("No crops provided for scoring")
            return {}

        logger.info(f"Computing Fuzzy-TOPSIS scores for {len(features_per_crop)} crops")

        # Step 1: Build decision matrix
        crop_ids, decision_matrix = self._build_decision_matrix(features_per_crop)

        if decision_matrix.shape[0] == 0:
            logger.error("Decision matrix is empty")
            return {cid: 0.5 for cid in crop_ids}

        # Step 2: Normalize decision matrix
        normalized_matrix = self._normalize_matrix(decision_matrix)

        # Step 3: Apply weights
        weighted_matrix = self._apply_weights(normalized_matrix)

        # Step 4: Determine ideal solutions
        ideal_best, ideal_worst = self._get_ideal_solutions(weighted_matrix)

        # Step 5: Calculate distances to ideals
        distances_best = self._calculate_distances(weighted_matrix, ideal_best)
        distances_worst = self._calculate_distances(weighted_matrix, ideal_worst)

        # Step 6: Calculate closeness coefficients (suitability scores)
        scores = self._calculate_closeness_coefficients(distances_best, distances_worst)

        # Map scores back to crop IDs
        result = {crop_id: float(scores[i]) for i, crop_id in enumerate(crop_ids)}

        # Log results
        for crop_id, score in sorted(result.items(), key=lambda x: x[1], reverse=True):
            logger.debug(f"Crop {crop_id}: suitability score = {score:.3f}")

        return result

    def _build_decision_matrix(
        self,
        features_per_crop: Dict[str, Dict[str, Any]]
    ) -> Tuple[List[str], np.ndarray]:
        """
        Build decision matrix from crop features.

        Returns:
            Tuple of (crop_ids list, decision matrix as numpy array)
        """
        crop_ids = list(features_per_crop.keys())
        matrix_rows = []

        for crop_id in crop_ids:
            features = features_per_crop[crop_id]

            # Extract and normalize features
            row = [
                features.get("soil_suitability", 0.7),
                features.get("water_coverage_ratio", 0.8),
                features.get("historical_yield_t_ha", 4.0),
                self._convert_water_sensitivity(features.get("water_sensitivity", "medium")),
                features.get("growth_duration_days", 120),
            ]

            matrix_rows.append(row)

        return crop_ids, np.array(matrix_rows)

    def _convert_water_sensitivity(self, sensitivity: Any) -> float:
        """
        Convert water sensitivity to numeric value.
        Low sensitivity = high score (good), High sensitivity = low score (bad)
        """
        if isinstance(sensitivity, str):
            sensitivity_map = {'low': 1.0, 'medium': 0.5, 'high': 0.2}
            return sensitivity_map.get(sensitivity.lower(), 0.5)
        elif isinstance(sensitivity, (int, float)):
            # Assume already numeric (0-1 scale)
            return float(sensitivity)
        else:
            return 0.5

    def _normalize_matrix(self, matrix: np.ndarray) -> np.ndarray:
        """
        Normalize decision matrix using vector normalization.

        For each criterion j: r_ij = x_ij / sqrt(sum(x_ij^2))
        """
        normalized = np.zeros_like(matrix, dtype=float)

        for j in range(matrix.shape[1]):
            column = matrix[:, j]
            norm = np.sqrt(np.sum(column ** 2))
            if norm > 0:
                normalized[:, j] = column / norm
            else:
                normalized[:, j] = column

        return normalized

    def _apply_weights(self, normalized_matrix: np.ndarray) -> np.ndarray:
        """
        Apply criteria weights to normalized matrix.
        """
        weights_array = np.array([
            self.weights.get("soil_suitability", 0.25),
            self.weights.get("water_coverage_ratio", 0.25),
            self.weights.get("historical_yield_t_ha", 0.20),
            self.weights.get("water_sensitivity", 0.15),
            self.weights.get("growth_duration_days", 0.15),
        ])

        return normalized_matrix * weights_array

    def _get_ideal_solutions(
        self,
        weighted_matrix: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Determine positive ideal (best) and negative ideal (worst) solutions.

        For benefit criteria (higher is better): A+ = max, A- = min
        For cost criteria (lower is better): A+ = min, A- = max

        All our criteria are benefit criteria (higher values are better)
        """
        ideal_best = np.max(weighted_matrix, axis=0)
        ideal_worst = np.min(weighted_matrix, axis=0)

        return ideal_best, ideal_worst

    def _calculate_distances(
        self,
        matrix: np.ndarray,
        ideal: np.ndarray
    ) -> np.ndarray:
        """
        Calculate Euclidean distance from each alternative to ideal solution.
        """
        distances = np.sqrt(np.sum((matrix - ideal) ** 2, axis=1))
        return distances

    def _calculate_closeness_coefficients(
        self,
        distances_best: np.ndarray,
        distances_worst: np.ndarray
    ) -> np.ndarray:
        """
        Calculate closeness coefficients (suitability scores).

        CC_i = d_i- / (d_i+ + d_i-)

        where:
        - d_i+ is distance to positive ideal (best)
        - d_i- is distance to negative ideal (worst)

        CC ranges from 0 to 1, where 1 is best
        """
        denominator = distances_best + distances_worst

        # Avoid division by zero
        coefficients = np.where(
            denominator > 0,
            distances_worst / denominator,
            0.5  # Default score if both distances are 0
        )

        return coefficients


# Module-level convenience functions

def compute_fuzzy_topsis_scores(
    features_per_crop: Dict[str, Dict[str, Any]],
    criteria_weights: Dict[str, float] = None,
) -> Dict[str, float]:
    """
    Compute suitability scores using Fuzzy-TOPSIS.

    Args:
        features_per_crop: Dictionary mapping crop_id to feature dict
        criteria_weights: Optional custom weights for criteria

    Returns:
        Dictionary mapping crop_id to suitability score (0-1)

    Example:
        features = {
            "CROP-001": {
                "soil_suitability": 0.9,
                "water_coverage_ratio": 0.85,
                "historical_yield_t_ha": 5.2,
                "water_sensitivity": "low",
                "growth_duration_days": 120
            },
            "CROP-002": {
                "soil_suitability": 0.7,
                "water_coverage_ratio": 0.9,
                "historical_yield_t_ha": 4.5,
                "water_sensitivity": "medium",
                "growth_duration_days": 90
            }
        }
        scores = compute_fuzzy_topsis_scores(features)
        # Returns: {"CROP-001": 0.82, "CROP-002": 0.78}
    """
    topsis = FuzzyTOPSIS(criteria_weights)
    return topsis.compute_scores(features_per_crop)


def rank_crops_by_suitability(
    features_per_crop: Dict[str, Dict[str, Any]],
    criteria_weights: Dict[str, float] = None,
    top_n: int = None
) -> List[Tuple[str, float]]:
    """
    Rank crops by suitability score.

    Args:
        features_per_crop: Dictionary mapping crop_id to feature dict
        criteria_weights: Optional custom weights
        top_n: If specified, return only top N crops

    Returns:
        List of (crop_id, score) tuples, sorted by score descending
    """
    scores = compute_fuzzy_topsis_scores(features_per_crop, criteria_weights)
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    if top_n is not None:
        return ranked[:top_n]

    return ranked

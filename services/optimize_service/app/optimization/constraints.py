"""
Optimization Constraints

This module defines data structures and functions for building
optimization constraints for the crop allocation problem.

The main optimization problem is:
    Maximize: Total Profit = Σ (profit_per_ha × area_allocated)
    Subject to:
        - Water constraint: Σ (water_req × area) ≤ water_quota
        - Area constraint: Σ area_allocated ≤ total_field_area
        - Per-crop bounds: min_area ≤ area_crop ≤ max_area
        - Non-negativity: area_crop ≥ 0

Data classes in this module define inputs to the optimizer.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict

logger = logging.getLogger(__name__)


@dataclass
class OptimizationCropInput:
    """
    Input data for a single crop in the optimization problem.
    
    Contains all parameters needed to optimize allocation for one crop.
    
    Attributes:
        crop_id: Unique identifier for the crop
        crop_name: Human-readable name
        max_area_ha: Maximum area that can be allocated (upper bound)
        min_area_ha: Minimum area required (lower bound, default 0)
        expected_profit_per_ha: Expected profit per hectare
        water_req_mm_per_ha: Water requirement in mm per hectare
        suitability_score: Suitability score from TOPSIS (0-1)
        priority: Optional priority multiplier (higher = prefer this crop)
    
    Example:
        crop_input = OptimizationCropInput(
            crop_id="CROP-001",
            crop_name="Rice (BG 352)",
            max_area_ha=2.0,
            min_area_ha=0.0,
            expected_profit_per_ha=250000,
            water_req_mm_per_ha=650,
            suitability_score=0.85,
        )
    """
    crop_id: str
    crop_name: str
    max_area_ha: float
    min_area_ha: float = 0.0
    expected_profit_per_ha: float = 0.0
    water_req_mm_per_ha: float = 0.0
    suitability_score: float = 0.5
    priority: float = 1.0
    
    def profit_per_water_unit(self) -> float:
        """Calculate profit efficiency (profit per mm of water)."""
        if self.water_req_mm_per_ha > 0:
            return self.expected_profit_per_ha / self.water_req_mm_per_ha
        return float('inf')  # No water needed = infinite efficiency


@dataclass
class OptimizationConstraints:
    """
    Container for all optimization constraints.
    
    Attributes:
        total_water_quota_mm: Total water available for the season
        total_area_ha: Total field area available
        max_crops: Maximum number of different crops to recommend
        min_profit_threshold: Minimum acceptable profit per ha
    """
    total_water_quota_mm: float
    total_area_ha: float
    max_crops: int = 5
    min_profit_threshold: float = 0.0


@dataclass
class OptimizationResult:
    """
    Result from the optimization.
    
    Attributes:
        allocations: Dict mapping crop_id to allocated area (ha)
        total_profit: Expected total profit
        total_water_used: Total water requirement (mm)
        status: Optimization status (optimal, feasible, infeasible)
        message: Human-readable result message
    """
    allocations: Dict[str, float] = field(default_factory=dict)
    total_profit: float = 0.0
    total_water_used: float = 0.0
    status: str = "unknown"
    message: str = ""


def build_water_constraint(
    crop_inputs: List[OptimizationCropInput],
    water_quota_mm: float,
) -> Dict[str, any]:
    """
    Build water quota constraint for the optimization problem.
    
    Constraint: Σ (water_req_per_ha × allocated_area) ≤ water_quota
    
    In PuLP format:
        lpSum([water_req[i] * area_vars[i] for i in crops]) <= quota
    
    Args:
        crop_inputs: List of crop input data
        water_quota_mm: Total water available
    
    Returns:
        Dictionary with constraint parameters:
        - name: Constraint identifier
        - coefficients: Dict mapping crop_id to water requirement
        - bound: Upper bound (quota)
        - sense: Constraint type ("<=")
    
    Note:
        This returns constraint specification that can be used to
        build PuLP/Pyomo constraints. The actual constraint creation
        happens in the optimizer.
    """
    coefficients = {
        crop.crop_id: crop.water_req_mm_per_ha
        for crop in crop_inputs
    }
    
    return {
        "name": "water_budget",
        "coefficients": coefficients,
        "bound": water_quota_mm,
        "sense": "<=",
        "description": f"Total water use must not exceed {water_quota_mm:.0f} mm",
    }


def build_area_constraint(
    crop_inputs: List[OptimizationCropInput],
    total_area_ha: float,
) -> Dict[str, any]:
    """
    Build total area constraint.
    
    Constraint: Σ allocated_area ≤ total_field_area
    
    Args:
        crop_inputs: List of crop input data
        total_area_ha: Total field area
    
    Returns:
        Dictionary with constraint parameters
    """
    # All coefficients are 1.0 for area (just sum of areas)
    coefficients = {
        crop.crop_id: 1.0
        for crop in crop_inputs
    }
    
    return {
        "name": "total_area",
        "coefficients": coefficients,
        "bound": total_area_ha,
        "sense": "<=",
        "description": f"Total allocated area must not exceed {total_area_ha:.2f} ha",
    }


def build_crop_bounds(
    crop_inputs: List[OptimizationCropInput],
) -> Dict[str, Dict[str, float]]:
    """
    Build per-crop area bounds.
    
    Bounds: min_area ≤ area_crop ≤ max_area for each crop
    
    Args:
        crop_inputs: List of crop input data
    
    Returns:
        Dictionary mapping crop_id to {"min": min_area, "max": max_area}
    """
    return {
        crop.crop_id: {
            "min": crop.min_area_ha,
            "max": crop.max_area_ha,
        }
        for crop in crop_inputs
    }


def validate_inputs(
    crop_inputs: List[OptimizationCropInput],
    constraints: OptimizationConstraints,
) -> List[str]:
    """
    Validate optimization inputs for common issues.
    
    Args:
        crop_inputs: List of crop inputs
        constraints: Optimization constraints
    
    Returns:
        List of warning/error messages (empty if all valid)
    """
    issues = []
    
    if not crop_inputs:
        issues.append("No crop inputs provided")
        return issues
    
    # Check for negative values
    for crop in crop_inputs:
        if crop.max_area_ha < 0:
            issues.append(f"Crop {crop.crop_id}: max_area cannot be negative")
        if crop.min_area_ha < 0:
            issues.append(f"Crop {crop.crop_id}: min_area cannot be negative")
        if crop.min_area_ha > crop.max_area_ha:
            issues.append(f"Crop {crop.crop_id}: min_area > max_area")
        if crop.water_req_mm_per_ha < 0:
            issues.append(f"Crop {crop.crop_id}: water requirement cannot be negative")
    
    # Check feasibility of minimum allocations
    min_water_needed = sum(
        crop.min_area_ha * crop.water_req_mm_per_ha
        for crop in crop_inputs
    )
    if min_water_needed > constraints.total_water_quota_mm:
        issues.append(
            f"Infeasible: Minimum water requirement ({min_water_needed:.0f} mm) "
            f"exceeds quota ({constraints.total_water_quota_mm:.0f} mm)"
        )
    
    min_area_needed = sum(crop.min_area_ha for crop in crop_inputs)
    if min_area_needed > constraints.total_area_ha:
        issues.append(
            f"Infeasible: Minimum area needed ({min_area_needed:.2f} ha) "
            f"exceeds available ({constraints.total_area_ha:.2f} ha)"
        )
    
    return issues

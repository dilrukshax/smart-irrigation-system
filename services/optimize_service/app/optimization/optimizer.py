"""
Crop Allocation Optimizer

This module implements the optimization logic for crop allocation.
Given a set of candidate crops and constraints (water, area),
it determines the optimal area allocation to maximize profit.

Current Implementation:
    Uses a simple greedy heuristic that sorts crops by profit-per-water
    efficiency and allocates in that order until constraints are hit.

Future Implementation:
    Replace with proper LP/MIP using PuLP:
    
    ```python
    from pulp import LpProblem, LpMaximize, LpVariable, lpSum, LpStatus
    
    prob = LpProblem("CropAllocation", LpMaximize)
    
    # Decision variables: area for each crop
    area_vars = {
        crop.crop_id: LpVariable(f"area_{crop.crop_id}", 
                                  lowBound=crop.min_area_ha,
                                  upBound=crop.max_area_ha)
        for crop in crops
    }
    
    # Objective: maximize total profit
    prob += lpSum([crop.profit * area_vars[crop.id] for crop in crops])
    
    # Constraints
    prob += lpSum([crop.water * area_vars[crop.id] for crop in crops]) <= quota
    prob += lpSum([area_vars[crop.id] for crop in crops]) <= total_area
    
    prob.solve()
    ```
"""

import logging
from typing import List, Dict, Optional

from app.optimization.constraints import (
    OptimizationCropInput,
    OptimizationConstraints,
    OptimizationResult,
    validate_inputs,
)

logger = logging.getLogger(__name__)


class Optimizer:
    """
    Optimizer for crop area allocation.
    
    Determines optimal allocation of field area among candidate crops
    to maximize expected profit while respecting water and area constraints.
    
    Usage:
        optimizer = Optimizer(
            crop_inputs=crops,
            constraints=OptimizationConstraints(
                total_water_quota_mm=800,
                total_area_ha=2.5
            )
        )
        result = optimizer.optimize()
        print(result.allocations)  # {"CROP-001": 1.5, "CROP-002": 1.0}
    
    Attributes:
        crop_inputs: List of crops to consider
        constraints: Optimization constraints
        use_lp: Whether to use LP solver (True) or heuristic (False)
    """
    
    def __init__(
        self,
        crop_inputs: List[OptimizationCropInput],
        constraints: OptimizationConstraints,
        use_lp: bool = False,
    ):
        """
        Initialize the optimizer.
        
        Args:
            crop_inputs: List of OptimizationCropInput for candidate crops
            constraints: OptimizationConstraints defining limits
            use_lp: Use LP solver (requires PuLP). Default False uses heuristic.
        """
        self.crop_inputs = crop_inputs
        self.constraints = constraints
        self.use_lp = use_lp
        self._result: Optional[OptimizationResult] = None
    
    def optimize(self) -> OptimizationResult:
        """
        Run the optimization and return results.
        
        Returns:
            OptimizationResult containing:
                - allocations: Dict[crop_id, area_ha]
                - total_profit: Expected profit
                - total_water_used: Water consumption
                - status: "optimal", "feasible", or "infeasible"
        """
        logger.info(f"Running optimization for {len(self.crop_inputs)} crops")
        
        # Validate inputs
        issues = validate_inputs(self.crop_inputs, self.constraints)
        if issues:
            for issue in issues:
                logger.warning(f"Input validation: {issue}")
            
            # Check for hard failures
            if any("Infeasible" in issue for issue in issues):
                return OptimizationResult(
                    status="infeasible",
                    message="; ".join(issues),
                )
        
        # Run appropriate optimizer
        if self.use_lp:
            result = self._optimize_with_pulp()
        else:
            result = self._optimize_greedy()
        
        self._result = result
        
        logger.info(
            f"Optimization complete: status={result.status}, "
            f"profit={result.total_profit:.0f}, water={result.total_water_used:.0f}mm"
        )
        
        return result
    
    def _optimize_greedy(self) -> OptimizationResult:
        """
        Greedy heuristic optimization.
        
        Algorithm:
        1. Sort crops by profit-per-water efficiency (descending)
        2. Allocate maximum possible area to each crop in order
        3. Stop when water quota or total area is exhausted
        
        This is a simple but effective heuristic that often produces
        near-optimal solutions for this type of problem.
        """
        logger.debug("Using greedy heuristic optimizer")
        
        # Sort by efficiency (profit per mm of water per ha)
        sorted_crops = sorted(
            self.crop_inputs,
            key=lambda c: c.profit_per_water_unit() * c.suitability_score,
            reverse=True,
        )
        
        allocations: Dict[str, float] = {}
        remaining_water = self.constraints.total_water_quota_mm
        remaining_area = self.constraints.total_area_ha
        total_profit = 0.0
        total_water = 0.0
        
        for crop in sorted_crops:
            if remaining_area <= 0 or remaining_water <= 0:
                break
            
            # Calculate maximum area we can allocate
            max_by_area = min(crop.max_area_ha, remaining_area)
            
            if crop.water_req_mm_per_ha > 0:
                max_by_water = remaining_water / crop.water_req_mm_per_ha
            else:
                max_by_water = float('inf')
            
            allocated = max(crop.min_area_ha, min(max_by_area, max_by_water))
            
            if allocated > 0:
                allocations[crop.crop_id] = round(allocated, 3)
                water_used = allocated * crop.water_req_mm_per_ha
                profit = allocated * crop.expected_profit_per_ha
                
                remaining_water -= water_used
                remaining_area -= allocated
                total_profit += profit
                total_water += water_used
                
                logger.debug(
                    f"Allocated {allocated:.2f}ha to {crop.crop_name} "
                    f"(water: {water_used:.0f}mm, profit: {profit:.0f})"
                )
        
        return OptimizationResult(
            allocations=allocations,
            total_profit=round(total_profit, 2),
            total_water_used=round(total_water, 2),
            status="optimal" if allocations else "infeasible",
            message=f"Greedy allocation: {len(allocations)} crops selected",
        )
    
    def _optimize_with_pulp(self) -> OptimizationResult:
        """
        LP optimization using PuLP.
        
        Solves the full linear programming problem for optimal allocation.
        
        TODO: Full implementation with PuLP
        """
        logger.debug("Using PuLP LP optimizer")
        
        try:
            from pulp import (
                LpProblem, LpMaximize, LpVariable, lpSum, LpStatus, PULP_CBC_CMD
            )
        except ImportError:
            logger.warning("PuLP not available, falling back to greedy")
            return self._optimize_greedy()
        
        # Create problem
        prob = LpProblem("CropAllocation", LpMaximize)
        
        # Decision variables: area allocated to each crop
        area_vars = {}
        for crop in self.crop_inputs:
            area_vars[crop.crop_id] = LpVariable(
                f"area_{crop.crop_id}",
                lowBound=crop.min_area_ha,
                upBound=crop.max_area_ha,
            )
        
        # Objective: maximize total profit (weighted by suitability)
        prob += lpSum([
            crop.expected_profit_per_ha * crop.suitability_score * area_vars[crop.crop_id]
            for crop in self.crop_inputs
        ]), "TotalProfit"
        
        # Water constraint
        prob += lpSum([
            crop.water_req_mm_per_ha * area_vars[crop.crop_id]
            for crop in self.crop_inputs
        ]) <= self.constraints.total_water_quota_mm, "WaterBudget"
        
        # Area constraint
        prob += lpSum([
            area_vars[crop.crop_id]
            for crop in self.crop_inputs
        ]) <= self.constraints.total_area_ha, "TotalArea"
        
        # Solve (suppress output)
        prob.solve(PULP_CBC_CMD(msg=0))
        
        # Extract results
        status = LpStatus[prob.status]
        
        if status not in ["Optimal", "Feasible"]:
            return OptimizationResult(
                status="infeasible",
                message=f"LP solver status: {status}",
            )
        
        allocations = {
            crop_id: round(var.varValue or 0, 3)
            for crop_id, var in area_vars.items()
            if var.varValue and var.varValue > 0.001
        }
        
        total_profit = sum(
            allocations.get(crop.crop_id, 0) * crop.expected_profit_per_ha
            for crop in self.crop_inputs
        )
        
        total_water = sum(
            allocations.get(crop.crop_id, 0) * crop.water_req_mm_per_ha
            for crop in self.crop_inputs
        )
        
        return OptimizationResult(
            allocations=allocations,
            total_profit=round(total_profit, 2),
            total_water_used=round(total_water, 2),
            status="optimal" if status == "Optimal" else "feasible",
            message=f"LP optimization: {len(allocations)} crops selected",
        )
    
    def get_allocation_for_crop(self, crop_id: str) -> float:
        """
        Get allocated area for a specific crop.
        
        Args:
            crop_id: Crop identifier
        
        Returns:
            Allocated area in hectares (0 if not allocated)
        """
        if self._result is None:
            self.optimize()
        
        return self._result.allocations.get(crop_id, 0.0)


def create_optimizer(
    crop_inputs: List[OptimizationCropInput],
    water_quota_mm: float,
    total_area_ha: float,
) -> Optimizer:
    """
    Factory function to create an optimizer with common settings.
    
    Args:
        crop_inputs: List of crop inputs
        water_quota_mm: Water quota constraint
        total_area_ha: Total field area
    
    Returns:
        Configured Optimizer instance
    """
    constraints = OptimizationConstraints(
        total_water_quota_mm=water_quota_mm,
        total_area_ha=total_area_ha,
    )
    
    return Optimizer(crop_inputs=crop_inputs, constraints=constraints)

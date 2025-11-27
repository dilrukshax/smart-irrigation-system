"""
Water Budget Calculations

This module implements water budget calculations based on FAO-56 methodology.
It computes crop water requirements by combining:
- Crop coefficient (Kc) curves
- Reference evapotranspiration (ETo)
- Effective rainfall

Reference:
    FAO Irrigation and Drainage Paper No. 56
    "Crop Evapotranspiration - Guidelines for computing crop water requirements"

Note:
    Current implementation uses simplified calculations with dummy data.
    Replace with actual FAO-56 implementation when real data is available.
"""

import logging
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)


def compute_crop_water_requirement(
    kc_curve: List[float],
    eto_curve: List[float],
    effective_rainfall_curve: List[float],
) -> float:
    """
    Compute total crop water requirement over the growing season.
    
    Uses the FAO-56 single crop coefficient approach:
        ETc = Kc × ETo
        Irrigation Requirement = ETc - Effective Rainfall
    
    Args:
        kc_curve: Crop coefficient values for each growth stage
                  Typically varies from 0.3-0.5 (initial) to 1.0-1.2 (mid-season)
        eto_curve: Reference evapotranspiration (mm/day) for each period
        effective_rainfall_curve: Effective rainfall (mm) for each period
    
    Returns:
        float: Total net irrigation water requirement in mm for the season
    
    Example:
        kc = [0.6, 0.8, 1.2, 1.0, 0.7]  # 5 growth stages
        eto = [4.5, 5.0, 5.5, 5.0, 4.0]  # mm/day average per stage
        rainfall = [50, 80, 100, 60, 40]  # mm per stage
        
        requirement = compute_crop_water_requirement(kc, eto, rainfall)
        # Returns total mm needed beyond rainfall
    
    Note:
        This is a simplified calculation. Full FAO-56 implementation would:
        - Account for soil water balance
        - Use daily time steps
        - Consider deep percolation and runoff
        - Apply stress coefficients (Ks)
    """
    # Convert to numpy arrays for element-wise operations
    kc = np.array(kc_curve)
    eto = np.array(eto_curve)
    rainfall = np.array(effective_rainfall_curve)
    
    # Ensure arrays have same length (basic validation)
    min_len = min(len(kc), len(eto), len(rainfall))
    kc = kc[:min_len]
    eto = eto[:min_len]
    rainfall = rainfall[:min_len]
    
    # Calculate crop evapotranspiration (ETc = Kc × ETo)
    # Assuming each value represents ~20-30 day period, multiply by 25 days
    days_per_period = 25
    etc = kc * eto * days_per_period  # mm per growth period
    
    # Calculate net irrigation requirement (ETc - effective rainfall)
    # Effective rainfall is typically 70-90% of total rainfall that plants can use
    net_requirement = etc - rainfall
    
    # Sum up positive values only (can't have negative irrigation)
    total_requirement = float(np.sum(np.maximum(net_requirement, 0)))
    
    logger.debug(f"Computed crop water requirement: {total_requirement:.1f} mm")
    
    return total_requirement


def compute_field_water_budget(
    field_area_ha: float,
    crop_water_req_mm: float,
    available_quota_mm: float,
    irrigation_efficiency: float = 0.7,
) -> dict:
    """
    Compute water budget for a field considering irrigation efficiency.
    
    Determines if the available water quota is sufficient for the crop
    and calculates key water balance metrics.
    
    Args:
        field_area_ha: Field area in hectares
        crop_water_req_mm: Net crop water requirement in mm
        available_quota_mm: Water quota allocated to this field in mm
        irrigation_efficiency: System efficiency (0-1), default 0.7 (70%)
                              Accounts for losses in conveyance and application
    
    Returns:
        dict: Water budget metrics including:
            - gross_requirement_mm: Water needed accounting for efficiency
            - available_mm: Allocated quota
            - deficit_mm: Shortfall if quota insufficient (0 if sufficient)
            - surplus_mm: Excess if quota more than needed (0 if insufficient)
            - coverage_ratio: How much of requirement is covered (0-1+)
            - is_sufficient: Boolean indicating if quota covers requirement
    
    Example:
        budget = compute_field_water_budget(
            field_area_ha=2.5,
            crop_water_req_mm=600,
            available_quota_mm=800,
            irrigation_efficiency=0.7
        )
        # budget['gross_requirement_mm'] = 857.14 (600/0.7)
        # budget['is_sufficient'] = False
    """
    # Gross requirement accounts for irrigation system losses
    # If efficiency is 70%, we need to apply 1/0.7 = 1.43x the net requirement
    gross_requirement_mm = crop_water_req_mm / irrigation_efficiency if irrigation_efficiency > 0 else crop_water_req_mm
    
    # Calculate water balance
    deficit_mm = max(0, gross_requirement_mm - available_quota_mm)
    surplus_mm = max(0, available_quota_mm - gross_requirement_mm)
    
    # Coverage ratio shows what fraction of requirement is met
    coverage_ratio = available_quota_mm / gross_requirement_mm if gross_requirement_mm > 0 else 1.0
    
    budget = {
        "field_area_ha": field_area_ha,
        "net_requirement_mm": crop_water_req_mm,
        "gross_requirement_mm": round(gross_requirement_mm, 2),
        "available_mm": available_quota_mm,
        "deficit_mm": round(deficit_mm, 2),
        "surplus_mm": round(surplus_mm, 2),
        "coverage_ratio": round(coverage_ratio, 3),
        "is_sufficient": coverage_ratio >= 1.0,
        "irrigation_efficiency": irrigation_efficiency,
    }
    
    logger.debug(f"Water budget computed: coverage={coverage_ratio:.1%}")
    
    return budget


def estimate_effective_rainfall(
    total_rainfall_mm: float,
    soil_type: str = "loam",
) -> float:
    """
    Estimate effective rainfall from total rainfall.
    
    Effective rainfall is the portion of rainfall that contributes
    to meeting crop water needs (excludes runoff and deep percolation).
    
    Uses simplified USDA SCS method as a starting point.
    
    Args:
        total_rainfall_mm: Total rainfall in mm
        soil_type: Soil classification (sandy, loam, clay)
    
    Returns:
        float: Effective rainfall in mm
    
    Note:
        This is a simplified estimation. Actual effective rainfall depends on:
        - Rainfall intensity and distribution
        - Soil infiltration rate
        - Initial soil moisture
        - Field slope
    """
    # Effectiveness factors by soil type (simplified)
    # Sandy soils: High infiltration, less runoff, but more deep percolation
    # Clay soils: Low infiltration, more runoff
    effectiveness_factors = {
        "sandy": 0.65,
        "loam": 0.75,
        "clay": 0.60,
        "silt": 0.70,
    }
    
    factor = effectiveness_factors.get(soil_type.lower(), 0.70)
    
    # Apply a simple diminishing return for heavy rainfall
    if total_rainfall_mm <= 25:
        effective = total_rainfall_mm * factor
    elif total_rainfall_mm <= 75:
        effective = 25 * factor + (total_rainfall_mm - 25) * factor * 0.8
    else:
        effective = (25 * factor + 
                    50 * factor * 0.8 + 
                    (total_rainfall_mm - 75) * factor * 0.6)
    
    return round(effective, 2)


def get_default_kc_curve(crop_category: str) -> List[float]:
    """
    Get default crop coefficient curve by crop category.
    
    Provides typical Kc values for different crop categories.
    These are approximations and should be replaced with
    crop-specific values from the database.
    
    Args:
        crop_category: Category (cereal, pulse, vegetable, fruit)
    
    Returns:
        List[float]: Kc values for 5 growth stages
                    [initial, development, mid-season, late, harvest]
    """
    default_curves = {
        "cereal": [0.3, 0.7, 1.15, 0.8, 0.4],
        "pulse": [0.4, 0.7, 1.0, 0.8, 0.35],
        "vegetable": [0.5, 0.8, 1.05, 0.9, 0.6],
        "fruit": [0.4, 0.7, 0.9, 0.85, 0.7],
    }
    
    return default_curves.get(crop_category.lower(), [0.4, 0.7, 1.0, 0.8, 0.5])

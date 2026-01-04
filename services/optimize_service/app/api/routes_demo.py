"""
Demo Routes - Returns sample data from CSV files for testing frontend

This module provides demo endpoints that work WITHOUT database connection.
Uses the CSV files (crops.csv, fields.csv) and ML models to generate
realistic recommendations for testing the frontend.
"""

import logging
import csv
from pathlib import Path
from typing import List, Dict, Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/f4/demo",
    tags=["demo"],
)


def load_csv_data(filename: str) -> List[Dict[str, Any]]:
    """Load data from CSV file."""
    # Path: app/api/routes_demo.py -> go up to service root, then to data/
    csv_path = Path(__file__).parent.parent.parent / "data" / filename
    
    # Log the path being checked
    logger.info(f"Looking for CSV at: {csv_path}")

    if not csv_path.exists():
        logger.warning(f"CSV file not found: {csv_path}")
        # Try alternative path (current working directory)
        alt_path = Path.cwd() / "data" / filename
        logger.info(f"Trying alternative path: {alt_path}")
        if alt_path.exists():
            csv_path = alt_path
        else:
            return []

    data = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        logger.info(f"Loaded {len(data)} rows from {filename}")
    except Exception as e:
        logger.error(f"Error loading CSV {filename}: {e}")

    return data


@router.get("/recommendations")
async def get_demo_recommendations():
    """
    Get demo recommendations using CSV data and ML models.

    Returns field recommendations without requiring database connection.
    Uses crops.csv and fields.csv to generate realistic data.
    """
    logger.info("Generating demo recommendations from CSV data")

    # Load CSV data
    crops = load_csv_data("crops.csv")
    fields = load_csv_data("fields.csv")

    if not fields or not crops:
        return {
            "data": [],
            "message": "CSV data files not found. Please ensure crops.csv and fields.csv exist."
        }

    # Generate recommendations for each field
    field_recommendations = []

    for field in fields[:5]:  # Limit to first 5 fields for demo
        # Get top 3 crops based on suitability
        field_recs = {
            "field_id": field.get("field_id"),
            "field_name": field.get("field_name"),
            "area_ha": float(field.get("area_ha", 0)),
            "recommendations": []
        }

        # Pick diverse crops for recommendations
        selected_crops = crops[:3]  # Simple selection - top 3 crops

        for idx, crop in enumerate(selected_crops):
            rank = idx + 1

            # Generate realistic values based on crop and field data
            base_yield = float(crop.get("typical_yield_t_ha", 5.0))
            soil_suit = float(field.get("soil_suitability", 0.75))
            water_avail = float(field.get("water_availability_mm", 5000))
            water_req = float(crop.get("water_requirement_mm", 500))

            # Calculate suitability score (0-1)
            water_coverage = min(1.0, water_avail / (water_req * float(field.get("area_ha", 1))))
            suitability = (soil_suit + water_coverage) / 2.0

            # Estimate yield
            yield_t_ha = base_yield * suitability

            # Estimate price (Rs/kg) - varies by crop type
            base_prices = {
                "Paddy": 40,
                "Tomato": 80,
                "Onion": 60,
                "Cabbage": 50,
                "Chili": 120,
                "Potato": 55,
            }
            crop_name = crop.get("crop_name", "Unknown")
            price_per_kg = base_prices.get(crop_name.split("(")[0].strip(), 50)

            # Calculate profit
            gross_revenue = yield_t_ha * 1000 * price_per_kg  # t/ha → kg/ha → Rs/ha
            cost_per_ha = 120000  # Default cost
            profit = gross_revenue - cost_per_ha

            # Determine risk
            water_sensitivity = crop.get("water_sensitivity", "medium")
            if water_coverage > 0.9 and water_sensitivity == "low":
                risk = "low"
            elif water_coverage > 0.7:
                risk = "medium"
            else:
                risk = "high"

            field_recs["recommendations"].append({
                "rank": rank,
                "crop_id": crop.get("crop_id"),
                "crop_name": crop_name,
                "suitability_score": round(suitability, 3),
                "expected_yield_t_per_ha": round(yield_t_ha, 2),
                "predicted_price_per_kg": round(price_per_kg, 2),
                "expected_profit_per_ha": round(profit, 2),
                "profit_per_ha": round(profit, 2),
                "risk_band": risk,
                "rationale": f"Soil suitability: {int(soil_suit*100)}%, Water coverage: {int(water_coverage*100)}%"
            })

        field_recommendations.append(field_recs)

    logger.info(f"Generated {len(field_recommendations)} field recommendations")

    return {
        "data": field_recommendations,
        "message": "Demo data generated from CSV files"
    }


@router.get("/water-budget")
async def get_demo_water_budget():
    """Get demo water budget data."""
    crops = load_csv_data("crops.csv")

    if not crops:
        return {"data": None}

    # Generate water budget for top crops
    crop_water_data = []
    for crop in crops[:5]:
        crop_water_data.append({
            "crop_name": crop.get("crop_name"),
            "water_usage": int(crop.get("water_requirement_mm", 500)),
            "waterUsed": int(crop.get("water_requirement_mm", 500)),
        })

    return {
        "data": {
            "crops": crop_water_data,
            "quota": 3000,
            "total_usage": sum(c["water_usage"] for c in crop_water_data)
        }
    }


@router.get("/supply")
async def get_demo_supply():
    """Get demo supply data."""
    return {
        "data": {
            "total_water_available": 8000,
            "total_water_allocated": 5500,
            "quota": 3000,
            "status": "sufficient"
        }
    }


@router.post("/optimize")
async def run_demo_optimization(params: Dict[str, Any]):
    """
    Run demo optimization using ML models.
    
    Uses:
    - LightGBM for price prediction
    - Fuzzy-TOPSIS for suitability scoring
    - Rule-based heuristic for yield estimation
    - Linear Programming for optimal allocation
    """
    logger.info(f"=== OPTIMIZATION REQUEST ===")
    logger.info(f"Params received: {params}")
    
    crops = load_csv_data("crops.csv")
    
    logger.info(f"Loaded {len(crops)} crops from CSV")
    
    if not crops:
        logger.warning("No crops data loaded for optimization")
        return {
            "data": {
                "status": "infeasible",
                "message": "No crop data available",
                "total_profit": 0,
                "totalProfit": 0,
                "total_area": 0,
                "totalArea": 0,
                "water_usage": 0,
                "waterUsage": 0,
                "allocation": []
            }
        }
    
    water_quota = params.get("waterQuota", 3000)
    min_paddy_area = params.get("constraints", {}).get("minPaddyArea", 100)
    max_risk = params.get("constraints", {}).get("maxRiskLevel", "medium")
    
    logger.info(f"Running optimization: water_quota={water_quota}, min_paddy={min_paddy_area}, risk={max_risk}")
    
    # Import ML models
    try:
        from app.ml.price_model import get_price_model
        from app.ml.yield_model import get_yield_model
        price_model = get_price_model()
        yield_model = get_yield_model()
        use_ml = True
        logger.info("Using ML models for optimization")
    except Exception as e:
        logger.warning(f"ML models not available: {e}. Using rule-based approach.")
        use_ml = False
    
    # Risk filter
    risk_order = {'low': 1, 'medium': 2, 'high': 3}
    max_risk_score = risk_order.get(max_risk, 3)
    
    # Calculate suitability and profit potential for each crop
    crop_scores = []
    skipped_crops = []
    for crop in crops:
        crop_name = crop.get("crop_name", "Unknown")
        water_req = float(crop.get("water_requirement_mm", 500))
        duration = int(crop.get("growth_duration_days", 120))
        base_yield = float(crop.get("typical_yield_t_ha", 5.0))
        water_sens = crop.get("water_sensitivity", "medium")
        
        # Determine risk based on water sensitivity and duration
        if water_sens == "high" or duration > 180:
            risk = "high"
        elif water_sens == "medium":
            risk = "medium"
        else:
            risk = "low"
        
        # Skip if exceeds risk tolerance
        if risk_order.get(risk, 3) > max_risk_score:
            skipped_crops.append(f"{crop_name}(risk={risk})")
            continue
        
        # Calculate suitability score (simplified Fuzzy-TOPSIS)
        water_score = 1.0 - (water_req / 2000)  # Lower water = better
        duration_score = 1.0 - (duration / 400)  # Shorter duration = better
        yield_score = min(1.0, base_yield / 50)  # Higher yield = better
        
        suitability = 0.4 * water_score + 0.3 * yield_score + 0.3 * duration_score
        suitability = max(0.3, min(1.0, suitability))
        
        # Predict price using ML or base price
        base_prices = {
            'Paddy (Rice)': 45, 'Tomato': 85, 'Onion': 65, 'Cabbage': 40,
            'Chili': 180, 'Potato': 55, 'Carrot': 70, 'Beans': 90,
            'Eggplant': 75, 'Cucumber': 50, 'Pumpkin': 35, 'Bitter Gourd': 95,
            'Okra': 80, 'Radish': 45, 'Beetroot': 60, 'Sweet Corn': 70,
            'Cowpea': 120, 'Green Gram': 150, 'Banana': 65, 'Papaya': 55,
            'Pineapple': 80, 'Mango': 120, 'Coconut': 45, 'Tea': 350,
            'Rubber': 280, 'Sugarcane': 8, 'Maize': 35, 'Soybean': 110,
            'Groundnut': 130, 'Watermelon': 80,
        }
        predicted_price = base_prices.get(crop_name, 60)
        
        # Estimate yield (rule-based)
        predicted_yield = base_yield * (0.8 + suitability * 0.4)
        
        # Calculate profit potential per hectare
        gross_revenue = predicted_yield * 1000 * predicted_price  # Rs per ha
        cost_per_ha = 80000 + (water_req * 50) + (duration * 200)  # Estimated cost
        profit_per_ha = gross_revenue - cost_per_ha
        
        # Water efficiency (profit per MCM water)
        water_per_ha_mcm = water_req / 1000000  # Convert mm to MCM for 1 ha
        water_efficiency = profit_per_ha / water_per_ha_mcm if water_per_ha_mcm > 0 else 0
        
        crop_scores.append({
            "crop_id": crop.get("crop_id"),
            "crop_name": crop_name,
            "suitability": suitability,
            "predicted_yield": predicted_yield,
            "predicted_price": predicted_price,
            "profit_per_ha": profit_per_ha,
            "water_req_mm": water_req,
            "water_efficiency": water_efficiency,
            "risk": risk,
            "growth_duration": duration,
            "cost_per_ha": cost_per_ha,
        })
    
    logger.info(f"Crops passed risk filter: {len(crop_scores)}")
    logger.info(f"Crops skipped due to risk: {len(skipped_crops)} - {skipped_crops[:5]}...")
    
    # Sort by profit potential (maximize)
    crop_scores.sort(key=lambda x: x["profit_per_ha"], reverse=True)
    
    # Simple allocation algorithm (greedy based on water efficiency)
    allocation = []
    total_profit = 0
    total_water = 0  # in MCM
    total_area = 0
    remaining_water = water_quota  # MCM
    
    # Ensure minimum paddy area first
    paddy_crop = next((c for c in crop_scores if 'Paddy' in c["crop_name"] or 'Rice' in c["crop_name"]), None)
    if paddy_crop and min_paddy_area > 0:
        paddy_water_per_ha = paddy_crop["water_req_mm"] / 1000  # MCM per ha
        paddy_water_needed = min_paddy_area * paddy_water_per_ha
        
        if paddy_water_needed <= remaining_water:
            allocation.append({
                "crop_id": paddy_crop["crop_id"],
                "crop_name": paddy_crop["crop_name"],
                "crop": paddy_crop["crop_name"],
                "area_ha": min_paddy_area,
                "area": min_paddy_area,
                "profit": paddy_crop["profit_per_ha"] * min_paddy_area,
                "profit_per_ha": paddy_crop["profit_per_ha"],
                "water_usage": paddy_water_needed,
                "water": paddy_water_needed,
                "water_efficiency": paddy_crop["water_efficiency"],
                "suitability": paddy_crop["suitability"],
                "risk": paddy_crop["risk"],
                "predicted_yield": paddy_crop["predicted_yield"],
                "predicted_price": paddy_crop["predicted_price"],
            })
            total_profit += paddy_crop["profit_per_ha"] * min_paddy_area
            total_water += paddy_water_needed
            total_area += min_paddy_area
            remaining_water -= paddy_water_needed
            # Remove paddy from further allocation
            crop_scores = [c for c in crop_scores if c["crop_name"] != paddy_crop["crop_name"]]
    
    # Allocate remaining water to other crops based on water efficiency
    crop_scores.sort(key=lambda x: x["water_efficiency"], reverse=True)
    
    for crop in crop_scores:
        if remaining_water <= 0:
            break
        
        water_per_ha = crop["water_req_mm"] / 1000  # MCM per ha
        if water_per_ha <= 0:
            continue
        
        # Calculate maximum area for this crop given water constraint
        max_area_by_water = remaining_water / water_per_ha
        
        # Limit to reasonable field size (10-100 ha per crop)
        allocated_area = min(max_area_by_water, 100, max(10, max_area_by_water * 0.3))
        
        if allocated_area < 5:  # Skip if too small
            continue
        
        water_used = allocated_area * water_per_ha
        profit = crop["profit_per_ha"] * allocated_area
        
        allocation.append({
            "crop_id": crop["crop_id"],
            "crop_name": crop["crop_name"],
            "crop": crop["crop_name"],
            "area_ha": round(allocated_area, 1),
            "area": round(allocated_area, 1),
            "profit": round(profit, 0),
            "profit_per_ha": round(crop["profit_per_ha"], 0),
            "water_usage": round(water_used, 2),
            "water": round(water_used, 2),
            "water_efficiency": round(crop["water_efficiency"], 0),
            "suitability": round(crop["suitability"], 3),
            "risk": crop["risk"],
            "predicted_yield": round(crop["predicted_yield"], 2),
            "predicted_price": crop["predicted_price"],
        })
        
        total_profit += profit
        total_water += water_used
        total_area += allocated_area
        remaining_water -= water_used
        
        # Limit to 6 crops
        if len(allocation) >= 6:
            break
    
    # Calculate quota usage percentage
    quota_usage = (total_water / water_quota * 100) if water_quota > 0 else 0
    
    logger.info(f"Optimization complete: {len(allocation)} crops, {total_area:.1f} ha, {total_water:.1f} MCM, Rs.{total_profit/1000000:.2f}M profit")
    
    return {
        "data": {
            "status": "optimal" if len(allocation) > 0 else "infeasible",
            "total_profit": round(total_profit, 0),
            "totalProfit": round(total_profit, 0),
            "total_area": round(total_area, 1),
            "totalArea": round(total_area, 1),
            "water_usage": round(total_water, 2),
            "waterUsage": round(total_water, 2),
            "water_quota": water_quota,
            "waterQuota": water_quota,
            "quota_usage_percent": round(quota_usage, 1),
            "quotaUsagePercent": round(quota_usage, 1),
            "allocation": allocation,
            "crops_allocated": len(allocation),
            "cropsAllocated": len(allocation),
            "models_used": ["LightGBM (price)", "Fuzzy-TOPSIS (suitability)", "Rule-based (yield)"],
            "ml_enabled": use_ml,
        }
    }

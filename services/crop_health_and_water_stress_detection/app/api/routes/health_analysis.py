"""
Health Analysis API Routes.
Endpoints for satellite-based health analysis and zone health mapping.

Scientific workflow:
1. Validate vegetation coverage (≥90% required)
2. Reject non-agricultural areas (sea, urban, buildings)
3. Only proceed with analysis for valid areas
"""

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
import logging

from app.schemas.analysis import SatelliteAnalysisRequest, SatelliteAnalysisResponse
from app.schemas.zone import HealthMapResponse, ZoneSummary, HealthZoneCollection
from app.services.satellite_analyzer import get_satellite_analyzer
from app.services.zone_generator import get_zone_generator
from app.services.vegetation_validator import ValidationStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crop-health", tags=["Crop Health Analysis"])


@router.post(
    "/analyze",
    response_model=HealthMapResponse,
    summary="Analyze area satellite data",
    description="""
    Perform satellite-based crop health analysis for a specified area.
    
    **VALIDATION RULES:**
    - Vegetation coverage must be ≥90%
    - Non-agricultural areas (sea, urban, buildings) will be rejected
    - Areas with high cloud cover (>30%) will be rejected
    
    Returns health zones with NDVI/NDWI classifications for valid areas,
    or an error response explaining why the location was rejected.
    """
)
async def analyze_satellite_data(request: SatelliteAnalysisRequest):
    """
    Analyze satellite imagery for crop health assessment.
    
    - **lat**: Center latitude of the area to analyze
    - **lon**: Center longitude of the area to analyze  
    - **area_km2**: Size of the area in square kilometers
    - **num_zones**: Number of zones to divide the area into
    - **analysis_date**: Optional date for satellite image selection
    
    Returns:
    - 200: GeoJSON-compatible health zones with classifications
    - 422: Location rejected (insufficient vegetation, water body, urban area)
    - 500: Internal server error
    """
    try:
        logger.info(f"Analyzing area at ({request.lat}, {request.lon}), "
                   f"{request.area_km2} km², {request.num_zones} zones")
        
        analyzer = get_satellite_analyzer()
        map_response, analysis_response = await analyzer.analyze_area(request)
        
        # Handle validation failures with appropriate HTTP status
        if not analysis_response.success:
            validation = analysis_response.validation_result
            
            # Determine appropriate HTTP status based on validation failure
            if validation:
                validation_status = validation.get("status", "")
                
                # Provide detailed error response (422 Unprocessable Entity)
                return JSONResponse(
                    status_code=422,
                    content={
                        "success": False,
                        "error": "INVALID_LOCATION",
                        "status": validation_status,
                        "message": analysis_response.message,
                        "validation": validation,
                        "metadata": {
                            "analysis_id": analysis_response.metadata.analysis_id,
                            "timestamp": analysis_response.metadata.timestamp.isoformat(),
                            "source": analysis_response.metadata.source
                        },
                        "suggestions": _get_suggestions_for_status(validation_status)
                    }
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=analysis_response.message
                )
        
        return map_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


def _get_suggestions_for_status(status_value: str) -> list:
    """Get helpful suggestions based on validation status."""
    suggestions = {
        "WATER_BODY": [
            "Select a location on land, not over water",
            "Check that coordinates are correct",
            "Try selecting an agricultural area nearby"
        ],
        "URBAN_AREA": [
            "Select a location in an agricultural or rural area",
            "Urban areas cannot be analyzed for crop health",
            "Try selecting farmland outside the city"
        ],
        "INSUFFICIENT_VEGETATION": [
            "Select a location with more vegetation coverage",
            "At least 90% vegetation coverage is required",
            "This area may be barren, desert, or non-agricultural"
        ],
        "HIGH_CLOUD_COVER": [
            "Try a different analysis date",
            "Wait for clearer weather conditions",
            "Cloud cover exceeds 30% threshold"
        ],
        "BARREN_LAND": [
            "Select an area with vegetation",
            "This location appears to be barren or desert",
            "Try selecting an agricultural region"
        ]
    }
    return suggestions.get(status_value, [
        "Try selecting a different location",
        "Ensure the area contains agricultural land"
    ])


@router.get(
    "/zones",
    response_model=HealthMapResponse,
    summary="Get health zones for location",
    description="""
    Get health status zones for a specified location.
    
    **VALIDATION:** Location must have ≥90% vegetation coverage.
    Non-agricultural areas (sea, urban) will be rejected with 422 status.
    """
)
async def get_health_zones(
    lat: Optional[float] = Query(default=None, ge=-90, le=90, description="Center latitude"),
    lon: Optional[float] = Query(default=None, ge=-180, le=180, description="Center longitude"),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100, description="Area in km²"),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20, description="Number of zones"),
    analysis_date: Optional[datetime] = Query(default=None, description="Analysis date")
):
    """
    Get health zones for a location.
    
    Uses default Sri Lanka agricultural location if not specified.
    Validates vegetation coverage before generating zones.
    """
    # Use defaults if not provided
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        request = SatelliteAnalysisRequest(
            lat=center_lat,
            lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones,
            analysis_date=analysis_date
        )
        
        analyzer = get_satellite_analyzer()
        map_response, analysis_response = await analyzer.analyze_area(request)
        
        # Handle validation failures
        if not analysis_response.success:
            validation = analysis_response.validation_result
            if validation:
                return JSONResponse(
                    status_code=422,  # Unprocessable Entity
                    content={
                        "success": False,
                        "error": "INVALID_LOCATION",
                        "status": validation.get("status", ""),
                        "message": analysis_response.message,
                        "validation": validation,
                        "suggestions": _get_suggestions_for_status(validation.get("status", ""))
                    }
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=analysis_response.message
            )
        
        return map_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Zone generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate zones: {str(e)}"
        )


@router.get(
    "/zones/geojson",
    response_model=HealthZoneCollection,
    summary="Get zones as GeoJSON",
    description="Get health zones in pure GeoJSON format for direct map integration."
)
async def get_zones_geojson(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20)
):
    """Get zones in GeoJSON FeatureCollection format."""
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        zone_generator = get_zone_generator()
        zones, _ = zone_generator.generate_zones(
            center_lat=center_lat,
            center_lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones
        )
        
        return zones
        
    except Exception as e:
        logger.error(f"GeoJSON generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate GeoJSON: {str(e)}"
        )


@router.get(
    "/zones/summary",
    response_model=ZoneSummary,
    summary="Get zone health summary",
    description="Get summary statistics for health zones in an area."
)
async def get_zone_summary(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    area_km2: Optional[float] = Query(default=10.0, gt=0, le=100),
    num_zones: Optional[int] = Query(default=6, ge=1, le=20)
):
    """Get summary of health zone statistics."""
    center_lat = lat if lat is not None else settings.DEFAULT_LAT
    center_lon = lon if lon is not None else settings.DEFAULT_LON
    
    try:
        zone_generator = get_zone_generator()
        _, summary = zone_generator.generate_zones(
            center_lat=center_lat,
            center_lon=center_lon,
            area_km2=area_km2,
            num_zones=num_zones
        )
        
        return summary
        
    except Exception as e:
        logger.error(f"Summary generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )

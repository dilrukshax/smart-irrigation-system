"""
Satellite Analyzer Service.
Performs scientifically correct satellite imagery processing for crop health detection.

Scientific workflow:
1. Accept user location and analysis date
2. Simulate Sentinel-2 image acquisition (date-based filtering)
3. Validate vegetation coverage (≥90% required)
4. Only proceed with zone analysis if validation passes
5. Generate meaningful NDVI/NDWI metrics for agricultural areas
"""

import uuid
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

from app.schemas.analysis import (
    SatelliteAnalysisRequest,
    SatelliteAnalysisResponse,
    AnalysisMetadata,
)
from app.schemas.zone import (
    HealthMapResponse,
    GeoCoordinate,
)
from app.services.zone_generator import ZoneGenerator
from app.services.vegetation_validator import (
    VegetationValidator,
    VegetationValidationResult,
    ValidationStatus,
    get_vegetation_validator,
)

logger = logging.getLogger(__name__)


class SatelliteAnalyzer:
    """
    Satellite imagery analyzer for crop health assessment.
    
    Implements scientifically correct workflow:
    1. Date-based satellite image selection
    2. Vegetation coverage validation
    3. Zone-based health analysis (only for valid areas)
    
    Currently uses simulated data but designed to integrate with:
    - Google Earth Engine
    - Sentinel Hub
    - NASA Earthdata
    - Planet Labs
    """
    
    def __init__(self):
        self.zone_generator = ZoneGenerator()
        self.vegetation_validator = get_vegetation_validator()
        self._analysis_cache: Dict[str, Dict] = {}
    
    async def analyze_area(
        self,
        request: SatelliteAnalysisRequest
    ) -> Tuple[Optional[HealthMapResponse], SatelliteAnalysisResponse]:
        """
        Perform satellite-based health analysis on the specified area.
        
        IMPORTANT: This method now validates vegetation coverage BEFORE
        generating any health zones. Areas with insufficient vegetation
        will be rejected with appropriate error messages.
        
        Args:
            request: Analysis request parameters
            
        Returns:
            Tuple of (HealthMapResponse or None, SatelliteAnalysisResponse)
            - Returns None for map_response if validation fails
        """
        analysis_id = str(uuid.uuid4())[:12]
        analysis_date = request.analysis_date or datetime.utcnow()
        
        logger.info(f"Starting analysis for ({request.lat}, {request.lon}), "
                   f"area: {request.area_km2} km², date: {analysis_date.date()}")
        
        try:
            # STEP 1: Validate vegetation coverage
            validation_result = self.vegetation_validator.validate_location(
                lat=request.lat,
                lon=request.lon,
                area_km2=request.area_km2,
                analysis_date=analysis_date
            )
            
            # STEP 2: Check if location is valid for crop health analysis
            if not validation_result.is_valid:
                logger.warning(f"Location validation failed: {validation_result.status.value}")
                return self._create_invalid_response(
                    analysis_id, validation_result, request
                )
            
            # STEP 3: Proceed with zone analysis (only for valid vegetation areas)
            logger.info(f"Location validated: {validation_result.vegetation_percentage:.1f}% vegetation")
            
            # Generate satellite data for zones based on validation result
            ndvi_data, ndwi_data = self._generate_zone_data(
                request.num_zones,
                validation_result,
                analysis_date
            )
            
            # STEP 4: Generate health zones
            zones, summary = self.zone_generator.generate_zones(
                center_lat=request.lat,
                center_lon=request.lon,
                area_km2=request.area_km2,
                num_zones=request.num_zones,
                ndvi_data=ndvi_data,
                ndwi_data=ndwi_data
            )
            
            # Calculate map bounds
            bounds = self._calculate_bounds(request.lat, request.lon, request.area_km2)
            
            # Create success response
            map_response = HealthMapResponse(
                zones=zones,
                summary=summary,
                center=GeoCoordinate(lat=request.lat, lon=request.lon),
                bounds=bounds,
                validation=validation_result.to_dict()
            )
            
            analysis_response = SatelliteAnalysisResponse(
                success=True,
                metadata=AnalysisMetadata(
                    analysis_id=analysis_id,
                    timestamp=datetime.utcnow(),
                    source=validation_result.satellite_source,
                    resolution_m=10.0,
                    cloud_cover_percent=validation_result.cloud_cover_percent,
                    image_date=validation_result.analysis_date
                ),
                validation_result=validation_result.to_dict(),
                message=f"Successfully analyzed {request.num_zones} zones. "
                       f"Vegetation coverage: {validation_result.vegetation_percentage:.1f}%"
            )
            
            # Cache the analysis
            self._analysis_cache[analysis_id] = {
                "request": request.dict(),
                "map_response": map_response.dict(),
                "validation": validation_result.to_dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return map_response, analysis_response
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}", exc_info=True)
            return None, SatelliteAnalysisResponse(
                success=False,
                metadata=AnalysisMetadata(
                    analysis_id=analysis_id,
                    timestamp=datetime.utcnow(),
                    source="error",
                    resolution_m=0
                ),
                message=f"Analysis failed: {str(e)}"
            )
    
    def _create_invalid_response(
        self,
        analysis_id: str,
        validation_result: VegetationValidationResult,
        request: SatelliteAnalysisRequest
    ) -> Tuple[None, SatelliteAnalysisResponse]:
        """Create response for invalid/rejected locations."""
        
        return None, SatelliteAnalysisResponse(
            success=False,
            metadata=AnalysisMetadata(
                analysis_id=analysis_id,
                timestamp=datetime.utcnow(),
                source=validation_result.satellite_source,
                resolution_m=10.0,
                cloud_cover_percent=validation_result.cloud_cover_percent,
                image_date=validation_result.analysis_date
            ),
            validation_result=validation_result.to_dict(),
            message=validation_result.message
        )
    
    def _generate_zone_data(
        self,
        num_zones: int,
        validation_result: VegetationValidationResult,
        analysis_date: datetime
    ) -> Tuple[List[float], List[float]]:
        """
        Generate NDVI/NDWI data for zones based on validation result.
        
        Uses the overall vegetation characteristics from validation
        to generate realistic, spatially-correlated zone data.
        """
        base_ndvi = validation_result.ndvi_mean
        ndvi_range = validation_result.ndvi_max - validation_result.ndvi_min
        
        # Seasonal adjustment
        month = analysis_date.month
        if month in [5, 6, 7, 8, 9, 10, 11, 12, 1]:
            seasonal_factor = 1.05
        else:
            seasonal_factor = 0.95
        
        ndvi_data = []
        ndwi_data = []
        
        # Generate spatially correlated data with some stress zones
        prev_ndvi = base_ndvi
        
        for i in range(num_zones):
            # Spatial correlation - nearby zones are similar
            spatial_variation = random.gauss(0, 0.06)
            
            # Occasional stress zones (realistic agricultural pattern)
            stress_probability = 0.2  # 20% chance of stress
            stress_event = random.random() < stress_probability
            
            if stress_event:
                # Simulate stress conditions
                stress_severity = random.choice(["mild", "severe"])
                if stress_severity == "severe":
                    ndvi = random.uniform(0.25, 0.4)
                    ndwi = random.uniform(-0.1, 0.1)
                else:
                    ndvi = random.uniform(0.4, 0.55)
                    ndwi = random.uniform(0.05, 0.2)
            else:
                # Healthy vegetation (70-80% of zones)
                ndvi = (base_ndvi * seasonal_factor + 
                       random.uniform(-0.08, 0.12) + 
                       spatial_variation * 0.5)
                ndwi = random.uniform(0.1, 0.35) + spatial_variation * 0.3
            
            # Add spatial correlation
            ndvi = 0.7 * ndvi + 0.3 * prev_ndvi
            
            # Clamp to valid ranges
            ndvi = max(0.2, min(0.9, ndvi))
            ndwi = max(-0.3, min(0.6, ndwi))
            
            ndvi_data.append(round(ndvi, 3))
            ndwi_data.append(round(ndwi, 3))
            
            prev_ndvi = ndvi
        
        return ndvi_data, ndwi_data
    
    def _calculate_bounds(
        self,
        center_lat: float,
        center_lon: float,
        area_km2: float
    ) -> List[List[float]]:
        """Calculate map bounds for the area."""
        side_km = math.sqrt(area_km2) / 2
        
        # Approximate degree conversion
        lat_offset = side_km / 111
        lon_offset = side_km / (111 * math.cos(math.radians(center_lat)))
        
        sw = [center_lat - lat_offset, center_lon - lon_offset]
        ne = [center_lat + lat_offset, center_lon + lon_offset]
        
        return [sw, ne]
    
    def get_cached_analysis(self, analysis_id: str) -> Optional[Dict]:
        """Retrieve a cached analysis by ID."""
        return self._analysis_cache.get(analysis_id)
    
    @staticmethod
    def calculate_ndvi(nir: float, red: float) -> float:
        """
        Calculate NDVI from NIR and Red bands.
        NDVI = (NIR - Red) / (NIR + Red)
        
        Valid range: -1 to 1
        - Values > 0.3: Vegetation
        - Values > 0.6: Dense vegetation
        - Values < 0: Water
        """
        if (nir + red) == 0:
            return 0
        return (nir - red) / (nir + red)
    
    @staticmethod
    def calculate_ndwi(green: float, nir: float) -> float:
        """
        Calculate NDWI from Green and NIR bands.
        NDWI = (Green - NIR) / (Green + NIR)
        
        Used to detect water stress in vegetation.
        Higher values indicate more water content.
        """
        if (green + nir) == 0:
            return 0
        return (green - nir) / (green + nir)


# Global instance
satellite_analyzer = SatelliteAnalyzer()


def get_satellite_analyzer() -> SatelliteAnalyzer:
    """Get the global satellite analyzer instance."""
    return satellite_analyzer

"""
Vegetation Validation Service.
Validates that selected areas contain sufficient vegetation coverage
for meaningful crop health analysis.

Scientific basis:
- NDVI > 0.3 indicates vegetation presence
- Areas with <90% vegetation coverage should be rejected
- Sea, urban, and barren areas produce invalid crop health metrics
"""

import math
import logging
from datetime import datetime, timedelta
from typing import Tuple, Dict, Optional, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LandCoverType(str, Enum):
    """Land cover classification types."""
    VEGETATION = "vegetation"
    WATER = "water"
    URBAN = "urban"
    BARREN = "barren"
    MIXED = "mixed"
    AGRICULTURAL = "agricultural"


class ValidationStatus(str, Enum):
    """Validation result status."""
    VALID = "VALID"
    INVALID_LOCATION = "INVALID_LOCATION"
    INSUFFICIENT_VEGETATION = "INSUFFICIENT_VEGETATION"
    WATER_BODY = "WATER_BODY"
    URBAN_AREA = "URBAN_AREA"
    CLOUD_COVER_HIGH = "CLOUD_COVER_HIGH"
    NO_DATA = "NO_DATA"


@dataclass
class VegetationValidationResult:
    """Result of vegetation validation check."""
    is_valid: bool
    status: ValidationStatus
    vegetation_percentage: float
    water_percentage: float
    urban_percentage: float
    barren_percentage: float
    dominant_land_cover: LandCoverType
    message: str
    ndvi_mean: float
    ndvi_min: float
    ndvi_max: float
    analysis_date: datetime
    satellite_source: str
    cloud_cover_percent: float
    
    def to_dict(self) -> Dict:
        return {
            "is_valid": self.is_valid,
            "status": self.status.value,
            "vegetation_percentage": round(self.vegetation_percentage, 2),
            "water_percentage": round(self.water_percentage, 2),
            "urban_percentage": round(self.urban_percentage, 2),
            "barren_percentage": round(self.barren_percentage, 2),
            "dominant_land_cover": self.dominant_land_cover.value,
            "message": self.message,
            "ndvi_stats": {
                "mean": round(self.ndvi_mean, 3),
                "min": round(self.ndvi_min, 3),
                "max": round(self.ndvi_max, 3)
            },
            "analysis_date": self.analysis_date.isoformat(),
            "satellite_source": self.satellite_source,
            "cloud_cover_percent": round(self.cloud_cover_percent, 1)
        }


class VegetationValidator:
    """
    Validates vegetation coverage in selected areas.
    
    Uses simulated Sentinel-2 data patterns but designed to integrate with:
    - Google Earth Engine
    - Sentinel Hub API
    - NASA Earthdata
    
    Validation thresholds (scientifically based):
    - NDVI > 0.3: Vegetation present
    - NDVI > 0.5: Dense/healthy vegetation
    - NDVI < 0: Water body
    - NDVI 0-0.2: Urban/barren
    - Minimum vegetation coverage: 90%
    """
    
    # Validation thresholds
    VEGETATION_THRESHOLD = 0.3  # NDVI > 0.3 = vegetation
    WATER_THRESHOLD = 0.0  # NDVI < 0 = water
    URBAN_THRESHOLD = 0.2  # NDVI 0-0.2 = urban/barren
    MIN_VEGETATION_COVERAGE = 90.0  # Minimum 90% vegetation required
    MAX_CLOUD_COVER = 30.0  # Maximum acceptable cloud cover
    
    # Known region characteristics (simulated database)
    # In production, this would come from land cover databases or real-time analysis
    KNOWN_REGIONS = {
        # Sri Lanka agricultural regions
        "udawalawa": {"lat_range": (6.3, 6.6), "lon_range": (80.7, 81.1), "type": LandCoverType.AGRICULTURAL},
        "mahaweli": {"lat_range": (7.0, 8.5), "lon_range": (80.5, 81.5), "type": LandCoverType.AGRICULTURAL},
        "jaffna_peninsula": {"lat_range": (9.4, 9.9), "lon_range": (79.8, 80.4), "type": LandCoverType.AGRICULTURAL},
        "polonnaruwa": {"lat_range": (7.7, 8.2), "lon_range": (80.9, 81.5), "type": LandCoverType.AGRICULTURAL},
        # Urban areas
        "colombo": {"lat_range": (6.85, 6.98), "lon_range": (79.82, 79.92), "type": LandCoverType.URBAN},
        "kandy": {"lat_range": (7.25, 7.35), "lon_range": (80.60, 80.68), "type": LandCoverType.URBAN},
        # Water bodies
        "indian_ocean": {"lat_range": (-10, 8), "lon_range": (70, 82), "type": LandCoverType.WATER},
    }
    
    def __init__(self):
        self._cache: Dict[str, VegetationValidationResult] = {}
    
    def validate_location(
        self,
        lat: float,
        lon: float,
        area_km2: float,
        analysis_date: Optional[datetime] = None
    ) -> VegetationValidationResult:
        """
        Validate if a location is suitable for crop health analysis.
        
        Args:
            lat: Center latitude
            lon: Center longitude
            area_km2: Area to analyze in square kilometers
            analysis_date: Target analysis date (defaults to now)
            
        Returns:
            VegetationValidationResult with validation status
        """
        if analysis_date is None:
            analysis_date = datetime.utcnow()
        
        logger.info(f"Validating location: ({lat}, {lon}), area: {area_km2} km², date: {analysis_date.date()}")
        
        # Simulate satellite data acquisition with date-based selection
        satellite_data = self._fetch_satellite_data(lat, lon, area_km2, analysis_date)
        
        # Calculate land cover percentages
        land_cover = self._analyze_land_cover(satellite_data, lat, lon)
        
        # Determine validation result
        return self._determine_validation_result(
            land_cover,
            satellite_data,
            analysis_date
        )
    
    def _fetch_satellite_data(
        self,
        lat: float,
        lon: float,
        area_km2: float,
        analysis_date: datetime
    ) -> Dict:
        """
        Simulate fetching Sentinel-2 satellite data.
        
        In production, this would:
        1. Query Sentinel Hub or GEE
        2. Filter by date range (analysis_date - 5 days to analysis_date)
        3. Select image with lowest cloud cover
        4. Return actual spectral bands
        
        For simulation, we use location-based heuristics.
        """
        # Determine region characteristics
        region_type = self._identify_region_type(lat, lon)
        
        # Calculate date-based factors (vegetation varies by season)
        seasonal_factor = self._calculate_seasonal_factor(analysis_date, lat)
        
        # Simulate NDVI distribution based on region type
        ndvi_distribution = self._simulate_ndvi_distribution(
            region_type, area_km2, seasonal_factor
        )
        
        # Simulate cloud cover (higher in monsoon season)
        cloud_cover = self._simulate_cloud_cover(analysis_date, lat)
        
        # Calculate image acquisition date (simulating near-real-time delay)
        image_date = analysis_date - timedelta(days=min(5, max(1, int(cloud_cover / 10))))
        
        return {
            "ndvi_values": ndvi_distribution,
            "region_type": region_type,
            "cloud_cover": cloud_cover,
            "image_date": image_date,
            "source": "Sentinel-2 (Simulated)",
            "resolution_m": 10
        }
    
    def _identify_region_type(self, lat: float, lon: float) -> LandCoverType:
        """Identify region type based on coordinates."""
        
        # Check against known regions
        for region_name, region_data in self.KNOWN_REGIONS.items():
            lat_range = region_data["lat_range"]
            lon_range = region_data["lon_range"]
            
            if (lat_range[0] <= lat <= lat_range[1] and 
                lon_range[0] <= lon <= lon_range[1]):
                return region_data["type"]
        
        # Heuristic-based detection for unknown regions
        
        # Check if likely ocean (simple heuristic for Sri Lanka context)
        # Ocean typically has specific coordinate patterns
        if self._is_likely_water_body(lat, lon):
            return LandCoverType.WATER
        
        # Check if likely urban (near major cities)
        if self._is_likely_urban(lat, lon):
            return LandCoverType.URBAN
        
        # Default to mixed for unknown inland areas
        return LandCoverType.MIXED
    
    def _is_likely_water_body(self, lat: float, lon: float) -> bool:
        """
        Check if coordinates likely represent a water body.
        Uses simple geographic heuristics.
        """
        # Indian Ocean boundaries (approximate)
        # West of Sri Lanka
        if lon < 79.5 and 5 < lat < 10:
            return True
        # South of Sri Lanka
        if lat < 5.9 and 79 < lon < 82:
            return True
        # East of Sri Lanka (Bay of Bengal)
        if lon > 82 and 5 < lat < 10:
            return True
        # Open ocean check
        if lat < 0 or lat > 10:  # Outside Sri Lanka latitude range
            if 70 < lon < 100:  # Indian Ocean longitude
                return True
        
        return False
    
    def _is_likely_urban(self, lat: float, lon: float) -> bool:
        """
        Check if coordinates likely represent an urban area.
        """
        # Major Sri Lankan urban centers (approximate)
        urban_centers = [
            (6.93, 79.85, 0.1),   # Colombo
            (7.29, 80.63, 0.05),  # Kandy
            (9.66, 80.01, 0.05),  # Jaffna
            (6.03, 80.22, 0.05),  # Galle
            (7.87, 80.65, 0.03),  # Kurunegala
        ]
        
        for city_lat, city_lon, radius in urban_centers:
            distance = math.sqrt((lat - city_lat)**2 + (lon - city_lon)**2)
            if distance < radius:
                return True
        
        return False
    
    def _calculate_seasonal_factor(self, date: datetime, lat: float) -> float:
        """
        Calculate seasonal vegetation factor.
        Sri Lanka has two monsoon seasons affecting vegetation.
        """
        month = date.month
        
        # Sri Lanka monsoon patterns
        # Southwest monsoon: May-September (wet in southwest)
        # Northeast monsoon: October-January (wet in northeast)
        # Inter-monsoon: February-April
        
        if month in [5, 6, 7, 8, 9]:  # Southwest monsoon
            # High vegetation in southwest, variable in northeast
            return 1.1 if lat < 8 else 0.95
        elif month in [10, 11, 12, 1]:  # Northeast monsoon
            # High vegetation in northeast
            return 1.05 if lat > 7 else 1.0
        else:  # Dry inter-monsoon
            return 0.9
    
    def _simulate_ndvi_distribution(
        self,
        region_type: LandCoverType,
        area_km2: float,
        seasonal_factor: float
    ) -> List[float]:
        """
        Simulate NDVI value distribution for the region.
        Returns list of NDVI values representing pixels in the area.
        """
        import random
        
        # Number of sample points (more for larger areas)
        num_samples = min(1000, max(100, int(area_km2 * 10)))
        
        ndvi_values = []
        
        if region_type == LandCoverType.WATER:
            # Water has negative NDVI
            for _ in range(num_samples):
                ndvi_values.append(random.uniform(-0.5, 0.1))
                
        elif region_type == LandCoverType.URBAN:
            # Urban areas have low NDVI with some vegetation patches
            for _ in range(num_samples):
                if random.random() < 0.2:  # 20% parks/gardens
                    ndvi_values.append(random.uniform(0.3, 0.5))
                else:
                    ndvi_values.append(random.uniform(0.0, 0.25))
                    
        elif region_type == LandCoverType.AGRICULTURAL:
            # Agricultural areas have high NDVI
            base_ndvi = 0.6 * seasonal_factor
            for _ in range(num_samples):
                # 95% vegetation, 5% roads/buildings
                if random.random() < 0.95:
                    ndvi_values.append(random.gauss(base_ndvi, 0.1))
                else:
                    ndvi_values.append(random.uniform(0.1, 0.25))
                    
        elif region_type == LandCoverType.BARREN:
            # Barren land has very low NDVI
            for _ in range(num_samples):
                ndvi_values.append(random.uniform(0.05, 0.2))
                
        else:  # MIXED
            # Mixed areas have variable NDVI
            for _ in range(num_samples):
                roll = random.random()
                if roll < 0.4:  # 40% vegetation
                    ndvi_values.append(random.uniform(0.35, 0.6) * seasonal_factor)
                elif roll < 0.6:  # 20% urban
                    ndvi_values.append(random.uniform(0.05, 0.2))
                elif roll < 0.7:  # 10% water
                    ndvi_values.append(random.uniform(-0.3, 0.05))
                else:  # 30% sparse vegetation
                    ndvi_values.append(random.uniform(0.2, 0.35))
        
        # Clamp values to valid NDVI range
        return [max(-1, min(1, v)) for v in ndvi_values]
    
    def _simulate_cloud_cover(self, date: datetime, lat: float) -> float:
        """Simulate cloud cover percentage based on season."""
        import random
        
        month = date.month
        
        # Higher cloud cover during monsoons
        if month in [5, 6, 7, 8, 9, 10, 11]:
            base_cloud = random.uniform(20, 50)
        else:
            base_cloud = random.uniform(5, 25)
        
        return min(100, max(0, base_cloud))
    
    def _analyze_land_cover(
        self,
        satellite_data: Dict,
        lat: float,
        lon: float
    ) -> Dict:
        """
        Analyze land cover from NDVI distribution.
        """
        ndvi_values = satellite_data["ndvi_values"]
        
        if not ndvi_values:
            return {
                "vegetation_pct": 0,
                "water_pct": 0,
                "urban_pct": 0,
                "barren_pct": 100,
                "ndvi_mean": 0,
                "ndvi_min": 0,
                "ndvi_max": 0
            }
        
        total = len(ndvi_values)
        
        # Classify each pixel
        vegetation_count = sum(1 for v in ndvi_values if v > self.VEGETATION_THRESHOLD)
        water_count = sum(1 for v in ndvi_values if v < self.WATER_THRESHOLD)
        urban_count = sum(1 for v in ndvi_values if self.WATER_THRESHOLD <= v <= self.URBAN_THRESHOLD)
        barren_count = total - vegetation_count - water_count - urban_count
        
        return {
            "vegetation_pct": (vegetation_count / total) * 100,
            "water_pct": (water_count / total) * 100,
            "urban_pct": (urban_count / total) * 100,
            "barren_pct": (barren_count / total) * 100,
            "ndvi_mean": sum(ndvi_values) / total,
            "ndvi_min": min(ndvi_values),
            "ndvi_max": max(ndvi_values)
        }
    
    def _determine_validation_result(
        self,
        land_cover: Dict,
        satellite_data: Dict,
        analysis_date: datetime
    ) -> VegetationValidationResult:
        """
        Determine final validation result based on land cover analysis.
        """
        veg_pct = land_cover["vegetation_pct"]
        water_pct = land_cover["water_pct"]
        urban_pct = land_cover["urban_pct"]
        barren_pct = land_cover["barren_pct"]
        cloud_cover = satellite_data["cloud_cover"]
        
        # Determine dominant land cover
        max_pct = max(veg_pct, water_pct, urban_pct, barren_pct)
        if max_pct == water_pct and water_pct > 50:
            dominant = LandCoverType.WATER
        elif max_pct == urban_pct and urban_pct > 30:
            dominant = LandCoverType.URBAN
        elif max_pct == barren_pct and barren_pct > 40:
            dominant = LandCoverType.BARREN
        elif veg_pct >= self.MIN_VEGETATION_COVERAGE:
            dominant = LandCoverType.AGRICULTURAL
        else:
            dominant = LandCoverType.MIXED
        
        # Check cloud cover first
        if cloud_cover > self.MAX_CLOUD_COVER:
            return VegetationValidationResult(
                is_valid=False,
                status=ValidationStatus.CLOUD_COVER_HIGH,
                vegetation_percentage=veg_pct,
                water_percentage=water_pct,
                urban_percentage=urban_pct,
                barren_percentage=barren_pct,
                dominant_land_cover=dominant,
                message=f"Cloud cover too high ({cloud_cover:.1f}%). Please select a different date or wait for clearer conditions.",
                ndvi_mean=land_cover["ndvi_mean"],
                ndvi_min=land_cover["ndvi_min"],
                ndvi_max=land_cover["ndvi_max"],
                analysis_date=satellite_data["image_date"],
                satellite_source=satellite_data["source"],
                cloud_cover_percent=cloud_cover
            )
        
        # Check for water body
        if water_pct > 50:
            return VegetationValidationResult(
                is_valid=False,
                status=ValidationStatus.WATER_BODY,
                vegetation_percentage=veg_pct,
                water_percentage=water_pct,
                urban_percentage=urban_pct,
                barren_percentage=barren_pct,
                dominant_land_cover=LandCoverType.WATER,
                message=f"Selected area is predominantly water ({water_pct:.1f}%). NDVI/NDWI analysis is not applicable for water bodies. Please select an agricultural region.",
                ndvi_mean=land_cover["ndvi_mean"],
                ndvi_min=land_cover["ndvi_min"],
                ndvi_max=land_cover["ndvi_max"],
                analysis_date=satellite_data["image_date"],
                satellite_source=satellite_data["source"],
                cloud_cover_percent=cloud_cover
            )
        
        # Check for urban area
        if urban_pct > 40 or (urban_pct > 25 and veg_pct < 50):
            return VegetationValidationResult(
                is_valid=False,
                status=ValidationStatus.URBAN_AREA,
                vegetation_percentage=veg_pct,
                water_percentage=water_pct,
                urban_percentage=urban_pct,
                barren_percentage=barren_pct,
                dominant_land_cover=LandCoverType.URBAN,
                message=f"Selected area contains significant urban/built-up land ({urban_pct:.1f}%). Crop health analysis requires agricultural regions. Please select a farming area.",
                ndvi_mean=land_cover["ndvi_mean"],
                ndvi_min=land_cover["ndvi_min"],
                ndvi_max=land_cover["ndvi_max"],
                analysis_date=satellite_data["image_date"],
                satellite_source=satellite_data["source"],
                cloud_cover_percent=cloud_cover
            )
        
        # Check vegetation coverage threshold
        if veg_pct < self.MIN_VEGETATION_COVERAGE:
            return VegetationValidationResult(
                is_valid=False,
                status=ValidationStatus.INSUFFICIENT_VEGETATION,
                vegetation_percentage=veg_pct,
                water_percentage=water_pct,
                urban_percentage=urban_pct,
                barren_percentage=barren_pct,
                dominant_land_cover=dominant,
                message=f"Insufficient vegetation coverage ({veg_pct:.1f}%). Minimum {self.MIN_VEGETATION_COVERAGE}% vegetation required for reliable crop health analysis. The area may contain mixed land use.",
                ndvi_mean=land_cover["ndvi_mean"],
                ndvi_min=land_cover["ndvi_min"],
                ndvi_max=land_cover["ndvi_max"],
                analysis_date=satellite_data["image_date"],
                satellite_source=satellite_data["source"],
                cloud_cover_percent=cloud_cover
            )
        
        # Valid agricultural area
        return VegetationValidationResult(
            is_valid=True,
            status=ValidationStatus.VALID,
            vegetation_percentage=veg_pct,
            water_percentage=water_pct,
            urban_percentage=urban_pct,
            barren_percentage=barren_pct,
            dominant_land_cover=LandCoverType.AGRICULTURAL,
            message=f"Location validated successfully. Vegetation coverage: {veg_pct:.1f}%. Proceeding with crop health analysis.",
            ndvi_mean=land_cover["ndvi_mean"],
            ndvi_min=land_cover["ndvi_min"],
            ndvi_max=land_cover["ndvi_max"],
            analysis_date=satellite_data["image_date"],
            satellite_source=satellite_data["source"],
            cloud_cover_percent=cloud_cover
        )


# Global instance
vegetation_validator = VegetationValidator()


def get_vegetation_validator() -> VegetationValidator:
    """Get the global vegetation validator instance."""
    return vegetation_validator

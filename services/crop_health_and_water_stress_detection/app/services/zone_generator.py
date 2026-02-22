"""
Zone Generator Service.
Generates field zones with health classifications based on satellite/simulated data.
"""

import math
import random
import uuid
from datetime import datetime
from typing import List, Dict, Tuple

from app.schemas.zone import (
    HealthZone,
    HealthZoneCollection,
    ZoneProperties,
    ZoneSummary,
    GeoPolygon,
    GeoCoordinate,
    HealthStatus,
    RiskLevel,
)


class ZoneGenerator:
    """
    Generates agricultural field zones with health classifications.
    Creates GeoJSON-compatible zone data for map visualization.
    """
    
    def __init__(self):
        self.zone_names = [
            "Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F",
            "Zone G", "Zone H", "Zone I", "Zone J", "Zone K", "Zone L"
        ]
    
    def generate_zones(
        self,
        center_lat: float,
        center_lon: float,
        area_km2: float,
        num_zones: int,
        ndvi_data: List[float] = None,
        ndwi_data: List[float] = None
    ) -> Tuple[HealthZoneCollection, ZoneSummary]:
        """
        Generate health zones for the specified area.
        
        Args:
            center_lat: Center latitude of the area
            center_lon: Center longitude of the area
            area_km2: Total area in square kilometers
            num_zones: Number of zones to generate
            ndvi_data: Optional NDVI values for each zone
            ndwi_data: Optional NDWI values for each zone
            
        Returns:
            Tuple of (HealthZoneCollection, ZoneSummary)
        """
        # Generate zone data
        if ndvi_data is None or ndwi_data is None:
            ndvi_data, ndwi_data = self._simulate_vegetation_indices(num_zones)
        
        # Calculate zone layout
        zones = self._create_zone_grid(
            center_lat, center_lon, area_km2, num_zones, ndvi_data, ndwi_data
        )
        
        # Create GeoJSON collection
        zone_collection = HealthZoneCollection(
            type="FeatureCollection",
            features=zones,
            metadata={
                "generated_at": datetime.utcnow().isoformat(),
                "center": {"lat": center_lat, "lon": center_lon},
                "total_area_km2": area_km2
            }
        )
        
        # Calculate summary
        summary = self._calculate_summary(zones)
        
        return zone_collection, summary
    
    def _simulate_vegetation_indices(self, num_zones: int) -> Tuple[List[float], List[float]]:
        """
        Simulate NDVI and NDWI values for zones.
        Creates realistic distribution with some stress zones.
        """
        ndvi_values = []
        ndwi_values = []
        
        for i in range(num_zones):
            # Create varying health levels across zones
            # Most zones healthy, some with stress
            health_roll = random.random()
            
            if health_roll > 0.7:  # 30% chance of stress
                if health_roll > 0.9:  # 10% severe stress
                    ndvi = random.uniform(0.2, 0.4)
                    ndwi = random.uniform(-0.2, 0.1)
                else:  # 20% mild stress
                    ndvi = random.uniform(0.4, 0.55)
                    ndwi = random.uniform(0.0, 0.2)
            else:  # 70% healthy
                ndvi = random.uniform(0.55, 0.85)
                ndwi = random.uniform(0.1, 0.4)
            
            ndvi_values.append(round(ndvi, 3))
            ndwi_values.append(round(ndwi, 3))
        
        return ndvi_values, ndwi_values
    
    def _create_zone_grid(
        self,
        center_lat: float,
        center_lon: float,
        area_km2: float,
        num_zones: int,
        ndvi_data: List[float],
        ndwi_data: List[float]
    ) -> List[HealthZone]:
        """Create a grid of zones around the center point."""
        zones = []
        
        # Calculate grid dimensions
        cols = math.ceil(math.sqrt(num_zones))
        rows = math.ceil(num_zones / cols)
        
        # Calculate zone size
        total_side = math.sqrt(area_km2)  # km
        zone_width = total_side / cols
        zone_height = total_side / rows
        
        # Convert to degrees (approximate)
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 * cos(lat) km
        lat_per_km = 1 / 111
        lon_per_km = 1 / (111 * math.cos(math.radians(center_lat)))
        
        zone_lat_size = zone_height * lat_per_km
        zone_lon_size = zone_width * lon_per_km
        
        # Calculate starting point (top-left corner)
        start_lat = center_lat + (rows / 2) * zone_lat_size
        start_lon = center_lon - (cols / 2) * zone_lon_size
        
        zone_idx = 0
        for row in range(rows):
            for col in range(cols):
                if zone_idx >= num_zones:
                    break
                
                # Calculate zone corners
                top_lat = start_lat - row * zone_lat_size
                bottom_lat = top_lat - zone_lat_size
                left_lon = start_lon + col * zone_lon_size
                right_lon = left_lon + zone_lon_size
                
                # Create polygon coordinates (clockwise from top-left)
                coordinates = [[
                    [left_lon, top_lat],
                    [right_lon, top_lat],
                    [right_lon, bottom_lat],
                    [left_lon, bottom_lat],
                    [left_lon, top_lat]  # Close the polygon
                ]]
                
                # Get health classification
                ndvi = ndvi_data[zone_idx]
                ndwi = ndwi_data[zone_idx]
                health_status, color, risk_level = self._classify_health(ndvi, ndwi)
                
                # Calculate area in hectares
                area_hectares = (zone_width * zone_height) * 100  # 1 km² = 100 hectares
                
                # Create zone
                zone = HealthZone(
                    type="Feature",
                    geometry=GeoPolygon(
                        type="Polygon",
                        coordinates=coordinates
                    ),
                    properties=ZoneProperties(
                        zone_id=str(uuid.uuid4())[:8],
                        name=self.zone_names[zone_idx % len(self.zone_names)],
                        health_status=health_status,
                        color=color,
                        risk_level=risk_level,
                        ndvi=ndvi,
                        ndwi=ndwi,
                        area_hectares=round(area_hectares, 2),
                        confidence=round(random.uniform(0.75, 0.95), 2),
                        recommendation=self._get_recommendation(health_status)
                    )
                )
                
                zones.append(zone)
                zone_idx += 1
        
        return zones
    
    def _classify_health(
        self,
        ndvi: float,
        ndwi: float
    ) -> Tuple[HealthStatus, str, RiskLevel]:
        """
        Classify health status based on NDVI and NDWI values.
        
        Based on research thresholds:
        - NDVI > 0.6 and NDWI > 0: Healthy
        - NDVI 0.4-0.6: Mild stress
        - NDVI < 0.4: Severe stress
        """
        if ndvi > 0.55 and ndwi > 0:
            return HealthStatus.HEALTHY, "#4caf50", RiskLevel.LOW
        elif ndvi > 0.4:
            return HealthStatus.MILD_STRESS, "#ff9800", RiskLevel.MEDIUM
        else:
            return HealthStatus.SEVERE_STRESS, "#f44336", RiskLevel.HIGH
    
    def _get_recommendation(self, health_status: HealthStatus) -> str:
        """Get recommendation based on health status."""
        recommendations = {
            HealthStatus.HEALTHY: "Continue regular monitoring. Maintain current irrigation schedule.",
            HealthStatus.MILD_STRESS: "Increase irrigation frequency. Monitor soil moisture closely. Consider foliar feeding.",
            HealthStatus.SEVERE_STRESS: "Immediate attention required. Check irrigation system. Investigate potential pest/disease issues. Consider emergency water application.",
            HealthStatus.DISEASED: "Apply appropriate treatment. Isolate affected area. Consult agricultural expert."
        }
        return recommendations.get(health_status, "Monitor the area closely.")
    
    def _calculate_summary(self, zones: List[HealthZone]) -> ZoneSummary:
        """Calculate summary statistics for zones."""
        healthy_count = sum(1 for z in zones if z.properties.health_status == HealthStatus.HEALTHY)
        mild_stress_count = sum(1 for z in zones if z.properties.health_status == HealthStatus.MILD_STRESS)
        severe_stress_count = sum(1 for z in zones if z.properties.health_status == HealthStatus.SEVERE_STRESS)
        
        total_area = sum(z.properties.area_hectares for z in zones)
        avg_ndvi = sum(z.properties.ndvi for z in zones) / len(zones) if zones else 0
        avg_ndwi = sum(z.properties.ndwi for z in zones) / len(zones) if zones else 0
        
        return ZoneSummary(
            total_zones=len(zones),
            healthy_count=healthy_count,
            mild_stress_count=mild_stress_count,
            severe_stress_count=severe_stress_count,
            total_area_hectares=round(total_area, 2),
            average_ndvi=round(avg_ndvi, 3),
            average_ndwi=round(avg_ndwi, 3),
            last_updated=datetime.utcnow()
        )


# Global instance
zone_generator = ZoneGenerator()


def get_zone_generator() -> ZoneGenerator:
    """Get the global zone generator instance."""
    return zone_generator

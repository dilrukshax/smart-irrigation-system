"""
Pydantic schemas for zone-related data structures.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


class HealthStatus(str, Enum):
    """Health status enumeration."""
    HEALTHY = "Healthy"
    MILD_STRESS = "Mild Stress"
    SEVERE_STRESS = "Severe Stress"
    DISEASED = "Diseased"


class RiskLevel(str, Enum):
    """Risk level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GeoCoordinate(BaseModel):
    """Geographic coordinate."""
    lat: float = Field(..., description="Latitude")
    lon: float = Field(..., description="Longitude")


class GeoPolygon(BaseModel):
    """GeoJSON polygon geometry."""
    type: str = Field(default="Polygon", description="GeoJSON type")
    coordinates: List[List[List[float]]] = Field(..., description="Polygon coordinates")


class ZoneProperties(BaseModel):
    """Properties for a health zone."""
    zone_id: str = Field(..., description="Unique zone identifier")
    name: str = Field(..., description="Zone name")
    health_status: HealthStatus = Field(..., description="Health status classification")
    color: str = Field(..., description="Color code for visualization")
    risk_level: RiskLevel = Field(..., description="Risk level")
    ndvi: float = Field(..., description="Normalized Difference Vegetation Index")
    ndwi: float = Field(..., description="Normalized Difference Water Index")
    area_hectares: float = Field(..., description="Zone area in hectares")
    confidence: float = Field(..., description="Classification confidence score")
    recommendation: Optional[str] = Field(None, description="Recommended action")


class HealthZone(BaseModel):
    """Complete health zone with geometry and properties."""
    type: str = Field(default="Feature", description="GeoJSON feature type")
    geometry: GeoPolygon = Field(..., description="Zone boundary polygon")
    properties: ZoneProperties = Field(..., description="Zone properties")


class HealthZoneCollection(BaseModel):
    """Collection of health zones (GeoJSON FeatureCollection)."""
    type: str = Field(default="FeatureCollection", description="GeoJSON type")
    features: List[HealthZone] = Field(..., description="List of health zones")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class ZoneSummary(BaseModel):
    """Summary statistics for zones."""
    total_zones: int = Field(..., description="Total number of zones")
    healthy_count: int = Field(..., description="Number of healthy zones")
    mild_stress_count: int = Field(..., description="Number of mild stress zones")
    severe_stress_count: int = Field(..., description="Number of severe stress zones")
    total_area_hectares: float = Field(..., description="Total monitored area")
    average_ndvi: float = Field(..., description="Average NDVI across zones")
    average_ndwi: float = Field(..., description="Average NDWI across zones")
    last_updated: datetime = Field(..., description="Last update timestamp")


class HealthMapResponse(BaseModel):
    """Response for health status map API."""
    zones: HealthZoneCollection = Field(..., description="Health zones GeoJSON")
    summary: ZoneSummary = Field(..., description="Zone statistics summary")
    center: GeoCoordinate = Field(..., description="Map center point")
    bounds: Optional[List[List[float]]] = Field(None, description="Map bounds [[sw_lat, sw_lon], [ne_lat, ne_lon]]")
    validation: Optional[dict] = Field(
        None, 
        description="Vegetation validation result showing coverage analysis"
    )

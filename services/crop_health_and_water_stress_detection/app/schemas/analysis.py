"""
Pydantic schemas for satellite analysis request/response.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SatelliteAnalysisRequest(BaseModel):
    """Request for satellite-based health analysis."""
    lat: float = Field(..., ge=-90, le=90, description="Center latitude")
    lon: float = Field(..., ge=-180, le=180, description="Center longitude")
    area_km2: float = Field(default=10.0, gt=0, le=100, description="Area to analyze in square kilometers")
    num_zones: int = Field(default=6, ge=1, le=20, description="Number of zones to divide into")
    analysis_date: Optional[datetime] = Field(
        default=None, 
        description="Date for satellite image selection (defaults to current date)"
    )
    include_ndvi: bool = Field(default=True, description="Include NDVI calculation")
    include_ndwi: bool = Field(default=True, description="Include NDWI calculation")


class SatelliteDataPoint(BaseModel):
    """Simulated satellite data point."""
    ndvi: float = Field(..., ge=-1, le=1, description="NDVI value")
    ndwi: float = Field(..., ge=-1, le=1, description="NDWI value")
    temperature: Optional[float] = Field(None, description="Surface temperature in Celsius")
    moisture: Optional[float] = Field(None, ge=0, le=100, description="Soil moisture percentage")


class AnalysisMetadata(BaseModel):
    """Metadata for satellite analysis."""
    analysis_id: str = Field(..., description="Unique analysis ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")
    source: str = Field(default="simulated", description="Data source (simulated/sentinel/landsat)")
    resolution_m: float = Field(default=10.0, description="Spatial resolution in meters")
    cloud_cover_percent: Optional[float] = Field(None, description="Cloud cover percentage")
    image_date: Optional[datetime] = Field(
        None, 
        description="Date of the satellite image used for analysis"
    )


class SatelliteAnalysisResponse(BaseModel):
    """Response for satellite analysis."""
    success: bool = Field(..., description="Analysis success status")
    metadata: AnalysisMetadata = Field(..., description="Analysis metadata")
    message: str = Field(..., description="Status message")
    validation_result: Optional[Dict[str, Any]] = Field(
        None,
        description="Vegetation validation result (null if validation skipped)"
    )

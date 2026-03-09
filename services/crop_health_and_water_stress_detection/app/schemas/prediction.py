"""
Pydantic schemas for prediction-related data structures.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ImagePredictionResponse(BaseModel):
    """Response for image prediction API."""
    predicted_class: str = Field(..., description="Predicted class label")
    confidence: float = Field(..., ge=0, le=1, description="Prediction confidence score")
    health_status: str = Field(..., description="Health status (Healthy/Diseased/etc.)")
    severity: str = Field(..., description="Severity level (none/moderate/high)")
    color: str = Field(..., description="Color code for visualization")
    risk_level: str = Field(..., description="Risk level (low/medium/high)")
    recommendation: str = Field(..., description="Recommended action")
    model_used: bool = Field(..., description="Whether trained model was used")
    model_name: Optional[str] = Field(default=None, description="Model name")
    model_version: Optional[str] = Field(default=None, description="Model version")
    input_contract_version: Optional[str] = Field(default=None, description="Input contract version")
    features_used_count: Optional[int] = Field(default=None, description="Count of features used during inference")
    status: str = Field(default="ok", description="ok|stale|data_unavailable|analysis_pending|source_unavailable")
    source: str = Field(default="crop_health_model")
    is_live: bool = Field(default=True)
    observed_at: Optional[str] = Field(default=None)
    staleness_sec: Optional[float] = Field(default=0.0)
    quality: str = Field(default="good")
    data_available: bool = Field(default=True, description="Whether inference data was available")
    message: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Prediction timestamp")


class BatchPredictionRequest(BaseModel):
    """Request for batch prediction."""
    image_urls: list[str] = Field(..., description="List of image URLs to process")


class PredictionHistoryItem(BaseModel):
    """Historical prediction record."""
    id: str = Field(..., description="Prediction ID")
    image_name: str = Field(..., description="Original image filename")
    predicted_class: str = Field(..., description="Predicted class")
    confidence: float = Field(..., description="Confidence score")
    health_status: str = Field(..., description="Health status")
    timestamp: datetime = Field(..., description="Prediction timestamp")

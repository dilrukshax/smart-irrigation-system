"""
Image Prediction API Routes.
Endpoints for manual image upload and crop disease/stress prediction.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from PIL import Image
import io
import logging
from datetime import datetime
from typing import Optional
import uuid

from app.schemas.prediction import ImagePredictionResponse
from app.models.crop_health_model import get_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/crop-health", tags=["Image Prediction"])


@router.post(
    "/predict",
    response_model=ImagePredictionResponse,
    summary="Predict crop health from image",
    description="Upload an image of a crop/plant and get health prediction using the trained MobileNet model."
)
async def predict_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG)")
):
    """
    Predict crop health from an uploaded image.
    
    The model analyzes the image and returns:
    - Predicted class (disease type or healthy)
    - Confidence score
    - Health status
    - Severity level
    - Recommended actions
    
    Supported formats: JPEG, PNG, WebP
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: JPEG, PNG, WebP. Got: {file.content_type}"
        )
    
    try:
        # Read image content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file received"
            )
        
        # Open and validate image
        try:
            img = Image.open(io.BytesIO(content)).convert("RGB")
        except Exception as e:
            logger.error(f"Image open error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file. Could not decode image."
            )
        
        # Get model and run prediction
        model = get_model()
        result = model.predict(img)
        
        # Create response
        response = ImagePredictionResponse(
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            health_status=result["health_status"],
            severity=result["severity"],
            color=result["color"],
            risk_level=result["risk_level"],
            recommendation=result["recommendation"],
            model_used=result["model_used"],
            timestamp=datetime.utcnow()
        )
        
        logger.info(f"Prediction completed: {result['predicted_class']} ({result['confidence']:.2%})")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post(
    "/predict/url",
    response_model=ImagePredictionResponse,
    summary="Predict from image URL",
    description="Predict crop health from an image URL."
)
async def predict_from_url(
    image_url: str = Form(..., description="URL of the image to analyze")
):
    """
    Predict crop health from an image URL.
    
    Fetches the image from the provided URL and runs prediction.
    """
    import httpx
    
    try:
        # Fetch image from URL
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=30.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch image from URL. Status: {response.status_code}"
                )
            
            content = response.content
        
        # Open and validate image
        try:
            img = Image.open(io.BytesIO(content)).convert("RGB")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image at URL. Could not decode image."
            )
        
        # Get model and run prediction
        model = get_model()
        result = model.predict(img)
        
        return ImagePredictionResponse(
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            health_status=result["health_status"],
            severity=result["severity"],
            color=result["color"],
            risk_level=result["risk_level"],
            recommendation=result["recommendation"],
            model_used=result["model_used"],
            timestamp=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"URL prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.get(
    "/model/status",
    summary="Get model status",
    description="Check if the ML model is loaded and ready for predictions."
)
async def get_model_status():
    """Get the current status of the prediction model."""
    model = get_model()
    
    return {
        "model_loaded": model.loaded,
        "model_path": model.model_path,
        "image_size": model.img_size,
        "num_classes": len(model.class_labels),
        "status": "ready" if model.loaded else "fallback_mode"
    }


@router.get(
    "/model/classes",
    summary="Get model classes",
    description="Get the list of classes the model can predict."
)
async def get_model_classes():
    """Get the list of prediction classes."""
    model = get_model()
    
    return {
        "num_classes": len(model.class_labels),
        "classes": model.class_labels
    }

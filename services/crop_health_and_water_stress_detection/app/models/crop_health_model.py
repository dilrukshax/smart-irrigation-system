"""
Machine Learning Model Handler for Crop Health Detection.
Loads and manages the MobileNetV2 model for crop damage classification.
"""

import os
import logging
import numpy as np
from PIL import Image
from typing import Dict, Optional, Tuple, List
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image as keras_image

from app.core.config import settings

logger = logging.getLogger(__name__)


# Class labels from PlantVillage dataset (common crop diseases)
# These are typical classes from the PlantVillage dataset
CLASS_LABELS = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]

# Map class labels to health status
HEALTH_STATUS_MAP = {
    "healthy": {
        "status": "Healthy",
        "severity": "none",
        "color": "#4caf50",
        "risk_level": "low"
    },
    "disease": {
        "status": "Diseased",
        "severity": "moderate",
        "color": "#ff9800",
        "risk_level": "medium"
    },
    "severe_disease": {
        "status": "Severe Disease",
        "severity": "high",
        "color": "#f44336",
        "risk_level": "high"
    }
}


class CropHealthModel:
    """
    Crop Health Detection Model using MobileNetV2.
    Handles model loading, preprocessing, and inference.
    """
    
    def __init__(self):
        self.model: Optional[tf.keras.Model] = None
        self.loaded = False
        self.img_size = settings.IMG_SIZE
        self.model_path = settings.MODEL_PATH
        self.class_labels = CLASS_LABELS
        
    def load_model(self) -> bool:
        """
        Load the trained MobileNetV2 model from disk.
        Returns True if successful, False otherwise.
        """
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Loading model from {self.model_path}")
                self.model = load_model(self.model_path)
                self.loaded = True
                logger.info("Model loaded successfully")
                
                # Get number of classes from model output shape
                output_shape = self.model.output_shape
                if output_shape and len(output_shape) > 1:
                    num_classes = output_shape[-1]
                    logger.info(f"Model has {num_classes} output classes")
                    # Adjust class labels if needed
                    if num_classes != len(self.class_labels):
                        logger.warning(f"Model classes ({num_classes}) != defined labels ({len(self.class_labels)})")
                        # Create generic labels if mismatch
                        self.class_labels = [f"Class_{i}" for i in range(num_classes)]
                
                return True
            else:
                logger.warning(f"Model file not found at {self.model_path}")
                logger.info("Using fallback prediction mode")
                self.loaded = False
                return False
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.loaded = False
            return False
    
    def preprocess_image(self, img: Image.Image) -> np.ndarray:
        """
        Preprocess image for model inference.
        
        Args:
            img: PIL Image object
            
        Returns:
            Preprocessed numpy array ready for model
        """
        # Resize to model input size
        img = img.resize((self.img_size, self.img_size))
        
        # Convert to numpy array
        img_array = keras_image.img_to_array(img)
        
        # Normalize to [0, 1]
        img_array = img_array / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, img: Image.Image) -> Dict:
        """
        Run prediction on an image.
        
        Args:
            img: PIL Image object (RGB)
            
        Returns:
            Dictionary with prediction results
        """
        # Preprocess image
        processed_img = self.preprocess_image(img)
        
        if self.loaded and self.model is not None:
            # Run model inference
            predictions = self.model.predict(processed_img, verbose=0)
            
            # Get predicted class
            class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][class_idx])
            
            # Get class label
            if class_idx < len(self.class_labels):
                class_label = self.class_labels[class_idx]
            else:
                class_label = f"Unknown_Class_{class_idx}"
            
            # Determine health status
            health_info = self._get_health_status(class_label, confidence)
            
        else:
            # Fallback: Use image analysis heuristics
            logger.warning("Model not loaded, using fallback prediction")
            class_label, confidence, health_info = self._fallback_prediction(img)
        
        # Extract disease name (post-processing)
        disease_name = self._extract_disease_name(class_label)
        crop_type = self._extract_crop_type(class_label)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(class_label, health_info)
        
        return {
            "predicted_class": class_label,
            "disease_name": disease_name,  # Clean disease name
            "crop_type": crop_type,  # Extracted crop type
            "confidence": round(confidence, 4),
            "health_status": health_info["status"],
            "severity": health_info["severity"],
            "color": health_info["color"],
            "risk_level": health_info["risk_level"],
            "recommendation": recommendation,
            "model_used": self.loaded
        }
    
    def _extract_disease_name(self, class_label: str) -> str:
        """
        Extract clean disease name from class label.
        
        Examples:
            "Pepper,_bell___Bacterial_spot" -> "Bacterial Spot"
            "Tomato___Early_blight" -> "Early Blight"
            "Apple___healthy" -> "Healthy"
            "Corn_(maize)___Common_rust_" -> "Common Rust"
        """
        # Handle fallback labels that don't have the separator
        if "___" not in class_label:
            # Clean up fallback labels
            clean = class_label.replace("_", " ").strip()
            return clean.title()
        
        # Split by triple underscore to separate crop from disease
        parts = class_label.split("___")
        
        if len(parts) < 2:
            return class_label.replace("_", " ").title()
        
        # Get the disease part (after the separator)
        disease_part = parts[1]
        
        # Clean up the disease name
        disease_name = disease_part.replace("_", " ").strip()
        
        # Remove trailing underscores or spaces
        disease_name = disease_name.rstrip("_ ")
        
        # Handle special cases
        special_replacements = {
            "Two spotted spider mite": "Two-Spotted Spider Mite",
            "Gray leaf spot": "Gray Leaf Spot",
            "Cercospora leaf spot": "Cercospora Leaf Spot",
            "Isariopsis Leaf Spot": "Isariopsis Leaf Spot",
            "Black Measles": "Black Measles (Esca)",
            "Citrus greening": "Citrus Greening (Huanglongbing)",
        }
        
        # Apply title case
        disease_name = disease_name.title()
        
        # Apply special replacements
        for old, new in special_replacements.items():
            if old.lower() in disease_name.lower():
                disease_name = new
                break
        
        return disease_name
    
    def _extract_crop_type(self, class_label: str) -> str:
        """
        Extract crop type from class label.
        
        Examples:
            "Pepper,_bell___Bacterial_spot" -> "Bell Pepper"
            "Tomato___Early_blight" -> "Tomato"
            "Corn_(maize)___Common_rust_" -> "Corn (Maize)"
        """
        # Handle fallback labels
        if "___" not in class_label:
            return "Unknown"
        
        # Split by triple underscore
        parts = class_label.split("___")
        
        if len(parts) < 1 or not parts[0]:
            return "Unknown"
        
        crop_part = parts[0]
        
        # Clean up the crop name
        crop_name = crop_part.replace("_", " ").strip()
        crop_name = crop_name.replace(",", "").strip()
        
        # Handle special cases
        special_crops = {
            "Pepper bell": "Bell Pepper",
            "Corn (maize)": "Corn (Maize)",
            "Cherry (including sour)": "Cherry",
        }
        
        # Apply title case
        crop_name = crop_name.title()
        
        # Apply special replacements
        for old, new in special_crops.items():
            if old.lower() in crop_name.lower():
                crop_name = new
                break
        
        return crop_name
    
    def _get_health_status(self, class_label: str, confidence: float) -> Dict:
        """Determine health status from class label."""
        class_lower = class_label.lower()
        
        if "healthy" in class_lower:
            return HEALTH_STATUS_MAP["healthy"]
        elif any(severe in class_lower for severe in ["blight", "rot", "virus", "greening"]):
            return HEALTH_STATUS_MAP["severe_disease"]
        else:
            return HEALTH_STATUS_MAP["disease"]
    
    def _fallback_prediction(self, img: Image.Image) -> Tuple[str, float, Dict]:
        """
        Fallback prediction using image analysis when model is not available.
        Uses color analysis to estimate crop health.
        """
        # Convert to numpy array
        img_array = np.array(img)
        
        # Calculate green channel ratio (healthy plants have more green)
        if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
            r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
            
            # Calculate vegetation index-like metric
            green_ratio = np.mean(g) / (np.mean(r) + np.mean(g) + np.mean(b) + 1)
            
            # Calculate color variance (stress often shows as discoloration)
            color_variance = np.var(img_array)
            
            # Simple classification based on green ratio
            if green_ratio > 0.38:
                class_label = "Healthy_Vegetation"
                confidence = min(0.85, 0.5 + green_ratio)
                health_info = HEALTH_STATUS_MAP["healthy"]
            elif green_ratio > 0.32:
                class_label = "Mild_Stress"
                confidence = 0.7
                health_info = HEALTH_STATUS_MAP["disease"]
            else:
                class_label = "Severe_Stress"
                confidence = 0.75
                health_info = HEALTH_STATUS_MAP["severe_disease"]
        else:
            class_label = "Unknown"
            confidence = 0.5
            health_info = HEALTH_STATUS_MAP["disease"]
        
        return class_label, confidence, health_info
    
    def _generate_recommendation(self, class_label: str, health_info: Dict) -> str:
        """Generate actionable recommendation based on prediction."""
        class_lower = class_label.lower()
        
        if "healthy" in class_lower:
            return "Crop appears healthy. Continue regular monitoring and maintenance."
        
        recommendations = {
            "blight": "Apply appropriate fungicide treatment. Remove and destroy affected leaves. Improve air circulation.",
            "rot": "Remove affected plant parts. Improve drainage. Apply copper-based fungicide.",
            "rust": "Apply fungicide spray. Remove infected leaves. Avoid overhead watering.",
            "spot": "Apply fungicide treatment. Remove infected leaves. Ensure proper spacing.",
            "mildew": "Apply sulfur-based fungicide. Improve air circulation. Reduce humidity.",
            "virus": "Remove and destroy infected plants. Control insect vectors. Use virus-resistant varieties.",
            "scab": "Apply fungicide early in season. Remove fallen leaves. Prune for air circulation.",
            "mold": "Reduce humidity. Improve ventilation. Apply appropriate fungicide.",
            "stress": "Check soil moisture levels. Adjust irrigation schedule. Monitor for pest damage.",
            "deficiency": "Conduct soil test. Apply appropriate fertilizer. Check pH levels."
        }
        
        for keyword, rec in recommendations.items():
            if keyword in class_lower:
                return rec
        
        # Default recommendation based on severity
        if health_info["severity"] == "high":
            return "Immediate attention required. Consult agricultural expert. Consider applying broad-spectrum treatment."
        elif health_info["severity"] == "moderate":
            return "Monitor closely. Consider preventive treatment. Check environmental conditions."
        else:
            return "Continue regular monitoring. Maintain good agricultural practices."


# Global model instance
crop_health_model = CropHealthModel()


def get_model() -> CropHealthModel:
    """Get the global model instance."""
    return crop_health_model

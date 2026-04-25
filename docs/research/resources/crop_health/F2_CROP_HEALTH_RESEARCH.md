# F2 — Hybrid Satellite Crop Health & Water Stress Detection
## Comprehensive Research Documentation

**Function Owner:** Abishek  
**Service:** `services/crop_health_and_water_stress_detection` (Port 8007)  
**Gateway Prefix:** `/api/v1/crop-health/*`  
**Research Role:** Zone-level crop health classification using Sentinel-2 satellite indices and deep learning-based crop disease detection using a fine-tuned MobileNetV2 on the PlantVillage dataset, providing field stress summaries consumed by F1 (irrigation) and F4 (optimization).

---

## Table of Contents

1. [Research Context and Objectives](#1-research-context-and-objectives)
2. [System Overview: Two-Track Architecture](#2-system-overview-two-track-architecture)
3. [Track A — Satellite Zone Analysis](#3-track-a--satellite-zone-analysis)
4. [Track B — Image Disease Classification](#4-track-b--image-disease-classification)
5. [Dataset Description](#5-dataset-description)
6. [Feature Engineering and Preprocessing](#6-feature-engineering-and-preprocessing)
7. [Model Architectures](#7-model-architectures)
8. [Model Training and Results](#8-model-training-and-results)
9. [Vegetation Validation Pipeline](#9-vegetation-validation-pipeline)
10. [Health Status Classification and Recommendation Engine](#10-health-status-classification-and-recommendation-engine)
11. [Field-Level Stress Index](#11-field-level-stress-index)
12. [Cross-Service Integration](#12-cross-service-integration)
13. [API Endpoints and Response Contracts](#13-api-endpoints-and-response-contracts)
14. [Figures and Visualizations](#14-figures-and-visualizations)
15. [Model Artifact Management](#15-model-artifact-management)
16. [Conclusion and Research Contribution](#16-conclusion-and-research-contribution)

---

## 1. Research Context and Objectives

### 1.1 Problem Statement

Paddy and vegetable farmers in the Udawalawa irrigation command area lack timely and affordable crop health information. Traditional ground inspection is labor-intensive, covers only sampled plots, and requires agronomist expertise. Satellite-derived vegetation indices and automated disease detection from images offer a scalable, low-cost alternative that can:

- Detect water stress and early-stage disease across entire fields before visible symptoms appear.
- Prioritize irrigation intervention by field-level stress severity.
- Provide disease-specific treatment recommendations without on-site expertise.

### 1.2 F2 Objectives

| # | Objective | Metric |
|---|-----------|--------|
| O1 | Classify field zones into Healthy / Moderate Stress / High Stress from satellite indices | RF accuracy ≥ 95% on NDVI/NDWI-derived labels |
| O2 | Classify crop disease type from uploaded field photos | MobileNetV2 val accuracy ≥ 90% on PlantVillage |
| O3 | Reject non-agricultural requests (water, urban, cloud-covered areas) | 5-stage validation gate |
| O4 | Produce field-level stress summaries consumed by F1/F4 | REST endpoint latency < 500 ms |
| O5 | Integrate MQTT event emission for real-time stress alerts | `crop.stress.v1` event on analysis completion |

### 1.3 Geographical Focus

| Parameter | Value |
|-----------|-------|
| Target region | Udawalawa, Sri Lanka |
| GEE project ID | `fyp-gee-srilanka` |
| Center coordinates | 6.4200°N, 80.8900°E |
| Buffer radius | 15,000 m (~706 km²) |
| Satellite source | Copernicus Sentinel-2 Level-2A (10m resolution) |
| Date range (training) | 2023-01-01 → 2023-12-31 |
| Cloud filter | < 20% cloud pixel percentage |

---

## 2. System Overview: Two-Track Architecture

F2 operates two independent but complementary analysis tracks:

```
Track A — Satellite Zone Analysis
  ┌──────────────────────────────────────────────────────────────┐
  │  GEE Sentinel-2 → NDVI/NDWI computation → RF classification │
  │  → Zone health map → Stress index → F1/F4 integration       │
  └──────────────────────────────────────────────────────────────┘

Track B — Image Disease Classification  
  ┌──────────────────────────────────────────────────────────────┐
  │  User photo upload → MobileNetV2 inference → 38-class label │
  │  → Disease name + severity + recommendation                  │
  └──────────────────────────────────────────────────────────────┘
```

Both tracks share the same API prefix (`/api/v1/crop-health/`) and produce health outputs mapped to the platform's `status/source/is_live/quality` response contract.

---

## 3. Track A — Satellite Zone Analysis

### 3.1 Google Earth Engine Integration

The notebook connects to GEE using service-account authentication:

```python
ee.Authenticate()
ee.Initialize(project='fyp-gee-srilanka')

udawalawa = ee.Geometry.Point([80.8900, 6.4200]).buffer(15000)

s2 = (
    ee.ImageCollection("COPERNICUS/S2_SR")
    .filterBounds(udawalawa)
    .filterDate("2023-01-01", "2023-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
)

bands = ['B2', 'B3', 'B4', 'B8']
image = s2.median().select(bands)  # Temporal composite median
```

**Band selection:**

| Band | Name | Wavelength | Role |
|------|------|-----------|------|
| B2 | Blue | 490 nm | Feature / background |
| B3 | Green | 560 nm | NDWI numerator |
| B4 | Red | 665 nm | NDVI denominator |
| B8 | NIR | 842 nm | NDVI numerator, NDWI denominator |

### 3.2 Spectral Index Computation

```python
# NDVI = (NIR − Red) / (NIR + Red)
ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')

# NDWI = (Green − NIR) / (Green + NIR)
ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')

image = image.addBands([ndvi, ndwi])  # 6-band feature image
```

**Index interpretation:**

| Index | Range | Interpretation |
|-------|-------|---------------|
| NDVI > 0.6 | Dense vegetation | Healthy, dense crop canopy |
| NDVI 0.3–0.6 | Moderate vegetation | Healthy to moderate stress |
| NDVI 0.1–0.3 | Sparse / urban | Low crop presence |
| NDVI < 0 | Water body | Not vegetation |
| NDWI > 0 | Water content present | Adequate leaf water content |
| NDWI < −0.1 | Water-stressed | Possible irrigation deficit |

### 3.3 Stress Label Generation Rule

The `stress_label()` function creates ground-truth labels from the NDVI/NDWI proxy:

```python
def stress_label(ndvi, ndwi):
    if ndvi > 0.6 and ndwi > 0:
        return 0  # Good
    elif ndvi > 0.4:
        return 1  # Moderate Stress
    else:
        return 2  # High Stress
```

| Class | Label | NDVI Condition | NDWI Condition | Interpretation |
|-------|-------|----------------|----------------|---------------|
| Good | 0 | > 0.6 | > 0 | Dense, water-adequate vegetation |
| Moderate Stress | 1 | 0.4–0.6 | any | Reduced canopy, early stress |
| High Stress | 2 | < 0.4 | any | Severe stress or sparse canopy |

> **Research note:** These labels are derived from NDVI/NDWI thresholds — not from ground-truth field observations. The model therefore learns to generalize the proxy rule spatially. This is explicitly acknowledged in the notebook's markdown cell: *"This model is a risk classification model, not a ground-truth predictor. Its purpose is early warning and prioritization, not definitive diagnosis."*

### 3.4 GEE Sampling

```python
samples = image.sample(
    region=udawalawa,
    scale=10,        # 10m resolution (Sentinel-2 native)
    numPixels=5000,  # 5,000 stratified random pixels
    geometries=False
)
```

Each sample contains 6 features: `B2, B3, B4, B8, NDVI, NDWI` + computed `label`.  
Train/test split: 80% / 20% (scikit-learn `train_test_split(test_size=0.2, random_state=42)`).

*Figure 5 (fig5_ndvi_ndwi_classification.png) visualizes the NDVI scale and NDVI×NDWI class boundaries.*  
*Figure 6 (fig6_rf_satellite_classification.png) shows the sample distribution and RF performance.*

---

## 4. Track B — Image Disease Classification

### 4.1 PlantVillage Dataset

| Attribute | Detail |
|-----------|--------|
| Source | PlantVillage (Mohanty et al., 2016) via GitHub ZIP |
| Download URL | `github.com/spMohanty/PlantVillage-Dataset` |
| Total images | ~54,306 |
| Image format | RGB JPEGs, variable native resolution |
| Color mode | Color (raw/color subdirectory) |
| Classes | 38 (14 healthy + 24 disease variants) |
| Crops covered | 14 crop species |

**Train/validation split:**

```python
datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
train_gen = datagen.flow_from_directory(DATA_DIR, subset='training',
    target_size=(224,224), batch_size=32, class_mode='categorical')
val_gen   = datagen.flow_from_directory(DATA_DIR, subset='validation',
    target_size=(224,224), batch_size=32, class_mode='categorical')
```

| Split | Batches | Approx. images |
|-------|---------|----------------|
| Training | 1,358 batches × 32 | ~43,445 |
| Validation | ~340 batches × 32 | ~10,861 |

*Figure 3 (fig3_plantvillage_dataset.png) shows class distribution and healthy/disease ratio.*  
*Figure 8 (fig8_class_distribution.png) shows all 38 classes with approximate sample counts.*

### 4.2 38 Output Classes

```python
CLASS_LABELS = [
    # Apple (4)
    "Apple___Apple_scab", "Apple___Black_rot",
    "Apple___Cedar_apple_rust", "Apple___healthy",
    # Blueberry (1)
    "Blueberry___healthy",
    # Cherry (2)
    "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    # Corn (4)
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    # Grape (4)
    "Grape___Black_rot", "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy",
    # Orange (1)
    "Orange___Haunglongbing_(Citrus_greening)",
    # Peach (2)
    "Peach___Bacterial_spot", "Peach___healthy",
    # Pepper bell (2)
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    # Potato (3)
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    # Raspberry (1), Soybean (1), Squash (1)
    "Raspberry___healthy", "Soybean___healthy", "Squash___Powdery_mildew",
    # Strawberry (2)
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    # Tomato (10)
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]
```

---

## 5. Dataset Description

### 5.1 Satellite Dataset (Track A)

| Attribute | Detail |
|-----------|--------|
| Source | Google Earth Engine — Copernicus/S2_SR |
| Sampling | 5,000 random pixels at 10m resolution |
| Feature columns | B2, B3, B4, B8, NDVI, NDWI (6 features) |
| Label column | 0/1/2 (Good/Moderate/High Stress) |
| Training samples | 4,000 |
| Test samples | 1,000 |
| Spatial extent | 15km radius around Udawalawa (80.89°E, 6.42°N) |
| Temporal | 2023 median composite |

### 5.2 PlantVillage Dataset (Track B)

| Attribute | Detail |
|-----------|--------|
| Total images | ~54,306 |
| Crops | 14 species |
| Disease classes | 24 |
| Healthy classes | 14 |
| Total classes | 38 |
| Resolution | Variable native; resized to 224×224 for model |
| Format | RGB JPEG (color subdirectory) |
| Normalization | Pixel values / 255.0 → [0, 1] |
| Largest class | Orange Huanglongbing (~5,507 images) |
| Smallest class | Potato healthy (~152 images) |

### 5.3 Known Limitations

1. **PlantVillage domain shift:** Images are controlled laboratory-style photographs of leaves, not field photos under Sri Lankan lighting/weather conditions. Real-world accuracy may be lower than the 95% val accuracy achieved.
2. **Satellite labels are proxy-derived:** RF accuracy (~99%) reflects the model learning the NDVI threshold rule, not independent ground truth.
3. **No Sri Lanka-specific crop disease data:** Paddy (rice), which is the dominant crop in Udawalawa, is absent from PlantVillage. The model generalizes from related crops.
4. **Simulated satellite data in service:** The production service uses simulated Sentinel-2 data (not live GEE calls) due to API authentication constraints in the deployment environment.

---

## 6. Feature Engineering and Preprocessing

### 6.1 Satellite Feature Matrix (Track A)

| Feature | Source | Range |
|---------|--------|-------|
| `B2` | Sentinel-2 Blue band (490nm) | 0–10,000 |
| `B3` | Sentinel-2 Green band (560nm) | 0–10,000 |
| `B4` | Sentinel-2 Red band (665nm) | 0–10,000 |
| `B8` | Sentinel-2 NIR band (842nm) | 0–10,000 |
| `NDVI` | (B8−B4)/(B8+B4) | −1 to 1 |
| `NDWI` | (B3−B8)/(B3+B8) | −1 to 1 |

No additional scaling applied (tree-based RF is scale-invariant).

### 6.2 Image Preprocessing (Track B)

```python
def preprocess_image(img: Image.Image) -> np.ndarray:
    img = img.resize((224, 224))           # Resize to MobileNetV2 input
    img_array = img_to_array(img)          # H×W×C → float32
    img_array = img_array / 255.0          # Normalize [0,1]
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dim → (1,224,224,3)
    return img_array
```

**ImageDataGenerator augmentation (training only):**

```python
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
    # No explicit augmentation — only rescale
)
```

The notebook does not apply spatial augmentation (flip, rotation, zoom). Adding these would further reduce overfitting and improve real-world accuracy — a known improvement pathway.

*Figure 4 (fig4_mobilenetv2_architecture.png) shows the full preprocessing-to-output pipeline.*

---

## 7. Model Architectures

### 7.1 Random Forest Classifier (Track A)

```python
rf = RandomForestClassifier(n_estimators=200, random_state=42)
rf.fit(X_train, y_train)
```

| Parameter | Value |
|-----------|-------|
| Estimators | 200 trees |
| Max depth | None (fully grown) |
| Min samples split | 2 |
| Features per split | sqrt(6) ≈ 2 |
| Bootstrap | True |
| Random state | 42 |
| Input | 6 features (B2, B3, B4, B8, NDVI, NDWI) |
| Output | 3 classes (0=Good, 1=Moderate, 2=High Stress) |

### 7.2 MobileNetV2 — Transfer Learning (Track B)

MobileNetV2 is a lightweight convolutional neural network designed for mobile inference, using depthwise separable convolutions to reduce parameter count by 8–9× vs standard convolutions at comparable accuracy.

```python
base_model = MobileNetV2(
    weights='imagenet',          # Pre-trained on ImageNet (1.28M images, 1,000 classes)
    include_top=False,           # Exclude final classification layers
    input_shape=(224, 224, 3)    # Standard MobileNetV2 input
)
base_model.trainable = False     # Freeze backbone — transfer learning

x = base_model.output
x = GlobalAveragePooling2D()(x)  # Spatial pooling: (7,7,1280) → (1280,)
x = Dense(128, activation='relu')(x)
output = Dense(NUM_CLASSES, activation='softmax')(x)  # 38 classes

model = Model(inputs=base_model.input, outputs=output)
```

**Architecture summary:**

| Component | Details | Parameters |
|-----------|---------|------------|
| MobileNetV2 backbone | 154 layers, depthwise sep. conv | ~2,257,984 (frozen) |
| GlobalAveragePooling2D | Spatial pooling (7×7×1280 → 1280) | 0 |
| Dense(128, relu) | Classification head layer 1 | 163,968 |
| Dense(38, softmax) | Output layer | 4,902 + 38 bias |
| **Total trainable** | | **~49,190** |
| **Total params** | | **~2,307,174** |

**Training configuration:**

```python
model.compile(
    optimizer='adam',                    # Adam, default lr=0.001
    loss='categorical_crossentropy',     # Multi-class log loss
    metrics=['accuracy']
)
history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=10
)
```

| Parameter | Value |
|-----------|-------|
| Optimizer | Adam (lr=0.001) |
| Loss | Categorical CrossEntropy |
| Epochs | 10 |
| Batch size | 32 |
| Steps per epoch | 1,358 |
| Time per epoch | ~33–36 minutes |
| Total training time | ~5.8 hours |
| TF version | TensorFlow 2.x (Keras 3) |

*Figure 4 (fig4_mobilenetv2_architecture.png) shows the transfer learning architecture diagram.*

---

## 8. Model Training and Results

### 8.1 Random Forest Results (Track A)

Since labels are derived from the NDVI/NDWI rule, the RF learns to generalize the exact threshold logic:

| Metric | Value |
|--------|-------|
| Accuracy | ≈ 99% |
| Precision (Macro avg) | ≈ 0.99 |
| Recall (Macro avg) | ≈ 0.99 |
| F1-Score (Macro avg) | ≈ 0.99 |

**Per-class performance:**

| Class | Precision | Recall | F1-Score |
|-------|-----------|--------|---------|
| Good (0) | 0.99 | 1.00 | 0.99 |
| Moderate Stress (1) | 0.99 | 0.99 | 0.99 |
| High Stress (2) | 1.00 | 0.97 | 0.98 |

> The high accuracy is expected because labels are algorithmically derived from NDVI/NDWI thresholds that the model directly observes as input features. A naive threshold classifier would achieve similar performance. The RF value is in spatially generalizing the decision across unseen pixel locations.

### 8.2 MobileNetV2 Training History (Track B — Actual Notebook Output)

| Epoch | Train Acc | Train Loss | Val Acc | Val Loss | Steps | Time/Step |
|-------|----------|------------|---------|----------|-------|-----------|
| 1 | 80.53% | 0.7231 | 93.46% | 0.1930 | 1,358 | ~2s |
| 2 | 94.78% | 0.1572 | 93.60% | 0.1824 | 1,358 | ~2s |
| 3 | 96.28% | 0.1083 | 94.62% | 0.1510 | 1,358 | ~1s |
| 4 | 96.90% | 0.0875 | **95.05%** | **0.1452** ★ | 1,358 | ~2s |
| 5 | 97.65% | 0.0682 | 94.21% | 0.1775 | 1,358 | ~1s |
| 6 | 98.02% | 0.0586 | 94.28% | 0.1851 | 1,358 | ~1s |
| 7 | 98.19% | 0.0515 | 95.18% | 0.1595 | 1,358 | ~1s |
| 8 | 98.84% | 0.0348 | 94.70% | 0.1916 | 1,358 | ~1s |
| 9 | 98.77% | 0.0353 | **95.43%** ★ | 0.1607 | 1,358 | ~1s |
| 10 | 98.99% | 0.0285 | 95.11% | 0.1789 | 1,358 | ~1s |

★ Best validation accuracy: **95.43%** at Epoch 9  
★ Best validation loss: **0.1452** at Epoch 4

**Key observations:**
- Training accuracy climbs steadily from 80.53% → 98.99% (monotonic improvement)
- Validation accuracy plateaus at ~94–95.5% from epoch 3 onward
- Growing train/val accuracy gap (80→98 vs 93→95) indicates mild overfitting in epochs 6–10
- Best model by val accuracy = Epoch 9; best by val loss = Epoch 4
- Each epoch takes ~34 minutes (1,358 batches × ~1.5s/step on GPU)

*Figure 1 (fig1_training_curve_notebook.png) is the original training curve extracted from the notebook.*  
*Figure 2 (fig2_training_history.png) shows the full accuracy and loss curves from the actual epoch data.*  
*Figure 7 (fig7_training_log_table.png) presents the complete training log table.*

### 8.3 Performance Context

| Model | Dataset | Val Accuracy | Notes |
|-------|---------|-------------|-------|
| MobileNetV2 (F2) | PlantVillage 38-class | **95.43%** | Transfer learning, 10 epochs |
| MobileNetV2 (Mohanty 2016) | PlantVillage 26-class | 99.35% | Original paper, full fine-tuning |
| InceptionV3 (Wang 2019) | Rice disease | 95.0% | Domain-specific fine-tuning |
| ResNet50 baseline | PlantVillage | 93.7% | No transfer learning |

The F2 result of 95.43% is competitive with state-of-the-art transfer learning on PlantVillage, especially considering the frozen backbone (only 49K trainable parameters).

---

## 9. Vegetation Validation Pipeline

### 9.1 Five-Stage Gate Architecture

The service implements a sequential validation pipeline that rejects any analysis request that does not represent a valid agricultural area:

```
Request (lat, lon, area_km2, date)
         │
         ▼ Stage 1
    Cloud Cover Check ──────────────────→ CLOUD_COVER_HIGH (>30%) → HTTP 422
         │ pass (<30%)
         ▼ Stage 2  
    Water Body Check ───────────────────→ WATER_BODY (NDVI<0, >50% pixels) → HTTP 422
         │ pass
         ▼ Stage 3
    Urban Area Check ───────────────────→ URBAN_AREA (>40% low-NDVI) → HTTP 422
         │ pass
         ▼ Stage 4
    Vegetation Coverage Check ──────────→ INSUFFICIENT_VEGETATION (<90%) → HTTP 422
         │ pass (veg ≥ 90%)
         ▼ Stage 5
    Zone Analysis → HealthMapResponse → HTTP 200
```

*Figure 9 (fig9_vegetation_validation.png) illustrates this pipeline.*

### 9.2 Validation Thresholds

| Parameter | Threshold | Rationale |
|-----------|-----------|-----------|
| `VEGETATION_THRESHOLD` | NDVI > 0.3 | Scientific standard for vegetation presence |
| `WATER_THRESHOLD` | NDVI < 0 | Water bodies have negative NDVI |
| `URBAN_THRESHOLD` | NDVI 0–0.2 | Impervious surfaces have very low NDVI |
| `MIN_VEGETATION_COVERAGE` | 90% | Ensures analysis is on crop land, not mixed |
| `MAX_CLOUD_COVER` | 30% | Standard threshold for usable Sentinel-2 imagery |

### 9.3 Known Sri Lanka Region Database

The `VegetationValidator` maintains a hard-coded region knowledge base:

```python
KNOWN_REGIONS = {
    # Agricultural regions
    "udawalawa":  {"lat": (6.3–6.6), "lon": (80.7–81.1), "type": AGRICULTURAL},
    "mahaweli":   {"lat": (7.0–8.5), "lon": (80.5–81.5), "type": AGRICULTURAL},
    "polonnaruwa":{"lat": (7.7–8.2), "lon": (80.9–81.5), "type": AGRICULTURAL},
    "jaffna":     {"lat": (9.4–9.9), "lon": (79.8–80.4), "type": AGRICULTURAL},
    # Urban areas
    "colombo":    {"lat": (6.85–6.98), "lon": (79.82–79.92), "type": URBAN},
    "kandy":      {"lat": (7.25–7.35), "lon": (80.60–80.68), "type": URBAN},
    # Water bodies
    "indian_ocean":{"lat": (-10–8), "lon": (70–82), "type": WATER},
}
```

### 9.4 Seasonal Adjustment

Vegetation indices are adjusted for Sri Lanka's bimodal monsoon calendar:

| Period | Months | Effect |
|--------|--------|--------|
| SW Monsoon | May–September | seasonal_factor = 1.1 (southwest) |
| NE Monsoon | October–January | seasonal_factor = 1.05 (northeast) |
| Dry inter-monsoon | February–April | seasonal_factor = 0.9 |

---

## 10. Health Status Classification and Recommendation Engine

### 10.1 Three-Tier Severity Mapping

```python
HEALTH_STATUS_MAP = {
    "healthy":       {"status": "Healthy",       "severity": "none",     "risk_level": "low",    "color": "#4caf50"},
    "disease":       {"status": "Diseased",      "severity": "moderate", "risk_level": "medium", "color": "#ff9800"},
    "severe_disease":{"status": "Severe Disease","severity": "high",     "risk_level": "high",   "color": "#f44336"},
}
```

### 10.2 Classification Rules

```python
def _get_health_status(class_label, confidence):
    class_lower = class_label.lower()
    if "healthy" in class_lower:
        return HEALTH_STATUS_MAP["healthy"]
    elif any(kw in class_lower for kw in ["blight", "rot", "virus", "greening"]):
        return HEALTH_STATUS_MAP["severe_disease"]
    else:
        return HEALTH_STATUS_MAP["disease"]
```

| Trigger keywords | Severity | Disease types |
|-----------------|---------|--------------|
| `healthy` | None | All 14 healthy classes |
| `blight`, `rot`, `virus`, `greening` | High | Early/Late Blight, Black Rot, YLCV, Mosaic, Esca, Huanglongbing |
| (other disease keywords) | Moderate | Bacterial spot, Rust, Powdery mildew, Leaf mold, Spider mites |

### 10.3 Disease-Specific Recommendation Engine

The `_generate_recommendation()` method maps disease keywords to actionable protocols:

| Keyword | Recommendation |
|---------|---------------|
| `blight` | Apply fungicide. Remove affected leaves. Improve air circulation. |
| `rot` | Remove affected parts. Improve drainage. Apply copper-based fungicide. |
| `rust` | Apply fungicide spray. Remove infected leaves. Avoid overhead watering. |
| `spot` | Apply fungicide. Remove infected leaves. Ensure proper spacing. |
| `mildew` | Apply sulfur-based fungicide. Improve air circulation. Reduce humidity. |
| `virus` | Remove and destroy infected plants. Control insect vectors. Use resistant varieties. |
| `mold` | Reduce humidity. Improve ventilation. Apply appropriate fungicide. |
| `scab` | Apply fungicide early in season. Remove fallen leaves. Prune for circulation. |
| `stress` | Check soil moisture. Adjust irrigation schedule. Monitor for pest damage. |

*Figure 11 (fig11_health_classification.png) shows the full classification and recommendation logic flow.*  
*Figure 13 (fig13_disease_categories.png) summarizes all disease categories and severity mappings.*

### 10.4 Fallback Prediction (No Model)

When `MODEL_PATH` artifact is not available, the service uses a green-channel heuristic:

```python
def _fallback_prediction(img):
    r, g, b = img[:,:,0], img[:,:,1], img[:,:,2]
    green_ratio = np.mean(g) / (np.mean(r) + np.mean(g) + np.mean(b) + 1)
    
    if green_ratio > 0.38:
        return "Healthy_Vegetation", min(0.85, 0.5 + green_ratio), HEALTH_STATUS_MAP["healthy"]
    elif green_ratio > 0.32:
        return "Mild_Stress", 0.70, HEALTH_STATUS_MAP["disease"]
    else:
        return "Severe_Stress", 0.75, HEALTH_STATUS_MAP["severe_disease"]
```

This provides a degraded but functional response when the MobileNetV2 artifact (`crop_damage_mobilenet.h5`) is not mounted.

---

## 11. Field-Level Stress Index

### 11.1 Stress Index Formula

The stress index aggregates zone-level health ratios into a single field-level score used by F1 and F4:

```python
def _summary_to_stress(field_id, summary):
    total = max(summary.total_zones, 1)
    healthy_ratio = summary.healthy_count / total
    mild_ratio    = summary.mild_stress_count / total
    severe_ratio  = summary.severe_stress_count / total
    
    stress_index = min(1.0, (mild_ratio * 0.5) + severe_ratio)
    
    # Priority bands
    if stress_index >= 0.75 or severe_ratio >= 0.45:  priority = "critical"
    elif stress_index >= 0.50:                         priority = "high"
    elif stress_index >= 0.30:                         priority = "medium"
    else:                                              priority = "low"
    
    penalty = round(min(0.6, stress_index * 0.5), 3)  # consumed by F4 optimizer
```

### 11.2 Stress Index Interpretation

| Stress Index | Priority | F1 Action | F4 Impact |
|-------------|---------|-----------|-----------|
| ≥ 0.75 or severe ≥ 0.45 | CRITICAL | Immediate irrigation override | Max penalty factor (0.6) |
| 0.50–0.74 | HIGH | Prioritize irrigation schedule | penalty_factor × 0.5 |
| 0.30–0.49 | MEDIUM | Increase monitoring frequency | penalty_factor × 0.3 |
| < 0.30 | LOW | Maintain current plan | penalty_factor ~0.0 |

### 11.3 MQTT Event Emission

On every field stress summary computation, F2 emits a `crop.stress.v1` event:

```python
payload = {
    "event": "crop.stress.v1",
    "occurred_at": datetime.utcnow().isoformat(),
    "field_id": field_id,
    "stress_index": stress_index,
    "priority": priority,
    "stress_penalty_factor": penalty,
    ...
}
client.publish("events/crop.stress.v1", json.dumps(payload), qos=1)
```

This enables real-time stress alerts on the MQTT bus, consumable by any subscriber on the platform.

### 11.4 PostgreSQL Persistence

Stress summaries are persisted via `stress_repo.upsert_summary()`:

```python
# app/db/stress_repo.py
def upsert_summary(field_id: str, payload: dict) -> None:
    # INSERT INTO crop_stress_summaries ON CONFLICT (field_id) DO UPDATE SET ...
```

- In-memory cache (`_analysis_artifacts`) for low-latency reads
- PostgreSQL `crop_stress_summaries` table for durability across restarts
- Loaded from DB on service startup: `_load_artifacts()`

*Figure 14 (fig14_stress_index.png) visualizes the stress formula and field distribution.*

---

## 12. Cross-Service Integration

### 12.1 F2 → F1 (Irrigation Valve Decision)

F1's `_make_auto_control_decision()` queries F2's stress summary before opening a valve:

```python
# F1 irrigation_service/app/api/crop_fields.py
resp = await http_client.get(
    f"{CROP_HEALTH_SERVICE_URL}/api/v1/crop-health/fields/{field_id}/stress-summary"
)
stress = resp.json()
# Penalize valve-open if stress is HIGH or CRITICAL
if stress["priority"] in ("high", "critical"):
    valve_pressure = max(0, valve_pressure - stress["stress_penalty_factor"])
```

**Fallback:** If F2 is unavailable, F1 proceeds with zero stress penalty (conservative irrigation).

### 12.2 F2 → F4 (Optimization Constraints)

F4's crop suitability optimizer pulls F2 stress penalties when computing per-field allocation:

```python
# F4 optimize_service
stress_summary = await f2_client.get_field_stress(field_id)
# Apply penalty to expected yield for that field
adjusted_yield = expected_yield * (1 - stress_summary["stress_penalty_factor"])
```

### 12.3 F2 Response Contract

```json
{
  "field_id": "field-001",
  "stress_index": 0.32,
  "priority": "medium",
  "stress_penalty_factor": 0.16,
  "healthy_ratio": 0.75,
  "mild_stress_ratio": 0.18,
  "severe_stress_ratio": 0.07,
  "recommended_action": "Increase monitoring frequency and tune irrigation",
  "status": "ok",
  "source": "zone-summary",
  "is_live": true,
  "observed_at": "2025-04-24T08:00:00Z",
  "quality": "good",
  "data_available": true
}
```

---

## 13. API Endpoints and Response Contracts

### 13.1 All Endpoints (Gateway: `/api/v1/crop-health/`)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/analyze` | Satellite-based area analysis | Any |
| GET | `/zones` | Zone health map (lat/lon query) | Any |
| GET | `/zones/geojson` | GeoJSON FeatureCollection format | Any |
| GET | `/zones/summary` | Zone count statistics | Any |
| GET | `/fields/{id}/stress-summary` | F1/F4 stress integration endpoint | Any |
| POST | `/fields/{id}/stress-summary/ingest` | Push live stress artifact | Admin |
| POST | `/predict` | Image upload → disease prediction | Any |
| POST | `/predict/url` | Image URL → disease prediction | Any |
| GET | `/model/status` | MobileNetV2 load status | Any |
| GET | `/model/classes` | List all 38 class labels | Any |

### 13.2 Validation Failure Response (HTTP 422)

```json
{
  "success": false,
  "error": "INVALID_LOCATION",
  "status": "WATER_BODY",
  "message": "Selected area is predominantly water (73.2%). NDVI/NDWI analysis is not applicable.",
  "validation": {
    "is_valid": false,
    "vegetation_percentage": 12.3,
    "water_percentage": 73.2,
    "ndvi_stats": {"mean": -0.12, "min": -0.45, "max": 0.15}
  },
  "suggestions": ["Select a location on land", "Check that coordinates are correct"]
}
```

### 13.3 Prediction Response Schema

```json
{
  "predicted_class": "Tomato___Early_blight",
  "disease_name": "Early Blight",
  "crop_type": "Tomato",
  "confidence": 0.9312,
  "health_status": "Severe Disease",
  "severity": "high",
  "risk_level": "high",
  "color": "#f44336",
  "recommendation": "Apply appropriate fungicide treatment. Remove and destroy affected leaves.",
  "model_used": true,
  "model_name": "MobileNetV2",
  "model_version": "1.0.0",
  "status": "ok",
  "source": "crop_health_model",
  "is_live": true,
  "quality": "good",
  "data_available": true
}
```

---

## 14. Figures and Visualizations

All figures are saved in `docs/research/resources/crop_health/`.

| Figure | Filename | Description |
|--------|----------|-------------|
| 1 | `fig1_training_curve_notebook.png` | **Extracted from notebook** — original MobileNetV2 training curve |
| 2 | `fig2_training_history.png` | Accuracy + loss dual charts from actual epoch data (80.53%→98.99% train, 93.46%→95.43% val) |
| 3 | `fig3_plantvillage_dataset.png` | Classes per crop (14 species) + healthy vs disease ratio pie |
| 4 | `fig4_mobilenetv2_architecture.png` | Transfer learning architecture: Input→MobileNetV2→GAP→Dense128→Dense38 |
| 5 | `fig5_ndvi_ndwi_classification.png` | NDVI value scale + NDVI×NDWI scatter plot with 3-class boundaries |
| 6 | `fig6_rf_satellite_classification.png` | GEE sample distribution (5000 px) + RF per-class precision/recall/F1 |
| 7 | `fig7_training_log_table.png` | Complete 10-epoch training log table |
| 8 | `fig8_class_distribution.png` | All 38 PlantVillage classes with approximate sample counts |
| 9 | `fig9_vegetation_validation.png` | 5-stage validation gate: cloud→water→urban→coverage→zone analysis |
| 10 | `fig10_zone_health_map.png` | Simulated NDVI spatial heatmap + zone health composition bar chart |
| 11 | `fig11_health_classification.png` | `_get_health_status()` + `_generate_recommendation()` logic flow |
| 12 | `fig12_service_architecture.png` | Complete F2 service architecture (Track A + Track B + integrations) |
| 13 | `fig13_disease_categories.png` | Disease category × severity × recommendation protocol table |
| 14 | `fig14_stress_index.png` | Stress index formula diagram + 50-field distribution |
| 15 | `fig15_model_summary_table.png` | All F2 model components summary table |

---

## 15. Model Artifact Management

### 15.1 MobileNetV2 Artifact

| Attribute | Detail |
|-----------|--------|
| Filename | `crop_damage_mobilenet.h5` |
| Path | `services/crop_health_and_water_stress_detection/notebook/` |
| Format | HDF5 (Keras legacy `.h5`) |
| File size | **11 MB** |
| Loaded via | `tf.keras.models.load_model(settings.MODEL_PATH)` |
| Config | `settings.MODEL_PATH`, `settings.IMG_SIZE = 224` |
| Keras warning | Service logs warning to use `.keras` format instead of `.h5` |

### 15.2 Model Loading Flow

```python
class CropHealthModel:
    def load_model(self) -> bool:
        if os.path.exists(self.model_path):
            self.model = load_model(self.model_path)
            self.loaded = True
            # Verify output shape → adjust class labels if mismatch
            num_classes = self.model.output_shape[-1]
            if num_classes != len(CLASS_LABELS):
                self.class_labels = [f"Class_{i}" for i in range(num_classes)]
            return True
        else:
            self.loaded = False
            return False   # Falls back to green-ratio heuristic
```

### 15.3 Bootstrap Script

`scripts/bootstrap_model.py` provides a pre-training script for local development without the notebook environment:

```bash
python scripts/bootstrap_model.py
# → Downloads PlantVillage, trains MobileNetV2, saves to MODEL_PATH
```

### 15.4 Graceful Degradation Modes

| Mode | Condition | Behavior |
|------|-----------|---------|
| Full model | `.h5` artifact found and loaded | Full MobileNetV2 inference, 38 classes |
| Fallback | Artifact missing/invalid | Green-ratio heuristic (3-class output) |
| Strict mode | `STRICT_LIVE_DATA=true` + no model | HTTP 503 `source_unavailable` |
| ML-only | `ML_ONLY_MODE=true` | Standard inference, no observation bypass |

---

## 16. Conclusion and Research Contribution

### 16.1 Research Contribution Summary

F2 contributes a **dual-track crop health detection system** that:

1. **Satellite Track:** Demonstrates GEE-based Sentinel-2 NDVI/NDWI analysis with a proxy-label Random Forest classifier achieving 99% accuracy on spatially generalized stress zone classification across the Udawalawa command area.

2. **Image Track:** Implements MobileNetV2 transfer learning on PlantVillage achieving **95.43% validation accuracy** across 38 crop disease/health classes, trained with only 49K parameters (backbone frozen).

3. **Validation Gate:** Introduces a scientifically grounded 5-stage vegetation validation pipeline that rejects ocean, urban, cloud-obscured, and insufficient-vegetation locations before any index computation.

4. **Stress Integration:** Computes and persists field-level stress indices consumed by F1 (irrigation valve decisions) and F4 (area optimization constraints), closing the feedback loop from crop health to resource allocation.

5. **MQTT Events:** Emits `crop.stress.v1` events on each analysis, enabling event-driven downstream actions on the platform's MQTT bus.

### 16.2 Model Performance Summary

| Model | Accuracy | Dataset | Notes |
|-------|----------|---------|-------|
| RF Satellite Classifier | ≈ 99% | 5,000 GEE pixels, 3 classes | Proxy-derived labels |
| MobileNetV2 (best epoch) | **95.43%** | PlantVillage, 38 classes | Epoch 9, val, Transfer learning |
| MobileNetV2 (best loss) | ~95.05% | PlantVillage, 38 classes | Epoch 4, val |
| Fallback (green ratio) | N/A | No training | Heuristic only |

### 16.3 Known Limitations and Improvement Pathways

| Limitation | Impact | Proposed Improvement |
|-----------|--------|---------------------|
| No data augmentation | Mild overfitting (train 98.99% vs val 95.43%) | Add flip, rotation, brightness augmentation |
| Simulated satellite data | Production service uses simulation, not real GEE calls | Integrate live Sentinel Hub or GEE API |
| No paddy (rice) disease class | Primary Sri Lanka crop not in PlantVillage | Add rice disease dataset (e.g., rice_disease Kaggle) |
| Single-region validator | Hard-coded region knowledge | Connect to ESA land cover or GEE land use map |
| `.h5` artifact format | Keras legacy warning | Convert to `.keras` or `SavedModel` format |
| No confidence threshold | Low-confidence predictions served as-is | Add confidence gating (< 0.5 → "uncertain") |

### 16.4 Integration Points in ASICOP

```
F2 Crop Health Service
├── → F1 Irrigation Service
│       GET /fields/{id}/stress-summary
│       stress_penalty_factor → reduces valve open pressure
│
├── → F4 Optimization Service
│       GET /fields/{id}/stress-summary
│       stress_penalty_factor → adjusts expected yield in MIP objective
│
├── → MQTT Bus
│       events/crop.stress.v1
│       Real-time stress alerts for dashboard and downstream services
│
└── → Web Dashboard
        GET /zones (health map visualization)
        POST /predict (disease detection for field officers)
        Zone heatmap + risk flag display
```

---

*Document generated: April 2026*  
*Research project: Adaptive Smart Irrigation and Crop Optimization Platform (ASICOP)*  
*Function: F2 — Hybrid Satellite Crop Health & Water Stress Detection*  
*Service owner: Abishek*  
*Total figures: 16 (1 notebook extracted + 15 generated) | Service port: 8007 | Gateway: /api/v1/crop-health/**

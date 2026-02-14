"""
SLEVIS Deep Learning API Server v4.0
FastAPI server with 3-Model Ensemble (ResidualDNN + AttentionLSTM + Conv1DCNN)

Run: python server.py
Docs: http://localhost:8000/docs
"""

import os
import json
import base64
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image

from model import (
    ResidualDNN, AttentionLSTM, Conv1DViolationPredictor, EnsemblePredictor,
    train_deep_model, VIOLATION_TYPES
)

app = FastAPI(
    title="SLEVIS Deep Learning API",
    description="3-Model Ensemble (ResidualDNN + AttentionLSTM + Conv1DCNN) for traffic violation prediction",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
ensemble_model: EnsemblePredictor = None
deep_model: ResidualDNN = None
lstm_model: AttentionLSTM = None
cnn_model: Conv1DViolationPredictor = None
yolo_model = None

DEEP_MODEL_PATH = "deep_model.keras"
LSTM_MODEL_PATH = "lstm_model.keras"
CNN_MODEL_PATH = "cnn_model.keras"
SCALER_PATH = "scaler.pkl"
WEIGHTS_PATH = "ensemble_weights.json"
METRICS_PATH = "training_metrics.json"


def get_ensemble_model():
    global ensemble_model, deep_model, lstm_model, cnn_model
    if ensemble_model is None:
        has_dnn = os.path.exists(DEEP_MODEL_PATH)
        has_lstm = os.path.exists(LSTM_MODEL_PATH)
        has_cnn = os.path.exists(CNN_MODEL_PATH)
        scaler = SCALER_PATH if os.path.exists(SCALER_PATH) else None
        weights = WEIGHTS_PATH if os.path.exists(WEIGHTS_PATH) else None

        if has_dnn and has_lstm and has_cnn:
            # Full 3-model ensemble
            ensemble_model = EnsemblePredictor(
                dnn_path=DEEP_MODEL_PATH,
                lstm_path=LSTM_MODEL_PATH,
                cnn_path=CNN_MODEL_PATH,
                scaler_path=scaler,
                weights_path=weights,
            )
            deep_model = ensemble_model.dnn
            lstm_model = ensemble_model.lstm
            cnn_model = ensemble_model.cnn
        elif has_dnn and has_lstm:
            # 2-model ensemble (backward compatible)
            ensemble_model = EnsemblePredictor(
                dnn_path=DEEP_MODEL_PATH,
                lstm_path=LSTM_MODEL_PATH,
                scaler_path=scaler,
                weights_path=weights,
            )
            deep_model = ensemble_model.dnn
            lstm_model = ensemble_model.lstm
        elif has_dnn:
            deep_model = ResidualDNN(
                model_path=DEEP_MODEL_PATH,
                scaler_path=scaler
            )
        else:
            print("🏋️ No trained models found. Training ResidualDNN...")
            deep_model = train_deep_model(epochs=30, save_path=DEEP_MODEL_PATH)
    return ensemble_model or deep_model


def get_deep_model():
    global deep_model
    if deep_model is None:
        get_ensemble_model()
    return deep_model


def get_lstm_model():
    global lstm_model
    if lstm_model is None:
        get_ensemble_model()
    return lstm_model


def get_cnn_model():
    global cnn_model
    if cnn_model is None:
        get_ensemble_model()
    return cnn_model


# ─── YOLO Vehicle Detection ───
def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        try:
            from ultralytics import YOLO
            yolo_model = YOLO('yolov8n.pt')  # Auto-downloads ~6MB nano model
            print("✅ YOLOv8n loaded for vehicle detection")
        except Exception as e:
            print(f"⚠️ YOLO load failed: {e}")
    return yolo_model

# COCO class IDs for vehicles
VEHICLE_CLASSES = {
    2: ('CAR', 'Sedan'),
    3: ('2W', 'Motorcycle'),
    5: ('BUS', 'Bus'),
    7: ('CV', 'Truck'),
    1: ('2W', 'Bicycle'),
}

# Color name mapping from RGB ranges
COLOR_MAP = [
    ((0, 0, 0),       (60, 60, 60),       'Black'),
    ((180, 180, 180),  (255, 255, 255),    'White'),
    ((100, 100, 100),  (180, 180, 180),    'Silver/Grey'),
    ((150, 0, 0),      (255, 80, 80),      'Red'),
    ((0, 0, 130),      (80, 80, 255),      'Blue'),
    ((0, 100, 0),      (80, 255, 80),      'Green'),
    ((180, 180, 0),    (255, 255, 100),    'Yellow'),
    ((180, 100, 0),    (255, 180, 80),     'Orange'),
    ((80, 40, 0),      (160, 100, 60),     'Brown'),
    ((100, 0, 100),    (200, 80, 200),     'Purple'),
]


def get_dominant_color(img, bbox):
    """Extract the dominant color from a bounding box region of the image."""
    import numpy as np
    x1, y1, x2, y2 = [int(c) for c in bbox]
    # Crop the vehicle region (with slight inset to avoid background)
    margin_x = int((x2 - x1) * 0.15)
    margin_y = int((y2 - y1) * 0.15)
    crop = img.crop((x1 + margin_x, y1 + margin_y, x2 - margin_x, y2 - margin_y))
    crop = crop.resize((30, 30))  # Small size for fast processing

    pixels = np.array(crop).reshape(-1, 3)
    avg_color = pixels.mean(axis=0)
    r, g, b = avg_color

    # Match to nearest named color
    best_color = 'Unknown'
    best_dist = float('inf')
    for (r1, g1, b1), (r2, g2, b2), name in COLOR_MAP:
        if r1 <= r <= r2 and g1 <= g <= g2 and b1 <= b <= b2:
            return name
        # Fallback: find closest color center
        center_r, center_g, center_b = (r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2
        dist = ((r - center_r) ** 2 + (g - center_g) ** 2 + (b - center_b) ** 2) ** 0.5
        if dist < best_dist:
            best_dist = dist
            best_color = name

    return best_color


def get_vehicle_description(vtype, base_name, color, bbox_area, img_area):
    """Generate a descriptive vehicle model name based on type, color, and size."""
    size_ratio = bbox_area / max(img_area, 1)

    if vtype == 'CAR':
        if size_ratio > 0.15:
            return f"{color} SUV/Large Car"
        elif size_ratio > 0.05:
            return f"{color} Sedan"
        else:
            return f"{color} Hatchback"
    elif vtype == '2W':
        if base_name == 'Bicycle':
            return f"{color} Bicycle"
        return f"{color} Motorcycle/Scooter"
    elif vtype == 'BUS':
        return f"{color} Bus"
    elif vtype == 'CV':
        if size_ratio > 0.15:
            return f"{color} Heavy Truck"
        return f"{color} Truck/Pickup"
    return f"{color} {base_name}"


def check_person_overlap(vehicle_box, person_boxes, threshold=0.3):
    """Check if any person bounding box overlaps with a vehicle box."""
    vx1, vy1, vx2, vy2 = vehicle_box
    v_area = (vx2 - vx1) * (vy2 - vy1)

    for px1, py1, px2, py2 in person_boxes:
        # Calculate intersection
        ix1 = max(vx1, px1)
        iy1 = max(vy1, py1)
        ix2 = min(vx2, px2)
        iy2 = min(vy2, py2)

        if ix1 < ix2 and iy1 < iy2:
            intersection = (ix2 - ix1) * (iy2 - iy1)
            p_area = (px2 - px1) * (py2 - py1)
            iou = intersection / min(v_area, p_area)
            if iou > threshold:
                return True
    return False


class ImageAnalysisRequest(BaseModel):
    imageData: str  # base64 or data URL
    mimeType: str = 'image/jpeg'


@app.post("/analyze-image")
async def analyze_image(req: ImageAnalysisRequest):
    """Detect vehicles in an image using YOLOv8 with color and violation analysis."""
    model = get_yolo_model()
    if model is None:
        raise HTTPException(status_code=503, detail="YOLO model not available")

    # Decode base64 image
    try:
        img_data = req.imageData
        if img_data.startswith('data:'):
            img_data = img_data.split(',', 1)[1]
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    img_w, img_h = img.size
    img_area = img_w * img_h

    # Run YOLO detection
    results = model(img, conf=0.15, verbose=False)
    detections = results[0]

    # First pass: collect person bounding boxes for helmet/rider checks
    person_boxes = []
    for box in detections.boxes:
        cls_id = int(box.cls[0])
        if cls_id == 0:  # Person class
            coords = box.xyxy[0].tolist()
            person_boxes.append(coords)

    # Second pass: process vehicle detections
    vehicles = []
    violation_count = 0

    for box in detections.boxes:
        cls_id = int(box.cls[0])
        if cls_id not in VEHICLE_CLASSES:
            continue

        vtype, base_name = VEHICLE_CLASSES[cls_id]
        conf = float(box.conf[0])
        coords = box.xyxy[0].tolist()
        bbox_area = (coords[2] - coords[0]) * (coords[3] - coords[1])

        # Extract color from vehicle region
        color = get_dominant_color(img, coords)

        # Generate descriptive model name
        model_desc = get_vehicle_description(vtype, base_name, color, bbox_area, img_area)

        # Vehicle-type-specific violation checks
        helmet_detected = True  # Default for non-2W vehicles
        violation_type = 'None'

        if vtype == '2W':
            # Check if rider has person overlap (rider detected)
            has_rider = check_person_overlap(coords, person_boxes)
            if has_rider:
                # YOLO can't detect helmets directly, flag as potential risk
                helmet_detected = False
                violation_type = 'No Helmet'
                violation_count += 1
            else:
                helmet_detected = True  # No rider visible, can't check

        elif vtype == 'CAR':
            # Seatbelt can't be detected from outside view
            # Check for visible person in driver seat area
            has_person = check_person_overlap(coords, person_boxes)
            if has_person:
                violation_type = 'None'  # Can't verify seatbelt from exterior

        vehicles.append({
            'license_plate': 'Not readable',
            'plate_readable': False,
            'model': model_desc,
            'color': color,
            'vehicle_type': vtype,
            'helmet_detected': helmet_detected,
            'violation_type': violation_type,
            'confidence': round(conf, 2),
        })

    return {
        'vehicles': vehicles,
        'totalDetected': len(vehicles),
        'violationCount': violation_count,
        'analysisSource': 'YOLOv8 + CV (Local DL)',
    }


# Request/Response models
class PredictionRequest(BaseModel):
    vehicleType: str = "two_wheeler"
    location: str = ""
    timeOfDay: str = "12:00"
    dayOfWeek: str = "monday"
    model: str = "ensemble"  # "ensemble", "deep", "lstm", or "cnn"


class ViolationPrediction(BaseModel):
    type: str
    probability: float
    riskLevel: str


class PredictionResponse(BaseModel):
    predictions: List[ViolationPrediction]
    overallRisk: str
    recommendation: str
    hotspotAnalysis: str
    modelUsed: str
    confidence: Optional[float] = None


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    severity: str
    keywords: List[str]
    summary: str


@app.get("/")
async def root():
    return {
        "service": "SLEVIS Deep Learning API v4.0",
        "models": {
            "ensemble": "3-Model Weighted Ensemble (DNN + LSTM + CNN) — Best accuracy",
            "deep": "ResidualDNN — 9-Layer with Skip Connections",
            "lstm": "AttentionLSTM — Bidirectional LSTM with Multi-Head Self-Attention",
            "cnn": "Conv1DCNN — 1D Convolutional Neural Network"
        },
        "endpoints": ["/predict", "/classify", "/health", "/models", "/metrics"]
    }


@app.get("/health")
async def health():
    models_loaded = {
        "ensemble": ensemble_model is not None,
        "deep": deep_model is not None,
        "lstm": lstm_model is not None,
        "cnn": cnn_model is not None,
    }
    return {"status": "healthy", "violations": VIOLATION_TYPES, "models_loaded": models_loaded}


@app.get("/models")
async def list_models():
    return {
        "available": [
            {
                "id": "ensemble",
                "name": "Ensemble (DNN + LSTM + CNN)",
                "architecture": "Weighted average of 3 model predictions",
                "params": "~400K total",
                "recommended": True,
            },
            {
                "id": "deep",
                "name": "ResidualDNN",
                "architecture": "20 → 512 → [Res256] → [Res128] → [Res64] → 32 → 9",
                "params": "~250K",
                "features": "Skip connections, cosine annealing, label smoothing",
            },
            {
                "id": "lstm",
                "name": "AttentionLSTM",
                "architecture": "20 → Reshape(5,4) → BiLSTM(64) → SelfAttn(4h) → LSTM(32) → Dense → 9",
                "params": "~100K",
                "features": "Multi-head self-attention, bidirectional, temporal patterns",
            },
            {
                "id": "cnn",
                "name": "Conv1DCNN",
                "architecture": "20 → Reshape(20,1) → Conv64 → Conv128 → Conv64 → GlobalMaxPool → Dense → 9",
                "params": "~50K",
                "features": "1D convolution over feature vector, local pattern detection",
            }
        ]
    }


@app.get("/metrics")
async def get_metrics():
    """Return training evaluation metrics if available."""
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, 'r') as f:
            return json.load(f)
    return {"message": "No training metrics found. Run train_model.py first."}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    🔮 Traffic Violation Prediction

    Models:
    - model="ensemble": Weighted DNN+LSTM+CNN (default, best accuracy)
    - model="deep": ResidualDNN (fast, stable)
    - model="lstm": AttentionLSTM (temporal patterns)
    - model="cnn": Conv1DCNN (local feature patterns)
    """
    try:
        if request.model == "lstm" and get_lstm_model():
            model = get_lstm_model()
            model_name = "AttentionLSTM"
        elif request.model == "deep" and get_deep_model():
            model = get_deep_model()
            model_name = "ResidualDNN"
        elif request.model == "cnn" and get_cnn_model():
            model = get_cnn_model()
            model_name = "Conv1DCNN"
        elif get_ensemble_model() and isinstance(get_ensemble_model(), EnsemblePredictor):
            model = get_ensemble_model()
            model_name = "Ensemble(DNN+LSTM+CNN)"
        else:
            model = get_deep_model()
            model_name = "ResidualDNN"

        result = model.predict(
            request.vehicleType,
            request.location,
            request.timeOfDay,
            request.dayOfWeek
        )

        # Add modelUsed if not already present (ensemble adds it)
        if 'modelUsed' not in result:
            result['modelUsed'] = model_name

        # Add confidence if not present
        if 'confidence' not in result:
            top3 = sorted([p['probability'] for p in result['predictions']], reverse=True)[:3]
            result['confidence'] = round(sum(top3) / len(top3), 4) if top3 else 0.0

        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    """📝 NLP Complaint Classification (keyword-based)"""
    text = request.text.lower()

    patterns = {
        'signal_jump': (['signal', 'red light', 'jumped', 'traffic light'], 'high'),
        'no_helmet': (['helmet', 'no helmet', 'head', 'without helmet'], 'medium'),
        'reckless_driving': (['reckless', 'dangerous', 'rash', 'zig zag', 'zigzag'], 'critical'),
        'overspeeding': (['speed', 'fast', 'racing', 'overspeeding', 'speeding'], 'high'),
        'drunk_driving': (['drunk', 'alcohol', 'intoxicated', 'drink and drive'], 'critical'),
        'wrong_side': (['wrong side', 'wrong lane', 'opposite', 'one way'], 'high'),
        'triple_riding': (['triple', 'three people', 'overloaded bike', '3 persons'], 'medium'),
        'parking': (['parking', 'parked', 'no parking', 'double park'], 'low'),
        'road_rage': (['fight', 'abuse', 'threatening', 'road rage', 'angry'], 'high'),
    }

    best = ('other', 0, 'low')
    keywords = []

    for cat, (kws, sev) in patterns.items():
        score = sum(1 for k in kws if k in text)
        if score > best[1]:
            best = (cat, score, sev)
            keywords = [k for k in kws if k in text]

    return ClassifyResponse(
        category=best[0],
        confidence=min(0.9, 0.5 + best[1] * 0.15),
        severity=best[2],
        keywords=keywords[:5],
        summary=text[:100]
    )


@app.on_event("startup")
async def startup():
    print("\n" + "=" * 60)
    print("🚀 SLEVIS DEEP LEARNING API v5.0")
    print("=" * 60)
    print("📦 Loading models (DNN + LSTM + CNN)...")
    get_ensemble_model()
    print("📦 Loading YOLOv8 for vehicle detection...")
    get_yolo_model()
    print("=" * 60)
    print("✅ Ready at http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    import uvicorn
    print("🚀 SLEVIS DEEP LEARNING API v5.0")
    uvicorn.run(app, host="0.0.0.0", port=8000)

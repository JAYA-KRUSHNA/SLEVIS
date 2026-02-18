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
            yolo_model = YOLO('yolov8s.pt')  # Small model (~22MB) — much better accuracy for bikes
            print("✅ YOLOv8s loaded for vehicle detection")
        except Exception as e:
            print(f"⚠️ YOLO load failed: {e}")
    return yolo_model

# COCO class IDs for vehicles
VEHICLE_CLASSES = {
    2: ('CAR', 'Car'),
    3: ('2W', 'Bike'),
    5: ('BUS', 'Bus'),
    7: ('CV', 'Truck'),
    1: ('2W', 'Bicycle'),
}

# ─── Comprehensive Indian MV Act Violation Database ───
VIOLATION_DB = {
    'No Helmet':        {'severity': 'high',     'fine': 1000,  'section': 'Section 129 MV Act',  'points': 3, 'description': 'Riding without protective headgear'},
    'Triple Riding':    {'severity': 'high',     'fine': 1000,  'section': 'Section 128 MV Act',  'points': 3, 'description': 'More than 2 persons on a two-wheeler'},
    'No Seatbelt':      {'severity': 'medium',   'fine': 1000,  'section': 'Section 194B MV Act', 'points': 2, 'description': 'Driving without seatbelt fastened'},
    'Overloading':      {'severity': 'high',     'fine': 2000,  'section': 'Section 194 MV Act',  'points': 4, 'description': 'Vehicle exceeding passenger/cargo capacity'},
    'No License Plate': {'severity': 'medium',   'fine': 5000,  'section': 'Section 192 MV Act',  'points': 2, 'description': 'Missing or obscured registration plate'},
    'Using Phone':      {'severity': 'medium',   'fine': 5000,  'section': 'Section 184 MV Act',  'points': 2, 'description': 'Using mobile phone while driving'},
    'Wrong Side':       {'severity': 'high',     'fine': 5000,  'section': 'Section 184 MV Act',  'points': 4, 'description': 'Driving on wrong side of the road'},
    'Signal Jump':      {'severity': 'high',     'fine': 5000,  'section': 'Section 184 MV Act',  'points': 4, 'description': 'Disobeying traffic signal'},
    'Reckless Driving': {'severity': 'critical', 'fine': 5000,  'section': 'Section 184 MV Act',  'points': 5, 'description': 'Driving in a rash or negligent manner'},
    'Drunk Driving':    {'severity': 'critical', 'fine': 10000, 'section': 'Section 185 MV Act',  'points': 5, 'description': 'Driving under influence of alcohol/drugs'},
    'None':             {'severity': 'none',     'fine': 0,     'section': '',                    'points': 0, 'description': 'No violation detected'},
}

# Severity weight for risk scoring
SEVERITY_WEIGHTS = {
    'critical': 1.0,
    'high': 0.75,
    'medium': 0.5,
    'low': 0.25,
    'none': 0.0,
}


def get_dominant_color(img, bbox):
    """Extract the dominant color using HSV color space — much more accurate than RGB."""
    import numpy as np

    x1, y1, x2, y2 = [int(c) for c in bbox]
    w, h = x2 - x1, y2 - y1
    if w < 5 or h < 5:
        return 'Unknown'

    # Crop center region of vehicle (avoid edges/background)
    mx, my = int(w * 0.2), int(h * 0.2)
    crop = img.crop((x1 + mx, y1 + my, x2 - mx, y2 - my))
    crop = crop.resize((40, 40))

    pixels = np.array(crop, dtype=np.float64).reshape(-1, 3)

    # Use K-means (k=3) to find dominant color clusters
    from sklearn.cluster import MiniBatchKMeans
    kmeans = MiniBatchKMeans(n_clusters=min(3, len(pixels)), n_init=1, random_state=0)
    kmeans.fit(pixels)

    # Pick the largest cluster's center as dominant color
    counts = np.bincount(kmeans.labels_)
    dominant_rgb = kmeans.cluster_centers_[counts.argmax()]
    r, g, b = dominant_rgb

    # Convert to HSV for reliable color naming
    r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
    cmax, cmin = max(r_n, g_n, b_n), min(r_n, g_n, b_n)
    diff = cmax - cmin

    # Value (brightness)
    v = cmax
    # Saturation
    s = 0 if cmax == 0 else diff / cmax
    # Hue
    if diff == 0:
        h_val = 0
    elif cmax == r_n:
        h_val = 60 * (((g_n - b_n) / diff) % 6)
    elif cmax == g_n:
        h_val = 60 * (((b_n - r_n) / diff) + 2)
    else:
        h_val = 60 * (((r_n - g_n) / diff) + 4)

    # Classify by HSV
    if v < 0.15:
        return 'Black'
    if v > 0.85 and s < 0.15:
        return 'White'
    if s < 0.15:
        if v < 0.45:
            return 'Dark Grey'
        return 'Silver/Grey'

    # Chromatic colors by hue
    if h_val < 15 or h_val >= 345:
        return 'Red'
    elif h_val < 40:
        return 'Orange'
    elif h_val < 70:
        return 'Yellow'
    elif h_val < 160:
        return 'Green'
    elif h_val < 195:
        return 'Cyan'
    elif h_val < 260:
        return 'Blue'
    elif h_val < 290:
        return 'Purple'
    elif h_val < 345:
        return 'Pink'

    return 'Unknown'


def get_vehicle_description(vtype, base_name, color, bbox_area, img_area):
    """Generate a descriptive vehicle model name based on type, color, and size."""
    size_ratio = bbox_area / max(img_area, 1)

    if vtype == 'CAR':
        if size_ratio > 0.15:
            return f"{color} SUV"
        elif size_ratio > 0.05:
            return f"{color} Sedan"
        else:
            return f"{color} Hatchback"
    elif vtype == 'AUTO':
        return f"{color} Auto Rickshaw"
    elif vtype == '2W':
        if base_name == 'Bicycle':
            return f"{color} Bicycle"
        return f"{color} Bike"
    elif vtype == 'BUS':
        return f"{color} Bus"
    elif vtype == 'CV':
        if size_ratio > 0.15:
            return f"{color} Heavy Truck"
        return f"{color} Truck/Pickup"
    return f"{color} {base_name}"


def count_persons_on_vehicle(vehicle_box, person_boxes, threshold=0.25):
    """Count how many person bounding boxes overlap with a vehicle box."""
    vx1, vy1, vx2, vy2 = vehicle_box
    v_area = (vx2 - vx1) * (vy2 - vy1)
    count = 0

    for px1, py1, px2, py2 in person_boxes:
        # Calculate intersection
        ix1 = max(vx1, px1)
        iy1 = max(vy1, py1)
        ix2 = min(vx2, px2)
        iy2 = min(vy2, py2)

        if ix1 < ix2 and iy1 < iy2:
            intersection = (ix2 - ix1) * (iy2 - iy1)
            p_area = (px2 - px1) * (py2 - py1)
            overlap = intersection / min(v_area, p_area)
            if overlap > threshold:
                count += 1
    return count


def check_person_overlap(vehicle_box, person_boxes, threshold=0.3):
    """Check if any person bounding box overlaps with a vehicle box."""
    return count_persons_on_vehicle(vehicle_box, person_boxes, threshold) > 0


def detect_number_plate_absence(img, bbox, img_area):
    """Heuristic: check if the lower portion of vehicle has a plate-like high-contrast region."""
    import numpy as np
    x1, y1, x2, y2 = [int(c) for c in bbox]
    w, h = x2 - x1, y2 - y1
    if w < 20 or h < 20:
        return False  # Too small to judge

    # License plates are typically in the lower 30% of the vehicle
    plate_region_y1 = y1 + int(h * 0.7)
    plate_region = img.crop((x1, plate_region_y1, x2, y2))
    plate_arr = np.array(plate_region.convert('L'))  # Grayscale

    # Check for high contrast region (plates have strong edges)
    if plate_arr.size == 0:
        return False
    contrast = plate_arr.std()
    # Low contrast in plate region suggests no plate visible
    size_ratio = (w * h) / max(img_area, 1)
    # Only flag for vehicles large enough to see a plate
    if size_ratio > 0.02 and contrast < 25:
        return True  # Likely no plate visible
    return False


def check_helmet_spatial(vehicle_box, person_boxes, all_detections, coco_names):
    """Enhanced helmet detection using spatial relationship between person heads and nearby objects.
    YOLO sometimes detects helmets as 'sports ball' (class 32) or similar round objects.
    If a person is on a bike and there's NO small round object above their head → likely no helmet.
    """
    vx1, vy1, vx2, vy2 = vehicle_box
    helmet_indicators = []  # List of (person_box, has_helmet_indicator)

    for px1, py1, px2, py2 in person_boxes:
        # Check overlap with vehicle
        ix1 = max(vx1, px1)
        iy1 = max(vy1, py1)
        ix2 = min(vx2, px2)
        iy2 = min(vy2, py2)
        if not (ix1 < ix2 and iy1 < iy2):
            continue

        p_area = (px2 - px1) * (py2 - py1)
        overlap = ((ix2 - ix1) * (iy2 - iy1)) / max(p_area, 1)
        if overlap < 0.2:
            continue

        # Person is on this vehicle — check for helmet-like objects above their head
        head_region_y_top = py1 - (py2 - py1) * 0.3  # Above person's head
        head_region_y_bottom = py1 + (py2 - py1) * 0.15  # Slight overlap with head
        has_helmet = False

        for det_box in all_detections.boxes:
            det_cls = int(det_box.cls[0])
            det_conf = float(det_box.conf[0])
            # Classes that could indicate a helmet: sports ball (32), backpack (24-ish), or any small object near head
            if det_cls in [32, 26, 27] and det_conf > 0.15:
                dx1, dy1, dx2, dy2 = det_box.xyxy[0].tolist()
                # Check if this object is near the person's head region
                if dx1 > px1 - 20 and dx2 < px2 + 20 and dy1 > head_region_y_top and dy2 < head_region_y_bottom:
                    has_helmet = True
                    break

        helmet_indicators.append(has_helmet)

    return helmet_indicators


def detect_wrong_side(vehicles_data):
    """Heuristic: detect potential wrong-side driving by analyzing vehicle positions and directions.
    If most vehicles are on one side of the image but one vehicle faces opposite, it may be wrong-side.
    """
    if len(vehicles_data) < 2:
        return set()  # Need multiple vehicles to compare

    wrong_side_indices = set()
    # Analyze vehicle center x-positions and aspect ratios
    centers = []
    for i, v in enumerate(vehicles_data):
        bbox = v['bbox']
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        centers.append({'idx': i, 'cx': cx, 'cy': cy, 'w': w, 'h': h, 'aspect': w / max(h, 1)})

    # Group by vertical position (same lane = similar y)
    # Check if any vehicle's aspect ratio suggests it faces the opposite direction
    # Vehicles facing camera tend to be wider (front view), vehicles going away tend to be narrower
    if len(centers) >= 3:
        avg_cx = sum(c['cx'] for c in centers) / len(centers)
        for c in centers:
            # If a vehicle is on the opposite side of the average and isolated
            deviation = abs(c['cx'] - avg_cx)
            avg_deviation = sum(abs(cc['cx'] - avg_cx) for cc in centers) / len(centers)
            if deviation > avg_deviation * 2.5 and deviation > 100:
                wrong_side_indices.add(c['idx'])

    return wrong_side_indices


def build_violation_details(violations, detection_confidence=1.0):
    """Build detailed violation info from the VIOLATION_DB."""
    details = []
    for v in violations:
        info = VIOLATION_DB.get(v, VIOLATION_DB['None'])
        details.append({
            'type': v,
            'severity': info['severity'],
            'fine': info['fine'],
            'legal_section': info['section'],
            'penalty_points': info['points'],
            'description': info['description'],
            'confidence': round(min(1.0, detection_confidence), 2),
        })
    return details


def calculate_risk_score(all_violations):
    """Calculate an aggregate risk score (0-1) for the entire image based on all violations."""
    if not all_violations:
        return 0.0, 'none'

    total_weight = 0
    for v in all_violations:
        info = VIOLATION_DB.get(v, VIOLATION_DB['None'])
        total_weight += SEVERITY_WEIGHTS.get(info['severity'], 0)

    # Normalize: max reasonable violations ~ 10
    score = min(1.0, total_weight / 5.0)

    if score >= 0.8:
        level = 'critical'
    elif score >= 0.6:
        level = 'high'
    elif score >= 0.35:
        level = 'medium'
    elif score > 0:
        level = 'low'
    else:
        level = 'none'

    return round(score, 3), level


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

    # Run YOLO detection — low threshold to catch bikes/scooters
    results = model(img, conf=0.10, verbose=False)
    detections = results[0]

    # Debug: log ALL detections to console
    coco_names = model.names
    print(f"\n🔍 YOLO detected {len(detections.boxes)} objects:")
    for box in detections.boxes:
        cid = int(box.cls[0])
        c = float(box.conf[0])
        print(f"   [{cid}] {coco_names[cid]}: conf={c:.2f}")

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
    all_violations_flat = []  # For aggregate risk scoring

    for box in detections.boxes:
        cls_id = int(box.cls[0])
        if cls_id not in VEHICLE_CLASSES:
            continue

        vtype, base_name = VEHICLE_CLASSES[cls_id]
        conf = float(box.conf[0])
        coords = box.xyxy[0].tolist()
        bbox_w = coords[2] - coords[0]
        bbox_h = coords[3] - coords[1]
        bbox_area = bbox_w * bbox_h
        aspect_ratio = bbox_w / max(bbox_h, 1)

        # Heuristic: small, squarish car-like detections → Auto Rickshaw
        size_ratio = bbox_area / max(img_area, 1)
        if vtype == 'CAR' and size_ratio < 0.04 and 0.6 < aspect_ratio < 1.5:
            vtype = 'AUTO'
            base_name = 'Auto Rickshaw'

        # Extract color from vehicle region
        color = get_dominant_color(img, coords)

        # Generate descriptive model name
        model_desc = get_vehicle_description(vtype, base_name, color, bbox_area, img_area)

        # ── Person association — count riders/occupants ──
        rider_count = count_persons_on_vehicle(coords, person_boxes)

        # ── Enhanced smart violation detection ──
        helmet_detected = None    # None = not applicable
        seatbelt_detected = None  # None = not applicable
        violations = []           # Multiple violations per vehicle

        if vtype == '2W':
            # Bikes: improved helmet detection with spatial analysis
            if rider_count > 0:
                helmet_indicators = check_helmet_spatial(coords, person_boxes, detections, coco_names)
                if helmet_indicators and any(h for h in helmet_indicators):
                    # At least one rider has a helmet indicator
                    helmet_detected = True
                    # Check if SOME riders still don't have helmets (partial compliance)
                    unhelmeted = sum(1 for h in helmet_indicators if not h)
                    if unhelmeted > 0:
                        helmet_detected = False
                        violations.append('No Helmet')
                else:
                    # No helmet indicators found for any rider
                    helmet_detected = False
                    violations.append('No Helmet')
            else:
                # No rider detected — parked bike or rider not visible
                helmet_detected = None

            # Triple riding: 3+ persons associated with the bike
            if rider_count >= 3:
                violations.append('Triple Riding')

        elif vtype == 'CAR':
            # Cars: can't see seatbelt from exterior — mark as unverified
            seatbelt_detected = None  # Honestly unverifiable from YOLO
            # No automatic violation — YOLO can't see inside cars

        elif vtype == 'BUS' or vtype == 'CV':
            # Heavy vehicles: check for overloading heuristic
            if rider_count > 5 and vtype == 'CV':
                violations.append('Overloading')
            if rider_count > 10 and vtype == 'BUS':
                violations.append('Overloading')

        elif vtype == 'AUTO':
            # Autos: check overloading (typically max 3 passengers)
            if rider_count > 4:
                violations.append('Overloading')

        # ── Number plate detection heuristic ──
        try:
            if detect_number_plate_absence(img, coords, img_area):
                violations.append('No License Plate')
        except Exception:
            pass  # Don't let plate check crash the pipeline

        # Build violation details with severity, fine, legal section
        violation_details = build_violation_details(violations, conf)
        total_fine = sum(d['fine'] for d in violation_details)
        total_points = sum(d['penalty_points'] for d in violation_details)
        max_severity = 'none'
        severity_order = ['none', 'low', 'medium', 'high', 'critical']
        for d in violation_details:
            if severity_order.index(d['severity']) > severity_order.index(max_severity):
                max_severity = d['severity']

        violation_count += len(violations)
        all_violations_flat.extend(violations)
        violation_type = violations[0] if violations else 'None'

        vehicles.append({
            'license_plate': 'Not readable',
            'plate_readable': False,
            'model': model_desc,
            'color': color,
            'vehicle_type': vtype,
            'helmet_detected': helmet_detected,
            'seatbelt_detected': seatbelt_detected,
            'violation_type': violation_type,
            'violations': violations,
            'violation_details': violation_details,
            'total_fine': total_fine,
            'total_penalty_points': total_points,
            'max_severity': max_severity,
            'rider_count': rider_count,
            'confidence': round(conf, 2),
            'bbox': [round(c, 1) for c in coords],
        })

    # ── Wrong-side detection (requires multiple vehicles) ──
    wrong_side_indices = detect_wrong_side(vehicles)
    for idx in wrong_side_indices:
        v = vehicles[idx]
        if 'Wrong Side' not in v['violations']:
            v['violations'].append('Wrong Side')
            new_detail = build_violation_details(['Wrong Side'], v['confidence'])
            v['violation_details'].extend(new_detail)
            v['total_fine'] += new_detail[0]['fine']
            v['total_penalty_points'] += new_detail[0]['penalty_points']
            severity_order = ['none', 'low', 'medium', 'high', 'critical']
            if severity_order.index(new_detail[0]['severity']) > severity_order.index(v['max_severity']):
                v['max_severity'] = new_detail[0]['severity']
            if v['violation_type'] == 'None':
                v['violation_type'] = 'Wrong Side'
            violation_count += 1
            all_violations_flat.append('Wrong Side')

    # ── Aggregate risk score for entire image ──
    risk_score, risk_level = calculate_risk_score(all_violations_flat)
    total_estimated_fine = sum(v.get('total_fine', 0) for v in vehicles)

    return {
        'vehicles': vehicles,
        'totalDetected': len(vehicles),
        'violationCount': violation_count,
        'riskScore': risk_score,
        'riskLevel': risk_level,
        'totalEstimatedFine': total_estimated_fine,
        'analysisSource': 'YOLOv8 + CV (Local DL)',
        'analysisMode': 'yolo',
    }



# ─── Hybrid YOLO + Gemini Endpoint ───
@app.post("/analyze-hybrid")
async def analyze_hybrid(req: ImageAnalysisRequest):
    """Run YOLO for object detection, then enhance with Gemini context for violation confirmation."""
    # Step 1: Run YOLO detection
    yolo_result = await analyze_image(req)

    # Step 2: Build a detailed context summary from YOLO detections
    vehicles = yolo_result.get('vehicles', [])
    if not vehicles:
        return yolo_result

    context_lines = []
    for i, v in enumerate(vehicles):
        violations_str = ', '.join(v.get('violations', [])) or 'None'
        details = v.get('violation_details', [])
        fine = sum(d.get('fine', 0) for d in details)
        severity = v.get('max_severity', 'none')
        context_lines.append(
            f"Vehicle {i+1}: {v['vehicle_type']} ({v['model']}), "
            f"color={v['color']}, riders={v.get('rider_count', 0)}, "
            f"violations=[{violations_str}], severity={severity}, "
            f"fine=₹{fine}, confidence={v.get('confidence', 0)}"
        )

    yolo_result['analysisMode'] = 'hybrid'
    yolo_result['analysisSource'] = 'YOLOv8 + Gemini Hybrid'
    yolo_result['yoloContext'] = '\n'.join(context_lines)

    return yolo_result


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
    import signal
    import sys
    import uvicorn

    def handle_exit(signum, frame):
        print("\n🛑 Shutting down SLEVIS API...")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_exit)
    signal.signal(signal.SIGINT, handle_exit)

    print("🚀 SLEVIS DEEP LEARNING API v5.0")
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_graceful_shutdown=2)

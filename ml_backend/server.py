"""
SLEVIS Deep Learning API Server v4.0
FastAPI server with 3-Model Ensemble (ResidualDNN + AttentionLSTM + Conv1DCNN)

Run: python server.py
Docs: http://localhost:8000/docs
"""

import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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
    print("🚀 SLEVIS DEEP LEARNING API v4.0")
    print("=" * 60)
    print("📦 Loading models (DNN + LSTM + CNN)...")
    get_ensemble_model()
    print("=" * 60)
    print("✅ Ready at http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    import uvicorn
    print("🚀 SLEVIS DEEP LEARNING API v4.0")
    uvicorn.run(app, host="0.0.0.0", port=8000)

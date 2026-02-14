"""
SLEVIS Deep Learning API Server v3.0
FastAPI server with Ensemble (ResidualDNN + AttentionLSTM)

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
    ResidualDNN, AttentionLSTM, EnsemblePredictor,
    train_deep_model, VIOLATION_TYPES
)

app = FastAPI(
    title="SLEVIS Deep Learning API",
    description="Ensemble (ResidualDNN + AttentionLSTM) for traffic violation prediction",
    version="3.0.0"
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

DEEP_MODEL_PATH = "deep_model.keras"
LSTM_MODEL_PATH = "lstm_model.keras"
SCALER_PATH = "scaler.pkl"
WEIGHTS_PATH = "ensemble_weights.json"
METRICS_PATH = "training_metrics.json"


def get_ensemble_model():
    global ensemble_model, deep_model, lstm_model
    if ensemble_model is None:
        if os.path.exists(DEEP_MODEL_PATH) and os.path.exists(LSTM_MODEL_PATH):
            ensemble_model = EnsemblePredictor(
                dnn_path=DEEP_MODEL_PATH,
                lstm_path=LSTM_MODEL_PATH,
                scaler_path=SCALER_PATH if os.path.exists(SCALER_PATH) else None,
                weights_path=WEIGHTS_PATH if os.path.exists(WEIGHTS_PATH) else None,
            )
            deep_model = ensemble_model.dnn
            lstm_model = ensemble_model.lstm
        elif os.path.exists(DEEP_MODEL_PATH):
            deep_model = ResidualDNN(
                model_path=DEEP_MODEL_PATH,
                scaler_path=SCALER_PATH if os.path.exists(SCALER_PATH) else None
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


# Request/Response models
class PredictionRequest(BaseModel):
    vehicleType: str = "two_wheeler"
    location: str = ""
    timeOfDay: str = "12:00"
    dayOfWeek: str = "monday"
    model: str = "ensemble"  # "ensemble", "deep", or "lstm"


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
        "service": "SLEVIS Deep Learning API v3.0",
        "models": {
            "ensemble": "Weighted Ensemble (ResidualDNN + AttentionLSTM) — Best accuracy",
            "deep": "ResidualDNN — 9-Layer with Skip Connections (512→Res256→Res128→Res64→32)",
            "lstm": "AttentionLSTM — Bidirectional LSTM with Multi-Head Self-Attention"
        },
        "endpoints": ["/predict", "/classify", "/health", "/models", "/metrics"]
    }


@app.get("/health")
async def health():
    models_loaded = {
        "ensemble": ensemble_model is not None,
        "deep": deep_model is not None,
        "lstm": lstm_model is not None,
    }
    return {"status": "healthy", "violations": VIOLATION_TYPES, "models_loaded": models_loaded}


@app.get("/models")
async def list_models():
    return {
        "available": [
            {
                "id": "ensemble",
                "name": "Ensemble (ResidualDNN + AttentionLSTM)",
                "architecture": "Weighted average of DNN and LSTM predictions",
                "params": "~350K total",
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
    - model="ensemble": Weighted DNN+LSTM (default, best accuracy)
    - model="deep": ResidualDNN (fast, stable)
    - model="lstm": AttentionLSTM (temporal patterns)
    """
    try:
        if request.model == "lstm" and get_lstm_model():
            model = get_lstm_model()
            model_name = "AttentionLSTM"
        elif request.model == "deep" and get_deep_model():
            model = get_deep_model()
            model_name = "ResidualDNN"
        elif get_ensemble_model() and isinstance(get_ensemble_model(), EnsemblePredictor):
            model = get_ensemble_model()
            model_name = "Ensemble(DNN+LSTM)"
        else:
            model = get_deep_model()
            model_name = "ResidualDNN"

        result = model.predict(
            request.vehicleType,
            request.location,
            request.timeOfDay,
            request.dayOfWeek
        )
        result['modelUsed'] = model_name
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
    print("🚀 SLEVIS DEEP LEARNING API v3.0")
    print("=" * 60)
    print("📦 Loading models...")
    get_ensemble_model()
    print("=" * 60)
    print("✅ Ready at http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

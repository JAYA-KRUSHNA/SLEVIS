"""
SLEVIS Production Deep Learning Models
========================================
Best-in-class models for traffic violation prediction.

Models:
1. ResidualDNN — 9-layer DNN with skip connections (ResNet-style)
2. AttentionLSTM — Bidirectional LSTM with self-attention
3. EnsemblePredictor — Weighted ensemble of DNN + LSTM

Trained on 50K realistic Indian traffic violation samples (see dataset.py).
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.layers import (
    Input, Dense, LSTM, Bidirectional,
    Embedding, Conv1D, GlobalMaxPooling1D,
    Dropout, BatchNormalization, LayerNormalization,
    Add, Multiply, Concatenate, Reshape, RepeatVector,
    Permute, Lambda, Flatten
)
from tensorflow.keras.regularizers import l2
from tensorflow.keras.callbacks import (
    EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
)
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, roc_auc_score, f1_score,
    precision_score, recall_score, accuracy_score
)
import pickle
import warnings

# Suppress TF warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
tf.get_logger().setLevel('ERROR')
warnings.filterwarnings('ignore')

# ============================================================
# CONSTANTS
# ============================================================

VIOLATION_TYPES = [
    'no_helmet', 'signal_jump', 'overspeeding', 'wrong_side',
    'triple_riding', 'no_seatbelt', 'using_phone', 'drunk_driving', 'overloading'
]
VEHICLE_TYPES = ['two_wheeler', 'four_wheeler', 'auto_rickshaw', 'commercial']
DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
LOCATION_TYPES = ['highway', 'junction', 'residential', 'commercial', 'school_zone']
WEATHER_TYPES = ['clear', 'rain', 'fog', 'extreme_heat']
ROAD_TYPES = ['two_lane', 'four_lane', 'highway', 'flyover']

N_FEATURES = 20
N_LABELS = len(VIOLATION_TYPES)  # 9

FEATURE_NAMES = [
    'vehicle_two_wheeler', 'vehicle_four_wheeler', 'vehicle_auto_rickshaw', 'vehicle_commercial',
    'hour_sin', 'hour_cos', 'is_weekend', 'is_rush_hour', 'is_night',
    'loc_highway', 'loc_junction', 'loc_residential', 'loc_commercial', 'loc_school_zone',
    'is_bad_weather', 'is_hot_weather',
    'is_festival', 'is_early_morning',
    'population_density', 'road_type_encoded'
]


# ============================================================
# RESIDUAL DENSE BLOCK
# ============================================================

def residual_block(x, units, dropout_rate=0.3, name_prefix='res'):
    """Residual block with skip connection."""
    shortcut = x

    # Main path
    out = Dense(units, activation='relu', kernel_regularizer=l2(0.0005),
                name=f'{name_prefix}_dense1')(x)
    out = BatchNormalization(name=f'{name_prefix}_bn1')(out)
    out = Dropout(dropout_rate, name=f'{name_prefix}_drop1')(out)

    out = Dense(units, activation='relu', kernel_regularizer=l2(0.0005),
                name=f'{name_prefix}_dense2')(out)
    out = BatchNormalization(name=f'{name_prefix}_bn2')(out)

    # Skip connection: project shortcut if shapes differ
    if shortcut.shape[-1] != units:
        shortcut = Dense(units, kernel_regularizer=l2(0.0005),
                         name=f'{name_prefix}_proj')(shortcut)
        shortcut = BatchNormalization(name=f'{name_prefix}_proj_bn')(shortcut)

    out = Add(name=f'{name_prefix}_add')([out, shortcut])
    out = layers.Activation('relu', name=f'{name_prefix}_act')(out)
    out = Dropout(dropout_rate * 0.5, name=f'{name_prefix}_drop2')(out)

    return out


# ============================================================
# 1. RESIDUAL DEEP NEURAL NETWORK
# ============================================================

class ResidualDNN:
    """
    9-Layer Residual Deep Neural Network

    Architecture:
    - Input (20 features)
    - Dense 512 + BN + Dropout (stem)
    - ResBlock(256) — 2 dense layers + skip
    - ResBlock(128) — 2 dense layers + skip
    - ResBlock(64)  — 2 dense layers + skip
    - Dense 32 (bottleneck)
    - Output 9 (sigmoid, multi-label)

    Total layers: 9 dense + batch norms + dropouts
    Key features: Skip connections, label smoothing, cosine annealing LR
    """

    def __init__(self, model_path: str = None, scaler_path: str = None):
        self.scaler = None
        if scaler_path and os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)

        if model_path and os.path.exists(model_path):
            self.model = keras.models.load_model(model_path)
            print(f"  ✅ ResidualDNN loaded from {model_path}")
        else:
            self._build()

    def _build(self):
        """Build the residual DNN."""
        inputs = Input(shape=(N_FEATURES,), name='input')

        # Stem
        x = Dense(512, activation='relu', kernel_regularizer=l2(0.0005), name='stem_dense')(inputs)
        x = BatchNormalization(name='stem_bn')(x)
        x = Dropout(0.4, name='stem_drop')(x)

        # Residual blocks
        x = residual_block(x, 256, dropout_rate=0.35, name_prefix='res1')
        x = residual_block(x, 128, dropout_rate=0.30, name_prefix='res2')
        x = residual_block(x, 64,  dropout_rate=0.25, name_prefix='res3')

        # Bottleneck
        x = Dense(32, activation='relu', name='bottleneck')(x)
        x = Dropout(0.15, name='bottleneck_drop')(x)

        # Output: sigmoid for multi-label
        outputs = Dense(N_LABELS, activation='sigmoid', name='output')(x)

        self.model = Model(inputs=inputs, outputs=outputs, name='ResidualDNN')

        # Cosine annealing schedule
        lr_schedule = keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=0.001,
            decay_steps=5000,
            alpha=1e-6  # min LR
        )
        optimizer = keras.optimizers.Adam(learning_rate=lr_schedule)

        self.model.compile(
            optimizer=optimizer,
            loss=keras.losses.BinaryCrossentropy(label_smoothing=0.05),
            metrics=[
                'accuracy',
                keras.metrics.AUC(name='auc', multi_label=True),
                keras.metrics.Precision(name='precision'),
                keras.metrics.Recall(name='recall'),
            ]
        )

        print("\n" + "=" * 60)
        print("🧠 RESIDUAL DEEP NEURAL NETWORK (9 Layers)")
        print("=" * 60)
        print("Architecture: 20 → 512 → [Res256] → [Res128] → [Res64] → 32 → 9")
        print(f"Total Parameters: {self.model.count_params():,}")

    def preprocess(self, vehicle_type, location, time_str, day):
        """Convert raw inputs to 20-feature vector."""
        features = np.zeros(N_FEATURES, dtype=np.float32)

        # Vehicle one-hot (0-3)
        vt = vehicle_type.lower() if vehicle_type else ''
        for i, v in enumerate(VEHICLE_TYPES):
            if v in vt or vt in v:
                features[i] = 1.0
                break

        # Time features (4-8)
        try:
            hour = int(time_str.split(':')[0])
        except:
            hour = 12
        features[4] = np.sin(2 * np.pi * hour / 24)   # hour_sin
        features[5] = np.cos(2 * np.pi * hour / 24)   # hour_cos
        features[6] = 1.0 if day.lower() in ['saturday', 'sunday'] else 0.0  # is_weekend
        features[7] = 1.0 if (8 <= hour <= 10) or (17 <= hour <= 20) else 0.0  # is_rush
        features[8] = 1.0 if hour >= 22 or hour <= 4 else 0.0  # is_night

        # Location one-hot (9-13)
        loc = (location or '').lower()
        loc_mapping = {
            0: ['highway', 'ring road', 'bypass', 'expressway', 'nh-', 'national highway'],
            1: ['junction', 'signal', 'crossing', 'cross road', 'circle', 'chowk'],
            2: ['residential', 'colony', 'nagar', 'layout', 'block', 'hostel'],
            3: ['commercial', 'mall', 'market', 'street', 'business', 'it ', 'tech', 'shop'],
            4: ['school', 'college', 'university', 'campus', 'institute', 'vidya'],
        }
        matched = False
        for idx, keywords in loc_mapping.items():
            if any(k in loc for k in keywords):
                features[9 + idx] = 1.0
                matched = True
                break
        if not matched:
            features[10] = 1.0  # default: junction

        # Weather flags (14-15) — default clear
        features[14] = 0.0  # is_bad_weather
        features[15] = 0.0  # is_hot_weather

        # Context (16-17)
        features[16] = 0.0  # is_festival (can't determine from inputs)
        features[17] = 1.0 if 5 <= hour <= 7 else 0.0  # is_early_morning

        # Density + road (18-19)
        density_map = {0: 0.3, 1: 0.8, 2: 0.5, 3: 0.9, 4: 0.6}
        loc_idx = np.argmax(features[9:14])
        features[18] = density_map.get(loc_idx, 0.5)
        features[19] = 0.33  # default road type

        X = features.reshape(1, -1)
        if self.scaler:
            X = self.scaler.transform(X)
        return X

    def predict(self, vehicle_type, location, time_str, day):
        """Run inference and return formatted prediction."""
        X = self.preprocess(vehicle_type, location, time_str, day)
        probs = self.model.predict(X, verbose=0)[0]
        return self._format_result(probs, vehicle_type, location, time_str, day, 'ResidualDNN')

    def _format_result(self, probs, vehicle_type, location, time_str, day, model_name):
        """Format prediction output."""
        predictions = []
        for i, v in enumerate(VIOLATION_TYPES):
            p = float(np.clip(probs[i], 0, 1))
            predictions.append({
                'type': v,
                'probability': round(p, 4),
                'riskLevel': 'high' if p > 0.55 else 'medium' if p > 0.30 else 'low'
            })
        predictions.sort(key=lambda x: -x['probability'])

        top3_avg = np.mean([p['probability'] for p in predictions[:3]])
        top_v = predictions[0]['type']

        recs = {
            'no_helmet': 'Deploy helmet check drive at this location. Focus on two-wheelers.',
            'signal_jump': 'Position traffic cameras and patrol near signals. Consider red-light cameras.',
            'overspeeding': 'Set up speed traps with radar guns. Consider speed-calming infrastructure.',
            'drunk_driving': 'Conduct breathalyzer checkpoints. Coordinate with nearby bars/restaurants.',
            'wrong_side': 'Install directional barriers. Increase signage for one-way enforcement.',
            'triple_riding': 'Focus on two-wheeler overloading. Station officers near schools.',
            'no_seatbelt': 'Conduct seatbelt awareness campaigns. Random checks on four-wheelers.',
            'using_phone': 'Deploy phone-detection cameras. Increase fines and awareness.',
            'overloading': 'Weigh-bridge checks for commercial vehicles. Fine overloaded autos.',
        }

        return {
            'predictions': predictions[:5],
            'overallRisk': 'high' if top3_avg > 0.50 else 'medium' if top3_avg > 0.30 else 'low',
            'recommendation': recs.get(top_v, 'General patrol recommended for this area.'),
            'hotspotAnalysis': (
                f'Deep learning analysis for {vehicle_type} at {location}, '
                f'{day} {time_str}. Model: {model_name}. '
                f'Primary risk: {top_v.replace("_", " ")} ({predictions[0]["probability"]*100:.1f}%).'
            )
        }

    def save(self, path):
        self.model.save(path)


# ============================================================
# 2. ATTENTION LSTM
# ============================================================

class AttentionLSTM:
    """
    Bidirectional LSTM with Self-Attention mechanism.

    Architecture:
    - Input (20) → Reshape to (4 groups, 5 features)
    - Bidirectional LSTM (64 units, return_sequences)
    - Self-attention: query-key-value attention
    - LSTM (32 units)
    - Dense(64) + Dense(32) → Output(9)

    The 20 features are grouped into 4 temporal steps:
    - Step 1: Vehicle type (4 features)
    - Step 2: Temporal (5 features, padded to 5)
    - Step 3: Location (5 features)
    - Step 4: Context (weather + festival + density = 6 features, padded to 5)
    """

    def __init__(self, model_path=None, scaler_path=None):
        self.scaler = None
        if scaler_path and os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)

        if model_path and os.path.exists(model_path):
            self.model = keras.models.load_model(model_path)
            print(f"  ✅ AttentionLSTM loaded from {model_path}")
        else:
            self._build()

    def _build(self):
        """Build attention LSTM model."""
        inputs = Input(shape=(N_FEATURES,), name='input')

        # Reshape 20 features → (5 timesteps, 4 features)
        x = Dense(20, activation='relu', name='proj')(inputs)
        x = Reshape((5, 4), name='reshape')(x)

        # Bidirectional LSTM 1
        x = Bidirectional(
            LSTM(64, return_sequences=True, dropout=0.3, recurrent_dropout=0.15),
            name='bilstm_1'
        )(x)
        x = LayerNormalization(name='ln_1')(x)

        # Self-attention mechanism
        # Q, K, V from LSTM output
        attention_output = layers.MultiHeadAttention(
            num_heads=4, key_dim=32, dropout=0.1, name='self_attn'
        )(x, x, x)
        x = Add(name='attn_residual')([x, attention_output])
        x = LayerNormalization(name='ln_attn')(x)

        # LSTM 2
        x = LSTM(32, return_sequences=False, dropout=0.2, name='lstm_2')(x)
        x = LayerNormalization(name='ln_2')(x)

        # Dense head
        x = Dense(64, activation='relu', kernel_regularizer=l2(0.001), name='dense_1')(x)
        x = Dropout(0.25, name='drop_1')(x)
        x = Dense(32, activation='relu', name='dense_2')(x)
        x = Dropout(0.15, name='drop_2')(x)

        outputs = Dense(N_LABELS, activation='sigmoid', name='output')(x)

        self.model = Model(inputs=inputs, outputs=outputs, name='AttentionLSTM')

        lr_schedule = keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=0.0008,
            decay_steps=4000,
            alpha=1e-6
        )

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=lr_schedule),
            loss=keras.losses.BinaryCrossentropy(label_smoothing=0.03),
            metrics=[
                'accuracy',
                keras.metrics.AUC(name='auc', multi_label=True),
                keras.metrics.Precision(name='precision'),
                keras.metrics.Recall(name='recall'),
            ]
        )

        print("\n" + "=" * 60)
        print("🔄 ATTENTION LSTM (Bidirectional + Self-Attention)")
        print("=" * 60)
        print("Architecture: 20 → Reshape(5,4) → BiLSTM(64) → SelfAttn(4h) → LSTM(32) → Dense → 9")
        print(f"Total Parameters: {self.model.count_params():,}")

    def preprocess(self, vehicle_type, location, time_str, day):
        """Same preprocessing as ResidualDNN."""
        # Reuse the same feature engineering
        temp = ResidualDNN.__new__(ResidualDNN)
        temp.scaler = self.scaler
        return temp.preprocess(vehicle_type, location, time_str, day)

    def predict(self, vehicle_type, location, time_str, day):
        X = self.preprocess(vehicle_type, location, time_str, day)
        probs = self.model.predict(X, verbose=0)[0]
        temp = ResidualDNN.__new__(ResidualDNN)
        return temp._format_result(probs, vehicle_type, location, time_str, day, 'AttentionLSTM')

    def save(self, path):
        self.model.save(path)


# ============================================================
# 3. CONV1D VIOLATION PREDICTOR (CNN)
# ============================================================

class Conv1DViolationPredictor:
    """
    1D Convolutional Neural Network for Violation Prediction.

    Architecture:
    - Input (20) → Reshape(20, 1)
    - Conv1D(64, 3) + BN + Dropout
    - Conv1D(128, 3) + BN + Dropout
    - Conv1D(64, 3) + BN + Dropout
    - GlobalMaxPooling1D
    - Dense(64) + Dropout → Dense(32) → Output(9, sigmoid)

    Treats the 20-feature vector as a 1D signal and learns
    local feature interactions via convolution.
    """

    def __init__(self, model_path=None, scaler_path=None):
        self.scaler = None
        if scaler_path and os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)

        if model_path and os.path.exists(model_path):
            self.model = keras.models.load_model(model_path)
            print(f"  ✅ Conv1DCNN loaded from {model_path}")
        else:
            self._build()

    def _build(self):
        """Build the 1D-CNN model."""
        inputs = Input(shape=(N_FEATURES,), name='input')

        # Reshape to (20, 1) for Conv1D
        x = Reshape((N_FEATURES, 1), name='reshape')(inputs)

        # Conv block 1
        x = Conv1D(64, 3, activation='relu', padding='same',
                   kernel_regularizer=l2(0.0005), name='conv1')(x)
        x = BatchNormalization(name='bn1')(x)
        x = Dropout(0.3, name='drop1')(x)

        # Conv block 2
        x = Conv1D(128, 3, activation='relu', padding='same',
                   kernel_regularizer=l2(0.0005), name='conv2')(x)
        x = BatchNormalization(name='bn2')(x)
        x = Dropout(0.3, name='drop2')(x)

        # Conv block 3
        x = Conv1D(64, 3, activation='relu', padding='same',
                   kernel_regularizer=l2(0.0005), name='conv3')(x)
        x = BatchNormalization(name='bn3')(x)
        x = Dropout(0.25, name='drop3')(x)

        # Global pooling
        x = GlobalMaxPooling1D(name='global_pool')(x)

        # Dense head
        x = Dense(64, activation='relu', kernel_regularizer=l2(0.001), name='dense1')(x)
        x = Dropout(0.25, name='dense_drop1')(x)
        x = Dense(32, activation='relu', name='dense2')(x)
        x = Dropout(0.15, name='dense_drop2')(x)

        outputs = Dense(N_LABELS, activation='sigmoid', name='output')(x)

        self.model = Model(inputs=inputs, outputs=outputs, name='Conv1DCNN')

        lr_schedule = keras.optimizers.schedules.CosineDecay(
            initial_learning_rate=0.001,
            decay_steps=4500,
            alpha=1e-6
        )

        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=lr_schedule),
            loss=keras.losses.BinaryCrossentropy(label_smoothing=0.04),
            metrics=[
                'accuracy',
                keras.metrics.AUC(name='auc', multi_label=True),
                keras.metrics.Precision(name='precision'),
                keras.metrics.Recall(name='recall'),
            ]
        )

        print("\n" + "=" * 60)
        print("🔬 CONV1D CNN (1D Convolutional Neural Network)")
        print("=" * 60)
        print("Architecture: 20 → Reshape(20,1) → Conv64 → Conv128 → Conv64 → GlobalMaxPool → Dense → 9")
        print(f"Total Parameters: {self.model.count_params():,}")

    def preprocess(self, vehicle_type, location, time_str, day):
        """Same preprocessing as ResidualDNN."""
        temp = ResidualDNN.__new__(ResidualDNN)
        temp.scaler = self.scaler
        return temp.preprocess(vehicle_type, location, time_str, day)

    def predict(self, vehicle_type, location, time_str, day):
        X = self.preprocess(vehicle_type, location, time_str, day)
        probs = self.model.predict(X, verbose=0)[0]
        temp = ResidualDNN.__new__(ResidualDNN)
        return temp._format_result(probs, vehicle_type, location, time_str, day, 'Conv1DCNN')

    def save(self, path):
        self.model.save(path)


# ============================================================
# 4. ENSEMBLE PREDICTOR (3-Model: DNN + LSTM + CNN)
# ============================================================

class EnsemblePredictor:
    """
    Weighted Ensemble of ResidualDNN + AttentionLSTM + Conv1DCNN.

    Combines predictions from 3 models with learned weights.
    Default weights: DNN 0.40, LSTM 0.30, CNN 0.30.
    Returns confidence score for best-of selection with Gemini.
    """

    def __init__(self, dnn_path=None, lstm_path=None, cnn_path=None,
                 scaler_path=None, weights_path=None):
        self.dnn = ResidualDNN(model_path=dnn_path, scaler_path=scaler_path)
        self.lstm = AttentionLSTM(model_path=lstm_path, scaler_path=scaler_path)
        self.cnn = Conv1DViolationPredictor(model_path=cnn_path, scaler_path=scaler_path)

        # Default weights
        self.dnn_weight = 0.40
        self.lstm_weight = 0.30
        self.cnn_weight = 0.30

        if weights_path and os.path.exists(weights_path):
            with open(weights_path, 'r') as f:
                w = json.load(f)
                self.dnn_weight = w.get('dnn_weight', 0.40)
                self.lstm_weight = w.get('lstm_weight', 0.30)
                self.cnn_weight = w.get('cnn_weight', 0.30)
            print(f"  ✅ Ensemble weights: DNN={self.dnn_weight:.2f}, LSTM={self.lstm_weight:.2f}, CNN={self.cnn_weight:.2f}")

    def predict(self, vehicle_type, location, time_str, day):
        """Weighted average prediction with confidence score."""
        X = self.dnn.preprocess(vehicle_type, location, time_str, day)

        dnn_probs = self.dnn.model.predict(X, verbose=0)[0]
        lstm_probs = self.lstm.model.predict(X, verbose=0)[0]
        cnn_probs = self.cnn.model.predict(X, verbose=0)[0]

        # Weighted average of 3 models
        combined = (self.dnn_weight * dnn_probs +
                    self.lstm_weight * lstm_probs +
                    self.cnn_weight * cnn_probs)

        temp = ResidualDNN.__new__(ResidualDNN)
        result = temp._format_result(
            combined, vehicle_type, location, time_str, day,
            'Ensemble(DNN+LSTM+CNN)'
        )

        # Add confidence score: average of top-3 prediction probabilities
        top3_probs = sorted([float(p) for p in combined], reverse=True)[:3]
        result['confidence'] = round(float(np.mean(top3_probs)), 4)
        result['modelUsed'] = 'DL Ensemble (DNN+LSTM+CNN)'

        return result

    def optimize_weights(self, X_val, y_val):
        """Find optimal 3-model ensemble weights on validation set."""
        print("\n🔍 Optimizing 3-model ensemble weights...")
        best_auc = 0
        best_weights = (0.40, 0.30, 0.30)

        dnn_preds = self.dnn.model.predict(X_val, verbose=0)
        lstm_preds = self.lstm.model.predict(X_val, verbose=0)
        cnn_preds = self.cnn.model.predict(X_val, verbose=0)

        # Grid search over weight combinations
        for w_dnn in np.arange(0.2, 0.7, 0.05):
            for w_lstm in np.arange(0.1, 0.6, 0.05):
                w_cnn = round(1.0 - w_dnn - w_lstm, 2)
                if w_cnn < 0.05 or w_cnn > 0.6:
                    continue

                combined = w_dnn * dnn_preds + w_lstm * lstm_preds + w_cnn * cnn_preds
                try:
                    auc = roc_auc_score(y_val, combined, average='macro', multi_class='ovr')
                except:
                    auc = roc_auc_score((y_val > 0.5).astype(int), combined, average='macro')

                if auc > best_auc:
                    best_auc = auc
                    best_weights = (round(w_dnn, 2), round(w_lstm, 2), round(w_cnn, 2))

        self.dnn_weight, self.lstm_weight, self.cnn_weight = best_weights
        print(f"   Optimal: DNN={self.dnn_weight}, LSTM={self.lstm_weight}, CNN={self.cnn_weight} (AUC={best_auc:.4f})")

        return {
            'dnn_weight': self.dnn_weight,
            'lstm_weight': self.lstm_weight,
            'cnn_weight': self.cnn_weight,
            'val_auc': round(best_auc, 4)
        }


# ============================================================
# CNN TEXT CLASSIFIER (for NLP complaints)
# ============================================================

class CNNTextClassifier:
    """
    1D CNN for complaint text classification.

    Architecture:
    - Embedding(5000, 128)
    - Conv1D(128, 3) → MaxPool → Conv1D(64, 4) → MaxPool → Conv1D(32, 5)
    - GlobalMaxPool → Dense(64) → Dense(32) → Output(9)
    """

    CATEGORIES = [
        'reckless_driving', 'signal_jump', 'no_helmet', 'wrong_side',
        'overspeeding', 'drunk_driving', 'road_rage', 'parking', 'other'
    ]

    def __init__(self, vocab_size=5000, max_length=100):
        self.vocab_size = vocab_size
        self.max_length = max_length
        self.tokenizer = None
        self._build()

    def _build(self):
        inputs = Input(shape=(self.max_length,), name='text_input')
        x = Embedding(self.vocab_size, 128, name='embedding')(inputs)

        x = Conv1D(128, 3, activation='relu', padding='same')(x)
        x = layers.MaxPooling1D(2)(x)
        x = Conv1D(64, 4, activation='relu', padding='same')(x)
        x = layers.MaxPooling1D(2)(x)
        x = Conv1D(32, 5, activation='relu', padding='same')(x)
        x = GlobalMaxPooling1D()(x)

        x = Dense(64, activation='relu')(x)
        x = Dropout(0.3)(x)
        x = Dense(32, activation='relu')(x)
        outputs = Dense(len(self.CATEGORIES), activation='softmax')(x)

        self.model = Model(inputs=inputs, outputs=outputs, name='CNNTextClassifier')
        self.model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

        print("\n" + "=" * 60)
        print("📝 CNN TEXT CLASSIFIER (NLP)")
        print("=" * 60)
        print(f"Total Parameters: {self.model.count_params():,}")


# ============================================================
# TRAINING FUNCTIONS
# ============================================================

def train_residual_dnn(X_train, y_train, X_val, y_val,
                       epochs=80, batch_size=128, save_path='deep_model.keras'):
    """Train the ResidualDNN with best practices."""
    print("\n" + "=" * 60)
    print("🏋️ TRAINING RESIDUAL DNN")
    print("=" * 60)

    model = ResidualDNN()

    callbacks = [
        EarlyStopping(
            monitor='val_auc', patience=15, mode='max',
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=7,
            min_lr=1e-7, verbose=1
        ),
        ModelCheckpoint(
            save_path, monitor='val_auc', mode='max',
            save_best_only=True, verbose=0
        ),
    ]

    print(f"\n📊 Training: {len(X_train):,} samples | Validation: {len(X_val):,} samples")

    history = model.model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )

    print(f"\n✅ ResidualDNN saved to {save_path}")
    return model, history


def train_attention_lstm(X_train, y_train, X_val, y_val,
                         epochs=60, batch_size=64, save_path='lstm_model.keras'):
    """Train the AttentionLSTM."""
    print("\n" + "=" * 60)
    print("🏋️ TRAINING ATTENTION LSTM")
    print("=" * 60)

    model = AttentionLSTM()

    callbacks = [
        EarlyStopping(
            monitor='val_auc', patience=12, mode='max',
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=5,
            min_lr=1e-7, verbose=1
        ),
        ModelCheckpoint(
            save_path, monitor='val_auc', mode='max',
            save_best_only=True, verbose=0
        ),
    ]

    print(f"\n📊 Training: {len(X_train):,} samples | Validation: {len(X_val):,} samples")

    history = model.model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )

    print(f"\n✅ AttentionLSTM saved to {save_path}")
    return model, history


def train_cnn_model(X_train, y_train, X_val, y_val,
                    epochs=60, batch_size=128, save_path='cnn_model.keras'):
    """Train the Conv1D CNN."""
    print("\n" + "=" * 60)
    print("🏋️ TRAINING CONV1D CNN")
    print("=" * 60)

    model = Conv1DViolationPredictor()

    callbacks = [
        EarlyStopping(
            monitor='val_auc', patience=12, mode='max',
            restore_best_weights=True, verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss', factor=0.5, patience=6,
            min_lr=1e-7, verbose=1
        ),
        ModelCheckpoint(
            save_path, monitor='val_auc', mode='max',
            save_best_only=True, verbose=0
        ),
    ]

    print(f"\n📊 Training: {len(X_train):,} samples | Validation: {len(X_val):,} samples")

    history = model.model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )

    print(f"\n✅ Conv1DCNN saved to {save_path}")
    return model, history


def evaluate_model(model_obj, X_test, y_test, model_name='Model'):
    """Comprehensive model evaluation."""
    print(f"\n{'='*60}")
    print(f"📊 EVALUATION: {model_name}")
    print(f"{'='*60}")

    y_pred = model_obj.model.predict(X_test, verbose=0)
    y_pred_binary = (y_pred > 0.5).astype(int)
    y_true_binary = (y_test > 0.5).astype(int)

    # Per-violation metrics
    metrics = {}
    print(f"\n{'Violation Type':<20} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'AUC':>10}")
    print("-" * 62)

    for i, v in enumerate(VIOLATION_TYPES):
        try:
            auc = roc_auc_score(y_true_binary[:, i], y_pred[:, i])
        except:
            auc = 0.0

        prec = precision_score(y_true_binary[:, i], y_pred_binary[:, i], zero_division=0)
        rec = recall_score(y_true_binary[:, i], y_pred_binary[:, i], zero_division=0)
        f1 = f1_score(y_true_binary[:, i], y_pred_binary[:, i], zero_division=0)

        metrics[v] = {'precision': round(prec, 4), 'recall': round(rec, 4),
                       'f1': round(f1, 4), 'auc': round(auc, 4)}
        print(f"  {v:<20} {prec:>10.4f} {rec:>10.4f} {f1:>10.4f} {auc:>10.4f}")

    # Overall
    try:
        macro_auc = roc_auc_score(y_true_binary, y_pred, average='macro')
    except:
        macro_auc = np.mean([m['auc'] for m in metrics.values()])

    macro_f1 = f1_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)
    macro_prec = precision_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)
    macro_rec = recall_score(y_true_binary, y_pred_binary, average='macro', zero_division=0)

    print("-" * 62)
    print(f"  {'MACRO AVERAGE':<20} {macro_prec:>10.4f} {macro_rec:>10.4f} {macro_f1:>10.4f} {macro_auc:>10.4f}")

    overall = {
        'macro_precision': round(macro_prec, 4),
        'macro_recall': round(macro_rec, 4),
        'macro_f1': round(macro_f1, 4),
        'macro_auc': round(macro_auc, 4),
    }

    metrics['overall'] = overall
    return metrics


# ============================================================
# BACKWARD COMPATIBILITY: old function names
# ============================================================

# Keep old names working for server.py compatibility
DeepViolationPredictor = ResidualDNN
LSTMViolationPredictor = AttentionLSTM
CNNViolationPredictor = Conv1DViolationPredictor


def generate_training_data(n_samples=10000):
    """Backward-compatible wrapper: generates dataset on the fly."""
    from dataset import generate_dataset
    _, X, y = generate_dataset(n_samples=n_samples)
    return X, y


def train_deep_model(epochs=50, save_path='deep_model.keras'):
    """Backward-compatible wrapper for training."""
    X, y = generate_training_data(15000)
    split = int(0.8 * len(X))
    model, _ = train_residual_dnn(X[:split], y[:split], X[split:], y[split:],
                                   epochs=epochs, save_path=save_path)
    return model


def train_lstm_model(epochs=30, save_path='lstm_model.keras'):
    """Backward-compatible wrapper for LSTM training."""
    X, y = generate_training_data(10000)
    split = int(0.8 * len(X))
    model, _ = train_attention_lstm(X[:split], y[:split], X[split:], y[split:],
                                     epochs=epochs, save_path=save_path)
    return model

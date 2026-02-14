"""
SLEVIS Production Training Pipeline
=====================================
Trains ResidualDNN + AttentionLSTM + Conv1DCNN + Ensemble on realistic traffic data.

Usage:
    python train_model.py                  # Full training (50K samples)
    python train_model.py --samples 20000  # Quick training
    python train_model.py --epochs 100     # More epochs

Output:
    - deep_model.keras       (ResidualDNN)
    - lstm_model.keras        (AttentionLSTM)
    - cnn_model.keras         (Conv1DCNN)
    - scaler.pkl              (StandardScaler)
    - ensemble_weights.json   (Optimal 3-model weights)
    - training_metrics.json   (All evaluation metrics)
    - traffic_violations_dataset.csv (Generated dataset)
"""

import os
import sys
import json
import time
import pickle
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# Add current dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataset import generate_dataset, print_dataset_stats
from model import (
    ResidualDNN, AttentionLSTM, Conv1DViolationPredictor, EnsemblePredictor,
    train_residual_dnn, train_attention_lstm, train_cnn_model,
    evaluate_model, VIOLATION_TYPES
)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='SLEVIS ML Training Pipeline')
    parser.add_argument('--samples', type=int, default=50000, help='Dataset size')
    parser.add_argument('--epochs', type=int, default=80, help='Max epochs (early stopping applies)')
    parser.add_argument('--batch-size', type=int, default=128, help='Batch size')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--output', type=str, default='.', help='Output directory')
    args = parser.parse_args()

    start_time = time.time()

    print("\n" + "=" * 70)
    print("🚀 SLEVIS PRODUCTION TRAINING PIPELINE")
    print("=" * 70)
    print(f"   Samples: {args.samples:,}")
    print(f"   Max Epochs: {args.epochs}")
    print(f"   Batch Size: {args.batch_size}")
    print(f"   Seed: {args.seed}")
    print("=" * 70)

    # ── Step 1: Generate Dataset ─────────────────────────────
    print("\n\n📦 STEP 1: Generating Dataset...")
    df, X, y = generate_dataset(n_samples=args.samples, seed=args.seed)
    print_dataset_stats(df, y)

    # Save CSV
    csv_path = os.path.join(args.output, 'traffic_violations_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"\n💾 Dataset saved: {csv_path}")

    # ── Step 2: Prepare Data ─────────────────────────────────
    print("\n\n📦 STEP 2: Preparing Data...")

    # Split: 70% train, 15% validation, 15% test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=args.seed
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.176,  # 0.176 of 85% ≈ 15%
        random_state=args.seed
    )

    print(f"   Train:      {len(X_train):>7,} samples ({len(X_train)/len(X)*100:.1f}%)")
    print(f"   Validation: {len(X_val):>7,} samples ({len(X_val)/len(X)*100:.1f}%)")
    print(f"   Test:       {len(X_test):>7,} samples ({len(X_test)/len(X)*100:.1f}%)")

    # Feature scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    scaler_path = os.path.join(args.output, 'scaler.pkl')
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"   💾 Scaler saved: {scaler_path}")

    # ── Step 3: Train ResidualDNN ────────────────────────────
    print("\n\n🏋️ STEP 3: Training ResidualDNN...")
    dnn_path = os.path.join(args.output, 'deep_model.keras')
    dnn_model, dnn_history = train_residual_dnn(
        X_train_scaled, y_train, X_val_scaled, y_val,
        epochs=args.epochs, batch_size=args.batch_size, save_path=dnn_path
    )

    # ── Step 4: Train AttentionLSTM ──────────────────────────
    print("\n\n🏋️ STEP 4: Training AttentionLSTM...")
    lstm_path = os.path.join(args.output, 'lstm_model.keras')
    lstm_model, lstm_history = train_attention_lstm(
        X_train_scaled, y_train, X_val_scaled, y_val,
        epochs=args.epochs, batch_size=min(64, args.batch_size),
        save_path=lstm_path
    )

    # ── Step 5: Train Conv1D CNN ─────────────────────────────
    print("\n\n🏋️ STEP 5: Training Conv1D CNN...")
    cnn_path = os.path.join(args.output, 'cnn_model.keras')
    cnn_model, cnn_history = train_cnn_model(
        X_train_scaled, y_train, X_val_scaled, y_val,
        epochs=args.epochs, batch_size=args.batch_size,
        save_path=cnn_path
    )

    # ── Step 6: Evaluate All 3 Models ────────────────────────
    print("\n\n📊 STEP 6: Evaluating Models on Test Set...")
    dnn_metrics = evaluate_model(dnn_model, X_test_scaled, y_test, 'ResidualDNN')
    lstm_metrics = evaluate_model(lstm_model, X_test_scaled, y_test, 'AttentionLSTM')
    cnn_metrics = evaluate_model(cnn_model, X_test_scaled, y_test, 'Conv1DCNN')

    # ── Step 7: Optimize 3-Model Ensemble ────────────────────
    print("\n\n🔗 STEP 7: Optimizing 3-Model Ensemble...")
    ensemble = EnsemblePredictor.__new__(EnsemblePredictor)
    ensemble.dnn = dnn_model
    ensemble.lstm = lstm_model
    ensemble.cnn = cnn_model
    ensemble.dnn_weight = 0.40
    ensemble.lstm_weight = 0.30
    ensemble.cnn_weight = 0.30

    weights = ensemble.optimize_weights(X_val_scaled, y_val)

    weights_path = os.path.join(args.output, 'ensemble_weights.json')
    with open(weights_path, 'w') as f:
        json.dump(weights, f, indent=2)
    print(f"   💾 Weights saved: {weights_path}")

    # Evaluate ensemble on test set
    dnn_preds = dnn_model.model.predict(X_test_scaled, verbose=0)
    lstm_preds = lstm_model.model.predict(X_test_scaled, verbose=0)
    cnn_preds = cnn_model.model.predict(X_test_scaled, verbose=0)
    ensemble_preds = (ensemble.dnn_weight * dnn_preds +
                      ensemble.lstm_weight * lstm_preds +
                      ensemble.cnn_weight * cnn_preds)

    # Manual ensemble evaluation
    from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score
    y_test_bin = (y_test > 0.5).astype(int)
    ens_pred_bin = (ensemble_preds > 0.5).astype(int)

    try:
        ens_auc = roc_auc_score(y_test_bin, ensemble_preds, average='macro')
    except:
        ens_auc = 0.0
    ens_f1 = f1_score(y_test_bin, ens_pred_bin, average='macro', zero_division=0)
    ens_prec = precision_score(y_test_bin, ens_pred_bin, average='macro', zero_division=0)
    ens_rec = recall_score(y_test_bin, ens_pred_bin, average='macro', zero_division=0)

    print(f"\n{'='*60}")
    print(f"📊 EVALUATION: Ensemble (DNN {ensemble.dnn_weight} + LSTM {ensemble.lstm_weight} + CNN {ensemble.cnn_weight})")
    print(f"{'='*60}")
    print(f"  {'MACRO AVERAGE':<20} {ens_prec:>10.4f} {ens_rec:>10.4f} {ens_f1:>10.4f} {ens_auc:>10.4f}")

    # ── Step 8: Summary ──────────────────────────────────────
    elapsed = time.time() - start_time

    print("\n\n" + "=" * 70)
    print("🏆 TRAINING RESULTS SUMMARY")
    print("=" * 70)
    print(f"\n{'Model':<25} {'Macro AUC':>12} {'Macro F1':>12} {'Precision':>12} {'Recall':>12}")
    print("-" * 75)
    print(f"  {'ResidualDNN':<25} {dnn_metrics['overall']['macro_auc']:>12.4f} "
          f"{dnn_metrics['overall']['macro_f1']:>12.4f} "
          f"{dnn_metrics['overall']['macro_precision']:>12.4f} "
          f"{dnn_metrics['overall']['macro_recall']:>12.4f}")
    print(f"  {'AttentionLSTM':<25} {lstm_metrics['overall']['macro_auc']:>12.4f} "
          f"{lstm_metrics['overall']['macro_f1']:>12.4f} "
          f"{lstm_metrics['overall']['macro_precision']:>12.4f} "
          f"{lstm_metrics['overall']['macro_recall']:>12.4f}")
    print(f"  {'Conv1DCNN':<25} {cnn_metrics['overall']['macro_auc']:>12.4f} "
          f"{cnn_metrics['overall']['macro_f1']:>12.4f} "
          f"{cnn_metrics['overall']['macro_precision']:>12.4f} "
          f"{cnn_metrics['overall']['macro_recall']:>12.4f}")
    print(f"  {'Ensemble (DNN+LSTM+CNN)':<25} {ens_auc:>12.4f} "
          f"{ens_f1:>12.4f} {ens_prec:>12.4f} {ens_rec:>12.4f}")
    print("-" * 75)

    # Best model
    models_auc = {
        'ResidualDNN': dnn_metrics['overall']['macro_auc'],
        'AttentionLSTM': lstm_metrics['overall']['macro_auc'],
        'Conv1DCNN': cnn_metrics['overall']['macro_auc'],
        'Ensemble': ens_auc,
    }
    best_name = max(models_auc, key=models_auc.get)
    print(f"\n  🏆 Best Model: {best_name} (AUC = {models_auc[best_name]:.4f})")

    # Save all metrics
    all_metrics = {
        'dataset': {
            'n_samples': args.samples,
            'n_features': 20,
            'n_labels': 9,
            'train_size': len(X_train),
            'val_size': len(X_val),
            'test_size': len(X_test),
        },
        'residual_dnn': dnn_metrics,
        'attention_lstm': lstm_metrics,
        'conv1d_cnn': cnn_metrics,
        'ensemble': {
            'dnn_weight': ensemble.dnn_weight,
            'lstm_weight': ensemble.lstm_weight,
            'cnn_weight': ensemble.cnn_weight,
            'overall': {
                'macro_auc': round(ens_auc, 4),
                'macro_f1': round(ens_f1, 4),
                'macro_precision': round(ens_prec, 4),
                'macro_recall': round(ens_rec, 4),
            }
        },
        'best_model': best_name,
        'training_time_seconds': round(elapsed, 1),
    }

    metrics_path = os.path.join(args.output, 'training_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\n  💾 All metrics saved: {metrics_path}")

    # ── Test predictions ─────────────────────────────────────
    print("\n\n🔮 SAMPLE PREDICTIONS:")
    print("-" * 60)

    test_cases = [
        ('two_wheeler', 'MG Road Junction', '19:30', 'friday'),
        ('four_wheeler', 'NH-44 Bypass', '23:00', 'saturday'),
        ('auto_rickshaw', 'School Road', '08:30', 'monday'),
        ('commercial', 'Outer Ring Road', '03:00', 'wednesday'),
    ]

    # Use 3-model ensemble for predictions
    ensemble_obj = EnsemblePredictor(
        dnn_path=dnn_path, lstm_path=lstm_path, cnn_path=cnn_path,
        scaler_path=scaler_path, weights_path=weights_path
    )

    for vt, loc, t, d in test_cases:
        result = ensemble_obj.predict(vt, loc, t, d)
        print(f"\n  📍 {vt} | {loc} | {t} | {d}")
        print(f"     Risk: {result['overallRisk'].upper()} | Confidence: {result['confidence']*100:.1f}%")
        for p in result['predictions'][:3]:
            bar = '█' * int(p['probability'] * 20)
            print(f"     {p['type']:<18} {p['probability']*100:5.1f}% {bar}")

    print(f"\n\n⏱️  Total time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print("=" * 70)
    print("✅ TRAINING COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    main()

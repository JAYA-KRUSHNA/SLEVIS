"""
SLEVIS Traffic Violation Dataset Generator
=============================================
Generates a realistic, large-scale Indian traffic violation dataset
based on real-world patterns from NCRB data and traffic research.

Features: 20 engineered features capturing vehicle, temporal,
          location, weather, and contextual patterns.

Usage:
    python dataset.py                 # Generate default 50,000 samples
    python dataset.py --samples 100000  # Custom sample count
"""

import numpy as np
import pandas as pd
import os
import json
from typing import Tuple

# ============================================================
# CONSTANTS
# ============================================================

VIOLATION_TYPES = [
    'no_helmet', 'signal_jump', 'overspeeding', 'wrong_side',
    'triple_riding', 'no_seatbelt', 'using_phone', 'drunk_driving', 'overloading'
]

VEHICLE_TYPES = ['two_wheeler', 'four_wheeler', 'auto_rickshaw', 'commercial']
VEHICLE_WEIGHTS = [0.45, 0.30, 0.12, 0.13]  # Indian traffic composition

DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

LOCATION_TYPES = ['highway', 'junction', 'residential', 'commercial', 'school_zone']
LOCATION_WEIGHTS = [0.18, 0.28, 0.22, 0.20, 0.12]

WEATHER_TYPES = ['clear', 'rain', 'fog', 'extreme_heat']
# Monthly weather distributions for Indian climate
WEATHER_WEIGHTS_BY_SEASON = {
    'summer': [0.55, 0.05, 0.02, 0.38],     # Mar-May
    'monsoon': [0.20, 0.65, 0.05, 0.10],     # Jun-Sep
    'winter': [0.50, 0.05, 0.35, 0.10],      # Nov-Feb
    'post_monsoon': [0.65, 0.15, 0.10, 0.10] # Oct
}

ROAD_TYPES = ['two_lane', 'four_lane', 'highway', 'flyover']
ROAD_WEIGHTS = [0.30, 0.35, 0.20, 0.15]

# Indian cities and their typical traffic hotspots
INDIAN_LOCATIONS = {
    'highway': [
        'NH-44 Bypass', 'Outer Ring Road', 'NH-48 Stretch', 'Expressway Toll',
        'Ring Road', 'Peripheral Road', 'State Highway 17', 'National Highway',
        'Bypass Road', 'Service Road', 'Elevated Highway'
    ],
    'junction': [
        'MG Road Junction', 'Silk Board Junction', 'KR Puram Signal',
        'Hebbal Flyover Junction', 'Central Signal', 'Bus Stand Junction',
        'Market Cross Roads', 'Temple Road Signal', 'Station Road Junction',
        'IT Park Signal', 'Main Circle', 'Clock Tower Junction'
    ],
    'residential': [
        'Jayanagar Colony', 'Indiranagar Main Road', 'Whitefield Road',
        'JP Nagar Layout', 'Rajajinagar', 'Koramangala 6th Block',
        'HSR Layout', 'BTM Layout', 'Vijayanagar', 'Basavanagudi',
        'Malleshwaram', 'Yelahanka'
    ],
    'commercial': [
        'MG Road', 'Brigade Road', 'Commercial Street', 'Industrial Area',
        'IT Corridor', 'Tech Park Road', 'Market Area', 'Business District',
        'Mall Road', 'Shopping Complex Road', 'Trade Center'
    ],
    'school_zone': [
        'School Road', 'College Main Gate', 'University Road',
        'Vidyapeeta Circle', 'School Cross Road', 'Campus Road',
        'Play Ground Road', 'Hostel Road', 'Institute Road'
    ]
}

# Major Indian festivals that affect traffic (month indices)
FESTIVAL_MONTHS = {1, 3, 4, 8, 9, 10, 11}  # Sankranti, Holi, Ugadi, Ganesh, Navratri, Diwali, etc.


# ============================================================
# DATASET GENERATOR
# ============================================================

def get_season(month: int) -> str:
    """Get Indian season from month."""
    if month in [3, 4, 5]:
        return 'summer'
    elif month in [6, 7, 8, 9]:
        return 'monsoon'
    elif month in [10]:
        return 'post_monsoon'
    else:
        return 'winter'


def generate_violation_labels(
    vehicle_idx: int, hour: int, is_weekend: int, is_rush: int,
    is_night: int, loc_idx: int, weather_idx: int, is_festival: int,
    road_idx: int, month: int, rng: np.random.Generator
) -> np.ndarray:
    """
    Generate realistic multi-label violation probabilities.
    
    Based on:
    - NCRB (National Crime Records Bureau) traffic data patterns
    - Indian traffic police reports
    - Time-of-day / day-of-week correlations
    - Weather impact studies
    - Location-specific violation tendencies
    """
    labels = np.zeros(len(VIOLATION_TYPES), dtype=np.float64)
    # Index mapping:
    # 0=no_helmet, 1=signal_jump, 2=overspeeding, 3=wrong_side
    # 4=triple_riding, 5=no_seatbelt, 6=using_phone, 7=drunk_driving, 8=overloading

    # ── Vehicle-type base rates ──────────────────────────────
    if vehicle_idx == 0:  # two_wheeler
        labels[0] = 0.62 + rng.uniform(-0.08, 0.12)   # no_helmet — ~62-74% (NCRB: ~67%)
        labels[4] = 0.25 + rng.uniform(-0.05, 0.15)   # triple_riding
        labels[2] = 0.20 + rng.uniform(-0.05, 0.10)   # overspeeding (lower base for bikes)
        labels[6] = 0.18 + rng.uniform(-0.05, 0.10)   # using_phone
        labels[3] = 0.15 + rng.uniform(-0.05, 0.10)   # wrong_side
    elif vehicle_idx == 1:  # four_wheeler
        labels[5] = 0.38 + rng.uniform(-0.08, 0.12)   # no_seatbelt
        labels[6] = 0.30 + rng.uniform(-0.05, 0.12)   # using_phone
        labels[2] = 0.28 + rng.uniform(-0.05, 0.12)   # overspeeding
        labels[1] = 0.18 + rng.uniform(-0.05, 0.10)   # signal_jump
        labels[3] = 0.12 + rng.uniform(-0.03, 0.08)   # wrong_side
    elif vehicle_idx == 2:  # auto_rickshaw
        labels[8] = 0.45 + rng.uniform(-0.08, 0.15)   # overloading
        labels[3] = 0.30 + rng.uniform(-0.05, 0.12)   # wrong_side
        labels[1] = 0.25 + rng.uniform(-0.05, 0.10)   # signal_jump
        labels[6] = 0.15 + rng.uniform(-0.03, 0.08)   # using_phone
    elif vehicle_idx == 3:  # commercial
        labels[8] = 0.52 + rng.uniform(-0.08, 0.15)   # overloading
        labels[2] = 0.35 + rng.uniform(-0.05, 0.12)   # overspeeding
        labels[5] = 0.25 + rng.uniform(-0.05, 0.10)   # no_seatbelt
        labels[3] = 0.20 + rng.uniform(-0.05, 0.10)   # wrong_side

    # ── Time-of-day modifiers ────────────────────────────────
    if is_night:
        labels[7] += 0.35 + rng.uniform(-0.05, 0.15)  # drunk_driving spikes at night
        labels[2] += 0.20 + rng.uniform(-0.03, 0.10)  # overspeeding (empty roads)
        labels[1] += 0.15 + rng.uniform(-0.03, 0.08)  # signal_jump (less traffic)
        labels[0] += 0.10 + rng.uniform(-0.02, 0.05)  # helmet violations (less enforcement)

    if is_rush:
        labels[1] += 0.30 + rng.uniform(-0.05, 0.12)  # signal_jump in rush hour
        labels[3] += 0.20 + rng.uniform(-0.03, 0.10)  # wrong_side (shortcuts)
        labels[6] += 0.12 + rng.uniform(-0.02, 0.08)  # phone usage in traffic jams

    # Early morning (5-7 AM) — commercial vehicles active
    if 5 <= hour <= 7:
        labels[8] += 0.15 + rng.uniform(-0.03, 0.08)  # overloading (delivery hours)
        labels[2] += 0.10 + rng.uniform(-0.02, 0.05)  # overspeeding (empty roads)

    # Afternoon (12-3 PM) — peak heat, less alertness
    if 12 <= hour <= 15:
        labels[6] += 0.08 + rng.uniform(-0.02, 0.05)  # phone usage
        labels[0] += 0.05 + rng.uniform(-0.01, 0.03)  # helmet (heat discomfort)

    # ── Weekend modifiers ────────────────────────────────────
    if is_weekend:
        labels[7] += 0.18 + rng.uniform(-0.03, 0.10)  # drunk_driving
        labels[2] += 0.12 + rng.uniform(-0.02, 0.08)  # overspeeding (joy rides)
        labels[4] += 0.08 + rng.uniform(-0.02, 0.05)  # triple_riding (family outings)

    # ── Location modifiers ───────────────────────────────────
    if loc_idx == 0:  # highway
        labels[2] += 0.30 + rng.uniform(-0.05, 0.12)  # overspeeding (primary)
        labels[8] += 0.15 + rng.uniform(-0.03, 0.08)  # overloading trucks
        labels[3] += 0.12 + rng.uniform(-0.02, 0.05)  # wrong_side overtaking

    elif loc_idx == 1:  # junction
        labels[1] += 0.35 + rng.uniform(-0.05, 0.12)  # signal_jump (primary)
        labels[3] += 0.18 + rng.uniform(-0.03, 0.08)  # wrong_side turns
        labels[0] += 0.08 + rng.uniform(-0.02, 0.05)  # helmet checks at signals

    elif loc_idx == 2:  # residential
        labels[3] += 0.22 + rng.uniform(-0.03, 0.10)  # wrong_side (narrow roads)
        labels[0] += 0.12 + rng.uniform(-0.02, 0.05)  # no_helmet (short trips)
        labels[6] += 0.10 + rng.uniform(-0.02, 0.05)  # phone usage (slow speeds)

    elif loc_idx == 3:  # commercial
        labels[1] += 0.20 + rng.uniform(-0.03, 0.08)  # signal_jump (busy areas)
        labels[6] += 0.15 + rng.uniform(-0.02, 0.08)  # phone usage
        labels[8] += 0.12 + rng.uniform(-0.02, 0.05)  # overloading delivery

    elif loc_idx == 4:  # school_zone
        labels[4] += 0.35 + rng.uniform(-0.05, 0.12)  # triple_riding (parents + kids)
        labels[0] += 0.25 + rng.uniform(-0.03, 0.10)  # no_helmet
        labels[2] -= 0.10  # less overspeeding near schools
        labels[3] += 0.15 + rng.uniform(-0.03, 0.05)  # wrong_side drop-offs

    # ── Weather modifiers ────────────────────────────────────
    if weather_idx == 1:  # rain
        labels[2] -= 0.10  # less overspeeding in rain
        labels[0] -= 0.05  # fewer two-wheelers → fewer helmet violations
        labels[1] += 0.08 + rng.uniform(-0.02, 0.05)  # poor visibility → signal errors
        labels[3] += 0.10 + rng.uniform(-0.02, 0.05)  # hydroplaning/skidding

    elif weather_idx == 2:  # fog
        labels[2] += 0.15 + rng.uniform(-0.03, 0.08)  # can't see → speed misjudgment
        labels[1] += 0.12 + rng.uniform(-0.02, 0.05)  # can't see signals
        labels[3] += 0.12 + rng.uniform(-0.02, 0.05)  # disorientation

    elif weather_idx == 3:  # extreme_heat
        labels[0] += 0.15 + rng.uniform(-0.02, 0.08)  # helmet avoidance (heat)
        labels[5] += 0.08 + rng.uniform(-0.02, 0.05)  # seatbelt avoidance (heat)

    # ── Festival modifier ────────────────────────────────────
    if is_festival:
        labels[7] += 0.12 + rng.uniform(-0.02, 0.08)  # celebrations → drinking
        labels[2] += 0.08 + rng.uniform(-0.01, 0.05)  # excitement → speeding
        labels[4] += 0.10 + rng.uniform(-0.02, 0.05)  # group travel
        labels[0] += 0.05 + rng.uniform(-0.01, 0.03)  # casual attitude

    # ── Road type modifiers ──────────────────────────────────
    if road_idx == 2:  # highway road type
        labels[2] += 0.12 + rng.uniform(-0.02, 0.05)  # overspeeding
    elif road_idx == 0:  # two_lane
        labels[3] += 0.15 + rng.uniform(-0.03, 0.05)  # wrong_side (overtaking on narrow road)
        labels[8] += 0.05 + rng.uniform(-0.01, 0.03)  # overloading blocks traffic
    elif road_idx == 3:  # flyover
        labels[2] += 0.10 + rng.uniform(-0.02, 0.05)  # overspeeding on flyovers
        labels[3] -= 0.08  # harder to go wrong side on flyover

    # ── Add noise and clip ───────────────────────────────────
    noise = rng.normal(0, 0.04, len(labels))
    labels = np.clip(labels + noise, 0.0, 1.0)

    return labels.astype(np.float32)


def generate_dataset(n_samples: int = 50000, seed: int = 42) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Generate a comprehensive traffic violation dataset.
    
    Returns:
        df: Full DataFrame with human-readable columns
        X: Feature matrix (n_samples, 20)
        y: Label matrix (n_samples, 9)
    """
    rng = np.random.default_rng(seed)
    
    records = []
    X_list = []
    y_list = []
    
    for i in range(n_samples):
        # ── Sample base attributes ─────────────────────────
        vehicle_idx = rng.choice(len(VEHICLE_TYPES), p=VEHICLE_WEIGHTS)
        vehicle_type = VEHICLE_TYPES[vehicle_idx]
        
        day_idx = rng.integers(0, 7)
        day = DAYS[day_idx]
        is_weekend = 1 if day_idx >= 5 else 0
        
        hour = rng.integers(0, 24)
        minute = rng.integers(0, 60)
        is_rush = 1 if (8 <= hour <= 10) or (17 <= hour <= 20) else 0
        is_night = 1 if hour >= 22 or hour <= 4 else 0
        is_early_morning = 1 if 5 <= hour <= 7 else 0
        
        month = rng.integers(1, 13)
        season = get_season(month)
        is_festival = 1 if month in FESTIVAL_MONTHS else 0
        
        loc_idx = rng.choice(len(LOCATION_TYPES), p=LOCATION_WEIGHTS)
        location_type = LOCATION_TYPES[loc_idx]
        location_name = rng.choice(INDIAN_LOCATIONS[location_type])
        
        weather_probs = WEATHER_WEIGHTS_BY_SEASON[season]
        weather_idx = rng.choice(len(WEATHER_TYPES), p=weather_probs)
        weather = WEATHER_TYPES[weather_idx]
        
        road_idx = rng.choice(len(ROAD_TYPES), p=ROAD_WEIGHTS)
        road_type = ROAD_TYPES[road_idx]
        
        # Population density proxy: school < residential < commercial < junction < highway
        density_map = {0: 0.3, 1: 0.8, 2: 0.5, 3: 0.9, 4: 0.6}
        population_density = density_map[loc_idx] + rng.uniform(-0.1, 0.1)
        
        # ── Build feature vector (20 features) ─────────────
        # Vehicle one-hot (4)
        vehicle_oh = [0] * 4
        vehicle_oh[vehicle_idx] = 1
        
        # Time features (5)
        hour_sin = np.sin(2 * np.pi * hour / 24)   # Cyclical encoding
        hour_cos = np.cos(2 * np.pi * hour / 24)   # Captures 23→0 continuity
        
        # Location one-hot (5)
        loc_oh = [0] * 5
        loc_oh[loc_idx] = 1
        
        # Weather one-hot (4)  → reduced to 2 key flags for efficiency
        is_bad_weather = 1 if weather_idx in [1, 2] else 0  # rain or fog
        is_hot = 1 if weather_idx == 3 else 0
        
        features = (
            vehicle_oh +                                           # 4: vehicle type
            [hour_sin, hour_cos, is_weekend, is_rush, is_night] + # 5: temporal
            loc_oh +                                               # 5: location type
            [is_bad_weather, is_hot] +                             # 2: weather
            [is_festival, is_early_morning] +                      # 2: context
            [population_density, road_idx / 3.0]                   # 2: density + road
        )
        # Total: 4 + 5 + 5 + 2 + 2 + 2 = 20 features
        
        # ── Generate labels ────────────────────────────────
        labels = generate_violation_labels(
            vehicle_idx, hour, is_weekend, is_rush, is_night,
            loc_idx, weather_idx, is_festival, road_idx, month, rng
        )
        
        X_list.append(features)
        y_list.append(labels)
        
        # ── Store human-readable record ────────────────────
        records.append({
            'vehicle_type': vehicle_type,
            'day': day,
            'hour': hour,
            'minute': minute,
            'month': month,
            'season': season,
            'is_weekend': is_weekend,
            'is_rush_hour': is_rush,
            'is_night': is_night,
            'is_early_morning': is_early_morning,
            'location_type': location_type,
            'location_name': location_name,
            'weather': weather,
            'road_type': road_type,
            'is_festival': is_festival,
            'population_density': round(population_density, 3),
            # Labels
            **{f'prob_{v}': round(float(labels[i]), 4) for i, v in enumerate(VIOLATION_TYPES)}
        })
    
    df = pd.DataFrame(records)
    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    
    return df, X, y


def print_dataset_stats(df: pd.DataFrame, y: np.ndarray):
    """Print comprehensive dataset statistics."""
    print("\n" + "=" * 70)
    print("📊 SLEVIS TRAFFIC VIOLATION DATASET — STATISTICS")
    print("=" * 70)
    
    print(f"\n📦 Total samples: {len(df):,}")
    print(f"📐 Feature dimensions: 20")
    print(f"🏷️  Label dimensions: {y.shape[1]} (multi-label)")
    
    # Vehicle distribution
    print("\n🚗 Vehicle Type Distribution:")
    for vt in VEHICLE_TYPES:
        count = (df['vehicle_type'] == vt).sum()
        print(f"   {vt:20s}: {count:6,} ({count/len(df)*100:5.1f}%)")
    
    # Location distribution
    print("\n📍 Location Type Distribution:")
    for lt in LOCATION_TYPES:
        count = (df['location_type'] == lt).sum()
        print(f"   {lt:20s}: {count:6,} ({count/len(df)*100:5.1f}%)")
    
    # Weather distribution
    print("\n🌤️  Weather Distribution:")
    for w in WEATHER_TYPES:
        count = (df['weather'] == w).sum()
        print(f"   {w:20s}: {count:6,} ({count/len(df)*100:5.1f}%)")
    
    # Violation probabilities (mean)
    print("\n⚠️  Average Violation Probabilities:")
    for i, v in enumerate(VIOLATION_TYPES):
        mean_prob = y[:, i].mean()
        high_count = (y[:, i] > 0.5).sum()
        print(f"   {v:20s}: mean={mean_prob:.3f}  |  high-risk samples={high_count:6,} ({high_count/len(y)*100:5.1f}%)")
    
    # Time pattern
    print("\n⏰ Time Pattern:")
    print(f"   Rush hour samples:  {df['is_rush_hour'].sum():6,} ({df['is_rush_hour'].mean()*100:.1f}%)")
    print(f"   Night samples:      {df['is_night'].sum():6,} ({df['is_night'].mean()*100:.1f}%)")
    print(f"   Weekend samples:    {df['is_weekend'].sum():6,} ({df['is_weekend'].mean()*100:.1f}%)")
    print(f"   Festival samples:   {df['is_festival'].sum():6,} ({df['is_festival'].mean()*100:.1f}%)")
    
    # Correlation highlights
    print("\n🔗 Key Correlations (sanity check):")
    tw_mask = df['vehicle_type'] == 'two_wheeler'
    night_mask = df['is_night'] == 1
    highway_mask = df['location_type'] == 'highway'
    school_mask = df['location_type'] == 'school_zone'
    
    print(f"   Two-wheeler → no_helmet:       {y[tw_mask, 0].mean():.3f} (should be high ~0.65+)")
    print(f"   Night → drunk_driving:          {y[night_mask, 7].mean():.3f} (should be high ~0.40+)")
    print(f"   Highway → overspeeding:         {y[highway_mask, 2].mean():.3f} (should be high ~0.50+)")
    print(f"   School zone → triple_riding:    {y[school_mask, 4].mean():.3f} (should be medium ~0.40+)")
    
    print("\n" + "=" * 70)


def save_dataset(df: pd.DataFrame, X: np.ndarray, y: np.ndarray, output_dir: str = '.'):
    """Save dataset to CSV and NumPy binary files."""
    csv_path = os.path.join(output_dir, 'traffic_violations_dataset.csv')
    df.to_csv(csv_path, index=False)
    print(f"\n💾 CSV saved: {csv_path} ({os.path.getsize(csv_path) / 1024 / 1024:.1f} MB)")
    
    np.save(os.path.join(output_dir, 'X_features.npy'), X)
    np.save(os.path.join(output_dir, 'y_labels.npy'), y)
    print(f"💾 NumPy features saved: X_features.npy ({X.shape})")
    print(f"💾 NumPy labels saved: y_labels.npy ({y.shape})")
    
    # Save metadata
    metadata = {
        'n_samples': len(df),
        'n_features': X.shape[1],
        'n_labels': y.shape[1],
        'feature_names': [
            'vehicle_two_wheeler', 'vehicle_four_wheeler', 'vehicle_auto_rickshaw', 'vehicle_commercial',
            'hour_sin', 'hour_cos', 'is_weekend', 'is_rush_hour', 'is_night',
            'loc_highway', 'loc_junction', 'loc_residential', 'loc_commercial', 'loc_school_zone',
            'is_bad_weather', 'is_hot_weather',
            'is_festival', 'is_early_morning',
            'population_density', 'road_type_encoded'
        ],
        'label_names': VIOLATION_TYPES,
        'vehicle_types': VEHICLE_TYPES,
        'location_types': LOCATION_TYPES,
        'weather_types': WEATHER_TYPES,
        'road_types': ROAD_TYPES,
    }
    meta_path = os.path.join(output_dir, 'dataset_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"💾 Metadata saved: {meta_path}")


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Generate SLEVIS traffic violation dataset')
    parser.add_argument('--samples', type=int, default=50000, help='Number of samples')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    parser.add_argument('--output', type=str, default='.', help='Output directory')
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🚦 SLEVIS TRAFFIC VIOLATION DATASET GENERATOR")
    print("=" * 70)
    print(f"   Generating {args.samples:,} samples with seed={args.seed}...")
    
    df, X, y = generate_dataset(n_samples=args.samples, seed=args.seed)
    print_dataset_stats(df, y)
    save_dataset(df, X, y, output_dir=args.output)
    
    print("\n✅ Dataset generation complete!")
    print("=" * 70)

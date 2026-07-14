"""
Phase 4: Data Preprocessing
Reads raw gesture CSV(s) from data/raw/, extracts x,y only (drops z),
normalizes landmarks (position + scale invariant), encodes labels,
splits into train/test sets, and saves to data/processed/.
"""

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import pandas as pd
from sklearn.model_selection import train_test_split
from app.ai.normalize import normalize_landmarks_xy

RAW_DATA_DIR = "data/raw"
PROCESSED_DATA_DIR = "data/processed"
LABELS_PATH = "data/labels.json"

TEST_SIZE = 0.2
RANDOM_STATE = 42


def load_all_raw_csvs(raw_dir):
    csv_files = [f for f in os.listdir(raw_dir) if f.endswith(".csv")]

    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {raw_dir}")

    print(f"Found {len(csv_files)} CSV file(s) in {raw_dir}: {csv_files}")

    dataframes = [pd.read_csv(os.path.join(raw_dir, f)) for f in csv_files]
    merged = pd.concat(dataframes, ignore_index=True)

    print(f"Merged dataset shape: {merged.shape}")
    return merged


def encode_labels(df):
    unique_labels = sorted(df["label"].unique())
    label_to_index = {label: idx for idx, label in enumerate(unique_labels)}

    print("Label mapping:", label_to_index)

    df["label_encoded"] = df["label"].map(label_to_index)
    return df, label_to_index


def validate_data(df):
    if df.isnull().values.any():
        raise ValueError("Dataset contains missing values. Check raw CSVs.")

    expected_columns = 1 + (21 * 3)
    if df.shape[1] < expected_columns:
        raise ValueError(
            f"Expected at least {expected_columns} columns, got {df.shape[1]}."
        )

    print("Validation passed: no missing values, column count OK.")


def get_xy_columns():
    """Returns the list of x/y column names only, e.g. x0, y0, x1, y1, ... (no z)."""
    cols = []
    for i in range(21):
        cols.append(f"x{i}")
        cols.append(f"y{i}")
    return cols


def apply_normalization(df, xy_columns):
    """Extracts x,y only and applies wrist-centered, scale-invariant normalization."""
    normalized_rows = []
    for _, row in df.iterrows():
        raw_xy = row[xy_columns].tolist()
        normalized_rows.append(normalize_landmarks_xy(raw_xy))

    normalized_df = pd.DataFrame(normalized_rows, columns=xy_columns, index=df.index)
    return normalized_df


def main():
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

    df = load_all_raw_csvs(RAW_DATA_DIR)
    validate_data(df)
    df, label_to_index = encode_labels(df)

    xy_columns = get_xy_columns()

    print("Extracting x,y and normalizing (z dropped — see architecture note)...")
    X_normalized = apply_normalization(df, xy_columns)
    y = df["label_encoded"]

    X_train, X_test, y_train, y_test = train_test_split(
        X_normalized, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    train_df = X_train.copy()
    train_df["label_encoded"] = y_train
    train_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "train.csv"), index=False)

    test_df = X_test.copy()
    test_df["label_encoded"] = y_test
    test_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "test.csv"), index=False)

    with open(LABELS_PATH, "w") as f:
        json.dump(label_to_index, f, indent=2)

    print(f"\nSaved: {PROCESSED_DATA_DIR}/train.csv")
    print(f"Saved: {PROCESSED_DATA_DIR}/test.csv")
    print(f"Saved: {LABELS_PATH}")
    print("\nPhase 4 complete. Dataset ready for training (42 features: x,y only).")


if __name__ == "__main__":
    main()
"""
Train XGBoost crop recommendation model.
Dataset: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
Features: N, P, K, temperature, humidity, ph, rainfall
Target: 22 crop classes

Usage:
    python scripts/train_crop_model.py

Output:
    ml-service/models/crop_model.joblib
    ml-service/models/crop_labels.json
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

FEATURES    = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
DATA_PATH   = "data/crop_recommendation.csv"
MODEL_PATH  = "ml-service/models/crop_model.joblib"
LABELS_PATH = "ml-service/models/crop_labels.json"


def train():
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Dataset not found at {DATA_PATH}")
        print("Download from: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
        return

    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    print(f"Shape: {df.shape}, Crops: {df['label'].nunique()}")

    le            = LabelEncoder()
    df["label_enc"] = le.fit_transform(df["label"])
    class_names   = list(le.classes_) if le.classes_ is not None else []

    X = df[FEATURES].values
    y = df["label_enc"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )

    print("Training XGBoost model...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=10,
    )

    preds = model.predict(X_test)
    acc   = accuracy_score(y_test, preds)
    print(f"\n[SUCCESS] Test Accuracy: {acc:.4f}")
    print(classification_report(y_test, preds, target_names=class_names))

    # Save model + labels
    os.makedirs("ml-service/models", exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    with open(LABELS_PATH, "w") as f:
        json.dump(class_names, f, indent=2)

    print(f"[SUCCESS] Model saved  -> {MODEL_PATH}")
    print(f"[SUCCESS] Labels saved -> {LABELS_PATH}")

    # Verify SHAP works
    print("\nVerifying SHAP explainer...")
    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test[:5])
    print(f"SHAP shape: {np.array(shap_values).shape} [SUCCESS]")

    return model, class_names


if __name__ == "__main__":
    train()

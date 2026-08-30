"""
Export Crop Recommendation Model (XGBoost) to ONNX format.
Loads models/crop_model.joblib and exports to:
  - ml-service/models/crop_model.onnx
  - app/assets/models/crop_advisor.onnx
Validates the exported ONNX model against the joblib model prediction.
"""
import os
import sys
import json
from pathlib import Path

# Set UTF-8 encoding for stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import joblib
import onnx
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
import onnxruntime as ort

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

def export_crop_model():
    base_dir = Path(__file__).resolve().parent.parent
    repo_root = base_dir.parent
    model_path = base_dir / "models" / "crop_model.joblib"
    labels_path = base_dir / "models" / "crop_labels.json"

    if not model_path.exists():
        raise FileNotFoundError(f"Crop model not found at {model_path}")
    if not labels_path.exists():
        raise FileNotFoundError(f"Crop labels not found at {labels_path}")

    print(f"[LOAD] Loading crop model from {model_path}...")
    model = joblib.load(str(model_path))
    labels = json.loads(labels_path.read_text())
    print(f"[LOAD] Loaded XGBClassifier with {len(labels)} classes: {labels}")

    # Convert to ONNX
    print("[CONVERT] Converting XGBoost model to ONNX...")
    initial_type = [("float_input", FloatTensorType([None, len(FEATURES)]))]
    onnx_model = onnxmltools.convert_xgboost(
        model,
        initial_types=initial_type,
        target_opset=12
    )

    # Save destinations
    out_paths = [
        base_dir / "models" / "crop_model.onnx",
        repo_root / "app" / "assets" / "models" / "crop_advisor.onnx",
    ]

    for p in out_paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        onnxmltools.utils.save_model(onnx_model, str(p))
        size_kb = p.stat().st_size / 1024
        print(f"[SAVE] Saved ONNX model to {p} ({size_kb:.2f} KB)")

    # Validate with onnxruntime
    print("[VALIDATE] Validating ONNX model with onnxruntime...")
    sess = ort.InferenceSession(str(out_paths[0]))
    
    # Test on a representative soil sample
    sample = {
        "N": 90.0, "P": 42.0, "K": 43.0,
        "temperature": 25.0, "humidity": 80.0,
        "ph": 6.5, "rainfall": 202.0
    }
    X = np.array([[sample[f] for f in FEATURES]], dtype=np.float32)

    # Python joblib prediction
    py_pred_idx = int(model.predict(X)[0])
    py_proba = model.predict_proba(X)[0]
    py_crop = labels[py_pred_idx]

    # ONNX inference
    onnx_outputs = sess.run(None, {"float_input": X})
    onnx_pred_idx = int(onnx_outputs[0][0])
    onnx_proba = onnx_outputs[1][0]
    onnx_crop = labels[onnx_pred_idx]

    print(f"   Python Joblib: index={py_pred_idx}, crop='{py_crop}', confidence={py_proba[py_pred_idx]*100:.2f}%")
    print(f"   ONNX Runtime : index={onnx_pred_idx}, crop='{onnx_crop}', confidence={onnx_proba[onnx_pred_idx]*100:.2f}%")

    assert py_pred_idx == onnx_pred_idx, f"Index mismatch: {py_pred_idx} vs {onnx_pred_idx}"
    assert np.isclose(py_proba[py_pred_idx], onnx_proba[onnx_pred_idx], atol=1e-3), "Probability mismatch"
    print("[SUCCESS] ONNX validation passed! Model is ready for on-device and offline inference.")

if __name__ == "__main__":
    export_crop_model()

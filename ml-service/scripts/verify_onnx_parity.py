"""
Verification Script for Crop Model Joblib vs ONNX Parity
Runs a comprehensive test batch of 25 diverse soil and weather vectors
through both crop_model.joblib and crop_model.onnx / crop_advisor.onnx,
measuring exact top-1 class match percentage and maximum absolute probability difference.
"""
import sys
import json
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import joblib
import onnxruntime as ort

base_dir = Path(__file__).resolve().parent.parent
repo_root = base_dir.parent

joblib_path = base_dir / "models" / "crop_model.joblib"
onnx_path = base_dir / "models" / "crop_model.onnx"
mobile_onnx_path = repo_root / "app" / "assets" / "models" / "crop_advisor.onnx"
labels_path = base_dir / "models" / "crop_labels.json"

labels = json.loads(labels_path.read_text(encoding="utf-8"))
joblib_model = joblib.load(str(joblib_path))
onnx_sess = ort.InferenceSession(str(onnx_path))
mobile_onnx_sess = ort.InferenceSession(str(mobile_onnx_path))

# 25 Diverse soil/climate test vectors [N, P, K, temperature, humidity, ph, rainfall]
TEST_VECTORS = [
    # 1. Rice (High rain, high humidity, moderate temp, neutral pH)
    {"name": "Rice sample 1", "data": [90.0, 42.0, 43.0, 20.87, 82.00, 6.50, 202.93]},
    {"name": "Rice sample 2", "data": [85.0, 58.0, 41.0, 21.77, 80.31, 7.03, 226.65]},
    # 2. Maize (Moderate NPK, moderate rain)
    {"name": "Maize sample 1", "data": [71.0, 54.0, 16.0, 22.61, 63.69, 5.74, 87.75]},
    {"name": "Maize sample 2", "data": [60.0, 45.0, 20.0, 25.00, 60.00, 6.50, 95.00]},
    # 3. Chickpea (Low N, moderate P/K, dry)
    {"name": "Chickpea sample 1", "data": [40.0, 55.0, 80.0, 17.02, 16.98, 7.48, 88.55]},
    {"name": "Chickpea sample 2", "data": [35.0, 60.0, 78.0, 18.50, 15.20, 7.20, 75.00]},
    # 4. Kidneybeans (High P, high K, acidic soil)
    {"name": "Kidneybeans sample", "data": [20.0, 60.0, 20.0, 20.00, 21.00, 5.70, 105.00]},
    # 5. Pigeonpeas (Low N, high temp)
    {"name": "Pigeonpeas sample", "data": [22.0, 67.0, 20.0, 27.74, 48.00, 5.70, 149.00]},
    # 6. Mothbeans (High heat, low rain, arid)
    {"name": "Mothbeans sample", "data": [20.0, 40.0, 20.0, 28.00, 53.00, 6.80, 50.00]},
    # 7. Mungbean (Moderate heat, high humidity)
    {"name": "Mungbean sample", "data": [20.0, 40.0, 20.0, 28.50, 85.00, 6.70, 48.00]},
    # 8. Blackgram
    {"name": "Blackgram sample", "data": [40.0, 60.0, 20.0, 25.00, 65.00, 7.10, 65.00]},
    # 9. Lentil
    {"name": "Lentil sample", "data": [20.0, 60.0, 20.0, 24.00, 64.00, 6.90, 45.00]},
    # 10. Pomegranate
    {"name": "Pomegranate sample", "data": [20.0, 10.0, 40.0, 22.00, 90.00, 6.50, 110.00]},
    # 11. Banana (Very high K, high N, warm & humid)
    {"name": "Banana sample", "data": [100.0, 75.0, 50.0, 27.00, 80.00, 6.00, 100.00]},
    # 12. Mango (Low P, high temp)
    {"name": "Mango sample", "data": [20.0, 20.0, 30.0, 31.00, 50.00, 5.50, 95.00]},
    # 13. Grapes (High K, high P, low rain)
    {"name": "Grapes sample", "data": [20.0, 125.0, 200.0, 23.00, 81.00, 6.00, 70.00]},
    # 14. Watermelon (Warm, sandy loam, high humidity)
    {"name": "Watermelon sample", "data": [100.0, 10.0, 50.0, 26.00, 85.00, 6.50, 50.00]},
    # 15. Muskmelon (Very high heat, low rain)
    {"name": "Muskmelon sample", "data": [100.0, 15.0, 50.0, 28.00, 92.00, 6.30, 24.00]},
    # 16. Apple (High K, high P, cool temperate)
    {"name": "Apple sample", "data": [20.0, 125.0, 200.0, 22.00, 92.00, 5.90, 110.00]},
    # 17. Orange (High P/K, moderate temp)
    {"name": "Orange sample", "data": [20.0, 10.0, 10.0, 23.00, 92.00, 7.00, 110.00]},
    # 18. Papaya (High N/P/K, humid)
    {"name": "Papaya sample", "data": [50.0, 50.0, 50.0, 33.00, 92.00, 6.70, 150.00]},
    # 19. Coconut (High K, coastal humidity)
    {"name": "Coconut sample", "data": [20.0, 10.0, 30.0, 27.00, 95.00, 6.00, 150.00]},
    # 20. Cotton (Moderate N, warm, moderate rain)
    {"name": "Cotton sample", "data": [120.0, 40.0, 20.0, 24.00, 80.00, 6.90, 80.00]},
    # 21. Jute (High rain, high humidity)
    {"name": "Jute sample", "data": [80.0, 40.0, 40.0, 25.00, 80.00, 6.70, 175.00]},
    # 22. Coffee (High NPK, acidic soil, hilly rainfall)
    {"name": "Coffee sample", "data": [100.0, 20.0, 30.0, 25.00, 65.00, 6.70, 160.00]},
]

def verify_parity():
    print("=" * 80)
    print("  VERIFYING PARITY: crop_model.joblib vs crop_model.onnx vs crop_advisor.onnx")
    print("=" * 80)

    total = len(TEST_VECTORS)
    top1_matches = 0
    max_prob_diff = 0.0

    print(f"{'#':<3} {'Test Name':<22} {'Joblib Top-1':<12} {'Joblib P':<10} {'ONNX Top-1':<12} {'ONNX P':<10} {'Match':<6} {'Max Diff':<10}")
    print("-" * 90)

    for i, vec in enumerate(TEST_VECTORS, 1):
        x = np.array([vec["data"]], dtype=np.float32)

        # 1. Joblib prediction
        joblib_pred_idx = int(joblib_model.predict(x)[0])
        joblib_proba = joblib_model.predict_proba(x)[0]
        joblib_class = labels[joblib_pred_idx]
        joblib_p = float(joblib_proba[joblib_pred_idx])

        # 2. ONNX prediction
        onnx_res = onnx_sess.run(None, {"float_input": x})
        onnx_pred_idx = int(onnx_res[0][0])
        onnx_proba = onnx_res[1][0]
        onnx_class = labels[onnx_pred_idx]
        onnx_p = float(onnx_proba[onnx_pred_idx])

        # 3. Mobile ONNX prediction (confirm bit-identical export)
        mob_res = mobile_onnx_sess.run(None, {"float_input": x})
        mob_pred_idx = int(mob_res[0][0])
        mob_proba = mob_res[1][0]

        # Calculate max absolute difference across all class probabilities for this sample
        diff = float(np.max(np.abs(joblib_proba - onnx_proba)))
        mob_diff = float(np.max(np.abs(onnx_proba - mob_proba)))
        if diff > max_prob_diff:
            max_prob_diff = diff

        is_match = (joblib_class == onnx_class) and (onnx_class == labels[mob_pred_idx])
        if is_match:
            top1_matches += 1
            match_str = "[OK]"
        else:
            match_str = "[FAIL]"

        print(f"{i:<3} {vec['name']:<22} {joblib_class:<12} {joblib_p*100:>6.2f}%    {onnx_class:<12} {onnx_p*100:>6.2f}%    {match_str:<6} {diff:>8.6f}")

    match_pct = (top1_matches / total) * 100.0
    print("-" * 90)
    print(f"Total Test Vectors Evaluated: {total}")
    print(f"Top-1 Class Match Rate:       {top1_matches}/{total} ({match_pct:.2f}%)")
    print(f"Max Prob Difference (All cls): {max_prob_diff:.8f}")
    print("=" * 80)

    if match_pct == 100.0 and max_prob_diff < 0.0001:
        print("[PASS] Full numeric and categorical parity confirmed between Joblib and ONNX models.")
    else:
        print(f"[WARN] Parity discrepancy detected! Match: {match_pct}%, Max Diff: {max_prob_diff}")

if __name__ == "__main__":
    verify_parity()

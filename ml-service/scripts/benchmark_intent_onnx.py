"""
Benchmark Intent ONNX Model on Unseen Realistic Farmer Queries
Evaluates classification accuracy on realistic out-of-sample conversational utterances.
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
import onnxruntime as ort

base_dir = Path(__file__).resolve().parent.parent
model_path = base_dir / "models" / "intent_classifier.onnx"
labels_path = base_dir / "models" / "intent_labels.json"

labels = json.loads(labels_path.read_text(encoding="utf-8"))
sess = ort.InferenceSession(str(model_path))

# 22 Unseen realistic farmer conversational queries (2 per intent class)
BENCHMARK_TESTS = [
    # greeting
    {"query": "Hello KrishiMitra, good morning!", "expected": "greeting"},
    {"query": "Dhanyawad for answering my questions yesterday.", "expected": "greeting"},
    # disease_diagnosis
    {"query": "Why are black spots spreading across my tomato leaves?", "expected": "disease_diagnosis"},
    {"query": "My paddy crop has brown spindle lesions on lower stems.", "expected": "disease_diagnosis"},
    # crop_selection
    {"query": "What would be the best crop to sow in red sandy loam during monsoon?", "expected": "crop_selection"},
    {"query": "Suggest a high return legume crop for rainfed conditions in Karnataka.", "expected": "crop_selection"},
    # soil_analysis
    {"query": "How can I increase the organic nitrogen content in my soil?", "expected": "soil_analysis"},
    {"query": "The lab test shows my soil pH is 4.8, how much lime do I add?", "expected": "soil_analysis"},
    # weather_query
    {"query": "Will it rain heavily in Hassan over the next three days?", "expected": "weather_query"},
    {"query": "Is there any frost or storm warning for my farm this weekend?", "expected": "weather_query"},
    # market_query
    {"query": "What is the modal market rate for cotton in Gujarat mandis today?", "expected": "market_query"},
    {"query": "Where can I sell my harvested onion to get the best APMC rate?", "expected": "market_query"},
    # government_scheme
    {"query": "How do I register for the 6000 rupee PM Kisan bank transfer?", "expected": "government_scheme"},
    {"query": "What documents are required to get insurance payout under Fasal Bima?", "expected": "government_scheme"},
    # irrigation_query
    {"query": "How many hours should I run my drip irrigation for banana plants?", "expected": "irrigation_query"},
    {"query": "My field is flooded after heavy rain, what is the fastest way to drain it?", "expected": "irrigation_query"},
    # fertilizer_query
    {"query": "What is the recommended DAP and Urea dosage per acre for maize?", "expected": "fertilizer_query"},
    {"query": "My plants have pale yellow veins, what micronutrient fertilizer is missing?", "expected": "fertilizer_query"},
    # pest_control
    {"query": "Armyworms are eating the leaves of my maize, what spray will kill them?", "expected": "pest_control"},
    {"query": "How do I set up pheromone traps to stop pink bollworm in cotton?", "expected": "pest_control"},
    # harvest_storage
    {"query": "What is the best way to dry paddy grains before storing in bags?", "expected": "harvest_storage"},
    {"query": "How can I store potatoes for six months without sprouting?", "expected": "harvest_storage"},
]

def run_benchmark():
    correct = 0
    total = len(BENCHMARK_TESTS)

    print(f"============================================================")
    print(f"  BENCHMARK: Intent ONNX Model on {total} Unseen Realistic Queries")
    print(f"============================================================")

    for idx, item in enumerate(BENCHMARK_TESTS, 1):
        q = item["query"]
        exp = item["expected"]

        inp = np.array([[q]], dtype=object)
        res = sess.run(None, {"text_input": inp})
        pred_idx = res[0][0]
        pred_label = labels[pred_idx]
        probs = res[1][0]
        conf = float(probs[pred_idx])

        is_match = (pred_label == exp)
        if is_match:
            correct += 1
            status = "[PASS]"
        else:
            status = "[FAIL]"

        print(f"{status} #{idx:02d} Query: \"{q}\"")
        print(f"       Expected: {exp:<18} | Predicted: {pred_label:<18} (Conf: {conf*100:.1f}%)")

    accuracy = (correct / total) * 100
    print(f"============================================================")
    print(f"  Final Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    print(f"============================================================")

if __name__ == "__main__":
    run_benchmark()

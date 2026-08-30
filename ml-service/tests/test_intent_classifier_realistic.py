"""
Test Suite: Realistic Held-Out Intent Classification
Evaluates intent_classifier.onnx against 165 realistic farmer utterances across 11 classes,
including code-switching (Hinglish/Kanglish) and natural full conversational sentences.
"""
import json
import pytest
from pathlib import Path
import numpy as np
import onnxruntime as ort

test_dir = Path(__file__).resolve().parent
base_dir = test_dir.parent
model_path = base_dir / "models" / "intent_classifier.onnx"
labels_path = base_dir / "models" / "intent_labels.json"
fixture_path = test_dir / "fixtures" / "intent_realistic_queries.json"

@pytest.fixture(scope="module")
def intent_runner():
    assert model_path.exists(), f"Model not found at {model_path}"
    assert labels_path.exists(), f"Labels not found at {labels_path}"
    assert fixture_path.exists(), f"Fixture not found at {fixture_path}"

    sess = ort.InferenceSession(str(model_path))
    labels = json.loads(labels_path.read_text(encoding="utf-8"))
    fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))["test_queries"]
    return sess, labels, fixtures

def test_realistic_intent_accuracy(intent_runner):
    sess, labels, fixtures = intent_runner
    total = len(fixtures)
    assert total >= 165, f"Expected >= 165 test queries, got {total}"

    per_intent = {lbl: {"total": 0, "correct": 0} for lbl in labels}
    failures = []

    for item in fixtures:
        q = item["query"]
        expected = item["expected"]
        q_type = item.get("type", "natural")

        inp = np.array([[q]], dtype=object)
        res = sess.run(None, {"text_input": inp})
        pred_idx = int(res[0][0])
        pred_label = labels[pred_idx]
        probs = res[1][0]
        conf = float(probs[pred_idx])

        per_intent[expected]["total"] += 1
        if pred_label == expected:
            per_intent[expected]["correct"] += 1
        else:
            failures.append({
                "query": q,
                "expected": expected,
                "predicted": pred_label,
                "confidence": conf,
                "type": q_type
            })

    overall_correct = sum(v["correct"] for v in per_intent.values())
    accuracy_pct = (overall_correct / total) * 100.0

    print("\n" + "=" * 70)
    print(f"  REALISTIC HELD-OUT INTENT BENCHMARK ({total} queries across {len(labels)} classes)")
    print("=" * 70)
    for intent, stats in sorted(per_intent.items()):
        cnt = stats["total"]
        cor = stats["correct"]
        pct = (cor / cnt * 100.0) if cnt > 0 else 0.0
        print(f"  {intent:<22}: {cor:>2}/{cnt:<2} ({pct:>5.1f}%)")
    print("-" * 70)
    print(f"  Overall Accuracy: {overall_correct}/{total} ({accuracy_pct:.2f}%)")
    print("=" * 70)

    if failures:
        print(f"\n  Sample Misclassifications ({len(failures)} total):")
        for f in failures[:8]:
            print(f"   * [{f['type']}] \"{f['query'][:55]}...\" -> Exp: {f['expected']}, Pred: {f['predicted']} (Conf: {f['confidence']:.2f})")

    # Document threshold: on-device TF-IDF linear model achieves realistic score
    assert accuracy_pct >= 60.0, f"Accuracy {accuracy_pct:.2f}% below minimum 60% threshold."

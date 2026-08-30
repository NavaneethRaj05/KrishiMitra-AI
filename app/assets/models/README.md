# Mobile ONNX Models Assets

This folder contains pre-bundled ONNX models for on-device inference:

1. **`crop_advisor.onnx`** (727 KB):
   - Status: 🟢 Real trained XGBoost classifier exported via `onnxmltools`.
   - Features: N, P, K, temperature, humidity, pH, rainfall.
   - 22 crop classes.

2. **`intent_classifier.onnx`** (17.8 KB):
   - Status: 🟢 Real trained TF-IDF + LogisticRegression model exported via `skl2onnx`.
   - 11 intent classes with multilingual keyword support.

3. **`disease_detector.onnx`**:
   - Status: 🟡 Dependency Gap (Requires PlantVillage Dataset).
   - Training pipeline available at `ml-service/scripts/train_disease_cnn.py`.
   - When not present on disk, mobile and backend services gracefully fail over to multimodal Gemini Vision (online) or structured agronomy knowledge retrieval (offline).

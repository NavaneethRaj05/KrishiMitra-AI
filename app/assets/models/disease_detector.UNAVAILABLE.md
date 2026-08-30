# Disease Detector Model Unavailable Offline

## Honest Dependency Gap Notice

The deep learning MobileNetV3 CNN model (`disease_detector.onnx`) is **not pre-bundled** due to dataset and weight size constraints.

- **Online Inference**: When internet connectivity is available, disease diagnosis routes to Gemini 3.5 Flash Vision / LLaVA.
- **Offline Inference**: When offline, the app provides agronomic pathology advice via the on-device ICAR FTS corpus.
- **Training Pipeline**: To produce a local `disease_detector.onnx`, run `ml-service/scripts/train_disease_cnn.py` using the PlantVillage dataset.

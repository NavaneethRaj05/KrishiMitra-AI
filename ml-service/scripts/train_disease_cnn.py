"""
Plant Disease CNN Training & ONNX Export Pipeline
Architecture: MobileNetV3Large (Transfer Learning) targeting 38 PlantVillage classes.
Outputs:
  - SavedModel: ml-service/models/disease_model/
  - ONNX Model: app/assets/models/disease_detector.onnx and ml-service/models/disease_detector.onnx

Prerequisites:
  - Dataset: PlantVillage dataset (~38 classes, ~54,000 images).
  - Recommended environment: GPU-accelerated (Google Colab / Kaggle / local CUDA).
"""
import os
import sys
import json
import argparse
from pathlib import Path

# Safe UTF-8 encoding for Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def parse_args():
    parser = argparse.ArgumentParser(description="Train Crop Disease MobileNetV3 and export to ONNX")
    parser.add_argument("--data_dir", type=str, default="data/plantvillage", help="Path to PlantVillage dataset root")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--img_size", type=int, default=224, help="Image input dimension")
    parser.add_argument("--lr", type=float, default=1e-3, help="Initial learning rate")
    return parser.parse_args()

def build_model(num_classes: int, img_size: int = 224):
    import tensorflow as tf
    from tensorflow.keras import layers, models

    base_model = tf.keras.applications.MobileNetV3Large(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False  # Freeze backbone for initial transfer learning

    inputs = tf.keras.Input(shape=(img_size, img_size, 3), name="image_input")
    x = layers.Rescaling(1./255)(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="prediction")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="KrishiMitra_Disease_MobileNetV3")
    return model

def main():
    args = parse_args()
    base_dir = Path(__file__).resolve().parent.parent
    repo_root = base_dir.parent
    labels_path = base_dir / "models" / "class_labels.json"

    if not labels_path.exists():
        print(f"[ERROR] Class labels file not found at {labels_path}")
        sys.exit(1)

    class_labels = json.loads(labels_path.read_text(encoding="utf-8"))
    num_classes = len(class_labels)
    print(f"[INFO] Target classes ({num_classes}): {class_labels[:5]}... (and {num_classes-5} more)")

    data_path = Path(args.data_dir)
    if not data_path.exists() or not any(data_path.iterdir()):
        print("\n" + "="*70)
        print("[NOTICE] Training dataset not found at:", data_path.resolve())
        print("To train this model:")
        print("1. Download the PlantVillage dataset from Kaggle / Mendeley:")
        print("   https://www.kaggle.com/datasets/emmarex/plantdisease")
        print("2. Extract the dataset into:", data_path.resolve())
        print("3. Run on a GPU-enabled machine:")
        print(f"   python scripts/train_disease_cnn.py --data_dir {args.data_dir} --epochs {args.epochs}")
        print("="*70 + "\n")
        return

    import tensorflow as tf
    print(f"[INFO] Loading dataset from {data_path}...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_path,
        validation_split=0.2,
        subset="training",
        seed=42,
        image_size=(args.img_size, args.img_size),
        batch_size=args.batch_size,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_path,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=(args.img_size, args.img_size),
        batch_size=args.batch_size,
    )

    model = build_model(num_classes=num_classes, img_size=args.img_size)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=args.lr),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    model.summary()

    print("[INFO] Starting training...")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.2, patience=2)
    ]
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    # Save SavedModel
    saved_model_dir = base_dir / "models" / "disease_model"
    saved_model_dir.mkdir(parents=True, exist_ok=True)
    model.save(str(saved_model_dir))
    print(f"[SUCCESS] SavedModel saved to {saved_model_dir}")

    # Export to ONNX
    try:
        import tf2onnx
        onnx_out_paths = [
            base_dir / "models" / "disease_detector.onnx",
            repo_root / "app" / "assets" / "models" / "disease_detector.onnx",
        ]
        input_spec = (tf.TensorSpec((None, args.img_size, args.img_size, 3), tf.float32, name="image_input"),)
        for onnx_p in onnx_out_paths:
            onnx_p.parent.mkdir(parents=True, exist_ok=True)
            tf2onnx.convert.from_keras(model, input_signature=input_spec, output_path=str(onnx_p), opset=13)
            print(f"[SUCCESS] Exported ONNX model to {onnx_p}")
    except ImportError:
        print("[WARNING] tf2onnx not installed. To convert to ONNX, run: pip install tf2onnx")

if __name__ == "__main__":
    main()

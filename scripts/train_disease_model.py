"""
Train MobileNetV2 on PlantVillage dataset for crop disease classification.
Dataset: https://www.kaggle.com/datasets/emmarex/plantdisease
Expected: 38 disease classes across 14 crop species

Usage:
    python scripts/train_disease_model.py

Output:
    ml-service/models/disease_model/  (TF SavedModel)
    ml-service/models/class_labels.json
"""
import json
import os

import tensorflow as tf
from tensorflow.keras import Model, layers  # type: ignore
from tensorflow.keras.applications import MobileNetV2  # type: ignore
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint  # type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore

# ── Config ──
IMAGE_SIZE  = (224, 224)
BATCH_SIZE  = 32
EPOCHS      = 15
DATA_DIR    = "data/plantvillage"
MODEL_DIR   = "ml-service/models/disease_model"
LABELS_PATH = "ml-service/models/class_labels.json"

# Scope to 6 crops for demo (comment out to train all 14)
ALLOWED_CLASSES = [
    "Tomato___Early_blight",     "Tomato___Late_blight",
    "Tomato___Leaf_Mold",        "Tomato___healthy",
    "Potato___Early_blight",     "Potato___Late_blight",
    "Potato___healthy",          "Corn_(maize)___Common_rust_",
    "Corn_(maize)___healthy",    "Rice___Blast",
    "Rice___Brown_spot",         "Rice___healthy",
    "Wheat___Yellow_Rust",       "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
]


def build_model(num_classes: int) -> Model:
    """Transfer learning with MobileNetV2 base."""
    base = MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False  # freeze base initially

    x      = base.output
    x      = layers.GlobalAveragePooling2D()(x)
    x      = layers.Dense(256, activation="relu")(x)
    x      = layers.Dropout(0.3)(x)
    output = layers.Dense(num_classes, activation="softmax")(x)

    return Model(inputs=base.input, outputs=output)


def train():
    if not os.path.exists(DATA_DIR):
        print(f"[ERROR] Dataset not found at {DATA_DIR}")
        print("Download from: https://www.kaggle.com/datasets/emmarex/plantdisease")
        return

    # Data generators with augmentation
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=20,
        width_shift_range=0.15,
        height_shift_range=0.15,
        horizontal_flip=True,
        zoom_range=0.15,
        validation_split=0.2,
    )
    val_gen = ImageDataGenerator(rescale=1.0 / 255, validation_split=0.2)

    train_ds = train_gen.flow_from_directory(
        DATA_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        subset="training",
        seed=42,
        classes=ALLOWED_CLASSES if ALLOWED_CLASSES else None,
    )
    val_ds = val_gen.flow_from_directory(
        DATA_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        subset="validation",
        seed=42,
        classes=ALLOWED_CLASSES if ALLOWED_CLASSES else None,
    )

    num_classes = len(train_ds.class_indices)
    print(f"Training on {num_classes} classes, {train_ds.samples} samples")

    # Save class labels
    os.makedirs("ml-service/models", exist_ok=True)
    labels = {v: k for k, v in train_ds.class_indices.items()}
    label_list = [labels[i] for i in range(num_classes)]
    with open(LABELS_PATH, "w") as f:
        json.dump(label_list, f, indent=2)
    print(f"[SUCCESS] Saved {num_classes} labels -> {LABELS_PATH}")

    # Build and compile
    model = build_model(num_classes)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        EarlyStopping(patience=4, restore_best_weights=True, verbose=1),
        ModelCheckpoint("ml-service/models/best_disease.keras", save_best_only=True, verbose=1),
    ]

    # Phase 1: train head only
    print("\n── Phase 1: Training classification head ──")
    model.fit(train_ds, epochs=EPOCHS, validation_data=val_ds, callbacks=callbacks)

    # Phase 2: fine-tune last 30 layers of base
    print("\n── Phase 2: Fine-tuning last 30 base layers ──")
    base_model = model.layers[0]
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(train_ds, epochs=5, validation_data=val_ds, callbacks=callbacks)

    # Save as TF SavedModel
    os.makedirs(MODEL_DIR, exist_ok=True)
    model.export(MODEL_DIR)
    print(f"\n[SUCCESS] Model saved to {MODEL_DIR}")


if __name__ == "__main__":
    train()

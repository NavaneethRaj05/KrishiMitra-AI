"""Image preprocessing utilities for disease detection CNN."""
import io
from typing import Tuple

import numpy as np
from PIL import Image, ImageOps


def preprocess_for_cnn(
    image_bytes: bytes,
    target_size: Tuple[int, int] = (224, 224),
) -> np.ndarray:
    """
    Load, resize, and normalize an image for MobileNetV2 inference.
    Returns float32 array of shape (1, H, W, 3) with values in [0, 1].
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Auto-rotate based on EXIF data (common with phone photos)
    img = ImageOps.exif_transpose(img)

    img = img.resize(target_size, Image.Resampling.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def validate_image(image_bytes: bytes, max_size_mb: float = 10.0) -> bool:
    """Check that bytes represent a valid image within size limits."""
    if len(image_bytes) > max_size_mb * 1024 * 1024:
        return False
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        return True
    except Exception:
        return False


def resize_for_display(
    image_bytes: bytes,
    max_dim: int = 800,
) -> bytes:
    """Resize an image so its longest side is at most max_dim pixels."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = ImageOps.exif_transpose(img)
    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

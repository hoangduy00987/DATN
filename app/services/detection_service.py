import logging
from typing import Tuple
import os

try:
    from PIL import Image
    import numpy as np
except Exception:  # pragma: no cover - pillow/numpy may not be installed yet
    Image = None
    np = None

try:
    import tensorflow as tf
    from tensorflow.keras import layers as L
    from tensorflow.keras.models import Model
    from tensorflow.keras.applications import DenseNet121
except Exception:  # pragma: no cover
    tf = None
    L = None
    Model = None
    DenseNet121 = None

# Image size used for preprocessing and stub inference
# Updated to 224 to match frontend upload/resizing requirement
IMG_SIZE = 224

# Primary labels (step-1). Exact order used by the first-stage model.
LABELS = [
    "covid-19",
    "khí phế thũng",
    "phổi khỏe mạnh",
    "viêm phổi",
    "lao phổi",
]






class BaseModel:
    """Base class for Keras models with stub fallback."""
    def __init__(self, model_path: str, default_filename: str):
        self.model_path = model_path or ""
        self.model = None
        self.loaded = False
        try:
            from tensorflow.keras.models import load_model as _load_model
        except Exception:
            _load_model = None
        self._load_model_callable = _load_model
        self.default_filename = default_filename
        self.load()

    def _default_model_path(self, filename: str) -> str:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
        return os.path.join(base, filename)

    def load(self) -> None:
        def _attempt_load(path: str):
            if not self._load_model_callable:
                logging.debug("No Keras load_model available in this environment")
                return None
            custom_objects = {"Lambda": L.Lambda if L is not None else None}
            try:
                logging.info(f"Loading model from: {path} (compile=False)")
                return self._load_model_callable(path, compile=False, custom_objects=custom_objects)
            except Exception as e1:
                logging.warning("Initial load failed (compile=False): %s", e1)
                try:
                    logging.info("Retrying load with safe_mode=False")
                    return self._load_model_callable(path, compile=False, safe_mode=False, custom_objects=custom_objects)
                except Exception as e2:
                    logging.warning("Loading with safe_mode=False failed: %s", e2)
                    return None

        if not self.model_path:
            default_path = self._default_model_path(self.default_filename)
            if os.path.exists(default_path):
                self.model_path = default_path

        if self.model_path and self._load_model_callable is not None:
            self.model = _attempt_load(self.model_path)
            if self.model is None:
                logging.warning(f"Failed to load model {self.default_filename} from file; using stub.")
        else:
            if self.model_path:
                logging.warning(f"TensorFlow not available; cannot load model {self.default_filename}.")
            self.model = None

        self.loaded = True

class DetectionModel(BaseModel):
    """Cascade-capable detection model wrapper."""

    def __init__(self, model_path: str = ""):
        super().__init__(model_path, "densenet121_chest_xray_step-1-v3.h5")

    def _run_model_predict(self, model, img_arr: np.ndarray) -> Tuple[str, float]:
        try:
            preds = model.predict(np.expand_dims(img_arr, axis=0))
            if hasattr(preds, "ndim") and preds.ndim >= 2:
                probs = np.asarray(preds[0], dtype=float)
            else:
                probs = np.asarray(preds, dtype=float)
            idx = int(np.argmax(probs))
            score = float(probs[idx])
            label = LABELS[idx] if len(probs) == len(LABELS) else "unknown"
            return label, round(score, 4)
        except Exception:
            logging.exception("Error during model inference")
            return "unknown", 0.0

    def predict(self, image) -> Tuple[str, float]:
        if Image is None or np is None:
            return "unknown", 0.0
        if not hasattr(image, "convert"):
            raise ValueError("Input must be a PIL.Image.Image")

        img = image.convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img).astype("float32") / 255.0

        if self.model is not None:
            return self._run_model_predict(self.model, arr)
        
        # Stub logic
        mean = float(arr.mean())
        bin_index = int(min(max(mean * len(LABELS), 0), len(LABELS) - 1))
        label = LABELS[bin_index]
        bin_center = (bin_index + 0.5) / len(LABELS)
        distance = abs(mean - bin_center)
        score = max(0.5, 1.0 - distance * 2.0)
        return label, round(float(score), 4)

class XRayCheckModel(BaseModel):
    """Model to check if an image is an X-ray."""
    
    CHECK_LABELS = ["natural", "x-ray"]

    def __init__(self, model_path: str = ""):
        super().__init__(model_path, "check-xray-model.h5")

    def is_xray(self, image) -> Tuple[bool, float]:
        """Returns (is_xray, confidence)."""
        if Image is None or np is None:
            return True, 1.0 # Default to true if no model to avoid blocking

        img = image.convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img).astype("float32") / 255.0

        if self.model is not None:
            preds = self.model.predict(np.expand_dims(arr, axis=0))
            probs = np.asarray(preds[0], dtype=float)
            idx = int(np.argmax(probs))
            label = self.CHECK_LABELS[idx]
            return (label == "x-ray"), float(probs[idx])
        
        return True, 1.0 # Stub fallback

__all__ = ["DetectionModel", "XRayCheckModel"]

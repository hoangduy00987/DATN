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






class DetectionModel:
    """Cascade-capable detection model wrapper.

    Behavior:
    - Loads a first-stage model.
    - If model binaries / TF not available, falls back to deterministic stubs.
    """

    def __init__(self, model_path: str = ""):
        self.model_path = model_path or ""
        self.model = None
        self.loaded = False
        # try to import a Keras loader if available
        try:
            from tensorflow.keras.models import load_model as _load_model  # type: ignore
        except Exception:
            _load_model = None
        self._load_model_callable = _load_model
        self.load()

    def _default_model_path(self, filename: str) -> str:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
        return os.path.join(base, filename)

    def load(self) -> None:
        def _attempt_load(path: str):
            """Try multiple safe/unsafe loading strategies and return model or None on failure."""
            if not self._load_model_callable:
                logging.debug("No Keras load_model available in this environment")
                return None

            # Tạo custom_objects để xử lý Lambda layers
            custom_objects = {
                "Lambda": L.Lambda if L is not None else None,
            }

            # Preferred: load with compile=False
            try:
                logging.info(f"Loading model from: {path} (compile=False)")
                return self._load_model_callable(path, compile=False, custom_objects=custom_objects)
            except Exception as e1:
                logging.warning("Initial load failed (compile=False): %s", e1)

            # Next: try safe_mode=False if supported by the loader
            try:
                logging.info("Retrying load with safe_mode=False")
                return self._load_model_callable(path, compile=False, safe_mode=False, custom_objects=custom_objects)  # type: ignore
            except TypeError:
                # loader doesn't accept safe_mode param
                logging.debug("load_model does not accept safe_mode parameter")
            except Exception as e2:
                logging.warning("Loading with safe_mode=False failed: %s", e2)

            # Last resort: enable unsafe deserialization globally (risky)
            try:
                import keras

                if hasattr(keras, "config") and hasattr(keras.config, "enable_unsafe_deserialization"):
                    logging.warning("Attempting unsafe deserialization to load model '%s' (trusted artifacts only)", path)
                    try:
                        keras.config.enable_unsafe_deserialization()
                    except Exception as ee:
                        logging.warning("Failed to call enable_unsafe_deserialization(): %s", ee)

                    # try loading again
                    try:
                        return self._load_model_callable(path, compile=False, custom_objects=custom_objects)
                    except Exception as e3:
                        logging.warning("Load after enabling unsafe deserialization failed: %s", e3)
                else:
                    logging.debug("Keras.config.enable_unsafe_deserialization not available in this environment")
            except Exception as e:
                logging.warning("Error while attempting unsafe deserialization path: %s", e)

            # if all attempts fail, return None
            return None

        # Attempt to load model
        if not self.model_path:
            default_path = self._default_model_path("densenet121_chest_xray_step-1-v3.h5")
            if os.path.exists(default_path):
                self.model_path = default_path

        if self.model_path and self._load_model_callable is not None:
            self.model = _attempt_load(self.model_path)
            if self.model is None:
                logging.warning("Failed to load detection model from file; using stub.")
        else:
            if self.model_path:
                logging.warning("TensorFlow not available; cannot load detection model.")
            self.model = None

        self.loaded = True

    def _run_model_predict(self, model, img_arr: np.ndarray) -> Tuple[str, float]:
        """Call a loaded model's prediction and map to LABELS. This function
        is intentionally generic — adapt if your model API differs.
        """
        try:
            preds = model.predict(np.expand_dims(img_arr, axis=0))
            # expect logits or probabilities per class
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
        """Run prediction on a PIL Image and return (label, score).

        If the model is available, call it and return the predicted label.
        Falls back to deterministic brightness-based stubs if model missing.
        """
        if Image is None or np is None:
            return "unknown", 0.0

        if not hasattr(image, "convert"):
            raise ValueError("Input must be a PIL.Image.Image")

        img = image.convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img).astype("float32") / 255.0
        mean = float(arr.mean())

        # If model loaded, use it
        if self.model is not None:
            label, score = self._run_model_predict(self.model, arr)
        else:
            # stub: map brightness into one of the LABELS (bins)
            bin_index = int(min(max(mean * len(LABELS), 0), len(LABELS) - 1))
            label = LABELS[bin_index]
            bin_center = (bin_index + 0.5) / len(LABELS)
            distance = abs(mean - bin_center)
            score = max(0.5, 1.0 - distance * 2.0)

        return label, round(float(score), 4)


__all__ = ["DetectionModel"]

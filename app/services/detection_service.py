import logging
from typing import Tuple
import os
import json

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

# Primary labels loading (matches user snippet)
def _load_labels():
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
        json_path = os.path.join(base, "class_indices.json")
        with open(json_path, "r", encoding="utf-8") as f:
            class_indices = json.load(f)
        
        # Reverse mapping: {0: 'COVID', 1: 'NORMAL',...}
        labels = {v: k for k, v in class_indices.items()}
        return labels
    except Exception as e:
        logging.warning(f"Could not load labels from json: {e}")
        # Fallback dictionary if file not found
        return {
            0: "COVID",
            1: "NORMAL",
            2: "PNEUMONIA",
            3: "Tuberculosis",
            4: "Emphysema"
        }

LABELS_MAP = _load_labels()






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
        super().__init__(model_path, "best_densenet201_v2_0.89_512.keras")
        self.img_size = 224  # IMAGE_SIZE=224, 512 is NB_FEATURES

    def _run_model_predict(self, model, img_arr: np.ndarray) -> Tuple[str, float]:
        try:
            # Matches user snippet: img_array = np.expand_dims(img_array, axis=0)
            img_batch = np.expand_dims(img_arr, axis=0)
            predictions = model.predict(img_batch)
            
            # Matches user snippet: predicted_class_index = np.argmax(predictions, axis=1)[0]
            predicted_class_index = int(np.argmax(predictions, axis=1)[0])
            
            # Matches user snippet: confidence = np.max(predictions)
            confidence = float(np.max(predictions))
            
            # Matches user snippet: predicted_label = labels[predicted_class_index]
            predicted_label = LABELS_MAP.get(predicted_class_index, "unknown")
            
            return predicted_label, round(confidence, 4)
        except Exception:
            logging.exception("Error during model inference")
            return "unknown", 0.0

    def predict(self, image) -> Tuple[str, float]:
        if Image is None or np is None:
            return "unknown", 0.0
        if not hasattr(image, "convert"):
            raise ValueError("Input must be a PIL.Image.Image")

        img = image.convert("RGB")
        
        target_size = getattr(self, "img_size", IMG_SIZE)
        img = img.resize((target_size, target_size))
        arr = np.array(img).astype("float32") / 255.0

        if self.model is not None:
            return self._run_model_predict(self.model, arr)
        
        # Stub logic
        mean = float(arr.mean())
        num_labels = len(LABELS_MAP)
        bin_index = int(min(max(mean * num_labels, 0), num_labels - 1))
        label = LABELS_MAP.get(bin_index, "unknown")
        bin_center = (bin_index + 0.5) / num_labels
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
            logging.error("Image or Numpy not available for X-ray check")
            return False, 0.0

        img = image.convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
        arr = np.array(img).astype("float32") / 255.0

        if self.model is not None:
            try:
                preds = self.model.predict(np.expand_dims(arr, axis=0))
                # Handle different output shapes
                # preds could be [ [prob] ] (sigmoid) or [ [p0, p1] ] (softmax)
                probs = np.asarray(preds[0], dtype=float)
                
                if probs.size == 1:
                    # Case: Sigmoid (1 output)
                    score = float(probs)
                    # Assuming 1 is x-ray and 0 is natural
                    is_xray_pred = score > 0.5
                    label = "x-ray" if is_xray_pred else "natural"
                    confidence = score if is_xray_pred else (1.0 - score)
                else:
                    # Case: Softmax (2+ outputs)
                    idx = int(np.argmax(probs))
                    label = self.CHECK_LABELS[idx] if idx < len(self.CHECK_LABELS) else "unknown"
                    confidence = float(probs[idx])
                    is_xray_pred = (label == "x-ray")

                logging.info(f"X-ray check result: label={label}, confidence={confidence:.4f}, raw_probs={probs}")
                return is_xray_pred, confidence
            except Exception as e:
                logging.exception(f"Error during X-ray check model inference: {e}")
                return False, 0.0
        
        logging.warning("X-ray check model not loaded; returning False by default.")
        return False, 0.0

__all__ = ["DetectionModel", "XRayCheckModel"]

"""
Detect service — wraps the ML detection models with a singleton pattern.

The actual model classes (DetectionModel, XRayCheckModel) live in
`detection_service.py` (unchanged).  This module exposes convenience
functions used by the detect controller and the chat service.
"""
from typing import Optional, Tuple

from PIL import Image

from app.services.detection_service import DetectionModel, XRayCheckModel
from app.core.config import settings


# ── Singleton model instances ──────────────────────────────────────────────────

_detector: Optional[DetectionModel] = None
_xray_checker: Optional[XRayCheckModel] = None


def get_detector() -> DetectionModel:
    """Return the shared DetectionModel instance (lazy-load)."""
    global _detector
    if _detector is None:
        _detector = DetectionModel(settings.DETECTION_MODEL_PATH)
    return _detector


def get_xray_checker() -> XRayCheckModel:
    """Return the shared XRayCheckModel instance (lazy-load)."""
    global _xray_checker
    if _xray_checker is None:
        _xray_checker = XRayCheckModel(settings.XRAY_CHECK_MODEL_PATH)
    return _xray_checker


def predict_xray(image: Image.Image) -> Tuple[bool, float]:
    """Check if *image* is an X-ray. Returns (is_xray, confidence)."""
    return get_xray_checker().is_xray(image)


def predict_disease(image: Image.Image) -> Tuple[str, float]:
    """Run the disease detection model. Returns (label, confidence)."""
    return get_detector().predict(image)

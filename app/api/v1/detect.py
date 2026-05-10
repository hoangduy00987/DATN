from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.core.config import settings
from app.services.detection_service import DetectionModel, XRayCheckModel
from PIL import Image
import io
import base64

router = APIRouter()

# Initialize models
detector = DetectionModel(settings.DETECTION_MODEL_PATH)
xray_checker = XRayCheckModel(settings.XRAY_CHECK_MODEL_PATH)


@router.post("/", tags=["detect"])
async def detect(file: UploadFile = File(None), image_base64: str = Form(None)):
    if file is None and not image_base64:
        raise HTTPException(status_code=400, detail="Provide 'file' or 'image_base64'.")

    try:
        if file is not None:
            content = await file.read()
            image = Image.open(io.BytesIO(content))
        else:
            data = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            content = base64.b64decode(data)
            image = Image.open(io.BytesIO(content))

        # 1. Check if image is an X-ray
        is_xray, xray_score = xray_checker.is_xray(image)
        if not is_xray:
            raise HTTPException(
                status_code=400, 
                detail="Vui lòng đưa ảnh X-quang phổi vào để tiến hành nhận diện."
            )

        # 2. Proceed with disease detection
        label, score = detector.predict(image)

        return {
            "label": label, 
            "score": float(score), 
            "metadata": {
                "model_path": settings.DETECTION_MODEL_PATH,
                "is_xray": is_xray,
                "xray_score": float(xray_score)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

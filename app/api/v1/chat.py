from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.models.chat_request import ChatRequest
from app.models.chat_response import ChatResponse
from app.services.retrieval_service import retrieve
from app.services.generation_service import generate_answer
from app.db.chroma_client import load_db
from app.services.detection_service import DetectionModel, XRayCheckModel
from PIL import Image
import io

router = APIRouter()
OUT_OF_SCOPE_MESSAGE = "Hệ thống hiện chỉ hỏi đáp về các bệnh thường gặp ở phổi. Vui lòng đặt câu hỏi liên quan đến bệnh phổi."


def _normalize_text(s: str) -> str:
    import unicodedata

    if not s:
        return ""
    nkfd = unicodedata.normalize("NFKD", s)
    return "".join([c for c in nkfd if not unicodedata.combining(c)]).lower()


def is_lung_scope(query: str) -> bool:
    normalized = _normalize_text(query or "")
    lung_keywords = [
        "phổi",
        "lao phổi",
        "hen",
        "viêm phổi",
        "copd",
        "hô hấp",
        "ho",
        "khó thở",
        "suy hô hấp",
        "pneumonia",
        "lung",
        "respiratory",
        # include common labels/variants that detection may return
        "covid",
        "covid-19",
        "covid19",
        "khi phe thung",
        "phe thung",
        "emphysema",
    ]
    # normalize keywords (remove diacritics) as well for matching
    normalized_keywords = [_normalize_text(k) for k in lung_keywords]
    return any(k in normalized for k in normalized_keywords)


def build_context(docs: list[dict]) -> str:
    sections = []
    for doc in docs:
        # Support both legacy metadata-only objects and the new detailed document format
        if isinstance(doc, dict) and "metadata" in doc:
            meta = doc.get("metadata") or {}
        else:
            meta = doc or {}

        question = (meta.get("question") or "").strip()
        content = (meta.get("content") or "").strip()
        answer = (meta.get("answer") or "").strip()

        parts = [part for part in [question, content, answer] if part]

        if parts:
            section = "\n".join(parts)
            # append optional id/distance for traceability
            extras = []
            if isinstance(doc, dict) and doc.get("id"):
                extras.append(f"ID: {doc.get('id')}")
            if isinstance(doc, dict) and doc.get("distance") is not None:
                extras.append(f"distance: {doc.get('distance')}")
            if extras:
                section = section + "\n\n[" + " | ".join(extras) + "]"

            sections.append(section)

    return "\n\n---\n\n".join(sections)

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    collection = load_db()
    query = request.query

    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if not is_lung_scope(query):
        return ChatResponse(answer=OUT_OF_SCOPE_MESSAGE)

    docs = retrieve(collection, query)

    if not docs:
        return ChatResponse(answer="Không tìm thấy thông tin phù hợp.")

    context = build_context(docs)
    answer = generate_answer(query, context)

    return ChatResponse(answer=answer)


@router.post("/chat-with-image", response_model=ChatResponse)
async def chat_with_image(file: UploadFile = File(None), image_base64: str = Form(None), query: str = Form(None)):
    """Accepts an uploaded image (or base64) plus optional query.

    If an image is provided, run the detection model first and use the
    detected label to adjust the retrieval query before running the normal
    retriever + generator pipeline.
    """
    collection = load_db()

    # read/prepare query
    user_query = (query or "").strip()

    # load detector and run if image present
    label = None
    score = None
    if file is None and not image_base64:
        # No image provided: fall back to normal chat behavior
        if not user_query:
            raise HTTPException(status_code=400, detail="Query cannot be empty.")

        if not is_lung_scope(user_query):
            return ChatResponse(answer=OUT_OF_SCOPE_MESSAGE)

        docs = retrieve(collection, user_query)
        if not docs:
            return ChatResponse(answer="Không tìm thấy thông tin phù hợp.")

        context = build_context(docs)
        answer = generate_answer(user_query, context)
        return ChatResponse(answer=answer)

    try:
        detector = DetectionModel()
        xray_checker = XRayCheckModel()
        
        if file is not None:
            content = await file.read()
            image = Image.open(io.BytesIO(content))
        else:
            import base64
            data = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            content = base64.b64decode(data)
            image = Image.open(io.BytesIO(content))

        # 1. Check if image is an X-ray
        is_xray, xray_score = xray_checker.is_xray(image)
        if not is_xray:
            raise HTTPException(
                status_code=400, 
                detail="Vui lòng đưa ảnh x-ray bệnh phổi lên để nhận diện."
            )

        # 2. Proceed with disease detection
        label, score = detector.predict(image)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    # build retrieval query based on detection result
    retrieval_label = label or ""

    # For specific labels (COVID-19, emphysema / khí phế thũng), prefix
    # the retrieval prompt with a short lead-in to improve retrieval results.
    special_prefix = ""
    if retrieval_label:
        low = _normalize_text(retrieval_label)
        if any(k in low for k in ["covid", "covid-19", "covid19", "khi phe thung", "phe thung", "emphysema"]):
            special_prefix = "bệnh phổi do"

    if user_query:
        if retrieval_label and retrieval_label != "unknown":
            retrieval_query = f"{special_prefix} {retrieval_label}. {user_query}".strip()
        else:
            retrieval_query = user_query
    else:
        retrieval_query = f"{special_prefix} {retrieval_label}".strip()

    if not retrieval_query:
        raise HTTPException(status_code=400, detail="No query available for retrieval.")

    # If the user provided text, enforce the lung-scope restriction as before.
    # If this is an image-only request (no user_query), allow the detection
    # label to drive retrieval even if it doesn't contain explicit lung keywords.
    # Try retrieval first using the detection-driven retrieval_query.
    docs = retrieve(collection, retrieval_query)

    # If retrieval found nothing, and the user typed a query that is
    # clearly out-of-scope, return the usual out-of-scope message.
    if not docs:
        if user_query and not is_lung_scope(user_query):
            return ChatResponse(answer=OUT_OF_SCOPE_MESSAGE)
        return ChatResponse(answer="Không tìm thấy thông tin phù hợp.")

    context = build_context(docs)
    answer = generate_answer(retrieval_query, context)

    # include detection info in answer optionally (here we prepend a short note)
    note = f"[Phát hiện: {label} (score={score})] " if label else ""
    return ChatResponse(answer=note + answer)


@router.post("/upload", response_model=ChatResponse)
async def upload(file: UploadFile = File(None), image_base64: str = Form(None), query: str = Form(None)):
    """Backward-compatible alias for clients that POST to `/upload`.

    Delegates to `chat_with_image` to keep a single implementation.
    """
    return await chat_with_image(file=file, image_base64=image_base64, query=query)
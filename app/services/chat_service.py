"""
Chat service — business logic for the RAG chatbot and image-based detection.

Extracted from api/v1/chat.py to keep controllers thin.
"""
import base64
import io
import json
import unicodedata
from typing import AsyncGenerator, Optional

from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

from app.db.chroma_client import load_db
from app.models.schemas.chat import ChatResponse
from app.services.retrieval_service import retrieve
from app.services.generation_service import generate_answer, stream_generate_answer
from app.services.detection_service import DetectionModel, XRayCheckModel
from app.core.config import settings


# ── Constants ──────────────────────────────────────────────────────────────────

OUT_OF_SCOPE_MESSAGE = (
    "Hệ thống hiện chỉ hỏi đáp về các bệnh thường gặp ở phổi. "
    "Vui lòng đặt câu hỏi liên quan đến bệnh phổi."
)

_LUNG_KEYWORDS = [
    "phổi", "lao phổi", "hen", "viêm phổi", "copd", "hô hấp", "ho",
    "khó thở", "suy hô hấp", "pneumonia", "lung", "respiratory",
    "covid", "covid-19", "covid19", "khi phe thung", "phe thung", "emphysema",
]

_SPECIAL_PREFIX_KEYS = ["covid", "covid-19", "covid19", "khi phe thung", "phe thung", "emphysema"]


# ── Singleton model instances ──────────────────────────────────────────────────

_detector: Optional[DetectionModel] = None
_xray_checker: Optional[XRayCheckModel] = None


def _get_detector() -> DetectionModel:
    global _detector
    if _detector is None:
        _detector = DetectionModel(settings.DETECTION_MODEL_PATH)
    return _detector


def _get_xray_checker() -> XRayCheckModel:
    global _xray_checker
    if _xray_checker is None:
        _xray_checker = XRayCheckModel(settings.XRAY_CHECK_MODEL_PATH)
    return _xray_checker


# ── Helper utilities ───────────────────────────────────────────────────────────

def _normalize_text(s: str) -> str:
    """Remove diacritics and lowercase a string for keyword matching."""
    if not s:
        return ""
    nkfd = unicodedata.normalize("NFKD", s)
    return "".join([c for c in nkfd if not unicodedata.combining(c)]).lower()


def is_lung_scope(query: str) -> bool:
    """Return True if the query is related to lung/respiratory topics."""
    normalized = _normalize_text(query or "")
    normalized_keywords = [_normalize_text(k) for k in _LUNG_KEYWORDS]
    return any(k in normalized for k in normalized_keywords)


def build_context(docs: list[dict]) -> str:
    """Build a readable context string from retrieved ChromaDB documents."""
    sections = []
    for doc in docs:
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
            extras = []
            if isinstance(doc, dict) and doc.get("id"):
                extras.append(f"ID: {doc.get('id')}")
            if isinstance(doc, dict) and doc.get("distance") is not None:
                extras.append(f"distance: {doc.get('distance')}")
            if extras:
                section = section + "\n\n[" + " | ".join(extras) + "]"
            sections.append(section)

    return "\n\n---\n\n".join(sections)


def _build_retrieval_query(label: str, user_query: str) -> str:
    """Combine detection label and user query into a single retrieval query."""
    retrieval_label = label or ""
    special_prefix = ""
    if retrieval_label:
        low = _normalize_text(retrieval_label)
        if any(k in low for k in _SPECIAL_PREFIX_KEYS):
            special_prefix = "bệnh phổi do"

    if user_query:
        if retrieval_label and retrieval_label != "unknown":
            return f"{special_prefix} {retrieval_label}. {user_query}".strip()
        return user_query
    return f"{special_prefix} {retrieval_label}".strip()


async def _load_image_from_upload(
    file: Optional[UploadFile], image_base64: Optional[str]
) -> Image.Image:
    """Read a PIL image from either an uploaded file or base64 string."""
    if file is not None:
        content = await file.read()
        return Image.open(io.BytesIO(content))

    data = image_base64.split(",")[-1] if "," in image_base64 else image_base64
    content = base64.b64decode(data)
    return Image.open(io.BytesIO(content))


# ── Service methods ────────────────────────────────────────────────────────────

def chat_sync(query: str) -> ChatResponse:
    """Non-streaming chat (RAG pipeline)."""
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if not is_lung_scope(query):
        return ChatResponse(answer=OUT_OF_SCOPE_MESSAGE)

    collection = load_db()
    docs = retrieve(collection, query)

    if not docs:
        return ChatResponse(answer="Không tìm thấy thông tin phù hợp.")

    context = build_context(docs)
    answer = generate_answer(query, context)
    return ChatResponse(answer=answer)


async def chat_stream_gen(query: str) -> StreamingResponse:
    """Streaming chat — returns an SSE StreamingResponse."""
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if not is_lung_scope(query):
        async def _scope_gen():
            yield f"data: {json.dumps({'text': OUT_OF_SCOPE_MESSAGE})}\n\n"
        return StreamingResponse(_scope_gen(), media_type="text/event-stream")

    collection = load_db()
    docs = retrieve(collection, query)

    if not docs:
        async def _empty_gen():
            yield f"data: {json.dumps({'text': 'Không tìm thấy thông tin phù hợp.'})}\n\n"
        return StreamingResponse(_empty_gen(), media_type="text/event-stream")

    context = build_context(docs)

    async def _event_generator():
        try:
            async for chunk in stream_generate_answer(query, context):
                if chunk:
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(_event_generator(), media_type="text/event-stream")


async def chat_with_image(
    file: Optional[UploadFile],
    image_base64: Optional[str],
    query: Optional[str],
) -> ChatResponse:
    """Chat with optional X-ray image analysis."""
    collection = load_db()
    user_query = (query or "").strip()

    # No image provided: fall back to normal chat
    if file is None and not image_base64:
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
        image = await _load_image_from_upload(file, image_base64)
        xray_checker = _get_xray_checker()
        is_xray, xray_score = xray_checker.is_xray(image)
        if not is_xray:
            raise HTTPException(
                status_code=400,
                detail="Vui lòng đưa ảnh X-quang phổi vào để tiến hành nhận diện.",
            )
        detector = _get_detector()
        label, score = detector.predict(image)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    retrieval_query = _build_retrieval_query(label, user_query)
    if not retrieval_query:
        raise HTTPException(status_code=400, detail="No query available for retrieval.")

    docs = retrieve(collection, retrieval_query)
    if not docs:
        if user_query and not is_lung_scope(user_query):
            return ChatResponse(answer=OUT_OF_SCOPE_MESSAGE)
        return ChatResponse(answer="Không tìm thấy thông tin phù hợp.")

    context = build_context(docs)
    answer = generate_answer(retrieval_query, context)
    note = f"[Phát hiện: {label} (score={score})] " if label else ""
    return ChatResponse(answer=note + answer)


async def upload_stream_gen(
    file: Optional[UploadFile],
    image_base64: Optional[str],
    query: Optional[str],
) -> StreamingResponse:
    """Image upload with streaming SSE response."""
    if file is None and not image_base64:
        raise HTTPException(status_code=400, detail="Cần có ảnh để phân tích.")

    try:
        image = await _load_image_from_upload(file, image_base64)
        xray_checker = _get_xray_checker()
        is_xray, _xray_score = xray_checker.is_xray(image)
        if not is_xray:
            raise HTTPException(
                status_code=400,
                detail="Vui lòng đưa ảnh X-quang phổi vào để tiến hành nhận diện.",
            )
        detector = _get_detector()
        label, score = detector.predict(image)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")

    user_query = (query or "").strip()
    retrieval_query = _build_retrieval_query(label, user_query)
    if not retrieval_query:
        raise HTTPException(status_code=400, detail="No query available for retrieval.")

    collection = load_db()
    docs = retrieve(collection, retrieval_query)

    if not docs:
        if user_query and not is_lung_scope(user_query):
            async def _scope_gen():
                yield f"data: {json.dumps({'text': OUT_OF_SCOPE_MESSAGE})}\n\n"
            return StreamingResponse(_scope_gen(), media_type="text/event-stream")

        async def _empty_gen():
            yield f"data: {json.dumps({'text': 'Không tìm thấy thông tin phù hợp.'})}\n\n"
        return StreamingResponse(_empty_gen(), media_type="text/event-stream")

    context = build_context(docs)
    note = f"[Phát hiện: {label} (score={score})] " if label else ""

    async def _event_generator():
        try:
            if note:
                yield f"data: {json.dumps({'text': note})}\n\n"
            async for chunk in stream_generate_answer(retrieval_query, context):
                if chunk:
                    yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(_event_generator(), media_type="text/event-stream")

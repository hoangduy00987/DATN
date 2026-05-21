"""
Chat controller — handles HTTP routing only.
Business logic lives in app.services.chat_service.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.db.models import User
from app.core.security import get_current_doctor
from app.models.schemas.chat import ChatRequest, ChatResponse
import app.services.chat_service as chat_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: User = Depends(get_current_doctor)):
    """Non-streaming RAG chat endpoint."""
    return chat_service.chat_sync(request.query)


@router.post("/chat-stream")
async def chat_stream(request: ChatRequest, current_user: User = Depends(get_current_doctor)):
    """Streaming SSE chat endpoint."""
    return await chat_service.chat_stream_gen(request.query)


@router.post("/chat-with-image", response_model=ChatResponse)
async def chat_with_image(
    file: UploadFile = File(None),
    image_base64: str = Form(None),
    query: str = Form(None),
    current_user: User = Depends(get_current_doctor),
):
    """Chat with optional X-ray image — runs detection then RAG."""
    return await chat_service.chat_with_image(file=file, image_base64=image_base64, query=query)


@router.post("/upload", response_model=ChatResponse)
async def upload(
    file: UploadFile = File(None),
    image_base64: str = Form(None),
    query: str = Form(None),
    current_user: User = Depends(get_current_doctor),
):
    """Backward-compatible alias for /chat-with-image."""
    return await chat_service.chat_with_image(file=file, image_base64=image_base64, query=query)


@router.post("/upload-stream")
async def upload_stream(
    file: UploadFile = File(None),
    image_base64: str = Form(None),
    query: str = Form(None),
    current_user: User = Depends(get_current_doctor),
):
    """Image upload with streaming SSE response."""
    return await chat_service.upload_stream_gen(file=file, image_base64=image_base64, query=query)
"""
Central API v1 router — aggregates all route modules.

The prefix "/api/v1" is applied in main.py when including this router,
so each sub-router here gets only its domain prefix.

Original URL mapping (preserved for backward compatibility):
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  GET  /api/v1/auth/me
  POST /api/v1/chat/chat
  POST /api/v1/chat/chat-stream
  POST /api/v1/chat/chat-with-image
  POST /api/v1/chat/upload
  POST /api/v1/chat/upload-stream
  POST /api/v1/detect/
  POST /api/v1/ingest/ingest
  GET  /api/v1/ingest/ingest/status/{task_id}
  POST /api/v1/appointments/
  GET  /api/v1/appointments/my
  GET  /api/v1/appointments/all
  GET  /api/v1/appointments/{id}
  PATCH /api/v1/appointments/{id}/cancel
  PATCH /api/v1/appointments/{id}/result
  PATCH /api/v1/appointments/{id}
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.detect import router as detect_router
from app.api.v1.ingest import router as ingest_router
from app.api.v1.appointments import router as appointments_router
from app.api.v1.users import router as users_router
from app.api.v1.notifications import router as notifications_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(detect_router, prefix="/detect", tags=["detect"])
api_router.include_router(ingest_router, prefix="/ingest", tags=["ingest"])
api_router.include_router(appointments_router, prefix="/appointments", tags=["appointments"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

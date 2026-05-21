"""
FastAPI application entry point.

Responsibilities:
- Application factory (lifespan, middleware, exception handlers)
- Seed default doctor account on startup
- Mount the central API router
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.session import SessionLocal, engine
from app.db.models import Base, User, RoleEnum
from app.core.security import get_password_hash
from app.api.v1.router import api_router


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created (useful if docker init.sql didn't run or is missing)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        doctor_email = os.getenv("DEFAULT_DOCTOR_EMAIL", "doctor@admin.com")
        doctor_password = os.getenv("DEFAULT_DOCTOR_PASSWORD", "Lungcare2026")
        doctor_name = os.getenv("DEFAULT_DOCTOR_NAME", "Dr. Admin")

        # Check if default doctor exists
        doctor = db.query(User).filter(User.email == doctor_email).first()
        if not doctor:
            # Truncate password to bcrypt limit (72 bytes) before hashing
            safe_password = (
                doctor_password[:72]
                if len(doctor_password.encode()) > 72
                else doctor_password
            )
            new_doctor = User(
                email=doctor_email,
                full_name=doctor_name,
                password_hash=get_password_hash(safe_password),
                role=RoleEnum.doctor,
            )
            db.add(new_doctor)
            db.commit()
            print(f"Default doctor {doctor_email} created!")
    finally:
        db.close()
    yield


# ── Application factory ────────────────────────────────────────────────────────

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ─────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Xử lý lỗi validation một cách an toàn, tránh UnicodeDecodeError với dữ liệu nhị phân."""
    logging.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại định dạng file hoặc các trường dữ liệu.",
            "error_type": "RequestValidationError",
        },
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI RAG Chatbot!"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
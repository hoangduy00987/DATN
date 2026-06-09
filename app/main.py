"""
FastAPI application entry point.

Responsibilities:
- Application factory (lifespan, middleware, exception handlers)
- Seed default admin (DEFAULT_ADMIN_*) and doctor (DEFAULT_DOCTOR_*) on startup
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

def _truncate_password_for_bcrypt(password: str) -> str:
    """Bcrypt chỉ dùng tối đa 72 byte đầu của mật khẩu."""
    if len(password.encode("utf-8")) > 72:
        return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return password


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created (useful if docker init.sql didn't run or is missing)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Default admin (role admin) — bắt buộc có email + password trong .env ──
        admin_email = (os.getenv("DEFAULT_ADMIN_EMAIL") or "").strip()
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD") or ""
        admin_name = (os.getenv("DEFAULT_ADMIN_NAME") or "Quản trị viên").strip() or "Quản trị viên"

        if admin_email and admin_password:
            existing_admin = db.query(User).filter(User.email == admin_email).first()
            if not existing_admin:
                new_admin = User(
                    email=admin_email,
                    full_name=admin_name,
                    password_hash=get_password_hash(_truncate_password_for_bcrypt(admin_password)),
                    role=RoleEnum.admin,
                )
                db.add(new_admin)
                db.commit()
                logging.info("Default admin account created: %s", admin_email)
            elif existing_admin.role != RoleEnum.admin:
                logging.warning(
                    "DEFAULT_ADMIN_EMAIL=%s đã tồn tại nhưng role=%s — không ghi đè.",
                    admin_email,
                    existing_admin.role,
                )
        else:
            logging.info(
                "Bỏ qua tạo admin mặc định: thiếu DEFAULT_ADMIN_EMAIL hoặc DEFAULT_ADMIN_PASSWORD."
            )

        # ── Default doctor ──
        doctor_email = os.getenv("DEFAULT_DOCTOR_EMAIL", "doctor@admin.com")
        doctor_password = os.getenv("DEFAULT_DOCTOR_PASSWORD", "Lungcare2026")
        doctor_name = os.getenv("DEFAULT_DOCTOR_NAME", "Dr. Admin")

        doctor = db.query(User).filter(User.email == doctor_email).first()
        if not doctor:
            safe_password = _truncate_password_for_bcrypt(doctor_password)
            new_doctor = User(
                email=doctor_email,
                full_name=doctor_name,
                password_hash=get_password_hash(safe_password),
                role=RoleEnum.doctor,
            )
            db.add(new_doctor)
            db.commit()
            logging.info("Default doctor account created: %s", doctor_email)
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
    """Xử lý lỗi validation và trả về thông báo Tiếng Việt."""
    logging.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin gửi lên.",
            "error_type": "RequestValidationError",
        },
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": "Chào mừng bạn đến với LungCare API!"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
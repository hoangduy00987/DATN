from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.session import get_db
from app.db.models import User, RoleEnum
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_password_hash,
    get_current_user,
)

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = "Người dùng"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", tags=["auth"], status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng.")

    safe_password = data.password[:72] if len(data.password.encode()) > 72 else data.password
    new_user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=get_password_hash(safe_password),
        role=RoleEnum.patient,  # tài khoản đăng ký mới mặc định là người khám bệnh
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Đăng ký thành công!", "email": new_user.email}


@router.post("/login", tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    role_value = user.role.value
    access_token = create_access_token(data={"sub": str(user.id), "role": role_value})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": role_value})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": role_value,
    }


@router.get("/me", tags=["auth"])
def get_me(current_user: User = Depends(get_current_user)):
    """Trả về thông tin và role của user hiện tại."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
    }

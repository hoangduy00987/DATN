"""
Auth controller — handles HTTP routing only.
Business logic lives in app.services.auth_service.AuthService.
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.core.security import get_current_user
from app.models.schemas.auth import RegisterRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", tags=["auth"], status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Đăng ký tài khoản bệnh nhân mới."""
    return AuthService.register(db, data)


@router.post("/login", tags=["auth"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Đăng nhập và nhận JWT access/refresh tokens."""
    return AuthService.login(db, email=form_data.username, password=form_data.password)


@router.get("/me", tags=["auth"])
def get_me(current_user: User = Depends(get_current_user)):
    """Trả về thông tin và role của user hiện tại."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
    }

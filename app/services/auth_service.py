"""
Auth service — business logic for registration and login.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.db.models import RoleEnum
from app.models.schemas.auth import RegisterRequest
from app.repositories.user_repository import UserRepository


class AuthService:
    """Handles user authentication business logic."""

    @staticmethod
    def register(db: Session, data: RegisterRequest) -> dict:
        """
        Register a new patient account.
        Raises HTTPException 400 if email already exists.
        """
        existing = UserRepository.get_by_email(db, data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng.")

        # bcrypt supports max 72 bytes
        safe_password = (
            data.password[:72]
            if len(data.password.encode()) > 72
            else data.password
        )
        UserRepository.create(
            db=db,
            email=data.email,
            full_name=data.full_name,
            password_hash=get_password_hash(safe_password),
            role=RoleEnum.patient,
        )
        return {"message": "Đăng ký thành công!", "email": data.email}

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        """
        Authenticate user and return JWT tokens.
        Raises HTTPException 401 on invalid credentials.
        """
        user = UserRepository.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Incorrect email or password"
            )

        if user.status == "locked":
            raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa.")

        role_value = user.role.value
        access_token = create_access_token(
            data={"sub": str(user.id), "role": role_value}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "role": role_value}
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": role_value,
        }
